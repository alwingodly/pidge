"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Props = {
  tenantId: string
  onSaved?: () => void
  className?: string
}

export default function ServiceForm({ onSaved, className }: Props) {
  const router = useRouter()
  const [name,         setName]         = useState("")
  const [description,  setDescription]  = useState("")
  const [durationMins, setDurationMins] = useState("30")
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res  = await fetch("/api/services", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, description: description || undefined, durationMins: parseInt(durationMins) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }
    setName(""); setDescription(""); setDurationMins("30")
    setLoading(false)
    if (onSaved) {
      onSaved()
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <Label>Service name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. GP Consultation" />
      </div>
      <div className="space-y-1">
        <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1">
        <Label>Duration (minutes)</Label>
        <Input value={durationMins} onChange={(e) => setDurationMins(e.target.value)} type="number" min="5" step="5" required />
      </div>
      {error && <p className="rounded-md bg-secondary px-3 py-2 text-sm text-primary">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Saving..." : "Add Service"}
      </Button>
    </form>
  )
}
