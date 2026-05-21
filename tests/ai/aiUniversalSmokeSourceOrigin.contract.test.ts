import { readProjectFile } from "./aiUniversalSmokeTestHelpers";

describe("universal smoke source origin", () => {
  it("writes source origin trace and separates controlled external fixtures from source origins", () => {
    const source = readProjectFile("scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts");

    expect(source).toContain("source_origin_trace");
    expect(source).toContain("rawSourceOrigins");
    expect(source).toContain("controlledExternalFacts");
    expect(source).toContain("source_origin_trace_enabled");
  });
});
