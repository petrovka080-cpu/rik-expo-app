import fs from "node:fs";
import path from "node:path";

import {
  BACKGROUND_JOB_CONTRACTS,
  BACKGROUND_JOB_MAX_ATTEMPTS,
  buildBackgroundJobError,
  buildBackgroundJobPlan,
  clampBackgroundJobAttempts,
  enqueueBackgroundJobDisabled,
  isBackgroundJobBoundaryEnabled,
  sanitizeBackgroundJobMetadata,
} from "../../src/shared/scale/backgroundJobs";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S-50K background job boundary scaffold", () => {
  it("keeps background jobs disabled unless explicit shadow config is present", () => {
    expect(isBackgroundJobBoundaryEnabled({ enabled: false })).toBe(false);
    expect(isBackgroundJobBoundaryEnabled({ enabled: true })).toBe(false);
    expect(isBackgroundJobBoundaryEnabled({ enabled: true, shadowMode: false, queueUrl: "https://jobs.example.invalid" })).toBe(false);
    expect(isBackgroundJobBoundaryEnabled({ enabled: true, shadowMode: true, queueUrl: "" })).toBe(false);
    expect(isBackgroundJobBoundaryEnabled({ enabled: true, shadowMode: true, queueUrl: "https://jobs.example.invalid" })).toBe(true);
  });

  it("builds a contract-only plan with no network or worker execution", () => {
    expect(buildBackgroundJobPlan({ enabled: false }, "pdf.report.render")).toEqual({
      flow: "pdf.report.render",
      enabled: false,
      shadowMode: false,
      queueConfigured: false,
      networkExecutionAllowed: false,
      workerExecutionAllowed: false,
    });

    expect(
      buildBackgroundJobPlan(
        { enabled: true, shadowMode: true, queueUrl: "https://jobs.example.invalid" },
        "warehouse.receive.apply",
      ),
    ).toEqual({
      flow: "warehouse.receive.apply",
      enabled: true,
      shadowMode: true,
      queueConfigured: true,
      networkExecutionAllowed: false,
      workerExecutionAllowed: false,
    });
  });

  it("maps top heavy flows to contract-only background job queues", () => {
    const requiredFlows = [
      "proposal.submit.finalize",
      "warehouse.receive.apply",
      "accountant.payment.apply",
      "director.report.build",
      "pdf.report.render",
      "cache.read_model.refresh",
      "marketplace.catalog.reindex",
      "realtime.channel.reconcile",
      "notification.digest",
    ];

    for (const flow of requiredFlows) {
      expect(BACKGROUND_JOB_CONTRACTS).toContainEqual(
        expect.objectContaining({
          flow,
          status: "contract_only",
          idempotencyRequired: true,
          payloadPiiAllowed: false,
          ownerApprovalRequiredForProduction: true,
        }),
      );
    }
  });

  it("keeps attempts bounded and payload contracts conservative", () => {
    expect(clampBackgroundJobAttempts(undefined)).toBe(3);
    expect(clampBackgroundJobAttempts(-10)).toBe(1);
    expect(clampBackgroundJobAttempts(999)).toBe(BACKGROUND_JOB_MAX_ATTEMPTS);

    for (const contract of BACKGROUND_JOB_CONTRACTS) {
      expect(contract.maxAttempts).toBeGreaterThan(0);
      expect(contract.maxAttempts).toBeLessThanOrEqual(BACKGROUND_JOB_MAX_ATTEMPTS);
      expect(contract.maxPayloadBytes).toBeLessThanOrEqual(16_384);
      expect(contract.queueName).toMatch(/_v1$/);
    }
  });

  it("disabled enqueue does not call network or workers", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    try {
      await expect(
        enqueueBackgroundJobDisabled({
          flow: "pdf.report.render",
          metadata: { flow: "pdf.report.render", user_id: "user-123" },
        }),
      ).resolves.toEqual({
        ok: false,
        error: {
          code: "BACKGROUND_JOB_DISABLED",
          message: "Background job boundary is disabled",
        },
      });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", {
          configurable: true,
          writable: true,
          value: originalFetch,
        });
      } else {
        delete (globalThis as { fetch?: typeof fetch }).fetch;
      }
    }
  });

  it("allows only low-cardinality redacted metadata", () => {
    expect(
      sanitizeBackgroundJobMetadata({
        flow: "pdf.report.render",
        role: "director",
        result: "queued",
        page_size: 50,
        dry_run: true,
        user_id: "user-123",
        company_id: "company-123",
        signed_url: "https://files.example.invalid/report.pdf?token=signed-secret",
        error_class: "token=secretvalue person@example.test",
      }),
    ).toEqual({
      flow: "pdf.report.render",
      role: "director",
      result: "queued",
      page_size: 50,
      dry_run: true,
      error_class: "[redacted] [redacted]",
    });
  });

  it("redacts background job errors", () => {
    expect(
      buildBackgroundJobError(
        "job leak",
        "Bearer abcdefghijklmnop user@example.test https://files.example.invalid/doc.pdf?token=signed-secret",
      ),
    ).toEqual({
      ok: false,
      error: {
        code: "JOB_LEAK",
        message: "Bearer [redacted] [redacted] https://files.example.invalid/doc.pdf?token=[redacted]",
      },
    });
  });

  it("does not import background job boundary from active app flows", () => {
    const roots = ["app", "src"];
    const activeImports: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(PROJECT_ROOT, dir), { withFileTypes: true })) {
        const relativePath = path.join(dir, entry.name);
        if (relativePath.replace(/\\/g, "/").startsWith("src/shared/scale")) continue;
        if (entry.isDirectory()) {
          walk(relativePath);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
          continue;
        }
        const source = readProjectFile(relativePath);
        if (source.includes("shared/scale/backgroundJobs")) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);
  });

  it("documents background jobs without deployment or traffic migration claims", () => {
    const docs = readProjectFile("docs/architecture/50k_background_jobs.md");

    expect(docs).toContain("Production traffic migrated: NO");
    expect(docs).toContain("Server deployed: NO");
    expect(docs).toContain("Worker deployed: NO");
    expect(docs).toContain("Background jobs enabled by default: NO");
    expect(docs).toContain("50K readiness claimed: NO");
  });
});
