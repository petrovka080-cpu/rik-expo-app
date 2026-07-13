import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("office runtime role source contract", () => {
  it("keeps route guards wired to the same runtime role resolution path", () => {
    const gateSource = read("src/lib/officeRuntime/officeRuntimeContext.tsx");
    const sessionRoleSource = read("src/lib/sessionRole.ts");
    const profileSource = read("src/lib/api/profile.ts");
    const transportSource = read("src/lib/api/profile.transport.ts");
    const canonicalSql = read(
      "supabase/migrations/20260416183000_s2_canonical_role_truth.sql",
    );
    const developerOverrideSql = read(
      "supabase/migrations/20260416193000_h1_8_developer_break_glass_override.sql",
    );

    expect(gateSource).toContain("getSessionSafe");
    expect(gateSource).toContain("resolveCurrentSessionRole");
    expect(gateSource).toContain("loadDeveloperOverrideContext");
    expect(gateSource).toContain("canUseOfficeRoute");
    expect(gateSource).toContain("ensureProfile: false");

    expect(sessionRoleSource).toContain("readRoleFromUserMetadata");
    expect(sessionRoleSource).toContain('"session_metadata"');
    expect(sessionRoleSource).toMatch(/createResolution\([^)]*"session_metadata"/s);
    expect(sessionRoleSource).toContain("getMyRole()");
    expect(profileSource).toContain("getMyRole");
    expect(transportSource).toContain('rpc("get_my_role")');

    expect(canonicalSql).toMatch(/company_members[\s\S]*profiles[\s\S]*app_metadata[\s\S]*get_my_role/i);
    expect(developerOverrideSql).toContain("app_actor_role_context_v1");
    expect(developerOverrideSql).toContain("can_access_all_office_routes");
    expect(developerOverrideSql).toContain("expires_at");
  });
});
