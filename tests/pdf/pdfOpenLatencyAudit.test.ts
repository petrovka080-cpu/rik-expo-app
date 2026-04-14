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

describe("L-PERF FIX-3: InteractionManager is conditional on modal dismiss", () => {
  it("InteractionManager.runAfterInteractions is gated by hadModalDismiss", () => {
    // Must contain: hadModalDismiss && typeof InteractionManager
    expect(actionsSource).toMatch(
      /hadModalDismiss\s*&&\s*typeof InteractionManager/,
    );
  });

  it("hadModalDismiss flag is derived from onBeforeNavigate", () => {
    expect(actionsSource).toContain(
      'const hadModalDismiss = typeof onBeforeNavigate === "function"',
    );
  });

  it("non-modal path uses Promise.resolve microtask (not setTimeout)", () => {
    expect(actionsSource).toContain("Promise.resolve().then(runPush)");
  });

  it("L-PERF comment explains the conditional InteractionManager", () => {
    expect(actionsSource).toContain("L-PERF: Only wait for InteractionManager");
  });

  it("no unconditional InteractionManager.runAfterInteractions remains", () => {
    // Verify the actual invocation line contains the hadModalDismiss guard.
    // We look for lines containing the actual call pattern (with opening paren).
    const lines = actionsSource.split("\n");
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
