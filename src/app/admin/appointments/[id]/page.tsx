import { redirect } from "next/navigation"

// Legacy route — redirect to the appointments page with the detail sheet open
export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/appointments?tab=today&detail=${id}`)
}
