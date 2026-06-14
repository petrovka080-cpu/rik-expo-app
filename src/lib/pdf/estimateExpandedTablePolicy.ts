export const ESTIMATE_FULL_NAMES_APPENDIX_TITLE = "Полные наименования строк";

export const ESTIMATE_EXPANDED_TABLE_POLICY = Object.freeze({
  full_names_appendix_removed: true,
  full_row_names_visible_in_table: true,
  long_names_wrapped_in_table: true,
  section_headers_repeated_on_page_break: true,
  fake_green_claimed: false,
});

export function wrapEstimateTableCellText(value: string, width: number, maxLines: number): string[] {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  const charsPerLine = Math.max(6, Math.floor((width - 8) / 4.4));
  if (clean.length <= charsPerLine) return [clean || " "];

  const lines: string[] = [];
  let current = "";
  for (const word of clean.split(" ")) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length > charsPerLine) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.length > 0 ? lines : [clean.slice(0, charsPerLine)];
}
