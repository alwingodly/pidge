# Pidge — Clinic Booking Platform
### Built by OutRift Technologies

> This documentation is written for Claude Code (VS Code).
> Read the entire file before writing any code.
> Follow every instruction exactly — architecture, naming, folder structure, and conventions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema](#5-database-schema)
6. [Multi-Tenant Architecture](#6-multi-tenant-architecture)
7. [Authentication](#7-authentication)
8. [User Workflows](#8-user-workflows)
9. [Phase 1 — Core MVP](#9-phase-1--core-mvp)
10. [Phase 2 — Client Comfort](#10-phase-2--client-comfort)
11. [Phase 3 — Growth](#11-phase-3--growth)
12. [Email Templates](#12-email-templates)
13. [API Routes Reference](#13-api-routes-reference)
14. [Coding Conventions](#14-coding-conventions)

---

## 1. Project Overview

**Pidge** is a white-label, multi-tenant appointment booking SaaS platform.

- Each client (clinic, Ayurveda centre, dental, physio) is a **tenant**
- Each tenant gets their own subdomain: `clinicname.pidge.io`
- Tenants can have multiple **branches** (locations)
- **Patients do not need a login** — they book as guests
- **Clinic admins** manage doctors, services, slots, and appointments
- **You (super admin)** manage all tenants from a separate dashboard

**Product name:** Pidge
**Company name:** OutRift Technologies
**Domain:** pidge.io

---

## 2. Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack, one repo, fast to build |
| Database | Supabase (PostgreSQL) | Managed Postgres, auth built in |
| ORM | Prisma | Type-safe DB queries |
| Auth | NextAuth.js v5 | Admin login, role-based |
| Email | Resend | Transactional emails |
| Styling | Tailwind CSS + shadcn/ui | Fast, clean admin UI |
| Deployment | Vercel | Wildcard subdomain support |
| Cron | Vercel Cron Jobs | 24hr reminder emails |

**Do not add any other libraries without a strong reason.**

---

## 3. Folder Structure

Create this exact structure. Do not deviate.

```
pidge/
├── app/
│   ├── (booking)/                         ← patient-facing, no login
│   │   ├── layout.tsx                     ← loads tenant branding
│   │   ├── page.tsx                       ← services + doctors listing
│   │   ├── book/
│   │   │   └── page.tsx                   ← multi-step booking form
│   │   ├── confirmation/
│   │   │   └── [ref]/
│   │   │       └── page.tsx               ← booking confirmed screen
│   │   └── cancel/
│   │       └── page.tsx                   ← cancel via token
│   │
│   ├── admin/                             ← clinic admin (login required)
│   │   ├── layout.tsx                     ← auth guard + sidebar
│   │   ├── page.tsx                       ← redirect to /admin/appointments
│   │   ├── appointments/
│   │   │   ├── page.tsx                   ← list all appointments
│   │   │   └── [id]/
│   │   │       └── page.tsx               ← appointment detail
│   │   ├── doctors/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── services/
│   │   │   └── page.tsx
│   │   ├── slots/
│   │   │   └── page.tsx
│   │   └── branches/
│   │       └── page.tsx
│   │
│   ├── superadmin/                        ← you only (SUPER_ADMIN role)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── tenants/
│   │       ├── page.tsx
│   │       └── [id]/
│   │           └── page.tsx
│   │
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts
│       ├── appointments/
│       │   ├── route.ts                   ← GET list, POST create
│       │   └── [id]/
│       │       └── route.ts               ← GET one, PATCH status
│       ├── slots/
│       │   ├── route.ts                   ← GET available, POST create
│       │   └── [id]/
│       │       └── route.ts               ← PATCH, DELETE
│       ├── doctors/
│       │   └── route.ts
│       ├── services/
│       │   └── route.ts
│       ├── cancel/
│       │   └── route.ts                   ← cancel via token (no auth)
│       └── cron/
│           └── reminders/
│               └── route.ts               ← Vercel cron job
│
├── components/
│   ├── booking/
│   │   ├── ServiceCard.tsx
│   │   ├── DoctorCard.tsx
│   │   ├── SlotPicker.tsx
│   │   ├── BookingForm.tsx
│   │   └── BookingSteps.tsx
│   ├── admin/
│   │   ├── AppointmentTable.tsx
│   │   ├── AppointmentBadge.tsx
│   │   ├── SlotManager.tsx
│   │   └── Sidebar.tsx
│   └── ui/                                ← shadcn components live here
│
├── lib/
│   ├── db.ts                              ← Prisma client singleton
│   ├── auth.ts                            ← NextAuth config
│   ├── tenant.ts                          ← tenant resolver helpers
│   ├── email.ts                           ← Resend email functions
│   ├── booking-ref.ts                     ← bookingRef + cancelToken generators
│   └── utils.ts                           ← cn() and shared helpers
│
├── prisma/
│   └── schema.prisma
│
├── middleware.ts                           ← tenant resolver (every request)
├── next.config.js
├── tailwind.config.ts
└── DOCUMENTATION.md                       ← this file
```

---

## 4. Environment Variables

Create `.env.local` with these exact keys:

```bash
# Supabase / Database
DATABASE_URL="postgresql://..."            # pooled connection (Supabase)
DIRECT_URL="postgresql://..."             # direct connection for migrations

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Resend (email)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@pidge.io"

# App
NEXT_PUBLIC_APP_DOMAIN="pidge.io"         # used to resolve tenants
NEXT_PUBLIC_APP_URL="https://pidge.io"

# Cron security
CRON_SECRET="generate-a-random-string"

# Phase 3 only — leave empty for now
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
```

---

## 5. Database Schema

This is the complete Prisma schema. Create this exactly in `prisma/schema.prisma`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ── Tenant ────────────────────────────────────────────────────────────────────
model Tenant {
  id             String   @id @default(uuid())
  name           String
  slug           String   @unique        // subdomain: riverside → riverside.pidge.io
  businessType   String   @default("CLINIC") // CLINIC | AYURVEDA | DENTAL | PHYSIO
  country        String   @default("GB")
  timezone       String   @default("Europe/London")
  locale         String   @default("en-GB")
  currency       String   @default("GBP")
  currencySymbol String   @default("£")
  logoUrl        String?
  primaryColor   String   @default("#2563EB")
  plan           String   @default("FREE") // FREE | BASIC | PRO
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  branches     Branch[]
  adminUsers   AdminUser[]
  doctors      Doctor[]
  services     Service[]
  slots        Slot[]
  appointments Appointment[]
}

// ── Branch ────────────────────────────────────────────────────────────────────
model Branch {
  id        String   @id @default(uuid())
  tenantId  String
  name      String                        // "Main", "North", "South"
  slug      String                        // "main", "north" → used in URL path
  address   String?
  phone     String?
  timezone  String?                       // overrides tenant timezone if set
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  adminUsers   AdminUser[]
  doctors      Doctor[]
  slots        Slot[]
  appointments Appointment[]

  @@unique([tenantId, slug])
}

// ── AdminUser ─────────────────────────────────────────────────────────────────
model AdminUser {
  id        String   @id @default(uuid())
  tenantId  String
  branchId  String?                       // null = TENANT_ADMIN or SUPER_ADMIN
  name      String
  email     String   @unique
  password  String                        // bcrypt hashed
  role      String                        // SUPER_ADMIN | TENANT_ADMIN | BRANCH_ADMIN
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  tenant Tenant  @relation(fields: [tenantId], references: [id])
  branch Branch? @relation(fields: [branchId], references: [id])
}

// ── Doctor ────────────────────────────────────────────────────────────────────
model Doctor {
  id         String   @id @default(uuid())
  tenantId   String
  branchId   String?                      // null = available in all branches
  name       String
  speciality String
  bio        String?
  photoUrl   String?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  branch       Branch?       @relation(fields: [branchId], references: [id])
  slots        Slot[]
  appointments Appointment[]
}

// ── Service ───────────────────────────────────────────────────────────────────
model Service {
  id           String   @id @default(uuid())
  tenantId     String                     // NO branchId — shared across all branches
  name         String
  description  String?
  durationMins Int      @default(30)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  appointments Appointment[]
}

// ── Slot ──────────────────────────────────────────────────────────────────────
model Slot {
  id        String   @id @default(uuid())
  tenantId  String
  branchId  String?
  doctorId  String
  date      DateTime                      // store as UTC date, time = 00:00:00
  startTime String                        // "09:00"
  endTime   String                        // "09:30"
  isBooked  Boolean  @default(false)
  createdAt DateTime @default(now())

  tenant      Tenant       @relation(fields: [tenantId], references: [id])
  branch      Branch?      @relation(fields: [branchId], references: [id])
  doctor      Doctor       @relation(fields: [doctorId], references: [id])
  appointment Appointment?
}

// ── Appointment ───────────────────────────────────────────────────────────────
model Appointment {
  id            String   @id @default(uuid())
  tenantId      String
  branchId      String?
  slotId        String   @unique          // one appointment per slot
  serviceId     String
  doctorId      String
  bookingRef    String   @unique          // human readable: PIG-2025-0042
  patientName   String
  patientEmail  String
  patientPhone  String
  notes         String?                   // reason for visit
  status        String   @default("PENDING")
  // PENDING | APPROVED | CANCELLED | COMPLETED | NO_SHOW
  cancelToken   String   @unique          // UUID for cancel link
  reminderSent  Boolean  @default(false)  // tracks if 24hr reminder was sent
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant  Tenant  @relation(fields: [tenantId], references: [id])
  branch  Branch? @relation(fields: [branchId], references: [id])
  slot    Slot    @relation(fields: [slotId], references: [id])
  service Service @relation(fields: [serviceId], references: [id])
  doctor  Doctor  @relation(fields: [doctorId], references: [id])
}
```

---

## 6. Multi-Tenant Architecture

### How it works

Every request to `*.pidge.io` goes through `middleware.ts` first.
The middleware reads the subdomain, finds the tenant, and attaches
`tenantId` and `branchId` to the request headers.
Every page and API route reads `tenantId` from headers — never from
user input or query params.

### middleware.ts — write this exactly

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") || ""
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "pidge.io"

  // Skip for superadmin, api, and static files
  if (
    hostname.startsWith("admin.") ||
    req.nextUrl.pathname.startsWith("/api") ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/static")
  ) {
    return NextResponse.next()
  }

  // Extract slug from subdomain
  // e.g. "riverside.pidge.io" → "riverside"
  const slug = hostname.replace(`.${appDomain}`, "").replace(appDomain, "")

  if (!slug || slug === hostname) {
    return NextResponse.next() // running on root domain
  }

  // Look up tenant by slug
  const tenant = await prisma.tenant.findUnique({
    where: { slug, isActive: true },
  })

  if (!tenant) {
    return new NextResponse("Clinic not found", { status: 404 })
  }

  // Attach tenantId to headers for downstream use
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-tenant-id", tenant.id)
  requestHeaders.set("x-tenant-slug", tenant.slug)
  requestHeaders.set("x-tenant-name", tenant.name)
  requestHeaders.set("x-tenant-color", tenant.primaryColor)
  requestHeaders.set("x-tenant-logo", tenant.logoUrl || "")
  requestHeaders.set("x-tenant-timezone", tenant.timezone)

  // Check for branch in URL path
  // e.g. /north/book → branchId for "north"
  const pathSegments = req.nextUrl.pathname.split("/").filter(Boolean)
  if (pathSegments.length > 0) {
    const branch = await prisma.branch.findUnique({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: pathSegments[0] },
        isActive: true,
      },
    })
    if (branch) {
      requestHeaders.set("x-branch-id", branch.id)
      requestHeaders.set("x-branch-slug", branch.slug)
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

### lib/tenant.ts — helper to read tenant in server components

```typescript
import { headers } from "next/headers"

export function getTenantFromHeaders() {
  const h = headers()
  return {
    tenantId:       h.get("x-tenant-id") ?? "",
    tenantSlug:     h.get("x-tenant-slug") ?? "",
    tenantName:     h.get("x-tenant-name") ?? "",
    primaryColor:   h.get("x-tenant-color") ?? "#2563EB",
    logoUrl:        h.get("x-tenant-logo") ?? "",
    timezone:       h.get("x-tenant-timezone") ?? "Europe/London",
    branchId:       h.get("x-branch-id") ?? null,
    branchSlug:     h.get("x-branch-slug") ?? null,
  }
}
```

### Rule: every DB query must include tenantId

```typescript
// CORRECT
const appointments = await prisma.appointment.findMany({
  where: { tenantId, branchId: branchId ?? undefined }
})

// WRONG — never do this
const appointments = await prisma.appointment.findMany()
```

---

## 7. Authentication

Admin users (TENANT_ADMIN, BRANCH_ADMIN, SUPER_ADMIN) log in with
email and password. Patients never log in.

### lib/auth.ts

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email as string, isActive: true },
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!valid) return null

        return {
          id:       user.id,
          email:    user.email,
          name:     user.name,
          role:     user.role,
          tenantId: user.tenantId,
          branchId: user.branchId,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role     = (user as any).role
        token.tenantId = (user as any).tenantId
        token.branchId = (user as any).branchId
      }
      return token
    },
    session({ session, token }) {
      session.user.role     = token.role as string
      session.user.tenantId = token.tenantId as string
      session.user.branchId = token.branchId as string | null
      return session
    },
  },
  pages: {
    signIn: "/admin/login",
  },
})
```

### Role guards — use in every admin layout

```typescript
// app/admin/layout.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }) {
  const session = await auth()
  if (!session) redirect("/admin/login")
  if (!["TENANT_ADMIN", "BRANCH_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/admin/login")
  }
  return <>{children}</>
}
```

### Branch admin data scoping

```typescript
// Use this in every admin API route and page
export function getScopeFromSession(session) {
  const tenantId = session.user.tenantId
  // BRANCH_ADMIN is scoped to their branch only
  // TENANT_ADMIN sees all branches (branchId = null means no filter)
  const branchId =
    session.user.role === "BRANCH_ADMIN"
      ? session.user.branchId
      : null

  return { tenantId, branchId }
}
```

---

## 8. User Workflows

These workflows describe exactly what every user sees and does.
Claude Code must implement each screen and action to match these flows precisely.
Do not add extra steps. Do not skip any step.

---

### Workflow 1 — Super Admin (You)

**Goal:** Onboard a new clinic client and hand over their credentials.

```
1. You go to → admin.pidge.io
2. Log in with your SUPER_ADMIN email + password
3. You land on → Super Admin Dashboard
   Shows: list of all tenants, their plan, active/inactive status

4. Click "Add New Tenant"
5. Fill in the form:
   - Clinic name         (e.g. "Riverside Clinic")
   - Slug                (e.g. "riverside" → becomes riverside.pidge.io)
   - Business type       (Clinic / Ayurveda / Dental / Physio)
   - Country             (GB / IN / US etc.)
   - Timezone            (Europe/London etc.)
   - Plan                (FREE / BASIC / PRO)
   - Logo URL            (optional)
   - Primary colour      (hex colour picker)

6. Click "Create Tenant"
   → Tenant record created in DB

7. Fill in admin credentials form:
   - Admin name
   - Admin email
   - Temporary password

8. Click "Create Admin User"
   → AdminUser created with role=TENANT_ADMIN
   → Welcome email sent to admin with login link + credentials

9. You hand over:
   - Booking page URL: riverside.pidge.io
   - Admin panel URL:  riverside.pidge.io/admin
   - Email + password

Done. Clinic is live.
```

---

### Workflow 2 — Tenant Admin (Your Client)

**Goal:** Set up their clinic so patients can start booking.

```
1. Client goes to → riverside.pidge.io/admin
2. Logs in with email + password you sent them
3. Lands on → Admin Dashboard
   Shows: today's appointment count, pending count, approved count

── Step A: Add Services ──────────────────────────────────────────

4. Click "Services" in sidebar
5. Click "Add Service"
6. Fill in:
   - Service name        (e.g. "GP Consultation")
   - Description         (optional, shown to patient)
   - Duration            (e.g. 30 minutes)
7. Click Save
8. Repeat for each service they offer

── Step B: Add Doctors ───────────────────────────────────────────

9.  Click "Doctors" in sidebar
10. Click "Add Doctor"
11. Fill in:
    - Name
    - Speciality          (e.g. "General Practitioner")
    - Bio                 (optional)
    - Photo URL           (optional)
    - Branch              (if tenant has branches — select which branch)
12. Click Save
13. Repeat for each doctor

── Step C: Add Available Slots ───────────────────────────────────

14. Click "Slots" in sidebar
15. Select a doctor from dropdown
16. Select a date from date picker
17. Select time slots to add
    (checkboxes for 09:00, 09:30, 10:00, 10:30 ... etc.)
18. Click "Create Slots"
    → One Slot record created per selected time
19. Repeat for each doctor for each day

── Step D: Done ──────────────────────────────────────────────────

20. Booking page is now live at riverside.pidge.io
    Patients can see services, doctors, and available slots
```

---

### Workflow 3 — Patient (Guest, No Login)

**Goal:** Book an appointment in under 2 minutes.

```
1. Patient visits → riverside.pidge.io
   Sees: clinic logo, name, list of services with duration

── Step 1: Pick a Service ────────────────────────────────────────

2. Patient sees service cards:
   [ GP Consultation — 30 min ]  [ Physiotherapy — 45 min ]
3. Patient taps a service card
   → Moves to Step 2

── Step 2: Pick a Doctor ─────────────────────────────────────────

4. Patient sees doctor cards:
   [ Dr. Sarah Khan — General Practitioner ]
   [ Dr. James Patel — GP ]
   [ Any Available Doctor ]
5. Patient taps a doctor (or "Any Available")
   → Moves to Step 3

── Step 3: Pick a Date and Time ──────────────────────────────────

6. Patient sees a calendar
   - Dates with available slots are highlighted
   - Dates with no slots are greyed out
7. Patient taps a date
8. Patient sees available time slots for that day:
   [ 09:00 ]  [ 09:30 ]  [ 10:30 ]  [ 14:00 ]
   (only isBooked=false slots are shown)
9. Patient taps a time slot
   → Moves to Step 4

── Step 4: Enter Details ─────────────────────────────────────────

10. Patient sees a simple form:
    - Full name        (required)
    - Phone number     (required)
    - Email address    (required)
    - Reason for visit (optional, max 200 characters)
11. Patient fills the form
12. Patient clicks "Confirm Booking"

── Behind the scenes on confirm ──────────────────────────────────

13. API checks: is the slot still available? (race condition guard)
    → If NO:  show error "This slot was just taken. Pick another time."
    → If YES: continue

14. Slot.isBooked set to true (atomic transaction)
15. Appointment created with status=PENDING
16. bookingRef generated: PIG-2025-0042
17. cancelToken generated: UUID

── Step 5: Success Screen ────────────────────────────────────────

18. Patient sees confirmation screen:
    - "Booking received!"
    - Booking reference: PIG-2025-0042
    - Service, doctor, date, time
    - "You will receive a confirmation email shortly"

19. Patient receives Email 1 — Confirmation
    (contains booking ref + cancel link)

20. Admin receives Email 2 — New Booking Notification
```

---

### Workflow 4 — Admin Approves or Cancels a Booking

**Goal:** Clinic staff review and action incoming bookings.

```
1. Admin receives email notification of new booking
2. Admin goes to → riverside.pidge.io/admin/appointments
3. Sees appointments list — filtered to "Today" by default
4. New booking shows with status badge: [ PENDING ]

── Option A: Approve ─────────────────────────────────────────────

5. Admin clicks "Approve" button on the row
6. Status changes to [ APPROVED ] instantly (no page reload)
7. Patient receives Email 3 — Approval Confirmation
   (contains appointment details + clinic address)

── Option B: Cancel ──────────────────────────────────────────────

5. Admin clicks "Cancel" button on the row
6. Confirmation dialog: "Cancel this appointment?"
7. Admin clicks "Yes, Cancel"
8. Status changes to [ CANCELLED ]
9. Slot.isBooked set back to false (slot becomes available again)
10. Patient receives Email 4 — Cancellation Notice
```

---

### Workflow 5 — Patient Cancels via Email Link

**Goal:** Patient cancels without needing a login.

```
1. Patient opens their confirmation or reminder email
2. Patient clicks "Cancel appointment" link
   Link format: pidge.io/cancel?token=<cancelToken>

3. Patient lands on cancel page
   Shows: appointment details (doctor, date, time, booking ref)
   Shows: "Are you sure you want to cancel?"

4. Patient clicks "Yes, Cancel My Appointment"

5. Behind the scenes:
   - Appointment.status → CANCELLED
   - Slot.isBooked     → false (slot freed)

6. Page shows: "Your appointment has been cancelled."
   Shows booking ref for reference

7. Patient receives Email 4 — Cancellation Confirmation
8. Admin is NOT notified of patient cancellations
   (they see the updated status next time they open the panel)
```

---

### Workflow 6 — 24-Hour Reminder (Automated)

**Goal:** Remind patients the day before so they don't forget.

```
1. Every day at 8:00 AM — Vercel Cron triggers
   → GET /api/cron/reminders (with CRON_SECRET header)

2. System finds all appointments where:
   - status = APPROVED
   - reminderSent = false
   - slot.date = tomorrow

3. For each appointment found:
   - Send Email 5 — Reminder to patient
   - Set appointment.reminderSent = true

4. No admin action needed. Fully automatic.
```

---

### Workflow 7 — Tenant Admin Manages a Branch

**Goal:** Set up and manage a second clinic location.

```
── Only relevant if tenant has multiple branches ──────────────────

1. Tenant Admin goes to → /admin/branches
2. Clicks "Add Branch"
3. Fills in:
   - Branch name     (e.g. "North")
   - Slug            (e.g. "north" → riverside.pidge.io/north)
   - Address
   - Phone
   - Timezone        (if different from main branch)
4. Clicks Save

5. Creates a Branch Admin for this branch:
   - Goes to a user management section
   - Adds name, email, password
   - Assigns role: BRANCH_ADMIN
   - Assigns to: North branch

6. Branch Admin receives welcome email with credentials

── Branch Admin logs in ──────────────────────────────────────────

7. Branch Admin goes to → riverside.pidge.io/admin
8. Logs in — sees ONLY their branch's data
   (doctors, slots, appointments scoped to branchId)
9. Cannot see other branches — enforced by getScopeFromSession()

── Patient books at a specific branch ────────────────────────────

10. Patient visits → riverside.pidge.io/north
    (middleware resolves tenantId + branchId from URL)
11. Sees only doctors and slots for the North branch
12. Books normally — appointment.branchId = north branch ID
```

---

### Workflow 8 — Admin Marks a No-Show (Phase 2)

```
1. Patient had a confirmed appointment but did not arrive
2. Admin goes to the appointment in the list
3. Clicks "Mark No-Show"
4. Status changes to [ NO_SHOW ]
5. Slot stays blocked (isBooked remains true)
   (do NOT free the slot — the time has passed)
6. No email sent to patient
```

---

### Workflow 9 — Patient Reschedules (Phase 2)

```
1. Patient opens their confirmation email
2. Clicks "Reschedule" link
   Link format: pidge.io/reschedule?token=<rescheduleToken>

3. Lands on reschedule page
   Shows: current booking details
   Shows: same booking flow (Step 3 onwards — date + time picker)
   (service and doctor are pre-selected and locked)

4. Patient picks a new date and time slot
5. Patient clicks "Confirm Reschedule"

6. Behind the scenes (transaction):
   - Old slot.isBooked → false
   - New slot.isBooked → true
   - Appointment.slotId → new slot
   - Appointment.status stays APPROVED (no re-approval needed)
   - Appointment.reminderSent → false (reset so new reminder is sent)

7. Patient receives new confirmation email with updated details
```

---

### Appointment Status Flow

```
                    ┌─────────┐
                    │ PENDING │  ← created on booking
                    └────┬────┘
           ┌─────────────┼──────────────┐
           ↓             ↓              ↓
      ┌──────────┐  ┌──────────┐   cancelled
      │ APPROVED │  │CANCELLED │   by patient
      └────┬─────┘  └──────────┘   or admin
           │
     ┌─────┴──────┐
     ↓            ↓
┌──────────┐  ┌─────────┐
│COMPLETED │  │ NO_SHOW │
└──────────┘  └─────────┘
```

---

## 9. Phase 1 — Core MVP

Build these features in this exact order.
Do not move to the next feature until the current one works end-to-end.

---

### 8.1 lib/db.ts — Prisma singleton

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["query"] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

---

### 8.2 lib/booking-ref.ts — booking reference generator

```typescript
import { v4 as uuidv4 } from "uuid"

// Generates: PIG-2025-0042
export async function generateBookingRef(prisma: any): Promise<string> {
  const year  = new Date().getFullYear()
  const count = await prisma.appointment.count()
  const seq   = String(count + 1).padStart(4, "0")
  return `PIG-${year}-${seq}`
}

// Generates a UUID cancel token
export function generateCancelToken(): string {
  return uuidv4()
}
```

---

### 8.3 Patient Booking Flow

The booking flow is a multi-step form inside `app/(booking)/book/page.tsx`.
Build it as a single client component with local state managing the current step.

**Steps:**

```
Step 1 → Pick a service
Step 2 → Pick a doctor (or "Any available")
Step 3 → Pick a date, then a time slot
Step 4 → Enter name, phone, email, optional notes
Step 5 → Success screen with booking reference
```

**Step state shape:**

```typescript
type BookingState = {
  step:       1 | 2 | 3 | 4 | 5
  serviceId:  string | null
  doctorId:   string | null           // "any" if no preference
  slotId:     string | null
  slotDate:   string | null           // "2025-06-10"
  slotTime:   string | null           // "09:30"
  patientName:  string
  patientEmail: string
  patientPhone: string
  notes:        string
  bookingRef:   string | null         // set after success
}
```

**Slot availability API** — `GET /api/slots?doctorId=&date=&tenantId=`

```typescript
// Returns only slots where isBooked = false
const slots = await prisma.slot.findMany({
  where: {
    tenantId,
    branchId:  branchId ?? undefined,
    doctorId:  doctorId !== "any" ? doctorId : undefined,
    date:      new Date(date),
    isBooked:  false,
  },
  include: { doctor: true },
  orderBy:  { startTime: "asc" },
})
```

**Booking submission** — `POST /api/appointments`

This is the most critical API route. It must:
1. Accept: `{ slotId, serviceId, doctorId, patientName, patientEmail, patientPhone, notes }`
2. Use a Prisma transaction to atomically check + lock the slot
3. Create the appointment
4. Send confirmation emails
5. Return the booking reference

```typescript
// app/api/appointments/route.ts
import { prisma } from "@/lib/db"
import { generateBookingRef, generateCancelToken } from "@/lib/booking-ref"
import { sendPatientConfirmation, sendAdminNotification } from "@/lib/email"
import { getTenantFromHeaders } from "@/lib/tenant"

export async function POST(req: Request) {
  const { tenantId, branchId } = getTenantFromHeaders()
  const body = await req.json()
  const { slotId, serviceId, doctorId, patientName, patientEmail, patientPhone, notes } = body

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check slot is still available (race condition guard)
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
      })

      if (!slot || slot.isBooked) {
        throw new Error("SLOT_TAKEN")
      }

      // 2. Lock the slot
      await tx.slot.update({
        where: { id: slotId },
        data:  { isBooked: true },
      })

      // 3. Create appointment
      const bookingRef   = await generateBookingRef(tx)
      const cancelToken  = generateCancelToken()

      const appointment = await tx.appointment.create({
        data: {
          tenantId,
          branchId:     branchId ?? undefined,
          slotId,
          serviceId,
          doctorId,
          bookingRef,
          patientName,
          patientEmail,
          patientPhone,
          notes:        notes ?? null,
          status:       "PENDING",
          cancelToken,
        },
        include: {
          slot:    true,
          service: true,
          doctor:  true,
          tenant:  true,
        },
      })

      return appointment
    })

    // 4. Send emails (outside transaction — non-critical)
    await Promise.all([
      sendPatientConfirmation(result),
      sendAdminNotification(result),
    ])

    return Response.json({ bookingRef: result.bookingRef }, { status: 201 })

  } catch (err: any) {
    if (err.message === "SLOT_TAKEN") {
      return Response.json(
        { error: "This slot was just booked. Please choose another time." },
        { status: 409 }
      )
    }
    console.error(err)
    return Response.json({ error: "Something went wrong" }, { status: 500 })
  }
}
```

---

### 8.4 Cancel via Email Link

**Route:** `GET /api/cancel?token=xxx`

```typescript
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return Response.json({ error: "Invalid link" }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where: { cancelToken: token },
    include: { slot: true },
  })

  if (!appointment) {
    return Response.json({ error: "Booking not found" }, { status: 404 })
  }

  if (appointment.status === "CANCELLED") {
    return Response.json({ error: "Already cancelled" }, { status: 400 })
  }

  // Cancel appointment and free the slot
  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointment.id },
      data:  { status: "CANCELLED" },
    }),
    prisma.slot.update({
      where: { id: appointment.slotId },
      data:  { isBooked: false },
    }),
  ])

  await sendCancellationEmail(appointment)

  return Response.json({ success: true, bookingRef: appointment.bookingRef })
}
```

The cancel page at `app/(booking)/cancel/page.tsx` calls this API
on load using the `token` query param and shows a confirmation message.

---

### 8.5 Admin Panel

All admin routes are under `app/admin/`.
They are protected by the auth guard in `app/admin/layout.tsx`.

**Appointments list page — `app/admin/appointments/page.tsx`**

Show a table with these columns:
- Booking Ref
- Patient Name
- Service
- Doctor
- Date & Time
- Status badge (colour coded)
- Actions (Approve / Cancel buttons — inline, no page reload)

Filter controls at the top:
- Status: All / Pending / Approved / Cancelled
- Date: Today (default) / This Week / All
- Doctor: dropdown of all doctors

**Appointment status badge colours:**
```
PENDING   → amber/yellow
APPROVED  → green
CANCELLED → red
COMPLETED → gray
NO_SHOW   → orange
```

**Approve / Cancel action — `PATCH /api/appointments/[id]`**

```typescript
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { status } = await req.json()  // "APPROVED" | "CANCELLED"
  const { tenantId, branchId } = getScopeFromSession(session)

  const appointment = await prisma.appointment.update({
    where: { id: params.id, tenantId },
    data:  { status },
    include: { slot: true, service: true, doctor: true, tenant: true },
  })

  // If cancelling — free the slot
  if (status === "CANCELLED") {
    await prisma.slot.update({
      where: { id: appointment.slotId },
      data:  { isBooked: false },
    })
  }

  // Send status email to patient
  if (status === "APPROVED")   await sendApprovalEmail(appointment)
  if (status === "CANCELLED")  await sendCancellationEmail(appointment)

  return Response.json(appointment)
}
```

---

### 8.6 Slot Management — `app/admin/slots/page.tsx`

Admin selects:
1. A doctor (dropdown)
2. A date (date picker)
3. Time slots to add (e.g. 09:00, 09:30, 10:00)

Each time combination creates one `Slot` record.

Admin can also delete a slot — only if `isBooked = false`.

**POST /api/slots**

```typescript
// body: { doctorId, date, times: ["09:00", "09:30", "10:00"] }
// Creates one Slot record per time entry
```

---

### 8.7 24-Hour Reminder Cron Job

**Route:** `app/api/cron/reminders/route.ts`

This runs every day at 8:00 AM via Vercel Cron.

```typescript
export async function GET(req: Request) {
  // Verify this is called by Vercel Cron
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  // Find all approved appointments scheduled for tomorrow
  const appointments = await prisma.appointment.findMany({
    where: {
      status:       "APPROVED",
      reminderSent: false,
      slot: {
        date: { gte: tomorrow, lt: dayAfter },
      },
    },
    include: { slot: true, doctor: true, service: true, tenant: true },
  })

  for (const appt of appointments) {
    await sendReminderEmail(appt)
    await prisma.appointment.update({
      where: { id: appt.id },
      data:  { reminderSent: true },
    })
  }

  return Response.json({ sent: appointments.length })
}
```

**vercel.json — add this to the root**

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

---

### 8.8 Tenant Branding

The booking layout reads tenant branding from headers and applies it.

```typescript
// app/(booking)/layout.tsx
import { getTenantFromHeaders } from "@/lib/tenant"

export default function BookingLayout({ children }) {
  const { tenantName, primaryColor, logoUrl } = getTenantFromHeaders()

  return (
    <html>
      <body>
        <style>{`:root { --brand: ${primaryColor}; }`}</style>
        <header>
          {logoUrl && <img src={logoUrl} alt={tenantName} />}
          <span>{tenantName}</span>
        </header>
        <main>{children}</main>
        <footer>
          <small>Powered by Pidge</small>
        </footer>
      </body>
    </html>
  )
}
```

---

### 8.9 Super Admin

Route: `app/superadmin/`
Only accessible to users with role `SUPER_ADMIN`.

**Tenants list page** — shows all tenants with:
- Name, slug, plan, isActive toggle
- Button to create a new tenant
- Button to create admin credentials for a tenant

**Create tenant flow:**
1. Super admin fills: clinic name, slug, businessType, country, timezone, plan
2. Creates Tenant record
3. Creates an AdminUser with role=TENANT_ADMIN for that tenant
4. Emails the credentials to the tenant admin

---

## 10. Phase 2 — Client Comfort

Build these only after Phase 1 is live with a real client.
Prioritise based on what clients actually ask for.

---

### 9.1 Reschedule Flow

Add a `rescheduleToken` field to Appointment (new migration).

Patient clicks reschedule link in email →
lands on reschedule page →
sees current booking →
picks a new slot (same doctor + service) →
confirms →
old slot freed, new slot booked →
confirmation email sent.

Route: `app/(booking)/reschedule/page.tsx`
API:   `PATCH /api/appointments/reschedule`

```typescript
// body: { rescheduleToken, newSlotId }
// 1. Find appointment by rescheduleToken
// 2. Transaction: free old slot, book new slot, update appointment
// 3. Send new confirmation email
```

---

### 9.2 Admin Calendar View

Add a week-view calendar to `app/admin/appointments/calendar/page.tsx`.

Use `react-big-calendar` with a custom time grid.
Each appointment renders as a coloured block.
Click a block → opens appointment detail in a side drawer.

---

### 9.3 Recurring Slot Templates

New model: `SlotTemplate`

```prisma
model SlotTemplate {
  id        String   @id @default(uuid())
  tenantId  String
  branchId  String?
  doctorId  String
  dayOfWeek Int      // 0=Sun, 1=Mon ... 6=Sat
  startTime String   // "09:00"
  endTime   String   // "09:30"
  isActive  Boolean  @default(true)
}
```

Admin sets weekly schedule per doctor.
A cron job runs every Monday and generates Slot records
for the next 2 weeks based on active templates.

---

### 9.4 No-Show Handling

Add `NO_SHOW` as a valid status in appointments.
Admin can mark a patient as no-show from the appointment detail page.
No slot is freed when marked as no-show.

---

### 9.5 Admin Dashboard

`app/admin/page.tsx` — summary cards:

```
Today's Appointments  |  Pending Approval  |  Approved Today  |  This Week Total
```

Pull these with four separate count queries scoped to tenantId + branchId.

---

## 11. Phase 3 — Growth

Build these only when you have consistent paying clients.

---

### 10.1 Stripe Subscription Billing

- Each tenant has a `stripeCustomerId` and `stripeSubscriptionId`
- Plans: FREE / BASIC (£29/mo) / PRO (£79/mo)
- FREE plan: max 2 doctors, max 1 branch, max 50 bookings/month
- BASIC plan: max 10 doctors, unlimited bookings
- PRO plan: unlimited everything + custom domain

Feature gating — check `tenant.plan` before allowing certain actions.

Webhook handler: `app/api/stripe/webhook/route.ts`
Updates `tenant.plan` on `invoice.paid` and `customer.subscription.deleted`.

---

### 10.2 Self-Service Onboarding

`app/(public)/register/page.tsx` — public signup form.

Flow:
1. Clinic fills: name, slug, email, password, businessType, country
2. Stripe checkout (if paid plan selected)
3. On payment success: Tenant + AdminUser created automatically
4. Welcome email with login link sent
5. Booking page live immediately at `slug.pidge.io`

---

### 10.3 Custom Domain

Add `customDomain` field to Tenant.
Middleware checks `customDomain` in addition to slug-based subdomain.
Vercel handles SSL automatically via their custom domain API.

---

### 10.4 SMS Reminders

Install: `npm install twilio`

In the cron job, after sending the reminder email,
also send an SMS if `tenant.smsEnabled = true`.

```typescript
import twilio from "twilio"
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

await client.messages.create({
  body: `Reminder: Your appointment is tomorrow at ${time}. - ${tenantName}`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to:   patientPhone,
})
```

---

### 10.5 Embeddable Widget

Create `app/widget/[slug]/page.tsx` — a minimal booking UI
designed to be rendered inside an iframe.

Client adds to their website:
```html
<iframe src="https://pidge.io/widget/riverside" width="400" height="600"></iframe>
```

---

## 12. Email Templates

All emails are sent using Resend. Build these in `lib/email.ts`.

```typescript
import { Resend } from "resend"
const resend = new Resend(process.env.RESEND_API_KEY)

// Helper
async function send(to: string, subject: string, html: string) {
  return resend.emails.send({
    from:    process.env.EMAIL_FROM!,
    to,
    subject,
    html,
  })
}
```

### Email 1 — Patient Confirmation (on booking)
```
Subject: Your booking is confirmed — [BookingRef]

Hi [PatientName],

Your appointment has been received and is pending confirmation.

  Service:   [ServiceName]
  Doctor:    [DoctorName]
  Date:      [Date]
  Time:      [StartTime]
  Reference: [BookingRef]

We will confirm your appointment shortly.

[Cancel link]

— [ClinicName]
```

### Email 2 — Admin Notification (on booking)
```
Subject: New booking — [PatientName] — [Date] [Time]

New appointment request:

  Patient:  [PatientName]
  Phone:    [PatientPhone]
  Email:    [PatientEmail]
  Service:  [ServiceName]
  Doctor:   [DoctorName]
  Date:     [Date] at [StartTime]
  Notes:    [Notes or "None"]

[View in dashboard →]
```

### Email 3 — Approval (on admin approve)
```
Subject: Appointment confirmed — [Date] [Time]

Your appointment has been confirmed.

  Service: [ServiceName]
  Doctor:  [DoctorName]
  Date:    [Date] at [StartTime]
  Address: [BranchAddress]

[Cancel link]

— [ClinicName]
```

### Email 4 — Cancellation (on cancel)
```
Subject: Appointment cancelled — [BookingRef]

Your appointment ([BookingRef]) has been cancelled.

If you'd like to rebook, visit:
[BookingPageURL]

— [ClinicName]
```

### Email 5 — 24hr Reminder (cron job)
```
Subject: Reminder — appointment tomorrow at [Time]

This is a reminder for your appointment tomorrow.

  Doctor:  [DoctorName]
  Service: [ServiceName]
  Time:    [StartTime]
  Address: [BranchAddress]

[Cancel link]

— [ClinicName]
```

---

## 13. API Routes Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/services` | None | List active services for tenant |
| GET | `/api/doctors` | None | List active doctors for tenant/branch |
| GET | `/api/slots` | None | List available slots (by date + doctorId) |
| POST | `/api/appointments` | None | Create booking (guest) |
| GET | `/api/cancel` | None | Cancel via token |
| GET | `/api/appointments` | Admin | List appointments (filtered) |
| GET | `/api/appointments/[id]` | Admin | Single appointment detail |
| PATCH | `/api/appointments/[id]` | Admin | Update status |
| POST | `/api/slots` | Admin | Create slots |
| DELETE | `/api/slots/[id]` | Admin | Delete unbooked slot |
| GET | `/api/doctors` | Admin | List all doctors |
| POST | `/api/doctors` | Admin | Create doctor |
| PATCH | `/api/doctors/[id]` | Admin | Update doctor |
| POST | `/api/services` | Admin | Create service |
| PATCH | `/api/services/[id]` | Admin | Update service |
| GET | `/api/cron/reminders` | Cron | Send 24hr reminders |

---

## 14. Coding Conventions

Follow these rules throughout the entire codebase.

### General
- Use TypeScript everywhere — no `.js` files
- Use `async/await` — no `.then()` chains
- Use named exports for components, default exports for pages
- Never use `any` type unless absolutely necessary

### Database
- Every query must include `tenantId` in the `where` clause
- Use Prisma transactions for any operation that touches multiple tables
- Never expose raw database errors to the client

### API Routes
- Every admin API route must check `await auth()` first
- Return consistent error shapes: `{ error: string }`
- Return consistent success shapes: `{ data: T }` or `{ success: true }`
- Use appropriate HTTP status codes (200, 201, 400, 401, 404, 409, 500)

### Components
- Keep components small — if over 150 lines, split it
- Server components by default — add `"use client"` only when needed
- Use `shadcn/ui` components for all form inputs, buttons, and dialogs

### Naming
- Files: `PascalCase` for components, `camelCase` for utilities
- Database fields: `camelCase`
- Environment variables: `SCREAMING_SNAKE_CASE`
- API routes: `kebab-case`

### Security
- Never trust client-supplied `tenantId` — always read from headers
- Hash passwords with bcrypt (salt rounds: 12)
- Validate all API inputs — use `zod` for schema validation
- Cancel tokens and reschedule tokens must be UUIDs — never sequential

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd pidge
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in DATABASE_URL, NEXTAUTH_SECRET, RESEND_API_KEY

# 3. Set up database
npx prisma generate
npx prisma db push

# 4. Create your super admin user
npx ts-node scripts/create-super-admin.ts

# 5. Run
npm run dev
```

---

*Pidge — by OutRift Technologies*
*Build Phase 1 first. Ship it. Then listen to your clients.*