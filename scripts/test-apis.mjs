import http from 'node:http'

const base = process.env.BASE_URL || 'http://localhost:3055'

async function fetchJson(path) {
  const res = await fetch(base + path, { headers: { 'user-agent': 'api-test' } })
  const ok = res.ok
  let body
  try {
    body = await res.json()
  } catch (e) {
    body = { error: 'non-json response', status: res.status }
  }
  return { ok, status: res.status, body }
}

async function main() {
  console.log('Testing against', base)
  const sf = await fetchJson('/api/311/sf?limit=5')
  const bos = await fetchJson('/api/311/boston?status=open&limit=5')

  const summary = {
    sf: {
      ok: sf.ok,
      status: sf.status,
      count: sf.body?.count ?? null,
      first: sf.body?.items?.[0] ?? null,
    },
    boston: {
      ok: bos.ok,
      status: bos.status,
      count: bos.body?.count ?? null,
      error: bos.body?.error ?? null,
    },
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((e) => {
  console.error('Test failed', e)
  process.exit(1)
})


