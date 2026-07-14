import { readRestoreJson, readText } from "../constructionWorkOntology/constructionWorkOntologyTestHelpers";

it("keeps restored PDF table guarantees untouched by ontology migration", () => {
  const matrix = readRestoreJson<Record<string, unknown>>("pdf_restore_matrix.json");
  const migration = readText("supabase/migrations/20260605090000_add_construction_work_ontology.sql");

  expect(matrix.pdf_table_format).toBe(true);
  expect(matrix.pdf_not_image_only).toBe(true);
  expect(matrix.pdf_rows_match_ui_rows).toBe(true);
  expect(migration).not.toMatch(/pdf|renderer|html|pdf-viewer/i);
});
