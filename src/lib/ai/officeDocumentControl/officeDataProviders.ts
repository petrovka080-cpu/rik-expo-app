import type {
  OfficeDataProviderResult,
  OfficeDocumentControlContext,
  OfficeDocumentControlSourceRef,
  OfficeProviderDescriptor,
  OfficeProviderKey,
} from "./officeDocumentControlTypes";

export const REQUIRED_OFFICE_PROVIDER_KEYS: readonly OfficeProviderKey[] = [
  "aiOfficeSourceSanitizer",
  "aiOfficeScreenContextProvider",
  "aiOfficeTasksProvider",
  "aiOfficeDocumentsQueueProvider",
  "aiOfficeApprovalPackagesProvider",
  "aiOfficeRemindersProvider",
  "aiOfficeDeadlinesProvider",
  "aiOfficeDocumentDetailProvider",
  "aiOfficePaymentBlockersProvider",
  "aiOfficeWorkCloseoutBlockersProvider",
  "aiOfficeDirectorPrepProvider",
  "aiOfficeAnswerComposer",
] as const;

function descriptor(key: OfficeProviderKey): OfficeProviderDescriptor {
  return {
    key,
    pure: true,
    usesHooks: false,
    usesUseEffectHack: false,
    dbWrites: false,
    directMutation: false,
    createsFakeData: false,
    ready: true,
  };
}

export const OFFICE_PROVIDER_REGISTRY: readonly OfficeProviderDescriptor[] =
  REQUIRED_OFFICE_PROVIDER_KEYS.map(descriptor);

export function listOfficeDataProviders(): OfficeProviderDescriptor[] {
  return OFFICE_PROVIDER_REGISTRY.map((item) => ({ ...item }));
}

function fact(id: string, textRu: string, sourceRefs: string[] = []): OfficeDataProviderResult["facts"][number] {
  return {
    id,
    textRu,
    sourceRefs,
    confidence: sourceRefs.length ? "high" : "medium",
  };
}

function providerResult(params: Partial<OfficeDataProviderResult>): OfficeDataProviderResult {
  return {
    facts: params.facts ?? [],
    sources: params.sources ?? [],
    missingData: params.missingData ?? [],
    permissionLimited: params.permissionLimited ?? [],
    exactNoDataReasonRu: params.exactNoDataReasonRu,
  };
}

function sourcesByType(
  context: OfficeDocumentControlContext,
  types: OfficeDocumentControlSourceRef["type"][],
): OfficeDocumentControlSourceRef[] {
  return context.sources.filter((source) => types.includes(source.type));
}

function sourceMissing(label: string, id: string, sourceRefs: string[]): string[] {
  return sourceRefs.length ? [] : [`${label} ${id}: source missing; AI cannot treat it as a stuck-work fact.`];
}

export function aiOfficeScreenContextProvider(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  return providerResult({
    facts: [
      fact(
        "office:screen",
        `Screen ${context.screenId}: tasks ${context.tasks.length}, documents ${context.documentsQueue.length}, packages ${context.approvalPackages.length}, reminders ${context.reminders.length}, deadlines ${context.deadlines.length}.`,
      ),
    ],
  });
}

export function aiOfficeTasksProvider(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["office_task"]),
    facts: context.tasks.map((item) =>
      fact(
        `office-task:${item.id}`,
        `Office task ${item.id}: ${item.titleRu}; status ${item.status}; owner ${item.ownerRole ?? item.nextOwnerRole ?? "missing_owner"}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.tasks.flatMap((item) => [
      ...sourceMissing("Office task", item.id, item.sourceRefs),
      ...(item.ownerRole || item.nextOwnerRole ? [] : [`Office task ${item.id}: owner role missing.`]),
      ...item.missingData,
    ]),
  });
}

export function aiOfficeDocumentsQueueProvider(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["document", "pdf_chunk", "act", "invoice", "report"]),
    facts: context.documentsQueue.map((item) =>
      fact(
        `office-document:${item.id}`,
        `Document ${item.id}: ${item.titleRu}; type ${item.documentType}; status ${item.status}; blocks ${item.blocks.join(", ") || "none"}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.documentsQueue.flatMap((item) => [
      ...sourceMissing("Document", item.id, item.sourceRefs),
      ...(item.ownerRole ? [] : [`Document ${item.id}: owner role missing.`]),
      ...item.missingData,
    ]),
  });
}

export function aiOfficeApprovalPackagesProvider(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["approval_package", "approval"]),
    facts: context.approvalPackages.map((item) =>
      fact(
        `office-package:${item.id}`,
        `Approval package ${item.id}: ${item.titleRu}; status ${item.status}; missing documents ${item.missingDocuments.join(", ") || "none"}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.approvalPackages.flatMap((item) => [
      ...sourceMissing("Approval package", item.id, item.sourceRefs),
      ...(item.ownerRole ? [] : [`Approval package ${item.id}: owner role missing.`]),
      ...item.missingDocuments.map((missing) => `Approval package ${item.id}: missing document ${missing}.`),
      ...item.missingData,
    ]),
  });
}

export function aiOfficeRemindersProvider(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["reminder", "chat_message"]),
    facts: context.reminders.map((item) =>
      fact(
        `office-reminder:${item.id}`,
        `Reminder draft ${item.id}: target ${item.targetRole ?? "missing_owner"}; status ${item.status}; final sent ${item.finalSent ? "yes" : "no"}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.reminders.flatMap((item) => [
      ...sourceMissing("Reminder draft", item.id, item.sourceRefs),
      ...(item.targetRole ? [] : [`Reminder draft ${item.id}: target owner missing.`]),
    ]),
  });
}

export function aiOfficeDeadlinesProvider(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["deadline"]),
    facts: context.deadlines.map((item) =>
      fact(
        `office-deadline:${item.id}`,
        `Deadline ${item.id}: ${item.titleRu}; status ${item.status}; due ${item.dueAt ?? "missing_due_date"}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.deadlines.flatMap((item) => [
      ...sourceMissing("Deadline", item.id, item.sourceRefs),
      ...(item.ownerRole ? [] : [`Deadline ${item.id}: owner role missing.`]),
      ...(item.dueAt ? [] : [`Deadline ${item.id}: due date missing.`]),
      ...item.missingData,
    ]),
  });
}

export function aiOfficeDocumentDetailProvider(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  const selected = context.selectedDocumentId
    ? context.documentsQueue.find((item) => item.id === context.selectedDocumentId)
    : context.documentsQueue[0];
  return providerResult({
    sources: selected ? context.sources.filter((source) => selected.sourceRefs.includes(source.id)) : [],
    facts: selected
      ? [fact(`office-document-detail:${selected.id}`, `Document detail ${selected.id}: ${selected.titleRu}; status ${selected.status}.`, selected.sourceRefs)]
      : [],
    missingData: selected ? selected.missingData : ["No selected document in read-only office context."],
    exactNoDataReasonRu: selected ? undefined : "No document detail is available from source-backed office context.",
  });
}

export function aiOfficePaymentBlockersProvider(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  const documents = context.documentsQueue.filter((item) => item.blocks.includes("payment"));
  const packages = context.approvalPackages.filter((item) => item.linkedPaymentId || item.missingDocuments.length);
  return providerResult({
    sources: sourcesByType(context, ["payment", "invoice", "document", "approval_package", "approval", "warehouse_issue"]),
    facts: [
      ...documents.map((item) => fact(`payment-document-blocker:${item.id}`, `Payment blocker document ${item.id}: ${item.titleRu}; ${item.status}.`, item.sourceRefs)),
      ...packages.map((item) => fact(`payment-package-blocker:${item.id}`, `Payment blocker package ${item.id}: ${item.status}.`, item.sourceRefs)),
    ],
    missingData: [...documents, ...packages].flatMap((item) => item.sourceRefs.length ? [] : [`Payment blocker ${item.id}: source missing.`]),
  });
}

export function aiOfficeWorkCloseoutBlockersProvider(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  const documents = context.documentsQueue.filter((item) => item.blocks.includes("work_closeout"));
  const packages = context.approvalPackages.filter((item) => Boolean(item.linkedWorkId));
  return providerResult({
    sources: sourcesByType(context, ["work", "act", "document", "report", "approval_package"]),
    facts: [
      ...documents.map((item) => fact(`work-document-blocker:${item.id}`, `Work closeout blocker document ${item.id}: ${item.titleRu}; ${item.status}.`, item.sourceRefs)),
      ...packages.map((item) => fact(`work-package-blocker:${item.id}`, `Work closeout package ${item.id}: ${item.status}.`, item.sourceRefs)),
    ],
    missingData: [...documents, ...packages].flatMap((item) => item.sourceRefs.length ? [] : [`Work closeout blocker ${item.id}: source missing.`]),
  });
}

export function aiOfficeDirectorPrepProvider(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  const packages = context.approvalPackages.filter((item) => item.status !== "ready_for_review");
  return providerResult({
    sources: sourcesByType(context, ["approval_package", "approval", "document", "payment", "invoice", "work"]),
    facts: packages.map((item) =>
      fact(`director-prep:${item.id}`, `Director prep package ${item.id}: ${item.titleRu}; missing ${[...item.missingDocuments, ...item.missingData].join(", ") || "none"}.`, item.sourceRefs),
    ),
    missingData: packages.flatMap((item) => [
      ...(item.sourceRefs.length ? [] : [`Director prep package ${item.id}: source missing.`]),
      ...item.missingDocuments,
      ...item.missingData,
    ]),
  });
}

export function aiOfficeSourceSanitizer(context: OfficeDocumentControlContext): OfficeDataProviderResult {
  return providerResult({
    permissionLimited: (context.unsafeTechnicalSources ?? []).map((source) => `${source.type} hidden from office UI.`),
  });
}

export function aiOfficeAnswerComposer(_context: OfficeDocumentControlContext): OfficeDataProviderResult {
  return providerResult({
    facts: [fact("office:composer", "Office answer is read-only or draft-only; data is unchanged and final actions are forbidden.")],
  });
}

export const OFFICE_DATA_PROVIDER_FUNCTIONS: Record<
  OfficeProviderKey,
  (context: OfficeDocumentControlContext) => OfficeDataProviderResult
> = {
  aiOfficeSourceSanitizer,
  aiOfficeScreenContextProvider,
  aiOfficeTasksProvider,
  aiOfficeDocumentsQueueProvider,
  aiOfficeApprovalPackagesProvider,
  aiOfficeRemindersProvider,
  aiOfficeDeadlinesProvider,
  aiOfficeDocumentDetailProvider,
  aiOfficePaymentBlockersProvider,
  aiOfficeWorkCloseoutBlockersProvider,
  aiOfficeDirectorPrepProvider,
  aiOfficeAnswerComposer,
};
