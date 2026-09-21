// Aufruf: node --env-file=.env scripts/run-workflow.ts 101
import { createInterface } from 'node:readline/promises'
import { mastra } from '../src/mastra/index.ts'

const issueNumber = Number(process.argv[2] ?? 101)
const run = await mastra.getWorkflow('triageWorkflow').createRun()

let result = await run.start({ inputData: { issueNumber } })

if (result.status === 'suspended') {
  const draft = result.steps['human-review'].suspendPayload
  console.log('\n⏸️  Workflow pausiert – Entwurf zur Freigabe:\n')
  console.log(draft)

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const approved = (await rl.question('\nVeröffentlichen? (j/n) ')).trim().toLowerCase() === 'j'
  rl.close()

  result = await run.resume({ step: 'human-review', resumeData: { approved } })
}

if (result.status === 'success') {
  const { action, posted, url } = result.result
  console.log(`\n✅ ${action}, ${posted ? `gepostet: ${url}` : 'nicht gepostet'}`)
} else {
  console.log('\n❌', result.status, result)
}
