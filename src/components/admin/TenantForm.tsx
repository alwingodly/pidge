"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

// ── Currency catalogue ─────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "GBP", symbol: "£",   label: "British Pound"     },
  { code: "INR", symbol: "₹",   label: "Indian Rupee"      },
  { code: "EUR", symbol: "€",   label: "Euro"              },
  { code: "USD", symbol: "$",   label: "US Dollar"         },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham"        },
  { code: "SGD", symbol: "S$",  label: "Singapore Dollar"  },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar"   },
  { code: "AUD", symbol: "A$",  label: "Australian Dollar" },
]

type Tenant = {
  id:                  string
  name:                string
  slug:                string
  businessType:        string
  country:             string
  timezone:            string
  currency:            string
  currencySymbol:      string
  plan:                string
  primaryColor:        string
  logoUrl?:            string | null
  showDoctorSelection: boolean
  adminUsers?:         { name: string; email: string }[]
}

export default function TenantForm({ tenant }: { tenant: Tenant | null }) {
  const router = useRouter()
  const isNew  = !tenant

  const [name,         setName]         = useState(tenant?.name         ?? "")
  const [slug,         setSlug]         = useState(tenant?.slug         ?? "")
  const [businessType, setBusinessType] = useState(tenant?.businessType ?? "CLINIC")
  const [country,      setCountry]      = useState(tenant?.country      ?? "GB")
  const [timezone,     setTimezone]     = useState(tenant?.timezone     ?? "Europe/London")
  const [currency,     setCurrency]     = useState(tenant?.currency     ?? "GBP")
  const [plan,         setPlan]         = useState(tenant?.plan         ?? "FREE")
  const [primaryColor, setPrimaryColor] = useState(tenant?.primaryColor ?? "#436850")
  const [logoUrl,      setLogoUrl]      = useState(tenant?.logoUrl      ?? "")

  const [adminName,  setAdminName]  = useState(tenant?.adminUsers?.[0]?.name  ?? "")
  const [adminEmail, setAdminEmail] = useState(tenant?.adminUsers?.[0]?.email ?? "")
  const [adminPass,  setAdminPass]  = useState("")

  const [showDoctorSelection, setShowDoctorSelection] = useState(tenant?.showDoctorSelection ?? false)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Derive symbol from selected currency code
  const selectedCurrency = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]

  function handleCurrencyChange(code: string) {
    const found = CURRENCIES.find(c => c.code === code)
    if (found) setCurrency(found.code)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const method = isNew ? "POST" : "PATCH"
    const url    = isNew ? "/api/superadmin/tenants" : `/api/superadmin/tenants/${tenant!.id}`

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name, slug, businessType, country, timezone,
        currency:            selectedCurrency.code,
        currencySymbol:      selectedCurrency.symbol,
        plan, primaryColor,
        showDoctorSelection,
        logoUrl:    logoUrl    || undefined,
        adminName:  adminName  || undefined,
        adminEmail: adminEmail || undefined,
        adminPass:  adminPass  || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }
    router.push("/superadmin/tenants")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-white p-6">

      {/* ── Clinic details ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Clinic details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Clinic name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Green Valley Ayurveda" />
          </div>
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input value={slug} onChange={e => setSlug(e.target.value)} required placeholder="green-valley" />
            <p className="text-[11px] text-muted-foreground">Lowercase letters, numbers and dashes only.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Business type</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["CLINIC","AYURVEDA","DENTAL","PHYSIO"].map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["FREE","BASIC","PRO"].map(p => (
                  <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Country code</Label>
            <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="GB" />
          </div>
          <div className="space-y-1">
            <Label>Timezone</Label>
            <Input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Europe/London" />
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Currency ───────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Currency</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="font-mono mr-2 text-muted-foreground">{c.symbol}</span>
                    {c.label} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview — read-only */}
          <div className="space-y-1">
            <Label>Preview</Label>
            <div className="flex h-10 items-center gap-3 rounded-md border border-input bg-secondary/40 px-3">
              <span className="font-mono text-lg font-bold text-primary">{selectedCurrency.symbol}</span>
              <div className="text-sm">
                <span className="font-semibold text-foreground">{selectedCurrency.code}</span>
                <span className="ml-1.5 text-muted-foreground">· {selectedCurrency.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Branding ───────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Branding</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Primary colour</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-md border border-input bg-white p-1"
              />
              <Input
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                placeholder="#436850"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Logo URL <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} type="url" placeholder="https://…" />
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Booking features ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Booking features</h2>

        <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-secondary/30">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Doctor selection in booking flow</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              When enabled, patients must choose a preferred clinician during booking.
              When disabled, the clinic assigns a clinician after the request is received.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showDoctorSelection}
            onClick={() => setShowDoctorSelection(v => !v)}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              showDoctorSelection ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
              showDoctorSelection ? "translate-x-5" : "translate-x-0"
            }`} />
          </button>
        </label>
      </div>

      <Separator />

      {/* ── Admin credentials ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin credentials</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Admin name</Label>
            <Input value={adminName} onChange={e => setAdminName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Admin email</Label>
            <Input value={adminEmail} onChange={e => setAdminEmail(e.target.value)} type="email" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>
            Temporary password{" "}
            {!isNew && <span className="text-xs text-muted-foreground">(leave blank to keep existing)</span>}
          </Label>
          <Input value={adminPass} onChange={e => setAdminPass(e.target.value)} type="password" />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : isNew ? "Create tenant" : "Save changes"}
      </Button>
    </form>
  )
}
