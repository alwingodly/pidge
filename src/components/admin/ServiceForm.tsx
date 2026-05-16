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
  const [name,                setName]                = useState("")
  const [description,         setDescription]         = useState("")
  const [durationMins,        setDurationMins]        = useState("30")
  const [price,               setPrice]               = useState("")
  const [priceOnConsultation, setPriceOnConsultation] = useState(false)
  const [isProgramme,         setIsProgramme]         = useState(false)
  const [loading,             setLoading]             = useState(false)
  const [error,               setError]               = useState<string | null>(null)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch("/api/services", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name,
        description:         description || undefined,
        durationMins:        parseInt(durationMins),
        price:               priceOnConsultation ? 0 : parseFloat(price) || 0,
        priceOnConsultation,
        isProgramme,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }
    setName(""); setDescription(""); setDurationMins("30"); setPrice(""); setPriceOnConsultation(false); setIsProgramme(false)
    setLoading(false)
    onSaved?.()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>

      <div className="space-y-1.5">
        <Label>Service name <span className="text-primary">*</span></Label>
        <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Panchakarma Programme" className="rounded-xl" />
      </div>

      <div className="space-y-1.5">
        <Label>Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="resize-none rounded-xl" placeholder="Brief description of the service…" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Duration (min) <span className="text-primary">*</span></Label>
          <Input
            value={durationMins}
            onChange={e => setDurationMins(e.target.value)}
            type="number" min="5" step="5" required
            className="rounded-xl"
          />
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <Label>Price</Label>
          <div className={cn(
            "flex h-10 overflow-hidden rounded-xl border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-opacity",
            priceOnConsultation && "pointer-events-none opacity-40"
          )}>
            <span className="flex items-center border-r border-input bg-secondary px-3 text-sm font-semibold text-muted-foreground">
              {currencySymbol}
            </span>
            <input
              type="number" min="0" step="0.01"
              value={priceOnConsultation ? "" : price}
              onChange={e => setPrice(e.target.value)}
              disabled={priceOnConsultation}
              placeholder={priceOnConsultation ? "—" : "0.00"}
              className="flex-1 bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          {/* Price on consultation toggle */}
          <label className="flex cursor-pointer items-center gap-2">
            <div
              role="switch"
              aria-checked={priceOnConsultation}
              onClick={() => setPriceOnConsultation(v => !v)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                priceOnConsultation ? "bg-primary" : "bg-muted"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform",
                priceOnConsultation ? "translate-x-4" : "translate-x-0"
              )} />
            </div>
            <span className="text-xs text-muted-foreground">Price on consultation</span>
          </label>
        </div>
      </div>

      {priceOnConsultation && (
        <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary">
          Patients will see <strong>"Price on consultation"</strong> — no amount shown during booking.
        </p>
      )}

      {/* Programme toggle */}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
        <div
          role="switch"
          aria-checked={isProgramme}
          onClick={() => setIsProgramme(v => !v)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            isProgramme ? "bg-primary" : "bg-muted"
          )}
        >
          <span className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform",
            isProgramme ? "translate-x-4" : "translate-x-0"
          )} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Programme service</p>
          <p className="text-xs text-muted-foreground">
            Multi-day treatment (e.g. Panchakarma). Admin sets number of days on approval.
          </p>
        </div>
      </label>

      {error && <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-primary">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full rounded-xl sm:w-auto">
        {loading ? "Saving…" : "Add Service"}
      </Button>
    </form>
  )
}
