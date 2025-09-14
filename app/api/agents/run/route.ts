import { createRun, updateRunStatus, appendEvent } from '@/lib/progress'
export const runtime = 'nodejs'
type RunRequestBody = {
  city?: string
  input?: unknown
  enableCodeInterpreter?: boolean
  enableWebSearch?: boolean
}

async function handleRun(req: Request, params: RunRequestBody) {
  const { city, input } = params
  const enableCodeInterpreter = params.enableCodeInterpreter === true
  const enableWebSearch = params.enableWebSearch === true

  const runId = await createRun({ city, tasks: ['anomaly', 'cluster'], input_source: 'policy-run' })
  await updateRunStatus(runId, 'running')

  const base = new URL(req.url)
  const origin = `${base.protocol}//${base.host}`

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      send('started', { runId })
      await appendEvent({ runId, agent: 'orchestrator', level: 'started', message: 'run started' })

      async function forwardToken(agent: 'anomaly' | 'cluster', chunkText: string) {
        // Forward raw text chunks as tokens
        if (chunkText && chunkText.trim().length > 0) {
          send('token', { runId, agent, text: chunkText })
          await appendEvent({ runId, agent, level: 'token', message: chunkText })
        }
      }

      async function pipeAgent(agent: 'anomaly' | 'cluster') {
        const url = `${origin}/api/agents/${agent}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ runId, city, input, enableCodeInterpreter, enableWebSearch })
        })
        if (!res.body) return
        const reader = res.body.getReader()
        let done = false
        while (!done) {
          const { value, done: d } = await reader.read()
          if (value) {
            const text = new TextDecoder().decode(value)
            await forwardToken(agent, text)
          }
          done = d
        }
        send('agent_done', { runId, agent })
        await appendEvent({ runId, agent, level: 'done', message: 'done' })
      }

      try {
        await Promise.all([pipeAgent('anomaly'), pipeAgent('cluster')])
        send('done', { runId })
        await updateRunStatus(runId, 'completed')
      } catch (e) {
        send('error', { runId, error: String(e) })
        await appendEvent({ runId, agent: 'orchestrator', level: 'error', message: String(e) })
        await updateRunStatus(runId, 'failed')
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}

export async function POST(req: Request) {
  const body = (await req.json()) as RunRequestBody
  return handleRun(req, body)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')
  let body: RunRequestBody = {}
  if (q) {
    try { body = JSON.parse(q) as RunRequestBody } catch {}
  }
  return handleRun(req, body)
}


