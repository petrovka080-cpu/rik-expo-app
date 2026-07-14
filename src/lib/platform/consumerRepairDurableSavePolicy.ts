import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestEvent,
  ConsumerRepairStatus,
} from "../consumerRequests/consumerRequestTypes";

export const CONSUMER_REPAIR_DURABLE_SAVE_DIAGNOSTIC_EVENT =
  "consumer_repair_durable_save_emergency_compacted" as const;

export type ConsumerRepairDurableSaveDiagnosticEvent = {
  eventType: typeof CONSUMER_REPAIR_DURABLE_SAVE_DIAGNOSTIC_EVENT;
  reason: string;
  storageMode: "localStorage";
  redacted: true;
  currentDraftPreserved: true;
  approvedHistoryDeleteAllowed: false;
  revisionChainPreserved: true;
  pdfStatePreserved: true;
  buyerPackageStatePreserved: true;
  droppedFields: string[];
  createdAt: string;
};

const diagnostics: ConsumerRepairDurableSaveDiagnosticEvent[] = [];

export function isConsumerRepairApprovedHistoryStatus(status: ConsumerRepairStatus): boolean {
  return status === "consumer_approved" || status === "sent_to_marketplace" || status === "archived";
}

export function isConsumerRepairDurableEvictionCandidate(bundle: ConsumerRepairDraftBundle): boolean {
  if (isConsumerRepairApprovedHistoryStatus(bundle.draft.status)) return false;
  return bundle.draft.status === "draft" || bundle.draft.status === "deleted_by_user";
}

export function consumerRepairDurableEvictionPriority(bundle: ConsumerRepairDraftBundle): number {
  if (bundle.draft.status === "deleted_by_user") return 0;
  if (bundle.draft.status === "draft") return 1;
  return 10;
}

export function createConsumerRepairDurableSaveDiagnosticEvent(input: {
  reason: string;
  createdAt?: string;
}): ConsumerRepairDurableSaveDiagnosticEvent {
  return {
    eventType: CONSUMER_REPAIR_DURABLE_SAVE_DIAGNOSTIC_EVENT,
    reason: input.reason,
    storageMode: "localStorage",
    redacted: true,
    currentDraftPreserved: true,
    approvedHistoryDeleteAllowed: false,
    revisionChainPreserved: true,
    pdfStatePreserved: true,
    buyerPackageStatePreserved: true,
    droppedFields: [
      "structuredEstimatePayload",
      "catalogCandidates",
      "priceCandidates",
      "priceTrace",
      "selectedProductBinding",
      "heavyCalculationTrace",
    ],
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function recordConsumerRepairDurableSaveDiagnosticEvent(
  event: ConsumerRepairDurableSaveDiagnosticEvent,
): void {
  diagnostics.push(event);
}

export function appendConsumerRepairDurableSaveDiagnosticEvent(input: {
  bundle: ConsumerRepairDraftBundle;
  reason: string;
  createdAt?: string;
}): ConsumerRepairDraftBundle {
  const diagnostic = createConsumerRepairDurableSaveDiagnosticEvent({
    reason: input.reason,
    createdAt: input.createdAt,
  });
  recordConsumerRepairDurableSaveDiagnosticEvent(diagnostic);
  const event: ConsumerRepairRequestEvent = {
    id: `consumer_repair_durable_diag_${Date.now().toString(36)}_${diagnostics.length}`,
    requestDraftId: input.bundle.draft.id,
    eventType: diagnostic.eventType,
    actorType: "system",
    payload: {
      reason: diagnostic.reason,
      storageMode: diagnostic.storageMode,
      redacted: diagnostic.redacted,
      currentDraftPreserved: diagnostic.currentDraftPreserved,
      approvedHistoryDeleteAllowed: diagnostic.approvedHistoryDeleteAllowed,
      revisionChainPreserved: diagnostic.revisionChainPreserved,
      pdfStatePreserved: diagnostic.pdfStatePreserved,
      buyerPackageStatePreserved: diagnostic.buyerPackageStatePreserved,
      droppedFields: diagnostic.droppedFields,
    },
    createdAt: diagnostic.createdAt,
  };
  return {
    ...input.bundle,
    events: [...input.bundle.events, event],
  };
}

export function getConsumerRepairDurableSaveDiagnosticsForTests(): ConsumerRepairDurableSaveDiagnosticEvent[] {
  return [...diagnostics];
}

export function resetConsumerRepairDurableSaveDiagnosticsForTests(): void {
  diagnostics.length = 0;
}
