/**
 * Error boundary coverage tests.
 *
 * All user-facing leaf routes must be wrapped with withScreenErrorBoundary.
 * Only navigation layouts, a web style utility, and legacy deep-link aliases
 * are exempt; aliases must resolve to wrapped canonical routes.
 */

import * as fs from "fs";
import * as path from "path";

import {
  GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY,
  verifyRouteErrorBoundaryCoverage,
} from "../../scripts/scale/verifyRouteErrorBoundaryCoverage";

const APP_DIR = path.resolve(__dirname, "../../app");

const ALIAS_ROUTES = new Map<string, string>([
  ["(tabs)/suppliers-map.tsx", "(tabs)/supplierMap.tsx"],
  ["chat/index.tsx", "(tabs)/chat.tsx"],
  ["reports/ai-assistant.tsx", "(tabs)/ai.tsx"],
]);

const REQUIRED_LEAF_ROUTES = [
  "index.tsx",
  "sign-in.tsx",
  "+not-found.tsx",
  "auth/login.tsx",
  "auth/register.tsx",
  "auth/reset.tsx",
];

function collectTsxFiles(dir: string, base = ""): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectTsxFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith(".tsx")) {
      results.push(rel);
    }
  }
  return results.sort((left, right) => left.localeCompare(right));
}

function isLayoutOrUtility(route: string) {
  return /(^|\/)_layout\.tsx$/.test(route) || route === "calculator/_webStyleGuard.tsx";
}

describe("error boundary coverage", () => {
  const allRoutes = collectTsxFiles(APP_DIR);
  const screenRoutes = allRoutes.filter(
    (route) => !isLayoutOrUtility(route) && !ALIAS_ROUTES.has(route),
  );

  it("treats root, auth, and not-found routes as protected user-facing screens", () => {
    for (const route of REQUIRED_LEAF_ROUTES) {
      expect(screenRoutes).toContain(route);
    }
  });

  it("wraps every user-facing leaf route with withScreenErrorBoundary", () => {
    expect(screenRoutes.length).toBeGreaterThanOrEqual(30);

    for (const route of screenRoutes) {
      const content = fs.readFileSync(path.join(APP_DIR, route), "utf8");
      expect(content).toContain("withScreenErrorBoundary");
    }
  });

  it("keeps legacy aliases as default re-exports to wrapped canonical routes", () => {
    for (const [aliasRoute, canonicalRoute] of ALIAS_ROUTES.entries()) {
      const aliasContent = fs.readFileSync(path.join(APP_DIR, aliasRoute), "utf8");
      const canonicalContent = fs.readFileSync(path.join(APP_DIR, canonicalRoute), "utf8");

      expect(aliasContent).toMatch(/export\s*\{\s*default\s*\}\s*from\s*["'][^"']+["']\s*;/);
      expect(canonicalContent).toContain("withScreenErrorBoundary");
    }
  });

  it("passes the S_SCALE_02 route boundary verifier without broad whitelists", () => {
    const verification = verifyRouteErrorBoundaryCoverage(process.cwd(), {
      writeArtifacts: false,
    });

    expect(verification.final_status).toBe(GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY);
    expect(verification.metrics.remainingScreenRoutesWithoutBoundary).toBe(0);
    expect(verification.metrics.aliasRoutesResolveToWrappedTargets).toBe(true);
    expect(verification.metrics.noBroadWhitelist).toBe(true);
    expect(verification.metrics.rootAndAuthRoutesCovered).toBe(true);
  });
});
