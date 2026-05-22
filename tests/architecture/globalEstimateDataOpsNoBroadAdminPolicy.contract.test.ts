import fs from "node:fs";
import path from "node:path";

describe("architecture: Global Estimate Data Ops no broad admin policy", () => {
  it("keeps the governance migration schema-only and without broad public writes", () => {
    const migration = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../supabase/migrations/20260522233000_global_estimate_data_ops_governance.sql",
      ),
      "utf8",
    );

    expect(migration).not.toMatch(/\bdrop\s+table\b/i);
    expect(migration).not.toMatch(/\btruncate\b/i);
    expect(migration).not.toMatch(/\bdelete\s+from\b/i);
    expect(migration).not.toMatch(/to\s+(public|authenticated)[\s\S]*with\s+check\s*\(\s*true\s*\)/i);
  });
});
