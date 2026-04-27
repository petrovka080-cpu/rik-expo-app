import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";

import { createAndroidHarness } from "./_shared/androidHarness";
import {
  baseUrl,
  captureWebFailureArtifact,
  poll,
} from "./_shared/webRuntimeHarness";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("wave4-profile-stabilization-verify");
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

const runtimeArtifact = path.join(projectRoot, "artifacts/wave4-profile-runtime.json");
const proofArtifact = path.join(projectRoot, "artifacts/wave4-profile-runtime.md");
const webArtifactBase = "artifacts/wave4-profile-web";
const androidArtifactBase = "artifacts/wave4-profile-android";
const webServerStdoutPath = path.join(projectRoot, "artifacts/wave4-profile-web.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts/wave4-profile-web.stderr.log");

const androidHarness = createAndroidHarness({
  projectRoot,
  devClientPort: Number(process.env.PROFILE_ANDROID_DEV_PORT ?? "8082"),
  devClientStdoutPath: "artifacts/wave4-profile-android.stdout.log",
  devClientStderrPath: "artifacts/wave4-profile-android.stderr.log",
});

type WebServerHandle = {
  started: boolean;
  stop: () => void;
};

function writeJsonArtifact(fullPath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
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
    "wave4-profile:web-server-ready",
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

async function signInSession(email: string, password: string) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "wave4-profile-stabilization-verify",
      },
    },
  });

  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${email}`);
  }
  return result.data.session;
}

async function bodyText(page: Page) {
  return page.evaluate(() => document.body.innerText || "");
}

async function clickVisibleText(page: Page, label: string) {
  const locator = page.getByText(label, { exact: true }).first();
  await locator.waitFor({ state: "visible", timeout: 30_000 });
  await locator.click({ force: true });
}

async function waitForLatestText(
  page: Page,
  label: string,
  state: "visible" | "hidden",
) {
  const locator = page.getByText(label, { exact: true }).last();
  await locator.waitFor({ state, timeout: 30_000 });
}

async function verifyWeb(user: RuntimeTestUser) {
  const webServer = await ensureLocalWebServer();
  const session = await signInSession(user.email, user.password);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const runtime = {
    console: [] as Array<{ type: string; text: string }>,
    pageErrors: [] as string[],
    badResponses: [] as Array<{ url: string; status: number }>,
  };

  page.on("console", (message) => runtime.console.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => runtime.pageErrors.push(String(error?.message ?? error)));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      runtime.badResponses.push({ url: response.url(), status: response.status() });
    }
  });

  try {
    await page.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: supabaseStorageKey,
        value: JSON.stringify(session),
      },
    );

    await page.goto(`${baseUrl}/profile`, { waitUntil: "networkidle", timeout: 60_000 });
    await poll(
      "wave4-profile:web-ready",
      async () => {
        const text = await bodyText(page);
        return text.includes("Профиль") ? true : null;
      },
      45_000,
      500,
    );

    await page.locator('[data-testid="profile-edit-open"]').click({ force: true });
    await waitForLatestText(page, "Редактировать профиль", "visible");
    await page.getByText("Выбрать фото", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await clickVisibleText(page, "Отмена");
    await page.getByText("Выбрать фото", { exact: true }).waitFor({ state: "hidden", timeout: 30_000 });

    await page.locator('[data-testid="profile-listing-open"]').click({ force: true });
    await waitForLatestText(page, "Новое объявление", "visible");
    await page.getByText("Опубликовать", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await clickVisibleText(page, "Отмена");
    await page.getByText("Опубликовать", { exact: true }).waitFor({ state: "hidden", timeout: 30_000 });

    await page.locator('[data-testid="profile-company-card"]').click({ force: true });
    await waitForLatestText(page, "Регистрация компании", "visible");
    await page.getByText("Далее", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await clickVisibleText(page, "Отмена");
    await page.getByText("Далее", { exact: true }).waitFor({ state: "hidden", timeout: 30_000 });

    return {
      status: runtime.pageErrors.length === 0 ? "GREEN" : "NOT_GREEN",
      finalUrl: page.url(),
      runtime,
      artifacts: null,
    };
  } catch (error) {
    const artifacts = await captureWebFailureArtifact(page, webArtifactBase);
    return {
      status: "NOT_GREEN",
      finalUrl: page.url(),
      runtime,
      error: error instanceof Error ? error.message : String(error),
      artifacts,
    };
  } finally {
    await browser.close().catch(() => undefined);
    webServer.stop();
  }
}

type AndroidNode = {
  text: string;
  contentDesc: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  bounds: string;
  hint: string;
};

const androidTextRe = {
  authMissing: /Auth session missing!/i,
  profile: /Профиль|РџСЂРѕС„РёР»СЊ/i,
  editProfile: /Редактировать профиль|Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ РїСЂРѕС„РёР»СЊ/i,
  newListing: /Новое объявление|РќРѕРІРѕРµ РѕР±СЉСЏРІР»РµРЅРёРµ/i,
  companyWizard: /Регистрация компании|Р РµРіРёСЃС‚СЂР°С†РёСЏ РєРѕРјРїР°РЅРёРё/i,
  login: /Войти|Login|Р’РѕР№С‚Рё/i,
};

function findAndroidNode(
  nodes: AndroidNode[],
  predicate: (node: AndroidNode) => boolean,
): AndroidNode | null {
  for (const node of nodes) {
    if (predicate(node)) return node;
  }
  return null;
}

async function verifyAndroid(user: RuntimeTestUser) {
  const packageName = androidHarness.detectAndroidPackage();
  await androidHarness.prepareAndroidRuntime({ clearApp: true, clearGms: false });

  try {
    const loginParams = {
      packageName,
      user,
      protectedRoute: "rik://profile",
      artifactBase: androidArtifactBase,
      successPredicate: (xml: string) => !androidTextRe.login.test(xml) && androidTextRe.profile.test(xml),
      renderablePredicate: (xml: string) => androidTextRe.login.test(xml) || androidTextRe.profile.test(xml),
      loginScreenPredicate: (xml: string) => androidTextRe.login.test(xml),
    } as const;

    let screen = await androidHarness.loginAndroidWithProtectedRoute(loginParams);

    if (androidTextRe.authMissing.test(screen.xml)) {
      const alertNodes = androidHarness.parseAndroidNodes(screen.xml) as AndroidNode[];
      const okNode = findAndroidNode(
        alertNodes,
        (node) => node.clickable && node.enabled && /\bOK\b/i.test(`${node.text} ${node.contentDesc}`),
      );
      if (okNode) {
        androidHarness.tapAndroidBounds(okNode.bounds);
      } else {
        androidHarness.pressAndroidKey(4);
      }
      screen = await androidHarness.loginAndroidWithProtectedRoute(loginParams);
    }

    screen = await androidHarness.dismissAndroidInterruptions(
      screen,
      `${androidArtifactBase}-post-login-surface`,
    );

    let nodes = androidHarness.parseAndroidNodes(screen.xml) as AndroidNode[];
    const findProfileNodeWithScroll = async (
      label: string,
      matcher: (node: AndroidNode) => boolean,
      maxScrolls = 4,
    ) => {
      let currentNodes = nodes;
      let node = findAndroidNode(currentNodes, matcher);
      for (let attempt = 0; !node && attempt < maxScrolls; attempt += 1) {
        androidHarness.adb([
          "shell",
          "input",
          "swipe",
          "540",
          "1850",
          "540",
          "900",
        ]);
        screen = await poll(
          `wave4-profile:${label}-scroll-${attempt + 1}`,
          async () => {
            const next = androidHarness.dumpAndroidScreen(
              `${androidArtifactBase}-${label}-scroll-${attempt + 1}`,
            );
            return await androidHarness.dismissAndroidInterruptions(
              next,
              `${androidArtifactBase}-${label}-scroll-interrupt`,
            );
          },
          8_000,
          600,
        );
        currentNodes = androidHarness.parseAndroidNodes(screen.xml) as AndroidNode[];
        node = findAndroidNode(currentNodes, matcher);
      }
      nodes = currentNodes;
      return node;
    };

    let editNode = findAndroidNode(
      nodes,
      (node) => node.clickable && node.enabled && node.contentDesc.includes("profile_edit_open"),
    );
    if (!editNode) {
      const profileTabNode = findAndroidNode(
        nodes,
        (node) =>
          node.clickable &&
          node.enabled &&
          androidTextRe.profile.test(`${node.text} ${node.contentDesc}`),
      );
      if (profileTabNode) {
        androidHarness.tapAndroidBounds(profileTabNode.bounds);
        screen = await poll(
          "wave4-profile:android-profile-tab",
          async () => {
            const next = androidHarness.dumpAndroidScreen(`${androidArtifactBase}-profile-tab`);
            const cleaned = await androidHarness.dismissAndroidInterruptions(
              next,
              `${androidArtifactBase}-profile-tab-interrupt`,
            );
            const nextNodes = androidHarness.parseAndroidNodes(cleaned.xml) as AndroidNode[];
            return findAndroidNode(
              nextNodes,
              (node) => node.clickable && node.enabled && node.contentDesc.includes("profile_edit_open"),
            )
              ? cleaned
              : null;
          },
          30_000,
          500,
        );
        nodes = androidHarness.parseAndroidNodes(screen.xml) as AndroidNode[];
        editNode = findAndroidNode(
          nodes,
          (node) => node.clickable && node.enabled && node.contentDesc.includes("profile_edit_open"),
        );
      }
    }
    if (!editNode) {
      throw new Error("Android profile edit trigger not found");
    }
    androidHarness.tapAndroidBounds(editNode.bounds);
    screen = await poll(
      "wave4-profile:android-edit-modal",
      async () => {
        const next = androidHarness.dumpAndroidScreen(`${androidArtifactBase}-edit`);
        return androidTextRe.editProfile.test(next.xml) ? next : null;
      },
      30_000,
      500,
    );

    androidHarness.pressAndroidKey(4);
    screen = await poll(
      "wave4-profile:android-back-to-profile",
      async () => {
        const next = androidHarness.dumpAndroidScreen(`${androidArtifactBase}-back-profile`);
        return androidTextRe.profile.test(next.xml) ? next : null;
      },
      30_000,
      500,
    );

    nodes = androidHarness.parseAndroidNodes(screen.xml) as AndroidNode[];
    const listingNode = await findProfileNodeWithScroll(
      "listing",
      (node) => node.clickable && node.enabled && node.contentDesc.includes("profile_listing_open"),
    );
    if (!listingNode) {
      throw new Error("Android profile listing trigger not found");
    }
    androidHarness.tapAndroidBounds(listingNode.bounds);
    await poll(
      "wave4-profile:android-listing-modal",
      async () => {
        const next = androidHarness.dumpAndroidScreen(`${androidArtifactBase}-listing`);
        return androidTextRe.newListing.test(next.xml) ? next : null;
      },
      30_000,
      500,
    );

    androidHarness.pressAndroidKey(4);
    screen = await poll(
      "wave4-profile:android-back-from-listing",
      async () => {
        const next = androidHarness.dumpAndroidScreen(`${androidArtifactBase}-back-listing`);
        return androidTextRe.profile.test(next.xml) ? next : null;
      },
      30_000,
      500,
    );

    nodes = androidHarness.parseAndroidNodes(screen.xml) as AndroidNode[];
    const companyNode = await findProfileNodeWithScroll(
      "company",
      (node) => node.clickable && node.enabled && node.contentDesc.includes("profile_company_card"),
    );
    if (!companyNode) {
      throw new Error("Android profile company trigger not found");
    }
    androidHarness.tapAndroidBounds(companyNode.bounds);
    await poll(
      "wave4-profile:android-company-wizard",
      async () => {
        const next = androidHarness.dumpAndroidScreen(`${androidArtifactBase}-company`);
        return androidTextRe.companyWizard.test(next.xml) ? next : null;
      },
      30_000,
      500,
    );

    androidHarness.pressAndroidKey(4);
    await poll(
      "wave4-profile:android-final-profile",
      async () => {
        const next = androidHarness.dumpAndroidScreen(`${androidArtifactBase}-final-profile`);
        return androidTextRe.profile.test(next.xml) ? next : null;
      },
      30_000,
      500,
    );

    return {
      status: "GREEN",
      packageName,
      artifacts: androidHarness.captureFailureArtifacts(`${androidArtifactBase}-final`),
      recovery: androidHarness.getRecoverySummary(),
    };
  } catch (error) {
    return {
      status: "NOT_GREEN",
      packageName,
      error: error instanceof Error ? error.message : String(error),
      artifacts: androidHarness.captureFailureArtifacts(`${androidArtifactBase}-failure`),
      recovery: androidHarness.getRecoverySummary(),
    };
  }
}

function verifyIosHostSupport() {
  const result = spawnSync("xcrun", ["simctl", "list", "devices"], {
    cwd: projectRoot,
    stdio: "pipe",
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    available: result.status === 0,
    status: result.status,
    error: String(result.stderr ?? result.stdout ?? "").trim() || null,
  };
}

async function main() {
  if (!supabaseUrl || !anonKey || !supabaseProjectRef) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  let user: RuntimeTestUser | null = null;
  try {
    user = await createTempUser(admin, {
      role: "foreman",
      fullName: "Wave4 Profile Verify",
      emailPrefix: "wave4.profile",
    });

    const web = await verifyWeb(user);
    const android = await verifyAndroid(user);
    const ios = verifyIosHostSupport();
    const finalStatus =
      web.status === "GREEN" && android.status === "GREEN" && ios.available
        ? "GREEN"
        : web.status === "GREEN" && android.status === "GREEN" && !ios.available
          ? "PARTIAL: WEB_ANDROID_GREEN_IOS_HOST_BLOCKED"
          : "NOT_GREEN";

    const payload = {
      checkedAt: new Date().toISOString(),
      baseUrl,
      user: {
        role: user.role,
        email: user.email,
      },
      web,
      android,
      ios,
      status: finalStatus,
    };

    writeJsonArtifact(runtimeArtifact, payload);
    fs.writeFileSync(
      proofArtifact,
      [
        "# Wave 4 Profile Runtime Proof",
        "",
        `- Web: ${web.status}`,
        `- Android: ${android.status}`,
        `- iOS host support: ${ios.available ? "available" : "unavailable"}`,
        `- Final status: ${payload.status}`,
        "",
        "## Notes",
        `- Web final URL: ${web.finalUrl ?? ""}`,
        `- Android package: ${android.packageName ?? ""}`,
        `- iOS error: ${ios.error ?? "none"}`,
      ].join("\n"),
      "utf8",
    );
  } finally {
    await cleanupTempUser(admin, user);
  }
}

main().catch((error) => {
  writeJsonArtifact(runtimeArtifact, {
    status: "NOT_GREEN",
    checkedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
});
