import fs from "fs";
import path from "path";

describe("S_AI_ROLE_MIXED_150 architecture: no migrations", () => {
  it("does not add migration files for the eval dataset", () => {
    const repoRoot = path.resolve(__dirname, "../..");
    const migrationsDir = path.join(repoRoot, "supabase/migrations");
    const files = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter((file) => /role_mixed_150|golden_business_dataset/i.test(file))
      : [];
    expect(files).toEqual([]);
  });
});
