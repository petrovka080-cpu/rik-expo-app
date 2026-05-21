import { documentProof } from "./documentTestFixtures";

test("document universal QA bridge exposes safe source plan", () => {
  const { universalQaBridge } = documentProof();
  expect(universalQaBridge.sourcePlan).toEqual(["app_context_graph", "pdf_document", "app_data"]);
  expect(universalQaBridge.changedData).toBe(false);
  expect(universalQaBridge.finalSubmit).toBe(false);
});
