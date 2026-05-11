"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ShieldOff, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ErasePage() {
  const params     = useSearchParams()
  const token      = params.get("token") ?? ""
  const email      = params.get("email") ?? ""
  const [step,     setStep]     = useState<"confirm" | "done" | "error">("confirm")
  const [loading,  setLoading]  = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  async function handleErase() {
    setLoading(true)
    try {
      const res = await fetch("/api/patient/erase", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ cancelToken: token, email }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setErrorMsg(d?.error ?? "Something went wrong. Please try again.")
        setStep("error")
      } else {
        setStep("done")
      }
    } finally {
      setLoading(false)
    }
  }

  if (step === "done") {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50">
          <ShieldOff className="size-8 text-emerald-500" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold text-foreground">Data deleted</h1>
        <p className="text-sm text-muted-foreground">
          Your personal information has been removed from our records. Appointment references are retained for audit purposes only.
        </p>
      </div>
    )
  }

  if (step === "error") {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <Button variant="outline" onClick={() => setStep("confirm")}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md py-16 space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-50">
          <Trash2 className="size-8 text-red-500" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold text-foreground">Delete my personal data</h1>
        <p className="text-sm text-muted-foreground">
          This will permanently remove your name, contact details, date of birth, and any notes from all your appointment records at this clinic.
        </p>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 space-y-2">
        <p className="text-sm font-semibold text-red-800">This action cannot be undone.</p>
        <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
          <li>All identifying information will be anonymised</li>
          <li>Appointment records are kept for audit purposes only</li>
          <li>You will no longer be able to manage these bookings</li>
        </ul>
      </div>

      <Button
        className="w-full rounded-xl bg-red-600 hover:bg-red-700"
        onClick={handleErase}
        disabled={loading || !token || !email}
      >
        {loading ? "Deleting…" : "Permanently delete my data"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        This request is made under your rights as a data subject under UK GDPR Article 17 (Right to Erasure).
      </p>
    </div>
  )
}
