import { readArtifactJson, readMigration } from "./constructionWorkOntologyTestHelpers";

it("does not mutate catalog_items and uses it only as an FK target for optional links", () => {
  const sql = readMigration();
  const proof = readArtifactJson<Record<string, unknown>>("catalog_items_untouched_proof.json");

  expect(sql).not.toMatch(/\binsert\s+into\s+(?:public\.)?catalog_items\b/i);
  expect(sql).not.toMatch(/\bupdate\s+(?:public\.)?catalog_items\b/i);
  expect(sql).not.toMatch(/\bdelete\s+from\s+(?:public\.)?catalog_items\b/i);
  expect(sql).not.toMatch(/\balter\s+table\s+(?:public\.)?catalog_items\b/i);
  expect(sql).toContain("to_regclass('public.catalog_items') is not null");
  expect(sql).toContain("references public.catalog_items(id)");
  expect(proof).toEqual(
    expect.objectContaining({
      catalog_items_modified: false,
      catalog_items_inserted: false,
      catalog_items_deleted: false,
      catalog_items_deduplicated: false,
      fake_green_claimed: false,
    }),
  );
});
