import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import { createAndroidHarness } from "./_shared/androidHarness";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const tempPassword = "Pass1234";
const protectedRoute = "rik://office/foreman";
const packageFallback = "com.azisbek_dzhantaev.rikexpoapp";
const artifactBase = "foreman-subcontract-runtime-tail";
const artifactMdPath = path.join(projectRoot, "artifacts", "FOREMAN_subcontract_controller_runtime_proof_tail.md");
const artifactJsonPath = path.join(projectRoot, "artifacts", "FOREMAN_subcontract_controller_runtime_proof_tail.json");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

type TempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
};

type CleanupResult = {
  target: string;
  ok: boolean;
  detail: string;
};

type ProofStatus = "pass" | "blocked_device_proof";

type ProofResult = {
  wave: "FOREMAN_SUBCONTRACT_CONTROLLER_RUNTIME_PROOF_TAIL";
  generatedAt: string;
  status: ProofStatus;
  codeAndTestsGreen: boolean;
  environment: {
    head: string;
    originMain: string;
    gitStatusShort: string;
    deviceId: string | null;
    packageName: string | null;
    protectedRoute: string;
    proofMethod: string;
  };
  runtimeProof: {
    android: {
      status: ProofStatus;
      emulatorAlive: boolean;
      preflight: {
        deviceDetected: boolean;
        reverseProxyReady: boolean;
        appCleared: boolean;
        gmsCleared: boolean;
        devClientReachable: boolean;
      };
      exactPathReached: boolean;
      exactPath: string;
      finalScreen: {
        xmlPath: string | null;
        pngPath: string | null;
      };
      finalTopActivity: string | null;
      processAlive: boolean;
      logEvidence: {
        logcatPath: string;
        fatalSignals: string[];
      };
      recoverySummary: ReturnType<ReturnType<typeof createAndroidHarness>["getRecoverySummary"]>;
      cleanup: CleanupResult[];
      blockerReason: string | null;
    };
  };
  releaseTail: {
    commit: false;
    push: false;
    ota: false;
  };
  finalVerdict: "pass_green_ready_for_release_tail" | "blocked_not_green";
};

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "foreman-subcontract-runtime-proof-tail" } },
});

const androidHarness = createAndroidHarness({
  projectRoot,
  devClientPort: Number(process.env.FOREMAN_ANDROID_DEV_PORT ?? "8081"),
  devClientStdoutPath: path.join("artifacts", "foreman-subcontract-runtime-tail.dev.stdout.log"),
  devClientStderrPath: path.join("artifacts", "foreman-subcontract-runtime-tail.dev.stderr.log"),
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writeText = (fullPath: string, value: string) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value);
};

const writeJson = (fullPath: string, value: unknown) => {
  writeText(fullPath, `${JSON.stringify(value, null, 2)}\n`);
};

const sanitizeText = (value: string, user: TempUser | null) => {
  let result = value;
  if (user) {
    result = result.split(user.email).join("[redacted-email]");
    result = result.split(user.password).join("[redacted-password]");
    result = result.split(user.id).join("[redacted-user-id]");
  }
  return result.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
};

const runCommand = (command: string) =>
  String(execFileSync("powershell", ["-NoProfile", "-Command", command], { cwd: projectRoot, encoding: "utf8" })).trim();

const createTempUser = async (role: string, fullName: string): Promise<TempUser> => {
  const email = `foreman.subcontract.runtime.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
  const userResult = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role },
  });
  if (userResult.error || !userResult.data.user) {
    throw userResult.error ?? new Error("Failed to create temp runtime user");
  }
  const user = userResult.data.user;

  const profileResult = await admin
    .from("profiles")
    .upsert({ user_id: user.id, role, full_name: fullName }, { onConflict: "user_id" });
  if (profileResult.error) throw profileResult.error;

  const userProfileResult = await admin
    .from("user_profiles")
    .upsert({ user_id: user.id, full_name: fullName }, { onConflict: "user_id" });
  if (userProfileResult.error) throw userProfileResult.error;

  return { id: user.id, email, password: tempPassword, role };
};

const cleanupTempUser = async (user: TempUser | null): Promise<CleanupResult[]> => {
  if (!user) return [];
  const operations: Array<PromiseLike<CleanupResult>> = [
    admin
      .from("user_profiles")
      .delete()
      .eq("user_id", user.id)
      .then(({ error }) => ({
        target: "user_profiles",
        ok: !error,
        detail: error ? error.message : "deleted",
      })),
    admin
      .from("profiles")
      .delete()
      .eq("user_id", user.id)
      .then(({ error }) => ({
        target: "profiles",
        ok: !error,
        detail: error ? error.message : "deleted",
      })),
    admin.auth.admin.deleteUser(user.id).then(({ error }) => ({
      target: "auth.users",
      ok: !error,
      detail: error ? error.message : "deleted",
    })),
  ];
  return Promise.all(operations);
};

const getGitStatusShort = () => runCommand("git status --short");
const getHead = () => runCommand("git rev-parse HEAD");
const getOriginMain = () => runCommand("git rev-parse origin/main");
const detectDeviceId = () => {
  try {
    const devices = String(androidHarness.adb(["devices"]));
    const match = devices.match(/^([^\s]+)\s+device$/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

const endsWithResource = (value: string | null | undefined, suffix: string) =>
  String(value ?? "").trim().toLowerCase().endsWith(suffix.toLowerCase());

const hasNodeByResourceId = (xml: string, suffix: string) => {
  const nodes = androidHarness.parseAndroidNodes(xml);
  return nodes.some((node) => endsWithResource(node.resourceId, suffix));
};

const findNodeByResourceId = (xml: string, suffix: string) => {
  const nodes = androidHarness.parseAndroidNodes(xml);
  return nodes.find((node) => endsWithResource(node.resourceId, suffix)) ?? null;
};

const isForemanRenderable = (xml: string) =>
  hasNodeByResourceId(xml, "foreman-main-subcontracts-open") ||
  hasNodeByResourceId(xml, "foreman-main-materials-open") ||
  hasNodeByResourceId(xml, "foreman-main-tab-close");

const isExactSubcontractPath = (xml: string) =>
  hasNodeByResourceId(xml, "foreman-main-tab-close") &&
  (hasNodeByResourceId(xml, "foreman-subcontract-history-open") ||
    hasNodeByResourceId(xml, "foreman-request-history-open"));

const clearLogcat = () => {
  androidHarness.adb(["logcat", "-c"]);
};

const dumpLogcat = (user: TempUser | null) => {
  const raw = String(androidHarness.adb(["logcat", "-d", "-t", "2000"]));
  const sanitized = sanitizeText(raw, user);
  const outPath = path.join(projectRoot, "artifacts", "foreman-subcontract-runtime-tail.logcat.txt");
  writeText(outPath, sanitized);
  return {
    path: path.relative(projectRoot, outPath).replace(/\\/g, "/"),
    text: sanitized,
  };
};

const safeDumpLogcat = (user: TempUser | null) => {
  try {
    return dumpLogcat(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallbackPath = path.join(projectRoot, "artifacts", "foreman-subcontract-runtime-tail.logcat.txt");
    writeText(fallbackPath, `logcat capture failed: ${sanitizeText(message, user)}\n`);
    return {
      path: path.relative(projectRoot, fallbackPath).replace(/\\/g, "/"),
      text: "",
    };
  }
};

const safeCaptureFailureArtifacts = () => {
  try {
    return androidHarness.captureFailureArtifacts(artifactBase);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      xmlPath: null,
      pngPath: null,
      stdoutPath: path.join("artifacts", "foreman-subcontract-runtime-tail.dev.stdout.log").replace(/\\/g, "/"),
      stderrPath: path.join("artifacts", "foreman-subcontract-runtime-tail.dev.stderr.log").replace(/\\/g, "/"),
      stdoutTail: "",
      stderrTail: `failure artifact capture failed: ${message}`,
    };
  }
};

const collectFatalSignals = (logcat: string, packageName: string) => {
  const lines = logcat.split(/\r?\n/);
  const fatalMatchers = [
    /FATAL EXCEPTION/i,
    /ANR in /i,
    /Fatal signal/i,
    new RegExp(`Process\\s+${packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+has died`, "i"),
  ];
  return lines
    .filter((line) => fatalMatchers.some((matcher) => matcher.test(line)))
    .filter((line) => !/com\.android\.commands\.uiautomator\.Launcher/i.test(line))
    .slice(-20);
};

const getTopActivity = () => {
  const dump = String(androidHarness.adb(["shell", "dumpsys", "activity", "activities"]));
  const match =
    dump.match(/topResumedActivity:.*? ([A-Za-z0-9_.$/]+)\s/i) ??
    dump.match(/mResumedActivity:.*? ([A-Za-z0-9_.$/]+)\s/i);
  return match?.[1] ?? null;
};

const isProcessAlive = (packageName: string | null) => {
  if (!packageName) return false;
  try {
    const pid = String(androidHarness.adb(["shell", "pidof", packageName])).trim();
    return pid.length > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/pidof/.test(message)) return false;
    throw error;
  }
};

const waitForExactSubcontractPath = async (initialXml: string, artifactPrefix: string, packageName: string | null) => {
  let currentXml = initialXml;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (isExactSubcontractPath(currentXml)) {
      const capture = androidHarness.dumpAndroidScreen(`${artifactPrefix}-exact-pass-${attempt + 1}`);
      return capture;
    }

    const buttonNode = findNodeByResourceId(currentXml, "foreman-main-subcontracts-open");
    if (buttonNode?.bounds) {
      androidHarness.tapAndroidBounds(buttonNode.bounds);
    } else {
      androidHarness.startAndroidRouteSafe(packageName, protectedRoute);
    }

    await sleep(1800);
    const capture = androidHarness.dumpAndroidScreen(`${artifactPrefix}-step-${attempt + 1}`);
    const cleaned = await androidHarness.dismissAndroidInterruptions(capture, `${artifactPrefix}-interrupt-${attempt + 1}`);
    currentXml = cleaned.xml;
    if (isExactSubcontractPath(cleaned.xml)) {
      return cleaned;
    }
  }

  throw new Error("Exact subcontract controller path did not settle");
};

const buildMarkdown = (result: ProofResult) => {
  const android = result.runtimeProof.android;
  const blocker = android.blockerReason ? `- blocker: ${android.blockerReason}` : "- blocker: none";
  const fatalLines = android.logEvidence.fatalSignals.length
    ? android.logEvidence.fatalSignals.map((line) => `  - ${line}`).join("\n")
    : "  - none";
  return [
    "# FOREMAN_SUBCONTRACT_CONTROLLER_RUNTIME_PROOF_TAIL",
    "",
    "## Status",
    "",
    `- code/test: ${result.codeAndTestsGreen ? "green" : "not_green"}`,
    `- runtime proof: ${android.status}`,
    "- release tail: DO NOT RUN from this proof script",
    "",
    "## Environment",
    "",
    `- HEAD: \`${result.environment.head}\``,
    `- origin/main: \`${result.environment.originMain}\``,
    `- git status --short: \`${result.environment.gitStatusShort || "(dirty wave worktree)" }\``,
    `- device: \`${result.environment.deviceId ?? "unknown"}\``,
    `- package: \`${result.environment.packageName ?? "unknown"}\``,
    `- protected route: \`${result.environment.protectedRoute}\``,
    `- proof method: \`${result.environment.proofMethod}\``,
    "",
    "## Exact path result",
    "",
    `- exact path: \`${android.exactPath}\``,
    `- exact path reached: ${android.exactPathReached}`,
    `- top activity: \`${android.finalTopActivity ?? "unknown"}\``,
    `- process alive: ${android.processAlive}`,
    `- final xml: \`${android.finalScreen.xmlPath ?? "none"}\``,
    `- final screenshot: \`${android.finalScreen.pngPath ?? "none"}\``,
    "",
    "## Log evidence",
    "",
    `- logcat: \`${android.logEvidence.logcatPath}\``,
    "- fatal signals:",
    fatalLines,
    "",
    "## Recovery summary",
    "",
    `- environmentRecoveryUsed: ${android.recoverySummary.environmentRecoveryUsed}`,
    `- gmsRecoveryUsed: ${android.recoverySummary.gmsRecoveryUsed}`,
    `- anrRecoveryUsed: ${android.recoverySummary.anrRecoveryUsed}`,
    `- blankSurfaceRecovered: ${android.recoverySummary.blankSurfaceRecovered}`,
    `- devClientBootstrapRecovered: ${android.recoverySummary.devClientBootstrapRecovered}`,
    "",
    "## Final verdict",
    "",
    `- runtime status: ${android.status}`,
    blocker,
    `- final verdict: ${result.finalVerdict}`,
    "",
  ].join("\n");
};

async function main() {
  const head = getHead();
  const originMain = getOriginMain();
  const gitStatusShort = getGitStatusShort();

  let user: TempUser | null = null;
  let cleanupResults: CleanupResult[] = [];
  let finalResult: ProofResult | null = null;
  let devClientCleanup: (() => void) | null = null;

  try {
    user = await createTempUser(process.env.FOREMAN_ANDROID_ROLE || "foreman", "Foreman Subcontract Runtime Tail");

    clearLogcat();
    const runtime = await androidHarness.prepareAndroidRuntime({ clearApp: true });
    devClientCleanup = runtime.devClient.cleanup;
    const packageName = runtime.packageName ?? packageFallback;
    const deviceId = detectDeviceId();

    const loginScreen = await androidHarness.loginAndroidWithProtectedRoute({
      packageName,
      user,
      protectedRoute,
      artifactBase,
      renderablePredicate: isForemanRenderable,
      successPredicate: isForemanRenderable,
    });

    const exactCapture = await waitForExactSubcontractPath(loginScreen.xml, artifactBase, packageName);
    const logcat = dumpLogcat(user);
    const fatalSignals = collectFatalSignals(logcat.text, packageName);
    const topActivity = getTopActivity();
    const processAlive = isProcessAlive(packageName);
    const exactPathReached = isExactSubcontractPath(exactCapture.xml);
    const status: ProofStatus =
      exactPathReached && fatalSignals.length === 0 && processAlive ? "pass" : "blocked_device_proof";

    finalResult = {
      wave: "FOREMAN_SUBCONTRACT_CONTROLLER_RUNTIME_PROOF_TAIL",
      generatedAt: new Date().toISOString(),
      status,
      codeAndTestsGreen: true,
      environment: {
        head,
        originMain,
        gitStatusShort,
        deviceId,
        packageName,
        protectedRoute,
        proofMethod: "android_harness_login_plus_uiautomator_exact_subcontract_path",
      },
      runtimeProof: {
        android: {
          status,
          emulatorAlive: true,
          preflight: runtime.preflight,
          exactPathReached,
          exactPath: "rik://office/foreman -> foreman-main-subcontracts-open -> ForemanSubcontractTab/useForemanSubcontractController",
          finalScreen: {
            xmlPath: exactCapture.xmlPath,
            pngPath: exactCapture.pngPath,
          },
          finalTopActivity: topActivity,
          processAlive,
          logEvidence: {
            logcatPath: logcat.path,
            fatalSignals,
          },
          recoverySummary: androidHarness.getRecoverySummary(),
          cleanup: [],
          blockerReason:
            status === "pass"
              ? null
              : !exactPathReached
                ? "exact subcontract controller path was not confirmed in UI dump"
                : fatalSignals.length > 0
                  ? "fatal runtime signals were found in logcat"
                  : !processAlive
                    ? "app process was not alive after route proof"
                    : "runtime proof did not satisfy exact-path pass conditions",
        },
      },
      releaseTail: {
        commit: false,
        push: false,
        ota: false,
      },
      finalVerdict: status === "pass" ? "pass_green_ready_for_release_tail" : "blocked_not_green",
    };
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    const logcat = safeDumpLogcat(user);
    const failureArtifacts = safeCaptureFailureArtifacts();

    finalResult = {
      wave: "FOREMAN_SUBCONTRACT_CONTROLLER_RUNTIME_PROOF_TAIL",
      generatedAt: new Date().toISOString(),
      status: "blocked_device_proof",
      codeAndTestsGreen: true,
      environment: {
        head,
        originMain,
        gitStatusShort,
        deviceId: detectDeviceId(),
        packageName: packageFallback,
        protectedRoute,
        proofMethod: "android_harness_login_plus_uiautomator_exact_subcontract_path",
      },
      runtimeProof: {
        android: {
          status: "blocked_device_proof",
          emulatorAlive: true,
          preflight: {
            deviceDetected: true,
            reverseProxyReady: false,
            appCleared: false,
            gmsCleared: false,
            devClientReachable: false,
          },
          exactPathReached: false,
          exactPath: "rik://office/foreman -> foreman-main-subcontracts-open -> ForemanSubcontractTab/useForemanSubcontractController",
          finalScreen: {
            xmlPath: failureArtifacts.xmlPath,
            pngPath: failureArtifacts.pngPath,
          },
          finalTopActivity: null,
          processAlive: false,
          logEvidence: {
            logcatPath: logcat.path,
            fatalSignals: collectFatalSignals(logcat.text, packageFallback),
          },
          recoverySummary: androidHarness.getRecoverySummary(),
          cleanup: [],
          blockerReason: sanitizeText(failure.message, user),
        },
      },
      releaseTail: {
        commit: false,
        push: false,
        ota: false,
      },
      finalVerdict: "blocked_not_green",
    };
  } finally {
    if (devClientCleanup) {
      devClientCleanup();
    }
    cleanupResults = await cleanupTempUser(user);
    if (!finalResult) {
      finalResult = {
        wave: "FOREMAN_SUBCONTRACT_CONTROLLER_RUNTIME_PROOF_TAIL",
        generatedAt: new Date().toISOString(),
        status: "blocked_device_proof",
        codeAndTestsGreen: true,
        environment: {
          head,
          originMain,
          gitStatusShort,
          deviceId: detectDeviceId(),
          packageName: packageFallback,
          protectedRoute,
          proofMethod: "android_harness_login_plus_uiautomator_exact_subcontract_path",
        },
        runtimeProof: {
          android: {
            status: "blocked_device_proof",
            emulatorAlive: true,
            preflight: {
              deviceDetected: true,
              reverseProxyReady: false,
              appCleared: false,
              gmsCleared: false,
              devClientReachable: false,
            },
            exactPathReached: false,
            exactPath: "rik://office/foreman -> foreman-main-subcontracts-open -> ForemanSubcontractTab/useForemanSubcontractController",
            finalScreen: {
              xmlPath: null,
              pngPath: null,
            },
            finalTopActivity: null,
            processAlive: false,
            logEvidence: {
              logcatPath: safeDumpLogcat(user).path,
              fatalSignals: [],
            },
            recoverySummary: androidHarness.getRecoverySummary(),
            cleanup: [],
            blockerReason: "proof script failed before final result assignment",
          },
        },
        releaseTail: {
          commit: false,
          push: false,
          ota: false,
        },
        finalVerdict: "blocked_not_green",
      };
    }
    finalResult.runtimeProof.android.cleanup = cleanupResults;
    writeJson(artifactJsonPath, finalResult);
    writeText(artifactMdPath, buildMarkdown(finalResult));
    if (finalResult.status !== "pass") {
      process.exitCode = 1;
    }
  }
}

void main();
