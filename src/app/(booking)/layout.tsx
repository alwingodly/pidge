import { getTenantFromHeaders } from "@/lib/tenant"

export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  const { primaryColor } = await getTenantFromHeaders()
  const brand = primaryColor || "var(--primary)"

  return (
    <>
      {/* Override the design-system primary with the tenant's brand color */}
      {primaryColor && (
        <style>{`:root { --primary: ${primaryColor}; --ring: ${primaryColor}; }`}</style>
      )}
      <div className="min-h-screen text-foreground" style={{ background: "var(--page-bg)" }}>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>

        <footer className="py-6 text-center">
          <p className="text-[11px] text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-foreground">Pikatym</span>
          </p>
        </footer>
      </div>
    </>
  )
}
