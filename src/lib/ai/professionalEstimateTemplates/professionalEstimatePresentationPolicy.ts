import type {
  ProfessionalEstimateLine,
  ProfessionalEstimateVisibleLine,
} from "./professionalEstimateTypes";

const MOJIBAKE_PATTERN =
  /Р(?:[°±²³´µ¶·¸¹º»¼½¾¿]|[Ѓ‚„…†‡€‰Љ‹ЊЌЋЏђѓєѕљњќћџўЎ])|С(?:[€‚ѓ„…†‡€‰Љ‹ЊЌЋЏђѓєѕљњќћџўЎ])|Гђ|Г‘|Гўв‚¬/;
const INTERNAL_KEY_PATTERN = /[a-z0-9]+_[a-z0-9_]+/i;

export const PROFESSIONAL_EXPANDED_ESTIMATE_REQUIRED_COLUMNS = [
  "в„–",
  "Р Р°Р·РґРµР»",
  "РќР°РёРјРµРЅРѕРІР°РЅРёРµ",
  "РЎРїРµС†РёС„РёРєР°С†РёСЏ / РїРѕСЏСЃРЅРµРЅРёРµ",
  "Р•Рґ.",
  "РљРѕР»-РІРѕ",
  "РќРѕСЂРјР° / С„РѕСЂРјСѓР»Р°",
  "Р—Р°РїР°СЃ %",
  "Р¦РµРЅР°",
  "РЎСѓРјРјР°",
  "РСЃС‚РѕС‡РЅРёРє С†РµРЅС‹ / СЃС‚Р°С‚СѓСЃ",
] as const;

export const PROFESSIONAL_EXPANDED_ESTIMATE_PRESENTATION_POLICY = Object.freeze({
  expanded_estimate_enabled: true,
  compressed_estimate_mode_used: false,
  full_names_appendix_removed: true,
  full_row_names_visible_in_table: true,
  long_names_wrapped_in_table: true,
  section_headers_repeated_on_page_break: true,
  signature_blocks_present: true,
  fake_green_claimed: false,
});

export function professionalExpandedEstimatePresentationPolicy() {
  return PROFESSIONAL_EXPANDED_ESTIMATE_PRESENTATION_POLICY;
}

export function buildProfessionalVisibleRows(
  lines: readonly ProfessionalEstimateLine[],
): ProfessionalEstimateVisibleLine[] {
  return lines.map((line) => ({
    row_kind: line.row_kind,
    row_domain: line.row_domain,
    visible_name_ru: line.visible_name_ru,
    quantity: line.quantity,
    unit: line.unit,
    price_status: line.price.price_status,
    unit_price: line.price.unit_price,
    line_total: line.price.line_total,
    currency: line.price.currency,
  }));
}

export function countInternalKeysVisible(rows: readonly ProfessionalEstimateVisibleLine[]): number {
  return rows.filter((row) => INTERNAL_KEY_PATTERN.test(row.visible_name_ru)).length;
}

export function countMojibakeVisible(rows: readonly ProfessionalEstimateVisibleLine[]): number {
  return rows.filter((row) => MOJIBAKE_PATTERN.test(row.visible_name_ru)).length;
}
