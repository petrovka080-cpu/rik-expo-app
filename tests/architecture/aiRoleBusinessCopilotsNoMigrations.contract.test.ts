import fs from "fs";
import path from "path";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: no migrations", () => {
  it("does not add role workflow migrations", () => {
    const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");
    const roleWorkflowMigrations = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter((file) => /role.*business.*copilot|workflow/i.test(file))
      : [];
    expect(roleWorkflowMigrations).toEqual([]);
  });
});
