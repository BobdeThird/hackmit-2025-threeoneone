import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { appendEvent } from '@/lib/progress'

export const runtime = 'nodejs'

type SynthesizeRequestBody = {
  runId: string
  city?: string
  input?: { context?: string }
}

export async function POST(req: Request) {
  const body = (await req.json()) as SynthesizeRequestBody
  const runId = body.runId
  const city = body.city
  const input = body.input

  const messages = [
    { role: 'user' as const, content: `City: ${city ?? 'unknown'}. Synthesize an executive policy brief and an operational playbook.` },
  ]
  if (input?.context) {
    messages.push({ role: 'user' as const, content: `Context (markdown):\n${input.context}` })
  }

  const stream = await streamText({
    model: openai('gpt-5'),
    system:
      'You are the Policy Synthesis Agent. Stream structured markdown.\n' +
      'Output format:\n' +
      '# Executive Summary\n' +
      '...\n' +
      '## Key Findings\n' +
      '...\n' +
      '## Recommendations\n' +
      '...\n' +
      '## Implementation Plan\n' +
      '...\n',
    messages,
    providerOptions: { openai: { reasoning_effort: 'minimal' } }
  })

  await appendEvent({ runId, agent: 'synthesize', level: 'started', message: 'started' })
  return stream.toTextStreamResponse()
}


