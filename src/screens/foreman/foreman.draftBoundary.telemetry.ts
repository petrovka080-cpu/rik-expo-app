import type { MutableRefObject } from "react";

import type {
  ForemanDraftRecoveryAction,
  ForemanDraftSyncStage,
} from "../../lib/offline/foremanSyncRuntime";
import {
  recordCatchDiscipline,
  type CatchDisciplineKind,
} from "../../lib/observability/catchDiscipline";
import {
  getForemanDurableDraftState,
  pushForemanDurableDraftTelemetry,
} from "./foreman.durableDraft.store";
import { resolveForemanDraftBoundaryFailurePlan, resolveForemanDraftBoundaryManualRecoveryTelemetryPlan } from "./foreman.draftBoundary.logic";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";

export type ForemanDraftBoundaryTelemetryDeps = {
  localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
  requestId: string;
  localOnlyRequestId: string;
  networkOnlineRef: MutableRefObject<boolean | null>;
};

export type ForemanDraftBoundaryRecoveryTelemetryParams = {
  recoveryAction: ForemanDraftRecoveryAction;
  result: "progress" | "success" | "retryable_failure" | "terminal_failure";
  conflictType?: ReturnType<typeof getForemanDurableDraftState>["conflictType"];
  errorClass?: string | null;
  errorCode?: string | null;
};

export type ForemanDraftBoundaryFailureParams = {
  event: string;
  error: unknown;
  context?: string;
  stage: ForemanDraftSyncStage;
  kind?: CatchDisciplineKind;
  sourceKind?: string;
  extra?: Record<string, unknown>;
};

export const pushForemanDraftBoundaryRecoveryTelemetry = async (
  deps: ForemanDraftBoundaryTelemetryDeps,
  params: ForemanDraftBoundaryRecoveryTelemetryParams,
) => {
  const durableState = getForemanDurableDraftState();
  const recoveryTelemetryPlan = resolveForemanDraftBoundaryManualRecoveryTelemetryPlan({
    durableState,
    localSnapshot: deps.localDraftSnapshotRef.current,
    activeRequestId: deps.requestId,
    localOnlyRequestId: deps.localOnlyRequestId,
    recoveryAction: params.recoveryAction,
    result: params.result,
    conflictType: params.conflictType,
    errorClass: params.errorClass,
    errorCode: params.errorCode,
    networkOnline: deps.networkOnlineRef.current,
  });
  await pushForemanDurableDraftTelemetry(recoveryTelemetryPlan.telemetry);
};

export const reportForemanDraftBoundaryFailure = (
  deps: Pick<
    ForemanDraftBoundaryTelemetryDeps,
    "localDraftSnapshotRef" | "requestId" | "localOnlyRequestId"
  >,
  params: ForemanDraftBoundaryFailureParams,
) => {
  const failurePlan = resolveForemanDraftBoundaryFailurePlan({
    durableState: getForemanDurableDraftState(),
    localSnapshot: deps.localDraftSnapshotRef.current,
    activeRequestId: deps.requestId,
    localOnlyRequestId: deps.localOnlyRequestId,
    event: params.event,
    error: params.error,
    context: params.context,
    stage: params.stage,
    kind: params.kind,
    sourceKind: params.sourceKind,
    extra: params.extra,
  });
  recordCatchDiscipline(failurePlan.catchDiscipline);
  return failurePlan.classified;
};
