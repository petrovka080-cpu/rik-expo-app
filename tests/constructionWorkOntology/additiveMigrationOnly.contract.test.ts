import { createdTableNames, readMigration, REQUIRED_TABLES } from "./constructionWorkOntologyTestHelpers";

it("keeps the ontology migration additive and scoped to construction_work tables", () => {
  const sql = readMigration();

  expect(createdTableNames(sql).sort()).toEqual([...REQUIRED_TABLES].sort());
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/i);
  expect(sql).not.toMatch(/\btruncate\b/i);
  expect(sql).not.toMatch(/\bdelete\s+from\b/i);
  expect(sql).not.toMatch(/\balter\s+table\s+public\.catalog_items\b/i);
  expect(sql).not.toMatch(/\bupdate\s+public\.catalog_items\b/i);
  expect(sql).not.toMatch(/\binsert\s+into\s+public\.catalog_items\b/i);
});
