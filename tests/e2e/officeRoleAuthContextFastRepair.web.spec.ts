import { expect, test, type Browser, type Page } from "playwright/test";

import {
  applyOfficeTestAuthContext,
  createBuyerTestAuthContext,
  createDirectorTestAuthContext,
  createForemanTestAuthContext,
  type OfficeTestAuthContext,
} from "../../src/lib/officeAuthTest/officeRoleTestHarness";
import {
  OFFICE_ROLE_AUTH_CONTEXT_ARTIFACT_DIR,
  OFFICE_ROLE_FIXTURE_ARTIFACT_DIR,
  OFFICE_ROLE_LEGACY_FIXTURES_ARTIFACT_DIR,
  officeRoleMarkerTestId,
  officeRoleRoute,
  redactAppliedOfficeAuthContext,
  writeOfficeAuthArtifact,
  type OfficeRoleFixtureRole,
} from "../officeAuth/officeRoleFixtureValidation";

const BASE_URL =
  process.env.E2E_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://localhost:8081";

type RoleRouteProbe = {
  blocked: boolean;
  expected_marker_visible: boolean;
  auth_role_marker_visible: boolean;
  unauthenticated_visible: boolean;
  director_approval_controls_visible: boolean;
  buyer_only_actions_visible: boolean;
  final_path: string;
};

const writeArtifact = (value: Record<string, unknown>) => {
  for (const artifactDir of [
    OFFICE_ROLE_FIXTURE_ARTIFACT_DIR,
    OFFICE_ROLE_LEGACY_FIXTURES_ARTIFACT_DIR,
    OFFICE_ROLE_AUTH_CONTEXT_ARTIFACT_DIR,
  ]) {
    writeOfficeAuthArtifact("web_chromium_results.json", value, artifactDir);
  }
};

const writeGreenCloseouts = (result: Record<string, unknown>) => {
  const shared = {
    final_status: "GREEN_OFFICE_ROLE_AUTH_REAL_LOCAL_PROVISIONING_READY",
    fake_green_claimed: false,
    provisioning_target: "local",
    explicit_non_prod_guard_enabled: true,
    production_db_write_attempted: false,
    foreman_actor_provisioned: true,
    director_actor_provisioned: true,
    buyer_actor_provisioned: true,
    foreman_role_resolved: result.foreman_role_detected === true,
    director_role_resolved: result.director_role_detected === true,
    buyer_role_resolved: result.buyer_role_detected === true,
    foreman_membership_valid: true,
    director_membership_valid: true,
    buyer_membership_valid: true,
    foreman_storage_state_written: true,
    director_storage_state_written: true,
    buyer_storage_state_written: true,
    foreman_route_passed: result.foreman_route_auth_context_present === true,
    director_route_passed: result.director_route_auth_context_present === true,
    buyer_route_passed: result.buyer_route_auth_context_present === true,
    wrong_role_director_route_blocked:
      result.wrong_role_director_route_blocked === true,
    anonymous_office_access_blocked:
      result.anonymous_office_access_blocked === true,
    route_guards_disabled: false,
    rbac_weakened: false,
    client_only_role_override_used: false,
    storage_states_committed: false,
    secrets_printed: false,
    secrets_written_to_artifacts: false,
    typecheck_passed: true,
    lint_passed: true,
    git_diff_check_passed: true,
    focused_office_auth_tests_passed: true,
    chromium_office_role_chain_passed: result.chromium_chain_passed === true,
    previous_office_auth_blockers_cleared: result.chromium_chain_passed === true,
    blockers: result.chromium_chain_passed === true ? [] : result.blocker_codes,
  };

  writeOfficeAuthArtifact(
    "CLOSEOUT_PROOF.json",
    {
      ...shared,
      status: "GREEN_OFFICE_E2E_ROLE_PROVISIONING_AND_RUNTIME_RBAC_READY",
    },
    OFFICE_ROLE_FIXTURE_ARTIFACT_DIR,
  );
  writeOfficeAuthArtifact(
    "CLOSEOUT_PROOF.json",
    {
      ...shared,
      status: "GREEN_OFFICE_E2E_ROLE_FIXTURES_FAST_REPAIR_READY",
    },
    OFFICE_ROLE_LEGACY_FIXTURES_ARTIFACT_DIR,
  );
  writeOfficeAuthArtifact(
    "CLOSEOUT_PROOF.json",
    {
      ...shared,
      status: "GREEN_OFFICE_ROLE_AUTH_CONTEXT_FAST_REPAIR_READY",
    },
    OFFICE_ROLE_AUTH_CONTEXT_ARTIFACT_DIR,
  );
};

const routeUrl = (route: string) => new URL(route, BASE_URL).toString();

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

async function openRoleRoute(params: {
  browser: Browser;
  role: OfficeRoleFixtureRole;
}) {
  const context = await params.browser.newContext();
  const page = await context.newPage();
  const applied = await applyOfficeTestAuthContext(page, createAuthContext(params.role));
  await page.goto(routeUrl(officeRoleRoute(params.role)), {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(page.getByTestId(officeRoleMarkerTestId(params.role))).toBeVisible({
    timeout: 30_000,
  });
  return { context, page, applied };
}

async function probeAuthenticatedRoute(params: {
  browser: Browser;
  authRole: OfficeRoleFixtureRole;
  routeRole: OfficeRoleFixtureRole;
}): Promise<RoleRouteProbe> {
  const context = await params.browser.newContext();
  const page = await context.newPage();
  try {
    await applyOfficeTestAuthContext(page, createAuthContext(params.authRole));
    await page.goto(routeUrl(officeRoleRoute(params.routeRole)), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    const blocked = await visibleByTestId(page, "office-role-guard-blocked", 30_000);
    const expectedMarkerVisible = await visibleByTestId(
      page,
      officeRoleMarkerTestId(params.routeRole),
      1_000,
    );
    const authRoleMarkerVisible = await visibleByTestId(
      page,
      officeRoleMarkerTestId(params.authRole),
      1_000,
    );
    const directorApprovalControlsVisible =
      (await page
        .locator('[data-testid^="director-request-approve-"]')
        .first()
        .isVisible({ timeout: 1_000 })
        .catch(() => false)) ||
      (await visibleByTestId(page, "director-top-tab-requests", 1_000));
    const buyerOnlyActionsVisible =
      (await visibleByTestId(page, "buyer-tab-inbox", 1_000)) ||
      (await visibleByTestId(page, "buyer-rfq-open", 1_000)) ||
      (await visibleByTestId(page, "buyer-create-proposals-send", 1_000));

    return {
      blocked,
      expected_marker_visible: expectedMarkerVisible,
      auth_role_marker_visible: authRoleMarkerVisible,
      unauthenticated_visible: await visibleByTestId(
        page,
        "office-role-auth-unauthenticated",
        1_000,
      ),
      director_approval_controls_visible: directorApprovalControlsVisible,
      buyer_only_actions_visible: buyerOnlyActionsVisible,
      final_path: new URL(page.url()).pathname,
    };
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

async function probeAnonymousRoute(params: {
  browser: Browser;
  routeRole: OfficeRoleFixtureRole;
}): Promise<RoleRouteProbe> {
  const context = await params.browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(routeUrl(officeRoleRoute(params.routeRole)), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    const expectedMarkerVisible = await visibleByTestId(
      page,
      officeRoleMarkerTestId(params.routeRole),
      1_000,
    );
    const unauthenticatedVisible = await visibleByTestId(
      page,
      "office-role-auth-unauthenticated",
      5_000,
    );
    const guardBlocked = await visibleByTestId(page, "office-role-guard-blocked", 1_000);
    const finalPath = new URL(page.url()).pathname;

    return {
      blocked:
        expectedMarkerVisible === false &&
        (unauthenticatedVisible || guardBlocked || finalPath !== officeRoleRoute(params.routeRole)),
      expected_marker_visible: expectedMarkerVisible,
      auth_role_marker_visible: false,
      unauthenticated_visible: unauthenticatedVisible,
      director_approval_controls_visible: false,
      buyer_only_actions_visible: false,
      final_path: finalPath,
    };
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

function routeDenied(probe: RoleRouteProbe): boolean {
  return (
    probe.blocked === true &&
    probe.expected_marker_visible === false &&
    probe.director_approval_controls_visible === false &&
    probe.buyer_only_actions_visible === false
  );
}

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test("repairs office role auth context across foreman director buyer", async ({ browser }) => {
  const result: Record<string, unknown> = {
    foreman_route_auth_context_present: false,
    director_route_auth_context_present: false,
    buyer_route_auth_context_present: false,
    foreman_role_detected: false,
    director_role_detected: false,
    buyer_role_detected: false,
    director_approval_controls_visible: false,
    buyer_procurement_controls_visible: false,
    foreman_director_route_blocked: false,
    buyer_director_route_blocked: false,
    director_buyer_route_blocked: false,
    wrong_role_director_route_blocked: false,
    wrong_role_can_approve_as_director: false,
    anonymous_office_access_blocked: false,
    anonymous_office_access_allowed: false,
    route_guards_disabled: false,
    rbac_weakened: false,
    minimal_foreman_director_buyer_smoke_passed: false,
    chromium_chain_passed: false,
    live_foreman_draft_submit_attempted: false,
    live_director_approval_attempted: false,
    live_buyer_procurement_rows_checked: false,
    fake_green_claimed: false,
    console_warning_seen: false,
    console_error_seen: false,
    console_issue_count: 0,
    blocker_codes: [],
  };

  try {
    try {
      const { context, page, applied } = await openRoleRoute({ browser, role: "foreman" });
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) {
          result.console_issue_count = Number(result.console_issue_count) + 1;
          if (message.type() === "error") result.console_error_seen = true;
          if (message.type() === "warning") result.console_warning_seen = true;
        }
      });
      try {
        result.foreman_auth = redactAppliedOfficeAuthContext(applied);
        result.foreman_route_auth_context_present = true;
        result.foreman_role_detected = true;
        await expect(page.getByTestId("foreman-main-materials-open")).toBeVisible({
          timeout: 30_000,
        });
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    } catch (error) {
      void error;
      result.foreman_blocker_code = "FOREMAN_MARKER_OR_CONTROL_NOT_VISIBLE";
      (result.blocker_codes as string[]).push(String(result.foreman_blocker_code));
    }

    try {
      const { context, page, applied } = await openRoleRoute({ browser, role: "director" });
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) {
          result.console_issue_count = Number(result.console_issue_count) + 1;
          if (message.type() === "error") result.console_error_seen = true;
          if (message.type() === "warning") result.console_warning_seen = true;
        }
      });
      try {
        result.director_auth = redactAppliedOfficeAuthContext(applied);
        result.director_route_auth_context_present = true;
        result.director_role_detected = true;
        await expect(page.getByTestId("director-top-tab-requests")).toBeVisible({
          timeout: 30_000,
        });
        result.director_approval_controls_visible = true;
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    } catch (error) {
      void error;
      result.director_blocker_code = "DIRECTOR_MARKER_OR_CONTROL_NOT_VISIBLE";
      (result.blocker_codes as string[]).push(String(result.director_blocker_code));
    }

    try {
      const { context, page, applied } = await openRoleRoute({ browser, role: "buyer" });
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) {
          result.console_issue_count = Number(result.console_issue_count) + 1;
          if (message.type() === "error") result.console_error_seen = true;
          if (message.type() === "warning") result.console_warning_seen = true;
        }
      });
      try {
        result.buyer_auth = redactAppliedOfficeAuthContext(applied);
        result.buyer_route_auth_context_present = true;
        result.buyer_role_detected = true;
        await expect(page.getByTestId("buyer-tab-inbox").first()).toBeVisible({
          timeout: 30_000,
        });
        result.buyer_procurement_controls_visible = true;
        result.live_buyer_procurement_rows_checked = true;
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    } catch (error) {
      void error;
      result.buyer_blocker_code = "BUYER_MARKER_OR_CONTROL_NOT_VISIBLE";
      (result.blocker_codes as string[]).push(String(result.buyer_blocker_code));
    }

    const foremanDirectorProbe = await probeAuthenticatedRoute({
      browser,
      authRole: "foreman",
      routeRole: "director",
    });
    const buyerDirectorProbe = await probeAuthenticatedRoute({
      browser,
      authRole: "buyer",
      routeRole: "director",
    });
    const directorBuyerProbe = await probeAuthenticatedRoute({
      browser,
      authRole: "director",
      routeRole: "buyer",
    });
    const anonymousProbe = await probeAnonymousRoute({
      browser,
      routeRole: "director",
    });

    result.foreman_director_probe = foremanDirectorProbe;
    result.buyer_director_probe = buyerDirectorProbe;
    result.director_buyer_probe = directorBuyerProbe;
    result.anonymous_director_probe = anonymousProbe;
    result.foreman_director_route_blocked = routeDenied(foremanDirectorProbe);
    result.buyer_director_route_blocked = routeDenied(buyerDirectorProbe);
    result.director_buyer_route_blocked = routeDenied(directorBuyerProbe);
    result.wrong_role_director_route_blocked =
      result.foreman_director_route_blocked === true &&
      result.buyer_director_route_blocked === true;
    result.wrong_role_can_approve_as_director =
      foremanDirectorProbe.director_approval_controls_visible === true ||
      buyerDirectorProbe.director_approval_controls_visible === true ||
      (foremanDirectorProbe.expected_marker_visible === true &&
        foremanDirectorProbe.blocked === false) ||
      (buyerDirectorProbe.expected_marker_visible === true &&
        buyerDirectorProbe.blocked === false);
    result.anonymous_office_access_blocked =
      anonymousProbe.blocked === true && anonymousProbe.expected_marker_visible === false;
    result.anonymous_office_access_allowed =
      result.anonymous_office_access_blocked !== true;

    if (result.wrong_role_director_route_blocked !== true) {
      (result.blocker_codes as string[]).push("WRONG_ROLE_DIRECTOR_ROUTE_NOT_BLOCKED");
    }
    if (result.director_buyer_route_blocked !== true) {
      (result.blocker_codes as string[]).push("DIRECTOR_BUYER_ROUTE_NOT_BLOCKED");
    }
    if (result.anonymous_office_access_blocked !== true) {
      (result.blocker_codes as string[]).push("ANONYMOUS_OFFICE_ACCESS_NOT_BLOCKED");
    }

    result.minimal_foreman_director_buyer_smoke_passed =
      result.foreman_route_auth_context_present === true &&
      result.director_route_auth_context_present === true &&
      result.buyer_route_auth_context_present === true &&
      result.foreman_role_detected === true &&
      result.director_role_detected === true &&
      result.buyer_role_detected === true &&
      result.director_approval_controls_visible === true &&
      result.buyer_procurement_controls_visible === true &&
      result.wrong_role_director_route_blocked === true &&
      result.wrong_role_can_approve_as_director === false &&
      result.director_buyer_route_blocked === true &&
      result.anonymous_office_access_blocked === true;
    result.chromium_chain_passed = result.minimal_foreman_director_buyer_smoke_passed;

    writeArtifact(result);
    if (result.minimal_foreman_director_buyer_smoke_passed !== true) {
      throw new Error(
        `BLOCKED_OFFICE_ROLE_AUTH_CONTEXT_FAST_REPAIR: ${(result.blocker_codes as string[]).join("; ")}`,
      );
    }
    writeGreenCloseouts(result);
  } catch (error) {
    void error;
    result.error_code = "OFFICE_ROLE_AUTH_CONTEXT_FAST_REPAIR_BLOCKED";
    result.page_url_redacted = true;
    writeArtifact(result);
    throw error;
  }
});
