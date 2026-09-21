import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { getIssue, postComment, searchIssues } from '../tools/github.ts'

export const triageAgent = new Agent({
  id: 'triage-agent',
  name: 'Triage Agent',
  description: 'Analysiert GitHub-Issues: Typ, Priorität, Labels und mögliche Duplikate.',
  instructions: `
    Du bist ein erfahrener Maintainer des Projekts "acme/shop-api" und triagierst GitHub-Issues.

    Vorgehen:
    1. Lade das Issue mit getIssue.
    2. Suche mit searchIssues nach Duplikaten (2-4 prägnante Stichwörter, das Issue selbst ausschließen).
    3. Bestimme Typ (bug | feature | question), Priorität (low | medium | high | critical) und passende Labels.
    4. Antworte kurz und strukturiert auf Deutsch. Nenne Duplikate mit Nummer.
    5. Nur wenn der Nutzer es ausdrücklich möchte: Kommentar mit postComment veröffentlichen.

    Produktionsausfälle oder Geldverlust sind immer "critical".
    Halte Team-Konventionen (Labels, Zuständigkeiten), die dir genannt werden, im Working Memory fest und wende sie an.
  `,
  // Modell per .env austauschbar, z. B. MODEL=openai/gpt-5.4-mini
  model: process.env.MODEL ?? 'anthropic/claude-sonnet-5',
  tools: { getIssue, searchIssues, postComment },
  // Storage kommt von der Mastra-Instanz (LibSQL)
  memory: new Memory({
    options: {
      // Team-Konventionen gelten über alle Threads hinweg (scope: resource)
      workingMemory: {
        enabled: true,
        scope: 'resource',
        template: `# Team-Konventionen
- **Labels**:
- **Zuständigkeiten**:
- **Sonstiges**:
`,
      },
    },
  }),
})
