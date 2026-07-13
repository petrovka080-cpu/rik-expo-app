import { readMigration } from "./constructionWorkOntologyTestHelpers";

it("seeds required recipe rows from work definitions with valid row kinds and formulas", () => {
  const sql = readMigration();

  expect(sql).toContain("insert into public.construction_work_recipe_rows");
  expect(sql).toContain("row_kind in ('material', 'labor', 'equipment', 'overhead', 'risk', 'timeline')");
  expect(sql).toContain("when 'area' then 'area_m2'");
  expect(sql).toContain("when 'volume' then 'volume_m3'");
  expect(sql).toContain("when 'length' then 'length_m'");
  expect(sql).toContain("when 'count' then 'count'");
  expect(sql).toContain("where source_kind = 'internal_custom'");
  expect(sql).toContain("on conflict (work_id, row_kind, title_ru, sort_order) do nothing");
});
