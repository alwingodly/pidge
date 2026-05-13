import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
  const session = await auth()
  if (session?.user.role === "BRANCH_ADMIN") redirect("/admin/settings/security")
  redirect("/admin/settings/general")
}
