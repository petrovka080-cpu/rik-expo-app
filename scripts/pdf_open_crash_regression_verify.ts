import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { createAndroidHarness } from "./_shared/androidHarness";

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
  sourceKind: "remote-url" | "invalid";
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
const harness = createAndroidHarness({
  projectRoot,
  devClientPort: 8081,
  devClientStdoutPath: "artifacts/android-dev-client-8081.stdout.log",
  devClientStderrPath: "artifacts/android-dev-client-8081.stderr.log",
});

const MOBILE_STABLE_COMMIT = "52ad6b2";
const REGRESSION_COMMIT = "700c9f3";
const pdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
const verifierRunId = `pdf_open_verify_${Date.now().toString(36)}`;

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

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

function readAllLiveLogText(relativePaths: string[]): string {
  return [...new Set(relativePaths.filter(Boolean))]
    .map((relativePath) => {
      const absolutePath = path.join(projectRoot, relativePath);
      if (!fs.existsSync(absolutePath)) return "";
      const text = fs.readFileSync(absolutePath, "utf8");
      if (!text.trim()) return "";
      return `# ${relativePath}\n${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

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

function runtimePdfUri(familyToken: string) {
  return `${pdfUrl}?family=${encodeURIComponent(familyToken)}`;
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

function readLogDelta(relativePaths: string[], baselineLength: number) {
  const source = readAllLiveLogText(relativePaths);
  if (baselineLength <= 0) return source;
  if (source.length <= baselineLength) return source;
  return source.slice(baselineLength);
}

function buildRuntimeCaseLogExcerpt(logText: string) {
  return String(logText || "")
    .split(/\r?\n/)
    .filter(
      (line) =>
        /pdf-viewer|pdf-runner|attachment-opener|viewer_route_mounted|native_handoff|android_remote_pdf_open|load_error|viewer_error_state/i.test(
          line,
        ),
    )
    .slice(-30);
}

function hasNativeHandoffSettled(logText: string) {
  return (
    hasToken(logText, "native_handoff_ready")
    || hasToken(logText, "android_remote_pdf_open_ready")
  );
}

function resolveTopActivity(topActivityText: string) {
  const lines = String(topActivityText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    lines.find((line) => /chrome|browser|pdf|docs|files|viewer/i.test(line) && !/launcher/i.test(line))
    ?? lines.find((line) => /ResumedActivity|topResumedActivity/i.test(line))
    ?? lines.find((line) => /ACTIVITY/i.test(line) && !/launcher/i.test(line))
    ?? lines.find((line) => /ACTIVITY/i.test(line))
    ?? ""
  );
}

async function bootstrapAndroidSurface(packageName: string | null) {
  if (packageName) {
    tryRun("adb", ["shell", "am", "start", "-W", "-n", `${packageName}/.MainActivity`]);
  } else {
    harness.startAndroidDevClientProject(null, 8081, { stopApp: false });
  }
  await sleep(3_000);
}

async function runRuntimeCase(
  family: string,
  route: string,
  sourceKind: "remote-url" | "invalid",
  expected: "ready" | "controlled_error",
  logPaths: string[],
): Promise<RuntimeCaseResult> {
  tryRun("adb", ["logcat", "-c"]);
  const baselineLength = readAllLiveLogText(logPaths).length;
  let logText = "";
  let caseError: string | null = null;

  try {
    harness.startAndroidRoute(null, route);
  } catch (error) {
    caseError = getErrorMessage(error);
    logText = readLogDelta(logPaths, baselineLength);
  }

  if (!caseError) {
    try {
      logText = await poll(
        `pdf-open:${family}`,
        async () => {
          const current = readLogDelta(logPaths, baselineLength);
          const routeMounted = hasToken(current, "viewer_route_mounted");
          const handoffStarted = hasToken(current, "native_handoff_start");
          const handoffReady = hasNativeHandoffSettled(current);
          const handoffError =
            hasToken(current, "native_handoff_error")
            || hasToken(current, "viewer_error_state")
            || hasToken(current, "load_error");

          if (!routeMounted) return null;
          if (expected === "ready" && (!handoffStarted || !handoffReady)) return null;
          if (expected === "controlled_error" && !handoffError) return null;
          return current;
        },
        45_000,
        1_000,
      );
    } catch (error) {
      caseError = getErrorMessage(error);
      logText = readLogDelta(logPaths, baselineLength);
    }
  }

  await sleep(1_500);
  const fullLog = readFullLogcat();
  const topActivityText = getTopActivityText();
  const topActivity = resolveTopActivity(topActivityText);
  const processAlive = Boolean(getPid());
  const routeMounted = hasToken(logText, "viewer_route_mounted");
  const handoffStarted = hasToken(logText, "native_handoff_start");
  const handoffReady = hasNativeHandoffSettled(logText);
  const handoffError =
    hasToken(logText, "native_handoff_error")
    || hasToken(logText, "viewer_error_state")
    || hasToken(logText, "load_error");
  const runtimeSettled =
    routeMounted
    && ((expected === "ready" && handoffStarted && handoffReady)
      || (expected === "controlled_error" && handoffError));
  const fatalExceptionLogged =
    /FATAL EXCEPTION|AndroidRuntime/i.test(fullLog)
    && /com\.azisbek_dzhantaev\.rikexpoapp/i.test(fullLog);
  const fatalCrash = !processAlive || (fatalExceptionLogged && !runtimeSettled);

  const passed =
    runtimeSettled
    && processAlive
    && !fatalCrash;

  return {
    family,
    route,
    sourceKind,
    routeMounted,
    handoffStarted,
    handoffReady,
    handoffError,
    fatalCrash,
    processAlive,
    topActivity,
    logExcerpt: buildRuntimeCaseLogExcerpt(logText),
    expected,
    passed,
    error: caseError,
  };
}

async function main() {
  let runtimePrepared:
    | Awaited<ReturnType<typeof harness.prepareAndroidRuntime>>
    | null = null;
  let runtimeCases: RuntimeCaseResult[] = [];
  let verifierError: string | null = null;
  let runtimeLogPaths: string[] = ["tmp/metro-pdf-open.log"];
  let runtimeCaseLogPaths: string[] = ["tmp/metro-pdf-open.log"];
  let metroEvidence = {
    viewerRouteMounted: false,
    nativeHandoffStarted: false,
    nativeOpenReady: false,
    nativeHandoffError: false,
    viewerErrorState: false,
  };

  const viewerContractSource = readText("src/lib/pdf/pdfViewerContract.ts");
  const viewerSource = readText("app/pdf-viewer.tsx");
  const pdfRunnerSource = readText("src/lib/pdfRunner.ts");
  const attachmentOpenerSource = readText("src/lib/documents/attachmentOpener.ts");
  const pdfDocumentActionsSource = readText("src/lib/documents/pdfDocumentActions.ts");
  const diffPreview = run("git", [
    "diff",
    "--unified=12",
    `${MOBILE_STABLE_COMMIT}..HEAD`,
    "--",
    "app/pdf-viewer.tsx",
    "src/lib/pdfRunner.ts",
    "src/lib/documents/attachmentOpener.ts",
    "src/lib/documents/pdfDocumentActions.ts",
  ])
    .split(/\r?\n/)
    .slice(0, 140);

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

  try {
    runtimePrepared = await harness.prepareAndroidRuntime();
    const harnessLogPaths = harness.getDevClientLogPaths();
    runtimeLogPaths = [
      harnessLogPaths.stdoutPath,
      harnessLogPaths.stderrPath,
      "artifacts/android-dev-client-8081.stdout.log",
      "artifacts/android-dev-client-8081.stderr.log",
      "artifacts/expo-dev-client-8081.stdout.log",
      "artifacts/expo-dev-client-8081.stderr.log",
      "tmp/metro-pdf-open.log",
    ].filter((value, index, items) => Boolean(value) && items.indexOf(value) === index);
    runtimeCaseLogPaths = ["tmp/metro-pdf-open.log"];

    await bootstrapAndroidSurface(runtimePrepared.packageName);

    const runtimeDefinitions = [
      {
        family: "director_pdf",
        familyToken: `director_pdf_${verifierRunId}`,
        route: encodeRoute({
          uri: runtimePdfUri(`director_pdf_${verifierRunId}`),
          fileName: "director-runtime-proof.pdf",
          documentType: "director_report",
          originModule: "director",
          source: "generated",
        }),
        sourceKind: "remote-url" as const,
        expected: "ready" as const,
      },
      {
        family: "accountant_payment_pdf",
        familyToken: `accountant_payment_pdf_${verifierRunId}`,
        route: encodeRoute({
          uri: runtimePdfUri(`accountant_payment_pdf_${verifierRunId}`),
          fileName: "accountant-payment-runtime-proof.pdf",
          documentType: "payment_order",
          originModule: "accountant",
          source: "generated",
        }),
        sourceKind: "remote-url" as const,
        expected: "ready" as const,
      },
      {
        family: "warehouse_pdf",
        familyToken: `warehouse_pdf_${verifierRunId}`,
        route: encodeRoute({
          uri: runtimePdfUri(`warehouse_pdf_${verifierRunId}`),
          fileName: "warehouse-runtime-proof.pdf",
          documentType: "warehouse_document",
          originModule: "warehouse",
          source: "generated",
        }),
        sourceKind: "remote-url" as const,
        expected: "ready" as const,
      },
      {
        family: "attachment_pdf_viewer_contract",
        familyToken: `attachment_pdf_viewer_contract_${verifierRunId}`,
        route: encodeRoute({
          uri: runtimePdfUri(`attachment_pdf_viewer_contract_${verifierRunId}`),
          fileName: "attachment-runtime-proof.pdf",
          documentType: "attachment_pdf",
          originModule: "reports",
          source: "attachment",
        }),
        sourceKind: "remote-url" as const,
        expected: "ready" as const,
      },
      {
        family: "invalid_source_contract",
        familyToken: `invalid_source_contract_${verifierRunId}`,
        route: encodeRoute({
          uri: `blob:https://example.com/runtime-proof.pdf?family=${encodeURIComponent(`invalid_source_contract_${verifierRunId}`)}`,
          fileName: "invalid-runtime-proof.pdf",
          documentType: "attachment_pdf",
          originModule: "reports",
          source: "generated",
        }),
        sourceKind: "invalid" as const,
        expected: "controlled_error" as const,
      },
    ];

    for (const definition of runtimeDefinitions) {
      await bootstrapAndroidSurface(runtimePrepared.packageName);
      runtimeCases.push(
        await runRuntimeCase(
          definition.family,
          definition.route,
          definition.sourceKind,
          definition.expected,
          runtimeCaseLogPaths,
        ),
      );
      await sleep(1_500);
    }

    const metroLog = readAllLiveLogText(runtimeLogPaths);
    metroEvidence = {
      viewerRouteMounted: metroLog.includes("[pdf-viewer] viewer_route_mounted"),
      nativeHandoffStarted: metroLog.includes("[pdf-viewer] native_handoff_start"),
      nativeOpenReady:
        metroLog.includes("[pdf-viewer] native_handoff_ready")
        || metroLog.includes("[pdf-runner] android_remote_pdf_open_ready")
        || metroLog.includes("[attachment-opener] android_remote_pdf_open_ready"),
      nativeHandoffError: metroLog.includes("[pdf-viewer] native_handoff_error"),
      viewerErrorState:
        metroLog.includes("[pdf-viewer] viewer_error_state")
        || metroLog.includes("[pdf-viewer] load_error"),
    };

    const boundaryChecks = {
      androidViewerStillUsesNativeHandoffBoundary:
        viewerContractSource.includes('platform === "ios"')
        && viewerContractSource.includes('platform === "web"')
        && viewerContractSource.includes('kind: "resolved-native-handoff"'),
      iosViewerUsesEmbeddedWebView:
        viewerContractSource.includes('platform === "ios"')
        && viewerContractSource.includes('renderer: "native-webview"'),
      webViewerStillEmbedded:
        viewerContractSource.includes('platform === "web"')
        && viewerContractSource.includes('renderer: "web-frame"'),
      viewerUsesNativeHandoff:
        viewerSource.includes('console.info("[pdf-viewer] native_handoff_start"')
        && viewerSource.includes("await openPdfPreview(")
        && viewerSource.includes('console.info("[pdf-viewer] native_handoff_ready"'),
      viewerImportsNativeWebViewForIosPreview: viewerSource.includes("react-native-webview"),
      previewRouteStillCanonical:
        pdfDocumentActionsSource.includes('route: "/pdf-viewer"')
        && pdfDocumentActionsSource.includes("createDocumentPreviewSession"),
      mobileRemotePreviewUsesDirectViewerBoundary:
        pdfDocumentActionsSource.includes('previewSourceMode: "direct_remote_viewer_contract"')
        && pdfDocumentActionsSource.includes("createInMemoryDocumentPreviewSession(doc)")
        && pdfDocumentActionsSource.includes("createViewerHref("),
      attachmentRemotePdfUsesSharedAndroidBoundary:
        attachmentOpenerSource.includes('mimeType === "application/pdf"')
        && attachmentOpenerSource.includes('source.kind === "remote"')
        && attachmentOpenerSource.includes("openAndroidRemotePdfUrl("),
      attachmentLocalPdfStillUsesIntent:
        attachmentOpenerSource.includes("getContentUriAsync")
        && attachmentOpenerSource.includes("openAndroidViewIntent")
        && attachmentOpenerSource.includes("startActivityAsync"),
      pdfRunnerMobilePrepareKeepsRemoteUrl:
        pdfRunnerSource.includes('if (Platform.OS === "android" || Platform.OS === "ios")')
        && pdfRunnerSource.includes("return source;"),
      pdfRunnerRemotePdfUsesSharedAndroidBoundary:
        pdfRunnerSource.includes("openAndroidRemotePdfUrlBoundary")
        && (pdfRunnerSource.match(/openAndroidRemotePdfUrlBoundary\(/g)?.length ?? 0) >= 2,
      pdfRunnerLocalPdfStillUsesIntent:
        pdfRunnerSource.includes("openAndroidPdfContentUri")
        && pdfRunnerSource.includes("openAndroidViewIntent")
        && pdfRunnerSource.includes("pdf_android_content_uri_ready"),
    };

    const testChecks = {
      jestSuccess: jestReport.success === true && jestReport.numFailedTests === 0,
      viewerRemoteSuccess: passed("routes mobile remote PDFs through native handoff instead of embedded webview"),
      viewerLocalSuccess: passed("routes mobile local PDFs through native handoff instead of embedded webview"),
      invalidViewerSourceControlled: passed("fails in a controlled way for blob/data PDF sources on native"),
      documentActionViewerRoute: passed("navigates to the shared viewer route with a prepared session when router is provided"),
      documentActionRemoteDirectViewerRoute:
        passed("routes mobile remote PDFs directly through the shared viewer contract without local session materialization"),
      pdfRunnerRemoteBoundarySuccess: passed("opens a remote PDF through the Android remote URL boundary"),
      pdfRunnerRemotePreparePreserved:
        passed("keeps backend remote PDF URLs intact for mobile preview preparation"),
      pdfRunnerRemoteExternalBoundarySuccess:
        passed("opens a remote PDF externally through the Android remote URL boundary"),
      pdfRunnerLocalExternalBoundarySuccess:
        passed("opens a local PDF externally through Android content uri handoff"),
      attachmentRemoteSuccess: passed("opens a remote attachment PDF through the Android remote URL boundary"),
      attachmentLocalSuccess: passed("opens a local attachment PDF through Android content uri handoff"),
      attachmentInvalidControlled: passed("fails in a controlled way for blob/data attachment sources on native"),
    };

    const runtimeChecks = {
      directorPdfOpen: runtimeCases.find((entry) => entry.family === "director_pdf")?.passed === true,
      accountantPaymentPdfOpen:
        runtimeCases.find((entry) => entry.family === "accountant_payment_pdf")?.passed === true,
      warehousePdfOpen: runtimeCases.find((entry) => entry.family === "warehouse_pdf")?.passed === true,
      attachmentPdfOpen:
        runtimeCases.find((entry) => entry.family === "attachment_pdf_viewer_contract")?.passed === true,
      invalidSourceControlled:
        runtimeCases.find((entry) => entry.family === "invalid_source_contract")?.passed === true,
      noFatalCrash: runtimeCases.every((entry) => entry.fatalCrash === false),
      processAliveAfterOpen: runtimeCases.every((entry) => entry.processAlive === true),
      liveOpenBoundaryEvidencePresent: runtimeCases
        .filter((entry) => entry.expected === "ready")
        .every((entry) => entry.handoffStarted && entry.handoffReady),
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
        brokenBoundary: "shared Android remote PDF open path still used Linking.openURL instead of the explicit VIEW intent boundary used by local PDFs",
        exactReason:
          "The crash reproduced during Android external PDF handoff with a NullPointerException in ReactActivityDelegate.onUserLeaveHint. The common remote PDF boundary still delegated to Linking.openURL, while local PDFs already used an explicit android.intent.action.VIEW intent. The hotfix unifies Android external PDF open on the explicit VIEW intent boundary for both remote and local PDF sources.",
        diffPreview,
      },
      checks: boundaryChecks,
      tsc: {
        success: tscResult.success,
        outputSnippet: tscResult.output.split(/\\r?\\n/).slice(0, 40),
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
        outputSnippet: tscResult.output.split(/\\r?\\n/).slice(0, 40),
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
          rootCause:
            "shared Android remote PDF open must use the same explicit VIEW intent boundary as local PDF handoff; Linking.openURL was the crashy branch",
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
          brokenBoundary: "shared Android remote PDF open path still used Linking.openURL instead of the explicit VIEW intent boundary used by local PDFs",
          exactReason:
            "The crash reproduced during Android external PDF handoff with a NullPointerException in ReactActivityDelegate.onUserLeaveHint. The common remote PDF boundary still delegated to Linking.openURL, while local PDFs already used an explicit android.intent.action.VIEW intent. The hotfix unifies Android external PDF open on the explicit VIEW intent boundary for both remote and local PDF sources.",
          diffPreview,
        },
        verifierError,
        tsc: {
          success: tscResult.success,
          outputSnippet: tscResult.output.split(/\\r?\\n/).slice(0, 40),
        },
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
          outputSnippet: tscResult.output.split(/\\r?\\n/).slice(0, 40),
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
    runtimePrepared?.devClient.cleanup();
  }
}

void main();
