"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

type Tenant = {
  id:          string
  name:        string
  slug:        string
  businessType: string
  country:     string
  timezone:    string
  plan:        string
  primaryColor: string
  logoUrl?:    string | null
  adminUsers?: { name: string; email: string }[]
}

export default function TenantForm({ tenant }: { tenant: Tenant | null }) {
  const router    = useRouter()
  const isNew     = !tenant
  const [name,         setName]         = useState(tenant?.name ?? "")
  const [slug,         setSlug]         = useState(tenant?.slug ?? "")
  const [businessType, setBusinessType] = useState(tenant?.businessType ?? "CLINIC")
  const [country,      setCountry]      = useState(tenant?.country ?? "GB")
  const [timezone,     setTimezone]     = useState(tenant?.timezone ?? "Europe/London")
  const [plan,         setPlan]         = useState(tenant?.plan ?? "FREE")
  const [primaryColor, setPrimaryColor] = useState(tenant?.primaryColor ?? "#2563EB")
  const [logoUrl,      setLogoUrl]      = useState(tenant?.logoUrl ?? "")

  const [adminName,  setAdminName]  = useState(tenant?.adminUsers?.[0]?.name  ?? "")
  const [adminEmail, setAdminEmail] = useState(tenant?.adminUsers?.[0]?.email ?? "")
  const [adminPass,  setAdminPass]  = useState("")

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

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
        name, slug, businessType, country, timezone, plan, primaryColor,
        logoUrl: logoUrl || undefined,
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
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 space-y-6">
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Clinic details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>Clinic name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="space-y-1"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="e.g. riverside" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Business type</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["CLINIC","AYURVEDA","DENTAL","PHYSIO"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["FREE","BASIC","PRO"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="GB" /></div>
          <div className="space-y-1"><Label>Timezone</Label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/London" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>Primary colour</Label><Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} type="color" className="h-10 px-2" /></div>
          <div className="space-y-1"><Label>Logo URL <span className="text-muted-foreground">(optional)</span></Label><Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} type="url" /></div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Admin credentials</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>Admin name</Label><Input value={adminName} onChange={(e) => setAdminName(e.target.value)} /></div>
          <div className="space-y-1"><Label>Admin email</Label><Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} type="email" /></div>
        </div>
        <div className="space-y-1">
          <Label>Temporary password {!isNew && <span className="text-muted-foreground">(leave blank to keep existing)</span>}</Label>
          <Input value={adminPass} onChange={(e) => setAdminPass(e.target.value)} type="password" />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Saving…" : isNew ? "Create Tenant" : "Update Tenant"}</Button>
    </form>
  )
}
