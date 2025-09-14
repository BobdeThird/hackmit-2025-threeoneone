import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Lightweight server-side Supabase client for tool usage
function getServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  if (!url || !anon) throw new Error('Missing Supabase env')
  return createClient(url, anon)
}

export type SqlQueryInput = {
  table: string
  select?: string
  where?: Array<{ column: string; op: 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'ilike'|'in'; value: unknown }>
  orderBy?: { column: string; ascending?: boolean }
  limit?: number
  offset?: number
}

export async function runSupabaseQuery(input: SqlQueryInput) {
  const supabase = getServerSupabase()
  const {
    table,
    select = '*',
    where = [],
    orderBy,
    limit = 1000,
    offset = 0,
  } = input

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from(table).select(select)
  for (const w of where) {
    if (w.op === 'in' && Array.isArray(w.value)) {
      query = query.in(w.column, w.value)
    } else if (w.op === 'ilike' && typeof w.value === 'string') {
      query = query.ilike(w.column, w.value)
    } else if (w.op in query) {
      query = query[w.op](w.column, w.value)
    }
  }
  if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
  if (typeof offset === 'number' || typeof limit === 'number') query = query.range(offset, offset + Math.max(0, limit) - 1)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}


