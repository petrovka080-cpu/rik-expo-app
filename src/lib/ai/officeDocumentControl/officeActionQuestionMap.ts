import type {
  OfficeActionQuestion,
  OfficeDocumentControlIntent,
  OfficeDocumentControlScreenId,
} from "./officeDocumentControlTypes";

export const OFFICE_ACTION_QUESTION_MAP: readonly OfficeActionQuestion[] = [
  {
    screenId: "office.hub",
    actionId: "stuck_today",
    labelRu: "What is stuck today",
    concreteQuestionRu:
      "Show today's stuck office work: documents, approval packages, reminders, deadlines, payment blockers and work closeout blockers with sources.",
    requiredContext: ["period"],
    allowedSources: ["office_task", "document", "approval_package", "approval", "deadline", "reminder"],
    answerMode: "read",
  },
  {
    screenId: "office.documents_queue",
    actionId: "documents_to_process",
    labelRu: "Documents to process",
    concreteQuestionRu:
      "Show documents that need processing, linking review, signature review or evidence before payment, approval or work closeout.",
    requiredContext: ["period", "document"],
    allowedSources: ["document", "pdf_chunk", "act", "invoice", "report", "approval_package"],
    answerMode: "read",
  },
  {
    screenId: "office.documents_queue",
    actionId: "unlinked_documents",
    labelRu: "Unlinked PDFs",
    concreteQuestionRu:
      "Show PDFs or documents that are unlinked, why the link is missing and which owner must provide the source.",
    requiredContext: ["document"],
    allowedSources: ["document", "pdf_chunk", "approval_package", "payment", "work"],
    answerMode: "read",
  },
  {
    screenId: "office.approval_packages",
    actionId: "incomplete_approval_packages",
    labelRu: "Incomplete packages",
    concreteQuestionRu:
      "Show incomplete approval packages, missing documents, next owner and what blocks approval without changing approval status.",
    requiredContext: ["package"],
    allowedSources: ["approval_package", "approval", "document", "invoice", "payment", "work"],
    answerMode: "approval_route",
  },
  {
    screenId: "office.tasks",
    actionId: "next_owner",
    labelRu: "Next owner",
    concreteQuestionRu:
      "Show the next owner for stuck office work with source-backed reason, missing data and next step.",
    requiredContext: ["owner", "task"],
    allowedSources: ["office_task", "document", "approval_package", "deadline", "reminder"],
    answerMode: "read",
  },
  {
    screenId: "office.reminders",
    actionId: "reminder_draft",
    labelRu: "Prepare reminder",
    concreteQuestionRu:
      "Prepare reminder drafts for stuck work with owner, blocker, source and missing data, without sending the reminder final.",
    requiredContext: ["owner"],
    allowedSources: ["reminder", "office_task", "document", "approval_package", "deadline", "chat_message"],
    answerMode: "draft",
  },
  {
    screenId: "office.deadlines",
    actionId: "deadline_review",
    labelRu: "Deadlines",
    concreteQuestionRu:
      "Show overdue and due-today deadlines with owner, source, missing data and what each deadline blocks.",
    requiredContext: ["period"],
    allowedSources: ["deadline", "office_task", "document", "approval_package"],
    answerMode: "read",
  },
  {
    screenId: "office.hub",
    actionId: "payment_blockers",
    labelRu: "Payment blockers",
    concreteQuestionRu:
      "Show what blocks payment: missing documents, incomplete approval packages, unconfirmed warehouse evidence and next owner.",
    requiredContext: ["none"],
    allowedSources: ["payment", "invoice", "document", "approval_package", "approval", "warehouse_issue"],
    answerMode: "read",
  },
  {
    screenId: "office.hub",
    actionId: "work_closeout_blockers",
    labelRu: "Work closeout blockers",
    concreteQuestionRu:
      "Show what blocks work closeout: acts, signatures, reports and evidence, without closing work or signing documents.",
    requiredContext: ["none"],
    allowedSources: ["work", "act", "document", "report", "approval_package"],
    answerMode: "read",
  },
  {
    screenId: "office.approval_packages",
    actionId: "prepare_director_package",
    labelRu: "Prepare for director",
    concreteQuestionRu:
      "Prepare a director review package draft from office documents, approvals, blockers, missing data and sources.",
    requiredContext: ["package"],
    allowedSources: ["approval_package", "approval", "document", "payment", "invoice", "work"],
    answerMode: "draft",
  },
  {
    screenId: "office.document.detail",
    actionId: "document_detail",
    labelRu: "Document detail",
    concreteQuestionRu:
      "Explain the selected document detail, links, blockers, missing data and next step without linking it finally by AI.",
    requiredContext: ["document"],
    allowedSources: ["document", "pdf_chunk", "approval_package", "payment", "work", "act"],
    answerMode: "read",
  },
];

export function getOfficeActionQuestion(
  actionId: OfficeDocumentControlIntent,
  screenId: OfficeDocumentControlScreenId = "office.hub",
): OfficeActionQuestion | null {
  return (
    OFFICE_ACTION_QUESTION_MAP.find((item) => item.screenId === screenId && item.actionId === actionId) ??
    OFFICE_ACTION_QUESTION_MAP.find((item) => item.actionId === actionId) ??
    null
  );
}
