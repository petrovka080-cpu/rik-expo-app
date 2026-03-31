import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";

import { baseUrl, poll } from "./_shared/webRuntimeHarness";
import { cleanupTempUser, createTempUser, createVerifierAdmin } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("director-dev-local-access-bootstrap");
const artifactPath = path.join(projectRoot, "artifacts/director-dev-local-access.json");
const failureHtmlPath = path.join(projectRoot, "artifacts/director-dev-local-access-failure.html");
const failureScreenshotPath = path.join(projectRoot, "artifacts/director-dev-local-access-failure.png");
const webServerStdoutPath = path.join(projectRoot, "artifacts/director-dev-local-access-web.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts/director-dev-local-access-web.stderr.log");
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

type WebServerHandle = {
  started: boolean;
  stop: () => void;
};

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

const DIRECTOR_TEXT = {
  header: ["Контроль", "РљРѕРЅС‚СЂРѕР»СЊ"],
  financeTab: ["Финансы", "Р¤РёРЅР°РЅСЃС‹"],
  debtCard: ["Обязательства", "РћР±СЏР·Р°С‚РµР»СЊСЃС‚РІР°"],
};

function writeJsonArtifact(payload: unknown) {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeBodyText(value: string) {
  return String(value || "").replace(/[\u00A0\u202F]/g, " ").replace(/\s+/g, " ").trim();
}

function includesAnyLabel(source: string, labels: string[]) {
  return labels.some((label) => source.includes(label));
}

async function bodyText(page: Page) {
  return normalizeBodyText(await page.evaluate(() => document.body.innerText || ""));
}

async function findVisibleText(page: Page, labels: string[]) {
  const locator = page.getByText(new RegExp(labels.map(escapeRegex).join("|"), "i"));
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  return null;
}

async function captureFailureState(page: Page | null) {
  if (!page) {
    return {
      currentUrl: null,
      bodySample: "",
      screenshot: null,
      html: null,
    };
  }

  const currentUrl = page.url();
  const bodySample = (await bodyText(page).catch(() => "")).slice(0, 800);
  await page.screenshot({ path: failureScreenshotPath, fullPage: true }).catch(() => undefined);
  const html = await page.content().catch(() => "");
  fs.writeFileSync(failureHtmlPath, html, "utf8");

  return {
    currentUrl,
    bodySample,
    screenshot: failureScreenshotPath.replace(/\\/g, "/"),
    html: failureHtmlPath.replace(/\\/g, "/"),
  };
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
    return {
      started: false,
      stop: () => {},
    };
  }

  fs.mkdirSync(path.dirname(webServerStdoutPath), { recursive: true });
  fs.writeFileSync(webServerStdoutPath, "", "utf8");
  fs.writeFileSync(webServerStderrPath, "", "utf8");

  const child = spawn(
    "cmd.exe",
    ["/c", "npx", "expo", "start", "--web", "-c"],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(webServerStdoutPath, String(chunk));
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(webServerStderrPath, String(chunk));
  });

  await poll(
    "director-dev-local-access-web-server-ready",
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
    stop: () => {
      stopProcessTree(child);
    },
  };
}

async function signInSession(email: string, password: string) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "director-dev-local-access-bootstrap-signin",
      },
    },
  });

  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${email}`);
  }
  return result.data.session;
}

async function main() {
  if (!supabaseUrl || !anonKey || !supabaseProjectRef) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  let user: Awaited<ReturnType<typeof createTempUser>> | null = null;
  let webServer: WebServerHandle | null = null;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  let page: Page | null = null;

  try {
    webServer = await ensureLocalWebServer();
    user = await createTempUser(admin, {
      role: "director",
      fullName: "Director Dev Local Access",
      emailPrefix: "director-dev-local-access",
    });

    const session = await signInSession(user.email, user.password);
    const headless = String(process.env.RIK_DEV_ACCESS_HEADLESS ?? "").trim() === "1";
    const autoCloseMs = Number(process.env.RIK_DEV_ACCESS_AUTO_CLOSE_MS ?? (headless ? "2000" : "0"));

    browser = await chromium.launch({ headless });
    page = await browser.newPage();

    await page.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: supabaseStorageKey,
        value: JSON.stringify(session),
      },
    );

    await page.goto(`${baseUrl}/director`, { waitUntil: "networkidle", timeout: 60_000 });

    const mountedBody = await poll(
      "director-dev-local-access-mounted",
      async () => {
        const currentUrl = page.url();
        const currentBody = await bodyText(page);
        if (
          !currentUrl.includes("/auth/login") &&
          (includesAnyLabel(currentBody, DIRECTOR_TEXT.header) ||
            includesAnyLabel(currentBody, DIRECTOR_TEXT.financeTab) ||
            includesAnyLabel(currentBody, DIRECTOR_TEXT.debtCard))
        ) {
          return currentBody;
        }
        return null;
      },
      45_000,
      500,
    );

    const financeTab =
      (await page.getByTestId("director-top-tab-finance").first().isVisible().catch(() => false))
        ? page.getByTestId("director-top-tab-finance").first()
        : (await findVisibleText(page, DIRECTOR_TEXT.financeTab)) ??
          (await poll(
            "director-dev-local-access-finance-tab",
            async () => {
              const byTestId = page.getByTestId("director-top-tab-finance").first();
              if (await byTestId.isVisible().catch(() => false)) {
                return byTestId;
              }
              return (await findVisibleText(page, DIRECTOR_TEXT.financeTab)) ?? null;
            },
            20_000,
            250,
          ));

    const debtCardVisibleBeforeClick = Boolean(await findVisibleText(page, DIRECTOR_TEXT.debtCard));

    if (!debtCardVisibleBeforeClick) {
      await financeTab.click({ force: true });
    }

    const debtCard = await poll(
      "director-dev-local-access-debt-card",
      async () => (await findVisibleText(page, DIRECTOR_TEXT.debtCard)) ?? null,
      45_000,
      250,
    );

    const artifact = {
      status: "READY",
      checkedAt: new Date().toISOString(),
      baseUrl,
      route: "/director",
      headless,
      currentUrl: page.url(),
      mountedBodySample: mountedBody.slice(0, 400),
      financeTabClicked: !debtCardVisibleBeforeClick,
      screenOpened: await debtCard.isVisible().catch(() => false),
      user: {
        email: user.email,
        password: user.password,
        id: user.id,
        role: user.role,
      },
      notes: {
        cleanupBehavior: headless || autoCloseMs > 0 ? "auto_cleanup_after_close" : "cleanup_when_process_exits",
        productionRbacChanged: false,
        backendAuthBypassed: false,
      },
    };
    writeJsonArtifact(artifact);
    console.log(JSON.stringify(artifact, null, 2));

    if (autoCloseMs > 0) {
      await page.waitForTimeout(autoCloseMs);
      return;
    }

    await new Promise<void>((resolve) => {
      const finish = () => resolve();
      browser?.on("disconnected", finish);
      process.once("SIGINT", finish);
      process.once("SIGTERM", finish);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "unknown error");
    const diagnostics = await captureFailureState(page);
    writeJsonArtifact({
      status: "FAILED",
      checkedAt: new Date().toISOString(),
      baseUrl,
      route: "/director",
      error: message,
      diagnostics,
      user: user
        ? {
            email: user.email,
            id: user.id,
            role: user.role,
          }
        : null,
    });
    throw error;
  } finally {
    await browser?.close().catch(() => {});
    await cleanupTempUser(admin, user);
    webServer?.stop();
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  console.error(message);
  process.exitCode = 1;
});
