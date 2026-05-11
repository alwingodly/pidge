"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

type Props = {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  icon:          ReactNode
  title:         string
  description:   string
  confirmLabel:  string
  onConfirm:     () => void
  loading?:      boolean
  destructive?:  boolean   // default true — makes confirm button red
}

export default function IosConfirmDialog({
  open, onOpenChange, icon, title, description,
  confirmLabel, onConfirm, loading, destructive = true,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[280px] gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl">
        {/* Icon + text */}
        <div className="flex flex-col items-center gap-1.5 px-6 pb-4 pt-6 text-center">
          {icon}
          <DialogTitle className="mt-3 text-base font-semibold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </div>

        {/* iOS-style stacked buttons */}
        <div className="border-t border-border">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex w-full items-center justify-center gap-2 border-b border-border py-3.5 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50 ${
              destructive ? "text-destructive" : "text-primary"
            }`}
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {loading ? "Please wait…" : confirmLabel}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex w-full items-center justify-center py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
