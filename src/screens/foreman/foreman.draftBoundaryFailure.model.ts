import type {
  CatchDisciplineKind,
} from "../../lib/observability/catchDiscipline";
import {
  normalizeForemanSyncTriggerSource,
  type ForemanDraftConflictType,
  type ForemanDraftSyncStage,
  type ForemanDraftSyncTriggerSource,
} from "../../lib/offline/foremanSyncRuntime";

export type ForemanDraftBoundaryFailureClassification = {
  retryable: boolean;
  conflictType: ForemanDraftConflictType;
  errorClass: string;
  errorCode: string;
};

export type ForemanDraftBoundaryFailureCatchDiscipline = {
  screen: "foreman";
  surface: "draft_boundary";
  event: string;
  kind: CatchDisciplineKind;
  error: unknown;
  sourceKind: string;
  errorStage: ForemanDraftSyncStage;
  trigger: ForemanDraftSyncTriggerSource;
  extra: {
    conflictType: ForemanDraftConflictType;
    context: string | null;
    errorCode: string;
    queueDraftKey: string;
    requestId: string | null;
    retryable: boolean;
  } & Record<string, unknown>;
};

export type ForemanDraftBoundaryFailureReportPlan = {
  action: "record_catch_discipline";
  classified: ForemanDraftBoundaryFailureClassification;
  catchDiscipline: ForemanDraftBoundaryFailureCatchDiscipline;
};

export const resolveForemanDraftBoundaryFailureReportPlan = (params: {
  event: string;
  error: unknown;
  context?: string;
  stage: ForemanDraftSyncStage;
  kind?: CatchDisciplineKind;
  sourceKind?: string;
  extra?: Record<string, unknown>;
  classified: ForemanDraftBoundaryFailureClassification;
  queueDraftKey: string;
  requestId: string | null;
}): ForemanDraftBoundaryFailureReportPlan => ({
  action: "record_catch_discipline",
  classified: params.classified,
  catchDiscipline: {
    screen: "foreman",
    surface: "draft_boundary",
    event: params.event,
    kind: params.kind ?? (params.classified.retryable ? "degraded_fallback" : "soft_failure"),
    error: params.error,
    sourceKind: params.sourceKind ?? "draft_boundary:auto_recover",
    errorStage: params.stage,
    trigger: normalizeForemanSyncTriggerSource(params.context, null, false),
    extra: {
      conflictType: params.classified.conflictType,
      context: params.context ?? null,
      errorCode: params.classified.errorCode,
      queueDraftKey: params.queueDraftKey,
      requestId: params.requestId,
      retryable: params.classified.retryable,
      ...params.extra,
    },
  },
});
