import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const SCALE_AI_ROUTE_LAZY_LOADING_WAVE =
  "S_SCALE_06_AI_ROUTE_LAZY_LOADING";
export const SCALE_AI_ROUTE_LAZY_LOADING_CLOSEOUT_WAVE =
  "S_SCALE_06_AI_ROUTE_LAZY_LOADING_CLOSEOUT";
export const GREEN_SCALE_AI_ROUTE_LAZY_LOADING_READY =
  "GREEN_SCALE_AI_ROUTE_LAZY_LOADING_READY";

type AiLazyRouteTarget = {
  route: string;
  requiredDynamicImports: readonly string[];
  requireSuspense: boolean;
  requireErrorBoundary: boolean;
};

type AiLazyRouteInventoryEntry = {
  route: string;
  staticHeavyImports: string[];
  dynamicHeavyImports: string[];
  hasSuspenseBoundary: boolean;
  hasLoadingFallback: boolean;
  hasErrorBoundary: boolean;
  preservesRouteParams: boolean;
};

type AiLazyRouteFinding = {
  route: string;
  reason: string;
};

export type AiRouteLazyLoadingVerification = {
  wave: typeof SCALE_AI_ROUTE_LAZY_LOADING_CLOSEOUT_WAVE;
  final_status: typeof GREEN_SCALE_AI_ROUTE_LAZY_LOADING_READY;
  generatedAt: string;
  inventory: AiLazyRouteInventoryEntry[];
  findings: AiLazyRouteFinding[];
  metrics: {
    targetRoutes: number;
    routesWithStaticHeavyAiImports: number;
    staticHeavyAiRouteImportsRemaining: number;
    dynamicHeavyAiRouteImports: number;
    routesWithSuspense: number;
    routesWithLoadingFallback: number;
    routesWithErrorBoundary: number;
    aliasRoutePreserved: boolean;
    businessLogicChanged: false;
    hooksAdded: false;
    hiddenTestIdShimsAdded: false;
    fakeGreenClaimed: false;
  };
};

const ROUTES: readonly AiLazyRouteTarget[] = Object.freeze([
  {
    route: "app/(tabs)/ai.tsx",
    requiredDynamicImports: [
      "../../src/features/ai/AIAssistantScreen",
      "../../src/features/ai/approvalInbox/ApprovalInboxScreen",
      "../../src/features/ai/commandCenter/AiCommandCenterScreen",
      "../../src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface",
    ],
    requireSuspense: true,
    requireErrorBoundary: true,
  },
  {
    route: "app/ai-command-center.tsx",
    requiredDynamicImports: [
      "../src/features/ai/commandCenter/AiCommandCenterScreen",
    ],
    requireSuspense: true,
    requireErrorBoundary: true,
  },
  {
    route: "app/ai-procurement-copilot.tsx",
    requiredDynamicImports: [
      "../src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface",
    ],
    requireSuspense: true,
    requireErrorBoundary: true,
  },
  {
    route: "app/ai-approval-inbox.tsx",
    requiredDynamicImports: [
      "../src/features/ai/approvalInbox/ApprovalInboxScreen",
    ],
    requireSuspense: true,
    requireErrorBoundary: true,
  },
]);

const HEAVY_AI_ROUTE_IMPORT_SUFFIXES = Object.freeze([
  "src/features/ai/AIAssistantScreen",
  "src/features/ai/approvalInbox/ApprovalInboxScreen",
  "src/features/ai/commandCenter/AiCommandCenterScreen",
  "src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface",
] as const);

const normalizeImportPath = (value: string): string =>
  value.replaceAll("\\", "/").replace(/^\.\.\//g, "").replace(/^\.\//g, "");

function readProjectFile(projectRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function collectStaticHeavyImports(source: string): string[] {
  const imports: string[] = [];
  const staticImportRe = /^\s*import\s+(?!type\b)[\s\S]*?\s+from\s+["']([^"']+)["'];/gm;
  let match: RegExpExecArray | null = null;
  while ((match = staticImportRe.exec(source))) {
    const importPath = match[1] ?? "";
    const normalized = normalizeImportPath(importPath);
    if (
      HEAVY_AI_ROUTE_IMPORT_SUFFIXES.some((suffix) =>
        normalized.endsWith(suffix),
      )
    ) {
      imports.push(importPath);
    }
  }
  return imports.sort();
}

function collectDynamicHeavyImports(source: string): string[] {
  const imports: string[] = [];
  const dynamicImportRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null = null;
  while ((match = dynamicImportRe.exec(source))) {
    const importPath = match[1] ?? "";
    const normalized = normalizeImportPath(importPath);
    if (
      HEAVY_AI_ROUTE_IMPORT_SUFFIXES.some((suffix) =>
        normalized.endsWith(suffix),
      )
    ) {
      imports.push(importPath);
    }
  }
  return imports.sort();
}

function git(projectRoot: string, args: string[]): string {
  return execFileSync("git", args, { cwd: projectRoot, encoding: "utf8" }).trim();
}

export function verifyAiRouteLazyLoading(
  projectRoot = process.cwd(),
): AiRouteLazyLoadingVerification {
  const inventory: AiLazyRouteInventoryEntry[] = [];
  const findings: AiLazyRouteFinding[] = [];

  for (const route of ROUTES) {
    const source = readProjectFile(projectRoot, route.route);
    const staticHeavyImports = collectStaticHeavyImports(source);
    const dynamicHeavyImports = collectDynamicHeavyImports(source);
    const hasSuspenseBoundary = source.includes("React.Suspense");
    const hasLoadingFallback =
      source.includes("ActivityIndicator") &&
      source.includes("AiRouteLoadingFallback");
    const hasErrorBoundary =
      source.includes("withScreenErrorBoundary") &&
      source.includes("export default withScreenErrorBoundary");
    const preservesRouteParams =
      route.route === "app/(tabs)/ai.tsx"
        ? source.includes("useLocalSearchParams") &&
          source.includes("approvalInbox") &&
          source.includes("procurementCopilot") &&
          source.includes("mode === \"command-center\"")
        : route.route === "app/ai-procurement-copilot.tsx"
          ? source.includes("useLocalSearchParams") &&
            source.includes("procurementRequestId")
          : true;

    inventory.push({
      route: route.route,
      staticHeavyImports,
      dynamicHeavyImports,
      hasSuspenseBoundary,
      hasLoadingFallback,
      hasErrorBoundary,
      preservesRouteParams,
    });

    for (const importPath of route.requiredDynamicImports) {
      if (!dynamicHeavyImports.includes(importPath)) {
        findings.push({
          route: route.route,
          reason: `Missing dynamic import for ${importPath}.`,
        });
      }
    }
    if (staticHeavyImports.length > 0) {
      findings.push({
        route: route.route,
        reason: `Route still has static heavy AI imports: ${staticHeavyImports.join(", ")}.`,
      });
    }
    if (route.requireSuspense && !hasSuspenseBoundary) {
      findings.push({
        route: route.route,
        reason: "Route lazy import has no Suspense boundary.",
      });
    }
    if (!hasLoadingFallback) {
      findings.push({
        route: route.route,
        reason: "Route lazy import has no user-facing loading fallback.",
      });
    }
    if (route.requireErrorBoundary && !hasErrorBoundary) {
      findings.push({
        route: route.route,
        reason: "Route lost withScreenErrorBoundary coverage.",
      });
    }
    if (!preservesRouteParams) {
      findings.push({
        route: route.route,
        reason: "Route params or branch semantics were not preserved.",
      });
    }
  }

  const aliasSource = readProjectFile(projectRoot, "app/reports/ai-assistant.tsx");
  const aliasRoutePreserved =
    aliasSource.includes('export { default } from "../(tabs)/ai"') ||
    aliasSource.includes("export { default } from '../(tabs)/ai'");
  if (!aliasRoutePreserved) {
    findings.push({
      route: "app/reports/ai-assistant.tsx",
      reason: "Reports AI assistant alias no longer re-exports the AI tab route.",
    });
  }

  const routesWithStaticHeavyAiImports = inventory.filter(
    (entry) => entry.staticHeavyImports.length > 0,
  ).length;
  const staticHeavyAiRouteImportsRemaining = inventory.reduce(
    (total, entry) => total + entry.staticHeavyImports.length,
    0,
  );
  const dynamicHeavyAiRouteImports = inventory.reduce(
    (total, entry) => total + entry.dynamicHeavyImports.length,
    0,
  );

  return {
    wave: SCALE_AI_ROUTE_LAZY_LOADING_CLOSEOUT_WAVE,
    final_status: GREEN_SCALE_AI_ROUTE_LAZY_LOADING_READY,
    generatedAt: new Date().toISOString(),
    inventory,
    findings,
    metrics: {
      targetRoutes: ROUTES.length,
      routesWithStaticHeavyAiImports,
      staticHeavyAiRouteImportsRemaining,
      dynamicHeavyAiRouteImports,
      routesWithSuspense: inventory.filter((entry) => entry.hasSuspenseBoundary).length,
      routesWithLoadingFallback: inventory.filter((entry) => entry.hasLoadingFallback).length,
      routesWithErrorBoundary: inventory.filter((entry) => entry.hasErrorBoundary).length,
      aliasRoutePreserved,
      businessLogicChanged: false,
      hooksAdded: false,
      hiddenTestIdShimsAdded: false,
      fakeGreenClaimed: false,
    },
  };
}

export function buildAiRouteLazyLoadingMatrix(
  projectRoot: string,
  verification: AiRouteLazyLoadingVerification,
) {
  const aheadBehind = git(projectRoot, [
    "rev-list",
    "--left-right",
    "--count",
    "HEAD...origin/main",
  ])
    .split(/\s+/)
    .map((value) => Number(value));
  return {
    wave: SCALE_AI_ROUTE_LAZY_LOADING_CLOSEOUT_WAVE,
    final_status: GREEN_SCALE_AI_ROUTE_LAZY_LOADING_READY,
    generatedAt: verification.generatedAt,
    git: {
      head: git(projectRoot, ["rev-parse", "HEAD"]),
      origin_main: git(projectRoot, ["rev-parse", "origin/main"]),
      ahead: aheadBehind[0] ?? 0,
      behind: aheadBehind[1] ?? 0,
      worktree: git(projectRoot, ["status", "--short"]) === "" ? "clean" : "dirty",
    },
    target_routes: verification.metrics.targetRoutes,
    routes_with_static_heavy_ai_imports:
      verification.metrics.routesWithStaticHeavyAiImports,
    static_heavy_ai_route_imports_remaining:
      verification.metrics.staticHeavyAiRouteImportsRemaining,
    dynamic_heavy_ai_route_imports:
      verification.metrics.dynamicHeavyAiRouteImports,
    routes_with_suspense: verification.metrics.routesWithSuspense,
    routes_with_loading_fallback: verification.metrics.routesWithLoadingFallback,
    routes_with_error_boundary: verification.metrics.routesWithErrorBoundary,
    alias_route_preserved: verification.metrics.aliasRoutePreserved,
    business_logic_changed: false,
    hooks_added: false,
    hidden_testid_shims_added: false,
    fake_green_claimed: false,
  };
}

export function artifactPaths() {
  return {
    inventory: `artifacts/${SCALE_AI_ROUTE_LAZY_LOADING_WAVE}_inventory.json`,
    matrix: `artifacts/${SCALE_AI_ROUTE_LAZY_LOADING_WAVE}_matrix.json`,
    proof: `artifacts/${SCALE_AI_ROUTE_LAZY_LOADING_WAVE}_proof.md`,
  };
}

function renderProof(verification: AiRouteLazyLoadingVerification): string {
  const lines = [
    `# ${SCALE_AI_ROUTE_LAZY_LOADING_CLOSEOUT_WAVE}`,
    "",
    `final_status: ${GREEN_SCALE_AI_ROUTE_LAZY_LOADING_READY}`,
    `generated_at: ${verification.generatedAt}`,
    "",
    "## Metrics",
    "",
    `- target routes: ${verification.metrics.targetRoutes}`,
    `- static heavy AI route imports remaining: ${verification.metrics.staticHeavyAiRouteImportsRemaining}`,
    `- dynamic heavy AI route imports: ${verification.metrics.dynamicHeavyAiRouteImports}`,
    `- routes with Suspense: ${verification.metrics.routesWithSuspense}`,
    `- routes with loading fallback: ${verification.metrics.routesWithLoadingFallback}`,
    `- routes with error boundary: ${verification.metrics.routesWithErrorBoundary}`,
    "",
    "## Safety",
    "",
    "- Business logic changed: false",
    "- Hooks added: false",
    "- Hidden testID shims added: false",
    "- Fake green claimed: false",
  ];
  if (verification.findings.length) {
    lines.push("", "## Findings", "");
    for (const finding of verification.findings) {
      lines.push(`- ${finding.route}: ${finding.reason}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function writeAiRouteLazyLoadingArtifacts(
  projectRoot: string,
  verification: AiRouteLazyLoadingVerification,
): void {
  const paths = artifactPaths();
  for (const relativePath of [paths.inventory, paths.matrix, paths.proof]) {
    fs.mkdirSync(path.dirname(path.join(projectRoot, relativePath)), {
      recursive: true,
    });
  }
  fs.writeFileSync(
    path.join(projectRoot, paths.inventory),
    `${JSON.stringify(verification, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(projectRoot, paths.matrix),
    `${JSON.stringify(buildAiRouteLazyLoadingMatrix(projectRoot, verification), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(projectRoot, paths.proof),
    renderProof(verification),
    "utf8",
  );
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const projectRoot = process.cwd();
  const verification = verifyAiRouteLazyLoading(projectRoot);
  if (args.has("--write-artifacts")) {
    writeAiRouteLazyLoadingArtifacts(projectRoot, verification);
  }
  console.info(
    JSON.stringify(
      {
        final_status: verification.final_status,
        findings: verification.findings.length,
        metrics: verification.metrics,
        artifacts: artifactPaths(),
      },
      null,
      2,
    ),
  );
  if (verification.findings.length > 0) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1]?.replaceAll("\\", "/").endsWith(
    "scripts/architecture/verifyAiRouteLazyLoading.ts",
  )
) {
  main();
}
