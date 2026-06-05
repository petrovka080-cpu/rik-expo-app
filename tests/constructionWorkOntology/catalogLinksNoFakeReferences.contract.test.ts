import { readArtifactJson, readMigration } from "./constructionWorkOntologyTestHelpers";

it("allows only real catalog_items references for optional work catalog links", () => {
  const sql = readMigration();
  const matrix = readArtifactJson<Record<string, unknown>>("repository_contract_matrix.json");

  expect(sql).toContain("catalog_item_id uuid not null");
  expect(sql).toContain("to_regclass('public.catalog_items') is not null");
  expect(sql).toContain("foreign key (catalog_item_id) references public.catalog_items(id)");
  expect(sql).toContain("unique (work_id, catalog_item_id, link_kind)");
  expect(sql).not.toMatch(/insert into public\.construction_work_catalog_links/i);
  expect(matrix).toEqual(
    expect.objectContaining({
      catalog_links_no_fake_references: true,
      catalog_links_seeded_count: 0,
      fake_green_claimed: false,
    }),
  );
});
