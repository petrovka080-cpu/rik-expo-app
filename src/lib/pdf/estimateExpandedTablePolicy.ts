export const ESTIMATE_EXPANDED_TABLE_POLICY = Object.freeze({
  expanded_estimate_enabled: true,
  compressed_estimate_mode_used: false,
  full_names_appendix_removed: true,
  full_row_names_visible_in_table: true,
  long_names_wrapped_in_table: true,
  fake_green_claimed: false,
});

export function estimateExpandedTablePolicy() {
  return ESTIMATE_EXPANDED_TABLE_POLICY;
}
