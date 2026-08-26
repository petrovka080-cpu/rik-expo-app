import { readText } from "../constructionWorkOntology/constructionWorkOntologyTestHelpers";

it("keeps marketplace/catalog search backed by the existing catalog_items path after ontology migration", () => {
  const transport = readText("scripts/server/stagingBffCatalogTransportReadPort.ts");
  const service = readText("src/lib/catalog/catalogItemsService.ts");

  expect(transport).toContain("from public.catalog_items");
  expect(transport).toContain("search_blob ilike $1 or name_search ilike $1 or name_human ilike $1 or rik_code ilike $1");
  expect(service).toContain('sourceId: "catalog_items"');
  expect(service).not.toMatch(/constructionWork|construction_work_definitions/i);
});
