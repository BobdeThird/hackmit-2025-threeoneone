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
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '500'), 1), 2000)
  const cityParam = searchParams.get('city')
  const status = searchParams.get('status') ?? undefined
  const department = searchParams.get('department') ?? undefined

  const cities = cityParam
    ? (cityParam.split(',').map((c) => c.trim().toLowerCase()) as CityParam[])
    : undefined

  let query = supabase
    .from('report_ranked')
    .select(
      'id, city, street_address, latitude, longitude, reported_time, description, status, department'
    )
    .order('reported_time', { ascending: false })
    .limit(limit)

  const dbCities = toDbCity(cities)
  if (dbCities && dbCities.length > 0) {
    query = query.in('city', dbCities)
  }

  if (status) query = query.eq('status', status)
  if (department) query = query.eq('department', department)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data || []).map((r) => ({
    id: r.id as string,
    city:
      (r.city === 'SF'
        ? 'sf'
        : r.city === 'BOSTON'
        ? 'boston'
        : 'nyc') as 'sf' | 'boston' | 'nyc',
    category: (r.department as string) || 'Unknown',
    description: (r.description as string) || '',
    address: r.street_address as string,
    createdAt: r.reported_time as string,
    status: (r.status as string) || null,
    coordinates:
      typeof r.longitude === 'number' && typeof r.latitude === 'number'
        ? ([r.longitude as number, r.latitude as number] as [number, number])
        : undefined,
  }))

  return NextResponse.json({ count: items.length, items, source: 'supabase' })
}


