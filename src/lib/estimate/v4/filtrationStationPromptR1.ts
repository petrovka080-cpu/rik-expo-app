export const FILTRATION_STATION_CATALOG_ID =
  "canonical-work:expanded:filtration_station";

function promptDecimal(value: string | undefined): string | undefined {
  return value?.replace(",", ".");
}

/**
 * Extracts only facts actually stated by the customer. It never invents the
 * selected filter package or geometry from capacity; unresolved primary facts
 * are collected by the canonical parameter session before compilation.
 */
export function parseFiltrationStationOrdinaryPromptR1(
  prompt: string,
): Record<string, string> {
  const normalized = prompt.normalize("NFKC").replace(/\u00a0/gu, " ");
  const dimensions = /(?:внутренн\p{L}*\s+размер\p{L}*|ячейк\p{L}*[^.;]{0,24}размер\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu
    .exec(normalized);
  const identifier = "([A-Z0-9](?:[A-Z0-9._/-]*[A-Z0-9])?)";
  const explicitCount = /(?:строительств\p{L}*\s+)?(\d+)\s+фильтровальн\p{L}*\s+станц/iu
    .exec(normalized)?.[1];
  const singularStation = /фильтровальн\p{L}*\s+станци(?:ю|и|я)(?!\p{L})/iu.test(normalized);
  const entries: Record<string, string | undefined> = {
    flt_station_count: explicitCount ?? (singularStation ? "1" : undefined),
    flt_station_designation: new RegExp(
      `станц\\p{L}*\\s+${identifier}\\s+производительн`, "iu",
    ).exec(normalized)?.[1],
    flt_design_capacity_m3_day: promptDecimal(
      /производительн\p{L}*\s+(\d+(?:[,.]\d+)?)\s*(?:м3|м³|куб\.?\s*м)\s*(?:\/|\s+в)?\s*сут/iu
        .exec(normalized)?.[1],
    ),
    flt_filter_cell_count: /(?::|\b)(\d+)\s+фильтровальн\p{L}*\s+ячейк/iu
      .exec(normalized)?.[1],
    flt_filter_internal_length_m: promptDecimal(dimensions?.[1]),
    flt_filter_internal_width_m: promptDecimal(dimensions?.[2]),
    flt_filter_media_designation: new RegExp(
      `загрузк\\p{L}*\\s+${identifier}\\s+глубин`, "iu",
    ).exec(normalized)?.[1],
    flt_filter_media_depth_m: promptDecimal(
      /глубин\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м/iu.exec(normalized)?.[1],
    ),
    flt_underdrain_designation: new RegExp(
      `дренаж\\p{L}*\\s+${identifier}(?:\\s*[;,.]|$)`, "iu",
    ).exec(normalized)?.[1],
    flt_backwash_package_designation: new RegExp(
      `промывочн\\p{L}*\\s+пакет\\p{L}*\\s+${identifier}(?:\\s*[;,.]|$)`, "iu",
    ).exec(normalized)?.[1],
  };
  return Object.fromEntries(
    Object.entries(entries).filter((entry): entry is [string, string] => entry[1] != null),
  );
}

