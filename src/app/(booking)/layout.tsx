import styles from "./BookingLanding.module.css"
import Image from "next/image"
import { getTenantFromHeaders } from "@/lib/tenant"
import { tenantThemeStyle } from "@/lib/theme"

export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  const { primaryColor } = await getTenantFromHeaders()

  return (
    <div className={`${styles.shell} text-foreground`} style={tenantThemeStyle(primaryColor)}>
      <main className={`${styles.main} mx-auto w-full max-w-6xl px-4 py-8 pb-20 sm:px-6 sm:py-10 sm:pb-24`}>
        {children}
      </main>

      <footer className="fixed bottom-3 left-0 z-20 w-full px-4 text-center">
        <p className={`${styles.footerPill} mx-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] text-muted-foreground`}>
          Powered by{" "}
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary">
              <Image src="/pikatym-white.svg" alt="" width={10} height={15} className="h-3.5 w-auto object-contain" />
            </span>
            Pikatym
          </span>
        </p>
      </footer>
    </div>
  )
}
