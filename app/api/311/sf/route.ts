import { NextResponse } from 'next/server'
import { normalizeSf311 } from '@/lib/normalize311'

// SF Socrata dataset: 311 Cases (vw6y-z8j6)
const SF_DATASET = 'vw6y-z8j6'
const SF_URL = `https://data.sfgov.org/resource/${SF_DATASET}.json`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? '200')
  const where = searchParams.get('$where') ?? undefined
  const select = searchParams.get('$select') ?? undefined

  const params = new URLSearchParams()
  params.set('$limit', String(Math.min(Math.max(limit, 1), 1000)))
  params.set('$order', 'requested_datetime DESC')
  params.set('$select', select ?? '*')
  if (where) params.set('$where', where)

  // Optional: Socrata app token support via env
  const headers: Record<string, string> = {}
  if (process.env.SFGOV_APP_TOKEN) headers['X-App-Token'] = process.env.SFGOV_APP_TOKEN

  const res = await fetch(`${SF_URL}?${params.toString()}`, { headers, next: { revalidate: 60 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: res.status })
  const data = await res.json()
  const normalized = normalizeSf311(Array.isArray(data) ? data : [])

  return NextResponse.json({ count: normalized.length, items: normalized })
}


