import type { CSSProperties } from "react"

const DEFAULT_TENANT_COLOR = "#4996D7"
const NEUTRAL_BORDER = "#DCE6ED"

function normalizeHex(hex: string | null | undefined) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex ?? "") ? hex! : DEFAULT_TENANT_COLOR
}

function hexToRgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const toHex = (value: number) => Math.round(value).toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function mixHex(from: string, to: string, amount: number) {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  })
}

function alpha(hex: string, opacity: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function readableTextFor(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const luminance = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255)
  return luminance > 0.62 ? "#2B1D08" : "#ffffff"
}

function darkToneFor(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance < 70 ? mixHex(hex, "#FFFFFF", 0.18) : mixHex(hex, "#111827", 0.58)
}

export function tenantThemeStyle(primaryColor: string | null | undefined): CSSProperties {
  const primary = normalizeHex(primaryColor)
  const dark = darkToneFor(primary)
  const mid = mixHex(primary, "#FFFFFF", 0.42)
  const soft = mixHex(primary, "#FFFFFF", 0.9)
  const softer = mixHex(primary, "#FFFFFF", 0.95)
  const subtleText = mixHex(dark, "#FFFFFF", 0.34)

  return {
    "--brand-soft": soft,
    "--brand-sage": mid,
    "--brand-herb": primary,
    "--brand-forest": dark,
    "--background": "#ffffff",
    "--foreground": dark,
    "--primary": primary,
    "--primary-foreground": readableTextFor(primary),
    "--secondary": soft,
    "--secondary-foreground": dark,
    "--muted": softer,
    "--muted-foreground": subtleText,
    "--accent": mid,
    "--accent-foreground": dark,
    "--border": NEUTRAL_BORDER,
    "--input": NEUTRAL_BORDER,
    "--ring": primary,
    "--page-bg": soft,
    "--sidebar-bg": dark,
    "--sidebar-text": alpha(soft, 0.76),
    "--sidebar-text-active": "#ffffff",
    "--sidebar-active-bg": alpha(primary, 0.28),
    "--sidebar-hover-bg": alpha(primary, 0.18),
    "--sidebar-border": alpha(soft, 0.18),
    "--sidebar-section-label": alpha(soft, 0.52),
    "--sidebar-toggle-bg": soft,
    "--sidebar-toggle-fg": dark,
    "--sidebar-toggle-border": NEUTRAL_BORDER,
    "--card-divider": NEUTRAL_BORDER,
    "--nextup-bg": dark,
    "--nextup-fg": soft,
    "--nextup-label": alpha(soft, 0.66),
    "--nextup-muted": alpha(soft, 0.76),
    "--attention-dot": primary,
    "--status-approved-bg": soft,
    "--status-approved-fg": dark,
    "--status-approved-ring": mid,
    "--status-completed-bg": mixHex(primary, "#FFFFFF", 0.78),
    "--status-completed-fg": dark,
    "--status-completed-ring": mid,
    "--status-noshow-bg": softer,
    "--status-noshow-fg": subtleText,
    "--status-noshow-ring": NEUTRAL_BORDER,
    "--chart-pending": mid,
    "--chart-approved": primary,
    "--chart-completed": dark,
    "--chart-noshow": mixHex(primary, "#FFFFFF", 0.62),
    "--login-page-bg": soft,
    "--login-panel-bg": dark,
    "--login-btn-bg": primary,
    "--login-btn-hover": dark,
    "--login-panel-muted": alpha(soft, 0.76),
    "--login-panel-faint": alpha(soft, 0.46),
    "--glass-shadow": `0 24px 70px ${alpha(dark, 0.14)}`,
    "--glass-shadow-soft": `0 14px 38px ${alpha(dark, 0.1)}`,
    "--glass-tint": alpha(mid, 0.2),
    "--theme-primary-soft": soft,
    "--theme-primary-softer": softer,
    "--theme-primary-mid": mid,
    "--theme-primary-dark": dark,
    "--theme-primary-shadow": alpha(dark, 0.16),
    "--theme-primary-glow": alpha(primary, 0.28),
  } as CSSProperties
}

export { DEFAULT_TENANT_COLOR }
