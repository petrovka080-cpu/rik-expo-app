import { readJson } from "./postM1R2TestSupport";

test("keeps ROAD reference ownership separate from requested 0701 identity", () => {
  const proof = readJson<any>("04-professional/ROAD_0701_ROUTING_RECOUNT.json");
  expect(proof.roadReferenceAssemblyRows).toBe(304);
  expect(proof.catalogRequestedIdentity).toBe("built-in-ai-1000:0701");
  expect(proof.referenceProofAliasTo0701).toBe(false);
  expect(proof.duplicateCostOwners).toBe(0);
});
