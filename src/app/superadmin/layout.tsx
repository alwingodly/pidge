import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SuperAdminSidebar from "@/components/admin/SuperAdminSidebar"

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/admin/login")

  return (
    <div className="flex min-h-screen" style={{ background: "#FFF4EA" }}>
      <SuperAdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  )
}
