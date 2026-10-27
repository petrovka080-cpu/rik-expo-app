export const CHLORINATION_STATION_CATALOG_ID =
  "canonical-work:expanded:chlorination_station";

function promptDecimal(value: string | undefined): string | undefined {
  return value?.replace(",", ".");
}

/** Extracts only facts explicitly stated by the customer. */
export function parseChlorinationStationOrdinaryPromptR1(
  prompt: string,
): Record<string, string> {
  const normalized = prompt.normalize("NFKC").replace(/\u00a0/gu, " ");
  const identifier = "([A-Z0-9](?:[A-Z0-9._/-]*[A-Z0-9])?)";
  const explicitCount = /(?:строительств\p{L}*\s+)?(\d+)\s+станц\p{L}*\s+хлорирован/iu
    .exec(normalized)?.[1];
  const singularStation = /станц\p{L}*\s+хлорирован/iu.test(normalized);
  const entries: Record<string, string | undefined> = {
    chl_station_count: explicitCount ?? (singularStation ? "1" : undefined),
    chl_station_designation: new RegExp(
      `хлорирован\\p{L}*\\s+${identifier}\\s+производительн`, "iu",
    ).exec(normalized)?.[1],
    chl_design_flow_m3_day: promptDecimal(
      /производительн\p{L}*\s+(\d+(?:[,.]\d+)?)\s*(?:м3|м³|куб\.?\s*м)\s*(?:\/|\s+в)?\s*сут/iu
        .exec(normalized)?.[1],
    ),
    chl_disinfectant_technology: /гипохлорит\p{L}*\s+натри\p{L}*/iu.test(normalized)
      ? "SODIUM_HYPOCHLORITE" : undefined,
    chl_design_dose_mg_l: promptDecimal(
      /(?:расч[её]тн\p{L}*\s+)?доз\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu
        .exec(normalized)?.[1],
    ),
    chl_solution_concentration_percent: promptDecimal(
      /(?:раствор\p{L}*\s+)?(?:концентрац\p{L}*|крепост\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*%/iu
        .exec(normalized)?.[1],
    ),
    chl_dosing_package_designation: new RegExp(
      `дозирующ\\p{L}*\\s+пакет\\p{L}*\\s+${identifier}(?:\\s*[,;.]|$)`, "iu",
    ).exec(normalized)?.[1],
    chl_injection_point_count: /(\d+)\s+точк\p{L}*\s+ввод/iu.exec(normalized)?.[1],
  };
  return Object.fromEntries(
    Object.entries(entries).filter((entry): entry is [string, string] => entry[1] != null),
  );
}

