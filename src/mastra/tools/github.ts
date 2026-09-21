import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import issues from "../../../data/issues.json" with { type: "json" };

// ponytail: fixtures statt GitHub-API, damit die Demo offline läuft.
// Für echte Repos: execute() durch Octokit-Calls ersetzen, Schemas bleiben gleich.

export const issueSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string(),
  author: z.string(),
  state: z.enum(["open", "closed"]),
  labels: z.array(z.string()),
});

export const getIssue = createTool({
  id: "getIssue",
  description: "Lädt ein GitHub-Issue anhand seiner Nummer",
  inputSchema: z.object({
    number: z.number().describe("Issue-Nummer, z. B. 101"),
  }),
  outputSchema: issueSchema,
  execute: async ({ number }) => {
    const issue = issues.find((i) => i.number === number);
    if (!issue) throw new Error(`Issue #${number} nicht gefunden`);
    return issueSchema.parse(issue);
  },
});

export const searchIssues = createTool({
  id: "searchIssues",
  description:
    "Sucht Issues (offen und geschlossen), deren Titel oder Text eines der Stichwörter enthält. Nützlich für Duplikate.",
  inputSchema: z.object({
    keywords: z
      .array(z.string())
      .describe('Stichwörter, z. B. ["SSO", "Timeout"]'),
    excludeNumber: z
      .number()
      .optional()
      .describe("Dieses Issue aus den Ergebnissen ausschließen"),
  }),
  outputSchema: z.object({ results: z.array(issueSchema) }),
  execute: async ({ keywords, excludeNumber }) => {
    const needles = keywords.map((k) => k.toLowerCase());
    const results = issues.filter(
      (i) =>
        i.number !== excludeNumber &&
        needles.some((n) => `${i.title} ${i.body}`.toLowerCase().includes(n)),
    );
    return { results: z.array(issueSchema).parse(results) };
  },
});
