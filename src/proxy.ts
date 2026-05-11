import { NextRequest, NextResponse } from "next/server"

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options":    "nosniff",
  "X-Frame-Options":           "DENY",
  "X-XSS-Protection":         "1; mode=block",
  "Referrer-Policy":           "strict-origin-when-cross-origin",
  "Permissions-Policy":        "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
}

const BOT_PATTERN = /curl|python-requests|scrapy|httpclient|libwww|zgrab|masscan/i

const RATE_LIMITED_PATHS = ["/api/booking-otp", "/api/reschedule"]

// Runs in the Edge runtime — no Node.js modules allowed.
// Extracts the tenant slug from the subdomain and forwards it as a header.
// Actual DB lookup happens in server components via getTenantFromHeaders().
export async function proxy(req: NextRequest) {
  const hostname  = req.headers.get("host") || ""
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "pikatym.com"
  const pathname  = req.nextUrl.pathname

  if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
    return NextResponse.next()
  }

  // Block known bad bots from sensitive endpoints
  const ua = req.headers.get("user-agent") ?? ""
  if (BOT_PATTERN.test(ua) && RATE_LIMITED_PATHS.some(p => pathname.startsWith(p))) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  // "riverside.pikatym.com" → "riverside"
  let slug = hostname.replace(`.${appDomain}`, "").replace(appDomain, "")

  // Reserved subdomains — not tenants
  if (["www", "app", "api", "admin"].includes(slug)) slug = ""

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
    const res = NextResponse.next()
    applySecurityHeaders(res)
    return res
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-tenant-slug", slug)

  // First path segment forwarded so layouts can resolve the branch
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? ""
  if (firstSegment) {
    requestHeaders.set("x-branch-slug-candidate", firstSegment)
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  applySecurityHeaders(res)
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

function applySecurityHeaders(res: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value)
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
