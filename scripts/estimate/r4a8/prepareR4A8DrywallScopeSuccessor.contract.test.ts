import { readFileSync } from "node:fs";

import { buildAllBatch003R56CanonicalSuccessorDefinitions } from "../r5/batch003R56SharedCoreProjection";

describe("R4-A8 drywall operation-scope successor", () => {
  test("binds the forward-only local successor to the exact MASTER and current canonical lineage", () => {
    const source = readFileSync("scripts/estimate/r4a8/prepareR4A8DrywallScopeSuccessor.ts", "utf8");
    expect(source).toContain("cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1");
    expect(source).toContain("r568-local-developer-canonical-release.json");
    expect(source).toContain("rik-expo-app.r568.r4-a8-drywall-operation-scope-successor.v1");
    expect(source).toContain("PREPARED_NOT_ACTIVE");
    expect(source).toContain("activationPerformed: false");
    expect(source).toContain("deployPerformed: false");
    expect(source).toContain("releasePerformed: false");
  });

  test("publishes the complete 36-definition owner and keeps W3/W4 as separate operation scopes", () => {
    const definitions = buildAllBatch003R56CanonicalSuccessorDefinitions();
    expect(definitions).toHaveLength(36);
    const w3 = definitions.find((definition) =>
      definition.catalogId === "drywall_ceiling_interior_drywall_ceiling_align_large_area");
    const w4 = definitions.find((definition) =>
      definition.catalogId === "drywall_ceiling_interior_drywall_ceiling_frame_standard");
    expect(w3).toMatchObject({ operation: "ALIGN", variant: "large_area" });
    expect(w4).toMatchObject({ operation: "FRAME", variant: "standard" });
    expect(w3?.resources).toHaveLength(9);
    expect(w4?.resources).toHaveLength(20);
    expect(w4?.passport.physicalResultRu).toContain("без обшивки");
    const w4Scope = w4?.resources.map((resource) => `${resource.rowId} ${resource.titleRu}`).join("\n") ?? "";
    expect(w4Scope).not.toMatch(/(?:cladding_boards|insulation_mat|joint_(?:compound|reinforcement_tape|finish)|лист.*гипс|изоляц|шпаклев|обшив|заделк.*шв|шлифов)/iu);
    expect(new Set(w4?.resources.map((resource) => resource.semanticOwnerId)).size).toBe(20);
    expect(new Set(w4?.resources.map((resource) => resource.costOwnerId)).size).toBe(20);
  });
});
