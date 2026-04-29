import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("S-PII-1 log redaction source contracts", () => {
  it("does not log raw AI response bodies from the AI repository", () => {
    const source = read("src/lib/ai/aiRepository.ts");

    expect(source).not.toContain("[AI RESPONSE RAW]");
    expect(source).not.toContain('console.info("[AI RESPONSE RAW]", text)');
    expect(source).toContain("[AI RESPONSE METADATA]");
    expect(source).toContain("textLength: text.length");
    expect(source).toContain("redactSensitiveRecord(payload)");
  });

  it("redacts Foreman AI source prompts before dev console logging", () => {
    const source = read("src/screens/foreman/foreman.ai.ts");

    expect(source).toContain('safePayload.sourcePrompt = "[redacted]"');
    expect(source).toContain("safePayload.sourcePromptLength");
    expect(source).toContain("redactSensitiveRecord(payload)");
    expect(source).toContain("redactSensitiveText(error instanceof Error ? error.message");
  });

  it("summarizes CalcModal RPC payload diagnostics instead of logging raw payload values", () => {
    const source = read("src/components/foreman/CalcModal.tsx");

    expect(source).not.toContain('console.error("[CalcModal][rpc_calc_work_kit]", { payload, error })');
    expect(source).toContain("summarizeCalcModalPayloadForLog(payload)");
    expect(source).toContain("redactSensitiveValue(error)");
  });

  it("does not emit raw director supplier names in finance supplier-scope observability extras", () => {
    const source = read("src/screens/director/director.finance.panel.ts");

    expect(source).toContain('supplierScope: "present_redacted"');
    expect(source).toContain('kindScope: selection.kindName ? "present_redacted" : "missing"');
    expect(source).not.toContain('extra: {\n            owner: "backend",\n            version: "v2",\n            supplier: selection.supplier');
    expect(source).not.toContain('extra: {\n            supplier: selection.supplier');
    expect(source).toContain("redactSensitiveValue(error)");
  });

  it("routes queue worker diagnostics through redacted logger scopes", () => {
    const source = read("src/workers/queueWorker.ts");

    expect(source).toContain('import { logger } from "../lib/logger"');
    expect(source).toContain("queueWorkerScope(workerId)");
    expect(source).toContain("queueJobScope(job)");
    expect(source).toContain("keptJobIdScope");
    expect(source).not.toContain('console.warn("[queue.worker] job failed"');
    expect(source).not.toContain('console.error("[queue.worker] failure persistence failed"');
    expect(source).not.toContain("jobId: job.id");
  });

  it("summarizes buyer submit worker payload-derived identifiers before logging", () => {
    const source = read("src/workers/processBuyerSubmitJob.ts");

    expect(source).toContain('import { logger } from "../lib/logger"');
    expect(source).toContain("requestIdScope: redactedPresence(payload.requestId)");
    expect(source).toContain("selectedIdCount: requestItemIds.length");
    expect(source).toContain("supplierBucketCount: bySupp.size");
    expect(source).toContain("skippedSupplierCount: missingSupplierKeys.size");
    expect(source).not.toContain("selectedIds: requestItemIds");
    expect(source).not.toContain("supplierBucketKeys: Array.from(bySupp.keys())");
    expect(source).not.toContain("skippedSupplierKeys: Array.from(missingSupplierKeys)");
  });

  it("redacts request draft sync submit and broadcast identifiers in diagnostics", () => {
    const source = read("src/lib/api/requestDraftSync.service.ts");

    expect(source).toContain("requestIdScope: redactedPresence(requestId)");
    expect(source).toContain("displayNoScope: redactedPresence(displayNo)");
    expect(source).toContain("requestIdScope: redactedPresence(request.id)");
    expect(source).not.toContain('console.info("[request-draft-sync]"');
    expect(source).not.toContain('console.info("[submit]"');
    expect(source).not.toContain("requestId: request.id");
  });

  it("redacts Foreman draft sync request identifiers in diagnostic telemetry", () => {
    const source = read("src/screens/foreman/foreman.draftBoundary.helpers.ts");

    expect(source).toContain("summarizeDraftSyncTelemetryForLog(payload)");
    expect(source).toContain("requestIdScope: redactedPresence(requestId)");
    expect(source).toContain("activeRequestIdScope: redactedPresence(activeRequestId)");
    expect(source).not.toContain('console.info("[foreman.draft.sync]", payload)');
    expect(source).not.toContain('console.warn("[foreman.draft.sync] sync failed"');
  });
});
