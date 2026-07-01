import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppShellProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  showAdminLink?: boolean;
  children: React.ReactNode;
}

export function AppShell({
  title,
  subtitle,
  backHref,
  backLabel,
  showAdminLink = false,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-4">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="mb-2 inline-flex items-center gap-2 text-foreground hover:opacity-80"
            >
              <Logo className="h-7 w-7" showWordmark />
            </Link>
            {backHref && (
              <Link
                href={backHref}
                className="mb-1 block text-sm text-muted-foreground hover:text-foreground"
              >
                {backLabel ?? "← Volver"}
              </Link>
            )}
            <h1 className="truncate text-lg font-medium">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <nav className="flex shrink-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Propiedades
            </Link>
            <Link
              href="/analyses"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Análisis
            </Link>
            {showAdminLink && (
              <Link
                href="/admin"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
              >
                Admin
              </Link>
            )}
            <ThemeToggle />
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-6 py-10">{children}</main>
    </div>
  );
}
