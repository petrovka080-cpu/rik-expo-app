import fs from "node:fs";
import path from "node:path";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE architecture: no migrations", () => {
  it("does not add external knowledge migrations", () => {
    const migrations = path.join(process.cwd(), "supabase", "migrations");
    const matches = fs.existsSync(migrations)
      ? fs.readdirSync(migrations).filter((name) => /external.*knowledge|verified.*external/i.test(name))
      : [];
    expect(matches).toEqual([]);
  });
});
