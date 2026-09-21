import { Agent } from "@mastra/core/agent";
import { getIssue, searchIssues } from "../tools/github.ts";

export const triageAgent = new Agent({
  id: "triage-agent",
  name: "Triage Agent",
  description:
    "Analysiert GitHub-Issues: Typ, Priorität, Labels und mögliche Duplikate.",
  instructions: `
    Du bist ein erfahrener Maintainer des Projekts "acme/shop-api" und triagierst GitHub-Issues.

    Vorgehen:
    1. Lade das Issue mit getIssue.
    2. Suche mit searchIssues nach Duplikaten (2-4 prägnante Stichwörter, das Issue selbst ausschließen).
    3. Bestimme Typ (bug | feature | question), Priorität (low | medium | high | critical) und passende Labels.
    4. Antworte kurz und strukturiert auf Deutsch. Nenne Duplikate mit Nummer.

    Produktionsausfälle oder Geldverlust sind immer "critical".
  `,
  // Modell per .env austauschbar, z. B. MODEL=openai/gpt-5.4-mini
  model: process.env.MODEL ?? "anthropic/claude-sonnet-5",
  tools: { getIssue, searchIssues },
});
