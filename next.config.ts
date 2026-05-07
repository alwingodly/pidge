import type { NextConfig } from "next"

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Deny framing (clickjacking protection)
  { key: "X-Frame-Options",           value: "DENY" },
  // Force HTTPS for 1 year, include subdomains (UK GDPR: data in transit must be protected)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Disable legacy XSS auditor (modern browsers ignore it; disabling prevents confusion)
  { key: "X-XSS-Protection",          value: "0" },
  // Control referrer info sent to third parties
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Restrict browser features — only request what the app actually uses
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  // Content-Security-Policy — tightened for a Next.js + Resend app
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inlines scripts; unsafe-inline required unless you use nonces
      // js.stripe.com required for Stripe.js payment UI
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      // Allow images from any HTTPS source (tenant logos, doctor photos)
      "img-src 'self' data: https:",
      "font-src 'self'",
      // api.stripe.com for payment API calls; js.stripe.com for Stripe Elements iframe
      "connect-src 'self' https://api.stripe.com",
      "frame-src https://js.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
