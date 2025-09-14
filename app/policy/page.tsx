'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type StreamEvent = { event: string; data: unknown }

export default function PolicyPage() {
  const [running, setRunning] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [lines, setLines] = useState<Array<{ agent: string; text: string }>>([])
  const sourceRef = useRef<EventSource | null>(null)

  const startRun = async () => {
    if (running) return
    setRunning(true)
    setLines([])
    // Use fetch with event-stream via /api/agents/run
    const url = '/api/agents/run'
    const params = { city: 'sf', enableCodeInterpreter: true, enableWebSearch: true }
    const es = new EventSource(url + '?' + new URLSearchParams({ q: JSON.stringify(params) }))
    sourceRef.current = es
    es.addEventListener('started', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setRunId(data.runId)
    })
    es.addEventListener('token', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setLines((prev) => [...prev, { agent: data.agent, text: data.text }])
    })
    es.addEventListener('done', () => {
      setRunning(false)
      es.close()
    })
    es.addEventListener('error', (_e) => {
      setRunning(false)
      es.close()
    })
  }

  // Auto-start a real run on first mount
  useEffect(() => {
    if (!running && !runId && !sourceRef.current) {
      void startRun()
    }
  }, [running, runId, startRun])

  const grouped = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const { agent, text } of lines) {
      if (!m.has(agent)) m.set(agent, [])
      m.get(agent)!.push(text)
    }
    return Array.from(m.entries())
  }, [lines])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Policy Orchestration</h1>
        <button
          onClick={startRun}
          disabled={running}
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {running ? 'Running…' : 'Start Analysis'}
        </button>
      </div>
      {runId && (
        <div className="text-sm text-gray-600">Run: {runId}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['anomaly','cluster','causal','synthesize'].map((agent) => {
          const parts = grouped.find(([a]) => a === agent)?.[1] ?? []
          const content = parts.join('')
          const isActive = running && (!!content || ['anomaly','cluster','causal','synthesize'].includes(agent))
          return (
            <div key={agent} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{agent}</div>
                <div className={`text-xs ${isActive ? 'text-green-600' : 'text-gray-500'}`}>{isActive ? 'streaming' : 'idle'}</div>
              </div>
              <div className="prose prose-sm max-w-none">
                {content ? <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} /> : <div className="text-sm text-gray-500">Waiting for output…</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


