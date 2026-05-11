import LoginScreen from "@/components/auth/LoginScreen"
import { getPlatformLoginContent } from "@/lib/platform-login-content"

export default async function LoginPage() {
  const content = await getPlatformLoginContent()
  return <LoginScreen content={content} />
}
