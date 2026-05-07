"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Link2, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = { initialLink: string | null }

export default function ReviewLinkForm({ initialLink }: Props) {
  const router                  = useRouter()
  const [link,    setLink]      = useState(initialLink ?? "")
  const [loading, setLoading]   = useState(false)
  const [saved,   setSaved]     = useState(false)
  const [error,   setError]     = useState<string | null>(null)

  async function save() {
    setLoading(true); setError(null); setSaved(false)
    const res  = await fetch("/api/tenant", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reviewLink: link.trim() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="review-link" className="text-xs font-semibold text-muted-foreground">
            Review URL
          </Label>
          <div className="flex h-10 items-center gap-2 rounded-xl border border-[#E8E3DC] bg-white px-3 focus-within:ring-2 focus-within:ring-primary/20">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <input
              id="review-link"
              type="url"
              placeholder="https://g.page/r/…/review"
              value={link}
              onChange={(e) => { setLink(e.target.value); setSaved(false); setError(null) }}
              className="min-w-0 flex-1 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            {link && (
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        When set, patients receive an email with this link after their appointment is marked as completed.
        Leave blank to disable review emails.
      </p>
    </div>
  )
}
