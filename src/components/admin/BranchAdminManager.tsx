"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserPlus, Trash2, UserCheck, KeyRound, Check, Loader2, UserMinus } from "lucide-react"

type BranchAdmin = { id: string; name: string; email: string; isActive: boolean }
type Props       = { branchId: string; branchName: string; initialAdmins: BranchAdmin[] }

export default function BranchAdminManager({ branchId, branchName, initialAdmins }: Props) {
  const router = useRouter()
  const [admins,       setAdmins]       = useState<BranchAdmin[]>(initialAdmins)
  const [showForm,     setShowForm]     = useState(false)
  const [changingPwId, setChangingPwId] = useState<string | null>(null)
  const [name,         setName]         = useState("")
  const [email,        setEmail]        = useState("")
  const [password,     setPassword]     = useState("")
  const [newPw,        setNewPw]        = useState("")
  const [loading,      setLoading]      = useState(false)
  const [removing,     setRemoving]     = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<BranchAdmin | null>(null)
  const [pwSaving,     setPwSaving]     = useState(false)
  const [pwSaved,      setPwSaved]      = useState<string | null>(null)
  const [error,        setError]        = useState<string | null>(null)
  const [pwError,      setPwError]      = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res  = await fetch("/api/branch-admins", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ branchId, name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }
    setAdmins(prev => [...prev, data.data])
    setName(""); setEmail(""); setPassword(""); setShowForm(false); setLoading(false)
    router.refresh()
  }

  async function handleRemove(id: string) {
    setRemoving(id)
    const res = await fetch(`/api/branch-admins/${id}`, { method: "DELETE" })
    if (res.ok) {
      setAdmins(prev => prev.filter(a => a.id !== id))
      setRemoveTarget(null)
      router.refresh()
    }
    setRemoving(null)
  }

  async function handlePasswordChange(id: string) {
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters."); return }
    setPwSaving(true); setPwError(null)
    const res = await fetch(`/api/branch-admins/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ password: newPw }),
    })
    const data = await res.json()
    if (!res.ok) { setPwError(data.error ?? "Something went wrong.") }
    else {
      setPwSaved(id)
      setTimeout(() => { setPwSaved(null); setChangingPwId(null); setNewPw("") }, 1800)
    }
    setPwSaving(false)
  }

  return (
    <div className="space-y-3">
      {admins.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No branch admins yet — this branch has no dedicated admin.
        </p>
      ) : (
        <div className="space-y-2">
          {admins.map(admin => (
            <div key={admin.id} className="overflow-hidden rounded-xl border border-border bg-white">
              {/* Admin row */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <UserCheck className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{admin.name}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPwId(changingPwId === admin.id ? null : admin.id)
                      setNewPw(""); setPwError(null); setPwSaved(null)
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                    title="Change password"
                  >
                    <KeyRound className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(admin)}
                    disabled={removing === admin.id}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary disabled:opacity-50"
                    title="Remove admin"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {/* Inline password change panel */}
              {changingPwId === admin.id && (
                <div className="border-t border-border bg-secondary/30 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    Change password for {admin.name}
                  </p>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <PasswordInput
                        value={newPw}
                        onChange={e => { setNewPw(e.target.value); setPwError(null) }}
                        placeholder="New password (min 8 chars)"
                        className="h-9 bg-white text-sm"
                        minLength={8}
                      />
                      {pwError && <p className="mt-1 text-xs text-red-500">{pwError}</p>}
                    </div>
                    <Button
                      size="sm"
                      className="h-9 shrink-0"
                      onClick={() => handlePasswordChange(admin.id)}
                      disabled={pwSaving || !newPw}
                    >
                      {pwSaving        ? <Loader2 className="size-3.5 animate-spin" />
                      : pwSaved === admin.id ? <><Check className="size-3.5" /> Saved</>
                      : "Save"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add admin form */}
      {!showForm ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <UserPlus className="size-4" /> Add Branch Admin
        </Button>
      ) : (
        <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
          <p className="text-sm font-semibold text-foreground">
            New admin for <span className="text-primary">{branchName}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Smith" className="bg-white" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane@clinic.com" className="bg-white" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Temporary password <span className="text-xs text-muted-foreground">(min 8 chars)</span></Label>
            <PasswordInput value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="••••••••" className="bg-white" />
          </div>
          {error && <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-primary">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Creating…" : "Create Admin"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setError(null) }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open && !removing) setRemoveTarget(null) }}>
        <DialogContent className="max-w-70 gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl">
          <DialogTitle className="sr-only">Remove branch admin</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm removing {removeTarget?.name} from {branchName}.
          </DialogDescription>

          {/* Icon + text */}
          <div className="flex flex-col items-center gap-1.5 px-6 pb-4 pt-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-red-50">
              <UserMinus className="size-6 text-destructive" />
            </div>
            <p className="mt-3 text-base font-semibold text-foreground">Remove admin?</p>
            <p className="text-sm text-muted-foreground">
              {removeTarget?.name} will lose access to {branchName}.
            </p>
          </div>

          {/* iOS-style stacked buttons */}
          <div className="border-t border-border">
            <button
              onClick={() => removeTarget && handleRemove(removeTarget.id)}
              disabled={!!removing}
              className="flex w-full items-center justify-center border-b border-border py-3.5 text-sm font-semibold text-destructive transition-colors hover:bg-muted disabled:opacity-50"
            >
              {removing ? <><Loader2 className="size-4 animate-spin mr-2" /> Removing…</> : "Remove"}
            </button>
            <button
              onClick={() => setRemoveTarget(null)}
              disabled={!!removing}
              className="flex w-full items-center justify-center py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
