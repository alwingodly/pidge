export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-foreground" style={{ background: "var(--page-bg)" }}>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="fixed bottom-2.5 left-0 w-full text-center">
        <p className="text-[11px] text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-foreground">Pikatym</span>
        </p>
      </footer>
    </div>
  )
}
