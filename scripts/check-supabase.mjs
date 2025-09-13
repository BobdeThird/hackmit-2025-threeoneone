import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(2)
}

const supabase = createClient(url, anon)

try {
  const { data, error } = await supabase.auth.getSession()
  const output = {
    ok: !error,
    reachable: !error,
    hasSession: !!data?.session,
    message: error ? error.message : 'Connected'
  }
  console.log(JSON.stringify(output))
  process.exit(error ? 1 : 0)
} catch (e) {
  console.log(JSON.stringify({ ok: false, reachable: false, error: String(e) }))
  process.exit(1)
}


