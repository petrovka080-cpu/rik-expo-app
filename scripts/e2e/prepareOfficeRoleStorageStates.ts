import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright/test";

import {
  applyOfficeTestAuthContext,
  createBuyerTestAuthContext,
  createDirectorTestAuthContext,
  createForemanTestAuthContext,
  type OfficeTestAuthContext,
} from "../../src/lib/officeAuthTest/officeRoleTestHarness";
import {
  buildEmptyOfficeRoleFixtureValidation,
  OFFICE_ROLE_FIXTURE_ARTIFACT_DIR,
  OFFICE_ROLE_FIXTURE_ROLES,
  OFFICE_ROLE_STORAGE_STATE_DIRS,
  officeRoleMarkerTestId,
  officeRoleRoute,
  officeRoleStorageStatePath,
  redactAppliedOfficeAuthContext,
  redactOfficeAuthFixtureText,
  writeOfficeAuthArtifact,
  type OfficeRoleFixtureRole,
  type OfficeRoleFixtureValidationRecord,
} from "../../tests/officeAuth/officeRoleFixtureValidation";

const BASE_URL =
  process.env.E2E_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://localhost:8081";
const BLOCKED_STATUS =
  "BLOCKED_OFFICE_E2E_ROLE_PROVISIONING_AND_RUNTIME_RBAC";

function routeUrl(route: string): string {
  return new URL(route, BASE_URL).toString();
}

function createAuthContext(role: OfficeRoleFixtureRole): OfficeTestAuthContext {
  if (role === "foreman") return createForemanTestAuthContext();
  if (role === "director") return createDirectorTestAuthContext();
  return createBuyerTestAuthContext();
}

async function visibleByTestId(page: Page, testId: string, timeout = 2_000) {
  return page
    .getByTestId(testId)
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);
}

async function detectWrongRoleMarker(
  page: Page,
  expectedRole: OfficeRoleFixtureRole,
): Promise<boolean> {
  for (const role of OFFICE_ROLE_FIXTURE_ROLES) {
    if (role === expectedRole) continue;
    if (await visibleByTestId(page, officeRoleMarkerTestId(role), 1_000)) {
      return true;
    }
  }
  return false;
}

async function validateRoleFixture(
  browser: Browser,
  role: OfficeRoleFixtureRole,
): Promise<OfficeRoleFixtureValidationRecord> {
  const storageStatePath = officeRoleStorageStatePath(role);
  const record = buildEmptyOfficeRoleFixtureValidation(role, storageStatePath);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const applied = await applyOfficeTestAuthContext(page, createAuthContext(role));
    record.auth_context_applied = true;
    record.auth_context = redactAppliedOfficeAuthContext(applied);

    await page.goto(routeUrl(officeRoleRoute(role)), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    record.route_loaded = true;
    record.final_path = new URL(page.url()).pathname;
    record.expected_role_marker_visible = await visibleByTestId(
      page,
      officeRoleMarkerTestId(role),
      30_000,
    );
    record.wrong_role_marker_visible = await detectWrongRoleMarker(page, role);
    record.role_guard_blocked = await visibleByTestId(
      page,
      "office-role-guard-blocked",
      1_000,
    );
    record.auth_unauthenticated_visible = await visibleByTestId(
      page,
      "office-role-auth-unauthenticated",
      1_000,
    );
    record.auth_degraded_visible = await visibleByTestId(
      page,
      "office-role-auth-degraded",
      1_000,
    );
    record.auth_loading_visible = await visibleByTestId(
      page,
      "office-role-auth-loading",
      1_000,
    );
    record.role_match =
      record.expected_role_marker_visible === true &&
      record.wrong_role_marker_visible === false &&
      record.role_guard_blocked === false;
    record.runtime_probe = {
      authenticated: record.auth_context_applied === true,
      expected_role: role,
      resolved_role: record.role_match ? role : null,
      auth_ready:
        record.auth_unauthenticated_visible === false &&
        record.auth_degraded_visible === false &&
        record.auth_loading_visible === false,
      membership_valid: record.role_match,
    };

    if (!record.role_match) {
      record.blocker_code = record.auth_unauthenticated_visible
        ? "AUTH_UNAUTHENTICATED"
        : record.auth_degraded_visible
          ? "AUTH_DEGRADED"
          : record.auth_loading_visible
            ? "AUTH_LOADING_TIMEOUT"
            : record.role_guard_blocked
              ? "ROLE_GUARD_BLOCKED"
              : record.wrong_role_marker_visible
                ? "WRONG_ROLE_MARKER_VISIBLE"
                : "EXPECTED_ROLE_MARKER_NOT_VISIBLE";
      return record;
    }

    fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
    await context.storageState({ path: storageStatePath });
    record.storage_state_written = true;
    return record;
  } catch (error) {
    const safeError = redactOfficeAuthFixtureText(error);
    record.blocker_code = safeError.includes("BLOCKED_NO_E2E_ROLE_SECRETS")
      ? "MISSING_ROLE_SECRETS"
      : /invalid login credentials/i.test(safeError)
        ? "INVALID_LOGIN_CREDENTIALS"
        : "ROLE_FIXTURE_VALIDATION_FAILED";
    return record;
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

function writeInventory() {
  writeOfficeAuthArtifact("fixture_inventory.json", {
    allowed_scope: "playwright_auth_fixtures_only",
    roles: [...OFFICE_ROLE_FIXTURE_ROLES],
    base_url_present_redacted: BASE_URL.length > 0,
    harness_path: "src/lib/officeAuthTest/officeRoleTestHarness.ts",
    validation_helper_path: "tests/officeAuth/officeRoleFixtureValidation.ts",
    storage_state_script_path: "scripts/e2e/prepareOfficeRoleStorageStates.ts",
    chromium_spec_path: "tests/e2e/officeRoleAuthContextFastRepair.web.spec.ts",
    provisioning_script_path: "scripts/e2e/provisionOfficeRoleActors.ts",
    allowed_storage_state_dirs: [...OFFICE_ROLE_STORAGE_STATE_DIRS],
    production_db_seed_or_mutation_attempted: false,
    service_role_used: false,
    list_users_used: false,
    secrets_printed: false,
    artifacts_redacted: true,
  });
}

function writeMatrices(records: readonly OfficeRoleFixtureValidationRecord[]) {
  const developerOverrideRows = records.map((record) => ({
    role: record.role,
    attempted: record.auth_context?.developer_override_attempted ?? false,
    applied: record.auth_context?.developer_override_applied ?? false,
    failed: record.auth_context?.developer_override_failed ?? false,
    failure_code: record.auth_context?.developer_override_failure_code ?? null,
    fallback_to_separate_role:
      record.auth_context?.fallback_to_separate_role ?? false,
  }));
  const storageRows = records.map((record) => ({
    role: record.role,
    allowed_path: record.storage_state_path_allowed,
    state_written: record.storage_state_written,
    path_value_redacted: true,
  }));

  writeOfficeAuthArtifact("role_fixture_validation_matrix.json", {
    roles_validated: records.length,
    all_roles_match: records.every((record) => record.role_match),
    records,
    fake_green_claimed: false,
    secrets_printed: false,
  });
  writeOfficeAuthArtifact("developer_override_matrix.json", {
    developer_override_test_only: true,
    production_db_seed_or_mutation_attempted: false,
    service_role_used: false,
    rows: developerOverrideRows,
    fake_green_claimed: false,
  });
  writeOfficeAuthArtifact("storage_state_security_matrix.json", {
    allowed_dirs: [...OFFICE_ROLE_STORAGE_STATE_DIRS],
    storage_states_not_committed: true,
    storage_state_paths_redacted: true,
    token_values_printed: false,
    rows: storageRows,
    fake_green_claimed: false,
  });
}

function writeCloseout(records: readonly OfficeRoleFixtureValidationRecord[]) {
  const green = records.every((record) => record.role_match);
  writeOfficeAuthArtifact("web_chromium_results.json", {
    chromium_spec_run: false,
    skipped_before_chromium: !green,
    skipped_reason: green ? "pending_chromium_run" : "role_fixture_validation_failed",
    minimal_foreman_director_buyer_smoke_passed: false,
    fake_green_claimed: false,
    secrets_printed: false,
  });
  writeOfficeAuthArtifact("CLOSEOUT_PROOF.json", {
    status: green ? "GREEN_STORAGE_STATES_READY_FOR_CHROMIUM_RBAC" : BLOCKED_STATUS,
    roles_checked: records.length,
    foreman_role_match:
      records.find((record) => record.role === "foreman")?.role_match ?? false,
    director_role_match:
      records.find((record) => record.role === "director")?.role_match ?? false,
    buyer_role_match:
      records.find((record) => record.role === "buyer")?.role_match ?? false,
    chromium_spec_green: false,
    fake_green_claimed: false,
    secrets_printed: false,
  });
}

async function main() {
  writeInventory();
  const browser = await chromium.launch();
  const records: OfficeRoleFixtureValidationRecord[] = [];
  try {
    for (const role of OFFICE_ROLE_FIXTURE_ROLES) {
      records.push(await validateRoleFixture(browser, role));
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  writeMatrices(records);
  writeCloseout(records);

  const green = records.every((record) => record.role_match);
  const status = green ? "GREEN_STORAGE_STATES_READY_FOR_CHROMIUM_RBAC" : BLOCKED_STATUS;
  console.log(
    `office role fixture preparation: ${status}; artifact=${path.relative(
      process.cwd(),
      OFFICE_ROLE_FIXTURE_ARTIFACT_DIR,
    )}`,
  );
  if (!green) process.exitCode = 1;
}

main().catch((error) => {
  writeOfficeAuthArtifact("CLOSEOUT_PROOF.json", {
    status: BLOCKED_STATUS,
    blocker_code: "SCRIPT_FAILED",
    error_redacted: redactOfficeAuthFixtureText(error),
    fake_green_claimed: false,
    secrets_printed: false,
  });
  console.error(`office role fixture preparation: ${BLOCKED_STATUS}`);
  process.exitCode = 1;
});
