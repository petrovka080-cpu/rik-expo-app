import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (relative: string) => readFileSync(resolve(relative), "utf8");

describe("whole-app developer review runtime", () => {
  it("keeps the default review command on the complete staging role/data plane", () => {
    const packageJson = JSON.parse(source("package.json")) as {
      scripts: Record<string, string>;
    };
    const launcher = source("scripts/dev/startWholeAppDeveloperReview.ps1");

    expect(packageJson.scripts["dev:local-review"]).toContain(
      "scripts/dev/startWholeAppDeveloperReview.ps1",
    );
    expect(packageJson.scripts["dev:estimate-proof-review"]).toContain(
      "scripts/dev/startLocalDeveloperReview.ps1",
    );
    expect(launcher).toContain('Get-ConfiguredValue "STAGING_SUPABASE_URL"');
    expect(launcher).toContain('Get-ConfiguredValue "STAGING_SUPABASE_READONLY_KEY"');
    expect(launcher).toContain("whole_app_staging_plus_local_estimate");
    expect(launcher).toContain(
      '$ExpectedCanonicalRoot = [System.IO.Path]::GetFullPath("C:\\dev\\rik-expo-app-r4a5-dc4f0ce7")',
    );
    expect(launcher).toContain("$GitRootExitCode = $LASTEXITCODE");
    expect(launcher).toContain("[string]::IsNullOrWhiteSpace($GitRoot)");
    expect(launcher).toContain("[System.StringComparison]::OrdinalIgnoreCase");
    expect(launcher).toContain("Set-Location -LiteralPath $Root");
    expect(launcher).toContain("$CanonicalStandaloneDatabaseRoot");
    expect(launcher).toContain("$ProviderConfigAvailable");
    expect(launcher).toContain("-and -not $UseStandaloneLocalEstimateDatabase");
    expect(launcher).toContain("canonical_root = $Root");
    expect(launcher).toContain("git_root = [System.IO.Path]::GetFullPath($GitRoot)");
    expect(launcher).toContain("/rest/v1/rik_items?select=rik_code&limit=1");
    expect(launcher).toContain("/rest/v1/suppliers?select=id&limit=1");
    expect(launcher).toContain("/rest/v1/subcontracts?select=id&limit=1");
    expect(launcher).toContain("ensureLocalDeveloperCanonicalBackend.ts");
    expect(launcher).toContain('http://127.0.0.1:8765/runtime-identity');
    expect(launcher).toContain("CANONICAL_ESTIMATE_RUNTIME_IDENTITY_RED");
    expect(launcher).toContain("estimate_backend_runtime_identity_verified");
    expect(launcher).toContain('$env:LOCAL_DEVELOPER_BACKEND_AUTH_PROFILE = "whole_app_staging"');
    expect(launcher).toContain(
      "$env:LOCAL_DEVELOPER_BACKEND_AUTH_URL = $WholeAppUrl.TrimEnd('/')",
    );
    expect(launcher).toContain("LOCAL_DEVELOPER_BACKEND_AUTH_PUBLIC_KEY");
    expect(launcher).toContain(
      '$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = "http://127.0.0.1:8765"',
    );
    expect(launcher).toContain('$env:EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED = "false"');
    expect(launcher).toContain("whole-app-developer-current");
    expect(launcher).toContain("packager-status:running");
    expect(launcher).toContain("[System.Text.Encoding]::UTF8.GetString($status.Content)");
    expect(launcher).not.toMatch(/Write-Host[^\n]*(WholeAppKey|ANON_KEY|READONLY_KEY)/u);
  });

  it("rejects privileged browser credentials and records only fingerprints", () => {
    const launcher = source("scripts/dev/startWholeAppDeveloperReview.ps1");
    const backendManager = source("scripts/dev/ensureLocalDeveloperCanonicalBackend.ts");

    expect(launcher).toContain('WholeAppKey -match "service[_-]?role|sb_secret|private[_-]?key"');
    expect(launcher).toContain('Remove-Item -LiteralPath "Env:\\$name"');
    expect(launcher).toContain("provider_url_fingerprint");
    expect(launcher).toContain("provider_public_fingerprint");
    expect(launcher).toContain("estimate_backend_authenticated_probe_pending");
    expect(launcher).not.toContain("provider_public_key =");
    expect(launcher).not.toContain("whole_app_key =");
    expect(backendManager).toContain('"local_provider" | "whole_app_staging"');
    expect(backendManager).toContain("SIGNED_CLAIMS_OR_COMPANY_MEMBERSHIP");
    expect(backendManager).toContain("CANONICAL_ESTIMATE_ALLOW_RUNTIME_TENANT_CAPABILITY_DERIVATION");
    expect(backendManager).toContain(
      "READY_R568_WHOLE_APP_BACKEND_AWAITING_AUTHENTICATED_REQUEST",
    );
    expect(backendManager).toContain("authenticated_runtime_manifest_verified");
    expect(backendManager).toContain("runtimeIdentityMatches");
    expect(backendManager).toContain("authProviderUrlSha256");
    expect(backendManager).toContain("authPublicKeySha256");
    expect(backendManager).toContain("R568_RUNTIME_IDENTITY_TUPLE_RED");
    const backend = source(
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    );
    expect(backend).toContain("authProviderUrlSha256: SUPABASE_AUTH_URL_SHA256");
    expect(backend).toContain("authPublicKeySha256: SUPABASE_AUTH_API_KEY_SHA256");
    expect(backend).not.toContain("authProviderUrl: SUPABASE_AUTH_URL");
    expect(backend).not.toContain("authPublicKey: SUPABASE_AUTH_API_KEY");
  });
});
