import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";

import { baseUrl, poll } from "./_shared/webRuntimeHarness";
import { cleanupTempUser, createTempUser, createVerifierAdmin } from "./_shared/testUserDiscipline";
import { shouldEnforceClientRoleRedirect } from "../src/lib/authRouting";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("local-role-screen-access-verify");
const smokePath = path.join(projectRoot, "artifacts/local-role-screen-access-proof.json");
const proofPath = path.join(projectRoot, "artifacts/local-role-screen-access-proof.md");
const webServerStdoutPath = path.join(projectRoot, "artifacts/local-role-screen-access-web.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts/local-role-screen-access-web.stderr.log");

const routes = ["/director", "/buyer", "/accountant", "/warehouse", "/contractor", "/profile"] as const;

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

function writeJsonArtifact(fullPath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function normalizeBodyText(value: string) {
  return String(value || "").replace(/[\u00A0\u202F]/g, " ").replace(/\s+/g, " ").trim();
}

async function bodyText(page: Page) {
  return normalizeBodyText(await page.evaluate(() => document.body.innerText || ""));
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
    "local-role-screen-access-web-server-ready",
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
        "x-client-info": "local-role-screen-access-verify-signin",
      },
    },
  });

  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${email}`);
  }
  return result.data.session;
}

function pathFromUrl(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

async function verifyRoute(page: Page, route: typeof routes[number]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
  const settled = await poll(
    `local-role-screen-route:${route}`,
    async () => {
      const currentUrl = page.url();
      if (currentUrl.includes("/auth/login")) return null;
      const text = await bodyText(page);
      return text.length > 0
        ? {
            currentUrl,
            currentPath: pathFromUrl(currentUrl),
            bodySample: text.slice(0, 280),
          }
        : null;
    },
    45_000,
    500,
  );

  return {
    route,
    finalUrl: settled.currentUrl,
    finalPath: settled.currentPath,
    redirected: settled.currentPath !== route,
    openedInLocalDev: settled.currentPath === route,
    bodySample: settled.bodySample,
  };
}

function evaluateRedirectPolicyProof() {
  const runtime = globalThis as typeof globalThis & { __DEV__?: unknown };
  const previousDev = runtime.__DEV__;

  runtime.__DEV__ = true;
  const devResult = shouldEnforceClientRoleRedirect();

  runtime.__DEV__ = false;
  const productionLikeResult = shouldEnforceClientRoleRedirect();

  runtime.__DEV__ = previousDev;

  return {
    devDisablesRoleRedirect: devResult === false,
    productionPreservesRoleRedirect: productionLikeResult === true,
  };
}

async function main() {
  if (!supabaseUrl || !anonKey || !supabaseProjectRef) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  let user: Awaited<ReturnType<typeof createTempUser>> | null = null;
  let webServer: WebServerHandle | null = null;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    webServer = await ensureLocalWebServer();
    user = await createTempUser(admin, {
      role: "foreman",
      fullName: "Local Role Access Verify",
      emailPrefix: "local-role-access-verify",
    });

    const session = await signInSession(user.email, user.password);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: supabaseStorageKey,
        value: JSON.stringify(session),
      },
    );

    const routeResults = [] as Array<Awaited<ReturnType<typeof verifyRoute>>>;
    for (const route of routes) {
      routeResults.push(await verifyRoute(page, route));
    }

    const redirectPolicy = evaluateRedirectPolicyProof();
    const payload = {
      status:
        routeResults.every((item) => item.openedInLocalDev)
        && redirectPolicy.devDisablesRoleRedirect
        && redirectPolicy.productionPreservesRoleRedirect
          ? "GREEN"
          : "NOT_GREEN",
      checkedAt: new Date().toISOString(),
      baseUrl,
      authenticatedUser: {
        role: user.role,
        email: user.email,
      },
      routes: routeResults,
      redirectPolicy,
    };

    writeJsonArtifact(smokePath, payload);
    fs.writeFileSync(
      proofPath,
      [
        "# Local Role Screen Access Proof",
        "",
        "## Result",
        `- Status: \`${payload.status}\``,
        `- Base URL: \`${baseUrl}\``,
        `- Authenticated role used for proof: \`${user.role}\``,
        "",
        "## Local/dev route checks",
        ...routeResults.map(
          (item) =>
            `- \`${item.route}\` -> \`${item.finalPath}\` | redirected=${item.redirected ? "true" : "false"} | opened=${item.openedInLocalDev ? "true" : "false"}`,
        ),
        "",
        "## Redirect policy",
        `- devDisablesRoleRedirect = ${redirectPolicy.devDisablesRoleRedirect ? "true" : "false"}`,
        `- productionPreservesRoleRedirect = ${redirectPolicy.productionPreservesRoleRedirect ? "true" : "false"}`,
      ].join("\n"),
      "utf8",
    );

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await browser?.close().catch(() => {});
    await cleanupTempUser(admin, user);
    webServer?.stop();
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  writeJsonArtifact(smokePath, {
    status: "FAILED",
    checkedAt: new Date().toISOString(),
    baseUrl,
    error: message,
  });
  console.error(message);
  process.exitCode = 1;
});
