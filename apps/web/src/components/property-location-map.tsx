"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

interface PropertyLocationMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export function PropertyLocationMap({
  latitude,
  longitude,
}: PropertyLocationMapProps) {
  const markerIcon = L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#5757f8;border:2px solid #202020;box-shadow:0 1px 3px rgba(0,0,0,.25)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return (
    <div className="property-map-surface overflow-hidden rounded-lg bg-[#f5f5f5]">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        className="h-48 w-full z-0"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url={OSM_TILES}
        />
        <Marker position={[latitude, longitude]} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}
