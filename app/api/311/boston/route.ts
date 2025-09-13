import { NextResponse } from 'next/server'
import { normalizeBoston311 } from '@/lib/normalize311'

// Primary: Boston Open311. If unavailable, fallback to Analyze Boston (CKAN) datastore.
const OPEN311_URL = 'https://mayors24.cityofboston.gov/open311/v2/requests.json'
const CKAN_SEARCH = 'https://data.boston.gov/api/3/action/package_search?q=title:311%20Service%20Requests&rows=1'
const CKAN_DATASTORE = 'https://data.boston.gov/api/3/action/datastore_search'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'open'
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '200'), 1), 1000)

  // Try Open311 first
  try {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    params.set('page_size', String(limit))
    const res = await fetch(`${OPEN311_URL}?${params.toString()}`, { next: { revalidate: 60 } })
    if (res.ok) {
      const data = await res.json()
      const normalized = normalizeBoston311(Array.isArray(data) ? data : [])
      return NextResponse.json({ count: normalized.length, items: normalized })
    }
  } catch {}

  // Fallback: CKAN search + datastore
  try {
    const searchRes = await fetch(CKAN_SEARCH, { next: { revalidate: 600 } })
    if (!searchRes.ok) throw new Error('ckan search failed')
    const searchJson = await searchRes.json()
    const pkg = searchJson?.result?.results?.[0]
    const resource = (pkg?.resources || []).find((r: any) => r.datastore_active)
    const resourceId = resource?.id
    if (!resourceId) throw new Error('no datastore resource')

    const dsParams = new URLSearchParams()
    dsParams.set('resource_id', resourceId)
    dsParams.set('limit', String(limit))
    dsParams.set('sort', 'open_dt desc')
    const dsRes = await fetch(`${CKAN_DATASTORE}?${dsParams.toString()}`, { next: { revalidate: 60 } })
    if (!dsRes.ok) throw new Error('ckan datastore failed')
    const ds = await dsRes.json()
    const records = ds?.result?.records ?? []
    const normalized = normalizeBoston311(records)
    return NextResponse.json({ count: normalized.length, items: normalized, source: 'ckan' })
  } catch (e) {
    return NextResponse.json({ error: 'Upstream error' }, { status: 503 })
  }
}


