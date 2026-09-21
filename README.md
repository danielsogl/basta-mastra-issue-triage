# Issue-Triage mit Mastra

Demo-Projekt zum Vortrag **„Agents bauen mit Mastra“** (BASTA! Mainz 2026).

Ein Agent triagiert GitHub-Issues des fiktiven Projekts `acme/shop-api`. Er klassifiziert sie, sucht Duplikate, entwirft eine Antwort und postet erst nach menschlicher Freigabe. Die Issues kommen aus [`data/issues.json`](data/issues.json), damit alles offline und ohne GitHub-Token läuft. „Posten“ schreibt den Kommentar ins Terminal.

## Setup

Voraussetzung: Node.js ≥ 22.18 (führt TypeScript direkt aus).

```bash
npm install
cp .env.example .env   # ANTHROPIC_API_KEY eintragen
npm run dev            # Studio: http://localhost:4111
```

Standardmodell ist `anthropic/claude-sonnet-5`. Für einen anderen Provider setzt du in `.env` zum Beispiel `MODEL=openai/gpt-5-mini` und `OPENAI_API_KEY`. Mastra erkennt den Provider am Präfix, zusätzliche Pakete brauchst du nicht.

## Mit einem Coding-Agent weiterbauen

Im Repo liegt der offizielle [Mastra-Skill](https://github.com/mastra-ai/skills) unter `.agents/skills/mastra` (für Claude Code verlinkt nach `.claude/skills/mastra`). Er bringt deinem Coding-Agent bei, die aktuelle Mastra-API in `node_modules/@mastra/*/dist/docs/` nachzuschlagen, statt veralteten Trainingsdaten zu vertrauen. Claude Code, Cursor, Codex und Co. finden ihn automatisch.

```bash
npx skills update mastra -p   # Skill aktualisieren
```

## Die Steps

Jeder Step ist ein Git-Tag. `git checkout step-03` springt zum jeweiligen Stand, `git diff step-02 step-03` zeigt, was dazukam. Nach einem Checkout lädt `npm run dev` automatisch neu. Zurück zum Endstand geht es mit `git checkout main`.

Die Terminal-Befehle führst du in einem zweiten Terminal im Projektordner aus.

### step-01: Agent + Tools

Ein Agent mit zwei Tools (`getIssue`, `searchIssues`) und Tracing im Studio.

- Studio → Agents → *Triage Agent* → „Triagiere Issue #104“
- Terminal: `node --env-file=.env scripts/triage.ts 105`

Erwartet: Du siehst die Tool-Calls im Chat. #104 bekommt die Priorität **critical** (doppelte Abbuchungen in Produktion), bei #105 nennt der Agent die Duplikate #101 und #90.

### step-02: Memory

Working Memory mit Team-Konventionen, gültig über alle Threads (`scope: 'resource'`).

1. Im Chat: „Merke dir: Performance-Themen bekommen immer das Label perf. Zuständig ist Team Platform.“
2. *New Chat* → „Triagiere Issue #107“

Erwartet: Label `perf` und Team Platform, obwohl der neue Thread davon nichts weiß. Unten links unter *Memory* steht der gespeicherte Stand.

### step-03: Workflow

Issue laden, dann parallel klassifizieren (Structured Output) und Duplikate suchen, danach verzweigen: als Duplikat schließen (Template, kein LLM) oder eine Antwort entwerfen.

- Studio → Workflows → *triage-workflow* → Issue Number `105` → *Run*, danach dasselbe mit `104`

Erwartet: Bei 105 läuft der Graph über `close-as-duplicate`, bei 104 über `draft-reply`.

### step-04: Human-in-the-Loop

Der Workflow pausiert vor dem Posten (`suspend`) und läuft nach der Freigabe weiter (`resume`). Außerdem verlangt das Tool `postComment` im Agent eine Bestätigung (`requireApproval`).

- Studio: Workflow mit `104` starten. Er stoppt bei *human-review* mit „Needs input“. Setz den Haken bei *Approved*, pass den Kommentar bei Bedarf an und klick *Resume*.
- Terminal: `node --env-file=.env scripts/run-workflow.ts 104` (Freigabe mit `j` oder `n`)
- Agent-Chat: „Triagiere #108 und poste einen Kommentar“

Erwartet: Der Kommentar erscheint erst nach der Freigabe im Terminal von `npm run dev` (💬). Im Chat erscheinen *Approve*/*Decline*.

### step-05: MCP-Server

Agent und Tools als MCP-Server unter `http://localhost:4111/api/mcp/triage/mcp`. Die Konfigurationen für Claude Code (`.mcp.json`) und Cursor (`.cursor/mcp.json`) liegen im Repo.

- `npm run dev` muss laufen
- Im Projektordner `claude` starten, mit `/mcp` prüfen, ob *triage* verbunden ist
- „Nutze triage, um Issue #104 zu bewerten“

Erwartet: Claude Code ruft `ask_triageAgent` auf und gibt die Triage zurück.

### step-06: Evals & Tracing

Quick Checks als Vitest-Tests: Wurde das richtige Tool aufgerufen, steht „critical“ im Text, wurde nichts gepostet?

- `npm run eval`
- Studio → Observability → *Traces* → einen Workflow-Lauf aufklappen

Erwartet: 3 grüne Tests mit Score-Tabelle (ca. 40 s). Im Trace siehst du jeden Schritt, Modellaufruf und Tool-Call mit Tokens und Latenz.

### step-07: Durable Agents

Derselbe Agent, dessen Loop als Workflow läuft. Ein Client kann die Verbindung verlieren, ein anderer hängt sich per `observe(runId)` wieder an.

- `node --env-file=.env scripts/durable.ts 104`

Erwartet: Nach 15 Chunks kommt „🔌 Verbindung weg“, danach wird der komplette Text von vorn nachgeliefert und es erscheint „✅ Vollständig“.

## Wenn etwas hakt

| Problem | Lösung |
|---|---|
| `Could not find API key` | `.env` fehlt oder `ANTHROPIC_API_KEY` ist leer. Skripte immer mit `--env-file=.env` starten. |
| Agent kennt alte Konventionen | Memory zurücksetzen: `npm run dev` stoppen, `rm -f mastra.db* src/mastra/public/mastra.*`, neu starten. |
| MCP-Server in Claude Code nicht verbunden | `npm run dev` läuft nicht, oder die `.mcp.json` wurde beim ersten Start nicht freigegeben (`/mcp`). |
| `npm warn install-scripts` beim Installieren | Harmlos, die Demo braucht die Install-Skripte von esbuild und fsevents nicht. |
| Evals werden übersprungen | Ohne `ANTHROPIC_API_KEY` (oder `MODEL`) in `.env` laufen sie absichtlich nicht. |

## Projektstruktur

```text
data/issues.json            Fixture-Issues statt GitHub-API
src/mastra/
  index.ts                  Mastra-Instanz: Agents, Workflows, MCP, Storage, Observability
  agents/                   Triage-Agent und seine Durable-Variante
  tools/github.ts           getIssue, searchIssues, postComment
  workflows/                triage-workflow
  mcp/server.ts             MCP-Server
tests/                      Evals (Vitest)
.agents/skills/mastra/       Mastra-Skill für Coding-Agents
scripts/                    Runner fürs Terminal
```

## Weiterführend

- Doku: <https://mastra.ai/docs>, für Coding-Agents <https://mastra.ai/llms.txt>
- Echte GitHub-Anbindung: `execute()` in `src/mastra/tools/github.ts` durch Octokit-Calls ersetzen, die Schemas bleiben gleich.
