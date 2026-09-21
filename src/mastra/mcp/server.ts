import { MCPServer } from '@mastra/mcp'
import { triageAgent } from '../agents/triage-agent.ts'
import { getIssue, searchIssues } from '../tools/github.ts'

// Agent wird zum Tool "ask_triageAgent", Tools werden 1:1 durchgereicht
export const triageMcpServer = new MCPServer({
  id: 'triage',
  name: 'Issue Triage',
  version: '1.0.0',
  description: 'Triage für GitHub-Issues von acme/shop-api',
  agents: { triageAgent },
  tools: { getIssue, searchIssues },
})
