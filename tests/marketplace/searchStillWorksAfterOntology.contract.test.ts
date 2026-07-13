import { readText } from "../constructionWorkOntology/constructionWorkOntologyTestHelpers";

it("keeps marketplace/catalog search backed by the existing catalog_items path after ontology migration", () => {
  const transport = readText("src/lib/catalog/catalog.transport.supabase.ts");
  const service = readText("src/lib/catalog/catalogItemsService.ts");

  expect(transport).toContain('.from("catalog_items")');
  expect(transport).toContain("CATALOG_ITEMS_SEARCH_PREVIEW_SELECT");
  expect(service).toContain('sourceId: "catalog_items"');
  expect(service).not.toMatch(/constructionWork|construction_work_definitions/i);
});
