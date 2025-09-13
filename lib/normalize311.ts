export type Normalized311Case = {
  id: string
  city: 'sf' | 'boston'
  category: string
  description: string
  address?: string
  createdAt?: string
  status?: string
  coordinates?: [number, number] // [lng, lat]
  raw?: any
}

export function normalizeSf311(records: any[]): Normalized311Case[] {
  return records
    .map((r) => {
      const id = String(r.case_id ?? r.service_request_id ?? r.objectid ?? cryptoRandom())
      const category = String(r.service_name ?? r.category ?? r.request_type ?? 'Unknown')
      const description = String(
        r.description ?? r.status_notes ?? r.request_details ?? r.service_subtype ?? ''
      )
      const address = r.address ?? r.address_as_string ?? r.address_text ?? undefined
      const status = r.status_description ?? r.status ?? undefined
      const createdAt = r.requested_datetime ?? r.opened ?? r.created_date ?? undefined
      let lng: number | undefined
      let lat: number | undefined
      if (r.point_geom && Array.isArray(r.point_geom.coordinates)) {
        // Socrata geometry column
        lng = Number(r.point_geom.coordinates[0])
        lat = Number(r.point_geom.coordinates[1])
      } else if (r.point && (r.point.longitude ?? r.point.latitude)) {
        lng = Number(r.point.longitude)
        lat = Number(r.point.latitude)
      } else if (r.long && r.lat) {
        lng = Number(r.long)
        lat = Number(r.lat)
      } else if (r.longitude && r.latitude) {
        lng = Number(r.longitude)
        lat = Number(r.latitude)
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

export function normalizeBoston311(records: any[]): Normalized311Case[] {
  return records
    .map((r) => {
      const id = String(r.service_request_id ?? r.case_id ?? cryptoRandom())
      const category = String(r.service_name ?? r.service_code ?? 'Unknown')
      const description = String(r.description ?? r.service_notice ?? '')
      const address = r.address ?? r.request_address ?? undefined
      const status = r.status ?? undefined
      const createdAt = r.requested_datetime ?? r.created_at ?? undefined
      let lng: number | undefined
      let lat: number | undefined
      if (r.long && r.lat) {
        lng = Number(r.long)
        lat = Number(r.lat)
      } else if (r.longitude && r.latitude) {
        lng = Number(r.longitude)
        lat = Number(r.latitude)
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


