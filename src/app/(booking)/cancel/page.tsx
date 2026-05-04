"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"

type AppointmentPreview = {
  bookingRef:  string
  patientName: string
  doctor:      string
  service:     string
  date:        string
  time:        string
}

function CancelContent() {
  const params = useSearchParams()
  const token  = params.get("token")

  const [preview,   setPreview]   = useState<AppointmentPreview | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [cancelled, setCancelled] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setError("Invalid cancel link."); setLoading(false); return }
    fetch(`/api/cancel?token=${token}&preview=true`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setPreview(data)
      })
      .catch(() => setError("Something went wrong."))
      .finally(() => setLoading(false))
  }, [token])

  async function handleCancel() {
    setLoading(true)
    const res  = await fetch(`/api/cancel?token=${token}`, { method: "DELETE" })
    const data = await res.json()
    if (data.error) setError(data.error)
    else setCancelled(true)
    setLoading(false)
  }

  if (loading) return <p className="text-muted-foreground text-center">Loading…</p>
  if (error)   return <p className="text-red-500 text-center">{error}</p>

  if (cancelled) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">✓</div>
        <h1 className="text-xl font-semibold text-foreground">Your appointment has been cancelled.</h1>
        <p className="text-sm text-muted-foreground">Ref: {preview?.bookingRef}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Cancel appointment</h1>
      {preview && (
        <div className="bg-white rounded-xl border border-border p-6 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Ref</span><span>{preview.bookingRef}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span>{preview.service}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span>{preview.doctor}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{preview.date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{preview.time}</span></div>
        </div>
      )}
      <p className="text-foreground">Are you sure you want to cancel this appointment?</p>
      <Button variant="destructive" onClick={handleCancel} disabled={loading} className="w-full">
        Yes, Cancel My Appointment
      </Button>
    </div>
  )
}

export default function CancelPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-center">Loading…</p>}>
      <CancelContent />
    </Suspense>
  )
}
