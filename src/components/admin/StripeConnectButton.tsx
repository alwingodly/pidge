"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function StripeConnectButton({ label = "Connect Stripe" }: { label?: string }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/stripe/connect", { method: "POST" })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return }
      window.location.href = data.url
    } catch {
      setError("Failed to connect. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleConnect} disabled={loading}>
        {loading
          ? <><Loader2 className="mr-2 size-4 animate-spin" />Connecting…</>
          : label}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
