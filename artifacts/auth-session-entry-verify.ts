import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

import { createAndroidHarness } from "../scripts/_shared/androidHarness";
import {
  baseUrl,
  captureWebFailureArtifact,
  launchWebRuntime,
  poll,
} from "../scripts/_shared/webRuntimeHarness";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "../scripts/_shared/testUserDiscipline";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("auth-session-entry-verify");
const runtimeJsonPath = path.join(projectRoot, "artifacts", "auth-session-entry-runtime.json");
const webStdoutPath = path.join(projectRoot, "artifacts", "auth-session-web.stdout.log");
const webStderrPath = path.join(projectRoot, "artifacts", "auth-session-web.stderr.log");

const androidHarness = createAndroidHarness({
  projectRoot,
  devClientPort: Number(process.env.AUTH_SESSION_ANDROID_DEV_PORT ?? "8085"),
  devClientStdoutPath: "artifacts/auth-session-android.stdout.log",
  devClientStderrPath: "artifacts/auth-session-android.stderr.log",
});

const loginNeedle = /Email|Пароль|password|Войти|Login/i;
const profileNeedle = /Профиль|profile/i;
const interestingEvents = new Set([
  "login_submit_started",
  "login_submit_success",
  "login_submit_degraded_timeout",
  "login_post_auth_session_settle_start",
  "login_post_auth_session_settle_result",
  "login_session_present_after_signin",
  "login_post_auth_route_decision",
  "auth_session_read_start",
  "auth_session_read_result",
  "auth_restore_result",
  "auth_state_change_event",
  "route_resolution_result",
  "post_auth_route_decision",
  "auth_gate_session_settle_start",
  "auth_gate_session_settle_result",
  "auth_gate_login_redirect_suppressed",
  "auth_gate_login_redirect",
  "auth_gate_transient_no_session",
  "auth_gate_degraded_path",
  "first_usable_ui_ready",
]);

type RuntimeEventSummary = {
  screen: string;
  surface: string;
  event: string;
  result: string;
  errorStage: string | null;
  errorMessage: string | null;
  extra: Record<string, unknown>;
};

type VerificationResult = {
  status: "GREEN" | "NOT_GREEN";
  finalUrl?: string;
  finalBodySnippet?: string;
  returnedToLogin?: boolean;
  finalScreenHasProfile?: boolean;
  finalScreenHasLogin?: boolean;
  authMarkers: RuntimeEventSummary[];
  error?: string;
  artifacts?: Record<string, unknown>;
  badResponses?: Array<{ url: string; status: number; method?: string }>;
  pageErrors?: string[];
  devClientLogTail?: string[];
};

function writeJsonArtifact(fullPath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function stopProcessTree(child: { pid?: number; exitCode: number | null; kill: (signal?: NodeJS.Signals) => boolean }) {
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
    const response = await fetch(baseUrl, {
      method: "GET",
      signal: AbortSignal.timeout(4_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureLocalWebServer() {
  if (await isWebServerReady()) {
    return {
      started: false,
      stop: () => undefined,
    };
  }

  fs.mkdirSync(path.dirname(webStdoutPath), { recursive: true });
  fs.writeFileSync(webStdoutPath, "", "utf8");
  fs.writeFileSync(webStderrPath, "", "utf8");

  const child = spawn("cmd.exe", ["/c", "npx", "expo", "start", "--web", "-c"], {
    cwd: projectRoot,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(webStdoutPath, String(chunk));
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(webStderrPath, String(chunk));
  });

  await poll(
    "auth-session:web-server-ready",
    async () => {
      if (child.exitCode != null) {
        const stderr = fs.existsSync(webStderrPath) ? fs.readFileSync(webStderrPath, "utf8") : "";
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

function summarizeEvents(events: Array<Record<string, unknown>>): RuntimeEventSummary[] {
  return events
    .filter((event) => interestingEvents.has(String(event.event ?? "")))
    .map((event) => ({
      screen: String(event.screen ?? ""),
      surface: String(event.surface ?? ""),
      event: String(event.event ?? ""),
      result: String(event.result ?? ""),
      errorStage: event.errorStage == null ? null : String(event.errorStage),
      errorMessage: event.errorMessage == null ? null : String(event.errorMessage),
      extra:
        event.extra && typeof event.extra === "object"
          ? (event.extra as Record<string, unknown>)
          : {},
    }));
}

function trimBody(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 400);
}

async function captureWebMarkers(page: Awaited<ReturnType<typeof launchWebRuntime>>["page"]) {
  const rawEvents = await page.evaluate(() => {
    const root = globalThis as typeof globalThis & {
      __RIK_PLATFORM_OBSERVABILITY__?: { events?: Array<Record<string, unknown>> };
    };
    return root.__RIK_PLATFORM_OBSERVABILITY__?.events ?? [];
  });
  return summarizeEvents(rawEvents);
}

async function verifyWeb(user: RuntimeTestUser): Promise<VerificationResult> {
  const webServer = await ensureLocalWebServer();
  const { browser, context, page, runtime } = await launchWebRuntime();

  try {
    await page.goto(`${baseUrl}/auth/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.locator('input[placeholder="Email"]').waitFor({
      state: "visible",
      timeout: 60_000,
    });
    await page.locator('input[placeholder="Email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('div[tabindex="0"]').filter({ hasText: /^Войти$/ }).first().click();

    await poll(
      "auth-session:web-submit-fired",
      async () => {
        const markers = await captureWebMarkers(page);
        return markers.some((marker) => marker.event === "login_submit_started")
          ? true
          : null;
      },
      10_000,
      250,
    );

    await poll(
      "auth-session:web-post-login",
      async () => {
        const body = await page.evaluate(() => document.body.innerText || "");
        if (!page.url().includes("/auth/login") && profileNeedle.test(body)) {
          return true;
        }
        return null;
      },
      45_000,
      500,
    );

    await page.waitForTimeout(4_000);

    const finalBody = await page.evaluate(() => document.body.innerText || "");
    const markers = await captureWebMarkers(page);

    return {
      status:
        !page.url().includes("/auth/login") && profileNeedle.test(finalBody)
          ? "GREEN"
          : "NOT_GREEN",
      finalUrl: page.url(),
      finalBodySnippet: trimBody(finalBody),
      returnedToLogin: page.url().includes("/auth/login"),
      authMarkers: markers,
      badResponses: runtime.badResponses,
      pageErrors: runtime.pageErrors,
    };
  } catch (error) {
    const finalBody = await page.evaluate(() => document.body.innerText || "").catch(() => "");
    const markers = await captureWebMarkers(page).catch(() => []);
    const artifacts = await captureWebFailureArtifact(
      page,
      path.join(projectRoot, "artifacts", "auth-session-web"),
    );

    return {
      status: "NOT_GREEN",
      finalUrl: page.url(),
      finalBodySnippet: trimBody(finalBody),
      returnedToLogin: page.url().includes("/auth/login"),
      authMarkers: markers,
      error: error instanceof Error ? error.message : String(error),
      artifacts,
      badResponses: runtime.badResponses,
      pageErrors: runtime.pageErrors,
    };
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    webServer.stop();
  }
}

function filterAndroidLogTail(fullText: string): string[] {
  return fullText
    .split(/\r?\n/)
    .filter(
      (line) =>
        /platform\.observability/i.test(line) &&
        /(auth_session_gate|auth_login|startup_bootstrap)/i.test(line),
    )
    .slice(-60);
}

function dismissAndroidDevMenuIntroIfPresent() {
  const screen = androidHarness.dumpAndroidScreen("auth-session-android-preflight");
  if (!androidHarness.isAndroidDevMenuIntroScreen(screen.xml)) {
    return;
  }
  const nodes = androidHarness.parseAndroidNodes(screen.xml);
  const continueNode = nodes.find(
    (node) =>
      node.clickable &&
      node.enabled &&
      /Continue/i.test(`${node.text} ${node.contentDesc}`),
  );
  if (continueNode?.bounds) {
    androidHarness.tapAndroidBounds(continueNode.bounds);
  } else {
    androidHarness.pressAndroidKey(4);
  }
}

async function normalizeAndroidSurface(packageName: string | null) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const screen = androidHarness.dumpAndroidScreen(
      `auth-session-android-normalize-${attempt + 1}`,
    );

    if (loginNeedle.test(screen.xml) || profileNeedle.test(screen.xml)) {
      return screen;
    }

    if (androidHarness.isAndroidDevMenuIntroScreen(screen.xml)) {
      const nodes = androidHarness.parseAndroidNodes(screen.xml);
      const continueNode = nodes.find((node) => /Continue/i.test(`${node.text} ${node.contentDesc}`));
      if (continueNode?.bounds) {
        androidHarness.tapAndroidBounds(continueNode.bounds);
      } else {
        androidHarness.pressAndroidKey(4);
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      continue;
    }

    if (androidHarness.isAndroidFullDevMenuScreen(screen.xml)) {
      androidHarness.pressAndroidKey(4);
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      continue;
    }

    androidHarness.startAndroidRouteSafe(packageName, "rik://profile");
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }

  return androidHarness.dumpAndroidScreen("auth-session-android-normalize-final");
}

async function verifyAndroid(user: RuntimeTestUser): Promise<VerificationResult> {
  await androidHarness.prepareAndroidRuntime({ clearApp: true, clearGms: false });
  const packageName = androidHarness.detectAndroidPackage();

  try {
    await new Promise((resolve) => setTimeout(resolve, 6_000));
    androidHarness.startAndroidRouteSafe(packageName, "rik://profile");
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    dismissAndroidDevMenuIntroIfPresent();
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await normalizeAndroidSurface(packageName);

    let screen: { xml: string } | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        screen = await androidHarness.loginAndroidWithProtectedRoute({
          packageName,
          user,
          protectedRoute: "rik://profile",
          artifactBase: `auth-session-android-${attempt + 1}`,
          successPredicate: (xml) => !loginNeedle.test(xml) && profileNeedle.test(xml),
          renderablePredicate: (xml) => loginNeedle.test(xml) || profileNeedle.test(xml),
          loginScreenPredicate: (xml) => loginNeedle.test(xml),
        });
        break;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 8_000));
      }
    }

    if (!screen) {
      throw lastError ?? new Error("android login did not settle");
    }

    await new Promise((resolve) => setTimeout(resolve, 4_000));
    const finalScreen = androidHarness.dumpAndroidScreen("auth-session-android-final");
    const stdoutPath = androidHarness.getDevClientLogPaths().stdoutPath;
    const stdoutText = fs.existsSync(stdoutPath) ? fs.readFileSync(stdoutPath, "utf8") : "";

    return {
      status:
        !loginNeedle.test(finalScreen.xml) && profileNeedle.test(finalScreen.xml)
          ? "GREEN"
          : "NOT_GREEN",
      finalScreenHasProfile: profileNeedle.test(finalScreen.xml),
      finalScreenHasLogin: loginNeedle.test(finalScreen.xml),
      authMarkers: [],
      devClientLogTail: filterAndroidLogTail(stdoutText),
    };
  } catch (error) {
    const artifacts = androidHarness.captureFailureArtifacts("auth-session-android-failure");
    const stdoutText = fs.existsSync(artifacts.stdoutPath)
      ? fs.readFileSync(artifacts.stdoutPath, "utf8")
      : "";

    return {
      status: "NOT_GREEN",
      finalScreenHasProfile: false,
      finalScreenHasLogin: false,
      authMarkers: [],
      error: error instanceof Error ? error.message : String(error),
      artifacts,
      devClientLogTail: filterAndroidLogTail(stdoutText),
    };
  }
}

async function main() {
  let user: RuntimeTestUser | null = null;

  try {
    user = await createTempUser(admin, {
      role: "buyer",
      fullName: "Auth Session Verify",
      emailPrefix: "auth-session-verify",
    });

    const web = await verifyWeb(user);
    const android = await verifyAndroid(user);

    const result = {
      at: new Date().toISOString(),
      baseUrl,
      user: {
        email: user.email,
        role: user.role,
      },
      web,
      android,
      overallStatus:
        web.status === "GREEN" && android.status === "GREEN" ? "GREEN" : "NOT_GREEN",
    };

    writeJsonArtifact(runtimeJsonPath, result);
    console.log(JSON.stringify(result, null, 2));

    if (result.overallStatus !== "GREEN") {
      process.exitCode = 1;
    }
  } finally {
    await cleanupTempUser(admin, user);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
