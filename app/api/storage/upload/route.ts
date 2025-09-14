import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const BUCKET = 'main-user-post-storage'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

    const safeName = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: upload, error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(safeName, buffer, { contentType: file.type, cacheControl: '3600', upsert: false })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // Always return a signed URL to work regardless of bucket privacy
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(upload.path, 60 * 60 * 24 * 30) // 30 days
    if (signErr) return NextResponse.json({ error: signErr.message }, { status: 500 })

    return NextResponse.json({ path: upload.path, url: signed.signedUrl })
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


