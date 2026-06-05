import { readText } from "../constructionWorkOntology/constructionWorkOntologyTestHelpers";

it("keeps request estimate material binding on catalog_items and does not route requests through ontology", () => {
  const payloadBuilder = readText("src/features/consumerRepair/buildRequestEstimatePayload.ts");
  const picker = readText("src/features/catalog/CatalogItemPicker.tsx");

  expect(payloadBuilder).toContain('sourceId: "catalog_items"');
  expect(picker).toContain("catalog_items");
  expect(payloadBuilder).not.toMatch(/constructionWork|construction_work_definitions/i);
});
