import fs from "node:fs";
import path from "node:path";

function source(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("consumer estimate personal session access", () => {
  it("opens the estimate through a personal identity boundary without an organization-role gate", () => {
    const route = source("app/(tabs)/request/index.tsx");
    const boundary = source("src/components/auth/ConsumerEstimateIdentityBoundary.tsx");
    const auth = source("src/lib/supabaseClient.ts");

    expect(route).toContain("ConsumerEstimateIdentityBoundary");
    expect(route).not.toContain("ProtectedIdentityBoundary");
    expect(boundary).toContain("ensureConsumerEstimatePrincipal");
    expect(auth).toContain("supabase.auth.signInAnonymously()");
    expect(auth.indexOf("if (current.session?.user)")).toBeLessThan(
      auth.indexOf("supabase.auth.signInAnonymously()"),
    );
    expect(auth.indexOf("if (current.degraded)")).toBeLessThan(
      auth.indexOf("supabase.auth.signInAnonymously()"),
    );
  });

  it("keeps a no-organization principal owner-scoped in the local whole-app backend", () => {
    const backend = source("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
    const manager = source("scripts/dev/ensureLocalDeveloperCanonicalBackend.ts");

    expect(manager).toContain("CANONICAL_ESTIMATE_ALLOW_PERSONAL_PRINCIPAL");
    expect(backend).toContain('R3_RUNTIME_ENVIRONMENT === "local-developer-r568-whole-app"');
    expect(backend).toContain("tenantId: ownerUserId");
    expect(backend).toContain("organizationId: null");
    expect(backend).toContain('role: "consumer"');
    expect(backend).toContain("owner_user_id=$3 or organization_id=$4");
    expect(backend).not.toContain('membershipUrl.searchParams.set("role"');
    expect(backend).not.toContain('membershipUrl.searchParams.set("company_id"');
    expect(backend).toContain("const claimedMembership = claimedTenantIsValid");
    expect(backend).toContain("ALLOW_PERSONAL_PRINCIPAL && Array.isArray(membershipRows)");
    expect(backend).toContain("grants no organization identity or ERP role");
    expect(backend).not.toContain("Signed app_metadata remains a valid server-owned source");
  });
});
