import fs from "node:fs";
import path from "node:path";

it("keeps local Supabase replay config explicit and free of vector bucket sync", () => {
  const configPath = path.join(process.cwd(), "supabase/config.toml");
  const config = fs.readFileSync(configPath, "utf8");

  expect(config).toContain('[storage.vector]');
  expect(config).toContain('enabled = false');
  expect(config).toContain('major_version = 17');
  expect(config).not.toMatch(/service_role|anon_key|password|secret|jwt/i);
});
