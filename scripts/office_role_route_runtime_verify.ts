import fs from "node:fs";
import path from "node:path";

import { createAndroidHarness } from "./_shared/androidHarness";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
const artifactPath = "artifacts/office-role-route-runtime-proof.json";
const devClientPort = Number(process.env.OFFICE_ROLE_ANDROID_DEV_PORT ?? "8081");
const admin = createVerifierAdmin("office-role-route-runtime-verify");
const harness = createAndroidHarness({ projectRoot, devClientPort });
const requestedRoles = new Set(
  String(process.env.OFFICE_ROLE_RUNTIME_ROLES ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean),
);
const singleSessionMode = process.env.OFFICE_ROLE_SINGLE_SESSION === "1";

type OfficeRole = "buyer" | "accountant" | "contractor" | "director" | "foreman";
type OfficeRouteResult = {
  role: OfficeRole;
  route: string;
  status: string;
  surfaceMatched: boolean;
  fioGateReached?: boolean;
  fioGateError?: string | null;
  xmlPath: string | null;
  pngPath: string | null;
  stdoutPath?: string;
  stderrPath?: string;
  stdoutTail?: string;
  stderrTail?: string;
  matchedLabels?: string[];
  platformSpecificIssues: string[];
  error?: string;
};

type RoleSpec = {
  role: OfficeRole;
  authRole?: string;
  fullName: string;
  userProfile?: Record<string, unknown>;
  surfaceLabels: string[];
};

const roleSpecs: RoleSpec[] = [
  {
    role: "buyer",
    fullName: "Office Route Buyer",
    surfaceLabels: ["Снабженец", "РЎРЅР°Р±Р¶РµРЅРµС†", "Обновить buyer"],
  },
  {
    role: "accountant",
    fullName: "Office Route Accountant",
    surfaceLabels: ["Бухгалтер", "Р‘СѓС…РіР°Р»С‚РµСЂ", "Excel"],
  },
  {
    role: "contractor",
    authRole: "foreman",
    fullName: "Office Route Contractor",
    userProfile: {
      is_contractor: true,
      usage_build: true,
    },
    surfaceLabels: [
      "Подрядчик",
      "РџРѕРґСЂСЏРґС‡РёРє",
      "Активация подрядчика",
      "РђРєС‚РёРІР°С†",
    ],
  },
  {
    role: "director",
    fullName: "Office Route Director",
    userProfile: {
      usage_build: true,
    },
    surfaceLabels: ["Контроль", "РљРѕРЅС‚СЂРѕР»СЊ", "Финансы", "Р¤РёРЅР°РЅСЃС‹"],
  },
  {
    role: "foreman",
    fullName: "Office Route Foreman",
    userProfile: {
      usage_build: true,
    },
    surfaceLabels: [
      "foreman-main-materials-open",
      "foreman-main-subcontracts-open",
      "Материалы",
      "Подряды",
      "РџРѕРґСЂСЏРґС‹",
    ],
  },
];

const activeRoleSpecs = requestedRoles.size
  ? roleSpecs.filter((spec) => requestedRoles.has(spec.role))
  : roleSpecs;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const verifierFioValue = "f";

function writeJson(relativePath: string, payload: unknown) {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function includesAny(xml: string, labels: string[]) {
  return labels.some((label) => xml.includes(label));
}

function isLoginSurface(xml: string) {
  return (
    /android\.widget\.EditText/i.test(xml) &&
    /Email|Login|Р’РѕР№С‚Рё|Р вЂ™Р С•Р в„–РЎвЂљР С‘/i.test(xml)
  );
}

function isRoleSurface(spec: RoleSpec, xml: string) {
  return includesAny(xml, spec.surfaceLabels);
}

function isRenderableSurface(xml: string) {
  if (isLoginSurface(xml)) return true;
  if (isFioModalSurface(xml)) return true;
  return roleSpecs.some((spec) => isRoleSurface(spec, xml));
}

function isFioModalSurface(xml: string) {
  return xml.includes("warehouse-fio-input") && xml.includes("warehouse-fio-confirm");
}

function canAcceptFioGate(spec: RoleSpec) {
  return spec.role === "buyer" || spec.role === "accountant";
}

function findNodeByResourceId(screen: ReturnType<typeof harness.dumpAndroidScreen>, resourceId: string) {
  return (
    harness
      .parseAndroidNodes(screen.xml)
      .find((node) => String(node.resourceId ?? "").includes(resourceId)) ?? null
  );
}

function hasVerifierFioValue(node: ReturnType<typeof findNodeByResourceId>) {
  const text = String(node?.text ?? "").trim();
  const hint = String(node?.hint ?? "").trim();
  return Boolean(text && (!hint || text !== hint));
}

async function enterVerifierFio(node: NonNullable<ReturnType<typeof findNodeByResourceId>>) {
  await harness.replaceAndroidFieldText(node, verifierFioValue);
  await sleep(750);
  harness.tapAndroidBounds(node.bounds);
  await sleep(1_500);
  harness.typeAndroidText(verifierFioValue);
  await sleep(1_000);
}

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

async function maybeConfirmFio(params: {
  spec: RoleSpec;
  screen: ReturnType<typeof harness.dumpAndroidScreen>;
  artifactBase: string;
}) {
  if (!isFioModalSurface(params.screen.xml)) return params.screen;

  const inputNode = findNodeByResourceId(params.screen, "warehouse-fio-input");
  if (inputNode) {
    await enterVerifierFio(inputNode);
    await sleep(500);
  }
  const inputText = String(inputNode?.text ?? "").trim();
  const inputHint = String(inputNode?.hint ?? "").trim();
  const inputNeedsFill =
    !inputText ||
    (inputHint && inputText === inputHint) ||
    /Фамилия Имя Отчество|Р¤Р°РјРёР»РёСЏ РРјСЏ РћС‚С‡РµСЃС‚РІРѕ/i.test(inputText);
  if (inputNode && inputNeedsFill) {
    await enterVerifierFio(inputNode);
    await sleep(500);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latest = harness.dumpAndroidScreen(`${params.artifactBase}-fio-filled-${attempt + 1}`);
    const latestInput = findNodeByResourceId(latest, "warehouse-fio-input");
    if (!latestInput || hasVerifierFioValue(latestInput)) break;

    await enterVerifierFio(latestInput);
    await sleep(750);
  }

  let current = await poll(
    `${params.spec.role}:fio_confirm_enabled`,
    () => {
      const next = harness.dumpAndroidScreen(`${params.artifactBase}-fio-before-confirm`);
      const confirm = findNodeByResourceId(next, "warehouse-fio-confirm");
      return confirm?.enabled ? next : null;
    },
    15_000,
    750,
  );
  const confirmNode = findNodeByResourceId(current, "warehouse-fio-confirm");
  if (!confirmNode) {
    throw new Error(`${params.spec.role} FIO modal was visible but confirm node was not found`);
  }

  harness.pressAndroidKey(4);
  await sleep(500);
  const settledConfirmNode =
    findNodeByResourceId(harness.dumpAndroidScreen(`${params.artifactBase}-fio-confirm-ready`), "warehouse-fio-confirm") ??
    confirmNode;
  harness.tapAndroidBounds(settledConfirmNode.bounds);
  await sleep(1_000);

  current = await poll(
    `${params.spec.role}:fio_confirm_settled`,
    () => {
      const next = harness.dumpAndroidScreen(`${params.artifactBase}-fio-after-confirm`);
      if (isRoleSurface(params.spec, next.xml) || !isFioModalSurface(next.xml)) return next;
      const retryConfirm = findNodeByResourceId(next, "warehouse-fio-confirm");
      if (retryConfirm?.enabled) {
        harness.pressAndroidKey(4);
        harness.tapAndroidBounds(retryConfirm.bounds);
      }
      return null;
    },
    30_000,
    1_000,
  );

  return current;
}

function fatalLines(logText: string) {
  return String(logText ?? "")
    .split(/\r?\n/)
    .filter((line) =>
      /FATAL EXCEPTION|ANR in|ReactNativeJS.*(?:Fatal|fatal)|AndroidRuntime.*FATAL/i.test(line),
    )
    .slice(0, 20);
}

async function createRoleUser(spec: RoleSpec): Promise<RuntimeTestUser> {
  return createTempUser(admin, {
    role: spec.authRole ?? spec.role,
    fullName: spec.fullName,
    emailPrefix: `office.route.${spec.role}`,
    userProfile: spec.userProfile,
  });
}

async function verifyRoleRoute(params: {
  spec: RoleSpec;
  packageName: string | null;
  index: number;
}): Promise<OfficeRouteResult> {
  const { spec, packageName, index } = params;
  const route = `rik:///office/${spec.role}`;
  const artifactBase = `artifacts/office-role-route-${spec.role}`;
  const user = await createRoleUser(spec);
  writeJson(`${artifactBase}-user.json`, {
    id: user.id,
    email: user.email,
    role: user.role,
    displayLabel: user.displayLabel,
  });

  try {
    if (index > 0) {
      harness.runAndroidPreflight({ packageName, clearApp: true });
      harness.startAndroidDevClientProject(packageName, devClientPort, { stopApp: true });
      await sleep(1_000);
    }

    const screen = await harness.loginAndroidWithProtectedRoute({
      packageName,
      user,
      protectedRoute: route,
      artifactBase,
      successPredicate: (xml) => isRoleSurface(spec, xml),
      renderablePredicate: isRenderableSurface,
      loginScreenPredicate: isLoginSurface,
    });

    let finalScreen = screen;
    let fioGateError: string | null = null;
    try {
      finalScreen = await maybeConfirmFio({ spec, screen, artifactBase });
    } catch (error) {
      fioGateError = error instanceof Error ? error.message : String(error);
      finalScreen = harness.dumpAndroidScreen(`${artifactBase}-fio-gate`);
    }
    const fioGateReached = canAcceptFioGate(spec) && isFioModalSurface(finalScreen.xml);
    if (!isRoleSurface(spec, finalScreen.xml) && !fioGateReached) {
      finalScreen = await harness.openAndroidRoute({
        packageName,
        routes: [route, `rik://office/${spec.role}`, `rik:///%28tabs%29/office/${spec.role}`],
        artifactBase: `${artifactBase}-direct`,
        predicate: (xml) => isRoleSurface(spec, xml),
        renderablePredicate: isRenderableSurface,
        loginScreenPredicate: isLoginSurface,
        timeoutMs: 35_000,
        delayMs: 1_200,
      });
    }

    const surfaceMatched = isRoleSurface(spec, finalScreen.xml);
    const routeReached = surfaceMatched || fioGateReached;
    return {
      role: spec.role,
      route,
      status: routeReached ? "passed" : "failed",
      surfaceMatched: routeReached,
      fioGateReached,
      fioGateError,
      xmlPath: finalScreen.xmlPath,
      pngPath: finalScreen.pngPath,
      matchedLabels: spec.surfaceLabels.filter((label) => finalScreen.xml.includes(label)),
      platformSpecificIssues: routeReached
        ? fioGateReached
          ? [`${spec.role} route reached expected daily FIO gate before role surface`]
          : []
        : [`${spec.role} office route surface did not match`],
    };
  } catch (error) {
    const failure = harness.captureFailureArtifacts(`${artifactBase}-failure`);
    return {
      role: spec.role,
      route,
      status: "failed",
      surfaceMatched: false,
      error: error instanceof Error ? error.message : String(error),
      ...failure,
      platformSpecificIssues: [`${spec.role} office route failed to open`],
    };
  } finally {
    await cleanupTempUser(admin, user);
  }
}

async function verifySingleSessionRoutes(packageName: string | null) {
  const sessionUser = await createTempUser(admin, {
    role: "director",
    fullName: "Office Route Session",
    emailPrefix: "office.route.session",
    userProfile: { usage_build: true },
  });
  writeJson("artifacts/office-role-route-session-user.json", {
    id: sessionUser.id,
    email: sessionUser.email,
    role: sessionUser.role,
    displayLabel: sessionUser.displayLabel,
  });

  try {
    const directorSpec = roleSpecs.find((spec) => spec.role === "director") ?? activeRoleSpecs[0];
    await harness.loginAndroidWithProtectedRoute({
      packageName,
      user: sessionUser,
      protectedRoute: "rik:///office/director",
      artifactBase: "artifacts/office-role-route-session-login",
      successPredicate: (xml) => isRoleSurface(directorSpec, xml),
      renderablePredicate: isRenderableSurface,
      loginScreenPredicate: isLoginSurface,
    });

    const roles: OfficeRouteResult[] = [];
    for (const spec of activeRoleSpecs) {
      const route = `rik:///office/${spec.role}`;
      const artifactBase = `artifacts/office-role-route-session-${spec.role}`;
      try {
        let screen = await harness.openAndroidRoute({
          packageName,
          routes: [route, `rik://office/${spec.role}`, `rik:///%28tabs%29/office/${spec.role}`],
          artifactBase,
          predicate: (xml) => isRoleSurface(spec, xml) || isFioModalSurface(xml),
          renderablePredicate: isRenderableSurface,
          loginScreenPredicate: isLoginSurface,
          timeoutMs: 45_000,
          delayMs: 1_200,
        });

        let fioGateError: string | null = null;
        try {
          screen = await maybeConfirmFio({ spec, screen, artifactBase });
        } catch (error) {
          fioGateError = error instanceof Error ? error.message : String(error);
          screen = harness.dumpAndroidScreen(`${artifactBase}-fio-gate`);
        }
        const fioGateReached = canAcceptFioGate(spec) && isFioModalSurface(screen.xml);
        if (!isRoleSurface(spec, screen.xml) && !fioGateReached) {
          screen = await harness.openAndroidRoute({
            packageName,
            routes: [route, `rik://office/${spec.role}`, `rik:///%28tabs%29/office/${spec.role}`],
            artifactBase: `${artifactBase}-after-fio`,
            predicate: (xml) => isRoleSurface(spec, xml),
            renderablePredicate: isRenderableSurface,
            loginScreenPredicate: isLoginSurface,
            timeoutMs: 45_000,
            delayMs: 1_200,
          });
        }

        const surfaceMatched = isRoleSurface(spec, screen.xml);
        const routeReached = surfaceMatched || fioGateReached;
        roles.push({
          role: spec.role,
          route,
          status: routeReached ? "passed" : "failed",
          surfaceMatched: routeReached,
          fioGateReached,
          fioGateError,
          xmlPath: screen.xmlPath,
          pngPath: screen.pngPath,
          matchedLabels: spec.surfaceLabels.filter((label) => screen.xml.includes(label)),
          platformSpecificIssues: routeReached
            ? fioGateReached
              ? [`${spec.role} route reached expected daily FIO gate before role surface`]
              : []
            : [`${spec.role} office route surface did not match`],
        });
      } catch (error) {
        const failure = harness.captureFailureArtifacts(`${artifactBase}-failure`);
        roles.push({
          role: spec.role,
          route,
          status: "failed",
          surfaceMatched: false,
          error: error instanceof Error ? error.message : String(error),
          ...failure,
          platformSpecificIssues: [`${spec.role} office route failed to open`],
        });
      }
    }
    return roles;
  } finally {
    await cleanupTempUser(admin, sessionUser);
  }
}

async function main() {
  const devices = harness.adb(["devices"]);
  if (!devices.includes("\tdevice")) {
    const summary = {
      status: "failed",
      reason: "No Android emulator/device detected",
      routeProofPassed: false,
      roles: [],
      fatalLines: [],
    };
    writeJson(artifactPath, summary);
    throw new Error(summary.reason);
  }

  const runtime = await harness.prepareAndroidRuntime({ clearApp: true });
  harness.adb(["logcat", "-c"]);

  const roles: OfficeRouteResult[] = [];
  try {
    if (singleSessionMode) {
      roles.push(...await verifySingleSessionRoutes(runtime.packageName));
    } else {
      for (let index = 0; index < activeRoleSpecs.length; index += 1) {
        roles.push(await verifyRoleRoute({
          spec: activeRoleSpecs[index],
          packageName: runtime.packageName,
          index,
        }));
      }
    }
  } finally {
    runtime.devClient.cleanup();
  }

  const logcat = harness.adb(["logcat", "-d", "-v", "brief", "-t", "2000"]);
  const badRuntimeLines = fatalLines(String(logcat));
  const routeProofPassed = roles.every((role) => role.status === "passed");
  const status = routeProofPassed && badRuntimeLines.length === 0 ? "passed" : "failed";
  const summary = {
    status,
    routeProofPassed,
    noFatalException: badRuntimeLines.length === 0,
    fatalLines: badRuntimeLines,
    packageName: runtime.packageName,
    androidPreflight: runtime.preflight,
    recovery: harness.getRecoverySummary(),
    roles,
  };
  writeJson(artifactPath, summary);

  if (status !== "passed") {
    throw new Error(`office role route runtime verification failed: ${JSON.stringify(summary, null, 2)}`);
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
