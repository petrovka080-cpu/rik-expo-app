import fs from "node:fs";
import path from "node:path";

describe("whole-app 50k synthetic fixture idempotency contract", () => {
  it("uses deterministic ids, on-conflict no-op inserts, and writes idempotency artifact", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(source).toContain("function sqlUuid");
    expect(source.match(/on conflict \(id\) do nothing/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(source).toContain('writeJson("idempotency"');
    expect(source).toContain("partial_full_resume_supported: true");
    expect(source).toContain("duplicate_proof_rows_without_detection: false");
  });
});
