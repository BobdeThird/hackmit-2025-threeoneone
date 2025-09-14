const STORAGE_KEY = 'threeoneone_client_id'

function randomId() {
  // Basic RFC4122 v4-ish
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getClientId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = randomId()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}


