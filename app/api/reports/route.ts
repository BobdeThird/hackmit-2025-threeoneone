import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

type CityParam = 'sf' | 'boston' | 'nyc'

function toDbCity(values: CityParam[] | undefined): ('SF' | 'BOSTON' | 'NYC')[] | undefined {
  if (!values || values.length === 0) return undefined
  return Array.from(new Set(values.map((v) => v.toLowerCase() as CityParam))).map((v) => {
    if (v === 'sf') return 'SF'
    if (v === 'boston') return 'BOSTON'
    return 'NYC'
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '500'), 1), 10000)
  const cityParam = searchParams.get('city')
  const status = searchParams.get('status') ?? undefined
  const department = searchParams.get('department') ?? undefined

  const cities = cityParam
    ? (cityParam.split(',').map((c) => c.trim().toLowerCase()) as CityParam[])
    : undefined

  const dbCities = toDbCity(cities)

  // Get total count with same filters
  let countQuery = supabase.from('report_ranked').select('id', { count: 'exact', head: true })
  if (dbCities && dbCities.length > 0) countQuery = countQuery.in('city', dbCities)
  if (status) countQuery = countQuery.eq('status', status)
  if (department) countQuery = countQuery.eq('department', department)
  const { count, error: countError } = await countQuery
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })

  // Fetch in chunks to bypass 1k limit
  const MAX_CHUNK = 1000
  type ReportRow = {
    id: string
    city: 'SF' | 'BOSTON' | 'NYC' | string
    street_address: string | null
    latitude: number | null
    longitude: number | null
    reported_time: string
    description: string | null
    status: string | null
    department: string | null
    images: unknown
  }
  type ApiItem = {
    id: string
    city: 'sf' | 'boston' | 'nyc'
    category: string
    description: string
    address: string
    createdAt: string
    status: string | null
    coordinates?: [number, number]
    images: string[]
  }
  const itemsAcc: ApiItem[] = []
  let offset = 0
  while (itemsAcc.length < limit) {
    const from = offset
    const to = Math.min(offset + Math.min(MAX_CHUNK, limit - itemsAcc.length) - 1, from + MAX_CHUNK - 1)
    let q = supabase
      .from('report_ranked')
      .select('id, city, street_address, latitude, longitude, reported_time, description, status, department, images')
      .order('reported_time', { ascending: false })
      .range(from, to)
    if (dbCities && dbCities.length > 0) q = q.in('city', dbCities)
    if (status) q = q.eq('status', status)
    if (department) q = q.eq('department', department)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const batch = (data || []) as ReportRow[]
    itemsAcc.push(
      ...batch.map((r) => ({
        id: r.id,
        city:
          (r.city === 'SF'
            ? 'sf'
            : r.city === 'BOSTON'
            ? 'boston'
            : 'nyc') as 'sf' | 'boston' | 'nyc',
        category: r.department || 'Unknown',
        description: r.description || '',
        address: (r.street_address || '') as string,
        createdAt: r.reported_time,
        status: r.status || null,
        coordinates:
          typeof r.longitude === 'number' && typeof r.latitude === 'number'
            ? ([r.longitude, r.latitude] as [number, number])
            : undefined,
        images: Array.isArray(r.images) ? (r.images as string[]) : []
      }))
    )
    if (batch.length < MAX_CHUNK) break
    offset += MAX_CHUNK
  }

  const items = itemsAcc.slice(0, limit)
  return NextResponse.json({
    total: count ?? null,
    returned: items.length,
    limit,
    items,
    source: 'supabase',
  })
}


