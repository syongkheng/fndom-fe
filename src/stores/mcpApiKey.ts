import { defineStore } from 'pinia'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

export interface McpApiKeyStatus {
  hasKey: boolean
  createdDt: number | null
  keyHint: string | null
}

// The "mcp_" key for MCP clients (Claude Desktop / Claude Code) editing saved house layouts.
// The raw key is shown once on generation and never stored in the browser.
export const useMcpApiKeyStore = defineStore('mcpApiKey', () => {
  async function fetchApiKeyStatus(): Promise<McpApiKeyStatus> {
    const res = await HttpClient.get(ApiRoute.MCP_KEY.API_KEY)
    return res.data.data as McpApiKeyStatus
  }

  async function generateApiKey(): Promise<string> {
    const res = await HttpClient.post(ApiRoute.MCP_KEY.API_KEY, {})
    return res.data.data.key as string
  }

  async function revokeApiKey(): Promise<void> {
    await HttpClient.delete(ApiRoute.MCP_KEY.API_KEY)
  }

  return { fetchApiKeyStatus, generateApiKey, revokeApiKey }
})
