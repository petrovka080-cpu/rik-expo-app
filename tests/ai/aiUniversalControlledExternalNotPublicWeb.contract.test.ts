import { readProjectFile } from "./aiUniversalSmokeTestHelpers";

describe("universal controlled external source disclosure", () => {
  it("does not present controlled external sources as live public web", () => {
    const source = readProjectFile("scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts");

    expect(source).toContain('origin: "controlled_external_source"');
    expect(source).toContain("canBePresentedAsLivePublicWeb: false");
    expect(source).toContain("controlled_external_not_presented_as_live_public_web");
  });
});
