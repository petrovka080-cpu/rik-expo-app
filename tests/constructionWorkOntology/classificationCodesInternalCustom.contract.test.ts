import { readMigration } from "./constructionWorkOntologyTestHelpers";

it("generates one internal custom classification code per seeded work without official claims", () => {
  const sql = readMigration();

  expect(sql).toContain("insert into public.construction_work_classification_codes");
  expect(sql).toContain("'CW-' || lpad(row_number() over (order by work_key)::text, 4, '0')");
  expect(sql).toContain("'internal_reference'");
  expect(sql).toContain("false");
  expect(sql).not.toMatch(/source_license\s+text\s+not\s+null/i);
});
