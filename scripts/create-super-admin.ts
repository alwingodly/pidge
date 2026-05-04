import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import * as readline from "readline"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans) }))
}

async function main() {
  console.log("── Create Super Admin ──────────────────────────────")

  const name     = await prompt("Name:     ")
  const email    = await prompt("Email:    ")
  const password = await prompt("Password: ")

  if (!name || !email || !password) {
    console.error("All fields are required.")
    process.exit(1)
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } })
  if (existing) {
    console.error(`User ${email} already exists.`)
    process.exit(1)
  }

  // Super admin needs a tenantId — create a system tenant for it
  let systemTenant = await prisma.tenant.findFirst({ where: { slug: "pidge-system" } })
  if (!systemTenant) {
    systemTenant = await prisma.tenant.create({
      data: {
        name: "Pidge System",
        slug: "pidge-system",
        isActive: false, // hidden from booking
      },
    })
  }

  const hashed = await bcrypt.hash(password, 12)
  const user   = await prisma.adminUser.create({
    data: {
      tenantId: systemTenant.id,
      name,
      email,
      password: hashed,
      role:     "SUPER_ADMIN",
    },
  })

  console.log(`\n✓ Super admin created: ${user.email}`)
  console.log(`  Login at: http://localhost:3000/admin/login`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
