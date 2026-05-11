export const LANDING_COPY_DEFAULTS = {
  headline:       "Healthcare made simple for you.",
  subheadline:    "Book an appointment in minutes - choose a service, pick a date, done.",
  primaryCta:     "Book appointment",
  secondaryCta:   "See all services",
  trustBadges:    "No account needed, Free to book, Instant email confirmation, Cancel any time",
  bottomHeadline: "Let's get you booked.",
  bottomText:     "No account needed. Takes under 3 minutes. Free to book.",
}

export function trustBadgesFromCopy(value: string | null | undefined) {
  return (value || LANDING_COPY_DEFAULTS.trustBadges)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6)
}
