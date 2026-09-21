# Issue-Triage mit Mastra

Demo-Projekt zum Vortrag **„Agents bauen mit Mastra“** (BASTA! Mainz 2026).

Ein Agent triagiert GitHub-Issues des fiktiven Projekts `acme/shop-api`: Er klassifiziert sie, sucht Duplikate, entwirft eine Antwort und postet erst nach menschlicher Freigabe. Die Issues kommen aus [`data/issues.json`](data/issues.json), damit alles offline und ohne GitHub-Token läuft.

## Setup

Voraussetzung: Node.js ≥ 22.18 (führt TypeScript direkt aus).

```bash
npm install
cp .env.example .env   # ANTHROPIC_API_KEY eintragen
npm run dev            # Studio: http://localhost:4111
```

Anderer Provider? `MODEL=openai/gpt-5-mini` in `.env` setzen und `OPENAI_API_KEY` eintragen. Mastra erkennt den Provider am Präfix, ohne weitere Pakete.

## Die Steps

Jeder Step ist ein Git-Tag. Mit `git checkout step-03` springst du zum jeweiligen Stand, mit `git diff step-02 step-03` siehst du, was dazukam.

| Tag | Thema | Was du ausprobierst |
|---|---|---|
| `step-01` | **Agent + Tools** | Studio → Agents → *Triage Agent* → „Triagiere Issue #101“. Oder im Terminal: `node --env-file=.env scripts/triage.ts 101` |
| `step-02` | **Memory** | Im Studio-Chat: „Bei uns bekommen Performance-Themen immer das Label `perf`“. Neuer Thread → Issue #107 triagieren → Label kommt aus dem Working Memory |
| `step-03` | **Workflow** | Studio → Workflows → *triage-workflow* mit `{ "issueNumber": 105 }` (Duplikat) und `101` (neu). Graph mit `parallel` und `branch` ansehen |
| `step-04` | **Human-in-the-Loop** | Workflow pausiert vor dem Posten (`suspend`). Im Studio freigeben oder Antwort anpassen (`resume`). Terminal: `node --env-file=.env scripts/run-workflow.ts 101` |
| `step-05` | **MCP-Server** | Agent und Tools als MCP-Server. `.mcp.json` ist enthalten → `claude` im Projektordner starten → „Nutze triage, um Issue #104 zu bewerten“ |
| `step-06` | **Evals & Tracing** | `npm test` führt Quick Checks mit Vitest aus. Studio → Observability → Traces zeigt jeden Tool-Call |
| `step-07` | **Durable Agents** | `node --env-file=.env scripts/durable.ts`: Stream abbrechen und per `observe(runId)` wieder anhängen, ohne dass Chunks verloren gehen |

## Projektstruktur

```text
data/issues.json          Fixture-Issues (statt GitHub-API)
src/mastra/
  index.ts                Mastra-Instanz: Agents, Workflows, Storage, Observability
  agents/                 Triage-Agent
  tools/                  getIssue, searchIssues, postComment
  workflows/              triage-workflow
scripts/                  Kleine Runner fürs Terminal
```

## Weiterführend

- Doku: <https://mastra.ai/docs> (für Coding-Agents: <https://mastra.ai/llms.txt>)
- Mastra-Skill für deinen Coding-Agent: `npx skills add mastra-ai/skills`
- Echte GitHub-Anbindung: `execute()` in `src/mastra/tools/github.ts` durch Octokit-Calls ersetzen, die Schemas bleiben gleich.
