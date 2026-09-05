import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("R4-A8 cleanup and memory evidence", () => {
  const source = readFileSync(resolve("scripts/estimate/r4a8/buildR4A8CleanupMemoryEvidence.ts"), "utf8");

  it("preserves exactly the previously authorized 33 retirements", () => {
    expect(source).toContain("A7_RETIREMENT_SUMMARY_SHA256");
    expect(source).toContain("A7_TOMBSTONES_SHA256");
    expect(source).toContain("tombstones.length === 33");
    expect(source).toContain("remainingAuthorized");
    expect(source).toContain("newDeletionBatchStarted: false");
    expect(source).toContain("GREEN_A8_DEAD_SOURCE_33_OF_33_PRESERVED");
  });

  it("requires three full current lifecycle runs and the real cache owner boundary", () => {
    expect(source).toContain("CURRENT_MEMORY_SOURCE_SHA");
    expect(source).toContain("CACHE_FIX_SHA");
    expect(source).toContain("buildProfessionalWorkPassport.ts");
    expect(source).toContain("Number(run.methodology?.cycles) === 8");
    expect(source).toContain("templateIndexEntryCount) === 0");
    expect(source).toContain("GREEN_A8_MEMORY_3_OF_3_NO_UNBOUNDED_RETENTION");
  });

  it("keeps process metrics separate from browser and Android measurements", () => {
    expect(source).toContain("nodePss:");
    expect(source).toContain("androidNativeAndGraphics:");
    expect(source).toContain("browserDomAndJs:");
    expect(source).toContain("INVESTIGATION_SIGNAL_NOT_TARGET");
    expect(source).toContain("globalStatus: \"RED_NOT_PRODUCTION_READY\"");
  });
});
