"use client"

import { useRef, useState } from "react"
import { ImageUp, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LogoUploadForm({
  initialLogoUrl,
  tenantName,
}: {
  initialLogoUrl: string | null
  tenantName: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)

    const body = new FormData()
    body.append("logo", file)

    const res = await fetch("/api/tenant/logo", { method: "POST", body })
    const json = await res.json()

    setBusy(false)
    if (!res.ok) {
      setError(json.error ?? "Could not upload logo.")
      return
    }
    setLogoUrl(json.data.logoUrl)
  }

  async function removeLogo() {
    setBusy(true)
    setError(null)

    const res = await fetch("/api/tenant/logo", { method: "DELETE" })
    const json = await res.json()

    setBusy(false)
    if (!res.ok) {
      setError(json.error ?? "Could not remove logo.")
      return
    }
    setLogoUrl(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
            {logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={`${tenantName} logo`}
                  className="max-h-8 max-w-8 object-contain"
                />
              </>
            ) : (
              <span className="text-base font-black text-primary">{tenantName[0] ?? "P"}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Clinic logo</p>
            <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
              Upload a PNG, JPG, or WebP logo up to 750 KB. It appears on the patient booking page.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-border"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
            Upload logo
          </Button>
          {logoUrl && (
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-border text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => void removeLogo()}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
