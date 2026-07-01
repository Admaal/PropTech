"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { PropertyListItem } from "@proptech/shared";
import { PriceLegend } from "@/components/price-legend";
import {
  getPriceTier,
  priceTierMarkerColor,
} from "@/lib/price-tier";
import "leaflet/dist/leaflet.css";

const MADRID_CENTER: [number, number] = [40.4168, -3.7038];
const DEFAULT_ZOOM = 12;
const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function priceIcon(priceMonthly: number): L.DivIcon {
  const color = priceTierMarkerColor[getPriceTier(priceMonthly)];
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #202020;box-shadow:0 1px 3px rgba(0,0,0,.25)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function MapBoundsListener({
  onBoundsChange,
  enabled,
}: {
  onBoundsChange: (bbox: string) => void;
  enabled: boolean;
}) {
  const map = useMap();
  const ready = useRef(false);

  useMapEvents({
    moveend: () => {
      if (!enabled) return;
      const b = map.getBounds();
      onBoundsChange(
        `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`,
      );
    },
  });

  useEffect(() => {
    if (!enabled || ready.current) return;
    ready.current = true;
    const b = map.getBounds();
    onBoundsChange(
      `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`,
    );
  }, [enabled, map, onBoundsChange]);

  return null;
}

interface PropertyMapProps {
  properties: PropertyListItem[];
  onBoundsChange: (bbox: string) => void;
  filterByMap: boolean;
  onFilterByMapChange: (value: boolean) => void;
}

export function PropertyMap({
  properties,
  onBoundsChange,
  filterByMap,
  onFilterByMapChange,
}: PropertyMapProps) {
  const markers = useMemo(
    () =>
      properties.filter(
        (p) => p.latitude != null && p.longitude != null,
      ),
    [properties],
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">Mapa</h3>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={filterByMap}
            onChange={(e) => onFilterByMapChange(e.target.checked)}
            className="cursor-pointer rounded border-border"
          />
          Filtrar por zona visible
        </label>
      </div>
      <div className="property-map-surface bg-[#f5f5f5]">
        <MapContainer
          center={MADRID_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-[360px] w-full z-0"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={OSM_TILES}
          />
          <MapBoundsListener
            onBoundsChange={onBoundsChange}
            enabled={filterByMap}
          />
          {markers.map((property) => (
            <Marker
              key={property.id}
              position={[property.latitude!, property.longitude!]}
              icon={priceIcon(property.price_monthly)}
            >
              <Popup>
                <div className="min-w-[220px] max-w-[260px] text-sm text-[#202020]">
                  {property.image_urls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={property.image_urls[0]}
                      alt={property.title}
                      className="mb-2 h-28 w-full rounded-md object-cover"
                    />
                  )}
                  <p className="font-medium">{property.title}</p>
                  {property.description && (
                    <p className="mt-1 line-clamp-3 text-xs text-[#555]">
                      {property.description}
                    </p>
                  )}
                  <p className="mt-2 font-medium">
                    {property.price_monthly.toLocaleString("es-ES")} €/mes
                  </p>
                  <Link
                    href={`/properties/${property.id}`}
                    className="mt-2 inline-block text-[#5757f8] hover:underline"
                  >
                    Ver detalle
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="border-t border-border">
        <PriceLegend />
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          {markers.length} marcadores · color según alquiler mensual
        </p>
      </div>
    </div>
  );
}
