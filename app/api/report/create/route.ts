import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type City = 'SF' | 'BOSTON' | 'NYC'

const CITY_GEOCODE_LABEL: Record<City, string> = {
  NYC: 'New York, NY',
  BOSTON: 'Boston, MA',
  SF: 'San Francisco, CA',
}

async function geocode(address: string, city: City) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null
  const q = encodeURIComponent(`${address}, ${CITY_GEOCODE_LABEL[city]}`)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?limit=1&access_token=${token}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const json = await res.json()
  const feat = json?.features?.[0]
  const center = Array.isArray(feat?.center) && feat.center.length === 2 ? (feat.center as [number, number]) : null
  return center
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const description: string = body?.description || ''
    const street_address: string = body?.street_address || body?.location || ''
    const cityRaw: string = (body?.city || '').toUpperCase()
    const city: City = (['SF', 'BOSTON', 'NYC'].includes(cityRaw) ? cityRaw : 'SF') as City
    const imageUrl: string | undefined = body?.imageUrl || undefined

    if (!street_address || !description) return NextResponse.json({ error: 'street_address and description required' }, { status: 400 })

    const coords = await geocode(street_address, city)
    if (!coords) return NextResponse.json({ error: 'geocoding failed' }, { status: 400 })
    const [lon, lat] = coords

    const nowIso = new Date().toISOString()

    const insertPayload = {
      street_address,
      latitude: lat,
      longitude: lon,
      images: imageUrl ? [imageUrl] : [],
      reported_time: nowIso,
      description,
      native_id: null as string | null,
      status: null as string | null,
      source_scraper: 'user',
      ranking: 999,
      summary: description,
      estimated_time: 0,
      // department: omit to avoid enum mismatch; DB default or trigger may set this
      city,
      upvotes: null as number | null,
      downvotes: null as number | null,
    }

    const { data, error } = await supabaseAdmin
      .from('report_ranked')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data?.id })
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


