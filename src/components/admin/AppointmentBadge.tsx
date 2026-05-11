import { Badge } from "@/components/ui/badge"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-amber-100 text-amber-700 border-amber-200" },
  APPROVED:  { label: "Approved",  className: "bg-[var(--status-approved-bg)] text-[var(--status-approved-fg)] border-[var(--status-approved-ring)]" },
  CANCELLED: { label: "Cancelled", className: "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)] border-[var(--status-cancelled-ring)]" },
  COMPLETED: { label: "Completed", className: "bg-[var(--status-completed-bg)] text-[var(--status-completed-fg)] border-[var(--status-completed-ring)]" },
  NO_SHOW:   { label: "No Show",   className: "bg-orange-100 text-orange-700 border-orange-200" },
}

export default function AppointmentBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-[var(--status-noshow-bg)] text-[var(--status-noshow-fg)] border-[var(--status-noshow-ring)]" }
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
