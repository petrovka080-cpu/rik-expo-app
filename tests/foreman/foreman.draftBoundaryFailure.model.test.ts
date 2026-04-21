import { readFileSync } from "fs";
import { join } from "path";

import {
  resolveForemanDraftBoundaryFailureReportPlan,
  type ForemanDraftBoundaryFailureClassification,
} from "../../src/screens/foreman/foreman.draftBoundaryFailure.model";

const retryableClassification: ForemanDraftBoundaryFailureClassification = {
  retryable: true,
  conflictType: "retryable_sync_failure",
  errorClass: "network",
  errorCode: "network_timeout",
};

const terminalClassification: ForemanDraftBoundaryFailureClassification = {
  retryable: false,
  conflictType: "server_terminal_conflict",
  errorClass: "server_terminal",
  errorCode: "already_submitted",
};

describe("foreman draft boundary failure report planner", () => {
  it("stays free of observability, durable store, and React side effects", () => {
    const source = readFileSync(
      join(__dirname, "../../src/screens/foreman/foreman.draftBoundaryFailure.model.ts"),
      "utf8",
    );

    expect(source).not.toContain("recordCatchDiscipline");
    expect(source).not.toContain("getForemanDurableDraftState");
    expect(source).not.toContain("localDraftSnapshotRef");
    expect(source).not.toContain("useCallback");
    expect(source).not.toContain("useRef");
  });

  it("plans default degraded fallback catch discipline for retryable failures", () => {
    const error = new Error("network timeout");

    expect(resolveForemanDraftBoundaryFailureReportPlan({
      event: "restore_draft_on_focus_failed",
      error,
      context: "focus",
      stage: "hydrate",
      classified: retryableClassification,
      queueDraftKey: "req-1",
      requestId: "req-1",
    })).toEqual({
      action: "record_catch_discipline",
      classified: retryableClassification,
      catchDiscipline: {
        screen: "foreman",
        surface: "draft_boundary",
        event: "restore_draft_on_focus_failed",
        kind: "degraded_fallback",
        error,
        sourceKind: "draft_boundary:auto_recover",
        errorStage: "hydrate",
        trigger: "focus",
        extra: {
          conflictType: "retryable_sync_failure",
          context: "focus",
          errorCode: "network_timeout",
          queueDraftKey: "req-1",
          requestId: "req-1",
          retryable: true,
        },
      },
    });
  });

  it("plans default soft failure and preserves explicit overrides", () => {
    const error = new Error("already submitted");

    expect(resolveForemanDraftBoundaryFailureReportPlan({
      event: "network_service_bootstrap_failed",
      error,
      context: "network_service_bootstrap",
      stage: "hydrate",
      kind: "cleanup_only",
      sourceKind: "platform:network_service",
      extra: {
        queueDraftKey: "extra-key",
        fallbackReason: "network_service_unavailable",
      },
      classified: terminalClassification,
      queueDraftKey: "req-2",
      requestId: null,
    })).toMatchObject({
      action: "record_catch_discipline",
      classified: terminalClassification,
      catchDiscipline: {
        kind: "cleanup_only",
        sourceKind: "platform:network_service",
        errorStage: "hydrate",
        trigger: "manual_retry",
        extra: {
          conflictType: "server_terminal_conflict",
          context: "network_service_bootstrap",
          errorCode: "already_submitted",
          queueDraftKey: "extra-key",
          requestId: null,
          retryable: false,
          fallbackReason: "network_service_unavailable",
        },
      },
    });
  });

  it("keeps reportDraftBoundaryFailure side effects in the established order", () => {
    const source = readFileSync(
      join(__dirname, "../../src/screens/foreman/hooks/useForemanDraftBoundary.ts"),
      "utf8",
    );
    const start = source.indexOf("const reportDraftBoundaryFailure = useCallback");
    const end = source.indexOf("const persistLocalDraftSnapshot = useCallback", start);
    const block = source.slice(start, end);
    const expectedOrder = [
      "const failurePlan = resolveForemanDraftBoundaryFailurePlan",
      "recordCatchDiscipline(failurePlan.catchDiscipline)",
      "return failurePlan.classified",
    ];

    let previousIndex = -1;
    for (const marker of expectedOrder) {
      const nextIndex = block.indexOf(marker);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }
  });
});
