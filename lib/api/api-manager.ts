export type ApiResult = {
  ok: boolean
  status: number
  data: unknown
  text: string
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseData: unknown
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export async function apiManager(
  endpoint: string,
  init?: RequestInit,
  baseUrl?: string
): Promise<ApiResult> {
  const url = baseUrl ? new URL(endpoint, baseUrl).toString() : endpoint
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
  })
  const text = await response.text()
  let data: unknown = null

  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = null
    }
  }

  return { ok: response.ok, status: response.status, data, text }
}
