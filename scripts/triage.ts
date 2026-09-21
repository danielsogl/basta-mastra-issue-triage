// Aufruf: node --env-file=.env scripts/triage.ts 101
import { mastra } from '../src/mastra/index.ts'

const number = process.argv[2] ?? '101'
const agent = mastra.getAgentById('triage-agent')

const stream = await agent.stream(`Triagiere Issue #${number}`)
for await (const chunk of stream.textStream) process.stdout.write(chunk)
console.log()
