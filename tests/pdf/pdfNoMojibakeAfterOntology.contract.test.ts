import { readRestoreJson, readText } from "../constructionWorkOntology/constructionWorkOntologyTestHelpers";

it("keeps restored PDF Cyrillic/no-mojibake proof outside ontology migration", () => {
  const matrix = readRestoreJson<Record<string, unknown>>("pdf_restore_matrix.json");
  const migration = readText("supabase/migrations/20260605090000_add_construction_work_ontology.sql");

  expect(matrix.pdf_contains_cyrillic).toBe(true);
  expect(matrix.pdf_no_mojibake).toBe(true);
  expect(migration).not.toMatch(/Р’|Рµ|РЅ|Ð|Ñ|�/);
});
