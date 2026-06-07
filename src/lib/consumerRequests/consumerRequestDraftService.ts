import type { ConsumerRepairAiDraft, ConsumerRepairRequestDraft, ConsumerRepairSelectedWork } from "./consumerRequestTypes";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function createConsumerRepairRequestDraft(input: {
  consumerUserId: string;
  problemText?: string | null;
  repairType?: string | null;
  city?: string | null;
  addressText?: string | null;
  preferredTimeText?: string | null;
  contactPhone?: string | null;
  selectedWork?: ConsumerRepairSelectedWork | null;
  aiDraft?: ConsumerRepairAiDraft | null;
}): ConsumerRepairRequestDraft {
  const now = new Date().toISOString();
  const selectedWork = input.selectedWork ?? input.aiDraft?.selectedWork ?? null;
  return {
    id: id("consumer_draft"),
    consumerUserId: input.consumerUserId,
    orgId: null,
    title: input.aiDraft?.titleRu ?? "Ремонт дома",
    problemText: input.problemText ?? null,
    repairType: input.aiDraft?.repairType ?? input.repairType ?? "unknown",
    city: input.city ?? null,
    addressText: input.addressText ?? null,
    preferredTimeText: input.preferredTimeText ?? null,
    contactPhone: input.contactPhone ?? null,
    selectedWorkKey: selectedWork?.selectedWorkKey ?? null,
    selectedWorkTitleRu: selectedWork?.selectedWorkTitleRu ?? null,
    selectedWorkCategoryKey: selectedWork?.selectedWorkCategoryKey ?? null,
    selectedWorkCategoryTitleRu: selectedWork?.selectedWorkCategoryTitleRu ?? null,
    selectedWorkRawInput: selectedWork?.selectedWorkRawInput ?? null,
    selectedWorkSource: selectedWork?.selectedWorkSource ?? null,
    selectedWorkResolverReGuessed: selectedWork?.selectedWorkResolverReGuessed ?? null,
    status: "draft",
    aiSummaryRu: input.aiDraft?.summaryRu ?? null,
    missingData: input.aiDraft?.missingData ?? [],
    marketplaceReadyAt: null,
    marketplaceValidationErrors: [],
    lastMarketplaceSubmitAttemptAt: null,
    createdAt: now,
    updatedAt: null,
    approvedAt: null,
  };
}

export function updateConsumerRepairRequestDraft(
  draft: ConsumerRepairRequestDraft,
  patch: Partial<Pick<
    ConsumerRepairRequestDraft,
    | "title"
    | "problemText"
    | "repairType"
    | "city"
    | "addressText"
    | "preferredTimeText"
    | "contactPhone"
    | "selectedWorkKey"
    | "selectedWorkTitleRu"
    | "selectedWorkCategoryKey"
    | "selectedWorkCategoryTitleRu"
    | "selectedWorkRawInput"
    | "selectedWorkSource"
    | "selectedWorkResolverReGuessed"
    | "aiSummaryRu"
    | "missingData"
  >>,
): ConsumerRepairRequestDraft {
  return {
    ...draft,
    ...patch,
    orgId: null,
    updatedAt: new Date().toISOString(),
  };
}

export function approveConsumerRepairRequestDraft(draft: ConsumerRepairRequestDraft): ConsumerRepairRequestDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    status: "consumer_approved",
    approvedAt: now,
    updatedAt: now,
    orgId: null,
  };
}
