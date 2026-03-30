import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { createVerifierAdmin, createTempUser, cleanupTempUser, type RuntimeTestUser } from "./_shared/testUserDiscipline";
import { createRealtimeAndroidRuntime } from "./_shared/realtimeAndroidRuntime";

type JestAssertion = {
  fullName: string;
  status: string;
};

type JestSuite = {
  assertionResults?: JestAssertion[];
};

type JestReport = {
  success: boolean;
  numFailedTests: number;
  numPassedTests: number;
  testResults?: JestSuite[];
};

type RuntimeCaseResult = {
  family: string;
  route: string;
  routeMounted: boolean;
  handoffStarted: boolean;
  handoffReady: boolean;
  handoffError: boolean;
  fatalCrash: boolean;
  processAlive: boolean;
  topActivity: string;
  logExcerpt: string[];
  expected: "ready" | "controlled_error";
  passed: boolean;
  error?: string | null;
};

const projectRoot = process.cwd();
const admin = createVerifierAdmin("pdf-open-crash-regression-verify");
const androidRuntime = createRealtimeAndroidRuntime({
  projectRoot,
  devClientPort: 8081,
});
const MOBILE_STABLE_COMMIT = "52ad6b2";
const REGRESSION_COMMIT = "5f5ff60";
const pdfUrl =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const readTextIfExists = (relativePath: string) => {
  const target = path.join(projectRoot, relativePath);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
};

const readJson = <T,>(relativePath: string): T =>
  JSON.parse(readText(relativePath)) as T;

const writeJson = (relativePath: string, value: unknown) => {
  const target = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const run = (file: string, args: string[]) =>
  execFileSync(file, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  }).trim();

const tryRun = (file: string, args: string[]) => {
  try {
    return run(file, args);
  } catch (error) {
    if (error && typeof error === "object" && "stdout" in error) {
      return String((error as { stdout?: unknown }).stdout ?? "").trim();
    }
    return "";
  }
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "unknown error");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 30_000,
  delayMs = 500,
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

function encodeRoute(route: Record<string, string>) {
  const params = new URLSearchParams(route);
  return `rik://pdf-viewer?${params.toString()}`;
}

function runtimePdfUri(family: string) {
  return `${pdfUrl}?family=${encodeURIComponent(family)}`;
}

function readReactNativeLogcat() {
  return tryRun("adb", ["logcat", "-d", "-v", "brief", "ReactNativeJS:I", "*:S"]);
}

function readFullLogcat() {
  return tryRun("adb", ["logcat", "-d"]);
}

function getTopActivityText() {
  return tryRun("adb", ["shell", "dumpsys", "activity", "top"]);
}

function getPid() {
  return tryRun("adb", ["shell", "pidof", "com.azisbek_dzhantaev.rikexpoapp"]);
}

function hasToken(source: string, token: string) {
  return String(source || "").includes(token);
}

function buildRuntimeCaseLogExcerpt(logText: string) {
  return String(logText || "")
    .split(/\r?\n/)
    .filter(
      (line) =>
        /pdf-viewer|pdf-runner|viewer_route_mounted|native_handoff|Unable to open document/i.test(line),
    )
    .slice(-30);
}

function hasNativeHandoffSettled(logText: string) {
  return hasToken(logText, "native_handoff_ready") || hasToken(logText, "pdf_android_content_uri_ready");
}

async function runRuntimeCase(
  _packageName: string | null,
  family: string,
  route: string,
  expected: "ready" | "controlled_error",
): Promise<RuntimeCaseResult> {
  androidRuntime.clearObservability();
  androidRuntime.harness.startAndroidRoute(null, route);

  const logText = await poll(
    `pdf-open:${family}`,
    async () => {
      const current = readReactNativeLogcat();
      const routeMounted = hasToken(current, "viewer_route_mounted");
      const handoffStarted = hasToken(current, "native_handoff_start");
      const handoffReady = hasNativeHandoffSettled(current);
      const handoffError =
        hasToken(current, "native_handoff_error")
        || hasToken(current, "viewer_error_state")
        || hasToken(current, "load_error");

      if (!routeMounted || !handoffStarted) return null;
      if (expected === "ready" && !handoffReady) return null;
      if (expected === "controlled_error" && !handoffError) return null;
      return current;
    },
    45_000,
    1000,
  );

  await sleep(1500);
  const fullLog = readFullLogcat();
  const topActivity = getTopActivityText();
  const processAlive = Boolean(getPid());
  const routeMounted = hasToken(logText, "viewer_route_mounted");
  const handoffStarted = hasToken(logText, "native_handoff_start");
  const handoffReady = hasNativeHandoffSettled(logText);
  const handoffError =
    hasToken(logText, "native_handoff_error")
    || hasToken(logText, "viewer_error_state")
    || hasToken(logText, "load_error");
  const fatalCrash =
    /FATAL EXCEPTION|AndroidRuntime/i.test(fullLog)
    && /com\.azisbek_dzhantaev\.rikexpoapp/i.test(fullLog);
  const passed =
    routeMounted
    && handoffStarted
    && processAlive
    && !fatalCrash
    && ((expected === "ready" && handoffReady && !handoffError)
      || (expected === "controlled_error" && handoffError));

  return {
    family,
    route,
    routeMounted,
    handoffStarted,
    handoffReady,
    handoffError,
    fatalCrash,
    processAlive,
    topActivity: topActivity
      .split(/\r?\n/)
      .find((line) => /ACTIVITY|ResumedActivity|mResumedActivity/i.test(line) && /com\.|docs|files|google/i.test(line))
      ?.trim() ?? "",
    logExcerpt: buildRuntimeCaseLogExcerpt(logText),
    expected,
    passed,
  };
}

async function primeBuyerRuntimeSurface(packageName: string | null, artifactBase: string) {
  androidRuntime.clearObservability();
  androidRuntime.harness.startAndroidRoute(null, "rik://buyer");
  await androidRuntime.waitForObservability(
    `${artifactBase}:buyer_ready`,
    (event) =>
      event.screen === "buyer"
      && (event.event === "content_ready" || event.event === "publish_state"),
    30_000,
  ).catch(() => []);
}

async function main() {
  let runtimeUser: RuntimeTestUser | null = null;
  let runtimePrepared:
    | Awaited<ReturnType<typeof androidRuntime.prepareRoleRuntime>>
    | null = null;
  let runtimeCases: RuntimeCaseResult[] = [];
  let verifierError: string | null = null;
  const viewerContractSource = readText("src/lib/pdf/pdfViewerContract.ts");
  const viewerSource = readText("app/pdf-viewer.tsx");
  const pdfRunnerSource = readText("src/lib/pdfRunner.ts");
  const attachmentOpenerSource = readText("src/lib/documents/attachmentOpener.ts");
  const pdfDocumentActionsSource = readText("src/lib/documents/pdfDocumentActions.ts");
  const metroLog = readTextIfExists("tmp/metro-pdf-open.log");
  const diffPreview = run("git", [
    "diff",
    "--unified=12",
    `${MOBILE_STABLE_COMMIT}..HEAD`,
    "--",
    "src/lib/pdf/pdfViewerContract.ts",
    "app/pdf-viewer.tsx",
  ])
    .split(/\r?\n/)
    .slice(0, 120);

  const jestReport = readJson<JestReport>("artifacts/pdf-open-regression-jest.json");
  const assertions = (jestReport.testResults ?? []).flatMap((suite) => suite.assertionResults ?? []);
  const passed = (needle: string) =>
    assertions.some((assertion) => assertion.status === "passed" && assertion.fullName.includes(needle));
  const tscResult = (() => {
    try {
      if (process.platform === "win32") {
        run("cmd.exe", ["/c", "npx", "tsc", "--noEmit", "--pretty", "false"]);
      } else {
        run("npx", ["tsc", "--noEmit", "--pretty", "false"]);
      }
      return { success: true, output: "" };
    } catch (error) {
      return {
        success: false,
        output:
          String((error as { stdout?: unknown }).stdout ?? "")
          || String((error as { stderr?: unknown }).stderr ?? "")
          || getErrorMessage(error),
      };
    }
  })();
  const metroEvidence = {
    viewerRouteMounted: metroLog.includes("[pdf-viewer] viewer_route_mounted"),
    nativeHandoffStarted: metroLog.includes("[pdf-viewer] native_handoff_start"),
    nativeContentUriReady: metroLog.includes("[pdf-runner] pdf_android_content_uri_ready"),
    nativeHandoffError: metroLog.includes("[pdf-viewer] native_handoff_error"),
    viewerErrorState: metroLog.includes("[pdf-viewer] viewer_error_state"),
  };

  try {
    runtimeUser = await createTempUser(admin, {
      role: "buyer",
      fullName: "PDF Runtime Smoke",
      emailPrefix: "pdf.runtime",
    });

    runtimePrepared = await androidRuntime.prepareRoleRuntime({
      user: runtimeUser,
      route: "rik://buyer",
      artifactBase: "android-pdf-open-runtime",
    });

    const validCases = [
      {
        family: "director_pdf",
        route: encodeRoute({
          uri: runtimePdfUri("director_pdf"),
        }),
        expected: "ready" as const,
      },
      {
        family: "accountant_payment_pdf",
        route: encodeRoute({
          uri: runtimePdfUri("accountant_payment_pdf"),
        }),
        expected: "ready" as const,
      },
      {
        family: "warehouse_pdf",
        route: encodeRoute({
          uri: runtimePdfUri("warehouse_pdf"),
        }),
        expected: "ready" as const,
      },
      {
        family: "attachment_pdf_viewer_contract",
        route: encodeRoute({
          uri: runtimePdfUri("attachment_pdf_viewer_contract"),
        }),
        expected: "ready" as const,
      },
      {
        family: "invalid_source_contract",
        route: encodeRoute({
          uri: "blob:https://example.com/runtime-proof.pdf?family=invalid_source_contract",
        }),
        expected: "controlled_error" as const,
      },
    ];

    for (const entry of validCases) {
      try {
        await primeBuyerRuntimeSurface(
          runtimePrepared.packageName,
          `android-pdf-open-runtime-${entry.family}-prime`,
        );
        await androidRuntime.settleIdleObservability(1_000, 2).catch(() => undefined);
        runtimeCases.push(
          await runRuntimeCase(runtimePrepared.packageName, entry.family, entry.route, entry.expected),
        );
      } catch (error) {
        const currentLog = readReactNativeLogcat();
        const routeMounted = hasToken(currentLog, "viewer_route_mounted");
        const handoffStarted = hasToken(currentLog, "native_handoff_start");
        const handoffReady = hasNativeHandoffSettled(currentLog);
        const handoffError =
          hasToken(currentLog, "native_handoff_error")
          || hasToken(currentLog, "viewer_error_state")
          || hasToken(currentLog, "load_error");
        const fatalCrash = /FATAL EXCEPTION|AndroidRuntime/i.test(readFullLogcat());
        const processAlive = Boolean(getPid());
        const passed =
          routeMounted
          && processAlive
          && !fatalCrash
          && ((entry.expected === "ready" && handoffStarted && handoffReady && !handoffError)
            || (entry.expected === "controlled_error" && handoffError));

        runtimeCases.push({
          family: entry.family,
          route: entry.route,
          routeMounted,
          handoffStarted,
          handoffReady,
          handoffError,
          fatalCrash,
          processAlive,
          topActivity:
            getTopActivityText()
              .split(/\r?\n/)
              .find((line) => /ResumedActivity|topResumedActivity|ACTIVITY/i.test(line))
              ?.trim() ?? "",
          logExcerpt: buildRuntimeCaseLogExcerpt(currentLog),
          expected: entry.expected,
          passed,
          error: getErrorMessage(error),
        });
      }
    }

    const boundaryChecks = {
      mobileViewerNoLongerEmbedsPdfWebView:
        viewerContractSource.includes('kind: "resolved-native-handoff"')
        && !viewerContractSource.includes('renderer: "native-webview"')
        && !viewerContractSource.includes('renderer: "native-local-webview"'),
      webViewerStillEmbedded:
        viewerContractSource.includes('platform === "web"')
        && viewerContractSource.includes('renderer: "web-frame"'),
      viewerUsesNativeHandoff:
        viewerSource.includes('console.info("[pdf-viewer] native_handoff_start"')
        && viewerSource.includes("await openPdfPreview(")
        && viewerSource.includes('console.info("[pdf-viewer] native_handoff_ready"'),
      viewerNoLongerImportsWebView: !viewerSource.includes("react-native-webview"),
      previewRouteStillCanonical:
        pdfDocumentActionsSource.includes('pathname: "/pdf-viewer"')
        && pdfDocumentActionsSource.includes("createDocumentPreviewSession"),
      attachmentOpenStillNativeHandoff:
        attachmentOpenerSource.includes("getContentUriAsync")
        && attachmentOpenerSource.includes("Linking.openURL(contentUri)"),
      pdfRunnerNativeHandoff:
        pdfRunnerSource.includes("openAndroidPdfContentUri")
        && pdfRunnerSource.includes("Linking.openURL(contentUri)"),
    };

    const testChecks = {
      jestSuccess: jestReport.success === true && jestReport.numFailedTests === 0,
      viewerRemoteSuccess: passed("routes mobile remote PDFs through native handoff instead of embedded webview"),
      viewerLocalSuccess: passed("routes mobile local PDFs through native handoff instead of embedded webview"),
      invalidViewerSourceControlled: passed("fails in a controlled way for blob/data PDF sources on native"),
      documentActionViewerRoute: passed("navigates to the shared viewer route with a prepared session when router is provided"),
      attachmentRemoteSuccess: passed("downloads a remote attachment PDF then opens it through Android content uri handoff"),
      attachmentLocalSuccess: passed("opens a local attachment PDF through Android content uri handoff"),
      attachmentInvalidControlled: passed("fails in a controlled way for blob/data attachment sources on native"),
    };

    const runtimeChecks = {
      directorPdfOpen: runtimeCases.find((entry) => entry.family === "director_pdf")?.passed === true,
      accountantPaymentPdfOpen:
        runtimeCases.find((entry) => entry.family === "accountant_payment_pdf")?.passed === true,
      warehousePdfOpen: runtimeCases.find((entry) => entry.family === "warehouse_pdf")?.passed === true,
      attachmentPdfViewerBoundary:
        runtimeCases.find((entry) => entry.family === "attachment_pdf_viewer_contract")?.passed === true,
      invalidSourceControlled:
        runtimeCases.find((entry) => entry.family === "invalid_source_contract")?.passed === true,
      noFatalCrash: runtimeCases.every((entry) => entry.fatalCrash === false),
      processAliveAfterOpen: runtimeCases.every((entry) => entry.processAlive === true),
      metroManualEvidencePresent:
        metroEvidence.viewerRouteMounted
        && metroEvidence.nativeHandoffStarted
        && metroEvidence.nativeContentUriReady,
    };

    const green =
      Object.values(boundaryChecks).every(Boolean)
      && Object.values(testChecks).every(Boolean)
      && Object.values(runtimeChecks).every(Boolean)
      && tscResult.success;

    writeJson("artifacts/pdf-open-runtime-proof.json", {
      status: green ? "passed" : "failed",
      gate: green ? "GREEN" : "NOT_GREEN",
      environment: {
        platform: "android",
        packageName: runtimePrepared.packageName,
        preflight: runtimePrepared.preflight,
        fioConfirmed: runtimePrepared.fioConfirmed,
        runtimeUserRole: runtimeUser.role,
      },
      metroEvidence,
      runtimeCases,
    });

    writeJson("artifacts/pdf-viewer-boundary-proof.json", {
      status: green ? "passed" : "failed",
      gate: green ? "GREEN" : "NOT_GREEN",
      rootCause: {
        lastMobileStableCommit: MOBILE_STABLE_COMMIT,
        regressionCommit: REGRESSION_COMMIT,
        stableCommitMessage: run("git", ["show", "-s", "--format=%s", MOBILE_STABLE_COMMIT]),
        regressionCommitMessage: run("git", ["show", "-s", "--format=%s", REGRESSION_COMMIT]),
        brokenBoundary: "mobile /pdf-viewer embedded renderer path",
        exactReason:
          "Mobile PDF viewer regression reintroduced embedded WebView/native-local-webview rendering for local and remote PDFs; tapping PDF navigated into a shared renderer path instead of native file/content handoff, triggering native crash/process exit before controlled JS fallback.",
        diffPreview,
      },
      checks: boundaryChecks,
      tsc: {
        success: tscResult.success,
        outputSnippet: tscResult.output.split(/\r?\n/).slice(0, 40),
      },
    });

    writeJson("artifacts/pdf-open-crash-regression-summary.json", {
      status: green ? "passed" : "failed",
      gate: green ? "GREEN" : "NOT_GREEN",
      checks: {
        boundaryChecks,
        testChecks,
        runtimeChecks,
      },
      tsc: {
        success: tscResult.success,
        outputSnippet: tscResult.output.split(/\r?\n/).slice(0, 40),
      },
      jest: {
        success: jestReport.success,
        numPassedTests: jestReport.numPassedTests,
        numFailedTests: jestReport.numFailedTests,
      },
    });

    console.log(
      JSON.stringify(
        {
          gate: green ? "GREEN" : "NOT_GREEN",
          rootCause: "mobile embedded /pdf-viewer renderer replaced by native handoff",
          runtimeChecks,
          testChecks,
        },
        null,
        2,
      ),
    );

    if (!green) {
      process.exitCode = 1;
    }
  } catch (error) {
    verifierError = getErrorMessage(error);
  } finally {
    if (verifierError) {
      writeJson("artifacts/pdf-open-runtime-proof.json", {
        status: "failed",
        gate: "NOT_GREEN",
        environment: {
          platform: "android",
          packageName: runtimePrepared?.packageName ?? null,
          preflight: runtimePrepared?.preflight ?? null,
          fioConfirmed: runtimePrepared?.fioConfirmed ?? null,
          runtimeUserRole: runtimeUser?.role ?? null,
        },
        metroEvidence,
        runtimeCases,
        verifierError,
      });
      writeJson("artifacts/pdf-viewer-boundary-proof.json", {
        status: "failed",
        gate: "NOT_GREEN",
        rootCause: {
          lastMobileStableCommit: MOBILE_STABLE_COMMIT,
          regressionCommit: REGRESSION_COMMIT,
          stableCommitMessage: run("git", ["show", "-s", "--format=%s", MOBILE_STABLE_COMMIT]),
          regressionCommitMessage: run("git", ["show", "-s", "--format=%s", REGRESSION_COMMIT]),
          brokenBoundary: "mobile /pdf-viewer embedded renderer path",
          exactReason:
            "Mobile PDF viewer regression reintroduced embedded WebView/native-local-webview rendering for local and remote PDFs; tapping PDF navigated into a shared renderer path instead of native file/content handoff, triggering native crash/process exit before controlled JS fallback.",
          diffPreview,
        },
        tsc: {
          success: tscResult.success,
          outputSnippet: tscResult.output.split(/\r?\n/).slice(0, 40),
        },
        verifierError,
      });
      writeJson("artifacts/pdf-open-crash-regression-summary.json", {
        status: "failed",
        gate: "NOT_GREEN",
        checks: {
          boundaryChecks: null,
          testChecks: null,
          runtimeChecks: null,
        },
        tsc: {
          success: tscResult.success,
          outputSnippet: tscResult.output.split(/\r?\n/).slice(0, 40),
        },
        jest: {
          success: jestReport.success,
          numPassedTests: jestReport.numPassedTests,
          numFailedTests: jestReport.numFailedTests,
        },
        metroEvidence,
        verifierError,
      });
      console.error(JSON.stringify({ gate: "NOT_GREEN", verifierError }, null, 2));
      process.exitCode = 1;
    }
    if (runtimePrepared) {
      runtimePrepared.cleanup();
    }
    await cleanupTempUser(admin, runtimeUser);
  }
}

void main();
