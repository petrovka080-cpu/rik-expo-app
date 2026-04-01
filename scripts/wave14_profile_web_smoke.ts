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
const admin = createVerifierAdmin("wave14-profile-web-smoke");
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

const smokeArtifact = path.join(projectRoot, "artifacts/wave14-profile-web-smoke.json");
const smokeProofArtifact = path.join(projectRoot, "artifacts/wave14-profile-web-smoke.md");
const webArtifactBase = "artifacts/wave14-profile-web-smoke";
const webServerStdoutPath = path.join(projectRoot, "artifacts/wave14-profile-web.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts/wave14-profile-web.stderr.log");

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
    "wave14-profile-web:web-server-ready",
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

async function signInSession(user: RuntimeTestUser) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "wave14-profile-web-smoke",
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

async function clickVisibleText(
  page: Awaited<ReturnType<typeof launchWebRuntime>>["page"],
  label: string,
) {
  const locator = page.getByText(label, { exact: true }).last();
  await locator.waitFor({ state: "visible", timeout: 30_000 });
  await locator.click({ force: true });
}

async function waitForLatestText(
  page: Awaited<ReturnType<typeof launchWebRuntime>>["page"],
  label: string,
  state: "visible" | "hidden",
) {
  const locator = page.getByText(label, { exact: true }).last();
  await locator.waitFor({ state, timeout: 30_000 });
}

async function runSmoke(user: RuntimeTestUser) {
  const webServer = await ensureLocalWebServer();
  const runtimeSession = await launchWebRuntime();

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

    await runtimeSession.page.goto(`${baseUrl}/profile`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await poll(
      "wave14-profile-web:route-open",
      async () => (runtimeSession.page.url().includes("/profile") ? true : null),
      45_000,
      500,
    );

    await poll(
      "wave14-profile-web:profile-shell",
      async () => {
        const body = await bodyText(runtimeSession.page);
        return body.includes("Профиль") && body.includes("Информация") ? true : null;
      },
      45_000,
      500,
    );

    await poll(
      "wave14-profile-web:no-screen-error",
      async () => {
        const count = await runtimeSession.page.locator('[data-testid="screen-error-fallback"]').count();
        return count === 0 ? true : null;
      },
      45_000,
      500,
    );

    await poll(
      "wave14-profile-web:person-overview-actions",
      async () => {
        const completionCount = await runtimeSession.page.locator('[data-testid="profile-person-completion-action"]').count();
        const companyCardCount = await runtimeSession.page.locator('[data-testid="profile-company-card"]').count();
        return completionCount > 0 && companyCardCount > 0 ? true : null;
      },
      45_000,
      500,
    );

    await runtimeSession.page.locator('[data-testid="profile-edit-open"]').click({ force: true });
    await waitForLatestText(runtimeSession.page, "Редактировать профиль", "visible");
    await runtimeSession.page.getByText("Выбрать фото", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await clickVisibleText(runtimeSession.page, "Отмена");
    await runtimeSession.page.getByText("Выбрать фото", { exact: true }).waitFor({ state: "hidden", timeout: 30_000 });

    await runtimeSession.page.locator('[data-testid="profile-listing-open"]').click({ force: true });
    await waitForLatestText(runtimeSession.page, "Новое объявление", "visible");
    await runtimeSession.page.getByText("Опубликовать", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await clickVisibleText(runtimeSession.page, "Отмена");
    await runtimeSession.page.getByText("Опубликовать", { exact: true }).waitFor({ state: "hidden", timeout: 30_000 });

    await runtimeSession.page.locator('[data-testid="profile-company-card"]').click({ force: true });
    await waitForLatestText(runtimeSession.page, "Регистрация компании", "visible");
    await runtimeSession.page.getByText("Далее", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await clickVisibleText(runtimeSession.page, "Отмена");
    await runtimeSession.page.getByText("Далее", { exact: true }).waitFor({ state: "hidden", timeout: 30_000 });

    return {
      status:
        runtimeSession.runtime.pageErrors.length === 0 && runtimeSession.runtime.badResponses.length === 0
          ? "GREEN"
          : "NOT_GREEN",
      finalUrl: runtimeSession.page.url(),
      routeOpened: runtimeSession.page.url().includes("/profile"),
      personOverviewVisible: true,
      editModalProof: true,
      listingModalProof: true,
      companyCardProof: true,
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
      routeOpened: runtimeSession.page.url().includes("/profile"),
      personOverviewVisible:
        (await runtimeSession.page.locator('[data-testid="profile-person-completion-action"]').count().catch(() => 0)) > 0,
      editModalProof: false,
      listingModalProof: false,
      companyCardProof:
        (await runtimeSession.page.locator('[data-testid="profile-company-card"]').count().catch(() => 0)) > 0,
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
      fullName: "Wave 14 Profile Smoke",
      emailPrefix: "wave14-profile-smoke",
    });

    const result = await runSmoke(user);
    writeJsonArtifact(smokeArtifact, result);
    fs.writeFileSync(
      smokeProofArtifact,
      [
        "**Wave 14 Profile Web Smoke**",
        "",
        `- status: ${result.status}`,
        `- finalUrl: ${result.finalUrl}`,
        `- routeOpened: ${String(result.routeOpened)}`,
        `- personOverviewVisible: ${String(result.personOverviewVisible)}`,
        `- editModalProof: ${String(result.editModalProof)}`,
        `- listingModalProof: ${String(result.listingModalProof)}`,
        `- companyCardProof: ${String(result.companyCardProof)}`,
        `- webServerStartedByVerifier: ${String(result.webServerStarted)}`,
      ].join("\n"),
      "utf8",
    );

    if (result.status !== "GREEN") {
      throw new Error(result.error ?? "wave14 profile web smoke failed");
    }
  } finally {
    await cleanupTempUser(admin, user);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
