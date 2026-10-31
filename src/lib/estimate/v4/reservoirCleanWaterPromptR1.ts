export const RESERVOIR_CLEAN_WATER_CATALOG_ID =
  "canonical-work:expanded:reservoir_clean_water";

function decimal(text: string, pattern: RegExp): string | undefined {
  return pattern.exec(text)?.[1]?.replace(",", ".");
}

export function parseReservoirCleanWaterOrdinaryPromptR1(
  prompt: string,
): Readonly<Record<string, string>> {
  const normalized = prompt.normalize("NFKC");
  const dimensions = /(?:внутренн\p{L}*\s+размер\p{L}*|размер\p{L}*\s+в\s+чистоте)(?:\s+кажд\p{L}*)?\s*(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu.exec(normalized);
  return Object.freeze(Object.fromEntries(Object.entries({
    rcw_reservoir_count: /(?:строительств\p{L}*\s+)?(\d+)\s+(?:подземн\p{L}*\s+)?(?:монолитн\p{L}*\s+)?(?:железобетонн\p{L}*\s+|ЖБ\s+)?резервуар/iu.exec(normalized)?.[1],
    rcw_reservoir_designation: /\b(RC-CWR-[A-Z0-9-]+)\b/iu.exec(normalized)?.[1],
    rcw_internal_length_m: dimensions?.[1]?.replace(",", "."),
    rcw_internal_width_m: dimensions?.[2]?.replace(",", "."),
    rcw_operating_water_depth_m: decimal(normalized, /(?:рабоч\p{L}*\s+глубин\p{L}*\s+вод\p{L}*|глубин\p{L}*\s+вод\p{L}*)\s*(\d+(?:[,.]\d+)?)\s*м/iu),
    rcw_cell_count_per_reservoir: /(?:по\s+)?(\d+)\s+(?:переключаем\p{L}*\s+)?секци\p{L}*/iu.exec(normalized)?.[1],
    rcw_structural_system: /(?:монолитн\p{L}*\s+(?:железобетонн\p{L}*|ЖБ)|BURIED_CAST_IN_PLACE_RC)/iu.test(normalized)
      ? "BURIED_CAST_IN_PLACE_RC" : undefined,
  }).filter((entry): entry is [string, string] => entry[1] != null)));
}
