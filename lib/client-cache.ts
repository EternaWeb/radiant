type CacheEntry<T> = {
  data: T
  fetchedAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export async function fetchCached<T>(url: string, ttlMs: number, init?: RequestInit): Promise<T> {
  const key = `${init?.method ?? "GET"}:${url}`
  const hit = cache.get(key) as CacheEntry<T> | undefined

  if (hit && Date.now() - hit.fetchedAt < ttlMs) {
    return hit.data
  }

  const response = await fetch(url, init)
  const data = (await response.json()) as T

  if (response.ok) {
    cache.set(key, { data, fetchedAt: Date.now() })
  }

  return data
}

export function invalidateCached(urlPrefix: string) {
  for (const key of cache.keys()) {
    if (key.includes(urlPrefix)) cache.delete(key)
  }
}
