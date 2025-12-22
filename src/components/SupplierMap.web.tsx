// src/components/SupplierMap.web.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
// import "leaflet/dist/leaflet.css"; // ❌ ломает Expo Web (url(images/...))

import "leaflet.markercluster";
import { supabase } from "../lib/supabaseClient";

type ListingItemJson = {
  rik_code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: number | null;
  city?: string | null;
  kind?: "material" | "service" | "rent" | null;
};

type MarketListing = {
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  kind: string | null;
  items_json: ListingItemJson[] | null;
side?: "offer" | "demand" | null;
};

const defaultCenter: [number, number] = [42.8746, 74.5698]; // Бишкек

type MarkerEntry = {
  marker: any;
  item: MarketListing;
};

// Цвет по типу объявления
const getKindColor = (
  kind?: "material" | "service" | "rent" | null
): string => {
  switch (kind) {
    case "material":
      return "#22C55E"; // зелёный
    case "service":
      return "#0EA5E9"; // голубой
    case "rent":
      return "#8B5CF6"; // фиолетовый
    default:
      return "#7C3AED"; // fallback
  }
};

export default function SupplierMapWeb() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
const [query, setQuery] = useState("");
const [block, setBlock] = useState<"all" | "offer" | "demand">("all");
const [offerDemand, setOfferDemand] = useState<MarketListing | null>(null);
const [offerPrice, setOfferPrice] = useState("");
const [offerDays, setOfferDays] = useState("");
const [offerComment, setOfferComment] = useState("");

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const markersIndexRef = useRef<Record<string, MarkerEntry>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  // какой маркер сейчас подсвечен реально (для setIcon)
  const highlightedIdRef = useRef<string | null>(null);

  // состояние свайпа нижней панели
  const [sheetHeight, setSheetHeight] = useState(0.35);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // ===== 1. Загружаем объявления =====
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("market_listings")
.select("id,title,price,city,lat,lng,kind,items_json,side")
        .eq("status", "active")
        .limit(200);

      if (error) {
        console.warn("supplierMap WEB load error:", error.message);
        return;
      }
      setListings((data || []) as MarketListing[]);
    };

    load();
  }, []);

  // ===== 2. Применяем фильтры (цена / город / тип) =====
  const filteredListings = useMemo(() => {
    const min = minPrice.trim() ? Number(minPrice.trim()) : null;
    const max = maxPrice.trim() ? Number(maxPrice.trim()) : null;
    const city = cityFilter.trim().toLowerCase();
  const q = query.trim().toLowerCase();

        return listings.filter((l) => {
// === фильтр Предложения / Спрос ===
if (block !== "all") {
  if ((l.side || "offer") !== block) return false;
}

      if (min != null && l.price != null && l.price < min) return false;
      if (max != null && l.price != null && l.price > max) return false;
      if (city && l.city && !l.city.toLowerCase().includes(city)) return false;

      // === ПОИСК по тексту (заголовок + позиции) ===
      if (q) {
        const inTitle =
          l.title && l.title.toLowerCase().includes(q);

        const inItems =
          Array.isArray(l.items_json) &&
          l.items_json.some((it) => {
            const name = (it.name || "").toString().toLowerCase();
            const code = (it.rik_code || "").toString().toLowerCase();
            return (
              (name && name.includes(q)) ||
              (code && code.includes(q))
            );
          });

        if (!inTitle && !inItems) return false;
      }

      if (kindFilter !== "all") {
        if (l.kind === kindFilter) return true;

        if (Array.isArray(l.items_json) && l.items_json.length > 0) {
          const hasKind = l.items_json.some(
            (it) => it.kind === kindFilter
          );
          if (!hasKind) return false;
        } else {
          if (l.kind !== kindFilter) return false;
        }
      }

      return true;
    });

   }, [listings, minPrice, maxPrice, cityFilter, kindFilter, query]);

  // ===== 3. Инициализация карты и кластера =====
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const map = L.map(mapDivRef.current).setView(defaultCenter, 12);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // @ts-ignore
    const clusterGroup = L.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 17,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const html = `
          <div style="
            padding:4px 10px;
            border-radius:999px;
            background:#4B5563;
            color:white;
            font-weight:700;
            font-size:12px;
            border:2px solid #1F2937;
            box-shadow:0 4px 10px rgba(0,0,0,0.35);
            white-space:nowrap;
          ">
            ${count} объявл.
          </div>
        `;
        return L.divIcon({
          html,
          className: "",
          iconSize: [110, 32],
          iconAnchor: [55, 16],
        });
      },
    });

    clusterGroup.addTo(map);

    clusterGroupRef.current = clusterGroup;
    mapRef.current = map;

    // Геолокация пользователя (по-взрослому)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 13);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    // отключаем дефолтные PNG-иконки leaflet
    // @ts-ignore
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "",
      iconUrl: "",
      shadowUrl: "",
    });

    clusterGroup.on("clusterclick", () => {
      highlightedIdRef.current = null;
      setSelectedId(null);
    });
  }, []);

  // ===== helper: ценник для одного объявления =====
  const createPriceIcon = (item: MarketListing, isSelected: boolean) => {
    const isDemand = item.side === "demand";

    let effectivePrice: number | null = item.price;

    const items = Array.isArray(item.items_json)
      ? (item.items_json as ListingItemJson[])
      : [];

    const activeKind =
      kindFilter === "all"
        ? null
        : (kindFilter as "material" | "service" | "rent");

    if (activeKind && items.length > 0) {
      const found = items.find(
        (pos) => pos.kind === activeKind && typeof pos.price === "number"
      );
      if (found && typeof found.price === "number") {
        effectivePrice = found.price;
      }
    } else if (!activeKind && effectivePrice == null && items.length > 0) {
      const foundAny = items.find(
        (pos) => typeof pos.price === "number"
      );
      if (foundAny && typeof foundAny.price === "number") {
        effectivePrice = foundAny.price;
      }
    }

   const priceText = isDemand
  ? "НУЖНО"
  : effectivePrice != null
    ? `${effectivePrice.toLocaleString("ru-RU")} KGS`
    : "Цена по запросу";


    // === цвет по типу объявления ===
    let iconKind: "material" | "service" | "rent" | null = null;

    if (activeKind) {
      iconKind = activeKind;
    } else if (
      item.kind === "material" ||
      item.kind === "service" ||
      item.kind === "rent"
    ) {
      iconKind = item.kind as "material" | "service" | "rent";
    } else if (items.length > 0) {
      const firstWithKind = items.find(
        (p) =>
          p.kind === "material" ||
          p.kind === "service" ||
          p.kind === "rent"
      );
      if (
        firstWithKind &&
        (firstWithKind.kind === "material" ||
          firstWithKind.kind === "service" ||
          firstWithKind.kind === "rent")
      ) {
        iconKind = firstWithKind.kind;
      }
    }

    const baseBg = isDemand ? "#EF4444" : getKindColor(iconKind);

    const baseBorder = "#1F2937";

    // подсветка выбранного маркера
    const bg = baseBg;
    const borderColor = isSelected ? "#F9FAFB" : baseBorder;
    const extraGlow = isSelected
      ? "0 0 0 2px rgba(248,250,252,0.75)"
      : "none";
    const scale = isSelected ? 1.08 : 1.0;

    const html = `
      <div style="
        padding:4px 10px;
        border-radius:999px;
        background:${bg};
        color:white;
        font-weight:700;
        font-size:12px;
        border:2px solid ${borderColor};
        box-shadow:0 4px 10px rgba(0,0,0,0.35), ${extraGlow};
        white-space:nowrap;
        transform:scale(${scale});
      ">
        ${priceText}
      </div>
    `;

    return L.divIcon({
      html,
      className: "",
      iconSize: [100, 32],
      iconAnchor: [50, 16],
    });
  };

  // ===== helper: подсветка маркера (без эффекта) =====
  const highlightMarker = (id: string | null) => {
    // снять подсветку с прошлого
    if (highlightedIdRef.current) {
      const prevEntry = markersIndexRef.current[highlightedIdRef.current];
      if (prevEntry) {
        prevEntry.marker.setIcon(
          createPriceIcon(prevEntry.item, false)
        );
      }
    }

    highlightedIdRef.current = id;

    if (id) {
      const entry = markersIndexRef.current[id];
      if (entry) {
        entry.marker.setIcon(createPriceIcon(entry.item, true));
      }
    }

    setSelectedId(id);
  };

  // ===== 4. Строим маркеры и добавляем в кластер (без зависимостей от selectedId) =====
  useEffect(() => {
    if (!clusterGroupRef.current || !mapRef.current) return;

    const clusterGroup = clusterGroupRef.current as L.MarkerClusterGroup;
    const map = mapRef.current as L.Map;

    clusterGroup.clearLayers();
    markersIndexRef.current = {};
    highlightedIdRef.current = null;
    setSelectedId(null);

    // группируем объявления по координатам
    const groups = new Map<string, MarketListing[]>();

    filteredListings
      .filter((l) => l.lat != null && l.lng != null)
      .forEach((item) => {
        const lat = item.lat as number;
        const lng = item.lng as number;
        const key = `${lat.toFixed(5)}:${lng.toFixed(5)}`;

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(item);
      });

    const offsetDistance = 0.00015; // ~15 м

    groups.forEach((group) => {
      group.forEach((item, index) => {
        const baseLat = item.lat as number;
        const baseLng = item.lng as number;

        let lat = baseLat;
        let lng = baseLng;

        if (group.length > 1) {
          const angle = (2 * Math.PI * index) / group.length;
          const dLat = offsetDistance * Math.cos(angle);
          const dLng = offsetDistance * Math.sin(angle);
          lat = baseLat + dLat;
          lng = baseLng + dLng;
        }

        const latlng = L.latLng(lat, lng);

        // создаём маркер без подсветки
        const marker = L.marker(latlng, {
          icon: createPriceIcon(item, false),
        });

        // ===== адаптивный попап под текущий фильтр =====
        const items = Array.isArray(item.items_json)
          ? (item.items_json as ListingItemJson[])
          : [];

        const activeKind =
          kindFilter === "all"
            ? null
            : (kindFilter as "material" | "service" | "rent");

        const visibleItems =
          activeKind && items.length > 0
            ? items.filter((pos) => pos.kind === activeKind)
            : items;

        let popupTitle = item.title;
        let popupPrice = item.price;

        if (activeKind && visibleItems[0]) {
          popupTitle = visibleItems[0].name || popupTitle;
          if (visibleItems[0].price != null) {
            popupPrice = visibleItems[0].price as number;
          }
        }

        marker.bindPopup(
          `
          <div style="min-width:160px">
            <div style="font-weight:700;margin-bottom:4px;font-size:14px">
              ${popupTitle}
            </div>
            <div style="color:#0EA5E9;font-weight:700;font-size:14px">
              ${
                popupPrice != null
                  ? popupPrice.toLocaleString("ru-RU") + " KGS"
                  : "Цена по запросу"
              }
            </div>
            <div style="margin-top:4px;font-size:12px;color:#6B7280">
              ${item.city || "Город не указан"}
            </div>
          </div>
          `
        );

        marker.on("click", () => {
          highlightMarker(item.id);   // подсветили
          marker.openPopup();         // открыли попап сразу
          const el = document.getElementById(`listing-${item.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });

        clusterGroup.addLayer(marker);
        markersIndexRef.current[item.id] = { marker, item };
      });
    });

    map.invalidateSize();
  }, [filteredListings, kindFilter]); // БЕЗ selectedId!

  // ===== 5. Клик по карточке снизу =====
  const handleSelectFromList = (item: MarketListing) => {
    const entry = markersIndexRef.current[item.id];
    if (!entry || !mapRef.current) return;

    const map = mapRef.current as L.Map;

    highlightMarker(item.id);

    const markerLatLng =
      entry.marker.getLatLng?.() ??
      L.latLng(item.lat as number, item.lng as number);

    map.setView(
      markerLatLng,
      Math.max(map.getZoom(), 15),
      { animate: true }
    );
    entry.marker.openPopup();

    const el = document.getElementById(`listing-${item.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // ===== 6. Свайп нижней панели (bottom sheet) =====
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaY = e.clientY - dragStartY.current;
      const newHeightRaw =
        dragStartHeight.current - deltaY / rect.height;
      const clamped = Math.max(0.2, Math.min(0.8, newHeightRaw));
      setSheetHeight(clamped);
    };

    const onUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  // ===== 7. UI =====
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        backgroundColor: "#020617",
        color: "#E5E7EB",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Хедер + фильтры */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1F2937" as any }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Карта объявлений</h2>
        <p style={{ margin: "4px 0 8px", fontSize: 13, color: "#9CA3AF" }}>
          Кликайте по ценникам на карте или по карточкам в списке.
        </p>
<div style={{ display: "flex", gap: 6, marginTop: 6 }}>
  {[
    ["all", "Все"],
    ["offer", "Предложения"],
    ["demand", "Спрос"],
  ].map(([k, t]) => (
    <button
      key={k}
      onClick={() => setBlock(k as any)}
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid #1F2937",
        background: block === k ? "#22C55E" : "#020617",
        color: block === k ? "#000" : "#E5E7EB",
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {t}
    </button>
  ))}
</div>

                <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 4,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>
              Мин. цена
            </div>
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="от"
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #1F2937",
                background: "#020617",
                color: "#E5E7EB",
                fontSize: 12,
                width: 90,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>
              Макс. цена
            </div>
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="до"
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #1F2937",
                background: "#020617",
                color: "#E5E7EB",
                fontSize: 12,
                width: 90,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>
              Город
            </div>
            <input
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Бишкек…"
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #1F2937",
                background: "#020617",
                color: "#E5E7EB",
                fontSize: 12,
                width: 150,
              }}
            />
          </div>

          {/* ПОИСК по товарам / услугам */}
          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>
              Что ищем
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="кирпич, экскаватор, бетон…"
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #1F2937",
                background: "#020617",
                color: "#E5E7EB",
                fontSize: 12,
                width: 200,
              }}
            />
          </div>
        </div>

        {/* фильтр по виду объявления */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {[
            { code: "all", label: "Все" },
            { code: "material", label: "Материалы" },
            { code: "service", label: "Услуги" },
            { code: "rent", label: "Аренда" },
          ].map((k) => {
            const active = kindFilter === k.code;
            return (
              <button
                key={k.code}
                onClick={() => setKindFilter(k.code)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid #1F2937",
                  background: active ? "#0EA5E9" : "#020617",
                  color: active ? "#0B1120" : "#E5E7EB",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Карта + свайпующий список */}
      <div ref={containerRef} style={{ flex: 1, position: "relative" }}>
        {/* Карта */}
        <div
          ref={mapDivRef}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: `${sheetHeight * 100}%`,
          }}
        />

        {/* Нижний блок (bottom sheet) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: `${sheetHeight * 100}%`,
            backgroundColor: "#020617",
            borderTop: "1px solid #1F2937",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ручка для свайпа */}
          <div
            style={{
              height: 16,
              alignItems: "center",
              justifyContent: "center",
              display: "flex",
            }}
            onMouseDown={(e) => {
              setIsDragging(true);
              dragStartY.current = e.clientY;
              dragStartHeight.current = sheetHeight;
            }}
          >
            <div
              style={{
                width: 42,
                height: 4,
                borderRadius: 999,
                backgroundColor: "#4B5563",
              }}
            />
          </div>

          {/* список объявлений */}
          <div
            style={{
              flex: 1,
              padding: "0 16px 12px",
              overflowY: "auto",
            }}
          >
            {filteredListings.map((item) => {
              const isSelected = selectedId === item.id;
              const items = Array.isArray(item.items_json)
                ? (item.items_json as ListingItemJson[])
                : [];

              const kindLabel = (kind?: string | null) =>
                kind === "material"
                  ? "Материал"
                  : kind === "service"
                  ? "Услуга"
                  : kind === "rent"
                  ? "Аренда"
                  : "";

              const activeKind =
                kindFilter === "all"
                  ? null
                  : (kindFilter as "material" | "service" | "rent");

              const visibleItems =
                activeKind && items.length > 0
                  ? items.filter((pos) => pos.kind === activeKind)
                  : items;

              let mainTitle = item.title;
              if (activeKind && visibleItems[0]?.name) {
                mainTitle = visibleItems[0].name as string;
              }

              let mainPrice: number | null = item.price;
              if (
                activeKind &&
                visibleItems[0]?.price != null &&
                visibleItems[0].price !== 0
              ) {
                mainPrice = visibleItems[0].price as number;
              }

              return (
                <div
                  id={`listing-${item.id}`}
                  key={item.id}
                  onClick={() => handleSelectFromList(item)}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid #1F2937",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#020617" : "transparent",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 4,
                      color: isSelected ? "#FFFFFF" : "#E5E7EB",
                    }}
                  >
                    {mainTitle}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "#0EA5E9",
                      fontWeight: 700,
                    }}
                  >
                    {mainPrice != null
                      ? `${mainPrice.toLocaleString("ru-RU")} KGS`
                      : "Цена по запросу"}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#9CA3AF",
                      marginTop: 2,
                    }}
                  >
                    {item.city || "Город не указан"}
                  </div>

                  {visibleItems.length > 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        paddingTop: 4,
                        borderTop: "1px dashed #1F2937",
                      }}
                    >
                      {visibleItems.slice(0, 3).map((pos, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: 12,
                            color: "#E5E7EB",
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ color: "#9CA3AF" }}>
                            {kindLabel(pos.kind)}{" "}
                            {pos.kind ? "· " : ""}
                          </span>
                          {pos.name || "Позиция"}
                          {pos.qty != null && pos.qty !== 0 && (
                            <>
                              {" · "}Кол-во: {pos.qty}
                              {pos.uom ? ` ${pos.uom}` : ""}
                            </>
                          )}
                          {pos.price != null && pos.price !== 0 && (
                            <>
                              {" · "}Цена: {pos.price} KGS
                            </>
                          )}
{item.side === "demand" && (
  <button
    style={{
      marginTop: 8,
      padding: "6px 10px",
      borderRadius: 6,
      border: "1px solid #1F2937",
      background: "#0EA5E9",
      color: "#020617",
      fontWeight: 700,
      cursor: "pointer",
    }}
    onClick={() => setOfferDemand(item)}
  >
    Отправить предложение
  </button>
)}

                        </div>
                      ))}
                      {visibleItems.length > 3 && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            marginTop: 2,
                          }}
                        >
                          + ещё {visibleItems.length - 3} позиций
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
         {/* ===== MODAL: Оставить оффер ===== */}
    {offerDemand && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div style={{ background: "#020617", padding: 16, width: 320 }}>
          <h3 style={{ color: "#fff" }}>Коммерческое предложение</h3>

          <input
            placeholder="Цена"
            value={offerPrice}
            onChange={(e) => setOfferPrice(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />

          <input
            placeholder="Срок поставки"
            value={offerDays}
            onChange={(e) => setOfferDays(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />

          <textarea
            placeholder="Комментарий / условие"
            value={offerComment}
            onChange={(e) => setOfferComment(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />

          <button
            onClick={async () => {
              const user = (await supabase.auth.getUser()).data.user;
              if (!user) return;

              await supabase.from("demand_offers").insert({
                demand_id: offerDemand.id,
                supplier_id: user.id,
                price: Number(offerPrice),
                delivery_days: Number(offerDays) || null,
                comment: offerComment || null,
              });

              setOfferDemand(null);
              setOfferPrice("");
              setOfferDays("");
              setOfferComment("");
            }}
          >
            Отправить
          </button>

          <button onClick={() => setOfferDemand(null)}>Отмена</button>
        </div>
      </div>
    )}
  </div>
);
}

   