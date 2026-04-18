export type PdfDocumentOpenFlowStartPlan =
  | {
      action: "join_existing";
      joinedRunId: string;
      guardReason: "owner_already_inflight";
    }
  | {
      action: "start_new";
      clearExisting: boolean;
      clearReason: "stale_existing" | null;
    };

export type PdfDocumentOpenFlowCleanupPlan = {
  clearActiveFlow: boolean;
  clearLatestRun: boolean;
};

const toText = (value: unknown): string => String(value ?? "");

export function resolvePdfDocumentOpenFlowStartPlan(args: {
  flowKey?: string | null;
  existingRunId?: string | null;
  existingStartedAt?: number | null;
  existingTimestamp?: number | null;
  nowMs: number;
  maxTtlMs: number;
}): PdfDocumentOpenFlowStartPlan {
  const flowKey = toText(args.flowKey);
  const existingRunId = toText(args.existingRunId);
  if (!flowKey || !existingRunId) {
    return {
      action: "start_new",
      clearExisting: false,
      clearReason: null,
    };
  }

  const existingTimestamp =
    typeof args.existingTimestamp === "number"
      ? args.existingTimestamp
      : typeof args.existingStartedAt === "number"
        ? args.existingStartedAt
        : 0;
  const maxTtlMs = Math.max(0, args.maxTtlMs);
  const ageMs = args.nowMs - existingTimestamp;
  if (existingTimestamp > 0 && ageMs < maxTtlMs) {
    return {
      action: "join_existing",
      joinedRunId: existingRunId,
      guardReason: "owner_already_inflight",
    };
  }

  return {
    action: "start_new",
    clearExisting: true,
    clearReason: "stale_existing",
  };
}

export function resolvePdfDocumentOpenFlowCleanupPlan(args: {
  flowKey?: string | null;
  activeRunId?: string | null;
  latestRunId?: string | null;
  currentRunId: string;
}): PdfDocumentOpenFlowCleanupPlan {
  const flowKey = toText(args.flowKey);
  const currentRunId = toText(args.currentRunId);
  if (!flowKey || !currentRunId) {
    return {
      clearActiveFlow: false,
      clearLatestRun: false,
    };
  }

  return {
    clearActiveFlow: toText(args.activeRunId) === currentRunId,
    clearLatestRun: toText(args.latestRunId) === currentRunId,
  };
}
