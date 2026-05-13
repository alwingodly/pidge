"use client"

import { useState } from "react"
import { Check, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function ChangePasswordForm() {
  const [current,  setCurrent]  = useState("")
  const [next,     setNext]     = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [showCur,  setShowCur]  = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const mismatch = confirm.length > 0 && next !== confirm

  async function save() {
    setError(null)
    if (!current || !next || !confirm) { setError("All fields are required."); return }
    if (next.length < 8)               { setError("New password must be at least 8 characters."); return }
    if (next !== confirm)              { setError("Passwords do not match."); return }

    setLoading(true)
    const res  = await fetch("/api/admin/change-password", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? "Something went wrong."); return }

    setSaved(true)
    setCurrent(""); setNext(""); setConfirm("")
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-4">

      {/* Current password */}
      <div className="space-y-1.5">
        <Label htmlFor="cur-pw" className="text-xs font-semibold text-muted-foreground">Current password</Label>
        <PasswordField
          id="cur-pw"
          value={current}
          show={showCur}
          onToggle={() => setShowCur(v => !v)}
          onChange={(v) => { setCurrent(v); setSaved(false); setError(null) }}
          placeholder="Enter current password"
        />
      </div>

      {/* New password */}
      <div className="space-y-1.5">
        <Label htmlFor="new-pw" className="text-xs font-semibold text-muted-foreground">New password</Label>
        <PasswordField
          id="new-pw"
          value={next}
          show={showNew}
          onToggle={() => setShowNew(v => !v)}
          onChange={(v) => { setNext(v); setSaved(false); setError(null) }}
          placeholder="At least 8 characters"
        />
      </div>

      {/* Confirm new password */}
      <div className="space-y-1.5">
        <Label htmlFor="conf-pw" className="text-xs font-semibold text-muted-foreground">Confirm new password</Label>
        <PasswordField
          id="conf-pw"
          value={confirm}
          show={showNew}
          onToggle={() => setShowNew(v => !v)}
          onChange={(v) => { setConfirm(v); setSaved(false); setError(null) }}
          placeholder="Repeat new password"
          invalid={mismatch}
        />
        {mismatch && <p className="text-xs text-destructive">Passwords do not match.</p>}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={save}
          disabled={loading || saved || mismatch}
          size="sm"
          className="rounded-xl"
        >
          {loading ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
          : saved   ? <><Check   className="size-4" /> Changed</>
          :           "Update password"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function PasswordField({
  id, value, show, onToggle, onChange, placeholder, invalid,
}: {
  id: string; value: string; show: boolean
  onToggle: () => void; onChange: (v: string) => void
  placeholder: string; invalid?: boolean
}) {
  return (
    <div
      className={`flex h-10 items-center gap-2 rounded-xl border bg-white px-3 focus-within:ring-2 focus-within:ring-primary/20 ${invalid ? "border-destructive" : "border-border"}`}
    >
      <KeyRound className="size-4 shrink-0 text-muted-foreground" />
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
      />
      <button
        type="button"
        onClick={onToggle}
        className="text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  )
}
