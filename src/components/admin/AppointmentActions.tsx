"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Clock, UserX } from "lucide-react"

type Status = "PENDING" | "APPROVED" | "CANCELLED" | "COMPLETED" | "NO_SHOW"

const ACTIONS: {
  status:  Status
  label:   string
  icon:    React.ElementType
  style:   string
  allowed: Status[]
}[] = [
  {
    status:  "APPROVED",
    label:   "Approve",
    icon:    Check,
    style:   "bg-green-600 hover:bg-green-700 text-white",
    allowed: ["PENDING"],
  },
  {
    status:  "COMPLETED",
    label:   "Mark Completed",
    icon:    Clock,
    style:   "bg-[#7EACB5] hover:bg-[#6a9aa3] text-white",
    allowed: ["APPROVED"],
  },
  {
    status:  "NO_SHOW",
    label:   "No Show",
    icon:    UserX,
    style:   "bg-orange-500 hover:bg-orange-600 text-white",
    allowed: ["APPROVED"],
  },
  {
    status:  "CANCELLED",
    label:   "Cancel",
    icon:    X,
    style:   "bg-white hover:bg-red-50 text-red-600 border border-red-200",
    allowed: ["PENDING", "APPROVED"],
  },
]

export default function AppointmentActions({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string
  currentStatus: string
}) {
  const router   = useRouter()
  const [loading, setLoading] = useState<Status | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  const available = ACTIONS.filter((a) =>
    a.allowed.includes(currentStatus as Status)
  )

  if (available.length === 0) return null

  async function handleAction(status: Status) {
    setLoading(status)
    setError(null)
    const res  = await fetch(`/api/appointments/${appointmentId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.")
    } else {
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {available.map(({ status, label, icon: Icon, style }) => (
          <button
            key={status}
            onClick={() => handleAction(status)}
            disabled={!!loading}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${style}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {loading === status ? "Saving…" : label}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
