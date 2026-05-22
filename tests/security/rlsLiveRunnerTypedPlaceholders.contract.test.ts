import fs from "node:fs";
import path from "node:path";

const RUNNER_PATH = path.join(process.cwd(), "scripts/audit/runRlsDynamicCrossTenantLiveProof.ts");

describe("RLS live runner typed placeholders contract", () => {
  it("uses explicit casts for the requests insert proof row", () => {
    const text = fs.readFileSync(RUNNER_PATH, "utf8");

    expect(text).toContain("values ($1::uuid, $2::uuid, $3::uuid, $4::text");
    expect(text).toContain("[officeRequestB, officeUserB, officeUserB, officeUserB]");
    expect(text).toContain("'pending')");
    expect(text).not.toContain("'RLS proof office request', 'draft'");
  });

  it("does not hide the mixed placeholder bug as an external connection blocker", () => {
    const text = fs.readFileSync(RUNNER_PATH, "utf8");

    expect(text).not.toContain("inconsistent types deduced for parameter");
    expect(text).not.toMatch(/RUNNER_CONNECTION_BUILDER_BUG|SUPABASE_POOLER_AUTH_OR_SSL_CONFIG/);
  });
});
