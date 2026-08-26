import {
  readArtifactJson,
  readRestoreJson,
  readText,
} from "./constructionWorkOntologyTestHelpers";

it("keeps product UI, request, foreman, history, and PDF source-of-truth outside this migration", () => {
  const matrix = readArtifactJson<Record<string, unknown>>("product_no_regression_matrix.json");
  const restore = readRestoreJson<Record<string, unknown>>("matrix.json");
  const migration = readText("supabase/migrations/20260605090000_add_construction_work_ontology.sql");

  expect(migration).not.toMatch(/pdf-viewer|ai_estimate|marketplace|request_submit|proposal|history/i);
  expect(restore.marketplace_ui_restored).toBe(true);
  expect(restore.approve_current_user_history_only).toBe(true);
  expect(restore.pdf_table_format).toBe(true);
  expect(restore.pdf_no_mojibake).toBe(true);
  expect(matrix).toEqual(
    expect.objectContaining({
      marketplace_no_regression: true,
      request_no_regression: true,
      foreman_no_regression: true,
      history_visibility_no_regression: true,
      pdf_tabular_no_regression: true,
      pdf_no_mojibake_no_regression: true,
      product_ui_changed: false,
      pdf_renderer_changed: false,
      estimate_engine_changed: false,
      fake_green_claimed: false,
    }),
  );
});
