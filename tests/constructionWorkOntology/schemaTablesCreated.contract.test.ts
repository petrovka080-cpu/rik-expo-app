import { readMigration, REQUIRED_TABLES } from "./constructionWorkOntologyTestHelpers";

it("creates the required construction work ontology tables, keys, constraints, and FK links", () => {
  const sql = readMigration();

  for (const table of REQUIRED_TABLES) {
    expect(sql).toContain(`create table if not exists public.${table}`);
  }

  expect(sql).toContain("work_key text not null unique");
  expect(sql).toContain("domain_key text not null references public.construction_work_domains(domain_key)");
  expect(sql).toContain("catalog_item_id uuid not null");
  expect(sql).toContain("foreign key (catalog_item_id) references public.catalog_items(id)");
  expect(sql).toContain("measurement_kind in ('area', 'volume', 'length', 'count', 'weight', 'time', 'lump_sum')");
  expect(sql).toContain("source_kind <> 'official_csi'");
  expect(sql).toContain("unique (work_id, normalized_alias)");
});
