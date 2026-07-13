import { extractSeedWorkRows, readArtifactJson } from "./constructionWorkOntologyTestHelpers";

it("seeds 50 unique internal work keys across 10 domains with at least 5 works per domain", () => {
  const rows = extractSeedWorkRows();
  const matrix = readArtifactJson<Record<string, unknown>>("seed_matrix.json");
  const keys = new Set(rows.map((row) => row.workKey));
  const domainCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.domainKey] = (acc[row.domainKey] ?? 0) + 1;
    return acc;
  }, {});

  expect(rows).toHaveLength(50);
  expect(keys.size).toBe(50);
  expect(Object.keys(domainCounts)).toHaveLength(10);
  expect(Object.values(domainCounts).every((count) => count >= 5)).toBe(true);
  expect(matrix).toEqual(
    expect.objectContaining({
      seed_work_definitions_total: 50,
      seed_domains_total: 10,
      aliases_total_min: 150,
      recipe_rows_total_min: 50,
      official_csi_bulk_content_used: false,
      internal_custom_codes_used: true,
      catalog_items_inserted: false,
      fake_green_claimed: false,
    }),
  );
});
