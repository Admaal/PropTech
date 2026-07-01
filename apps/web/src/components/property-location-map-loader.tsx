"use client";

import dynamic from "next/dynamic";

interface PropertyLocationMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

const Map = dynamic(
  () =>
    import("@/components/property-location-map").then(
      (mod) => mod.PropertyLocationMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse rounded-lg border border-foreground bg-muted" />
    ),
  },
);

export function PropertyLocationMap(props: PropertyLocationMapProps) {
  return <Map {...props} />;
}
