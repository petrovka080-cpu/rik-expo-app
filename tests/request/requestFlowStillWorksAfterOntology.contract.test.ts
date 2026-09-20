import { readText } from "../constructionWorkOntology/constructionWorkOntologyTestHelpers";

it("keeps request estimate material binding on catalog_items and does not route requests through ontology", () => {
  const payloadBuilder = readText("src/features/consumerRepair/buildRequestEstimatePayload.ts");
  const picker = readText("src/features/catalog/CatalogItemPicker.tsx");
  const catalogFacade = readText("src/lib/catalog/catalog.facade.ts");
  const catalogItemsService = readText("src/lib/catalog/catalogItemsService.ts");

  expect(payloadBuilder).toContain('sourceId: "catalog_items"');
  expect(picker).toContain('from "../../lib/catalog/catalog.facade"');
  expect(picker).toContain("searchCatalogItemsForPicker");
  expect(catalogFacade).toContain("searchCatalogItemsForPicker");
  expect(catalogItemsService).toContain('sourceId: "catalog_items"');
  expect(catalogItemsService).toContain("loadCatalogItemsSearchPreviewRows");
  expect(payloadBuilder).not.toMatch(/constructionWork|construction_work_definitions/i);
  expect(picker).not.toMatch(/constructionWork|construction_work_definitions/i);
});
