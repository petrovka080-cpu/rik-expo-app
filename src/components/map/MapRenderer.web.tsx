import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import L from "leaflet";
import type { MarketListing } from "./MapScreen";
import { zoomFromRegion } from "./pixelCluster";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  listings: MarketListing[];
  spiderPoints?: MarketListing[];
  hideClusterId?: string | null;
  selectedId: string | null;
  region: Region;
  myLoc: { latitude: number; longitude: number } | null;
  onSelect: (id: string) => void;
  onRegionChange: (r: Region) => void;
  onViewportChange: (v: {
    zoom: number;
    bounds: { west: number; south: number; east: number; north: number };
  }) => void;
};

const UI = { border: "#1F2937", demand: "#EF4444" };

const getKindColor = (kind?: string | null) => {
  if (kind === "material") return "#22C55E";
  if (kind === "work") return "#8B5CF6";
  if (kind === "service") return "#0EA5E9";
  return "#7C3AED";
};

const getDemandLabel = (item: any) => {
  const cnt =
    (typeof item?.__clusterCount === "number" && item.__clusterCount > 0)
      ? item.__clusterCount
      : (Array.isArray(item?.__clusterItems) ? item.__clusterItems.length : 0) || 1;

  return cnt > 1 ? `НУЖНО (${cnt})` : "НУЖНО";
};

export default function MapRendererWeb({
  listings,
  spiderPoints = [],
  hideClusterId = null,
  selectedId,
  region,
  myLoc,
  onSelect,
  onRegionChange,
  onViewportChange,
}: Props) {
  const hostRef = useRef<any>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, any>>({});
  const myMarkerRef = useRef<L.Marker | null>(null);

  // ✅ suppress moveend/zoomend while we do programmatic flyTo
  const suppressEmitRef = useRef(false);
  const suppressTimerRef = useRef<any>(null);

  const safeSetSuppress = (ms: number) => {
    suppressEmitRef.current = true;
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => {
      suppressEmitRef.current = false;
    }, ms);
  };

  const emitViewport = useMemo(() => {
    return () => {
      const map = mapRef.current;
      if (!map) return;
      if (suppressEmitRef.current) return;

      const c = map.getCenter();
      const b = map.getBounds();
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();

      const latDelta = Math.max(0.0005, Math.abs(ne.lat - sw.lat));
      const lngDelta = Math.max(0.0005, Math.abs(ne.lng - sw.lng));

      onRegionChange({
        latitude: c.lat,
        longitude: c.lng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      });

      onViewportChange({
        zoom: map.getZoom(),
        bounds: { west: sw.lng, south: sw.lat, east: ne.lng, north: ne.lat },
      });
    };
  }, [onRegionChange, onViewportChange]);

  // init map
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;

    const map = L.map(hostRef.current, {
      zoomControl: true,
      attributionControl: true,
      // ✅ чтобы меньше дёргалось во время анимации
      inertia: true,
      worldCopyJump: true,
    }).setView([region.latitude, region.longitude], 12);

    map.getContainer().style.zIndex = "0";

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.on("moveend", emitViewport);
    map.on("zoomend", emitViewport);

    mapRef.current = map;

    setTimeout(() => {
      try {
        emitViewport();
      } catch {}
    }, 0);

    return () => {
      try {
        map.off("moveend", emitViewport);
        map.off("zoomend", emitViewport);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ follow region from outside:
  // Leaflet ignores latitudeDelta -> so we convert delta -> zoom and flyTo.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const c = map.getCenter();
    const dLat = Math.abs(c.lat - region.latitude);
    const dLng = Math.abs(c.lng - region.longitude);

    // ignore micro center diff
    const micro = dLat < 0.00005 && dLng < 0.00005;

    // compute target zoom from delta and container width
    const w = Math.max(320, map.getSize()?.x || 360);
    const targetZoom = zoomFromRegion(region.longitudeDelta, w);

    const currentZoom = map.getZoom();
    const zoomDiff = Math.abs(currentZoom - targetZoom);

    // если почти ничего не меняется — не трогаем (главное против "мячика")
    if (micro && zoomDiff < 1) return;

    // suppress events while we animate
    safeSetSuppress(320);

    // flyTo даёт ровный Zillow-like переход
    map.flyTo([region.latitude, region.longitude], targetZoom, {
      animate: true,
      duration: 0.28,
    });
  }, [region.latitude, region.longitude, region.longitudeDelta]);

  // my loc marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!myLoc) {
      if (myMarkerRef.current) {
        try {
          map.removeLayer(myMarkerRef.current);
        } catch {}
        myMarkerRef.current = null;
      }
      return;
    }

    const html = `
      <div style="position:relative;width:44px;height:44px; pointer-events:none;">
        <style>
          @keyframes gPulse {
            0%   { transform: translate(-50%, -50%) scale(0.35); opacity: 0.65; }
            60%  { transform: translate(-50%, -50%) scale(1.55); opacity: 0.18; }
            100% { transform: translate(-50%, -50%) scale(1.95); opacity: 0.0; }
          }
          @keyframes gPulse2 {
            0%   { transform: translate(-50%, -50%) scale(0.20); opacity: 0.55; }
            70%  { transform: translate(-50%, -50%) scale(1.25); opacity: 0.12; }
            100% { transform: translate(-50%, -50%) scale(1.55); opacity: 0.0; }
          }
        </style>

        <div style="
          position:absolute; left:50%; top:50%;
          width:0;height:0;
          border-left: 12px solid transparent;
          border-right: 12px solid transparent;
          border-top: 48px solid rgba(37,99,235,0.22);
          transform: translate(-50%, -62%) rotate(0deg);
        "></div>

        <div style="
          position:absolute; left:50%; top:50%;
          width:30px;height:30px;border-radius:999px;
          background: rgba(37,99,235,0.35);
          transform: translate(-50%, -50%);
          animation: gPulse 1.4s ease-out infinite;
        "></div>

        <div style="
          position:absolute; left:50%; top:50%;
          width:26px;height:26px;border-radius:999px;
          background: rgba(59,130,246,0.28);
          transform: translate(-50%, -50%);
          animation: gPulse2 1.4s ease-out infinite;
          animation-delay: 0.45s;
        "></div>

        <div style="
          position:absolute; left:50%; top:50%;
          width:34px;height:34px;border-radius:999px;
          background: rgba(59,130,246,0.20);
          transform: translate(-50%, -50%);
          display:flex; align-items:center; justify-content:center;
          box-shadow: 0 16px 30px rgba(0,0,0,0.25);
        ">
          <div style="
            width:14px;height:14px;border-radius:999px;
            background:#1D4ED8;
            border:3px solid rgba(255,255,255,0.98);
            box-shadow: 0 0 0 8px rgba(29,78,216,0.22);
          "></div>
        </div>
      </div>
    `;

    const icon = L.divIcon({ html, className: "", iconSize: [44, 44], iconAnchor: [22, 22] });
    const latlng: [number, number] = [myLoc.latitude, myLoc.longitude];

    if (!myMarkerRef.current) {
      myMarkerRef.current = L.marker(latlng, { icon, interactive: false }).addTo(map);
    } else {
      myMarkerRef.current.setLatLng(latlng);
      myMarkerRef.current.setIcon(icon);
    }
  }, [myLoc]);

  // markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((m: any) => {
      try {
        map.removeLayer(m);
      } catch {}
    });
    markersRef.current = {};

    const hasSpider = Array.isArray(spiderPoints) && spiderPoints.length > 0;

    const base = listings
      .filter((l: any) => l.lat != null && l.lng != null)
      .filter((x: any) => !(hasSpider && hideClusterId && x.id === hideClusterId));

    const allToDraw: any[] = [...(hasSpider ? spiderPoints : []), ...base];

    allToDraw.forEach((item: any) => {
      const isSelected = selectedId === item.id;
      const bg = item.side === "demand" ? UI.demand : getKindColor(item.kind);
      const border = isSelected ? "#F9FAFB" : UI.border;

      const label =
        item.__spiderOf
          ? item.side === "demand"
            ? "НУЖНО"
            : item.price != null
              ? `${Number(item.price).toLocaleString("ru-RU")} KGS`
              : "Цена?"
          : item.side === "demand"
            ? getDemandLabel(item)
            : item.price != null
              ? `${Number(item.price).toLocaleString("ru-RU")} KGS`
              : "Цена?";

      const html = `
        <div style="
          padding:4px 10px;
          border-radius:999px;
          background:${bg};
          color:white;
          font-weight:900;
          font-size:12px;
          border:2px solid ${border};
          box-shadow:0 4px 10px rgba(0,0,0,0.35);
          white-space:nowrap;
        ">${label}</div>
      `;

      const icon = L.divIcon({ html, className: "", iconSize: [120, 32], iconAnchor: [60, 16] });
      const marker = L.marker([Number(item.lat), Number(item.lng)], { icon }).addTo(map);

      marker.on("click", () => {
        // ✅ prevent bounce from immediate emitViewport while click-triggered flyTo happens
        safeSetSuppress(320);
        onSelect(item.id);
      });

      markersRef.current[String(item.id)] = marker;
    });
  }, [listings, spiderPoints, hideClusterId, selectedId, onSelect]);

  return <View ref={hostRef} style={StyleSheet.absoluteFill as any} />;
}
