import { Mastra } from '@mastra/core'
import { MastraCompositeStore } from '@mastra/core/storage'
import { DuckDBStore } from '@mastra/duckdb'
import { LibSQLStore } from '@mastra/libsql'
import { MastraStorageExporter, Observability, SensitiveDataFilter } from '@mastra/observability'
import { durableTriageAgent } from './agents/durable-triage-agent.ts'
import { triageAgent } from './agents/triage-agent.ts'
import { triageMcpServer } from './mcp/server.ts'
import { triageWorkflow } from './workflows/triage-workflow.ts'

export const mastra = new Mastra({
  agents: { triageAgent, durableTriageAgent },
  workflows: { triageWorkflow },
  mcpServers: { triageMcpServer },
  // Nach einem Crash laufende Durable-Runs beim Start fortsetzen
  recovery: { durableAgents: 'auto' },
  // LibSQL für Memory & Workflow-Snapshots, DuckDB für Traces/Metriken im Studio
  storage: new MastraCompositeStore({
    id: 'storage',
    default: new LibSQLStore({ id: 'mastra-storage', url: 'file:./mastra.db' }),
    domains: { observability: await new DuckDBStore().getStore('observability') },
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'issue-triage',
        exporters: [new MastraStorageExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
})
