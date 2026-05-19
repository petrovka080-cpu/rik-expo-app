import type {
  WarehouseStockAnswer,
  WarehouseStockContext,
  WarehouseStockEvent,
  WarehouseStockIntent,
  WarehouseStockSourceType,
} from "./warehouseStockTypes";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function matchingIssueDeficit(context: WarehouseStockContext, materialId: string): number {
  const stock = context.stockItems.find((item) => item.materialId === materialId);
  const available = stock?.availableQty ?? 0;
  return context.issues
    .filter((issue) => issue.materialId === materialId)
    .reduce((sum, issue) => sum + Math.max(0, issue.requestedQty - issue.issuedQty - available), 0);
}

function eventForStock(context: WarehouseStockContext): WarehouseStockEvent[] {
  return context.stockItems.map((item) => {
    const deficit = matchingIssueDeficit(context, item.materialId);
    const sourceRefs = unique(item.sourceRefs);
    return {
      id: `stock:${item.id}`,
      eventType: deficit > 0 ? "material_blocker" : "stock_status",
      status: deficit > 0 ? "blocked" : "informational",
      materialId: item.materialId,
      materialNameRu: item.materialNameRu,
      objectId: item.objectId,
      objectNameRu: item.objectNameRu,
      workId: item.workId,
      workNameRu: item.workNameRu,
      quantity: item.availableQty,
      unit: item.unit,
      sourceRefs,
      riskLevel: deficit > 0 ? "high" : item.availableQty <= item.reservedQty ? "medium" : "low",
      riskReasonsRu: deficit > 0
        ? [`Deficit ${deficit} ${item.unit} blocks linked issue/work.`]
        : item.availableQty <= item.reservedQty
          ? ["Available quantity is not above reserved quantity."]
          : ["Stock row is source-backed and not blocking current issue."],
      missingData: [
        ...(item.specificationText ? [] : ["material_specification_missing" as const]),
        ...(item.objectId ? [] : ["object_link_missing" as const]),
        ...(item.workId ? [] : ["work_link_missing" as const]),
      ],
    };
  });
}

function eventForIncoming(context: WarehouseStockContext): WarehouseStockEvent[] {
  return context.incoming.map((item) => ({
    id: `incoming:${item.id}`,
    eventType: item.status === "disputed" ? "discrepancy" : "incoming_check",
    status: item.status === "accepted"
      ? "ready"
      : item.status === "disputed"
        ? "discrepancy"
        : item.status === "needs_documents"
          ? "needs_documents"
          : "informational",
    materialId: item.materialId,
    materialNameRu: item.materialNameRu,
    quantity: item.quantity,
    unit: item.unit,
    sourceRefs: unique([...item.sourceRefs, ...item.documentRefs]),
    riskLevel: item.status === "disputed" ? "high" : item.documentRefs.length === 0 ? "medium" : "low",
    riskReasonsRu: [
      ...(item.status === "disputed" ? ["Incoming row is disputed and must be reviewed by a human."] : []),
      ...(item.documentRefs.length === 0 ? ["Incoming document/certificate/waybill is missing."] : []),
      ...(item.status === "accepted" ? ["Incoming was already accepted by existing source, not by AI."] : []),
    ],
    missingData: [
      ...(item.documentRefs.length === 0 ? ["incoming_document_missing" as const] : []),
      ...(item.status === "disputed" ? ["approval_missing" as const] : []),
    ],
  }));
}

function eventForIssues(context: WarehouseStockContext): WarehouseStockEvent[] {
  return context.issues.map((item) => {
    const stock = context.stockItems.find((stockItem) => stockItem.materialId === item.materialId);
    const deficit = Math.max(0, item.requestedQty - item.issuedQty - (stock?.availableQty ?? 0));
    const needsApproval = item.status === "needs_approval" || deficit > 0;
    return {
      id: `issue:${item.id}`,
      eventType: needsApproval ? "approval_item" : "issue_readiness",
      status: deficit > 0 ? "blocked" : needsApproval ? "needs_approval" : item.status === "ready_for_pick" ? "ready" : "informational",
      materialId: item.materialId,
      materialNameRu: item.materialNameRu,
      objectId: item.objectId,
      objectNameRu: item.objectNameRu,
      workId: item.workId,
      workNameRu: item.workNameRu,
      quantity: item.requestedQty,
      unit: item.unit,
      sourceRefs: unique([...item.sourceRefs, ...(stock?.sourceRefs ?? [])]),
      riskLevel: deficit > 0 ? "critical" : needsApproval ? "high" : "low",
      riskReasonsRu: [
        ...(deficit > 0 ? [`Deficit ${deficit} ${item.unit}; issue cannot be executed by AI.`] : []),
        ...(item.status === "needs_approval" ? ["Issue requires approval route."] : []),
        ...(item.objectId ? [] : ["Issue has no linked object."]),
        ...(item.workId ? [] : ["Issue has no linked work."]),
      ],
      missingData: [
        ...(deficit > 0 ? ["stock_source_missing" as const] : []),
        ...(item.objectId ? [] : ["object_link_missing" as const]),
        ...(item.workId ? [] : ["work_link_missing" as const]),
        ...(item.requestId ? [] : ["procurement_request_missing" as const]),
        ...(needsApproval ? ["approval_missing" as const] : []),
      ],
    };
  });
}

function answerKindForIntent(intent: WarehouseStockIntent): WarehouseStockAnswer["answerKind"] {
  if (intent === "incoming_readiness" || intent === "incoming_discrepancy_check") return "incoming_review";
  if (intent === "issue_readiness_check" || intent === "what_to_issue_by_object") return "issue_readiness";
  if (intent === "procurement_handoff" || intent === "foreman_handoff" || intent === "document_request_draft") return "handoff_draft";
  if (intent === "approval_route") return "approval_route";
  if (intent === "inventory_reconciliation") return "discrepancy_check";
  return "stock_review";
}

function safeSourceType(type: string): WarehouseStockSourceType {
  if (type === "warehouse_stock") return "warehouse_stock";
  if (type === "procurement_request") return "procurement_request";
  if (type === "work" || type === "object" || type === "zone" || type === "material" || type === "approval" || type === "chat_message") return type;
  if (type === "specification" || type === "project_pdf" || type === "engineering_pdf" || type === "estimate_pdf" || type === "boq" || type === "act" || type === "report" || type === "photo") return "document";
  return "document";
}

function composeAnswerText(params: {
  context: WarehouseStockContext;
  intent: WarehouseStockIntent;
  shortAnswerRu: string;
  events: WarehouseStockEvent[];
  missingData: string[];
  sourceTrace: string[];
  nextStepRu: string;
}): string {
  const materials = params.context.stockItems.map((item) =>
    `- ${item.materialNameRu}: available ${item.availableQty} ${item.unit}, reserved ${item.reservedQty}, incoming ${item.incomingQty}.`,
  );
  const issues = params.context.issues.map((item) =>
    `- ${item.materialNameRu}: requested ${item.requestedQty} ${item.unit}, issued ${item.issuedQty}, status ${item.status}.`,
  );
  const incoming = params.context.incoming.map((item) =>
    `- ${item.materialNameRu}: incoming ${item.quantity} ${item.unit}, status ${item.status}.`,
  );
  return [
    "Answer",
    "",
    "Short:",
    params.shortAnswerRu,
    "",
    "Period:",
    "today / current warehouse screen",
    "",
    "Materials:",
    ...(materials.length ? materials : ["- No source-backed material rows found."]),
    "",
    "Incoming / issue:",
    ...(incoming.length ? incoming : ["- No incoming rows found."]),
    ...(issues.length ? issues : ["- No issue rows found."]),
    "",
    "Missing data:",
    ...(params.missingData.length ? params.missingData.map((item) => `- ${item}`) : ["- No blocking missing data in available sources."]),
    "",
    "Sources:",
    ...(params.sourceTrace.length ? params.sourceTrace.map((item) => `- ${item}`) : ["- Exact source is missing; no project fact was invented."]),
    "",
    "Next step:",
    params.nextStepRu,
    "",
    "Status:",
    params.intent === "approval_route"
      ? "Stock unchanged. Approval route draft prepared; automatic approval was not executed."
      : "Stock unchanged. No receive, issue, reservation or write-off was executed.",
  ].join("\n");
}

export function composeWarehouseStockAnswer(params: {
  context: WarehouseStockContext;
  intent: WarehouseStockIntent;
  questionRu: string;
  providerTrace: string[];
  missingData: string[];
  hiddenByPermission?: { sourceType: string; reasonRu: string }[];
}): WarehouseStockAnswer {
  const events = [...eventForStock(params.context), ...eventForIncoming(params.context), ...eventForIssues(params.context)];
  const sourceTrace = unique([
    ...params.context.sources.map((source) => source.id),
    ...params.context.stockItems.flatMap((item) => item.sourceRefs),
    ...params.context.incoming.flatMap((item) => [...item.sourceRefs, ...item.documentRefs]),
    ...params.context.issues.flatMap((item) => item.sourceRefs),
  ]);
  const allMissing = unique([
    ...params.missingData,
    ...events.flatMap((event) => event.missingData),
    ...(params.context.stockItems.length || params.context.incoming.length || params.context.issues.length
      ? []
      : ["No warehouse stock/incoming/issue source is available."]),
  ]);
  const blockedIssues = params.context.issues.filter((issue) => issue.status === "blocked" || issue.status === "needs_approval").length;
  const criticalMaterials = events.filter((event) => event.riskLevel === "critical" || event.riskLevel === "high").length;
  const shortAnswerRu = events.length
    ? `Found ${params.context.stockItems.length} stock rows, ${params.context.incoming.length} incoming rows and ${params.context.issues.length} issue rows; ${blockedIssues} issue(s) need review.`
    : "No source-backed warehouse rows were found; answer is limited to exact missing-data reasons.";
  const nextStepRu =
    params.intent === "procurement_handoff"
      ? "Prepare a buyer handoff draft for the deficit; do not create a purchase request directly."
      : params.intent === "foreman_handoff"
        ? "Prepare a foreman message draft about material blockers; do not change work status."
        : params.intent === "approval_route"
          ? "Send disputed stock event to approval ledger for human decision."
          : "Review source-backed stock, documents and blockers before any human warehouse action.";

  return {
    screenId: params.context.screenId,
    role: "warehouse",
    questionRu: params.questionRu,
    intent: params.intent,
    answerKind: events.length ? answerKindForIntent(params.intent) : "exact_no_data_reason",
    titleRu: "Warehouse stock intelligence",
    shortAnswerRu,
    period: { labelRu: "today / current warehouse screen" },
    events,
    stockSummary: {
      totalItems: params.context.stockItems.length,
      availableQty: params.context.stockItems.reduce((sum, item) => sum + item.availableQty, 0),
      reservedQty: params.context.stockItems.reduce((sum, item) => sum + item.reservedQty, 0),
      incomingQty: params.context.stockItems.reduce((sum, item) => sum + item.incomingQty, 0),
      blockedIssues,
      criticalMaterials,
    },
    discrepancies: events
      .filter((event) => event.status === "discrepancy" || event.status === "blocked")
      .map((event) => ({
        eventId: event.id,
        reasonRu: event.riskReasonsRu.join("; ") || "Discrepancy requires human review.",
        sourceRefs: event.sourceRefs,
      })),
    risks: events.flatMap((event) =>
      event.riskReasonsRu.map((reasonRu) => ({
        eventId: event.id,
        level: event.riskLevel,
        reasonRu,
        sourceRefs: event.sourceRefs,
      })),
    ),
    sources: params.context.sources.map((source) => ({
      id: source.id,
      type: safeSourceType(source.type),
      labelRu: source.labelRu,
      page: source.page,
    })),
    missingData: allMissing,
    hiddenByPermission: params.hiddenByPermission ?? [],
    nextStepRu,
    answerRu: composeAnswerText({
      context: params.context,
      intent: params.intent,
      shortAnswerRu,
      events,
      missingData: allMissing,
      sourceTrace,
      nextStepRu,
    }),
    sourceTrace,
    providerTrace: params.providerTrace,
    changedData: false,
    stockMutated: false,
    incomingAccepted: false,
    issueExecuted: false,
    writeoffCreated: false,
    reservationCreated: false,
    autoApproval: false,
    fakeStockCreated: false,
    fakeIncomingCreated: false,
    fakeIssueCreated: false,
    fakeDocumentCreated: false,
    genericAnswerUsed: false,
  };
}
