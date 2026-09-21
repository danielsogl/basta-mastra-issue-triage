import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import {
  createPromptAlignmentScorerLLM,
  createToolCallAccuracyScorerCode,
} from '@mastra/evals/scorers/prebuilt'
import { getIssue, postComment, searchIssues } from '../tools/github.ts'

// Modell per .env austauschbar, z. B. MODEL=openai/gpt-5.4-mini
const model = process.env.MODEL ?? 'anthropic/claude-sonnet-5'

// Nur Chats mit Thread bewerten (Studio). Workflow-Schritte, Evals und MCP haben keinen.
const onlyChats = { op: 'exists', path: 'threadId' } as const

export const triageAgent = new Agent({
  id: 'triage-agent',
  name: 'Triage Agent',
  description: 'Analysiert GitHub-Issues: Typ, Priorität, Labels und mögliche Duplikate.',
  instructions: `
    Du bist ein erfahrener Maintainer des Projekts "acme/shop-api" und triagierst GitHub-Issues.

    Vorgehen:
    1. Lade das Issue mit getIssue.
    2. Suche mit searchIssues nach Duplikaten (2-4 prägnante Stichwörter, das Issue selbst ausschließen).
    3. Bestimme Typ (bug | feature | question), Priorität (low | medium | high | critical) und passende Labels.
    4. Antworte kurz und strukturiert auf Deutsch. Nenne Duplikate mit Nummer.
    5. Nur wenn der Nutzer es ausdrücklich möchte: Kommentar mit postComment veröffentlichen.

    Produktionsausfälle oder Geldverlust sind immer "critical".
    Halte Team-Konventionen (Labels, Zuständigkeiten), die dir genannt werden, im Working Memory fest und wende sie an.
  `,
  model,
  tools: { getIssue, searchIssues, postComment },
  // Storage kommt von der Mastra-Instanz (LibSQL)
  memory: new Memory({
    options: {
      // Team-Konventionen gelten über alle Threads hinweg (scope: resource)
      workingMemory: {
        enabled: true,
        scope: 'resource',
        template: `# Team-Konventionen
- **Labels**:
- **Zuständigkeiten**:
- **Sonstiges**:
`,
      },
    },
  }),
  // Live-Evals: laufen nach jeder Antwort im Hintergrund, Scores im Studio unter Scorers
  scorers: {
    // LLM als Richter: Hält sich die Antwort an Prompt und Instructions?
    promptAlignment: {
      scorer: createPromptAlignmentScorerLLM({ model }),
      sampling: { type: 'ratio', rate: 1 },
      filter: onlyChats,
    },
    // Reiner Code, kein Modellaufruf: erst getIssue, dann searchIssues?
    toolOrder: {
      scorer: createToolCallAccuracyScorerCode({ expectedToolOrder: ['getIssue', 'searchIssues'] }),
      sampling: { type: 'ratio', rate: 1 },
      filter: onlyChats,
    },
  },
})
