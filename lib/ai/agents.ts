import { generateText, dynamicTool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { runSupabaseQuery, type SqlQueryInput } from './supabaseTool'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Shared tool: Supabase query
export const supabaseQueryTool = dynamicTool({
  description: 'Query Supabase Postgres tables (paginated).',
  inputSchema: z.object({
    table: z.string(),
    select: z.string().optional(),
    where: z
      .array(
        z.object({
          column: z.string(),
          op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'in']),
          value: z.any(),
        })
      )
      .optional(),
    orderBy: z.object({ column: z.string(), ascending: z.boolean().optional() }).optional(),
    limit: z.number().int().min(1).max(5000).optional(),
    offset: z.number().int().min(0).optional(),
  }),
  execute: async (args) => {
    const data = await runSupabaseQuery(args as SqlQueryInput)
    // Truncate very large payloads for safety
    return Array.isArray(data) && data.length > 5000 ? data.slice(0, 5000) : data
  },
})

type AgentName = 'anomaly' | 'cluster' | 'causal' | 'run' | 'synthesize'

const SYSTEM_BASE = `You are part of a multi-agent analysis pipeline over municipal 311 data.
- Always use the supabaseQuery tool to fetch data; do not fabricate.
- Work in tight loops: query small slices, analyze, then iterate.
- Be concise; output JSON summaries when listing findings.`

const SYSTEMS: Record<AgentName, string> = {
  anomaly: `${SYSTEM_BASE}
ROLE: Senior data scientist for anomaly discovery.
STRATEGY: Try many queries. Vary filters by city, department, status, time. Seek spikes, drops, outliers, rare categories, and sudden changes. Return top anomalies with metrics.
OUTPUT: JSON with fields: { queriesTried: string[], anomalies: { title, description, metric, evidenceRows }[] }`,
  cluster: `${SYSTEM_BASE}
ROLE: Data scientist for clustering and theme discovery.
STRATEGY: Pull samples (by department/status) and group by description keywords; suggest cluster labels and example items.
OUTPUT: JSON { clusters: { label, keywords, exampleIds: string[], size }[] }`,
  causal: `${SYSTEM_BASE}
ROLE: Analyst exploring possible relationships.
STRATEGY: Use correlation-style reasoning (not causal proof). Compare counts across time/areas/departments.
OUTPUT: JSON { hypotheses: { description, support }[] }`,
  run: `${SYSTEM_BASE}
ROLE: Executor to run precise follow-up checks.
OUTPUT: JSON { results: any }`,
  synthesize: `${SYSTEM_BASE}
ROLE: Policy analyst combining all prior outputs into a short report.
OUTPUT: Markdown summary + bullet points of recommendations.`,
}

export async function runAgent(params: { agent: AgentName; prompt?: string }) {
  const { agent, prompt } = params
  const system = SYSTEMS[agent]
  const model = openai('gpt-4o-mini')
  const res = await generateText({
    model,
    system,
    maxOutputTokens: 2000,
    tools: { supabaseQuery: supabaseQueryTool },
    prompt: prompt ?? 'Start by probing the most obvious anomalies; iterate fast.'
  })
  return res.text
}


