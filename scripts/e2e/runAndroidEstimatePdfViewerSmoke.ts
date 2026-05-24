import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { createAndroidHarness } from "../_shared/androidHarness";
import { cleanupTempUser, createTempUser, createVerifierAdmin, type RuntimeTestUser } from "../_shared/testUserDiscipline";

const WAVE = "S_ESTIMATE_PDF_REAL_BINARY_CYRILLIC_TABLE_VIEWER_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const TARGET_ARTIFACT = path.join(ARTIFACT_DIR, "S_ESTIMATE_PDF_REAL_BINARY_android_screenshots.json");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "estimate-pdf-reality", "android");
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const GOOGLE_DOCS_PACKAGE_NAME = "com.google.android.apps.docs";
const APK_PATH = path.resolve(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const DEV_PORT = Number(process.env.ESTIMATE_PDF_ANDROID_DEV_PORT ?? "8098");
const REQUEST_PROMPT = "\u0425\u043e\u0447\u0443 \u0443\u043b\u043e\u0436\u0438\u0442\u044c \u043a\u043e\u0432\u0440\u043e\u043b\u0438\u043d \u043d\u0430 100 \u043a\u0432 \u043c";
const PDF_ACTION_RESOURCE_ID = "consumer-estimate-make-pdf";
const PREPARE_DRAFT_RESOURCE_ID = "consumer-repair-prepare-draft";
const PROMPT = "Хочу уложить ковролин на 100 кв м";

type RunResult = { ok: boolean; output: string };

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function run(command: string, args: string[]): RunResult {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, { cwd: process.cwd(), encoding: "utf8", stdio: "pipe", timeout: 30_000 }),
    };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

function connectedEmulators(): string[] {
  const devices = run("adb", ["devices"]);
  if (!devices.ok) return [];
  return devices.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^emulator-\d+\s+device$/.test(line))
    .map((line) => line.split(/\s+/)[0]);
}

function installApk(device: string): RunResult {
  let install = run("adb", ["-s", device, "install", "-r", APK_PATH]);
  if (!install.ok && install.output.includes("INSUFFICIENT_STORAGE")) {
    run("adb", ["-s", device, "uninstall", PACKAGE_NAME]);
    run("adb", ["-s", device, "uninstall", `${PACKAGE_NAME}.test`]);
    run("adb", ["-s", device, "shell", "pm", "trim-caches", "1024M"]);
    install = run("adb", ["-s", device, "install", "-r", APK_PATH]);
  }
  return install;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function xmlText(xml: string): string {
  return xml.replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/\s+/g, " ");
}

function xmlNodes(xml: string): string[] {
  return Array.from(xml.matchAll(/<node\b([^>]*?)\/?>/g)).map((match) => match[1] ?? "");
}

function xmlAttr(attrs: string, name: string): string {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return xmlText(match?.[1] ?? "");
}

function findBoundsByResourceId(xml: string, resourceId: string): string | null {
  for (const attrs of xmlNodes(xml)) {
    const candidate = xmlAttr(attrs, "resource-id");
    if (candidate === resourceId || candidate.endsWith(`/${resourceId}`) || candidate.includes(resourceId)) {
      const bounds = xmlAttr(attrs, "bounds");
      if (bounds) return bounds;
    }
  }
  return null;
}

function isPdfViewer(xml: string): boolean {
  const text = xmlText(xml);
  const inAppViewer = text.includes('content-desc="Back"') && text.includes('content-desc="Document actions"');
  const nativePdfViewer =
    text.includes(`package="${GOOGLE_DOCS_PACKAGE_NAME}"`) &&
    text.includes('content-desc="Back"') &&
    (text.includes("Заявка:") || text.includes("Estimate summary") || text.includes("Ковролин") || text.includes("pdf_view"));
  return inAppViewer || nativePdfViewer;
}

function hasPdfActionButton(xml: string): boolean {
  if (findBoundsByResourceId(xml, PDF_ACTION_RESOURCE_ID)) return true;
  return xmlNodes(xml).some((attrs) => {
    const text = xmlText(attrs);
    return text.includes("PDF") && text.includes('clickable="true"') && text.includes('enabled="true"') && !text.includes("Document actions");
  });
}

function isRequestEstimateScreen(xml: string): boolean {
  const text = xmlText(xml);
  if (text.includes("consumer-repair-") || text.includes("consumer-estimate-") || text.includes(REQUEST_PROMPT)) return !isLoginScreen(xml);
  return !isLoginScreen(xml) && (text.includes("Смета") || text.includes("Ремонт дома") || text.includes(PROMPT));
}

function isStrictRequestEstimateScreen(xml: string): boolean {
  const text = xmlText(xml);
  return (
    !isLoginScreen(xml) &&
    (text.includes('resource-id="consumer-repair-screen"') ||
      text.includes("consumer-repair-problem-input") ||
      text.includes(PREPARE_DRAFT_RESOURCE_ID) ||
      text.includes(PDF_ACTION_RESOURCE_ID))
  );
}

function relative(value: string | null | undefined): string | null {
  if (!value) return null;
  return path.relative(process.cwd(), value).replace(/\\/g, "/");
}

function shellEscapeUriForAdb(uri: string): string {
  return uri.replace(/&/g, "\\&");
}

function isLoginScreen(xml: string): boolean {
  return xml.includes("Email") && /Войти|Login|Пароль/i.test(xmlText(xml));
}

async function tapVisiblePdfAction(
  harness: ReturnType<typeof createAndroidHarness>,
  device: string,
): Promise<ReturnType<ReturnType<typeof createAndroidHarness>["dumpAndroidScreen"]>> {
  let latest = harness.dumpAndroidScreen("estimate-pdf-real-binary-android-pdf-button-start");
  for (let attempt = 0; attempt < 22; attempt += 1) {
    latest = await harness.dismissAndroidInterruptions(
      harness.dumpAndroidScreen(`estimate-pdf-real-binary-android-pdf-button-${attempt + 1}`),
      `estimate-pdf-real-binary-android-pdf-button-interrupt-${attempt + 1}`,
    );
    const nodes = harness.parseAndroidNodes(latest.xml);
    const pdfButton = nodes.find(
      (node) =>
        node.enabled &&
        (node.resourceId.includes(PDF_ACTION_RESOURCE_ID) ||
          (node.clickable && /PDF/i.test(`${node.text} ${node.contentDesc}`))),
    );
    if (pdfButton?.bounds && harness.tapAndroidBounds(pdfButton.bounds)) {
      return latest;
    }
    const pdfBounds = findBoundsByResourceId(latest.xml, PDF_ACTION_RESOURCE_ID);
    if (pdfBounds && harness.tapAndroidBounds(pdfBounds)) {
      return latest;
    }
    const prepareDraft = nodes.find(
      (node) => node.enabled && node.clickable && node.resourceId.includes(PREPARE_DRAFT_RESOURCE_ID),
    );
    if (prepareDraft?.bounds && harness.tapAndroidBounds(prepareDraft.bounds)) {
      await sleep(2_500);
      continue;
    }
    run("adb", ["-s", device, "shell", "input", "swipe", "540", "1700", "540", "400", "800"]);
    await sleep(700);
  }
  throw new Error("Android PDF action button was not found on the request screen after scrolling.");
}

async function main(): Promise<void> {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const devices = connectedEmulators();
  const baseArtifact = {
    wave: WAVE,
    android_emulator_tested: devices.length > 0,
    devices,
    android_dev_port: DEV_PORT,
    apk_path: APK_PATH,
    apk_exists: fs.existsSync(APK_PATH),
    fake_green_claimed: false,
  };

  if (devices.length === 0) {
    const artifact = {
      ...baseArtifact,
      final_status: "BLOCKED_ANDROID_EMULATOR_NOT_RUN",
      android_emulator_passed: false,
      pdf_viewer_android_opened: false,
      error: "No connected Android emulator from adb devices.",
    };
    writeJson(TARGET_ARTIFACT, artifact);
    throw new Error(artifact.final_status);
  }

  if (!fs.existsSync(APK_PATH)) {
    const artifact = {
      ...baseArtifact,
      final_status: "BLOCKED_ANDROID_EMULATOR_FAILED",
      android_emulator_passed: false,
      pdf_viewer_android_opened: false,
      error: `Missing debug APK: ${APK_PATH}`,
    };
    writeJson(TARGET_ARTIFACT, artifact);
    throw new Error(artifact.error);
  }

  const device = devices[0];
  const install = installApk(device);
  if (!install.ok) {
    const artifact = {
      ...baseArtifact,
      final_status: "BLOCKED_ANDROID_EMULATOR_FAILED",
      android_emulator_passed: false,
      pdf_viewer_android_opened: false,
      apk_install_ok: false,
      install_output: install.output.slice(0, 1000),
    };
    writeJson(TARGET_ARTIFACT, artifact);
    throw new Error(`APK install failed: ${install.output.slice(0, 300)}`);
  }

  const harness = createAndroidHarness({
    projectRoot: process.cwd(),
    devClientPort: DEV_PORT,
    devClientStdoutPath: path.join("artifacts", "S_ESTIMATE_PDF_REAL_BINARY_android_dev_client.stdout.log"),
    devClientStderrPath: path.join("artifacts", "S_ESTIMATE_PDF_REAL_BINARY_android_dev_client.stderr.log"),
  });

  let runtime: Awaited<ReturnType<typeof harness.prepareAndroidRuntime>> | null = null;
  const admin = createVerifierAdmin("estimate-pdf-android-viewer-smoke");
  let user: RuntimeTestUser | null = null;
  try {
    run("adb", ["-s", device, "shell", "am", "force-stop", GOOGLE_DOCS_PACKAGE_NAME]);
    run("adb", ["-s", device, "shell", "am", "force-stop", PACKAGE_NAME]);
    user = await createTempUser(admin, {
      role: "buyer",
      fullName: "Estimate PDF Android",
      emailPrefix: "estimate-pdf-android",
    });
    runtime = await harness.prepareAndroidRuntime({ clearApp: true, clearGms: false });
    const packageName = runtime.packageName ?? PACKAGE_NAME;
    harness.startAndroidDevClientProject(packageName, DEV_PORT, { stopApp: true });
    await sleep(4_000);

    const route = `rik://request?autoPrepare=1&prompt=${encodeURIComponent(REQUEST_PROMPT)}`;
    const tabRoute = `rik:///%28tabs%29/request?autoPrepare=1&prompt=${encodeURIComponent(REQUEST_PROMPT)}`;
    const requestScreen = await harness.loginAndroidWithProtectedRoute({
      packageName,
      user,
      protectedRoute: shellEscapeUriForAdb(route),
      artifactBase: "estimate-pdf-real-binary-android-request",
      successPredicate: isRequestEstimateScreen,
      renderablePredicate: (xml) => isLoginScreen(xml) || isRequestEstimateScreen(xml),
      loginScreenPredicate: isLoginScreen,
    });
    if (!isRequestEstimateScreen(requestScreen.xml)) {
      const routed = await harness.openAndroidRoute({
        packageName,
        routes: [route, route.replace("://", ":///"), tabRoute].map(shellEscapeUriForAdb),
        artifactBase: "estimate-pdf-real-binary-android-request-routed",
        predicate: isRequestEstimateScreen,
        renderablePredicate: (xml) => isLoginScreen(xml) || isRequestEstimateScreen(xml),
        timeoutMs: 90_000,
        delayMs: 1500,
      });
      requestScreen.xml = routed.xml;
      requestScreen.xmlPath = routed.xmlPath;
      requestScreen.pngPath = routed.pngPath;
    }
    const strictRequestScreen = await harness.openAndroidRoute({
      packageName,
      routes: [route, route.replace("://", ":///"), tabRoute].map(shellEscapeUriForAdb),
      artifactBase: "estimate-pdf-real-binary-android-request-strict-routed",
      predicate: isStrictRequestEstimateScreen,
      renderablePredicate: (xml) => isLoginScreen(xml) || isStrictRequestEstimateScreen(xml),
      timeoutMs: 90_000,
      delayMs: 1500,
    });
    requestScreen.xml = strictRequestScreen.xml;
    requestScreen.xmlPath = strictRequestScreen.xmlPath;
    requestScreen.pngPath = strictRequestScreen.pngPath;

    const pdfButtonScreen = await tapVisiblePdfAction(harness, device);

    let viewerScreen: ReturnType<typeof harness.dumpAndroidScreen> | null = null;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await sleep(1500);
      const candidate = harness.dumpAndroidScreen(`estimate-pdf-real-binary-android-viewer-${attempt + 1}`);
      const cleaned = await harness.dismissAndroidInterruptions(candidate, `estimate-pdf-real-binary-android-viewer-interrupt-${attempt + 1}`);
      if (isPdfViewer(cleaned.xml)) {
        viewerScreen = cleaned;
        break;
      }
    }
    if (!viewerScreen) {
      throw new Error("Android PDF viewer did not open after tapping the PDF action.");
    }

    const finalScreenshot = harness.dumpAndroidScreen("estimate-pdf-real-binary-android-final");
    const viewerOpened = isPdfViewer(viewerScreen.xml) || isPdfViewer(finalScreenshot.xml);
    const artifact = {
      ...baseArtifact,
      final_status: viewerOpened
        ? "GREEN_ANDROID_ESTIMATE_PDF_VIEWER_READY"
        : "BLOCKED_ANDROID_EMULATOR_FAILED",
      android_emulator_passed: viewerOpened,
      pdf_viewer_android_opened: viewerOpened,
      apk_install_ok: true,
      install_output: install.output.slice(0, 500),
      request_screen_xml: relative(requestScreen.xmlPath),
      request_screen_png: relative(requestScreen.pngPath),
      pdf_button_screen_xml: relative(pdfButtonScreen.xmlPath),
      pdf_button_screen_png: relative(pdfButtonScreen.pngPath),
      viewer_screen_xml: relative(viewerScreen.xmlPath),
      viewer_screen_png: relative(viewerScreen.pngPath),
      final_screen_xml: relative(finalScreenshot.xmlPath),
      final_screen_png: relative(finalScreenshot.pngPath),
      pdf_action_clicked: true,
      dev_client_logs: harness.getDevClientLogPaths(),
      dev_client_log_tails: harness.getDevClientLogTails(),
      recovery: harness.getRecoverySummary(),
      error: null,
      fake_green_claimed: false,
    };
    writeJson(TARGET_ARTIFACT, artifact);
    if (!viewerOpened) throw new Error(artifact.final_status);
    console.log(artifact.final_status);
  } catch (error) {
    const failureArtifacts = harness.captureFailureArtifacts("estimate-pdf-real-binary-android-failure");
    const artifact = {
      ...baseArtifact,
      final_status: "BLOCKED_ANDROID_EMULATOR_FAILED",
      android_emulator_passed: false,
      pdf_viewer_android_opened: false,
      apk_install_ok: true,
      install_output: install.output.slice(0, 500),
      dev_client_logs: harness.getDevClientLogPaths(),
      dev_client_log_tails: harness.getDevClientLogTails(),
      recovery: harness.getRecoverySummary(),
      failure_artifacts: failureArtifacts,
      error: error instanceof Error ? error.message : String(error),
      fake_green_claimed: false,
    };
    writeJson(TARGET_ARTIFACT, artifact);
    throw error;
  } finally {
    runtime?.devClient.cleanup();
    await cleanupTempUser(admin, user);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
