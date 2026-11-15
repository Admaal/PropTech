export const riskBadgeClasses = {
  low: "bg-success-soft text-success-ink border-success-line",
  medium: "bg-warning-soft text-warning-ink border-warning-line",
  high: "bg-destructive-soft text-destructive-ink border-destructive-line",
} as const;

export const alertErrorClasses =
  "rounded-lg border border-destructive-line bg-destructive-soft text-destructive-ink";

export const alertSuccessClasses =
  "rounded-lg border border-success-line bg-success-soft text-success-ink";

export const alertWarningClasses =
  "rounded-lg border border-warning-line bg-warning-soft text-warning-ink";

export const btnPrimaryClasses =
  "cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60";

export const btnSecondaryClasses =
  "cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60";
