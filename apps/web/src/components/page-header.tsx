import Link from "next/link";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      {backHref && (
        <Link
          href={backHref}
          className="mb-2 block text-sm text-muted-foreground hover:text-foreground"
        >
          {backLabel ?? "← Volver"}
        </Link>
      )}
      <h1 className="text-2xl font-medium">{title}</h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
