import { readFileSync } from "fs";
import { join } from "path";

import {
  resolvePdfDocumentOpenFlowCleanupPlan,
  resolvePdfDocumentOpenFlowStartPlan,
} from "./pdfDocumentOpenFlowPlan";

describe("pdfDocumentOpenFlowPlan", () => {
  it("joins an existing active flow inside the TTL window", () => {
    expect(
      resolvePdfDocumentOpenFlowStartPlan({
        flowKey: "pdf:director:report",
        existingRunId: "run-1",
        existingStartedAt: 1_000,
        existingTimestamp: 1_000,
        nowMs: 2_000,
        maxTtlMs: 60_000,
      }),
    ).toEqual({
      action: "join_existing",
      joinedRunId: "run-1",
      guardReason: "owner_already_inflight",
    });
  });

  it("starts a new flow and clears a stale TTL-expired entry", () => {
    expect(
      resolvePdfDocumentOpenFlowStartPlan({
        flowKey: "pdf:director:report",
        existingRunId: "run-1",
        existingStartedAt: 1_000,
        existingTimestamp: 1_000,
        nowMs: 62_000,
        maxTtlMs: 60_000,
      }),
    ).toEqual({
      action: "start_new",
      clearExisting: true,
      clearReason: "stale_existing",
    });
  });

  it("falls back to existing startedAt when timestamp map entry is missing", () => {
    expect(
      resolvePdfDocumentOpenFlowStartPlan({
        flowKey: "pdf:director:report",
        existingRunId: "run-1",
        existingStartedAt: 1_000,
        existingTimestamp: null,
        nowMs: 2_000,
        maxTtlMs: 60_000,
      }),
    ).toEqual({
      action: "join_existing",
      joinedRunId: "run-1",
      guardReason: "owner_already_inflight",
    });
  });

  it("starts fresh when there is no existing flow", () => {
    expect(
      resolvePdfDocumentOpenFlowStartPlan({
        flowKey: "pdf:director:report",
        existingRunId: null,
        existingStartedAt: null,
        existingTimestamp: null,
        nowMs: 2_000,
        maxTtlMs: 60_000,
      }),
    ).toEqual({
      action: "start_new",
      clearExisting: false,
      clearReason: null,
    });
  });

  it("does not clear active flow or latest run without a valid key", () => {
    expect(
      resolvePdfDocumentOpenFlowCleanupPlan({
        flowKey: "",
        activeRunId: "run-1",
        latestRunId: "run-1",
        currentRunId: "run-1",
      }),
    ).toEqual({
      clearActiveFlow: false,
      clearLatestRun: false,
    });
  });

  it("cleans only entries still owned by the current run", () => {
    expect(
      resolvePdfDocumentOpenFlowCleanupPlan({
        flowKey: "pdf:director:report",
        activeRunId: "run-1",
        latestRunId: "run-2",
        currentRunId: "run-1",
      }),
    ).toEqual({
      clearActiveFlow: true,
      clearLatestRun: false,
    });
  });

  it("keeps newer active/latest runs untouched", () => {
    expect(
      resolvePdfDocumentOpenFlowCleanupPlan({
        flowKey: "pdf:director:report",
        activeRunId: "run-new",
        latestRunId: "run-new",
        currentRunId: "run-old",
      }),
    ).toEqual({
      clearActiveFlow: false,
      clearLatestRun: false,
    });
  });

  it("stays pure and does not import runtime side-effect APIs", () => {
    const source = readFileSync(
      join(__dirname, "pdfDocumentOpenFlowPlan.ts"),
      "utf8",
    );

    expect(source).not.toContain("Map<");
    expect(source).not.toContain("Promise");
    expect(source).not.toContain("router");
    expect(source).not.toContain("beginPdfOpenVisibilityWait");
    expect(source).not.toContain("preparePdfDocument");
    expect(source).not.toContain("recordPdfOpenStage");
    expect(source).not.toContain("Date.now");
  });
});
