import fs from "node:fs";
import path from "node:path";

const RUNNER_PATH = path.join(process.cwd(), "scripts/audit/runRlsDynamicCrossTenantLiveProof.ts");

function source(): string {
  return fs.readFileSync(RUNNER_PATH, "utf8");
}

describe("RLS live runner mixed column type contract", () => {
  it("documents the mixed request actor column types checked by the live runner", () => {
    const text = source();

    expect(text).toContain('requests_created_by_type: "uuid"');
    expect(text).toContain('requests_submitted_by_type: "uuid"');
    expect(text).toContain('requests_requested_by_type: "text"');
    expect(text).toContain("S_RLS_RUNNER_TYPED_PARAMS_matrix.json");
  });

  it("does not reuse one placeholder for uuid and text request actor columns", () => {
    const text = source();

    expect(text).not.toMatch(/created_by,\s*submitted_by,\s*requested_by[\s\S]{0,140}values\s*\(\$1,\s*\$2,\s*\$2,\s*\$2/i);
    expect(text).toContain("created_by, submitted_by, requested_by");
    expect(text).toContain("$2::uuid");
    expect(text).toContain("$3::uuid");
    expect(text).toContain("$4::text");
  });
});
