import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { appendEvent } from '@/lib/progress'

export const runtime = 'nodejs'

type CausalRequestBody = {
  runId: string
  city?: string
  input?: { context?: string }
  enableCodeInterpreter?: boolean
  enableWebSearch?: boolean
}

export async function POST(req: Request) {
  const body = (await req.json()) as CausalRequestBody
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

  const messages = [
    { role: 'user' as const, content: `City: ${city ?? 'unknown'}. Hypothesize likely causes by correlating anomalies/clusters with local news/posts.` },
  ]
  if (input?.context) {
    messages.push({ role: 'user' as const, content: `Context (markdown):\n${input.context}` })
  }

  const stream = await streamText({
    model: openai('gpt-5'),
    system:
      'You are the Causal Inference Agent. Stream your reasoning as structured, audience-safe notes.\n' +
      'Output format during streaming:\n' +
      "REASONING: <concise step>\n" +
      '... (repeat while working)\n' +
      "FINAL: <causal hypotheses with confidence and citations>\n" +
      `Capabilities: ${capabilitiesNote}.`,
    messages,
    providerOptions: { openai: { reasoning_effort: 'minimal' } }
  })

  await appendEvent({ runId, agent: 'causal', level: 'started', message: 'started' })
  return stream.toTextStreamResponse()
}


