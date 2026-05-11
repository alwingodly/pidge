"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LANDING_COPY_DEFAULTS } from "@/lib/landing-copy"
import type { ReactNode } from "react"

type Props = {
  initial: {
    landingHeadline:       string | null
    landingSubheadline:    string | null
    landingPrimaryCta:     string | null
    landingSecondaryCta:   string | null
    landingTrustBadges:    string | null
    landingBottomHeadline: string | null
    landingBottomText:     string | null
  }
}

export default function LandingCopyForm({ initial }: Props) {
  const router = useRouter()
  const [headline,       setHeadline]       = useState(initial.landingHeadline       ?? LANDING_COPY_DEFAULTS.headline)
  const [subheadline,    setSubheadline]    = useState(initial.landingSubheadline    ?? LANDING_COPY_DEFAULTS.subheadline)
  const [primaryCta,     setPrimaryCta]     = useState(initial.landingPrimaryCta     ?? LANDING_COPY_DEFAULTS.primaryCta)
  const [secondaryCta,   setSecondaryCta]   = useState(initial.landingSecondaryCta   ?? LANDING_COPY_DEFAULTS.secondaryCta)
  const [trustBadges,    setTrustBadges]    = useState(initial.landingTrustBadges    ?? LANDING_COPY_DEFAULTS.trustBadges)
  const [bottomHeadline, setBottomHeadline] = useState(initial.landingBottomHeadline ?? LANDING_COPY_DEFAULTS.bottomHeadline)
  const [bottomText,     setBottomText]     = useState(initial.landingBottomText     ?? LANDING_COPY_DEFAULTS.bottomText)
  const [loading,        setLoading]        = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  function resetDefaults() {
    setHeadline(LANDING_COPY_DEFAULTS.headline)
    setSubheadline(LANDING_COPY_DEFAULTS.subheadline)
    setPrimaryCta(LANDING_COPY_DEFAULTS.primaryCta)
    setSecondaryCta(LANDING_COPY_DEFAULTS.secondaryCta)
    setTrustBadges(LANDING_COPY_DEFAULTS.trustBadges)
    setBottomHeadline(LANDING_COPY_DEFAULTS.bottomHeadline)
    setBottomText(LANDING_COPY_DEFAULTS.bottomText)
    setSaved(false)
    setError(null)
  }

  async function save() {
    setLoading(true)
    setSaved(false)
    setError(null)

    const res = await fetch("/api/tenant", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landingHeadline:       headline,
        landingSubheadline:    subheadline,
        landingPrimaryCta:     primaryCta,
        landingSecondaryCta:   secondaryCta,
        landingTrustBadges:    trustBadges,
        landingBottomHeadline: bottomHeadline,
        landingBottomText:     bottomText,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Something went wrong.")
      return
    }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hero headline" limit={`${headline.length}/80`}>
          <Input value={headline} maxLength={80} onChange={(e) => { setHeadline(e.target.value); setSaved(false) }} />
        </Field>
        <Field label="Bottom headline" limit={`${bottomHeadline.length}/80`}>
          <Input value={bottomHeadline} maxLength={80} onChange={(e) => { setBottomHeadline(e.target.value); setSaved(false) }} />
        </Field>
      </div>

      <Field label="Hero subheadline" limit={`${subheadline.length}/220`}>
        <Textarea
          value={subheadline}
          maxLength={220}
          rows={3}
          className="resize-none rounded-xl"
          onChange={(e) => { setSubheadline(e.target.value); setSaved(false) }}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Primary button" limit={`${primaryCta.length}/32`}>
          <Input value={primaryCta} maxLength={32} onChange={(e) => { setPrimaryCta(e.target.value); setSaved(false) }} />
        </Field>
        <Field label="Secondary button" limit={`${secondaryCta.length}/32`}>
          <Input value={secondaryCta} maxLength={32} onChange={(e) => { setSecondaryCta(e.target.value); setSaved(false) }} />
        </Field>
      </div>

      <Field label="Trust badges" limit={`${trustBadges.length}/180`}>
        <Input
          value={trustBadges}
          maxLength={180}
          onChange={(e) => { setTrustBadges(e.target.value); setSaved(false) }}
        />
        <p className="mt-1 text-xs text-muted-foreground">Separate badges with commas.</p>
      </Field>

      <Field label="Bottom text" limit={`${bottomText.length}/180`}>
        <Textarea
          value={bottomText}
          maxLength={180}
          rows={2}
          className="resize-none rounded-xl"
          onChange={(e) => { setBottomText(e.target.value); setSaved(false) }}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={loading || saved} size="sm" className="rounded-xl">
          {loading ? <><Loader2 className="size-4 animate-spin" /> Saving...</>
          : saved   ? <><Check className="size-4" /> Saved</>
          :           "Save copy"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={resetDefaults}>
          <RotateCcw className="size-4" />
          Reset defaults
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function Field({
  label,
  limit,
  children,
}: {
  label: string
  limit?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
        {limit && <span className="text-[10px] font-medium text-muted-foreground">{limit}</span>}
      </div>
      {children}
    </div>
  )
}
