export function appBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  const fallback = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://pikatym.com"
  return (rawUrl ?? fallback).replace(/\/+$/, "")
}

export function tenantUrl(slug: string, pathname = "/", params: Record<string, string | undefined> = {}) {
  const url = new URL(pathname, appBaseUrl())
  url.searchParams.set("__tenant", slug)

  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }

  return url.toString()
}
