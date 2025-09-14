import { NextResponse } from 'next/server'
import { runAgent } from '@/lib/ai/agents'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const agent = (body?.agent as 'anomaly'|'cluster'|'causal'|'run'|'synthesize'|undefined) ?? 'anomaly'
    const prompt: string | undefined = body?.prompt
    const text = await runAgent({ agent, prompt })
    return NextResponse.json({ agent, output: text })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
