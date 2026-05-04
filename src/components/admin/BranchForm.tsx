"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function BranchForm({ tenantId, onSaved }: { tenantId: string; onSaved?: () => void }) {
  const router  = useRouter()
  const [name,     setName]     = useState("")
  const [slug,     setSlug]     = useState("")
  const [address,  setAddress]  = useState("")
  const [phone,    setPhone]    = useState("")
  const [timezone, setTimezone] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res  = await fetch("/api/branches", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ tenantId, name, slug, address: address || undefined, phone: phone || undefined, timezone: timezone || undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }
    router.refresh()
    setName(""); setSlug(""); setAddress(""); setPhone(""); setTimezone("")
    setLoading(false)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Branch name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. North" />
        </div>
        <div className="space-y-1">
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="e.g. north" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Address <span className="text-muted-foreground">(optional)</span></Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Phone <span className="text-muted-foreground">(optional)</span></Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </div>
        <div className="space-y-1">
          <Label>Timezone <span className="text-muted-foreground">(optional)</span></Label>
          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/London" />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Add Branch"}</Button>
    </form>
  )
}
