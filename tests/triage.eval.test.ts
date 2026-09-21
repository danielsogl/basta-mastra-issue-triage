import { checks } from '@mastra/evals/checks'
import { expectEval } from '@mastra/evals/vitest'
import { test } from 'vitest'
import { mastra } from '../src/mastra/index.ts'

// Über die Mastra-Instanz holen: nur dort hängen Storage und Observability dran
const triageAgent = mastra.getAgentById('triage-agent')

// Evals rufen das echte Modell auf, ohne Key überspringen
const evalTest = test.skipIf(!process.env.ANTHROPIC_API_KEY && !process.env.MODEL)

evalTest('Doppelte Abbuchung ist critical', async () => {
  await expectEval({
    target: triageAgent,
    data: { input: 'Triagiere Issue #104' },
    gates: [checks.calledTool('getIssue'), checks.includes('critical'), checks.noToolErrors()],
  }).toPass()
})

evalTest('SSO-Timeout wird als Duplikat erkannt', async () => {
  await expectEval({
    target: triageAgent,
    data: { input: 'Triagiere Issue #105' },
    gates: [checks.calledTool('searchIssues'), checks.matches(/#(101|90)\b/)],
  }).toPass()
})

evalTest('Frage wird als question eingestuft und nichts gepostet', async () => {
  await expectEval({
    target: triageAgent,
    data: { input: 'Triagiere Issue #103' },
    gates: [checks.includes('question'), checks.didNotCall('postComment'), checks.maxToolCalls(4)],
  }).toPass()
})
