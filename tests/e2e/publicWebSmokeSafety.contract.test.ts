import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "..", "..");
const smokeScriptPath = path.join(projectRoot, "scripts", "web_public_smoke.ts");
const packageJsonPath = path.join(projectRoot, "package.json");

describe("public web smoke safety contract", () => {
  const source = fs.readFileSync(smokeScriptPath, "utf8");

  it("stays on public unauthenticated routes only", () => {
    const gotoRoutes = Array.from(
      source.matchAll(/page\.goto\(`\$\{baseUrl\}([^`]+)`/g),
      (match) => match[1],
    );

    expect(gotoRoutes.sort()).toEqual(["/auth/login", "/auth/register"]);
    expect(source).not.toMatch(/\/profile|\/buyer|\/director|\/foreman|\/warehouse|\/office|\/supplierMap/);
  });

  it("does not create users, sign in, submit forms, or use privileged credentials", () => {
    expect(source).not.toMatch(/createTempUser|createVerifierAdmin|cleanupTempUser/);
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE|auth\.admin|signInWithPassword|signUp/);
    expect(source).not.toMatch(/\.fill\(|\.click\(|\.press\(|dispatchEvent\(|keyboard\.|tap/i);
    expect(source).not.toContain("@supabase/supabase-js");
  });

  it("keeps response artifacts redacted to status, method, and path", () => {
    expect(source).toContain("function redactResponse(response: Response)");
    expect(source).toContain("pathOnly = parsed.pathname");
    expect(source).not.toMatch(/response\.url\(\)[,;\n]/);
    expect(source).not.toMatch(/searchParams|parsed\.search|parsed\.href|parsed\.origin/);
  });

  it("is exposed as an explicit npm verifier command", () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["verify:web-public-smoke"]).toBe(
      "node node_modules/tsx/dist/cli.mjs scripts/web_public_smoke.ts",
    );
  });
});
