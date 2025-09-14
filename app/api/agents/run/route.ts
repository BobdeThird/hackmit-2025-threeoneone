import { runAgent } from '@/lib/ai/agents'

export const runtime = 'nodejs'

function sseEvent(event: string, data: unknown) {
  const encoder = new TextEncoder()
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  let params: Record<string, unknown> = {}
  try { params = q ? JSON.parse(q) : {} } catch {}

  const runId = Math.random().toString(36).slice(2)
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      controller.enqueue(sseEvent('started', { runId }))
      try {
        const agents: Array<'anomaly'|'cluster'|'causal'|'synthesize'> = ['anomaly','cluster','causal','synthesize']
        for (const agent of agents) {
          const prompt = typeof params?.city === 'string'
            ? `City: ${params.city}. Focus analysis accordingly.`
            : undefined
          const text = await runAgent({ agent, prompt })
          controller.enqueue(sseEvent('token', { agent, text }))
        }
        controller.enqueue(sseEvent('done', { runId }))
      } catch (err) {
        controller.enqueue(sseEvent('error', { message: (err as Error).message }))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// Removed duplicate orchestrator implementation to avoid redeclarations.


