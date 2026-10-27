import React, { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { ensureLeafletWebCss } from "./leafletWebCss";
import type { ClusterListing, MapRendererProps } from "./mapContracts";
import { zoomFromRegion } from "./pixelCluster";
import { recordSwallowedError } from "../../lib/observability/swallowedError";

const UI = { border: "#1F2937", demand: "#EF4444" };
const FILL_STYLE: React.CSSProperties = { position: "absolute", inset: "0" };

const getKindColor = (kind?: string | null) => {
  if (kind === "material") return "#22C55E";
  if (kind === "work") return "#8B5CF6";
  if (kind === "service") return "#0EA5E9";
  return "#7C3AED";
};

const getDemandLabel = (
  item: Pick<ClusterListing, "__clusterCount" | "__clusterItems">,
) => {
  const cnt =
    typeof item.__clusterCount === "number" && item.__clusterCount > 0
      ? item.__clusterCount
      : (Array.isArray(item.__clusterItems) ? item.__clusterItems.length : 0) || 1;

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
}: MapRendererProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const myMarkerRef = useRef<L.Marker | null>(null);
  const suppressEmitRef = useRef(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialViewportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (!map || suppressEmitRef.current) return;

      const center = map.getCenter();
      const bounds = map.getBounds();
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();

      const latitudeDelta = Math.max(0.0005, Math.abs(northEast.lat - southWest.lat));
      const longitudeDelta = Math.max(0.0005, Math.abs(northEast.lng - southWest.lng));

      onRegionChange({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta,
        longitudeDelta,
      });

      onViewportChange({
        zoom: map.getZoom(),
        bounds: {
          west: southWest.lng,
          south: southWest.lat,
          east: northEast.lng,
          north: northEast.lat,
        },
      });
    };
  }, [onRegionChange, onViewportChange]);

  useEffect(() => {
    ensureLeafletWebCss();
  }, []);

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;

    const map = L.map(hostRef.current, {
      zoomControl: true,
      attributionControl: true,
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

    if (initialViewportTimerRef.current) clearTimeout(initialViewportTimerRef.current);
    initialViewportTimerRef.current = setTimeout(() => {
      initialViewportTimerRef.current = null;
      emitViewport();
    }, 0);

    return () => {
      if (initialViewportTimerRef.current) {
        clearTimeout(initialViewportTimerRef.current);
        initialViewportTimerRef.current = null;
      }
      if (suppressTimerRef.current) {
        clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = null;
      }
      try {
        map.off("moveend", emitViewport);
        map.off("zoomend", emitViewport);
        map.remove();
      } catch (error) {
        recordSwallowedError({
          screen: "supplier_map",
          surface: "map_renderer",
          event: "map_leaflet_dispose_failed",
          error,
          kind: "cleanup_only",
          sourceKind: "leaflet:web",
          errorStage: "dispose",
        });
      }
      mapRef.current = null;
    };
  }, [emitViewport, region.latitude, region.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const center = map.getCenter();
    const latitudeDiff = Math.abs(center.lat - region.latitude);
    const longitudeDiff = Math.abs(center.lng - region.longitude);
    const microMove = latitudeDiff < 0.00005 && longitudeDiff < 0.00005;

    const width = Math.max(320, map.getSize()?.x || 360);
    const targetZoom = zoomFromRegion(region.longitudeDelta, width);
    const zoomDiff = Math.abs(map.getZoom() - targetZoom);
    if (microMove && zoomDiff < 1) return;

    safeSetSuppress(320);
    map.flyTo([region.latitude, region.longitude], targetZoom, {
      animate: true,
      duration: 0.28,
    });
  }, [region.latitude, region.longitude, region.longitudeDelta]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!myLoc) {
      if (myMarkerRef.current) {
        try {
          map.removeLayer(myMarkerRef.current);
        } catch (error) {
          recordSwallowedError({
            screen: "supplier_map",
            surface: "map_renderer",
            event: "map_my_location_marker_remove_failed",
            error,
            kind: "cleanup_only",
            sourceKind: "leaflet:web",
            errorStage: "remove_my_location_marker",
          });
        }
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
      return;
    }

    myMarkerRef.current.setLatLng(latlng);
    myMarkerRef.current.setIcon(icon);
  }, [myLoc]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((marker) => {
      try {
        map.removeLayer(marker);
      } catch (error) {
        recordSwallowedError({
          screen: "supplier_map",
          surface: "map_renderer",
          event: "map_listing_marker_remove_failed",
          error,
          kind: "cleanup_only",
          sourceKind: "leaflet:web",
          errorStage: "remove_listing_marker",
        });
      }
    });
    markersRef.current = {};

    const hasSpider = Array.isArray(spiderPoints) && spiderPoints.length > 0;
    const baseListings = listings
      .filter((listing) => listing.lat != null && listing.lng != null)
      .filter((listing) => !(hasSpider && hideClusterId && listing.id === hideClusterId));
    const allToDraw = [...(hasSpider ? spiderPoints : []), ...baseListings];

    allToDraw.forEach((item) => {
      if (item.lat == null || item.lng == null) return;

      const isSelected = selectedId === item.id;
      const background = item.side === "demand" ? UI.demand : getKindColor(item.kind);
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
          background:${background};
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
        safeSetSuppress(320);
        onSelect(item.id);
      });

      markersRef.current[String(item.id)] = marker;
    });
  }, [hideClusterId, listings, onSelect, selectedId, spiderPoints]);

  return <div ref={hostRef} style={FILL_STYLE} />;
}
