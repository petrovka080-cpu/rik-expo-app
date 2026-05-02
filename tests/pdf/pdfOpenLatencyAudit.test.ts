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
const SESSIONS_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "documents",
  "pdfDocumentSessions.ts",
);
const ACTION_PLAN_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "documents",
  "pdfDocumentActionPlan.ts",
);
const PREVIEW_ACTION_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "documents",
  "pdfDocumentPreviewAction.ts",
);
const VISIBILITY_BUSY_PLAN_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "documents",
  "pdfDocumentVisibilityBusyPlan.ts",
);
const VIEWER_ENTRY_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "documents",
  "pdfDocumentViewerEntry.ts",
);

const actionsSource = readFileSync(ACTIONS_PATH, "utf8");
const sessionsSource = readFileSync(SESSIONS_PATH, "utf8");
const actionPlanSource = readFileSync(ACTION_PLAN_PATH, "utf8");
const previewActionSource = readFileSync(PREVIEW_ACTION_PATH, "utf8");
const visibilityBusyPlanSource = readFileSync(VISIBILITY_BUSY_PLAN_PATH, "utf8");
const viewerEntrySource = readFileSync(VIEWER_ENTRY_PATH, "utf8");

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
    const matches = visibilityBusyPlanSource.match(/minMs:\s*(\d+)/g);
    expect(matches).toBeTruthy();
    for (const m of matches!) {
      const value = parseInt(m.replace(/minMs:\s*/, ""), 10);
      expect(value).toBeLessThanOrEqual(200);
    }
  });

  it("does not contain minMs: 650", () => {
    expect(visibilityBusyPlanSource).not.toContain("minMs: 650");
  });
});

describe("L-PERF: critical path contract preserved", () => {
  it("InteractionManager.runAfterInteractions is still used for modal dismiss safety", () => {
    expect(previewActionSource).toContain("pushPdfDocumentViewerRouteSafely");
    expect(viewerEntrySource).toContain("InteractionManager");
    expect(viewerEntrySource).toContain("runAfterInteractions");
  });

  it("viewer entry route push boundary still exists", () => {
    expect(viewerEntrySource).toContain("export async function pushPdfDocumentViewerRouteSafely");
  });

  it("breadcrumbs still fire (fire-and-forget, not removed)", () => {
    // persistCriticalPdfBreadcrumb calls should still exist
    const callCount =
      (actionsSource.match(/persistCriticalPdfBreadcrumb\(/g) || []).length
      + (previewActionSource.match(/persistCriticalPdfBreadcrumb\(/g) || []).length;
    // Function definition in the orchestrator plus preview execution-owner breadcrumbs.
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

  it("delegates mobile remote preview session strategy to a pure plan", () => {
    expect(actionPlanSource).toContain("resolvePdfDocumentPreviewSessionPlan");
    expect(previewActionSource).toContain("resolvePdfDocumentPreviewModePlan");
    expect(actionsSource).not.toContain("resolvePdfDocumentPreviewSessionPlan");
  });
});

describe("L-PERF-S: materialization breadcrumbs are fire-and-forget", () => {
  it("persistMaterializeBreadcrumb returns void, not Promise", () => {
    expect(sessionsSource).toMatch(
      /function persistMaterializeBreadcrumb\([^)]*\):\s*void\s*\{/s,
    );
  });

  it("uses recordPdfCrashBreadcrumb instead of the awaited async variant", () => {
    expect(sessionsSource).toContain("recordPdfCrashBreadcrumb");
    expect(sessionsSource).not.toContain("recordPdfCrashBreadcrumbAsync");
  });

  it("does not await materialization breadcrumbs on the PDF open path", () => {
    expect(sessionsSource).not.toMatch(/await\s+persistMaterializeBreadcrumb\(/);
  });

  it("keeps the materialization order intact", () => {
    const startIndex = sessionsSource.indexOf(
      "persistMaterializeBreadcrumb(\"viewer_materialize_start\"",
    );
    const cacheIndex = sessionsSource.indexOf("ensurePdfInstantCacheAsset({", startIndex);
    const successIndex = sessionsSource.indexOf(
      "persistMaterializeBreadcrumb(\"viewer_materialize_success\"",
      cacheIndex,
    );
    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(cacheIndex).toBeGreaterThan(startIndex);
    expect(successIndex).toBeGreaterThan(cacheIndex);
  });

  it("delegates local materialization and remote downloads to the instant cache service", () => {
    expect(sessionsSource).toContain("ensurePdfInstantCacheAsset");
    expect(sessionsSource).toContain("getPdfInstantCacheStatus");
    expect(sessionsSource).not.toContain("sourceUri.includes(\"/Caches/Print/\")");
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

describe("L-PERF FIX-3: InteractionManager is conditional on modal dismiss", () => {
  it("InteractionManager.runAfterInteractions is gated by hadModalDismiss", () => {
    // Must contain: hadModalDismiss && typeof InteractionManager
    expect(viewerEntrySource).toMatch(
      /hadModalDismiss\s*&&\s*typeof InteractionManager/,
    );
  });

  it("hadModalDismiss flag is derived from onBeforeNavigate", () => {
    expect(viewerEntrySource).toContain(
      'const hadModalDismiss = typeof onBeforeNavigate === "function"',
    );
  });

  it("non-modal path uses Promise.resolve microtask (not setTimeout)", () => {
    expect(viewerEntrySource).toContain("Promise.resolve().then(runPush)");
  });

  it("L-PERF comment explains the conditional InteractionManager", () => {
    expect(viewerEntrySource).toContain("L-PERF: Only wait for InteractionManager");
  });

  it("no unconditional InteractionManager.runAfterInteractions remains", () => {
    // Verify the actual invocation line contains the hadModalDismiss guard.
    // We look for lines containing the actual call pattern (with opening paren).
    const lines = viewerEntrySource.split("\n");
    const invocationLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return false;
      return trimmed.includes("InteractionManager.runAfterInteractions(");
    });
    expect(invocationLines.length).toBeGreaterThan(0);
    for (const line of invocationLines) {
      // The line before or the same condition block must contain hadModalDismiss
      const lineIdx = lines.indexOf(line);
      const contextBlock = lines.slice(Math.max(0, lineIdx - 2), lineIdx + 1).join("\n");
      expect(contextBlock).toContain("hadModalDismiss");
    }
  });
});
