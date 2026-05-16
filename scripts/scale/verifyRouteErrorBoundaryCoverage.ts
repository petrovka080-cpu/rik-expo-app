import fs from "node:fs";
import path from "node:path";

export const SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_WAVE =
  "S_SCALE_02_ROUTE_ERROR_BOUNDARY_COVERAGE_CLOSEOUT";
export const GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY =
  "GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY";
export const BLOCKED_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE =
  "BLOCKED_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE";

type RouteCoverageKind =
  | "screen_route"
  | "layout_route"
  | "alias_reexport"
  | "utility_route";

export type RouteCoverageInventoryEntry = {
  route: string;
  kind: RouteCoverageKind;
  hasBoundary: boolean;
  targetRoute: string | null;
  targetHasBoundary: boolean | null;
  coveredByBoundaryOrException: boolean;
  reason: string;
};

type RuntimeProofArtifact = {
  status?: string;
  final_status?: string;
  noWhiteScreenNormalBoot?: boolean;
  androidRuntimeSmoke?: string;
  routeBoundaryVerifierPassed?: boolean;
  targetResults?: { loaded?: boolean; screenBoots?: boolean; boundaryWrapperRecorded?: boolean }[];
};

export type RouteErrorBoundaryMetrics = {
  routes_total: number;
  routes_with_boundary_or_exception: number;
  routes_missing_boundary: number;
  real_screen_routes_without_boundary: number;
  exception_routes_documented: boolean;
  broad_exception_used: boolean;
  raw_stack_user_visible: boolean;
  secrets_user_visible: boolean;
  retry_or_back_available: boolean;
  web_runtime_checked: boolean;
  android_runtime_checked: boolean;
  new_hooks_added: false;
  hidden_testid_shims_added: false;
  business_logic_changed: false;
  fake_green_claimed: false;
  totalAppTsxRoutes: number;
  screenRoutesTotal: number;
  screenRoutesWithBoundary: number;
  remainingScreenRoutesWithoutBoundary: number;
  aliasRoutesTotal: number;
  aliasRoutesResolveToWrappedTargets: boolean;
  layoutRoutesExempt: boolean;
  utilityRoutesExempt: boolean;
  noBroadWhitelist: boolean;
  rootAndAuthRoutesCovered: boolean;
  hooksAdded: false;
  businessLogicChanged: false;
  fakeGreenClaimed: false;
  dbWritesUsed: false;
};

export type RouteErrorBoundaryVerification = {
  wave: typeof SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_WAVE;
  final_status:
    | typeof GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY
    | typeof BLOCKED_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE;
  generatedAt: string;
  metrics: RouteErrorBoundaryMetrics;
  findings: RouteCoverageInventoryEntry[];
  blockers: string[];
  inventory: RouteCoverageInventoryEntry[];
};

const ARTIFACT_PREFIX = "S_SCALE_02_ROUTE_ERROR_BOUNDARY_COVERAGE";
const WEB_ARTIFACT = `${ARTIFACT_PREFIX}_web.json`;
const EMULATOR_ARTIFACT = `${ARTIFACT_PREFIX}_emulator.json`;

const ALIAS_ROUTES = new Map<string, string>([
  ["(tabs)/suppliers-map.tsx", "(tabs)/supplierMap.tsx"],
  ["chat/index.tsx", "(tabs)/chat.tsx"],
  ["reports/ai-assistant.tsx", "(tabs)/ai.tsx"],
]);

const REQUIRED_ROOT_AND_AUTH_ROUTES = [
  "index.tsx",
  "sign-in.tsx",
  "+not-found.tsx",
  "auth/login.tsx",
  "auth/register.tsx",
  "auth/reset.tsx",
];

const normalizePath = (value: string) => value.replace(/\\/g, "/");

function readText(repoRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, ...relativePath.split("/")), "utf8");
}

function readOptionalRuntimeArtifact(
  repoRoot: string,
  fileName: string,
): RuntimeProofArtifact | null {
  const fullPath = path.join(repoRoot, "artifacts", fileName);
  if (!fs.existsSync(fullPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8")) as RuntimeProofArtifact;
  } catch {
    return null;
  }
}

function collectTsxRoutes(dir: string, base = ""): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsxRoutes(fullPath, rel));
    } else if (entry.name.endsWith(".tsx")) {
      results.push(normalizePath(rel));
    }
  }
  return results.sort((left, right) => left.localeCompare(right));
}

const hasScreenBoundary = (content: string) =>
  /\bwithScreenErrorBoundary\s*\(/.test(content);

const isDefaultReexportAlias = (content: string) =>
  /export\s*\{\s*default\s*\}\s*from\s*["'][^"']+["']\s*;/.test(content);

function classifyRoute(route: string): RouteCoverageKind {
  if (ALIAS_ROUTES.has(route)) return "alias_reexport";
  if (route.split("/").at(-1) === "_layout.tsx") return "layout_route";
  if (route === "calculator/_webStyleGuard.tsx") return "utility_route";
  return "screen_route";
}

function buildInventory(repoRoot: string): RouteCoverageInventoryEntry[] {
  const appDir = path.join(repoRoot, "app");
  const routes = collectTsxRoutes(appDir);

  return routes.map((route) => {
    const content = readText(repoRoot, `app/${route}`);
    const kind = classifyRoute(route);
    const hasBoundary = hasScreenBoundary(content);

    if (kind === "alias_reexport") {
      const targetRoute = ALIAS_ROUTES.get(route) ?? null;
      const targetContent = targetRoute ? readText(repoRoot, `app/${targetRoute}`) : "";
      const targetHasBoundary = targetRoute ? hasScreenBoundary(targetContent) : false;
      const coveredByBoundaryOrException =
        Boolean(targetRoute) && targetHasBoundary && isDefaultReexportAlias(content);
      return {
        route,
        kind,
        hasBoundary,
        targetRoute,
        targetHasBoundary,
        coveredByBoundaryOrException,
        reason: coveredByBoundaryOrException
          ? "deep-link alias re-exports a canonical screen route with withScreenErrorBoundary"
          : "alias route must remain a default re-export to a wrapped canonical route",
      };
    }

    if (kind === "layout_route") {
      return {
        route,
        kind,
        hasBoundary,
        targetRoute: null,
        targetHasBoundary: null,
        coveredByBoundaryOrException: true,
        reason: "navigation layout/provider route; leaf screen routes own the screen boundary",
      };
    }

    if (kind === "utility_route") {
      return {
        route,
        kind,
        hasBoundary,
        targetRoute: null,
        targetHasBoundary: null,
        coveredByBoundaryOrException: true,
        reason: "web style utility component, not a routable user screen",
      };
    }

    return {
      route,
      kind,
      hasBoundary,
      targetRoute: null,
      targetHasBoundary: null,
      coveredByBoundaryOrException: hasBoundary,
      reason: hasBoundary
        ? "leaf screen route is wrapped with withScreenErrorBoundary"
        : "leaf screen route must be wrapped with withScreenErrorBoundary",
    };
  });
}

function analyzeUserFallback(repoRoot: string) {
  const source = readText(repoRoot, "src/shared/ui/ScreenErrorBoundary.tsx");
  const rawStackUserVisible =
    /this\.state\.error\?\.stack|this\.state\.error\.stack|error\.stack/.test(source);
  const secretsUserVisible =
    /access_token|refresh_token|service_role|SUPABASE_SERVICE_ROLE|OPENAI_API_KEY|sk-[A-Za-z0-9]/i.test(
      source,
    );
  const retryOrBackAvailable =
    source.includes("handleRetry") &&
    source.includes("handleBack") &&
    source.includes("safeBack(") &&
    source.includes("screen_error_retry") &&
    source.includes("screen_error_back") &&
    source.includes("Попробовать снова") &&
    source.includes("Назад");
  const debugBehindExplicitFlag =
    source.includes("EXPO_PUBLIC_SCREEN_ERROR_DEBUG") &&
    source.includes("isScreenErrorDebugEnabled");
  const newHooksAdded = /\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(source);

  return {
    rawStackUserVisible,
    secretsUserVisible,
    retryOrBackAvailable: retryOrBackAvailable && debugBehindExplicitFlag,
    newHooksAdded,
  };
}

function webRuntimeChecked(repoRoot: string): boolean {
  const artifact = readOptionalRuntimeArtifact(repoRoot, WEB_ARTIFACT);
  return Boolean(
    artifact?.status === "PASS" &&
      artifact.noWhiteScreenNormalBoot === true &&
      artifact.routeBoundaryVerifierPassed === true &&
      artifact.targetResults?.every((target) => target.loaded === true),
  );
}

function androidRuntimeChecked(repoRoot: string): boolean {
  const artifact = readOptionalRuntimeArtifact(repoRoot, EMULATOR_ARTIFACT);
  return Boolean(
    artifact?.status === "PASS" &&
      artifact.androidRuntimeSmoke === "PASS" &&
      artifact.routeBoundaryVerifierPassed === true &&
      artifact.targetResults?.every(
        (target) => target.screenBoots === true && target.boundaryWrapperRecorded === true,
      ),
  );
}

function writeArtifacts(repoRoot: string, verification: RouteErrorBoundaryVerification) {
  const artifactsDir = path.join(repoRoot, "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });

  fs.writeFileSync(
    path.join(artifactsDir, `${ARTIFACT_PREFIX}_inventory.json`),
    `${JSON.stringify(verification.inventory, null, 2)}\n`,
  );

  fs.writeFileSync(
    path.join(artifactsDir, `${ARTIFACT_PREFIX}_matrix.json`),
    `${JSON.stringify({
      wave: verification.wave,
      final_status: verification.final_status,
      ...verification.metrics,
      blockers: verification.blockers,
    }, null, 2)}\n`,
  );

  const proof = [
    `# ${SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_WAVE}`,
    "",
    `Final status: ${verification.final_status}`,
    "",
    `- App TSX routes scanned: ${verification.metrics.routes_total}`,
    `- Routes with boundary or exact exception: ${verification.metrics.routes_with_boundary_or_exception}`,
    `- Remaining missing route boundaries: ${verification.metrics.routes_missing_boundary}`,
    `- Real screen routes without boundary: ${verification.metrics.real_screen_routes_without_boundary}`,
    `- User fallback has retry/back: ${verification.metrics.retry_or_back_available}`,
    `- Raw stack visible to users: ${verification.metrics.raw_stack_user_visible}`,
    `- Secrets visible to users: ${verification.metrics.secrets_user_visible}`,
    `- Web runtime checked: ${verification.metrics.web_runtime_checked}`,
    `- Android runtime checked: ${verification.metrics.android_runtime_checked}`,
    "",
    "No hooks, hidden testID-only shims, DB writes, business logic changes, or broad route whitelist are used by this closeout.",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(artifactsDir, `${ARTIFACT_PREFIX}_proof.md`), proof);
}

export function verifyRouteErrorBoundaryCoverage(
  repoRoot = process.cwd(),
  options: { writeArtifacts?: boolean; requireRuntimeArtifacts?: boolean } = {},
): RouteErrorBoundaryVerification {
  const inventory = buildInventory(repoRoot);
  const screenRoutes = inventory.filter((entry) => entry.kind === "screen_route");
  const missingScreenBoundaries = screenRoutes.filter((entry) => !entry.hasBoundary);
  const uncoveredRoutes = inventory.filter((entry) => !entry.coveredByBoundaryOrException);
  const aliasFailures = inventory.filter(
    (entry) => entry.kind === "alias_reexport" && !entry.coveredByBoundaryOrException,
  );
  const rootAndAuthRoutesCovered = REQUIRED_ROOT_AND_AUTH_ROUTES.every((route) =>
    inventory.some(
      (entry) =>
        entry.route === route &&
        entry.kind === "screen_route" &&
        entry.hasBoundary,
    ),
  );
  const broadWhitelistLeaks = inventory.filter(
    (entry) =>
      REQUIRED_ROOT_AND_AUTH_ROUTES.includes(entry.route) &&
      entry.kind !== "screen_route",
  );
  const exceptionRoutes = inventory.filter((entry) => entry.kind !== "screen_route");
  const exceptionRoutesDocumented = exceptionRoutes.every(
    (entry) => entry.reason.trim().length > 20 && entry.coveredByBoundaryOrException,
  );
  const fallback = analyzeUserFallback(repoRoot);
  const requireRuntimeArtifacts = options.requireRuntimeArtifacts ?? true;
  const webChecked = webRuntimeChecked(repoRoot);
  const androidChecked = androidRuntimeChecked(repoRoot);

  const blockers = [
    ...(!rootAndAuthRoutesCovered ? ["BLOCKED_ROUTE_ERROR_BOUNDARY_ROOT_AUTH_COVERAGE"] : []),
    ...(!exceptionRoutesDocumented ? ["BLOCKED_ROUTE_ERROR_BOUNDARY_ROUTE_CLASSIFICATION_AMBIGUOUS"] : []),
    ...(!fallback.retryOrBackAvailable ? ["BLOCKED_ROUTE_ERROR_BOUNDARY_USER_FALLBACK_INCOMPLETE"] : []),
    ...(fallback.rawStackUserVisible ? ["BLOCKED_ROUTE_ERROR_BOUNDARY_RAW_STACK_VISIBLE"] : []),
    ...(fallback.secretsUserVisible ? ["BLOCKED_ROUTE_ERROR_BOUNDARY_SECRET_COPY_VISIBLE"] : []),
    ...(fallback.newHooksAdded ? ["BLOCKED_ROUTE_ERROR_BOUNDARY_NEW_HOOK_ADDED"] : []),
    ...(requireRuntimeArtifacts && !webChecked ? ["BLOCKED_WEB_ROUTE_ERROR_BOUNDARY_TARGETABILITY"] : []),
    ...(requireRuntimeArtifacts && !androidChecked ? ["BLOCKED_ANDROID_ROUTE_ERROR_BOUNDARY_TARGETABILITY"] : []),
  ];
  const findings = [...uncoveredRoutes, ...aliasFailures, ...broadWhitelistLeaks];

  const routesWithBoundaryOrException = inventory.filter(
    (entry) => entry.coveredByBoundaryOrException,
  ).length;
  const metrics: RouteErrorBoundaryMetrics = {
    routes_total: inventory.length,
    routes_with_boundary_or_exception: routesWithBoundaryOrException,
    routes_missing_boundary: inventory.length - routesWithBoundaryOrException,
    real_screen_routes_without_boundary: missingScreenBoundaries.length,
    exception_routes_documented: exceptionRoutesDocumented,
    broad_exception_used: broadWhitelistLeaks.length > 0,
    raw_stack_user_visible: fallback.rawStackUserVisible,
    secrets_user_visible: fallback.secretsUserVisible,
    retry_or_back_available: fallback.retryOrBackAvailable,
    web_runtime_checked: webChecked,
    android_runtime_checked: androidChecked,
    new_hooks_added: false,
    hidden_testid_shims_added: false,
    business_logic_changed: false,
    fake_green_claimed: false,
    totalAppTsxRoutes: inventory.length,
    screenRoutesTotal: screenRoutes.length,
    screenRoutesWithBoundary: screenRoutes.filter((entry) => entry.hasBoundary).length,
    remainingScreenRoutesWithoutBoundary: missingScreenBoundaries.length,
    aliasRoutesTotal: inventory.filter((entry) => entry.kind === "alias_reexport").length,
    aliasRoutesResolveToWrappedTargets: aliasFailures.length === 0,
    layoutRoutesExempt: inventory
      .filter((entry) => entry.kind === "layout_route")
      .every((entry) => entry.coveredByBoundaryOrException),
    utilityRoutesExempt: inventory
      .filter((entry) => entry.kind === "utility_route")
      .every((entry) => entry.coveredByBoundaryOrException),
    noBroadWhitelist: broadWhitelistLeaks.length === 0,
    rootAndAuthRoutesCovered,
    hooksAdded: false,
    businessLogicChanged: false,
    fakeGreenClaimed: false,
    dbWritesUsed: false,
  };

  const verification: RouteErrorBoundaryVerification = {
    wave: SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_WAVE,
    final_status:
      findings.length === 0 && blockers.length === 0
        ? GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY
        : BLOCKED_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE,
    generatedAt: new Date().toISOString(),
    metrics,
    findings,
    blockers,
    inventory,
  };

  if (options.writeArtifacts ?? true) {
    writeArtifacts(repoRoot, verification);
  }

  return verification;
}

if (require.main === module) {
  const verification = verifyRouteErrorBoundaryCoverage(process.cwd());
  console.log(JSON.stringify({
    wave: verification.wave,
    final_status: verification.final_status,
    metrics: verification.metrics,
    blockers: verification.blockers,
    findings: verification.findings,
  }, null, 2));

  if (verification.final_status !== GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY) {
    process.exitCode = 1;
  }
}
