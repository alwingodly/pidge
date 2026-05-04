"use client"

import { useState } from "react"
import { DatePickerButton } from "@/components/ui/date-picker"
import { formatTime } from "@/lib/utils"
import { Clock, Loader2 } from "lucide-react"

type Slot = {
  id:          string
  startTime:   string
  endTime:     string
  durationMins: number
  doctor:      { name: string }
}

type Props = {
  doctorId:   string
  serviceId?: string | null
  onSelect:   (slotId: string, date: string, time: string) => void
}

export default function SlotPicker({ doctorId, serviceId, onSelect }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [slots,        setSlots]        = useState<Slot[]>([])
  const [loading,      setLoading]      = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  function dateToParam(date: Date) {
    return date.toISOString().split("T")[0]
  }

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date)
    setSelectedSlot(null)
    setSlots([])
    if (!date) return

    const params = new URLSearchParams({ doctorId, date: dateToParam(date) })
    if (serviceId) params.set("serviceId", serviceId)

    setLoading(true)
    fetch(`/api/slots?${params}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.data ?? []))
      .finally(() => setLoading(false))
  }

  function handleSlotClick(slot: Slot) {
    if (!selectedDate) return
    setSelectedSlot(slot.id)
    onSelect(slot.id, dateToParam(selectedDate), slot.startTime)
  }

  return (
    <div className="space-y-3">

      {/* Date picker — click-to-open popover */}
      <DatePickerButton
        value={selectedDate}
        onChange={handleDateSelect}
        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
        placeholder="Choose a date to see available times"
      />

      {/* Time slots */}
      {selectedDate && (
        <div className="rounded-xl border border-[#E8D8C5] bg-white p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Available times
            {selectedDate && (
              <span className="ml-2 normal-case font-medium text-foreground">
                — {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </span>
            )}
          </p>

          {loading ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Finding available slots…
            </div>
          ) : slots.length === 0 ? (
            <p className="rounded-xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              No slots available on this date. Try another day.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleSlotClick(slot)}
                  className={`flex flex-col items-center rounded-xl border py-2.5 text-sm font-semibold transition-all duration-150 ${
                    selectedSlot === slot.id
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-[#E8D8C5] bg-white text-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  {formatTime(slot.startTime)}
                  {slot.durationMins && (
                    <span className={`mt-0.5 flex items-center gap-0.5 text-[10px] font-normal ${selectedSlot === slot.id ? "text-white/70" : "text-muted-foreground"}`}>
                      <Clock className="size-2.5" />
                      {slot.durationMins}m
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
