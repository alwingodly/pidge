"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { BadgeDollarSign, Building2, Palette, Save, Settings2, ShieldCheck, UserCog } from "lucide-react"
import type { ComponentType } from "react"

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
  isActive:            boolean
  showDoctorSelection: boolean
  manualBookingEnabled: boolean
  patientHistoryEnabled: boolean
  walkInEnabled: boolean
  branchModeEnabled: boolean
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
  const [logoUrl,      setLogoUrl]      = useState(tenant?.logoUrl?.startsWith("data:") ? "" : tenant?.logoUrl ?? "")
  const [isActive,     setIsActive]     = useState(tenant?.isActive     ?? true)

  const [adminName,  setAdminName]  = useState(tenant?.adminUsers?.[0]?.name  ?? "")
  const [adminEmail, setAdminEmail] = useState(tenant?.adminUsers?.[0]?.email ?? "")
  const [adminPass,  setAdminPass]  = useState("")

  const [showDoctorSelection, setShowDoctorSelection] = useState(tenant?.showDoctorSelection ?? false)
  const [manualBookingEnabled, setManualBookingEnabled] = useState(tenant?.manualBookingEnabled ?? false)
  const [patientHistoryEnabled, setPatientHistoryEnabled] = useState(tenant?.patientHistoryEnabled ?? true)
  const [walkInEnabled, setWalkInEnabled] = useState(tenant?.walkInEnabled ?? true)
  const [branchModeEnabled, setBranchModeEnabled] = useState(tenant?.branchModeEnabled ?? false)

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
        isActive,
        showDoctorSelection,
        manualBookingEnabled,
        patientHistoryEnabled,
        walkInEnabled,
        branchModeEnabled,
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
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">

      {/* ── Clinic details ─────────────────────────────────────────────────── */}
      <div className="space-y-4 p-5">
        <SectionTitle icon={Building2} title="Clinic details" description="Core identity used across booking, admin, and tenant routing." />

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
      <div className="space-y-4 p-5">
        <SectionTitle icon={BadgeDollarSign} title="Currency" description="Prices and patient-facing payment amounts use this currency." />

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
      <div className="space-y-4 p-5">
        <SectionTitle icon={Palette} title="Branding" description="Clinic color and logo shown on public booking pages." />
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
      <div className="space-y-4 p-5">
        <SectionTitle icon={Settings2} title="Booking features" description="Control what this tenant can use in the admin and patient flows." />

        <FeatureToggle
          label="Tenant active"
          description="When disabled, the tenant is retained but should be treated as inactive in platform operations."
          checked={isActive}
          onChange={() => setIsActive(v => !v)}
        />

        <FeatureToggle
          label="Doctor selection in booking flow"
          description="When enabled, patients can choose a preferred clinician during booking. When disabled, the clinic assigns one after the request is received."
          checked={showDoctorSelection}
          onChange={() => setShowDoctorSelection(v => !v)}
        />
        <FeatureToggle
          label="Manual appointment creation"
          description="Allows clinic staff to create appointments from phone or reception requests."
          checked={manualBookingEnabled}
          onChange={() => setManualBookingEnabled(v => !v)}
        />
        <FeatureToggle
          label="Patient history"
          description="Shows previous appointments for the same patient email inside admin appointment details."
          checked={patientHistoryEnabled}
          onChange={() => setPatientHistoryEnabled(v => !v)}
        />
        <FeatureToggle
          label="Walk-in queue"
          description="Enables QR/walk-in check-in and the live queue screen."
          checked={walkInEnabled}
          onChange={() => setWalkInEnabled(v => !v)}
        />
        <FeatureToggle
          label="Multiple branches"
          description="Enables branch management, branch admins, and branch-aware appointment views."
          checked={branchModeEnabled}
          onChange={() => setBranchModeEnabled(v => !v)}
        />
      </div>

      <Separator />

      {/* ── Admin credentials ──────────────────────────────────────────────── */}
      <div className="space-y-4 p-5">
        <SectionTitle icon={UserCog} title="Admin credentials" description="Primary tenant admin account for clinic access." />
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

      {error && <p className="mx-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-white/95 px-5 py-4 backdrop-blur-sm">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{isNew ? "Ready to create tenant" : "Save tenant changes"}</p>
          <p className="text-xs text-muted-foreground">
            {isNew ? "A welcome email is sent after the tenant is created." : "Changes apply to this tenant immediately."}
          </p>
        </div>
        <Button type="submit" disabled={loading} className="shrink-0 rounded-lg px-5">
          <Save className="size-4" />
          {loading ? "Saving…" : isNew ? "Create tenant" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function FeatureToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-lg border border-border bg-white p-4 transition-colors hover:border-primary/30 hover:bg-secondary/30">
      <div className="flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {checked && <ShieldCheck className="size-3.5 text-primary" />}
          {label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </label>
  )
}
