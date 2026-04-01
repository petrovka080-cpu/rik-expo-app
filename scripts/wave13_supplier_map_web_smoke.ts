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
const admin = createVerifierAdmin("wave13-supplier-map-web-smoke");
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

const smokeArtifact = path.join(projectRoot, "artifacts/wave13-supplier-map-web-smoke.json");
const smokeProofArtifact = path.join(projectRoot, "artifacts/wave13-supplier-map-web-smoke.md");
const webArtifactBase = "artifacts/wave13-supplier-map-web-smoke";
const webServerStdoutPath = path.join(projectRoot, "artifacts/wave13-supplier-map-web.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts/wave13-supplier-map-web.stderr.log");

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
    "wave13-supplier-map-web:web-server-ready",
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
        "x-client-info": "wave13-supplier-map-web-smoke",
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

    await runtimeSession.page.goto(`${baseUrl}/supplierMap`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await poll(
      "wave13-supplier-map-web:route-open",
      async () => (runtimeSession.page.url().includes("/supplierMap") ? true : null),
      45_000,
      500,
    );

    await poll(
      "wave13-supplier-map-web:no-screen-error",
      async () => {
        const count = await runtimeSession.page.locator('[data-testid="screen-error-fallback"]').count();
        return count === 0 ? true : null;
      },
      45_000,
      500,
    );

    await poll(
      "wave13-supplier-map-web:leaflet-css",
      async () => {
        const href = await runtimeSession.page
          .locator("#leaflet-css-cdn")
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
        return href.some((value) => value.includes("leaflet@1.9.4/dist/leaflet.css")) ? true : null;
      },
      45_000,
      500,
    );

    await poll(
      "wave13-supplier-map-web:leaflet-mounted",
      async () => {
        const count = await runtimeSession.page.locator(".leaflet-container").count();
        return count > 0 ? true : null;
      },
      45_000,
      500,
    );

    const relevantBadResponses = runtimeSession.runtime.badResponses.filter(
      (response) => !response.url.includes("tile.openstreetmap.org"),
    );

    return {
      status:
        runtimeSession.runtime.pageErrors.length === 0 && relevantBadResponses.length === 0
          ? "GREEN"
          : "NOT_GREEN",
      finalUrl: runtimeSession.page.url(),
      routeOpened: runtimeSession.page.url().includes("/supplierMap"),
      screenErrorBoundaryShown: false,
      leafletCssInjected: true,
      leafletMapMounted: true,
      runtime: runtimeSession.runtime,
      relevantBadResponses,
      webServerStarted: webServer.started,
      failureArtifacts: null,
    };
  } catch (error) {
    const currentBody = await bodyText(runtimeSession.page).catch(() => "");
    const failureArtifacts = await captureWebFailureArtifact(runtimeSession.page, webArtifactBase);
    return {
      status: "NOT_GREEN",
      finalUrl: runtimeSession.page.url(),
      routeOpened: runtimeSession.page.url().includes("/supplierMap"),
      screenErrorBoundaryShown:
        (await runtimeSession.page.locator('[data-testid="screen-error-fallback"]').count().catch(() => 0)) > 0,
      leafletCssInjected:
        (await runtimeSession.page.locator("#leaflet-css-cdn").count().catch(() => 0)) > 0,
      leafletMapMounted:
        (await runtimeSession.page.locator(".leaflet-container").count().catch(() => 0)) > 0,
      runtime: runtimeSession.runtime,
      relevantBadResponses: runtimeSession.runtime.badResponses.filter(
        (response) => !response.url.includes("tile.openstreetmap.org"),
      ),
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
      role: "buyer",
      fullName: "Wave 13 Supplier Map Smoke",
      emailPrefix: "wave13-supplier-map-smoke",
    });

    const result = await runSmoke(user);
    writeJsonArtifact(smokeArtifact, result);
    fs.writeFileSync(
      smokeProofArtifact,
      [
        "**Wave 13 Supplier Map Web Smoke**",
        "",
        `- status: ${result.status}`,
        `- finalUrl: ${result.finalUrl}`,
        `- routeOpened: ${String(result.routeOpened)}`,
        `- screenErrorBoundaryShown: ${String(result.screenErrorBoundaryShown)}`,
        `- leafletCssInjected: ${String(result.leafletCssInjected)}`,
        `- leafletMapMounted: ${String(result.leafletMapMounted)}`,
        `- relevantBadResponseCount: ${String(result.relevantBadResponses?.length ?? 0)}`,
        `- webServerStartedByVerifier: ${String(result.webServerStarted)}`,
      ].join("\n"),
      "utf8",
    );

    if (result.status !== "GREEN") {
      throw new Error(result.error ?? "wave13 supplier map web smoke failed");
    }
  } finally {
    await cleanupTempUser(admin, user);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
