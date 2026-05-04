import { NextRequest, NextResponse } from "next/server"

// Runs in the Edge runtime — no Node.js modules allowed.
// Extracts the tenant slug from the subdomain and forwards it as a header.
// Actual DB lookup happens in server components via getTenantFromHeaders().
export async function proxy(req: NextRequest) {
  const hostname  = req.headers.get("host") || ""
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "pidge.io"
  const pathname  = req.nextUrl.pathname

  if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
    return NextResponse.next()
  }

  // "riverside.pidge.io" → "riverside"
  let slug = hostname.replace(`.${appDomain}`, "").replace(appDomain, "")

  // Local dev (Chrome/Firefox): "riverside.localhost:3000" → "riverside"
  if (!slug || slug === hostname) {
    const localMatch = hostname.match(/^([^.]+)\.localhost(:\d+)?$/)
    if (localMatch) slug = localMatch[1]
  }

  // Local dev (Safari / any browser): ?__tenant=riverside
  if ((!slug || slug === hostname) && process.env.NODE_ENV === "development") {
    const tenantParam = req.nextUrl.searchParams.get("__tenant")
    if (tenantParam) slug = tenantParam
  }

  if (!slug || slug === hostname) {
    return NextResponse.next() // root domain — no tenant
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-tenant-slug", slug)

  // First path segment forwarded so layouts can resolve the branch
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? ""
  if (firstSegment) {
    requestHeaders.set("x-branch-slug-candidate", firstSegment)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
