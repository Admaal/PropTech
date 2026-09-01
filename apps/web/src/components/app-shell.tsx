import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";

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
      <AppHeader showAdminLink={showAdminLink} />
      <main className="mx-auto max-w-300 px-6 py-10">
        <PageHeader
          title={title}
          subtitle={subtitle}
          backHref={backHref}
          backLabel={backLabel}
        />
        {children}
      </main>
    </div>
  );
}
