import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reportId = searchParams.get('report_id')
  if (!reportId) return NextResponse.json({ error: 'report_id required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('comments')
    .select('id, report_id, parent_comment_id, author_name, content, created_at')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const report_id: string | undefined = body?.report_id
    const content: string | undefined = body?.content
    const author_name: string = body?.author_name || 'Anonymous User'
    const parent_comment_id: string | null = body?.parent_comment_id ?? null

    if (!report_id || !content) {
      return NextResponse.json({ error: 'report_id and content required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({ report_id, parent_comment_id, author_name, content })
      .select('id, author_name, content, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


