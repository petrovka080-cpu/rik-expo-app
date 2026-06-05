import { readRestoreJson, readText } from "../constructionWorkOntology/constructionWorkOntologyTestHelpers";

it("keeps approval/history visibility guarantees from the restored product proof", () => {
  const matrix = readRestoreJson<Record<string, unknown>>("matrix.json");
  const migration = readText("supabase/migrations/20260605090000_add_construction_work_ontology.sql");

  expect(matrix.approve_current_user_history_only).toBe(true);
  expect(matrix.approved_request_hidden_from_other_users).toBe(true);
  expect(migration).not.toMatch(/approval|history|proposal|request_items|requests/i);
});
