export const FLUSHING_DISINFECTION_CATALOG_ID =
  "canonical-work:expanded:flushing_disinfection";

function promptDecimal(value: string | undefined): string | undefined {
  return value?.replace(",", ".");
}

export function parseFlushingDisinfectionOrdinaryPromptR1(
  prompt: string,
): Record<string, string> {
  const normalized = prompt.normalize("NFKC").replace(/\u00a0/gu, " ");
  const identifier = "([A-Z0-9](?:[A-Z0-9._/-]*[A-Z0-9])?)";
  const entries: Record<string, string | undefined> = {
    fld_pipeline_length_m: promptDecimal(
      /(?:длин\p{L}*|протяж[её]нност\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*м/iu.exec(normalized)?.[1]
      ?? /(\d+(?:[,.]\d+)?)\s*м\s+трубопровод/iu.exec(normalized)?.[1],
    ),
    fld_pipeline_internal_diameter_mm: promptDecimal(
      /внутренн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu.exec(normalized)?.[1],
    ),
    fld_pipeline_designation: new RegExp(
      `трубопровод\\p{L}*\\s+${identifier}\\s+(?:длин|протяж)`, "iu",
    ).exec(normalized)?.[1],
    fld_isolated_section_count: /(\d+)\s+изолированн\p{L}*\s+участ/iu.exec(normalized)?.[1],
    fld_disinfectant_technology: /гипохлорит\p{L}*\s+натри\p{L}*/iu.test(normalized)
      ? "SODIUM_HYPOCHLORITE" : undefined,
    fld_target_active_chlorine_mg_l: promptDecimal(
      /активн\p{L}*\s+хлор\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu
        .exec(normalized)?.[1],
    ),
    fld_solution_concentration_percent: promptDecimal(
      /(?:раствор\p{L}*\s+)?(?:концентрац\p{L}*|крепост\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*%/iu
        .exec(normalized)?.[1],
    ),
    fld_contact_time_hour: promptDecimal(
      /(?:контакт\p{L}*|выдержк\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*(?:ч|час)/iu
        .exec(normalized)?.[1],
    ),
  };
  return Object.fromEntries(
    Object.entries(entries).filter((entry): entry is [string, string] => entry[1] != null),
  );
}
