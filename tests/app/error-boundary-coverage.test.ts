/**
 * Error boundary coverage tests.
 *
 * WAVE P: Validates that all user-facing route files (except layouts,
 * auth, and system routes) are wrapped with withScreenErrorBoundary
 * to prevent full-app crashes from render errors.
 */

import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.resolve(__dirname, "../../app");

/**
 * Routes that are legitimately exempt from screen error boundaries:
 * - _layout.tsx: navigation wrappers, not screens
 * - +not-found.tsx: system route
 * - index.tsx: app entry redirect
 * - sign-in.tsx: auth gate
 * - auth/*: auth flow (own error handling)
 * - calculator/_webStyleGuard.tsx: utility, not a screen
 */
const EXEMPT_PATTERNS = [
  /_layout\.tsx$/,
  /\+not-found\.tsx$/,
  /^index\.tsx$/,
  /^sign-in\.tsx$/,
  /^auth[\\/]/,
  /_webStyleGuard\.tsx$/,
  // Alias re-exports to routes that already have boundaries:
  /^\(tabs\)\/suppliers-map\.tsx$/,  // → (tabs)/supplierMap.tsx
  /^chat\/index\.tsx$/,             // → (tabs)/chat.tsx
  /^reports\/ai-assistant\.tsx$/,   // → (tabs)/ai.tsx
];

function isExempt(relativePath: string): boolean {
  return EXEMPT_PATTERNS.some((p) => p.test(relativePath));
}

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
  return results;
}

describe("error boundary coverage", () => {
  const allRoutes = collectTsxFiles(APP_DIR);
  const screenRoutes = allRoutes.filter((r) => !isExempt(r));

  it("has at least 15 screen routes to validate", () => {
    expect(screenRoutes.length).toBeGreaterThanOrEqual(15);
  });

  for (const route of screenRoutes) {
    it(`${route} has withScreenErrorBoundary`, () => {
      const content = fs.readFileSync(path.join(APP_DIR, route), "utf8");
      expect(content).toContain("withScreenErrorBoundary");
    });
  }
});
