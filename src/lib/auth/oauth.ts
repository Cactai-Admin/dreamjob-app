type RedirectParams = Record<string, string | undefined>

function getBaseUrl() {
  let baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'

  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`
  }

  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

export function buildOAuthRedirectUrl(path: string, params?: RedirectParams) {
  const url = new URL(path.startsWith('/') ? path.slice(1) : path, getBaseUrl())

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value)
      }
    })
  }

  return url.toString()
}
