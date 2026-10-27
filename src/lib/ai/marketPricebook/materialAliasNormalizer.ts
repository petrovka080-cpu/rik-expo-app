import {
  MARKET_MATERIAL_MASTER_CATALOG,
  getMarketMaterialMasterItem,
} from "./materialMasterCatalog";
import type { MarketMaterialAlias, MarketMaterialMasterItem } from "./marketPricebookTypes";

export function normalizeMaterialAlias(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAliases(): MarketMaterialAlias[] {
  const aliases = new Map<string, MarketMaterialAlias>();
  for (const item of MARKET_MATERIAL_MASTER_CATALOG) {
    for (const alias of item.aliases_ru) {
      const normalized = normalizeMaterialAlias(alias);
      if (!normalized) continue;
      aliases.set(`${item.material_key}:${normalized}`, {
        alias_ru: alias,
        material_key: item.material_key,
        normalized_alias: normalized,
      });
    }
  }
  return [...aliases.values()].sort((left, right) =>
    `${left.material_key}:${left.normalized_alias}`.localeCompare(`${right.material_key}:${right.normalized_alias}`),
  );
}

export const MARKET_MATERIAL_ALIASES: readonly MarketMaterialAlias[] = Object.freeze(buildAliases());

const ALIAS_TO_MATERIAL_KEY: ReadonlyMap<string, string> = new Map(
  MARKET_MATERIAL_ALIASES.map((alias) => [alias.normalized_alias, alias.material_key]),
);

export function resolveMarketMaterialAlias(value: string): MarketMaterialMasterItem | null {
  const materialKey = ALIAS_TO_MATERIAL_KEY.get(normalizeMaterialAlias(value));
  return materialKey ? getMarketMaterialMasterItem(materialKey) : null;
}
