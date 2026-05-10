import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id:       string
      name:     string
      email:    string
      image?:   string | null
      role:     string
      tenantId:   string
      tenantSlug: string
      branchId:   string | null
    }
  }
  interface User {
    role:       string
    tenantId:   string
    tenantSlug: string
    branchId:   string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:         string
    role:       string
    tenantId:   string
    tenantSlug: string
    branchId:   string | null
  }
}
