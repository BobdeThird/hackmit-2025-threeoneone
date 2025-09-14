import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DeptRow = { city: 'NYC' | 'BOSTON' | 'SF'; department: string; address: string }
type DeptLoc = DeptRow & { coordinates?: [number, number] }

const CSV_PATHS: Record<'NYC' | 'BOSTON' | 'SF', URL> = {
  NYC: new URL('../../../data/nyc.csv', import.meta.url),
  BOSTON: new URL('../../../data/boston.csv', import.meta.url),
  SF: new URL('../../../data/sf.csv', import.meta.url),
}

const cache: {
  rows?: DeptRow[]
  geocoded: Record<string, [number, number] | null>
} = { rows: undefined, geocoded: {} }

function parseCsv(content: string, city: DeptRow['city']): DeptRow[] {
  const lines = content.split(/\r?\n/).filter(Boolean)
  const out: DeptRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    if (parts.length < 2) continue
    const category = parts[0]
    const address = parts[1]
    if (!category || !address) continue
    out.push({ city, department: category.trim(), address: address.trim() })
  }
  return out
}

async function loadAllRows(): Promise<DeptRow[]> {
  if (cache.rows) return cache.rows
  const [nyc, bos, sf] = await Promise.all([
    fs.readFile(CSV_PATHS.NYC, { encoding: 'utf8' }),
    fs.readFile(CSV_PATHS.BOSTON, { encoding: 'utf8' }),
    fs.readFile(CSV_PATHS.SF, { encoding: 'utf8' }),
  ])
  const rows = [
    ...parseCsv(nyc, 'NYC'),
    ...parseCsv(bos, 'BOSTON'),
    ...parseCsv(sf, 'SF'),
  ]
  cache.rows = rows
  return rows
}

const CITY_GEOCODE_LABEL: Record<'NYC' | 'BOSTON' | 'SF', string> = {
  NYC: 'New York, NY',
  BOSTON: 'Boston, MA',
  SF: 'San Francisco, CA',
}

async function geocode(address: string, city: string): Promise<[number, number] | null> {
  const key = `${city}|${address}`
  if (cache.geocoded && cache.geocoded[key] !== undefined) return cache.geocoded[key]
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null
  const q = encodeURIComponent(`${address}, ${CITY_GEOCODE_LABEL[city as 'NYC' | 'BOSTON' | 'SF'] || city}`)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?limit=1&access_token=${token}`
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 } })
    if (!res.ok) {
      cache.geocoded[key] = null
      return null
    }
    const json = await res.json()
    const feat = json?.features?.[0]
    const coords = Array.isArray(feat?.center) && feat.center.length === 2 ? (feat.center as [number, number]) : null
    cache.geocoded[key] = coords
    return coords
  } catch {
    cache.geocoded[key] = null
    return null
  }
}

function haversine(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371e3
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

async function getRoute(from: [number, number], to: [number, number]): Promise<GeoJSON.LineString | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&overview=full&access_token=${token}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    const geom = json?.routes?.[0]?.geometry as GeoJSON.LineString | undefined
    return geom ?? null
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const city = (searchParams.get('city') || '').toUpperCase() as 'NYC' | 'BOSTON' | 'SF'
    const department = (searchParams.get('department') || '').trim()
    const fromLon = Number(searchParams.get('fromLon'))
    const fromLat = Number(searchParams.get('fromLat'))
    const includeRoute = searchParams.get('includeRoute') === 'true'

    if (!city || !department) return NextResponse.json({ error: 'city and department required' }, { status: 400 })

    const rows = await loadAllRows()
    // Normalize department label variations (e.g., Housing Buildings & Code -> Housing, Buildings & Code)
    const norm = (s: string) => s.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim()
    const target = norm(department)
    const candidates = rows.filter((r) => r.city === city && norm(r.department) === target)
    if (candidates.length === 0) return NextResponse.json({ candidates: [], nearest: null })

    const withCoords: DeptLoc[] = []
    for (const r of candidates) {
      const coords = await geocode(r.address, r.city)
      withCoords.push({ ...r, coordinates: coords ?? undefined })
    }
    const viable = withCoords.filter((c) => c.coordinates)

    let nearest: DeptLoc | null = null
    if (Number.isFinite(fromLon) && Number.isFinite(fromLat) && viable.length > 0) {
      let best = viable[0]!
      let bestDist = haversine(fromLon, fromLat, best.coordinates![0], best.coordinates![1])
      for (let i = 1; i < viable.length; i++) {
        const c = viable[i]!
        const d = haversine(fromLon, fromLat, c.coordinates![0], c.coordinates![1])
        if (d < bestDist) {
          best = c
          bestDist = d
        }
      }
      nearest = best
    }

    let route: GeoJSON.LineString | null = null
    if (includeRoute && nearest?.coordinates && Number.isFinite(fromLon) && Number.isFinite(fromLat)) {
      route = await getRoute([fromLon, fromLat], nearest.coordinates)
    }

    return NextResponse.json({ candidates: withCoords, nearest, route })
  } catch (e) {
    console.error('departments route error', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


