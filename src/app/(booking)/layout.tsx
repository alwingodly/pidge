import styles from "./BookingLanding.module.css"

export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${styles.shell} text-foreground`}>
      <main className={`${styles.main} mx-auto w-full max-w-6xl px-4 py-8 pb-20 sm:px-6 sm:py-10 sm:pb-24`}>
        {children}
      </main>

      <footer className="fixed bottom-3 left-0 z-20 w-full px-4 text-center">
        <p className={`${styles.footerPill} mx-auto inline-flex rounded-full px-4 py-2 text-[11px] text-muted-foreground`}>
          Powered by{" "}
          <span className="font-semibold text-foreground">Pikatym</span>
        </p>
      </footer>
    </div>
  )
}
