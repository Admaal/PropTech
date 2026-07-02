import { LoginPageClient } from "./login-page-client";

export default function LoginPage() {
  return (
    <LoginPageClient demoEnabled={Boolean(process.env.DEMO_USER_PASSWORD)} />
  );
}
