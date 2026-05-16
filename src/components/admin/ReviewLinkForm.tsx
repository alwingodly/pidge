"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Link2, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Props = { initialLink: string | null; initialEnabled: boolean }

export default function ReviewLinkForm({ initialLink, initialEnabled }: Props) {
  const router                      = useRouter()
  const [enabled,  setEnabled]      = useState(initialEnabled)
  const [link,     setLink]         = useState(initialLink ?? "")
  const [loading,  setLoading]      = useState(false)
  const [saved,    setSaved]        = useState(false)
  const [error,    setError]        = useState<string | null>(null)

  async function save() {
    if (enabled && !link.trim()) {
      setError("Add a review URL before enabling."); return
    }
    setLoading(true); setError(null); setSaved(false)
    const res  = await fetch("/api/tenant", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reviewLink: link.trim(), reviewEmailEnabled: enabled }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">

      {/* Toggle */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3">
        <div
          role="switch"
          aria-checked={enabled}
          onClick={() => { setEnabled(v => !v); setSaved(false) }}
          className={cn(
            "relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            enabled ? "bg-primary" : "bg-muted"
          )}
        >
          <span className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform",
            enabled ? "translate-x-4" : "translate-x-0"
          )} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Send review request emails</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Automatically email patients a review link when their appointment is marked as completed.
          </p>
        </div>
      </div>

      {/* URL input */}
      <div className="space-y-1.5">
        <Label htmlFor="review-link" className="text-xs font-semibold text-muted-foreground">
          Review URL
        </Label>
        <div className="flex gap-2 sm:items-end">
          <div className="min-w-0 flex-1">
            <div className={cn(
              "flex h-10 items-center gap-2 rounded-xl border bg-white px-3 transition-colors focus-within:ring-2 focus-within:ring-primary/20",
              !enabled ? "opacity-50" : "border-border"
            )}>
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <input
                id="review-link"
                type="url"
                placeholder="https://g.page/r/…/review"
                value={link}
                disabled={!enabled}
                onChange={(e) => { setLink(e.target.value); setSaved(false); setError(null) }}
                className="min-w-0 flex-1 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
              />
              {link && enabled && (
                <button onClick={() => { setLink(""); setSaved(false) }} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          <Button onClick={save} disabled={loading || saved} size="sm" className="rounded-xl">
            {loading ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
            : saved   ? <><Check   className="size-4" /> Saved</>
            :           "Save"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
