import type {
  OfficeDocumentControlIntent,
  OfficeDocumentControlSourceType,
  OfficeIntentContract,
} from "./officeDocumentControlTypes";

const ALL_OFFICE_SOURCES: OfficeDocumentControlSourceType[] = [
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
];

function contract(
  intent: OfficeDocumentControlIntent,
  examplesRu: string[],
  requiredContext: OfficeIntentContract["requiredContext"],
  allowedSources: OfficeDocumentControlSourceType[],
  answerMode: OfficeIntentContract["answerMode"] = "read",
): OfficeIntentContract {
  return { intent, examplesRu, requiredContext, allowedSources, answerMode };
}

export const OFFICE_INTENT_CONTRACTS: readonly OfficeIntentContract[] = [
  contract("stuck_today", ["what is stuck today", "office stuck today"], "period", ALL_OFFICE_SOURCES),
  contract("documents_to_process", ["which documents need processing", "documents queue"], "period", ["document", "pdf_chunk", "act", "invoice", "report", "approval_package"]),
  contract("unlinked_documents", ["which pdfs are unlinked", "unlinked documents"], "document", ["document", "pdf_chunk", "approval_package", "payment", "work"]),
  contract("incomplete_approval_packages", ["which approval packages are incomplete", "approval package gaps"], "package", ["approval_package", "approval", "document", "invoice", "payment", "work"]),
  contract("next_owner", ["who is next owner", "who should act next"], "owner", ALL_OFFICE_SOURCES),
  contract("reminder_draft", ["whom to remind", "prepare reminder"], "owner", ["reminder", "office_task", "document", "approval_package", "deadline", "chat_message"], "draft"),
  contract("deadline_review", ["what is overdue", "deadlines"], "period", ["deadline", "office_task", "document", "approval_package"]),
  contract("payment_blockers", ["what blocks payment", "payment blocker"], "none", ["payment", "invoice", "document", "approval_package", "approval", "warehouse_issue"]),
  contract("work_closeout_blockers", ["what blocks work closeout", "acts without signature"], "none", ["work", "act", "document", "report", "approval_package"]),
  contract("prepare_director_package", ["what to prepare for director", "director package"], "package", ["approval_package", "approval", "document", "payment", "invoice", "work"], "draft"),
  contract("document_detail", ["document detail", "selected document"], "document", ["document", "pdf_chunk", "approval_package", "payment", "work", "act"]),
];

const INTENT_BY_NAME = new Map(OFFICE_INTENT_CONTRACTS.map((item) => [item.intent, item]));

export function getOfficeIntentContract(intent: OfficeDocumentControlIntent): OfficeIntentContract {
  return INTENT_BY_NAME.get(intent) ?? OFFICE_INTENT_CONTRACTS[0]!;
}

export function routeOfficeIntent(questionRu: string): OfficeIntentContract {
  const q = questionRu.toLowerCase();
  if (q.includes("director") || q.includes("prepare for director")) return getOfficeIntentContract("prepare_director_package");
  if (q.includes("payment") || q.includes("pay") || q.includes("invoice")) return getOfficeIntentContract("payment_blockers");
  if (q.includes("closeout") || q.includes("work close") || q.includes("act") || q.includes("signature")) return getOfficeIntentContract("work_closeout_blockers");
  if (q.includes("approval package") || q.includes("package")) return getOfficeIntentContract("incomplete_approval_packages");
  if (q.includes("unlinked") || q.includes("pdf")) return getOfficeIntentContract("unlinked_documents");
  if (q.includes("detail") || q.includes("selected")) return getOfficeIntentContract("document_detail");
  if (q.includes("document") || q.includes("documents")) return getOfficeIntentContract("documents_to_process");
  if (q.includes("remind") || q.includes("reminder")) return getOfficeIntentContract("reminder_draft");
  if (q.includes("deadline") || q.includes("overdue") || q.includes("due")) return getOfficeIntentContract("deadline_review");
  if (q.includes("owner") || q.includes("who")) return getOfficeIntentContract("next_owner");
  return getOfficeIntentContract("stuck_today");
}
