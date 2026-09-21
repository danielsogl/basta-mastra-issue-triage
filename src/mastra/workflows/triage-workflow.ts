import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { getIssue, issueSchema } from '../tools/github.ts'

const classificationSchema = z.object({
  type: z.enum(['bug', 'feature', 'question']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  labels: z.array(z.string()).max(3).describe('Höchstens 3 Labels, z. B. bug, auth, payment'),
  summary: z.string().describe('Ein Satz, worum es geht'),
})

const duplicateSchema = z.object({
  duplicateOf: z.number().nullable().describe('Nummer des Original-Issues oder null'),
  reason: z.string().describe('Warum es (k)ein Duplikat ist, landet im Trace'),
})

const triageSchema = z.object({
  issue: issueSchema,
  classification: classificationSchema,
  duplicate: duplicateSchema,
})

const resultSchema = z.object({
  issueNumber: z.number(),
  action: z.enum(['close-as-duplicate', 'reply']),
  labels: z.array(z.string()),
  comment: z.string(),
})

const fetchIssue = createStep(getIssue)

// LLM + Structured Output: das Ergebnis ist typisiert und validiert
const classify = createStep({
  id: 'classify',
  inputSchema: issueSchema,
  outputSchema: classificationSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById('triage-agent')
    const res = await agent.generate(
      `Klassifiziere dieses Issue:\n\n#${inputData.number} ${inputData.title}\n${inputData.body}`,
      { structuredOutput: { schema: classificationSchema }, toolChoice: 'none' },
    )
    return res.object
  },
})

// LLM + Tool: der Agent sucht selbst mit searchIssues
const findDuplicates = createStep({
  id: 'find-duplicates',
  inputSchema: issueSchema,
  outputSchema: duplicateSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById('triage-agent')
    const res = await agent.generate(
      `Prüfe mit searchIssues, ob Issue #${inputData.number} ein Duplikat eines anderen Issues ist. ` +
        `Nur echte Duplikate (gleiches Problem), keine bloß thematisch ähnlichen.\n\n${inputData.title}\n${inputData.body}`,
      { structuredOutput: { schema: duplicateSchema } },
    )
    return res.object
  },
})

// Kein LLM nötig: ein Template reicht
const closeAsDuplicate = createStep({
  id: 'close-as-duplicate',
  inputSchema: triageSchema,
  outputSchema: resultSchema,
  execute: async ({ inputData: { issue, classification, duplicate } }) => ({
    issueNumber: issue.number,
    action: 'close-as-duplicate' as const,
    labels: [...classification.labels, 'duplicate'],
    comment: `Danke für die Meldung, @${issue.author}! Das Thema wird bereits in #${duplicate.duplicateOf} behandelt. Ich schließe dieses Issue als Duplikat, bitte dort weiter diskutieren.`,
  }),
})

const draftReply = createStep({
  id: 'draft-reply',
  inputSchema: triageSchema,
  outputSchema: resultSchema,
  execute: async ({ inputData: { issue, classification }, mastra }) => {
    const agent = mastra.getAgentById('triage-agent')
    const res = await agent.generate(
      `Schreibe einen kurzen, freundlichen GitHub-Kommentar (max. 4 Sätze, Deutsch) als Maintainer zu diesem Issue. ` +
        `Typ: ${classification.type}, Priorität: ${classification.priority}. Nächsten Schritt nennen, nichts versprechen.\n\n` +
        `#${issue.number} ${issue.title} (von @${issue.author})\n${issue.body}`,
      {
        // Eigene Rolle ohne Tools, sonst triagiert oder postet der Agent selbst
        toolChoice: 'none',
        instructions:
          'Du bist Maintainer von acme/shop-api und schreibst GitHub-Kommentare. Gib nur den Kommentartext aus.',
        structuredOutput: { schema: z.object({ comment: z.string() }) },
      },
    )
    return {
      issueNumber: issue.number,
      action: 'reply' as const,
      labels: classification.labels,
      comment: res.object.comment,
    }
  },
})

export const triageWorkflow = createWorkflow({
  id: 'triage-workflow',
  description: 'Triagiert ein GitHub-Issue: klassifizieren, Duplikate suchen, Antwort entwerfen',
  inputSchema: z.object({ issueNumber: z.number() }),
  outputSchema: resultSchema,
})
  .map(async ({ inputData }) => ({ number: inputData.issueNumber }), { id: 'to-issue-input' })
  .then(fetchIssue)
  .parallel([classify, findDuplicates])
  .map(
    async ({ inputData, getStepResult }) => ({
      issue: getStepResult(fetchIssue),
      classification: inputData.classify,
      duplicate: inputData['find-duplicates'],
    }),
    { id: 'merge-analysis' },
  )
  .branch([
    [async ({ inputData }) => inputData.duplicate.duplicateOf !== null, closeAsDuplicate],
    [async ({ inputData }) => inputData.duplicate.duplicateOf === null, draftReply],
  ])
  .map(async ({ inputData }) => inputData['close-as-duplicate'] ?? inputData['draft-reply']!, {
    id: 'pick-result',
  })
  .commit()
