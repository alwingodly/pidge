"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerButtonProps {
  value:        Date | undefined
  onChange:     (date: Date | undefined) => void
  disabled?:    (date: Date) => boolean
  placeholder?: string
  className?:   string
}

export function DatePickerButton({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date",
  className,
}: DatePickerButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl border border-border bg-white px-4 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-secondary/30",
            open && "border-primary/40 ring-2 ring-primary/10",
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-primary/60" />
          {value ? (
            <span className="font-semibold text-foreground">
              {format(value, "EEE, d MMM yyyy")}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>

      {/*
       * IMPORTANT: Never use w-auto on a Radix portal — position:fixed + w-auto = 100vw.
       * Always use an explicit width.
       */}
      <PopoverContent className="w-78 p-0" align="start" sideOffset={6}>
        <MiniCalendar
          value={value}
          onChange={(d) => { onChange(d); if (d) setOpen(false) }}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────
//
// DayPicker v9 DOM structure (default captionLayout="label"):
//
//   <root>
//     <months>             ← needs `relative` so <nav> can be abs-positioned
//       <nav>              ← sibling of <month>, NOT inside <month_caption>
//         <button_previous>
//         <button_next>
//       </nav>
//       <month>
//         <month_caption>  ← only holds the "May 2026" label
//           <caption_label>
//         </month_caption>
//         <month_grid>
//           <weekdays> <weekday × 7>
//           <weeks> <week> <day> <day_button>
//
// Nav is absolutely positioned across the full width of `months`,
// with prev on the left and next on the right.  The month caption
// sits centred beneath at the same row height.

function MiniCalendar({
  value,
  onChange,
  disabled,
}: {
  value:     Date | undefined
  onChange:  (d: Date | undefined) => void
  disabled?: (date: Date) => boolean
}) {
  const cell = "size-9"

  return (
    <DayPicker
      mode="single"
      selected={value}
      onSelect={onChange}
      disabled={disabled}
      showOutsideDays
      classNames={{
        // ── Structural wrappers ──────────────────────────────────────
        root:   "select-none bg-white rounded-xl p-4",
        months: "relative",          // positioning context for <nav>
        month:  "w-full space-y-3",

        // ── Header: "← May 2026 →" ───────────────────────────────────
        // Nav is abs-positioned top-0 across full width; caption centred.
        nav: cn(
          "absolute inset-x-0 top-0 flex items-center justify-between",
        ),
        button_previous: cn(
          "flex items-center justify-center rounded-lg border border-border",
          "text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          cell,
        ),
        button_next: cn(
          "flex items-center justify-center rounded-lg border border-border",
          "text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          cell,
        ),
        month_caption: cn(
          "flex items-center justify-center",
          cell,              // same height as nav buttons so they align
        ),
        caption_label: "text-sm font-semibold text-foreground",

        // ── Day-of-week headers ──────────────────────────────────────
        weekdays: "grid grid-cols-7",
        weekday:  "flex items-center justify-center text-[11px] font-medium text-muted-foreground pb-1",

        // ── Day cells ────────────────────────────────────────────────
        weeks:      "w-full space-y-0.5",
        week:       "grid grid-cols-7",
        day:        "flex items-center justify-center",

        // Base button — full circle, hover gets light gray
        day_button: cn(
          "flex items-center justify-center rounded-full text-sm font-medium transition-colors",
          "text-foreground hover:bg-[#F3F4F6]",
          cell,
        ),

        // ── Modifier classes (applied ON TOP of day_button) ──────────
        // DayPicker v9 merges these with day_button className.
        today:    "bg-[#F0EDE8] font-bold text-foreground",          // subtle warm gray circle for today
        selected: "bg-primary! text-white! hover:bg-primary/90!",    // brand-red for selected
        disabled: "opacity-30 cursor-not-allowed pointer-events-none",
        outside:  "opacity-35 text-muted-foreground",
        hidden:   "invisible",
        range_start: "",
        range_end:   "",
        range_middle: "",
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left"
            ? <ChevronLeft  className="size-3.5" />
            : <ChevronRight className="size-3.5" />,
      }}
    />
  )
}
