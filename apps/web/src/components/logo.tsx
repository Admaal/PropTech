import type { SVGProps } from "react";

interface LogoProps extends SVGProps<SVGSVGElement> {
  showWordmark?: boolean;
}

export function Logo({ showWordmark = false, className, ...props }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className={className ?? "h-8 w-8"}
        {...props}
      >
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path
          d="M16 6.5 6.5 13.25V25h7v-7.25h5V25h7V13.25L16 6.5Z"
          className="fill-primary-foreground"
        />
        <circle cx="23.25" cy="9.25" r="2.35" className="fill-primary-foreground" />
      </svg>
      {showWordmark && (
        <span className="text-lg font-medium tracking-tight">PropTech</span>
      )}
    </span>
  );
}
