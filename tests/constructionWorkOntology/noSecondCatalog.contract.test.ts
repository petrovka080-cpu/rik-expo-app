import { createdTableNames, readArtifactJson, readMigration } from "./constructionWorkOntologyTestHelpers";

it("does not create a second marketplace/product catalog", () => {
  const sql = readMigration();
  const proof = readArtifactJson<Record<string, unknown>>("no_second_catalog_proof.json");
  const tables = createdTableNames(sql);

  expect(tables.every((table) => table.startsWith("construction_work_"))).toBe(true);
  expect(tables).not.toContain("catalog_items_v2");
  expect(tables).not.toContain("marketplace_catalog");
  expect(sql).not.toMatch(/create table if not exists public\.(?:product|marketplace|supplier)_catalog/i);
  expect(proof).toEqual(
    expect.objectContaining({
      second_catalog_created: false,
      catalog_items_remains_product_source_of_truth: true,
      fake_green_claimed: false,
    }),
  );
});
