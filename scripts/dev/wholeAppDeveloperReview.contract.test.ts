import { readFileSync, mkdtempSync, existsSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const source = (relative: string) => readFileSync(resolve(relative), "utf8");

describe("whole-app developer review runtime", () => {
  it.each(["powershell", "pwsh"])("frontend build stamp persists one real timestamp per exact tuple and refuses a modified record (%s)", (shell) => {
    const folder = mkdtempSync(resolve(tmpdir(), "gox-build-stamp-"));
    const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
    try {
      const command = [
        "$ErrorActionPreference='Stop'; $tokens=$null; $parseErrors=$null",
        "$ast=[System.Management.Automation.Language.Parser]::ParseFile(" + quote(resolve("scripts/dev/startWholeAppDeveloperReview.ps1")) + ",[ref]$tokens,[ref]$parseErrors)",
        "if($parseErrors.Count){throw 'LAUNCHER_PARSE_FAILED'}",
        "foreach($name in @('Get-Sha256','Resolve-WholeAppFrontendBuildStamp')){$function=@($ast.FindAll({param($node)$node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name},$true));if($function.Count -ne 1){throw 'UNIQUE_FUNCTION_REQUIRED'};. ([ScriptBlock]::Create($function[0].Extent.Text))}",
        "$identity=[pscustomobject]@{sourceTreeHash=('a'*64);productSourceHash=('b'*64);jsBundleFingerprint=('c'*64)}",
        "$backend=[pscustomobject]@{master_sha256=('d'*64);definition_release_id='release';search_release_id='search';capability_id='capability'}",
        "$folder=" + quote(folder),
        "$first=Resolve-WholeAppFrontendBuildStamp $folder $identity $backend",
        "$second=Resolve-WholeAppFrontendBuildStamp $folder $identity $backend",
        "$identity.jsBundleFingerprint=('e'*64);$changed=Resolve-WholeAppFrontendBuildStamp $folder $identity $backend",
        "$files=@(Get-ChildItem -LiteralPath (Join-Path $folder 'frontend-build-stamps') -File)",
        "$firstPath=Join-Path (Join-Path $folder 'frontend-build-stamps') ($first.tuple_sha256+'.json')",
        "$tampered=Get-Content -LiteralPath $firstPath -Raw | ConvertFrom-Json;$tampered.tuple.source_tree_hash=('f'*64);$tampered | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $firstPath -Encoding UTF8",
        "$identity.jsBundleFingerprint=('c'*64);$refused=$false;try{Resolve-WholeAppFrontendBuildStamp $folder $identity $backend | Out-Null}catch{$refused=$_.Exception.Message -eq 'WHOLE_APP_FRONTEND_BUILD_STAMP_TUPLE_DRIFT'}",
        "[pscustomobject]@{sameTuple=$first.tuple_sha256 -eq $second.tuple_sha256;sameTime=$first.build_time -eq $second.build_time;changedTuple=$first.tuple_sha256 -ne $changed.tuple_sha256;records=$files.Count;tamperRefused=$refused} | ConvertTo-Json -Compress",
      ].join("\n");
      const result = spawnSync(shell, ["-NoProfile", "-NonInteractive", "-Command", command], {
        cwd: resolve("."), windowsHide: true, encoding: "utf8",
      });
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ sameTuple: true, sameTime: true, changedTuple: true, records: 2, tamperRefused: true });
    } finally {
      const stamps = resolve(folder, "frontend-build-stamps");
      if (existsSync(stamps)) {
        for (const file of readdirSync(stamps)) unlinkSync(resolve(stamps, file));
        rmdirSync(stamps);
      }
      rmdirSync(folder);
    }
  });
  it("cached startup scheduling runs normal backend admission before cached bundles and preserves cold/preflight modes", () => {
    const launcher = resolve("scripts/dev/startWholeAppDeveloperReview.ps1").replaceAll("'", "''");
    const command = [
      "$ErrorActionPreference='Stop';$tokens=$null;$parseErrors=$null",
      "$ast=[System.Management.Automation.Language.Parser]::ParseFile('" + launcher + "',[ref]$tokens,[ref]$parseErrors)",
      "if($parseErrors.Count){throw 'LAUNCHER_PARSE_FAILED'}",
      "$assignment=@($ast.FindAll({param($node)$node -is [System.Management.Automation.Language.AssignmentStatementAst] -and $node.Left.Extent.Text -eq '$DeferBackendForColdBundle'},$true));if($assignment.Count -ne 1){throw 'UNIQUE_ASSIGNMENT_REQUIRED'}",
      "function Get-NetTCPConnection {param($LocalPort,$State,$ErrorAction)if($portOpen){[pscustomobject]@{OwningProcess=1}}}",
      "$cases=@(@{cache=$false;preflight=$false;prepare=$false;open=$false},@{cache=$true;preflight=$false;prepare=$false;open=$false},@{cache=$false;preflight=$true;prepare=$false;open=$false},@{cache=$false;preflight=$false;prepare=$true;open=$false},@{cache=$false;preflight=$false;prepare=$false;open=$true})",
      "$result=@(foreach($case in $cases){$ReuseTransformCache=$case.cache;$PreflightOnly=$case.preflight;$PrepareBuildOnly=$case.prepare;$portOpen=$case.open;& ([ScriptBlock]::Create($assignment[0].Right.Extent.Text))});ConvertTo-Json -InputObject $result -Compress",
    ].join("\n");
    const result = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", command], {
      cwd: resolve("."), windowsHide: true, encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([true, false, false, false, false]);
  });
  it("direct TypeScript loader executes the real manager's early mode guard without database effects", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx",
      "scripts/dev/ensureLocalDeveloperCanonicalBackend.ts", "--prepare-only", "--preflight"], {
      cwd: resolve("."), windowsHide: true, encoding: "utf8",
    });
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("R568_MANAGER_MODE_CONFLICT");
    expect(result.stdout).toBe("");
    const launcher = source("scripts/dev/startWholeAppDeveloperReview.ps1");
    expect(launcher.match(/& \$Node --import tsx/gu)).toHaveLength(3);
    expect(launcher).not.toContain("$TsxCli");
  });
  it("direct TypeScript loader returns the existing real build identity", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/dev/printLocalDeveloperBuildIdentity.ts"], {
      cwd: resolve("."), windowsHide: true, encoding: "utf8",
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    const identity = JSON.parse(result.stdout);
    for (const field of ["sourceTreeHash", "productSourceHash", "jsBundleFingerprint"]) {
      expect(identity[field]).toMatch(/^[0-9a-f]{64}$/u);
    }
  });
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
      '$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = Resolve-WholeAppCanonicalFunctionUrl -Target $EmbeddedBuildTarget',
    );
    expect(launcher).toContain('$env:EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED = "false"');
    expect(launcher).toContain("whole-app-developer-current");
    expect(launcher).toContain("packager-status:running");
    expect(launcher).toContain("warmWholeAppDeveloperRuntime.cjs");
    expect(launcher).toContain('[string]$WarmupTarget = "Combined"');
    expect(launcher).toContain('WHOLE_APP_PLATFORM_READINESS_SCOPE_RED');
    expect(launcher).toContain('WHOLE_APP_WEB_PDF_TRANSPORT_READY_ANDROID_NOT_CHECKED');
    expect(launcher).toContain('android_transport_ready = [bool]$WarmupReceipt.androidTransportReady');
    expect(launcher.indexOf('WHOLE_APP_ANDROID_PDF_START_RED')).toBeLessThan(launcher.indexOf('schema_version = "rik-expo-app.whole-app-developer-runtime.v1"'));
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

  it("binds an explicitly selected MASTER file and rejects reuse on specification drift without reading auth", () => {
    const launcher = source("scripts/dev/startWholeAppDeveloperReview.ps1");
    const manager = source("scripts/dev/ensureLocalDeveloperCanonicalBackend.ts");
    const backend = source("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
    expect(launcher).toContain('[string]$MasterPath = ""');
    expect(launcher).toContain('Test-Path -LiteralPath $Path -PathType Leaf');
    expect(launcher).toContain('Get-FileHash -LiteralPath $Path -Algorithm SHA256');
    expect(launcher).toContain('Resolve-MasterSpecSha256 -Path $MasterPath');
    expect(launcher).toContain('$env:LOCAL_DEVELOPER_MASTER_SHA256 = $RequestedMasterSha256');
    expect(launcher).toContain('$RuntimeIdentity.specSha256 -eq [string]$BackendManager.master_sha256');
    const identityGuard = manager.slice(manager.indexOf("function runtimeIdentityMatches("), manager.indexOf("function manifestMatches("));
    expect(identityGuard).toContain('identity?.specSha256 === desired.masterSha256');
    expect(identityGuard).not.toContain("authenticatedManifest");
    const identityResponse = backend.slice(backend.indexOf('path[0] === "runtime-identity"'), backend.indexOf("if (!requestPrincipalStorage.getStore())"));
    expect(identityResponse).toContain("specSha256: R45_RUNTIME_SPEC_SHA256");
    expect(identityResponse).toContain("containsCredentials: false");
    expect(identityResponse).toContain("containsTenantIdentity: false");
    expect(launcher).toContain("master_sha256 = [string]$BackendManager.master_sha256");
    const managerStdout = manager.slice(manager.lastIndexOf("process.stdout.write("));
    expect(managerStdout).toContain("master_sha256: receipt.master_sha256");
  });
});
