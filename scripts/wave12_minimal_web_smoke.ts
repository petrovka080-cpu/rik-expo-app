import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import {
  baseUrl,
  bodyText,
  captureWebFailureArtifact,
  launchWebRuntime,
  poll,
  writeJsonArtifact,
} from "./_shared/webRuntimeHarness";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("wave12-minimal-web-smoke");
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

const smokeArtifact = path.join(projectRoot, "artifacts/wave12-minimal-web-smoke.json");
const smokeProofArtifact = path.join(projectRoot, "artifacts/wave12-minimal-web-smoke.md");
const webArtifactBase = "artifacts/wave12-minimal-web-smoke";
const webServerStdoutPath = path.join(projectRoot, "artifacts/wave12-minimal-web.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts/wave12-minimal-web.stderr.log");

type WebServerHandle = {
  started: boolean;
  stop: () => void;
};

function stopProcessTree(child: {
  pid?: number;
  exitCode: number | null;
  kill: (signal?: NodeJS.Signals) => boolean;
}) {
  if (child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

async function isWebServerReady() {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureLocalWebServer(): Promise<WebServerHandle> {
  if (await isWebServerReady()) {
    return { started: false, stop: () => {} };
  }

  fs.mkdirSync(path.dirname(webServerStdoutPath), { recursive: true });
  fs.writeFileSync(webServerStdoutPath, "", "utf8");
  fs.writeFileSync(webServerStderrPath, "", "utf8");

  const child = spawn("cmd.exe", ["/c", "npx", "expo", "start", "--web", "-c"], {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(webServerStdoutPath, String(chunk));
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(webServerStderrPath, String(chunk));
  });

  await poll(
    "wave12-minimal-web:web-server-ready",
    async () => {
      if (child.exitCode != null) {
        const stderr = fs.existsSync(webServerStderrPath)
          ? fs.readFileSync(webServerStderrPath, "utf8")
          : "";
        throw new Error(`expo web server exited early (${child.exitCode}): ${stderr}`);
      }
      return (await isWebServerReady()) ? true : null;
    },
    240_000,
    1_000,
  );

  return {
    started: true,
    stop: () => stopProcessTree(child),
  };
}

async function waitForDialogState(
  page: Awaited<ReturnType<typeof launchWebRuntime>>["page"],
  state: "visible" | "hidden",
) {
  const locator = page.locator('[role="dialog"]').last();
  if (state === "visible") {
    await locator.waitFor({ state: "visible", timeout: 30_000 });
    return;
  }
  await poll(
    "wave12-minimal-web:dialog-hidden",
    async () => ((await page.locator('[role="dialog"]').count()) === 0 ? true : null),
    30_000,
    250,
  );
}

async function clickCancel(page: Awaited<ReturnType<typeof launchWebRuntime>>["page"]) {
  const dialog = page.locator('[role="dialog"]').last();
  const focusableActions = dialog.locator('[tabindex="0"]');
  const count = await focusableActions.count();
  if (count < 2) {
    throw new Error(`Expected cancel/save actions inside active dialog, found ${count}`);
  }
  await focusableActions.nth(count - 2).click({ force: true });
}

async function waitForTestId(
  page: Awaited<ReturnType<typeof launchWebRuntime>>["page"],
  testId: string,
) {
  const selector = `[data-testid="${testId}"]`;
  await poll(
    `wave12-minimal-web:${testId}`,
    async () => ((await page.locator(selector).count()) > 0 ? true : null),
    45_000,
    500,
  );
}

async function waitForAddListingFlowClosed(
  page: Awaited<ReturnType<typeof launchWebRuntime>>["page"],
) {
  await poll(
    "wave12-minimal-web:add-listing-closed",
    async () => {
      const ownerShellCount = await page.locator('[data-testid="add-listing-owner-shell"]').count();
      return ownerShellCount === 0 || !page.url().includes("/add") ? true : null;
    },
    30_000,
    500,
  );
}

async function signInSession(user: RuntimeTestUser) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "wave12-minimal-web-smoke",
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

async function runSmoke(user: RuntimeTestUser) {
  const webServer = await ensureLocalWebServer();
  const runtimeSession = await launchWebRuntime();
  let profileRouteOpened = false;
  let editModalProof = false;
  let listingModalProof = false;

  try {
    const session = await signInSession(user);
    await runtimeSession.page.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: supabaseStorageKey,
        value: JSON.stringify(session),
      },
    );

    await runtimeSession.page.goto(`${baseUrl}/profile`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForTestId(runtimeSession.page, "profile-edit-open");
    profileRouteOpened = runtimeSession.page.url().includes("/profile");

    await runtimeSession.page.locator('[data-testid="profile-edit-open"]').click({ force: true });
    await waitForDialogState(runtimeSession.page, "visible");
    await clickCancel(runtimeSession.page);
    await waitForDialogState(runtimeSession.page, "hidden");
    editModalProof = true;

    await runtimeSession.page.locator('[data-testid="profile-open-add-listing"]').click({ force: true });
    await waitForTestId(runtimeSession.page, "add-listing-owner-shell");
    await runtimeSession.page.locator('[data-testid="add-listing-flow-close"]').click({ force: true });
    await waitForAddListingFlowClosed(runtimeSession.page);
    listingModalProof = true;

    return {
      status:
        profileRouteOpened &&
        editModalProof &&
        listingModalProof &&
        runtimeSession.runtime.pageErrors.length === 0 && runtimeSession.runtime.badResponses.length === 0
          ? "GREEN"
          : "NOT_GREEN",
      finalUrl: runtimeSession.page.url(),
      routeOpened: profileRouteOpened,
      editModalProof,
      listingModalProof,
      runtime: runtimeSession.runtime,
      webServerStarted: webServer.started,
      failureArtifacts: null,
    };
  } catch (error) {
    const currentBody = await bodyText(runtimeSession.page).catch(() => "");
    const failureArtifacts = await captureWebFailureArtifact(runtimeSession.page, webArtifactBase);
    return {
      status: "NOT_GREEN",
      finalUrl: runtimeSession.page.url(),
      routeOpened: profileRouteOpened,
      editModalProof,
      listingModalProof,
      runtime: runtimeSession.runtime,
      webServerStarted: webServer.started,
      error: error instanceof Error ? error.message : String(error),
      bodySample: currentBody.slice(0, 400),
      failureArtifacts,
    };
  } finally {
    await runtimeSession.browser.close().catch(() => undefined);
    webServer.stop();
  }
}

async function main() {
  let user: RuntimeTestUser | null = null;
  try {
    user = await createTempUser(admin, {
      role: "foreman",
      fullName: "Wave 12 Minimal Smoke",
      emailPrefix: "wave12-minimal-smoke",
    });

    const result = await runSmoke(user);
    writeJsonArtifact(smokeArtifact, result);
    fs.writeFileSync(
      smokeProofArtifact,
      [
        "**Wave 12 Minimal Web Smoke**",
        "",
        `- status: ${result.status}`,
        `- finalUrl: ${result.finalUrl}`,
        `- routeOpened: ${String(result.routeOpened)}`,
        `- editModalProof: ${String(result.editModalProof)}`,
        `- listingModalProof: ${String(result.listingModalProof)}`,
        `- webServerStartedByVerifier: ${String(result.webServerStarted)}`,
      ].join("\n"),
      "utf8",
    );

    if (result.status !== "GREEN") {
      throw new Error(result.error ?? "wave12 minimal web smoke failed");
    }
  } finally {
    await cleanupTempUser(admin, user);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
