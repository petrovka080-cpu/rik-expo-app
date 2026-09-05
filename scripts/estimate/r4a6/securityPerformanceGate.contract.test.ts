import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "scripts/estimate/r4a6/runR4A6SecurityPerformance.ts"), "utf8");

describe("R4-A6 security/performance gate", () => {
  it("freezes full security and performance test manifests without skips", () => {
    expect(source).toContain('...listTests(path.resolve("tests/security"))');
    expect(source).toContain('listTests(path.resolve("tests/performance"))');
    expect(source).toContain('"--runInBand"');
    expect(source).toContain("pending === 0");
    expect(source).toContain("denominatorMayShrink: false");
  });

  it("requires live rollback RLS, measured percentiles, physical PDF, and bounded memory", () => {
    expect(source).toContain("GREEN_R4_A6_CANONICAL_RLS_LIVE");
    expect(source).toContain("GREEN_ESTIMATOR_MEMORY_LIFECYCLE_BOUNDED");
    expect(source).toContain("physicalPdfByRowCount");
    expect(source).toContain("coldStartAndroidApi34");
    expect(source).toContain("history50000Compatible");
    expect(source).toContain("GREEN_R4_A6_SECURITY_PERFORMANCE");
  });

  it("keeps secrets out of receipts and preserves unrelated dirty artifacts", () => {
    expect(source).toContain("forbiddenReceiptFindings");
    expect(source).toContain("scanCloseoutArtifactsForSecrets.ts");
    expect(source).toContain("ALLOWED_DIRTY_PATHS");
    expect(source).toContain(".trimEnd()");
    expect(source).not.toContain('git(["status", "--porcelain=v1"');
    expect(source).toContain("productionAccessed: false");
    expect(source).toContain("fakeGreenClaimed: false");
  });
});
