import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppHeaderProps {
  showAdminLink?: boolean;
}

export function AppHeader({ showAdminLink = false }: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-300 items-center justify-between gap-6 px-6 py-4">
        <Link
          href="/dashboard"
          className="inline-flex min-w-0 items-center gap-2 text-foreground hover:opacity-80"
        >
          <Logo className="h-7 w-7" showWordmark />
        </Link>
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
  );
}
