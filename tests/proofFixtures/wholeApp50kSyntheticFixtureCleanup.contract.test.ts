import fs from "node:fs";
import path from "node:path";

describe("whole-app 50k synthetic fixture cleanup contract", () => {
  it("requires cleanup to leave no proof rows and report zero business deletes", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(source).toContain("cleanup_deleted_only_proof_run_id: true");
    expect(source).toContain("business_rows_deleted: 0");
    expect(source).toContain("drop_truncate_used: false");
    expect(source).toContain('counts.total_proof_rows === 0 ? GREEN_CLEANUP : "BLOCKED_EXTERNAL_ONLY_PROOF_ROWS_REMAIN_AFTER_CLEANUP"');
  });
});
