type Listener = () => void
const unauthorized = new Set<Listener>()

export function onUnauthorized(listener: Listener): () => void {
  unauthorized.add(listener)
  return () => unauthorized.delete(listener)
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const response = init === undefined ? await fetch(input) : await fetch(input, init)
  if (response.status === 401) unauthorized.forEach((l) => l())
  return response
}
