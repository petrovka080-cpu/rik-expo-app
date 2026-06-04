import { read } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("splits release verify by scope instead of weakening release safety", () => {
  const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  const scopeSource = read("scripts/release/releaseTargetScope.ts");
  const guardSource = read("scripts/release/releaseGuard.shared.ts");

  expect(packageJson.scripts["release:verify"]).toBe("tsx scripts/release/run-release-guard.ts verify --json");
  expect(packageJson.scripts["release:verify:owner"]).toBe("tsx scripts/release/runReleaseVerifyOwner.ts --json");
  expect(packageJson.scripts["release:verify:mobile"]).toBe("tsx scripts/release/runReleaseVerifyMobile.ts --json");
  expect(scopeSource).toContain("owner_gate_required_for_production_claims");
  expect(`${scopeSource}\n${guardSource}`).toContain("BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE");
});
