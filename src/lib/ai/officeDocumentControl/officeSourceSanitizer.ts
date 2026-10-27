import type {
  OfficeDocumentControlAnswer,
  OfficeDocumentControlContext,
  OfficeDocumentControlSourceRef,
  OfficeDocumentControlSourceType,
} from "./officeDocumentControlTypes";

const SAFE_SOURCE_TYPES: ReadonlySet<OfficeDocumentControlSourceType> = new Set([
  "office_task",
  "document",
  "pdf_chunk",
  "approval_package",
  "approval",
  "invoice",
  "payment",
  "work",
  "object",
  "report",
  "act",
  "warehouse_issue",
  "procurement_request",
  "chat_message",
  "deadline",
  "reminder",
  "safe_security_summary",
]);

function sanitizeSource(source: OfficeDocumentControlSourceRef): OfficeDocumentControlSourceRef | null {
  if (!source.id || !SAFE_SOURCE_TYPES.has(source.type)) return null;
  return {
    id: source.id,
    type: source.type,
    labelRu: source.labelRu,
    date: source.date,
    page: source.page,
  };
}

function keepRefs(refs: string[], safeIds: ReadonlySet<string>): string[] {
  return refs.filter((ref) => safeIds.has(ref));
}

export function officeHiddenTechnicalData(
  context: OfficeDocumentControlContext,
): OfficeDocumentControlAnswer["hiddenTechnicalData"] {
  return (context.unsafeTechnicalSources ?? []).map((source) => ({
    sourceType: source.type,
    reasonRu: "Hidden from office AI output; only safe business/document summaries are allowed.",
  }));
}

export function sanitizeOfficeContext(context: OfficeDocumentControlContext): OfficeDocumentControlContext {
  const sources = context.sources.map(sanitizeSource).filter((source): source is OfficeDocumentControlSourceRef => Boolean(source));
  const safeIds = new Set(sources.map((source) => source.id));

  return {
    ...context,
    sources,
    unsafeTechnicalSources: [],
    tasks: context.tasks.map((item) => ({ ...item, sourceRefs: keepRefs(item.sourceRefs, safeIds) })),
    documentsQueue: context.documentsQueue.map((item) => ({ ...item, sourceRefs: keepRefs(item.sourceRefs, safeIds) })),
    approvalPackages: context.approvalPackages.map((item) => ({ ...item, sourceRefs: keepRefs(item.sourceRefs, safeIds) })),
    reminders: context.reminders.map((item) => ({ ...item, sourceRefs: keepRefs(item.sourceRefs, safeIds), finalSent: false })),
    deadlines: context.deadlines.map((item) => ({ ...item, sourceRefs: keepRefs(item.sourceRefs, safeIds) })),
  };
}
