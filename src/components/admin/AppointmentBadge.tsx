import { Badge } from "@/components/ui/badge"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-amber-100 text-amber-700 border-amber-200" },
  APPROVED:  { label: "Approved",  className: "bg-green-100 text-green-700 border-green-200" },
  CANCELLED: { label: "Cancelled", className: "bg-[#FFF4EA] text-[#BF4646] border-[#EDDCC6]" },
  COMPLETED: { label: "Completed", className: "bg-[#EDDCC6]/40 text-[#9A7A5A] border-[#EDDCC6]" },
  NO_SHOW:   { label: "No Show",   className: "bg-orange-100 text-orange-700 border-orange-200" },
}

export default function AppointmentBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-[#EDDCC6]/40 text-[#9A7A5A]" }
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
