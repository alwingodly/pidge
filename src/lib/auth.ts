import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
          include: { tenant: { select: { slug: true } } },
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!valid) return null

        return {
          id:         user.id,
          email:      user.email,
          name:       user.name,
          role:       user.role,
          tenantId:   user.tenantId,
          tenantSlug: user.tenant.slug,
          branchId:   user.branchId,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role       = (user as { role?: string }).role           ?? ""
        token.tenantId   = (user as { tenantId?: string }).tenantId   ?? ""
        token.tenantSlug = (user as { tenantSlug?: string }).tenantSlug ?? ""
        token.branchId   = (user as { branchId?: string | null }).branchId ?? null
      }
      return token
    },
    session({ session, token }) {
      session.user.role       = token.role as string
      session.user.tenantId   = token.tenantId as string
      session.user.tenantSlug = token.tenantSlug as string
      session.user.branchId   = (token.branchId as string | null) ?? null
      return session
    },
  },
  pages: {
    signIn: "/admin/login",
  },
})
