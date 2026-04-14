/**
 * Package L-PERF: PDF open latency hardening — audit shield tests.
 *
 * Validates:
 * 1. Breadcrumbs are fire-and-forget on the critical open path (NOT await-blocking)
 * 2. persistCriticalPdfBreadcrumb returns void (not a Promise)
 * 3. minMs busy floor reduced from 650 to 200
 * 4. No sequential breadcrumb awaits remain in pdfDocumentActions.ts
 * 5. InteractionManager await is still present (needed for modal dismiss)
 * 6. recordPdfCrashBreadcrumb (sync) is used instead of Async variant
 */

import { readFileSync } from "fs";
import { join } from "path";

const ACTIONS_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "documents",
  "pdfDocumentActions.ts",
);

const actionsSource = readFileSync(ACTIONS_PATH, "utf8");

describe("L-PERF: breadcrumbs are fire-and-forget on critical path", () => {
  it("persistCriticalPdfBreadcrumb returns void, not Promise", () => {
    // Must have ): void { signature
    expect(actionsSource).toMatch(
      /function persistCriticalPdfBreadcrumb\([^)]*\):\s*void\s*\{/s,
    );
  });

  it("uses recordPdfCrashBreadcrumb (sync), not recordPdfCrashBreadcrumbAsync", () => {
    expect(actionsSource).toContain("recordPdfCrashBreadcrumb,");
    expect(actionsSource).not.toContain("recordPdfCrashBreadcrumbAsync");
  });

  it("has L-PERF fire-and-forget comment", () => {
    expect(actionsSource).toContain("L-PERF: fire-and-forget");
  });

  it("no const …Breadcrumb = persistCriticalPdfBreadcrumb assignments remain", () => {
    expect(actionsSource).not.toMatch(
      /const \w+Breadcrumb\s*=\s*persistCriticalPdfBreadcrumb/,
    );
  });

  it("no if (…Breadcrumb) await patterns remain", () => {
    expect(actionsSource).not.toMatch(
      /if\s*\(\w+Breadcrumb\)\s*await\s+\w+Breadcrumb/,
    );
  });

  it("no await …Breadcrumb orphan lines remain", () => {
    expect(actionsSource).not.toMatch(
      /^\s+await \w+Breadcrumb;$/m,
    );
  });
});

describe("L-PERF: minMs busy floor reduced from 650 to 200", () => {
  it("uses minMs: 200 (not 650) for PDF prepare", () => {
    const matches = actionsSource.match(/minMs:\s*(\d+)/g);
    expect(matches).toBeTruthy();
    for (const m of matches!) {
      const value = parseInt(m.replace(/minMs:\s*/, ""), 10);
      expect(value).toBeLessThanOrEqual(200);
    }
  });

  it("does not contain minMs: 650", () => {
    expect(actionsSource).not.toContain("minMs: 650");
  });
});

describe("L-PERF: critical path contract preserved", () => {
  it("InteractionManager.runAfterInteractions is still used for modal dismiss safety", () => {
    expect(actionsSource).toContain("InteractionManager");
  });

  it("pushViewerRouteSafely still exists", () => {
    expect(actionsSource).toContain("pushViewerRouteSafely");
  });

  it("breadcrumbs still fire (fire-and-forget, not removed)", () => {
    // persistCriticalPdfBreadcrumb calls should still exist
    const callCount = (actionsSource.match(/persistCriticalPdfBreadcrumb\(/g) || []).length;
    // Function definition + at least 5 calls on the critical path
    expect(callCount).toBeGreaterThanOrEqual(6);
  });

  it("preparePdfDocument still exists", () => {
    expect(actionsSource).toContain("export async function preparePdfDocument");
  });

  it("previewPdfDocument still exists", () => {
    expect(actionsSource).toContain("export async function previewPdfDocument");
  });

  it("prepareAndPreviewPdfDocument still exists", () => {
    expect(actionsSource).toContain("export async function prepareAndPreviewPdfDocument");
  });

  it("activePreviewFlows dedup guard is still present", () => {
    expect(actionsSource).toContain("activePreviewFlows");
  });
});

describe("L-PERF: exact bottleneck elimination verification", () => {
  it("no sequential AsyncStorage I/O on critical path (breadcrumbs are fire-and-forget)", () => {
    // The async version did: await readRawBreadcrumbs() + await writeRawBreadcrumbs()
    // The sync version uses void enqueueBreadcrumbWrite() — no await
    expect(actionsSource).not.toContain("recordPdfCrashBreadcrumbAsync");
  });

  it("no artificial 650ms delay floor", () => {
    expect(actionsSource).not.toContain("650");
  });
});
