import { createDurableAgent } from '@mastra/core/agent/durable'
import { triageAgent } from './triage-agent.ts'

// Gleicher Agent, aber der Agent-Loop läuft als Workflow:
// Streams sind wiederanschließbar, Runs überleben Neustarts (recovery in index.ts)
export const durableTriageAgent = createDurableAgent({
  agent: triageAgent,
  id: 'durable-triage-agent',
  name: 'Triage Agent (durable)',
})
