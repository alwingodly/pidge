import { getTenantFromHeaders } from "@/lib/tenant"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, ShieldCheck } from "lucide-react"

export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  const { tenantName, primaryColor, logoUrl } = await getTenantFromHeaders()
  const brand = primaryColor || "#BF4646"
  const name = tenantName || "Pikatym"

  return (
    <>
      <style>{`:root { --brand: ${brand}; }`}</style>
      <div className="min-h-screen bg-[#F7F3EF] text-foreground">

        <header className="sticky top-0 z-20 border-b border-[#E8D8C5] bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={name}
                  width={36}
                  height={36}
                  className="size-9 rounded-xl object-contain"
                />
              ) : (
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: brand }}
                >
                  {name[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-5 text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground">Online appointments</p>
              </div>
            </Link>

            <div className="hidden items-center gap-5 sm:flex">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarDays className="size-4 text-primary/60" />
                Book anytime
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="size-4 text-primary/60" />
                Secure &amp; private
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>

        <footer className="border-t border-[#E8D8C5] py-5 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold" style={{ color: brand }}>
              Pikatym
            </span>
          </p>
        </footer>

      </div>
    </>
  )
}
