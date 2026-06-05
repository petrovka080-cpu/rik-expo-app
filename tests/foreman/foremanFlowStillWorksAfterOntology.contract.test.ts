import { readText } from "../constructionWorkOntology/constructionWorkOntologyTestHelpers";

it("keeps foreman/contractor catalog reads on catalog_items after ontology migration", () => {
  const workModalService = readText("src/screens/contractor/contractor.workModalService.ts");
  const contractorData = readText("src/screens/contractor/contractor.data.ts");

  expect(workModalService).toContain('.from("catalog_items")');
  expect(contractorData).toContain('.from("catalog_items")');
  expect(workModalService).not.toMatch(/constructionWork|construction_work_definitions/i);
});
