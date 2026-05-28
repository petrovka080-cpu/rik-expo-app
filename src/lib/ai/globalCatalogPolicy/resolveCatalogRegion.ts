import type { GlobalLocalContext } from "../globalLocalContext";

export function resolveCatalogRegion(context: GlobalLocalContext): string {
  if (!context.countryCode) return "GLOBAL_UNSPECIFIED";
  return [context.countryCode, context.region, context.city]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.replace(/\s+/g, "_").toUpperCase())
    .join(":");
}
