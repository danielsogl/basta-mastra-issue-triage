import { Mastra } from '@mastra/core'
import { MastraCompositeStore } from '@mastra/core/storage'
import { DuckDBStore } from '@mastra/duckdb'
import { LibSQLStore } from '@mastra/libsql'
import { MastraStorageExporter, Observability, SensitiveDataFilter } from '@mastra/observability'
import { triageAgent } from './agents/triage-agent.ts'
import { triageWorkflow } from './workflows/triage-workflow.ts'

// Studio (mastra dev) läuft in einem anderen Arbeitsverzeichnis als Scripts und Evals.
// Absoluter Pfad ab Repo-Root (npm setzt INIT_CWD), sonst hat jeder Prozess seine eigene DB.
const root = process.env.INIT_CWD ?? process.cwd()

export const mastra = new Mastra({
  agents: { triageAgent },
  workflows: { triageWorkflow },
  // LibSQL für Memory & Workflow-Snapshots, DuckDB für Traces/Metriken im Studio
  storage: new MastraCompositeStore({
    id: 'storage',
    default: new LibSQLStore({ id: 'mastra-storage', url: `file:${root}/mastra.db` }),
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
