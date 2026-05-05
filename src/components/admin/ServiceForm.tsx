"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Props = {
  tenantId:       string
  currencySymbol: string
  onSaved?:       () => void
  className?:     string
}

export default function ServiceForm({ currencySymbol, onSaved, className }: Props) {
  const router = useRouter()
  const [name,         setName]         = useState("")
  const [description,  setDescription]  = useState("")
  const [durationMins, setDurationMins] = useState("30")
  const [price,        setPrice]        = useState("0")
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch("/api/services", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name,
        description:  description || undefined,
        durationMins: parseInt(durationMins),
        price:        parseFloat(price) || 0,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }
    setName(""); setDescription(""); setDurationMins("30"); setPrice("0")
    setLoading(false)
    onSaved?.()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <Label>Service name <span className="text-primary">*</span></Label>
        <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Abhyanga Massage" />
      </div>

      <div className="space-y-1">
        <Label>Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Duration (min) <span className="text-primary">*</span></Label>
          <Input
            value={durationMins}
            onChange={e => setDurationMins(e.target.value)}
            type="number" min="5" step="5" required
          />
        </div>
        <div className="space-y-1">
          <Label>Price <span className="text-primary">*</span></Label>
          <div className="flex h-10 overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="flex items-center border-r border-input bg-secondary px-3 text-sm font-semibold text-muted-foreground">
              {currencySymbol}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="flex-1 bg-background px-3 text-sm text-foreground outline-none"
              required
            />
          </div>
        </div>
      </div>

      {error && <p className="rounded-md bg-secondary px-3 py-2 text-sm text-primary">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Saving…" : "Add Service"}
      </Button>
    </form>
  )
}
