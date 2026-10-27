export const PRESSURE_PIPELINE_CATALOG_ID =
  "canonical-work:expanded:pressure_pipeline";

function decimal(text: string, pattern: RegExp): string | undefined {
  return pattern.exec(text)?.[1]?.replace(",", ".");
}

export function parsePressurePipelineOrdinaryPromptR1(
  prompt: string,
): Readonly<Record<string, string>> {
  const normalized = prompt.normalize("NFKC");
  const designation = /\b(PE\d{2,3}(?:-RC)?-SDR\d+(?:[.,]\d+)?-OD\d+(?:-PN\d+)?)\b/iu
    .exec(normalized)?.[1];
  return Object.freeze(Object.fromEntries(Object.entries({
    ppl_route_length_m: decimal(normalized, /(\d+(?:[,.]\d+)?)\s*м(?:\s|$|[,;.])/iu),
    ppl_pipe_designation: designation,
    ppl_pipe_outside_diameter_mm: decimal(normalized, /(?:наружн\p{L}*\s+диаметр|OD)\s*(\d+(?:[,.]\d+)?)\s*(?:мм)?/iu),
    ppl_average_trench_depth_m: decimal(normalized, /(?:глубин\p{L}*\s+транше\p{L}*|средн\p{L}*\s+глубин\p{L}*)\s*(\d+(?:[,.]\d+)?)\s*м/iu),
    ppl_connection_node_count: /(\d+)\s+(?:проектн\p{L}*\s+)?узл\p{L}*\s+подключ/iu.exec(normalized)?.[1],
    ppl_construction_section_count: /(\d+)\s+(?:самостоятельн\p{L}*\s+)?строительн\p{L}*\s+участ/iu.exec(normalized)?.[1],
    ppl_installation_technology: /(?:стыков\p{L}*\s+сварк|HDPE_BUTT_FUSION_OPEN_TRENCH)/iu.test(normalized)
      ? "HDPE_BUTT_FUSION_OPEN_TRENCH" : undefined,
  }).filter((entry): entry is [string, string] => entry[1] != null)));
}

