import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Volver
        </Link>
        <h1 className="mt-4 text-2xl font-medium">Probar la demo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Elige una inmobiliaria de ejemplo. El registro está deshabilitado en
          esta demo.
        </p>
      </div>
      <LoginForm demoEnabled={Boolean(process.env.DEMO_USER_PASSWORD)} />
    </main>
  );
}
