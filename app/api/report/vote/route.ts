import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Body: { report_id: string, action: 'up'|'down'|'remove', previous?: 'up'|'down'|null }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const report_id: string | undefined = body?.report_id
    const action: 'up'|'down'|'remove' | undefined = body?.action
    const previous: 'up'|'down'|null | undefined = body?.previous
    if (!report_id || !action) return NextResponse.json({ error: 'report_id and action required' }, { status: 400 })

    // Compute deltas for nullable columns
    let upDelta = 0
    let downDelta = 0
    if (action === 'remove') {
      if (previous === 'up') upDelta = -1
      if (previous === 'down') downDelta = -1
    } else if (action === 'up') {
      upDelta = 1
      if (previous === 'down') downDelta = -1
    } else if (action === 'down') {
      downDelta = 1
      if (previous === 'up') upDelta = -1
    }

    // Read existing counts
    const { data: current, error: readErr } = await supabaseAdmin
      .from('report_ranked')
      .select('id, upvotes, downvotes')
      .eq('id', report_id)
      .single()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })

    const curUp = (current?.upvotes as number | null) ?? 0
    const curDown = (current?.downvotes as number | null) ?? 0
    const nextUp = Math.max(0, curUp + upDelta)
    const nextDown = Math.max(0, curDown + downDelta)

    const { error: updErr } = await supabaseAdmin
      .from('report_ranked')
      .update({ upvotes: nextUp, downvotes: nextDown })
      .eq('id', report_id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({ upvotes: nextUp, downvotes: nextDown })
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


