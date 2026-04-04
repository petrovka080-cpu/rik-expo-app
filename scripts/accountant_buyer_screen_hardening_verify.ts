import * as path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  baseUrl,
  bodyText,
  captureWebFailureArtifact,
  launchWebRuntime,
  poll,
  writeJsonArtifact,
} from "./_shared/webRuntimeHarness";
import { cleanupTempUser, createTempUser, createVerifierAdmin, type RuntimeTestUser } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("accountant-buyer-screen-hardening-verify");
const artifactPath = path.join(projectRoot, "artifacts", "accountant-buyer-screen-hardening-web-proof.json");
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
})();
const supabaseStorageKey = `sb-${supabaseProjectRef}-auth-token`;

type FlowProof = {
  role: "accountant" | "buyer";
  route: string;
  opened: boolean;
  interactive: boolean;
  closedCleanly: boolean;
  consoleErrorsEmpty: boolean;
  pageErrorsEmpty: boolean;
  badResponsesEmpty: boolean;
  bodySample: string;
  screenshot: string | null;
  failureArtifact?: {
    screenshot: string;
    html: string;
  } | null;
};

const blockingConsoleErrors = (entries: { type: string; text: string }[]) =>
  entries.filter((entry) => entry.type === "error");

async function signInSession(user: RuntimeTestUser) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "accountant-buyer-screen-hardening-signin",
      },
    },
  });

  const result = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }

  return result.data.session;
}

async function openRoleRoute(page: import("playwright").Page, route: string, user: RuntimeTestUser) {
  const session = await signInSession(user);
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: supabaseStorageKey,
      value: JSON.stringify(session),
    },
  );
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
}

async function maybeConfirmBuyerFio(page: import("playwright").Page) {
  const input = page.getByTestId("warehouse-fio-input").first();
  if ((await input.count()) === 0) return false;
  if (!(await input.isVisible().catch(() => false))) return false;

  await input.fill("Buyer Screen Verify");
  const confirm = page.getByTestId("warehouse-fio-confirm").first();
  await confirm.click();
  await poll(
    "buyer-fio-confirmed",
    async () => {
      const count = await page.getByTestId("warehouse-fio-input").count().catch(() => 0);
      return count === 0 ? true : null;
    },
    20_000,
    250,
  );
  return true;
}

async function maybeConfirmAccountantFio(page: import("playwright").Page) {
  const input = page.getByTestId("warehouse-fio-input").first();
  if ((await input.count()) === 0) return false;
  if (!(await input.isVisible().catch(() => false))) return false;

  await input.fill("Accountant Screen Verify");
  const confirm = page.getByTestId("warehouse-fio-confirm").first();
  await confirm.click();
  await poll(
    "accountant-fio-confirmed",
    async () => {
      const count = await page.getByTestId("warehouse-fio-input").count().catch(() => 0);
      return count === 0 ? true : null;
    },
    20_000,
    250,
  );
  return true;
}

async function proveAccountantFlow(user: RuntimeTestUser): Promise<FlowProof> {
  const { browser, page, runtime } = await launchWebRuntime();
  const screenshot = "artifacts/accountant-screen-hardening-web-proof.png";

  try {
    await openRoleRoute(page, "/accountant", user);
    await maybeConfirmAccountantFio(page).catch(() => false);

    await poll(
      "accountant-screen-open",
      async () => {
        const body = await bodyText(page);
        return body.includes("Бухгалтер") && /Сч[её]т/i.test(body) ? true : null;
      },
      30_000,
      250,
    );

    const row = page.getByText(/Сч[её]т/i).first();
    await row.click();

    await poll(
      "accountant-card-open",
      async () => {
        const body = await bodyText(page);
        return body.includes("Карточка предложения") ? true : null;
      },
      20_000,
      250,
    );

    const closeButton = page.getByLabel("Закрыть").first();
    await closeButton.click();

    await poll(
      "accountant-card-close",
      async () => {
        const body = await bodyText(page);
        return body.includes("Карточка предложения") ? null : true;
      },
      20_000,
      250,
    );

    await page.screenshot({ path: screenshot, fullPage: true });
    const body = await bodyText(page);

    return {
      role: "accountant",
      route: `${baseUrl}/accountant`,
      opened: true,
      interactive: true,
      closedCleanly: true,
      consoleErrorsEmpty: blockingConsoleErrors(runtime.console).length === 0,
      pageErrorsEmpty: runtime.pageErrors.length === 0,
      badResponsesEmpty: runtime.badResponses.filter((entry) => !entry.url.includes("/favicon")).length === 0,
      bodySample: body.slice(0, 320),
      screenshot,
      failureArtifact: null,
    };
  } catch {
    const failureArtifact = await captureWebFailureArtifact(page, "artifacts/accountant-screen-hardening-web-failure");
    const body = await bodyText(page).catch(() => "");
    return {
      role: "accountant",
      route: `${baseUrl}/accountant`,
      opened: false,
      interactive: false,
      closedCleanly: false,
      consoleErrorsEmpty: blockingConsoleErrors(runtime.console).length === 0,
      pageErrorsEmpty: runtime.pageErrors.length === 0,
      badResponsesEmpty: runtime.badResponses.filter((entry) => !entry.url.includes("/favicon")).length === 0,
      bodySample: body.slice(0, 320),
      screenshot: null,
      failureArtifact,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function proveBuyerFlow(user: RuntimeTestUser): Promise<FlowProof> {
  const { browser, page, runtime } = await launchWebRuntime();
  const screenshot = "artifacts/buyer-screen-hardening-web-proof.png";

  try {
    await openRoleRoute(page, "/buyer", user);

    await maybeConfirmBuyerFio(page).catch(() => false);

    await poll(
      "buyer-screen-open",
      async () => {
        const body = await bodyText(page);
        return body.includes("Снабженец") && /REQ-[A-Z0-9_-]+\/\d{4}/i.test(body) ? true : null;
      },
      45_000,
      250,
    );

    const searchInput = page.locator('input[placeholder]').first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill("REQ");
      await searchInput.fill("");
    }

    const row = page.getByText(/REQ-[A-Z0-9_-]+\/\d{4}/i).first();
    await row.click();

    await poll(
      "buyer-sheet-open",
      async () => {
        const body = await bodyText(page);
        return /Свернуть/i.test(body) ? true : null;
      },
      20_000,
      250,
    );

    const closeButton = page.getByText(/Свернуть/i).first();
    await closeButton.click();

    await poll(
      "buyer-sheet-close",
      async () => {
        const body = await bodyText(page);
        return /Свернуть/i.test(body) ? null : true;
      },
      20_000,
      250,
    );

    await page.screenshot({ path: screenshot, fullPage: true });
    const body = await bodyText(page);

    return {
      role: "buyer",
      route: `${baseUrl}/buyer`,
      opened: true,
      interactive: true,
      closedCleanly: true,
      consoleErrorsEmpty: blockingConsoleErrors(runtime.console).length === 0,
      pageErrorsEmpty: runtime.pageErrors.length === 0,
      badResponsesEmpty: runtime.badResponses.filter((entry) => !entry.url.includes("/favicon")).length === 0,
      bodySample: body.slice(0, 320),
      screenshot,
      failureArtifact: null,
    };
  } catch {
    const failureArtifact = await captureWebFailureArtifact(page, "artifacts/buyer-screen-hardening-web-failure");
    const body = await bodyText(page).catch(() => "");
    return {
      role: "buyer",
      route: `${baseUrl}/buyer`,
      opened: false,
      interactive: false,
      closedCleanly: false,
      consoleErrorsEmpty: blockingConsoleErrors(runtime.console).length === 0,
      pageErrorsEmpty: runtime.pageErrors.length === 0,
      badResponsesEmpty: runtime.badResponses.filter((entry) => !entry.url.includes("/favicon")).length === 0,
      bodySample: body.slice(0, 320),
      screenshot: null,
      failureArtifact,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main() {
  let accountantUser: RuntimeTestUser | null = null;
  let buyerUser: RuntimeTestUser | null = null;

  try {
    if (!supabaseUrl || !anonKey || !supabaseProjectRef) {
      throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
    }

    accountantUser = await createTempUser(admin, {
      role: "accountant",
      fullName: "Accountant Screen Verify",
      emailPrefix: "accountant.screen.verify",
    });
    buyerUser = await createTempUser(admin, {
      role: "buyer",
      fullName: "Buyer Screen Verify",
      emailPrefix: "buyer.screen.verify",
    });

    const accountant = await proveAccountantFlow(accountantUser);
    const buyer = await proveBuyerFlow(buyerUser);

    const summary = {
      status:
        accountant.opened &&
        accountant.interactive &&
        accountant.closedCleanly &&
        accountant.consoleErrorsEmpty &&
        accountant.pageErrorsEmpty &&
        accountant.badResponsesEmpty &&
        buyer.opened &&
        buyer.interactive &&
        buyer.closedCleanly &&
        buyer.consoleErrorsEmpty &&
        buyer.pageErrorsEmpty &&
        buyer.badResponsesEmpty
          ? "GREEN"
          : "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      accountant,
      buyer,
    };

    writeJsonArtifact(artifactPath, summary);
    console.log(JSON.stringify(summary, null, 2));
    if (summary.status !== "GREEN") process.exitCode = 1;
  } finally {
    await cleanupTempUser(admin, accountantUser);
    await cleanupTempUser(admin, buyerUser);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
