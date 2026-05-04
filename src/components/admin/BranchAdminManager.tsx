"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { UserPlus, Trash2, UserCheck } from "lucide-react"

type BranchAdmin = {
  id:       string
  name:     string
  email:    string
  isActive: boolean
}

type Props = {
  branchId:     string
  branchName:   string
  initialAdmins: BranchAdmin[]
}

export default function BranchAdminManager({ branchId, branchName, initialAdmins }: Props) {
  const router = useRouter()
  const [admins,   setAdmins]   = useState<BranchAdmin[]>(initialAdmins)
  const [showForm, setShowForm] = useState(false)
  const [name,     setName]     = useState("")
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res  = await fetch("/api/branch-admins", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ branchId, name, email, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.")
      setLoading(false)
      return
    }

    setAdmins((prev) => [...prev, data.data])
    setName(""); setEmail(""); setPassword("")
    setShowForm(false)
    setLoading(false)
    router.refresh()
  }

  async function handleRemove(id: string) {
    setRemoving(id)
    const res = await fetch(`/api/branch-admins/${id}`, { method: "DELETE" })
    if (res.ok) {
      setAdmins((prev) => prev.filter((a) => a.id !== id))
      router.refresh()
    }
    setRemoving(null)
  }

  return (
    <div className="space-y-3">
      {/* Admin list */}
      {admins.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No branch admins yet — this branch has no dedicated admin.
        </p>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{admin.name}</p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(admin.id)}
                disabled={removing === admin.id}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors disabled:opacity-50"
                title="Remove admin access"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form toggle */}
      {!showForm ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}
          className="gap-1.5">
          <UserPlus className="w-4 h-4" />
          Add Branch Admin
        </Button>
      ) : (
        <form onSubmit={handleCreate}
          className="space-y-3 p-4 rounded-lg border border-border bg-secondary/30">
          <p className="text-sm font-medium text-foreground">
            New admin for <span className="text-primary">{branchName}</span>
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="Jane Smith" className="bg-white" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="jane@clinic.com" className="bg-white" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Temporary password <span className="text-muted-foreground">(min 8 chars)</span></Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8} placeholder="••••••••" className="bg-white" />
          </div>
          {error && <p className="text-sm text-primary bg-secondary rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Creating…" : "Create Admin"}
            </Button>
            <Button type="button" size="sm" variant="outline"
              onClick={() => { setShowForm(false); setError(null) }}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
