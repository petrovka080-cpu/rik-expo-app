export const PROFESSIONAL_EXPANDED_ESTIMATE_REQUIRED_COLUMNS = [
  "№",
  "Раздел",
  "Наименование",
  "Спецификация / пояснение",
  "Ед.",
  "Кол-во",
  "Норма / формула",
  "Запас %",
  "Цена",
  "Сумма",
  "Источник цены / статус",
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
