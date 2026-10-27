import type {
  OfficeAnswerKind,
  OfficeAnswerStatus,
  OfficeDeadlineItem,
  OfficeDocumentControlAnswer,
  OfficeDocumentControlContext,
  OfficeDocumentControlIntent,
  OfficeDocumentControlSourceRef,
  OfficeDocumentQueueItem,
  OfficeOwnerRole,
  OfficeStuckItem,
} from "./officeDocumentControlTypes";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function riskRank(value: OfficeStuckItem["riskLevel"]): number {
  if (value === "critical") return 4;
  if (value === "high") return 3;
  if (value === "medium") return 2;
  return 1;
}

function validSourceRefs(context: OfficeDocumentControlContext, sourceRefs: string[]): string[] {
  const safeIds = new Set(context.sources.map((source) => source.id));
  return sourceRefs.filter((sourceRef) => safeIds.has(sourceRef));
}

function ownerOrMissing(owner?: OfficeOwnerRole): OfficeOwnerRole | "missing_owner" {
  return owner ?? "missing_owner";
}

function sourceBacked(context: OfficeDocumentControlContext, sourceRefs: string[]): boolean {
  return validSourceRefs(context, sourceRefs).length > 0;
}

function sourceMissingData(label: string, id: string, sourceRefs: string[]): string[] {
  return sourceRefs.length ? [] : [`${label} ${id}: source missing; item is not treated as confirmed stuck work.`];
}

function statusForDocument(item: OfficeDocumentQueueItem): OfficeAnswerStatus {
  if (item.status === "ready_for_review") return "approval_required";
  return "data_unchanged";
}

function statusLabel(status: OfficeAnswerStatus): string {
  if (status === "draft_prepared") return "draft prepared";
  if (status === "approval_required") return "approval required";
  return "data unchanged";
}

function riskForDocument(item: OfficeDocumentQueueItem): OfficeStuckItem["riskLevel"] {
  if (item.status === "missing" || item.status === "blocked") return "high";
  if (item.blocks.includes("payment") || item.blocks.includes("work_closeout")) return "high";
  if (item.status === "unlinked" || item.status === "needs_signature") return "medium";
  return "low";
}

function riskForDeadline(item: OfficeDeadlineItem): OfficeStuckItem["riskLevel"] {
  if (item.status === "overdue") return "high";
  if (item.status === "blocked") return "high";
  if (item.status === "due_today") return "medium";
  return "low";
}

function buildTaskItems(context: OfficeDocumentControlContext): OfficeStuckItem[] {
  return context.tasks
    .filter((item) => item.status !== "pending" || (item.overdueDays ?? 0) > 0 || item.missingData.length > 0)
    .filter((item) => sourceBacked(context, item.sourceRefs))
    .map((item) => ({
      id: `task:${item.id}`,
      itemType: "task",
      titleRu: item.titleRu,
      whyStuckRu: item.whyStuckRu ?? `Office task status is ${item.status}.`,
      ownerRole: ownerOrMissing(item.nextOwnerRole ?? item.ownerRole),
      missingData: [
        ...sourceMissingData("Office task", item.id, validSourceRefs(context, item.sourceRefs)),
        ...(item.ownerRole || item.nextOwnerRole ? [] : [`Office task ${item.id}: owner role missing.`]),
        ...item.missingData,
      ],
      sourceRefs: validSourceRefs(context, item.sourceRefs),
      blocks: ["director_package"],
      nextStepRu: item.nextOwnerRole
        ? `Ask ${item.nextOwnerRole} to provide the missing office evidence.`
        : "Assign a human owner before any reminder or closeout.",
      status: "data_unchanged",
      riskLevel: item.status === "overdue" ? "high" : "medium",
    }));
}

function buildDocumentItems(context: OfficeDocumentControlContext): OfficeStuckItem[] {
  return context.documentsQueue
    .filter((item) => item.status !== "ready_for_review" || item.blocks.length > 0)
    .filter((item) => sourceBacked(context, item.sourceRefs))
    .map((item) => ({
      id: `document:${item.id}`,
      itemType: "document",
      titleRu: item.titleRu,
      whyStuckRu: `Document status is ${item.status}; blocks ${item.blocks.join(", ") || "review"}.`,
      ownerRole: ownerOrMissing(item.ownerRole),
      missingData: [
        ...(item.ownerRole ? [] : [`Document ${item.id}: owner role missing.`]),
        ...item.missingData,
      ],
      sourceRefs: validSourceRefs(context, item.sourceRefs),
      blocks: [...item.blocks],
      nextStepRu: item.status === "unlinked"
        ? "Prepare a link-review note for a human owner; do not link the document finally by AI."
        : "Request the missing document evidence from the owner.",
      status: statusForDocument(item),
      riskLevel: riskForDocument(item),
    }));
}

function buildApprovalPackageItems(context: OfficeDocumentControlContext): OfficeStuckItem[] {
  return context.approvalPackages
    .filter((item) => item.status !== "ready_for_review")
    .filter((item) => sourceBacked(context, item.sourceRefs))
    .map((item) => ({
      id: `approval_package:${item.id}`,
      itemType: "approval_package",
      titleRu: item.titleRu,
      whyStuckRu: `Approval package status is ${item.status}; missing documents ${item.missingDocuments.join(", ") || "none"}.`,
      ownerRole: ownerOrMissing(item.ownerRole),
      missingData: [
        ...(item.ownerRole ? [] : [`Approval package ${item.id}: owner role missing.`]),
        ...item.missingDocuments.map((missing) => `Missing document: ${missing}`),
        ...item.missingData,
      ],
      sourceRefs: validSourceRefs(context, item.sourceRefs),
      blocks: ["approval", ...(item.linkedPaymentId ? ["payment" as const] : []), ...(item.linkedWorkId ? ["work_closeout" as const] : [])],
      nextStepRu: item.status === "pending_director"
        ? "Open the approval route for human director review without changing approval status."
        : "Prepare the package checklist and request missing documents from the owner.",
      status: item.status === "pending_director" || item.status === "ready_for_review" ? "approval_required" : "data_unchanged",
      riskLevel: item.missingDocuments.length ? "high" : "medium",
    }));
}

function buildReminderItems(context: OfficeDocumentControlContext): OfficeStuckItem[] {
  return context.reminders
    .filter((item) => sourceBacked(context, item.sourceRefs))
    .map((item) => ({
      id: `reminder:${item.id}`,
      itemType: "reminder",
      titleRu: `Reminder draft for ${item.targetLabelRu}`,
      whyStuckRu: item.reasonRu,
      ownerRole: ownerOrMissing(item.targetRole),
      missingData: item.targetRole ? [] : [`Reminder ${item.id}: target owner missing.`],
      sourceRefs: validSourceRefs(context, item.sourceRefs),
      blocks: [...item.blocks],
      nextStepRu: "Review the reminder draft and send manually; AI does not send final reminders.",
      status: "draft_prepared",
      riskLevel: item.status === "blocked" ? "high" : "medium",
    }));
}

function buildDeadlineItems(context: OfficeDocumentControlContext): OfficeStuckItem[] {
  return context.deadlines
    .filter((item) => item.status !== "upcoming" || item.missingData.length > 0)
    .filter((item) => sourceBacked(context, item.sourceRefs))
    .map((item) => ({
      id: `deadline:${item.id}`,
      itemType: "deadline",
      titleRu: item.titleRu,
      whyStuckRu: `Deadline status is ${item.status}; due ${item.dueAt ?? "missing_due_date"}.`,
      ownerRole: ownerOrMissing(item.ownerRole),
      missingData: [
        ...(item.ownerRole ? [] : [`Deadline ${item.id}: owner role missing.`]),
        ...(item.dueAt ? [] : [`Deadline ${item.id}: due date missing.`]),
        ...item.missingData,
      ],
      sourceRefs: validSourceRefs(context, item.sourceRefs),
      blocks: item.linkedItemType === "payment" ? ["payment"] : item.linkedItemType === "work" ? ["work_closeout"] : ["director_package"],
      nextStepRu: item.ownerRole
        ? `Ask ${item.ownerRole} to clear the deadline blocker or provide missing evidence.`
        : "Assign a human owner before drafting a reminder.",
      status: "data_unchanged",
      riskLevel: riskForDeadline(item),
    }));
}

export function buildOfficeStuckItems(context: OfficeDocumentControlContext): OfficeStuckItem[] {
  return [
    ...buildTaskItems(context),
    ...buildDocumentItems(context),
    ...buildApprovalPackageItems(context),
    ...buildReminderItems(context),
    ...buildDeadlineItems(context),
  ].sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel));
}

function answerKindForIntent(intent: OfficeDocumentControlIntent, items: OfficeStuckItem[]): OfficeAnswerKind {
  if (items.length === 0) return "exact_no_data_reason";
  if (intent === "documents_to_process" || intent === "unlinked_documents") return "document_queue";
  if (intent === "incomplete_approval_packages") return "approval_package_review";
  if (intent === "reminder_draft") return "reminder_draft";
  if (intent === "deadline_review") return "deadline_review";
  if (intent === "payment_blockers" || intent === "work_closeout_blockers") return "blocker_report";
  if (intent === "prepare_director_package") return "director_prep";
  if (intent === "document_detail") return "document_detail";
  return "stuck_work_queue";
}

function sourceList(context: OfficeDocumentControlContext, items: OfficeStuckItem[]): OfficeDocumentControlSourceRef[] {
  const ids = new Set(items.flatMap((item) => item.sourceRefs));
  return context.sources.filter((source) => ids.has(source.id));
}

function statusForIntent(intent: OfficeDocumentControlIntent, items: OfficeStuckItem[]): OfficeAnswerStatus {
  if (intent === "reminder_draft" || intent === "prepare_director_package") return "draft_prepared";
  if (items.some((item) => item.status === "approval_required")) return "approval_required";
  return "data_unchanged";
}

function exactReason(context: OfficeDocumentControlContext, items: OfficeStuckItem[]): string | undefined {
  if (context.period?.labelRu) return undefined;
  if (items.length === 0) return "No source-backed office stuck work was found in the provided read-only context.";
  return "Period is missing; answer is limited to exact source-backed items from the current context.";
}

function buildAnswerText(params: {
  context: OfficeDocumentControlContext;
  items: OfficeStuckItem[];
  missingData: string[];
  sources: OfficeDocumentControlSourceRef[];
  nextStepRu: string;
  status: OfficeAnswerStatus;
  exactReasonRu?: string;
}): string {
  const top = params.items[0];
  const periodOrReason = params.context.period?.labelRu ?? params.exactReasonRu ?? "exact reason unavailable";
  const itemLines = params.items.slice(0, 8).flatMap((item) => [
    `- Item: ${item.titleRu}`,
    `  Why stuck: ${item.whyStuckRu}`,
    `  Owner role: ${item.ownerRole}`,
    `  Missing data: ${item.missingData.length ? item.missingData.join("; ") : "none critical in current source trace"}`,
    `  Sources: ${item.sourceRefs.join(", ")}`,
    `  Next step: ${item.nextStepRu}`,
    `  Status: ${statusLabel(item.status)}`,
  ]);

  return [
    "Office document-control answer",
    "",
    `Period or exact reason: ${periodOrReason}`,
    top ? `Top stuck item: ${top.titleRu}` : "Top stuck item: none from source-backed context",
    top ? `Why stuck: ${top.whyStuckRu}` : "Why stuck: no source-backed stuck item was provided",
    top ? `Owner role: ${top.ownerRole}` : "Owner role: missing_owner",
    "",
    "Queue:",
    ...(itemLines.length ? itemLines : ["- No source-backed stuck work."]),
    "",
    "Sources:",
    ...(params.sources.length
      ? params.sources.slice(0, 12).map((source) => `- ${source.type}: ${source.labelRu}`)
      : ["- exact reason: no safe business/document sources found"]),
    "",
    "Missing data:",
    ...(params.missingData.length ? params.missingData.slice(0, 12).map((item) => `- ${item}`) : ["- none critical in current source trace"]),
    "",
    `Next step: ${params.nextStepRu}`,
    `Status: ${statusLabel(params.status)}`,
    "Data unchanged. Drafts require human review. Approval remains human-controlled.",
  ].join("\n");
}

function collectSourceProblems(context: OfficeDocumentControlContext): string[] {
  return [
    ...context.tasks.flatMap((item) => sourceMissingData("Office task", item.id, item.sourceRefs)),
    ...context.documentsQueue.flatMap((item) => sourceMissingData("Document", item.id, item.sourceRefs)),
    ...context.approvalPackages.flatMap((item) => sourceMissingData("Approval package", item.id, item.sourceRefs)),
    ...context.reminders.flatMap((item) => sourceMissingData("Reminder", item.id, item.sourceRefs)),
    ...context.deadlines.flatMap((item) => sourceMissingData("Deadline", item.id, item.sourceRefs)),
  ];
}

export function composeOfficeDocumentControlAnswer(params: {
  context: OfficeDocumentControlContext;
  intent: OfficeDocumentControlIntent;
  questionRu: string;
  providerTrace: string[];
  missingData: string[];
  hiddenTechnicalData: OfficeDocumentControlAnswer["hiddenTechnicalData"];
}): OfficeDocumentControlAnswer {
  const stuckItems = buildOfficeStuckItems(params.context);
  const sources = sourceList(params.context, stuckItems);
  const missingData = unique([
    ...params.missingData,
    ...collectSourceProblems(params.context),
    ...stuckItems.flatMap((item) => item.missingData),
    ...(params.context.period?.labelRu ? [] : ["Period missing; answer uses exact source-backed context only."]),
  ]);
  const status = statusForIntent(params.intent, stuckItems);
  const nextStepRu = status === "draft_prepared"
    ? "Review the prepared draft and send or approve manually; AI does not perform the final action."
    : stuckItems[0]?.nextStepRu ?? "Provide source-backed office documents, packages, owners or deadlines before acting.";
  const exactReasonRu = exactReason(params.context, stuckItems);
  const answerRu = buildAnswerText({
    context: params.context,
    items: stuckItems,
    missingData,
    sources,
    nextStepRu,
    status,
    exactReasonRu,
  });
  const documentsToProcess = stuckItems.filter((item) => item.itemType === "document");
  const approvalPackages = stuckItems.filter((item) => item.itemType === "approval_package");
  const reminders = stuckItems.filter((item) => item.itemType === "reminder");
  const deadlines = stuckItems.filter((item) => item.itemType === "deadline");

  return {
    screenId: params.context.screenId,
    role: "office",
    questionRu: params.questionRu,
    answerKind: answerKindForIntent(params.intent, stuckItems),
    titleRu: "Office document control",
    shortAnswerRu: stuckItems[0]
      ? `Top stuck item: ${stuckItems[0].titleRu}. Sources: ${stuckItems[0].sourceRefs.join(", ")}.`
      : "No source-backed stuck work; exact reason returned.",
    period: params.context.period,
    exactReasonRu,
    stuckItems,
    documentsToProcess,
    approvalPackages,
    reminders,
    deadlines,
    paymentBlockers: stuckItems.filter((item) => item.blocks.includes("payment")),
    workCloseoutBlockers: stuckItems.filter((item) => item.blocks.includes("work_closeout")),
    sources,
    missingData,
    hiddenTechnicalData: params.hiddenTechnicalData,
    nextStepRu,
    status,
    changedData: false,
    reminderSentFinal: false,
    documentLinkedByAi: false,
    taskClosedByAi: false,
    approvalStatusChangedByAi: false,
    paymentMutated: false,
    workClosedByAi: false,
    signedByAi: false,
    answerRu,
    sourceTrace: unique(sources.map((source) => source.id)),
    providerTrace: params.providerTrace,
    genericAnswerUsed: false,
    fakeDocumentCreated: false,
    fakeDeadlineCreated: false,
    fakeOwnerCreated: false,
    rawRuntimeVisible: false,
    rawSecretsVisible: false,
    serviceRoleVisible: false,
    providerPayloadVisible: false,
  };
}
