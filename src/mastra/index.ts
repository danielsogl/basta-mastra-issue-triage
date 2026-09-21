import { Mastra } from "@mastra/core";
import { MastraCompositeStore } from "@mastra/core/storage";
import { DuckDBStore } from "@mastra/duckdb";
import { LibSQLStore } from "@mastra/libsql";
import {
  MastraStorageExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { triageAgent } from "./agents/triage-agent.ts";

export const mastra = new Mastra({
  agents: { triageAgent },
  // LibSQL für Memory & Workflow-Snapshots, DuckDB für Traces/Metriken im Studio
  storage: new MastraCompositeStore({
    id: "storage",
    default: new LibSQLStore({ id: "mastra-storage", url: "file:./mastra.db" }),
    domains: {
      observability: await new DuckDBStore().getStore("observability"),
    },
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "issue-triage",
        exporters: [new MastraStorageExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
