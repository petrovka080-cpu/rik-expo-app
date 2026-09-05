import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (relative: string) => readFileSync(resolve(relative), "utf8");

describe("R5.5.1 local developer review tooling", () => {
  it("preflights the authoritative provider and seals one owned Metro", () => {
    const launcher = source("scripts/dev/startLocalDeveloperReview.ps1");
    expect(launcher).toContain("status -o json");
    expect(launcher).toContain("NON_LOCAL_PROVIDER_FORBIDDEN");
    expect(launcher).toContain("PUBLIC_KEY_CLASS_RED");
    expect(launcher).toContain("$Port = 8081");
    expect(launcher).toContain("PORT_8081_FOREIGN_OWNER_PID_");
    expect(launcher).toContain("$NormalizedCommand.Contains($NormalizedRoot)");
    expect(launcher).toContain('EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW = "1"');
    expect(launcher).toContain("provisionLocalDeveloperReview.ts");
    expect(launcher).toContain("serveLocalDeveloperAuthBroker.ts");
    expect(launcher).toContain("probeLocalDeveloperCanonicalBackend.ts");
    expect(launcher).toContain("r568-local-developer-canonical-release.json");
    expect(launcher).toContain("ACTIVE_LOCAL_DEVELOPER_CANONICAL_RELEASE");
    expect(launcher).toContain(".release-runtime\\r568\\runtime\\local-developer-current");
    expect(launcher).toContain('EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = $CanonicalBackendUrl');
    expect(launcher).toContain('EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK = "true"');
    expect(launcher).toContain("GREEN_R555_LOCAL_DEVELOPER_PROVIDER_PRINCIPALS_9_OFFICE_PLUS_1_CONSUMER");
    expect(launcher).toContain("[int]$ProvisionResult.office_green -ne 9");
    expect(launcher).toContain("[int]$ProvisionResult.consumer_green -ne 1");
    expect(launcher).toContain("[int]$ProvisionResult.owner_green -ne 1");
    expect(launcher).toContain("[int]$ProvisionResult.owner_effective_role_green -ne 9");
    expect(launcher).toContain("[int]$BrokerHealth.principal_count -eq 10");
    expect(launcher).toContain("$BrokerHealth.owner_available -eq $true");
    expect(launcher).toContain("LOCAL_DEVELOPER_METRO_START_RED");
    expect(launcher).toContain("packager-status:running");
    expect(launcher).toContain("[System.Text.Encoding]::UTF8.GetString($MetroHealth.Content)");
    expect(launcher).toContain("$MetroHealthContent -match");
    expect(launcher).toContain("runtime_action=started_exact_healthy_runtime");
    expect(launcher.indexOf('Write-Host "auth_broker_pid=$($Broker.Id)"')).toBeLessThan(
      launcher.indexOf('Write-Host "runtime_action=reuse_exact_healthy_runtime"'),
    );
    expect(launcher).not.toContain("$Metro.WaitForExit()");
    expect(launcher).not.toMatch(/Write-Host[^\n]*(PublicKey|ANON_KEY)/u);
  });

  it("keeps mutable current runtime receipts outside immutable acceptance evidence", () => {
    const launcher = source("scripts/dev/startLocalDeveloperReview.ps1");
    const backendManager = source("scripts/dev/ensureLocalDeveloperCanonicalBackend.ts");
    const androidJourney = source("scripts/e2e/r4A6AndroidAcceptedUiRuntime.ts");
    expect(backendManager).toContain("LOCAL_DEVELOPER_EVIDENCE_ROOT");
    expect(backendManager).toContain('resolve(EVIDENCE_ROOT, "backend.json")');
    expect(backendManager).toContain("request_audit_path");
    expect(backendManager).toContain("cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1");
    expect(launcher).toContain("LOCAL_DEVELOPER_EVIDENCE_ROOT");
    expect(androidJourney).toContain("R4_A6_ANDROID_BACKEND_AUDIT_PATH");
  });

  it("keeps credentials in ignored runtime and broker origins on developer 8081", () => {
    const provisioner = source("scripts/dev/provisionLocalDeveloperReview.ts");
    const broker = source("scripts/dev/serveLocalDeveloperAuthBroker.ts");
    const roleRegistry = source("src/lib/localDeveloperReviewRoles.ts");
    const gitignore = source(".gitignore");
    expect(gitignore).toContain(".release-runtime/");
    expect(provisioner).toContain(
      ".release-runtime/r551/runtime/local-developer/credentials.json",
    );
    expect(provisioner).toContain("GREEN_R555_LOCAL_DEVELOPER_PROVIDER_PRINCIPALS_9_OFFICE_PLUS_1_CONSUMER");
    expect(provisioner).toContain("LOCAL_DEVELOPER_REVIEW_ROLES");
    expect(provisioner).toContain("LOCAL_DEVELOPER_CONSUMER_ROLE");
    expect(provisioner).toContain('const OWNER_ROLE = "platform_developer"');
    expect(provisioner).toContain("owner_effective_role_green");
    expect(provisioner).toContain("Strict local role principal; developer entitlement forbidden");
    expect(provisioner).toContain("ensureAndroidInputSafeConsumer");
    expect(provisioner).toContain("principal.email.length <= 48");
    expect(provisioner).toContain("/^[A-Za-z0-9]+$/u.test(principal.password)");
    expect(roleRegistry).toContain('"security"');
    expect(provisioner).toContain("service_key_in_browser: false");
    expect(broker).toContain('"http://localhost:8081"');
    expect(broker).toContain('"http://127.0.0.1:8081"');
    expect(broker).not.toContain('"http://localhost:8190"');
    expect(broker).toContain("origin_forbidden");
    expect(broker).toContain('requestUrl.pathname === "/owner-session"');
    expect(broker).toContain('actor: ownerRequest ? "owner" : "strict_test_principal"');
    expect(broker).toContain('credentials_printed: false');
  });

  it("proves role-independent access without replacing the owner actor", () => {
    const roleMatrix = source("scripts/dev/runLocalDeveloperRoleMatrixSmoke.ts");
    expect(roleMatrix).toContain("developer_set_effective_role_v1");
    expect(roleMatrix).toContain("serverEntitlementGreen");
    expect(roleMatrix).toContain("providerActorStable");
    expect(roleMatrix).toContain("provider_actor_stable");
    expect(roleMatrix).toContain("provider_role_unchanged");
    expect(roleMatrix).toContain("presentation_role_must_not_replace_provider_role");
    expect(roleMatrix).not.toContain("app_metadata?.role === expectedRole");
  });
});
