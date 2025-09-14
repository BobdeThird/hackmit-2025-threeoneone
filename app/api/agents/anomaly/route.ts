import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { appendEvent } from '@/lib/progress'

export const runtime = 'nodejs'

type AnomalyRequestBody = {
  runId: string
  city?: string
  input?: unknown
  enableCodeInterpreter?: boolean
  enableWebSearch?: boolean
}

export async function POST(req: Request) {
  const body = (await req.json()) as AnomalyRequestBody
  const runId = body.runId
  const city = body.city
  const input = body.input
  const enableCodeInterpreter = body.enableCodeInterpreter === true
  const enableWebSearch = body.enableWebSearch === true

  const capabilitiesNote = [
    enableCodeInterpreter ? 'Code Interpreter enabled' : undefined,
    enableWebSearch ? 'Web Search enabled' : undefined,
  ]
    .filter(Boolean)
    .join(' | ')
    || 'No external tools enabled'

  const stream = await streamText({
    model: openai('gpt-5'),
    system:
      'You are the Anomaly & Trend Detector Agent. Stream your reasoning as structured, audience-safe notes.\n' +
      'Output format during streaming:\n' +
      "REASONING: <concise step>\n" +
      '... (repeat while working)\n' +
      "FINAL: <concise findings and anomaly list>\n" +
      `Capabilities: ${capabilitiesNote}.`,
    messages: [
      { role: 'user', content: `City: ${city ?? 'unknown'}. Detect anomalies and trends from input. Use the enabled capabilities when helpful.` }
    ],
    providerOptions: { openai: { reasoning_effort: 'minimal' } }
  })

  await appendEvent({ runId, agent: 'anomaly', level: 'started', message: 'started' })
  return stream.toTextStreamResponse()
}


