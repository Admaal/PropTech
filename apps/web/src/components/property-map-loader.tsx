"use client";

import dynamic from "next/dynamic";

export const PropertyMap = dynamic(
  () =>
    import("@/components/property-map").then((mod) => mod.PropertyMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[424px] animate-pulse rounded-lg border border-foreground bg-card" />
    ),
  },
);
