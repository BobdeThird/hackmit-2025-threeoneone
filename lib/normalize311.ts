export type Normalized311Case = {
  id: string
  city: 'sf' | 'boston'
  category: string
  description: string
  address?: string
  createdAt?: string
  status?: string
  coordinates?: [number, number] // [lng, lat]
  raw?: Record<string, unknown>
}

function getFirst<T>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const key of keys) {
    const value = obj[key]
    if (value !== undefined && value !== null && value !== '') {
      return value as T
    }
  }
  return undefined
}

export function normalizeSf311(records: unknown[]): Normalized311Case[] {
  return records
    .map((rec) => {
      const r = rec as Record<string, unknown>
      const id = String(
        getFirst<string | number>(r, ['case_id', 'service_request_id', 'objectid']) ?? cryptoRandom()
      )
      const category = String(
        getFirst<string>(r, ['service_name', 'category', 'request_type']) ?? 'Unknown'
      )
      const description = String(
        getFirst<string>(r, ['description', 'status_notes', 'request_details', 'service_subtype']) ?? ''
      )
      const address = getFirst<string>(r, ['address', 'address_as_string', 'address_text'])
      const status = getFirst<string>(r, ['status_description', 'status'])
      const createdAt = getFirst<string>(r, ['requested_datetime', 'opened', 'created_date'])
      let lng: number | undefined
      let lat: number | undefined
      const pointGeom = getFirst<{ type: string; coordinates: [number, number] }>(r, ['point_geom'])
      if (pointGeom && Array.isArray(pointGeom.coordinates)) {
        // Socrata geometry column
        lng = Number(pointGeom.coordinates[0])
        lat = Number(pointGeom.coordinates[1])
      } else {
        const point = getFirst<{ longitude?: string | number; latitude?: string | number }>(r, ['point'])
        const longStr = getFirst<string | number>(r, ['long', 'longitude']) ?? point?.longitude
        const latStr = getFirst<string | number>(r, ['lat', 'latitude']) ?? point?.latitude
        if (longStr !== undefined && latStr !== undefined) {
          lng = Number(longStr)
          lat = Number(latStr)
        }
      }
      const coordinates =
        typeof lng === 'number' && typeof lat === 'number' ? ([lng, lat] as [number, number]) : undefined
      const item: Normalized311Case = {
        id,
        city: 'sf',
        category,
        description,
        address,
        status,
        createdAt,
        coordinates,
        raw: r,
      }
      return item
    })
    .filter((i) => i.coordinates)
}

export function normalizeBoston311(records: unknown[]): Normalized311Case[] {
  return records
    .map((rec) => {
      const r = rec as Record<string, unknown>
      const id = String(
        getFirst<string | number>(r, ['service_request_id', 'case_id']) ?? cryptoRandom()
      )
      const category = String(
        getFirst<string>(r, ['service_name', 'service_code']) ?? 'Unknown'
      )
      const description = String(
        getFirst<string>(r, ['description', 'service_notice']) ?? ''
      )
      const address = getFirst<string>(r, ['address', 'request_address'])
      const status = getFirst<string>(r, ['status'])
      const createdAt = getFirst<string>(r, ['requested_datetime', 'created_at'])
      let lng: number | undefined
      let lat: number | undefined
      const longStr = getFirst<string | number>(r, ['long', 'longitude'])
      const latStr = getFirst<string | number>(r, ['lat', 'latitude'])
      if (longStr !== undefined && latStr !== undefined) {
        lng = Number(longStr)
        lat = Number(latStr)
      }
      const coordinates =
        typeof lng === 'number' && typeof lat === 'number' ? ([lng, lat] as [number, number]) : undefined
      const item: Normalized311Case = {
        id,
        city: 'boston',
        category,
        description,
        address,
        status,
        createdAt,
        coordinates,
        raw: r,
      }
      return item
    })
    .filter((i) => i.coordinates)
}

function cryptoRandom(): string {
  try {
    // Runtime-safe random fallback if crypto not available
    return Math.random().toString(36).slice(2)
  } catch {
    return Date.now().toString(36)
  }
}


