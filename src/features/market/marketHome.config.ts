import type { ImageSourcePropType } from "react-native";

import type {
  MarketHomeBanner,
  MarketHomeCategoryCard,
  MarketHomeCategoryKey,
  MarketKind,
  MarketMapKind,
} from "./marketHome.types";

const materialsImage = require("../../../assets/market-categories/materials_3d.jpg");
const worksImage = require("../../../assets/market-categories/works_3d.jpg");
const servicesImage = require("../../../assets/market-categories/services_3d.jpg");
const deliveryImage = require("../../../assets/market-categories/delivery_3d.jpg");
const transportImage = require("../../../assets/market-categories/transport_3d.jpg");
const toolsImage = require("../../../assets/market-categories/tools_3d.jpg");
const miscImage = require("../../../assets/market-categories/misc_3d.jpg");

export const MARKET_HOME_COLORS = {
  background: "#F4F6FB",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF2FF",
  text: "#1E293B",
  textSoft: "#64748B",
  border: "#E2E8F0",
  accent: "#3B82F6",
  accentStrong: "#1D4ED8",
  accentSoft: "#DBEAFE",
  orange: "#FF6B39",
  orangeDeep: "#F04D16",
  emerald: "#16A34A",
  emeraldSoft: "#DCFCE7",
  shadow: "rgba(15, 23, 42, 0.08)",
  shadowSoft: "rgba(15, 23, 42, 0.04)",
  heroOverlay: "rgba(15, 23, 42, 0.48)",
  pill: "#F8FAFC",
} as const;

export const MARKET_HOME_BANNERS: MarketHomeBanner[] = [
  {
    id: "hero-materials",
    imageSource: materialsImage,
    title: "Все для стройки в один клик",
    description: "От фундамента до крыши. Самый большой выбор материалов и услуг в Кыргызстане.",
    ctaLabel: "Смотреть все",
    action: "scroll_feed",
  },
  {
    id: "hero-map",
    imageSource: transportImage,
    title: "Спрос и предложения на карте",
    description: "Откройте ближайшие заявки и активные предложения прямо на карте поставщиков.",
    ctaLabel: "Открыть карту",
    action: "open_map",
  },
  {
    id: "hero-offers",
    imageSource: servicesImage,
    title: "Готовые предложения рядом",
    description: "Быстро переходите к активным объявлениям поставщиков и услуг в вашем городе.",
    ctaLabel: "К предложениям",
    action: "open_offer_map",
  },
];

export const MARKET_HOME_CATEGORIES: MarketHomeCategoryCard[] = [
  { key: "materials", label: "Материалы", imageSource: materialsImage, accent: "#E0E7FF" },
  { key: "works", label: "Работы", imageSource: worksImage, accent: "#FCE7F3" },
  { key: "services", label: "Услуги", imageSource: servicesImage, accent: "#DCFCE7" },
  { key: "delivery", label: "Доставка", imageSource: deliveryImage, accent: "#FEF3C7" },
  { key: "transport", label: "Транспорт", imageSource: transportImage, accent: "#DBEAFE" },
  { key: "tools", label: "Инструменты", imageSource: toolsImage, accent: "#F3E8FF" },
  { key: "misc", label: "Разное", imageSource: miscImage, accent: "#E2E8F0" },
];

const CATEGORY_IMAGES: Record<MarketHomeCategoryKey, ImageSourcePropType> = {
  materials: materialsImage,
  works: worksImage,
  services: servicesImage,
  delivery: deliveryImage,
  transport: transportImage,
  tools: toolsImage,
  misc: miscImage,
};

const KIND_IMAGES: Record<string, ImageSourcePropType> = {
  material: materialsImage,
  work: worksImage,
  service: servicesImage,
  rent: toolsImage,
};

const CATEGORY_KIND_MAP: Partial<Record<MarketHomeCategoryKey, MarketMapKind>> = {
  materials: "material",
  works: "work",
  services: "service",
  delivery: "service",
  transport: "service",
  tools: "material",
};

const CATEGORY_PRESENTATION_KEYWORDS: Partial<Record<MarketHomeCategoryKey, string[]>> = {
  delivery: ["достав", "логист", "курьер", "вывоз", "cargo", "delivery"],
  transport: ["транспорт", "груз", "манипул", "самосвал", "эвакуатор", "погрузчик"],
  tools: ["инстру", "перфорат", "болгар", "дрель", "генератор", "tool", "оборуд"],
};

export function getMappedKindForCategory(
  category: MarketHomeCategoryKey | "all",
): MarketMapKind | undefined {
  if (category === "all") return undefined;
  return CATEGORY_KIND_MAP[category];
}

export function getCategoryPresentationKeywords(category: MarketHomeCategoryKey): string[] {
  return CATEGORY_PRESENTATION_KEYWORDS[category] ?? [];
}

export function categoryUsesDedicatedBucket(category: MarketHomeCategoryKey): boolean {
  return category === "delivery" || category === "transport" || category === "tools" || category === "misc";
}

export function getCategoryLabel(category: MarketHomeCategoryKey | "all"): string {
  if (category === "all") return "Все категории";
  return MARKET_HOME_CATEGORIES.find((item) => item.key === category)?.label ?? "Категория";
}

export function getFallbackImageForCategory(category: MarketHomeCategoryKey): ImageSourcePropType {
  return CATEGORY_IMAGES[category];
}

export function getFallbackImageForListingKind(kind: string | null | undefined): ImageSourcePropType {
  return KIND_IMAGES[String(kind || "").trim().toLowerCase()] ?? miscImage;
}

export function getFallbackImageForPresentation(
  category: MarketHomeCategoryKey | null | undefined,
  kind: string | null | undefined,
): ImageSourcePropType {
  if (category) return getFallbackImageForCategory(category);
  return getFallbackImageForListingKind(kind);
}

export function getKindLabel(kind: string | null | undefined): string {
  switch (kind) {
    case "material":
      return "Материалы";
    case "work":
      return "Работы";
    case "service":
      return "Услуги";
    case "rent":
      return "Аренда";
    default:
      return "Разное";
  }
}

export function getSideLabel(side: string | null | undefined): string {
  return side === "demand" ? "Спрос" : "Предложение";
}

export function getStatusLabel(status: string | null | undefined): string {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "Активно";
    case "draft":
      return "Черновик";
    case "archived":
      return "Архив";
    default:
      return "Актуально";
  }
}

export function isSupportedMapKind(value: string | null | undefined): value is MarketMapKind {
  return value === "material" || value === "work" || value === "service";
}

export function normalizeMarketKind(value: string | null | undefined): MarketKind | null {
  if (value === "material" || value === "work" || value === "service" || value === "rent") {
    return value;
  }
  return null;
}
