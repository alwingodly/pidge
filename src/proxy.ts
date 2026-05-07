import { NextRequest, NextResponse } from "next/server"

// Runs in the Edge runtime — no Node.js modules allowed.
// Extracts the tenant slug from the subdomain and forwards it as a header.
// Actual DB lookup happens in server components via getTenantFromHeaders().
export async function proxy(req: NextRequest) {
  const hostname  = req.headers.get("host") || ""
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || process.env.VERCEL_URL || "pikatym.io"
  const pathname  = req.nextUrl.pathname

  if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
    return NextResponse.next()
  }

  // "riverside.pikatym.io" → "riverside"
  let slug = hostname.replace(`.${appDomain}`, "").replace(appDomain, "")

  // Local dev (Chrome/Firefox): "riverside.localhost:3000" → "riverside"
  if (!slug || slug === hostname) {
    const localMatch = hostname.match(/^([^.]+)\.localhost(:\d+)?$/)
    if (localMatch) slug = localMatch[1]
  }

  // Fallback for plain domains: localhost:3000?__tenant=riverside or app.vercel.app?__tenant=riverside
  let rememberTenant = false
  if (!slug || slug === hostname) {
    const tenantParam = req.nextUrl.searchParams.get("__tenant")
    const tenantCookie = req.cookies.get("__tenant")?.value
    const fallbackSlug = tenantParam ?? tenantCookie
    if (fallbackSlug && /^[a-z0-9-]+$/i.test(fallbackSlug)) {
      slug = fallbackSlug
      rememberTenant = Boolean(tenantParam)
    }
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

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  if (rememberTenant) {
    res.cookies.set("__tenant", slug, {
      path:     "/",
      sameSite: "lax",
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
    })
  }
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
