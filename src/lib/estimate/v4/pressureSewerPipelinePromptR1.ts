export const PRESSURE_SEWER_PIPELINE_CATALOG_ID =
  "canonical-work:expanded:pressure_sewer_pipeline";

function decimal(text: string, pattern: RegExp): string | undefined {
  return pattern.exec(text)?.[1]?.replace(",", ".");
}

export function parsePressureSewerPipelineOrdinaryPromptR1(
  prompt: string,
): Readonly<Record<string, string>> {
  const normalized = prompt.normalize("NFKC");
  const designation = /\b(PE\d{2,3}(?:-RC)?-SDR\d+(?:[.,]\d+)?-OD\d+(?:-PN\d+)?)\b/iu
    .exec(normalized)?.[1];
  return Object.freeze(Object.fromEntries(Object.entries({
    psp_route_length_m: decimal(
      normalized,
      /(\d+(?:[,.]\d+)?)\s*(?:м(?=\s|$|[,;.])|метр\p{L}*)/iu,
    ),
    psp_pipe_designation: designation,
    psp_pipe_outside_diameter_mm: decimal(
      normalized,
      /(?:наружн\p{L}*\s+диаметр|OD)\s*(\d+(?:[,.]\d+)?)\s*(?:мм)?/iu,
    ),
    psp_average_trench_depth_m: decimal(
      normalized,
      /(?:глубин\p{L}*\s+транше\p{L}*|средн\p{L}*\s+глубин\p{L}*)\s*(\d+(?:[,.]\d+)?)\s*м/iu,
    ),
    psp_fitting_quantity_piece: /(?:фасонн\p{L}*\s+част\p{L}*|фитинг\p{L}*)[^\d]{0,20}(\d+)/iu.exec(normalized)?.[1],
    psp_isolation_valve_quantity_piece: /(?:запорн\p{L}*\s+арматур\p{L}*|задвиж\p{L}*)[^\d]{0,20}(\d+)/iu.exec(normalized)?.[1],
    psp_air_valve_quantity_piece: /(?:воздушн\p{L}*\s+клапан\p{L}*|вантуз\p{L}*)[^\d]{0,20}(\d+)/iu.exec(normalized)?.[1],
    psp_washout_quantity_piece: /промывн\p{L}*\s+узл\p{L}*[^\d]{0,20}(\d+)/iu.exec(normalized)?.[1],
  }).filter((entry): entry is [string, string] => entry[1] != null)));
}

