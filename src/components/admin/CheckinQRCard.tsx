"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Check, Copy, Download, QrCode } from "lucide-react"

type Props = {
  url:         string
  qrDataUrl:   string
  branchName?: string
}

export default function CheckinQRCard({ url, qrDataUrl, branchName }: Props) {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const a    = document.createElement("a")
    a.href     = qrDataUrl
    a.download = `checkin-qr${branchName ? `-${branchName.toLowerCase().replace(/\s+/g, "-")}` : ""}.png`
    a.click()
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 rounded-xl border-[#E8D8C5] text-xs font-semibold"
        onClick={() => setOpen(true)}
      >
        <QrCode className="size-3.5" />
        Walk-in QR{branchName ? ` — ${branchName}` : ""}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Walk-in QR code{branchName ? ` — ${branchName}` : ""}
            </DialogTitle>
            <DialogDescription>
              Scan or share this QR code for walk-in patient check-in.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-5 py-2">
            {/* QR image */}
            <div className="overflow-hidden rounded-2xl border border-[#F0EAE2] bg-white p-4 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Walk-in check-in QR code"
                width={200}
                height={200}
                className="block"
              />
            </div>

            {/* URL */}
            <div className="w-full space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Check-in URL
              </p>
              <p className="break-all rounded-xl bg-secondary px-3 py-2.5 font-mono text-xs text-foreground">
                {url}
              </p>
            </div>

            {/* Actions */}
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 flex-1 rounded-xl border-[#E8D8C5] text-xs"
                onClick={handleCopy}
              >
                {copied
                  ? <><Check className="mr-1.5 size-3.5 text-emerald-600" />Copied!</>
                  : <><Copy className="mr-1.5 size-3.5" />Copy link</>}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 flex-1 rounded-xl border-[#E8D8C5] text-xs"
                onClick={handleDownload}
              >
                <Download className="mr-1.5 size-3.5" />
                Download
              </Button>
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              Print at A5 and display at reception. Patients scan with their phone camera — no app needed.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
