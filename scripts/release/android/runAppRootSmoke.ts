import {
  DEFAULT_DEVICE_ID,
  MAIN_ACTIVITY,
  adbPath,
  getCandidate,
  readPackageName,
  run,
  truncateOutput,
  writeAndroidJson,
} from "./shared";
import {
  createAndroidHarness,
  isAndroidEmbeddedAiRouteSurfaceXml,
  isAndroidRequestRouteSurfaceXml,
} from "../../_shared/androidHarness";
import {
  createTempUser,
  createVerifierAdmin,
  hasRuntimeTestCredentials,
  runtimeTestCredentialsBlocker,
} from "../../_shared/testUserDiscipline";
import {
  buildAndroidDeepLinkLaunchArgs,
  buildAndroidRouteDeepLink,
} from "../../e2e/androidDeepLinkLaunchContract";
import {
  OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES,
  collectRouteToScreenLifecycleEvidence,
  isWarmAndroidActivityDelivery,
  type OfficialRouteToScreenAckCase,
  type RouteToScreenLifecycleEvidence,
} from "./routeToScreenAck";

const SMOKE_TIMEOUT_MS = 10 * 60 * 1000;
const ROUTE_LIFECYCLE_TIMEOUT_MS = 35_000;
const ROUTE_UI_TIMEOUT_MS = 25_000;
const DEVICE_UI_PATH = "/sdcard/release_pipeline_root.xml";

type RouteToScreenCaseResult = {
  caseId: string;
  route: OfficialRouteToScreenAckCase["route"];
  promptLaunchId: string;
  estimateLaunchId: string;
  promptWarmDelivery: boolean;
  estimateWarmDelivery: boolean;
  promptLifecycle: RouteToScreenLifecycleEvidence;
  estimateLifecycle: RouteToScreenLifecycleEvidence;
  promptUiMissing: string[];
  estimateUiMissing: string[];
  promptUiSample: string;
  estimateUiSample: string;
  noDoubleGeneration: boolean;
  passed: boolean;
};

function dumpUi(adb: string, deviceId: string): string {
  run(adb, ["-s", deviceId, "shell", "rm", "-f", DEVICE_UI_PATH], 8_000);
  const dumped = run(adb, ["-s", deviceId, "shell", "timeout", "15", "uiautomator", "dump", DEVICE_UI_PATH], 20_000);
  const xml = dumped.ok
    ? run(adb, ["-s", deviceId, "exec-out", "cat", DEVICE_UI_PATH], 20_000).output
    : "";
  run(adb, ["-s", deviceId, "shell", "rm", "-f", DEVICE_UI_PATH], 8_000);
  return xml;
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForUi(
  adb: string,
  deviceId: string,
  required: readonly string[],
  timeoutMs: number,
  surface?: {
    predicate: (xml: string) => boolean;
    failureToken: string;
  },
): { aggregate: string; missing: string[] } {
  const deadline = Date.now() + timeoutMs;
  let aggregate = "";
  let latestXml = "";
  let attempt = 0;
  while (Date.now() < deadline) {
    sleep(attempt === 0 ? 1_000 : 1_500);
    const xml = dumpUi(adb, deviceId);
    if (xml) {
      latestXml = xml;
      aggregate += `\n${xml}`;
    }
    const folded = aggregate.toLocaleLowerCase("ru-RU");
    const missing = required.filter(
      (token) => !folded.includes(token.toLocaleLowerCase("ru-RU")),
    );
    if (
      missing.length === 0 &&
      (!surface || surface.predicate(latestXml))
    ) {
      return { aggregate, missing };
    }
    const swipe =
      attempt % 3 === 0
        ? ["540", "550", "540", "1800", "350"]
        : ["540", "1800", "540", "550", "450"];
    run(adb, ["-s", deviceId, "shell", "input", "swipe", ...swipe], 12_000);
    attempt += 1;
  }
  const folded = aggregate.toLocaleLowerCase("ru-RU");
  const missing = required.filter(
      (token) => !folded.includes(token.toLocaleLowerCase("ru-RU")),
    );
  if (surface && !surface.predicate(latestXml)) {
    missing.push(surface.failureToken);
  }
  return { aggregate, missing };
}

function readLifecycle(
  adb: string,
  deviceId: string,
  launchId: string,
): RouteToScreenLifecycleEvidence {
  const logcat = run(
    adb,
    ["-s", deviceId, "logcat", "-d", "-v", "time", "ReactNativeJS:I", "*:S"],
    20_000,
  );
  return collectRouteToScreenLifecycleEvidence(
    logcat.ok ? logcat.output : "",
    launchId,
  );
}

function waitForLifecycle(
  adb: string,
  deviceId: string,
  launchId: string,
): RouteToScreenLifecycleEvidence {
  const deadline = Date.now() + ROUTE_LIFECYCLE_TIMEOUT_MS;
  let evidence = readLifecycle(adb, deviceId, launchId);
  while (!evidence.acknowledged && Date.now() < deadline) {
    sleep(1_500);
    evidence = readLifecycle(adb, deviceId, launchId);
  }
  return evidence;
}

function deepLink(
  testCase: OfficialRouteToScreenAckCase,
  launchId: string,
  automatic: boolean,
): string {
  const uri = buildAndroidRouteDeepLink({
    route: testCase.route,
    prompt: testCase.prompt,
    context: testCase.context === "foreman" ? "foreman" : undefined,
    launchId,
    automaticParam: testCase.automaticParam,
  });
  if (automatic) return uri;
  const promptOnly = new URL(uri);
  promptOnly.searchParams.delete(testCase.automaticParam);
  return promptOnly.toString();
}

function launchDeepLink(
  adb: string,
  deviceId: string,
  packageName: string,
  uri: string,
) {
  return run(
    adb,
    buildAndroidDeepLinkLaunchArgs(deviceId, uri, packageName),
    30_000,
  );
}

function runRouteToScreenCase(input: {
  adb: string;
  deviceId: string;
  packageName: string;
  candidateHash: string;
  testCase: OfficialRouteToScreenAckCase;
}): RouteToScreenCaseResult {
  const { adb, deviceId, packageName, candidateHash, testCase } = input;
  const caseRunId = `android-pipeline:${candidateHash.slice(0, 12)}:${testCase.caseId}:${Date.now().toString(36)}`;
  const promptLaunchId = `${caseRunId}:prompt`;
  const estimateLaunchId = `${caseRunId}:estimate`;
  const promptLaunch = launchDeepLink(
    adb,
    deviceId,
    packageName,
    deepLink(testCase, promptLaunchId, false),
  );
  const promptLifecycle = waitForLifecycle(
    adb,
    deviceId,
    promptLaunchId,
  );
  const promptUi = waitForUi(
    adb,
    deviceId,
    [testCase.prompt],
    12_000,
    testCase.route === "/request"
      ? {
          predicate: isAndroidRequestRouteSurfaceXml,
          failureToken: "REQUEST_ROUTE_SURFACE_NOT_READY",
        }
      : {
          predicate: isAndroidEmbeddedAiRouteSurfaceXml,
          failureToken: "EMBEDDED_AI_ROUTE_SURFACE_NOT_READY",
        },
  );
  const estimateLaunch = launchDeepLink(
    adb,
    deviceId,
    packageName,
    deepLink(testCase, estimateLaunchId, true),
  );
  const estimateLifecycle = waitForLifecycle(
    adb,
    deviceId,
    estimateLaunchId,
  );
  const estimateUi = waitForUi(
    adb,
    deviceId,
    [
      testCase.prompt,
      ...testCase.requiredTestIds,
      ...testCase.representativeTokens,
      ...testCase.unitTokens,
    ],
    ROUTE_UI_TIMEOUT_MS,
    testCase.route === "/request"
      ? {
          predicate: isAndroidRequestRouteSurfaceXml,
          failureToken: "REQUEST_ROUTE_SURFACE_NOT_READY",
        }
      : {
          predicate: isAndroidEmbeddedAiRouteSurfaceXml,
          failureToken: "EMBEDDED_AI_ROUTE_SURFACE_NOT_READY",
        },
  );
  const promptWarmDelivery = isWarmAndroidActivityDelivery(
    promptLaunch.output,
  );
  const estimateWarmDelivery = isWarmAndroidActivityDelivery(
    estimateLaunch.output,
  );
  const noDoubleGeneration =
    estimateLifecycle.orderedStages.filter(
      (stage) => stage === "DRAFT_SESSION_READY",
    ).length === 1;
  const passed =
    promptLaunch.ok &&
    estimateLaunch.ok &&
    promptWarmDelivery &&
    estimateWarmDelivery &&
    promptLifecycle.acknowledged &&
    estimateLifecycle.acknowledged &&
    promptUi.missing.length === 0 &&
    estimateUi.missing.length === 0 &&
    noDoubleGeneration;
  return {
    caseId: testCase.caseId,
    route: testCase.route,
    promptLaunchId,
    estimateLaunchId,
    promptWarmDelivery,
    estimateWarmDelivery,
    promptLifecycle,
    estimateLifecycle,
    promptUiMissing: promptUi.missing,
    estimateUiMissing: estimateUi.missing,
    promptUiSample: truncateOutput(promptUi.aggregate),
    estimateUiSample: truncateOutput(estimateUi.aggregate),
    noDoubleGeneration,
    passed,
  };
}

async function main(): Promise<void> {
  const candidate = getCandidate();
  const adb = adbPath();
  const deviceId = process.env.E2E_ANDROID_DEVICE_ID ?? DEFAULT_DEVICE_ID;
  const packageName = readPackageName();
  const mainActivity = `${packageName}/.MainActivity`;
  const failures: string[] = [];

  run(adb, ["-s", deviceId, "shell", "am", "force-stop", packageName], 20_000);
  run(adb, ["-s", deviceId, "logcat", "-c"], 20_000);
  const started = run(adb, ["-s", deviceId, "shell", "am", "start", "-n", mainActivity || MAIN_ACTIVITY], 30_000);
  if (!started.ok) failures.push("MAIN_ACTIVITY_START_FAILED");

  const deadline = Date.now() + SMOKE_TIMEOUT_MS;
  let lastDump = "";
  let lastIdentityLog = "";
  let appRootReady = false;
  let buildIdentityMatches = false;
  while (Date.now() < deadline) {
    lastDump = dumpUi(adb, deviceId);
    lastIdentityLog = run(adb, ["-s", deviceId, "logcat", "-d", "-v", "brief"], 30_000).output;
    appRootReady = /auth\.login\.screen|auth\.register\.screen|consumer-repair-screen|app-bottom-nav|tabs\.(?:office|request|profile)/.test(lastDump);
    buildIdentityMatches = lastIdentityLog.includes("[BuildIdentityEvidence]")
      && lastIdentityLog.includes(candidate.candidateHash)
      && lastIdentityLog.includes(candidate.productSourceHash);
    if (appRootReady && buildIdentityMatches) break;
    sleep(3_000);
  }

  if (!appRootReady) failures.push("APP_ROOT_PRODUCT_SURFACE_MISSING");
  if (!lastIdentityLog.includes("[BuildIdentityEvidence]")) failures.push("BUILD_IDENTITY_EVIDENCE_LOG_MISSING");
  if (!buildIdentityMatches) failures.push("BUILD_IDENTITY_CANDIDATE_MISMATCH");

  const admin = hasRuntimeTestCredentials
    ? createVerifierAdmin("android-normal-apk-route-to-screen-ack")
    : null;
  let user: Awaited<ReturnType<typeof createTempUser>> | null = null;
  let companyId: string | null = null;
  let authLoginAttempted = false;
  let authGreen = false;
  const routeCases: RouteToScreenCaseResult[] = [];
  const cleanup = {
    attempted: false,
    companyRemoved: false,
    userRemoved: false,
  };

  try {
    if (failures.length > 0) {
      throw new Error("ANDROID_NORMAL_APK_APP_ROOT_PREFLIGHT_RED");
    }
    if (!admin) throw new Error(runtimeTestCredentialsBlocker);
    user = await createTempUser(admin, {
      role: "buyer",
      fullName: "Android Normal APK Route ACK",
      emailPrefix: "android-normal-apk-route-ack",
    });
    const company = await admin
      .from("companies")
      .insert({
        owner_user_id: user.id,
        name: `Android Normal APK Route ACK ${Date.now().toString(36)}`,
        city: "Bishkek",
        address: "Temporary local Android release proof",
        phone_main: "+996555000000",
        email: user.email,
        about_short: "Temporary local route-to-screen ACK proof",
      })
      .select("id")
      .single();
    if (company.error) throw company.error;
    companyId = String((company.data as { id?: unknown } | null)?.id ?? "");
    if (!companyId) throw new Error("ANDROID_NORMAL_APK_COMPANY_NOT_CREATED");
    const profile = await admin.from("company_profiles").insert({
      id: companyId,
      user_id: user.id,
      owner_user_id: user.id,
      name: "Android Normal APK Route ACK",
      phone: "+996555000000",
      email: user.email,
    });
    if (profile.error) throw profile.error;
    const membership = await admin.from("company_members").upsert(
      { company_id: companyId, user_id: user.id, role: "buyer" },
      { onConflict: "company_id,user_id" },
    );
    if (membership.error) throw membership.error;

    const harness = createAndroidHarness({
      projectRoot: process.cwd(),
      devClientPort: 0,
    });
    const cleared = run(
      adb,
      ["-s", deviceId, "shell", "pm", "clear", packageName],
      30_000,
    );
    if (!cleared.ok || !cleared.output.includes("Success")) {
      throw new Error("ANDROID_NORMAL_APK_CLEAR_FAILED");
    }
    const loginLaunch = launchDeepLink(
      adb,
      deviceId,
      packageName,
      "rik:///auth/login",
    );
    if (!loginLaunch.ok) throw new Error("ANDROID_NORMAL_APK_LOGIN_ROUTE_RED");

    const loginDeadline = Date.now() + 90_000;
    let loginXml = "";
    while (Date.now() < loginDeadline) {
      sleep(1_000);
      loginXml = dumpUi(adb, deviceId);
      if (
        loginXml.includes("auth.login.screen") &&
        loginXml.includes("auth.login.email") &&
        loginXml.includes("auth.login.password")
      ) {
        break;
      }
    }
    const loginNodes = harness.parseAndroidNodes(loginXml);
    const emailNode = loginNodes.find(
      (node) => node.resourceId === "auth.login.email",
    );
    const passwordNode = loginNodes.find(
      (node) => node.resourceId === "auth.login.password",
    );
    if (!emailNode || !passwordNode) {
      throw new Error("ANDROID_NORMAL_APK_AUTH_FIELDS_RED");
    }
    authLoginAttempted = true;
    await harness.replaceAndroidFieldText(emailNode, user.email);
    await harness.replaceAndroidFieldText(passwordNode, user.password);
    harness.pressAndroidKey(4);
    sleep(600);
    const submitXml = dumpUi(adb, deviceId);
    const submitNode = harness
      .parseAndroidNodes(submitXml)
      .find(
        (node) =>
          node.resourceId === "auth.login.submit" && node.enabled,
      );
    if (!submitNode || !harness.tapAndroidBounds(submitNode.bounds)) {
      throw new Error("ANDROID_NORMAL_APK_AUTH_SUBMIT_RED");
    }
    const authDeadline = Date.now() + 90_000;
    while (Date.now() < authDeadline) {
      sleep(1_000);
      const xml = dumpUi(adb, deviceId);
      authGreen =
        xml.includes("ROUTE_PROOF_AUTHENTICATED_SESSION_READY") ||
        xml.includes("consumer-repair-screen") ||
        xml.includes("app-bottom-nav");
      if (authGreen) break;
    }
    if (!authGreen) throw new Error("ANDROID_NORMAL_APK_REAL_LOGIN_RED");

    const logcatClear = run(
      adb,
      ["-s", deviceId, "logcat", "-c"],
      20_000,
    );
    if (!logcatClear.ok) throw new Error("ANDROID_NORMAL_APK_LOGCAT_CLEAR_RED");
    for (const testCase of OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES) {
      routeCases.push(
        runRouteToScreenCase({
          adb,
          deviceId,
          packageName,
          candidateHash: candidate.candidateHash,
          testCase,
        }),
      );
    }
  } catch (error) {
    failures.push(
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    cleanup.attempted = true;
    if (admin && companyId) {
      try {
        const members = await admin
          .from("company_members")
          .delete()
          .eq("company_id", companyId);
        if (members.error) throw members.error;
        const profile = await admin
          .from("company_profiles")
          .delete()
          .eq("id", companyId);
        if (profile.error) throw profile.error;
        const company = await admin
          .from("companies")
          .delete()
          .eq("id", companyId);
        if (company.error) throw company.error;
        cleanup.companyRemoved = true;
      } catch (error) {
        failures.push(
          `ANDROID_NORMAL_APK_COMPANY_CLEANUP_RED:${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    if (admin && user) {
      try {
        const userProfile = await admin
          .from("user_profiles")
          .delete()
          .eq("user_id", user.id);
        if (userProfile.error) throw userProfile.error;
        const profile = await admin
          .from("profiles")
          .delete()
          .eq("user_id", user.id);
        if (profile.error) throw profile.error;
        const deletedUser = await admin.auth.admin.deleteUser(user.id);
        if (deletedUser.error) throw deletedUser.error;
        cleanup.userRemoved = true;
      } catch (error) {
        failures.push(
          `ANDROID_NORMAL_APK_USER_CLEANUP_RED:${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  const routeToScreenAckPassed = routeCases.filter(
    (result) => result.passed,
  ).length;
  if (routeToScreenAckPassed !== OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES.length) {
    failures.push(
      `ANDROID_NORMAL_APK_ROUTE_TO_SCREEN_ACK_RED:${routeToScreenAckPassed}/${OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES.length}`,
    );
  }
  if (!cleanup.companyRemoved || !cleanup.userRemoved) {
    failures.push("ANDROID_NORMAL_APK_TEMP_USER_CLEANUP_RED");
  }
  const routeToScreenAckGreen =
    routeToScreenAckPassed === OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES.length &&
    routeCases.length === OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES.length;
  const passed =
    failures.length === 0 &&
    authGreen &&
    routeToScreenAckGreen &&
    cleanup.companyRemoved &&
    cleanup.userRemoved;
  const artifact = {
    final_status: passed ? "GREEN_ANDROID_API34_PIPELINE_SMOKE_READY" : "BLOCKED_ANDROID_API34_PIPELINE_SMOKE",
    candidate_id: candidate.candidate_id,
    candidate_hash: candidate.candidateHash,
    product_source_hash: candidate.productSourceHash,
    device_id: deviceId,
    package_name: packageName,
    main_activity: mainActivity,
    android_app_root_ready: appRootReady,
    android_build_identity_matches: buildIdentityMatches,
    android_uses_dev_client: false,
    android_uses_metro: false,
    business_route_opened: routeToScreenAckGreen,
    auth_login_attempted: authLoginAttempted,
    auth_green: authGreen,
    route_to_screen_ack: {
      status: routeToScreenAckGreen
        ? "GREEN_ANDROID_NORMAL_APK_ROUTE_TO_SCREEN_ACK"
        : "RED_ANDROID_NORMAL_APK_ROUTE_TO_SCREEN_ACK",
      expected_cases: OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES.length,
      passed_cases: routeToScreenAckPassed,
      cases: routeCases,
      exact_order_required: true,
      exactly_once_required: true,
      warm_delivery_required: true,
      isolated_probe_substitution_allowed: false,
    },
    temporary_user_cleanup: cleanup,
    smoke_timeout_ms: SMOKE_TIMEOUT_MS,
    ui_dump_sample: truncateOutput(lastDump),
    build_identity_evidence_source: "adb_logcat",
    build_identity_log_sample: truncateOutput(lastIdentityLog),
    failures,
    fake_green_claimed: false,
  };
  writeAndroidJson(candidate, "smoke.json", artifact);
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
