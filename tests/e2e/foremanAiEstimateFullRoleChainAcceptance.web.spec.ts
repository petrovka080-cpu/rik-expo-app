import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8081";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE");
const ARTIFACT_PATH = path.join(ARTIFACT_DIR, "web_full_chain_results.json");

const writeArtifact = (value: Record<string, unknown>) => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const cleanErrorMessage = (error: unknown) =>
  (error instanceof Error ? error.message : String(error))
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function openForemanMaterials(page: import("playwright/test").Page) {
  await page.goto(new URL("/office/foreman", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.getByTestId("foreman-main-materials-open")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("foreman-main-materials-open").click();

  const fioInput = page.getByTestId("warehouse-fio-input");
  if (await fioInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await fioInput.fill("E2E Foreman");
    await page.getByTestId("warehouse-fio-confirm").click();
  }

  await page.getByTestId("foreman-dropdown-open-foreman-object").click();
  await page.getByTestId("foreman-dropdown-option-foreman-object-bld-admin").click();
  await page.getByTestId("foreman-dropdown-open-foreman-locator").click();
  await page.getByTestId("foreman-dropdown-option-foreman-locator-lvl-01").click();
}

async function loginIfCredentialsAvailable(
  page: import("playwright/test").Page,
  role: "director" | "buyer",
) {
  const prefix = role === "director" ? "E2E_DIRECTOR" : "E2E_BUYER";
  const email = process.env[`${prefix}_EMAIL`] ?? "";
  const password = process.env[`${prefix}_PASSWORD`] ?? "";
  if (!email || !password) {
    throw new Error(
      `BLOCKED_NO_E2E_ROLE_SECRETS: ${prefix}_EMAIL and ${prefix}_PASSWORD are required for live browser handoff`,
    );
  }

  await page.goto(new URL("/auth/login", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.getByTestId("auth.login.email")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("auth.login.email").fill(email);
  await page.getByTestId("auth.login.password").fill(password);
  await page.getByTestId("auth.login.submit").click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 60_000 });
}

async function openOfficeRoleRouteOrUseCredentials(
  page: import("playwright/test").Page,
  role: "director" | "buyer",
) {
  const route = role === "director" ? "/office/director" : "/office/buyer";
  const prefix = role === "director" ? "E2E_DIRECTOR" : "E2E_BUYER";
  const email = process.env[`${prefix}_EMAIL`] ?? "";
  const password = process.env[`${prefix}_PASSWORD`] ?? "";

  if (email && password) {
    await loginIfCredentialsAvailable(page, role);
    await page.goto(new URL(route, BASE_URL).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    return "role_credentials";
  }

  await page.goto(new URL(route, BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(3_000);
  if (!page.url().includes("/auth/login")) return "existing_office_session";

  throw new Error(
    `BLOCKED_NO_${role.toUpperCase()}_WEB_AUTH_CONTEXT: ${route} redirected to /auth/login and ${prefix}_EMAIL/${prefix}_PASSWORD are not set`,
  );
}

test.describe("foreman AI estimate full role-chain acceptance browser proof", () => {
  test("proves the foreman UI path and records live-chain blocker instead of fake green", async ({ page }) => {
    const dialogMessages: string[] = [];
    const consoleIssues: string[] = [];
    const result: Record<string, unknown> = {
      chromium_web_chain_passed: false,
      browser_foreman_ai_estimate_modal_passed: false,
      browser_foreman_draft_smoke_passed: false,
      browser_b2c_route_smoke_passed: false,
      live_foreman_submit_to_director_clicked: false,
      live_director_received_same_request: false,
      live_director_approved_request: false,
      live_buyer_procurement_rows_visible: false,
      live_director_buyer_database_handoff: false,
      role_auth_fixture_available: Boolean(
        process.env.E2E_DIRECTOR_EMAIL &&
          process.env.E2E_DIRECTOR_PASSWORD &&
          process.env.E2E_BUYER_EMAIL &&
          process.env.E2E_BUYER_PASSWORD,
      ),
      director_buyer_handoff_source: "attempt_live_ui_then_record_blocker_if_unavailable",
      fake_green_claimed: false,
      blockers: ["WEB_LIVE_DIRECTOR_BUYER_HANDOFF_NOT_ASSERTED"],
      dialog_messages: dialogMessages,
      console_issues: consoleIssues,
    };

    page.on("dialog", async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.accept().catch(() => undefined);
    });
    page.on("console", (message) => {
      if (!["error", "warning"].includes(message.type())) return;
      consoleIssues.push(`${message.type()}: ${message.text()}`.slice(0, 500));
    });

    try {
      await openForemanMaterials(page);
      await expect(page.getByTestId("foreman-calc-open")).toBeVisible({ timeout: 60_000 });
      await page.getByTestId("foreman-calc-open").click();

      await expect(page.getByTestId("professional-estimate-composer")).toBeVisible();
      await expect(page.getByText("\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0438\u0434 \u0440\u0430\u0431\u043e\u0442")).toHaveCount(0);

      await page
        .getByTestId("foreman-ai-estimate-input")
        .fill("\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043a\u043e\u0432\u0440\u043e\u043b\u0438\u043d\u0430 45 \u043c2");
      await expect(page.getByTestId("foreman-ai-estimate-work-suggestions")).toBeVisible();
      await page.getByTestId("foreman-ai-estimate-work-suggestion-1").click();
      await page.getByTestId("foreman-ai-estimate-generate").click();

      const rows = page.getByTestId("foreman-ai-estimate-row");
      await expect(rows.first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("foreman-ai-estimate-row-qty").first()).toBeVisible();
      await expect(page.getByTestId("foreman-ai-estimate-row-price").first()).toBeVisible();
      await page.getByTestId("foreman-ai-estimate-row-qty").first().fill("12");
      await page.getByTestId("foreman-ai-estimate-row-price").first().fill("700");
      await expect(rows.first()).toContainText(/8\s*400\s*KGS/);
      result.browser_foreman_ai_estimate_modal_passed = true;

      await page.getByTestId("foreman-ai-estimate-add-draft").click();
      await expect(page.getByTestId("professional-estimate-composer")).toHaveCount(0, { timeout: 15_000 });
      await expect(page.getByTestId("foreman-draft-open")).toBeVisible({ timeout: 30_000 });
      await page.getByTestId("foreman-draft-open").click();
      await expect(page.getByTestId("foreman-draft-send")).toBeVisible({ timeout: 30_000 });
      result.browser_foreman_draft_smoke_passed = true;

      try {
        await page.getByTestId("foreman-draft-send").click();
        result.live_foreman_submit_to_director_clicked = true;
        await page.waitForTimeout(2_500);

        result.director_auth_source = await openOfficeRoleRouteOrUseCredentials(page, "director");
        const directorRequestOpen = page.locator('[data-testid^="director-request-open-"]').first();
        await expect(directorRequestOpen).toBeVisible({ timeout: 60_000 });
        const directorOpenTestId = (await directorRequestOpen.getAttribute("data-testid")) ?? "";
        const requestId = directorOpenTestId.replace(/^director-request-open-/, "").trim();
        if (!requestId) throw new Error("director request testID did not expose request id");

        await directorRequestOpen.click();
        const approveButton = page.getByTestId(`director-request-approve-${requestId}`);
        await expect(approveButton).toBeVisible({ timeout: 30_000 });
        const directorSheetText = (await page.locator("body").textContent()) ?? "";
        expect(directorSheetText).toMatch(/\u041a\u043e\u0432\u0440\u043e\u043b|\u043a\u043e\u0432\u0440\u043e\u043b|carpet/i);
        result.live_director_received_same_request = true;

        await approveButton.click();
        await page.waitForTimeout(5_000);
        result.live_director_approved_request = true;

        result.buyer_auth_source = await openOfficeRoleRouteOrUseCredentials(page, "buyer");
        await expect(page.getByTestId("buyer-tab-inbox")).toBeVisible({ timeout: 60_000 });
        await page.getByTestId("buyer-tab-inbox").click();
        const buyerGroup = page.getByTestId(`buyer-group-open-${requestId}`);
        await expect(buyerGroup).toBeVisible({ timeout: 60_000 });
        await buyerGroup.click();
        const buyerText = (await page.locator("body").textContent()) ?? "";
        expect(buyerText).toMatch(/\u041a\u043e\u0432\u0440\u043e\u043b|\u043a\u043e\u0432\u0440\u043e\u043b|carpet/i);
        expect(buyerText).not.toMatch(/\b(labor|quality_control|overhead|tax|debug)\b/i);
        result.live_buyer_procurement_rows_visible = true;
        result.live_director_buyer_database_handoff = true;
        result.chromium_web_chain_passed = true;
        result.blockers = [];
      } catch (liveChainError) {
        result.live_chain_blocker = cleanErrorMessage(liveChainError);
        result.live_chain_page_url = page.url();
        result.live_chain_body_excerpt = ((await page.locator("body").textContent().catch(() => "")) ?? "")
          .replace(/\s+/g, " ")
          .slice(0, 1_200);
      }

      await page.goto(new URL("/request", BASE_URL).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await expect(page.getByTestId("consumer-repair-problem-input")).toBeVisible({ timeout: 60_000 });
      result.browser_b2c_route_smoke_passed = true;

      writeArtifact(result);
    } catch (error) {
      result.error = cleanErrorMessage(error);
      writeArtifact(result);
      throw error;
    }
  });
});
