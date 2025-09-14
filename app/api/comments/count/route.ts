import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// GET /api/comments/count?ids=a,b,c  (kept for backward-compat)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids')
  if (!idsParam) return NextResponse.json({ error: 'ids required' }, { status: 400 })
  const ids = idsParam.split(',').filter(Boolean)
  return countByIds(ids)
}

// POST /api/comments/count  { ids: string[] }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const ids = (body?.ids as string[] | undefined)?.filter(Boolean) ?? []
    if (ids.length === 0) return NextResponse.json({ counts: {} })
    return countByIds(ids)
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
}

async function countByIds(ids: string[]) {
  const { data, error } = await supabaseAdmin
    .from('comments')
    .select('report_id', { head: false })
    .in('report_id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, number> = {}
  for (const id of ids) counts[id] = 0
  const rows = ((data ?? []) as { report_id: string | number | null }[])
  for (const row of rows) {
    const rid = String(row.report_id)
    counts[rid] = (counts[rid] ?? 0) + 1
  }
  return NextResponse.json({ counts })
}


