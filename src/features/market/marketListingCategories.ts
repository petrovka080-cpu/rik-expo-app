import type { MarketHomeCategoryKey, MarketKind } from "./marketHome.types";

export type MarketListingCategoryOption = {
  kind: Extract<MarketKind, "material" | "work" | "service" | "delivery" | "rent">;
  category: Extract<MarketHomeCategoryKey, "materials" | "works" | "services" | "delivery" | "tools">;
  label: string;
  singularLabel: string;
};

export const MARKET_LISTING_CATEGORY_OPTIONS: readonly MarketListingCategoryOption[] = [
  {
    kind: "material",
    category: "materials",
    label: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
    singularLabel: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  },
  {
    kind: "work",
    category: "works",
    label: "\u0420\u0430\u0431\u043e\u0442\u044b",
    singularLabel: "\u0420\u0430\u0431\u043e\u0442\u0430",
  },
  {
    kind: "service",
    category: "services",
    label: "\u0423\u0441\u043b\u0443\u0433\u0438",
    singularLabel: "\u0423\u0441\u043b\u0443\u0433\u0430",
  },
  {
    kind: "delivery",
    category: "delivery",
    label: "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430",
    singularLabel: "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430",
  },
  {
    kind: "rent",
    category: "tools",
    label: "\u0410\u0440\u0435\u043d\u0434\u0430",
    singularLabel: "\u0410\u0440\u0435\u043d\u0434\u0430",
  },
] as const;

export function getMarketListingCategoryByKind(kind: string | null | undefined) {
  return MARKET_LISTING_CATEGORY_OPTIONS.find((item) => item.kind === kind) ?? null;
}

export function getMarketListingCategoryByCategory(category: MarketHomeCategoryKey | "all") {
  if (category === "all") return null;
  return MARKET_LISTING_CATEGORY_OPTIONS.find((item) => item.category === category) ?? null;
}
