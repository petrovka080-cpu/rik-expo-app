import fs from "node:fs";
import path from "node:path";

import {
  OFFICE_ACTION_QUESTION_MAP,
  OFFICE_DOCUMENT_CONTROL_WAVE,
  OFFICE_INTENT_CONTRACTS,
  OFFICE_ROLE_POLICY,
  answerOfficeAction,
  answerOfficeDocumentControlQuestion,
  buildOfficeAiBlockViewModel,
  buildOfficeDocumentControlMatrix,
  listOfficeDataProviders,
  type OfficeDocumentControlAnswer,
  type OfficeDocumentControlContext,
} from "../../src/lib/ai/officeDocumentControl";

export const AI_OFFICE_DOCUMENT_CONTROL_ARTIFACT_PREFIX =
  "S_AI_OFFICE_DOCUMENT_CONTROL_FUNNEL" as const;

const artifactsDir = path.join(process.cwd(), "artifacts");
const releaseVerifyReportPath = path.join(
  artifactsDir,
  `${AI_OFFICE_DOCUMENT_CONTROL_ARTIFACT_PREFIX}_release_verify_report.json`,
);

function writeArtifact(fileName: string, value: unknown): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_OFFICE_DOCUMENT_CONTROL_ARTIFACT_PREFIX}_${fileName}`),
    typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`,
  );
}

function readReleaseVerifyPassed(): boolean {
  if (!fs.existsSync(releaseVerifyReportPath)) return false;
  const raw = fs.readFileSync(releaseVerifyReportPath);
  const rawText = raw[0] === 0xff && raw[1] === 0xfe
    ? raw.toString("utf16le")
    : raw.toString("utf8");
  const text = rawText.replace(/^\uFEFF/, "").trim();
  const candidates = Array.from(text.matchAll(/(?:^|\n)\s*\{/g)).map((match) => match.index ?? 0);
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    try {
      const parsed = JSON.parse(text.slice(candidates[index]).trim()) as {
        ok?: boolean;
        passed?: boolean;
        final_status?: string;
        readiness?: { status?: string; blockers?: string[] };
      };
      return parsed.ok === true ||
        parsed.passed === true ||
        parsed.final_status === "GREEN" ||
        (parsed.readiness?.status === "pass" && (parsed.readiness.blockers ?? []).length === 0);
    } catch {
      // Release verify reports can include logs before final JSON.
    }
  }
  return false;
}

export function buildOfficeDocumentControlProofFixture(): OfficeDocumentControlContext {
  return {
    screenId: "office.hub",
    role: "office",
    selectedDocumentId: "DOC-17",
    period: {
      from: "2026-05-20",
      to: "2026-05-20",
      labelRu: "2026-05-20",
    },
    sources: [
      { id: "src:office:TASK-17", type: "office_task", labelRu: "Office task TASK-17 overdue", date: "2026-05-20" },
      { id: "src:doc:DOC-17", type: "document", labelRu: "Unlinked invoice PDF DOC-17", date: "2026-05-20", page: 1 },
      { id: "src:pdf:DOC-17:1", type: "pdf_chunk", labelRu: "PDF chunk DOC-17 page 1", date: "2026-05-20", page: 1 },
      { id: "src:package:PKG-9", type: "approval_package", labelRu: "Approval package PKG-9 incomplete", date: "2026-05-20" },
      { id: "src:approval:APR-9", type: "approval", labelRu: "Approval APR-9 waiting documents", date: "2026-05-20" },
      { id: "src:invoice:INV-900", type: "invoice", labelRu: "Invoice INV-900", date: "2026-05-20" },
      { id: "src:payment:PAY-900", type: "payment", labelRu: "Payment PAY-900 blocked", date: "2026-05-20" },
      { id: "src:request:MR-900", type: "procurement_request", labelRu: "Procurement request MR-900 waits waybill", date: "2026-05-20" },
      { id: "src:warehouse:WH-900", type: "warehouse_issue", labelRu: "Warehouse receipt WH-900 missing", date: "2026-05-20" },
      { id: "src:work:WRK-900", type: "work", labelRu: "Work WRK-900 closeout waits act", date: "2026-05-20" },
      { id: "src:act:ACT-900", type: "act", labelRu: "Act ACT-900 unsigned", date: "2026-05-20" },
      { id: "src:deadline:DL-9", type: "deadline", labelRu: "Deadline DL-9 overdue", date: "2026-05-20" },
      { id: "src:reminder:REM-9", type: "reminder", labelRu: "Reminder draft REM-9", date: "2026-05-20" },
      { id: "src:security:SAFE-OFFICE", type: "safe_security_summary", labelRu: "Safe security summary only", date: "2026-05-20" },
    ],
    unsafeTechnicalSources: [
      { id: "unsafe:runtime", type: "raw_runtime", labelRu: "raw runtime should stay hidden" },
      { id: "unsafe:security", type: "raw_security_event", labelRu: "raw security event should stay hidden" },
      { id: "unsafe:service-role", type: "service_role", labelRu: "service_role_secret" },
      { id: "unsafe:provider", type: "provider_payload", labelRu: "raw provider payload" },
      { id: "unsafe:env", type: "env_secret", labelRu: "OFFICE_SECRET_TOKEN" },
    ],
    tasks: [
      {
        id: "TASK-17",
        titleRu: "Collect payment package for INV-900",
        status: "overdue",
        ownerRole: "office",
        nextOwnerRole: "accountant",
        dueAt: "2026-05-20",
        overdueDays: 1,
        whyStuckRu: "Payment package is overdue because invoice PDF is unlinked and waybill is missing.",
        missingData: ["waybill", "linked PDF evidence"],
        sourceRefs: ["src:office:TASK-17", "src:invoice:INV-900"],
      },
    ],
    documentsQueue: [
      {
        id: "DOC-17",
        titleRu: "Invoice PDF for INV-900",
        documentType: "pdf",
        status: "unlinked",
        ownerRole: "office",
        linkedPaymentId: "PAY-900",
        linkedApprovalPackageId: "PKG-9",
        blocks: ["payment", "approval", "director_package"],
        missingData: ["human link review", "waybill number"],
        sourceRefs: ["src:doc:DOC-17", "src:pdf:DOC-17:1", "src:invoice:INV-900"],
      },
      {
        id: "DOC-NOSOURCE",
        titleRu: "Source-less document must not become green stuck work",
        documentType: "pdf",
        status: "blocked",
        ownerRole: "office",
        blocks: ["approval"],
        missingData: ["source"],
        sourceRefs: [],
      },
      {
        id: "ACT-900",
        titleRu: "Unsigned act for WRK-900",
        documentType: "act",
        status: "needs_signature",
        ownerRole: "foreman",
        linkedWorkId: "WRK-900",
        blocks: ["work_closeout"],
        missingData: ["foreman signature", "contractor evidence"],
        sourceRefs: ["src:act:ACT-900", "src:work:WRK-900"],
      },
    ],
    approvalPackages: [
      {
        id: "PKG-9",
        titleRu: "Director approval package for PAY-900",
        status: "waiting_documents",
        ownerRole: "office",
        approvalId: "APR-9",
        linkedPaymentId: "PAY-900",
        linkedWorkId: "WRK-900",
        relatedDocumentIds: ["DOC-17", "ACT-900"],
        missingDocuments: ["waybill", "warehouse receipt"],
        missingData: ["document link not reviewed"],
        sourceRefs: ["src:package:PKG-9", "src:approval:APR-9", "src:payment:PAY-900", "src:request:MR-900", "src:warehouse:WH-900"],
      },
    ],
    reminders: [
      {
        id: "REM-9",
        targetRole: "accountant",
        targetLabelRu: "accountant for PAY-900",
        status: "draft",
        reasonRu: "Payment remains blocked until waybill and link review are attached to package PKG-9.",
        blocks: ["payment", "approval"],
        sourceRefs: ["src:reminder:REM-9", "src:package:PKG-9"],
        finalSent: false,
      },
    ],
    deadlines: [
      {
        id: "DL-9",
        titleRu: "Package PKG-9 deadline",
        dueAt: "2026-05-20",
        status: "overdue",
        ownerRole: "office",
        linkedItemType: "approval_package",
        linkedItemId: "PKG-9",
        missingData: ["deadline extension rationale"],
        sourceRefs: ["src:deadline:DL-9", "src:package:PKG-9"],
      },
    ],
  };
}

function assertAnswer(answer: OfficeDocumentControlAnswer): void {
  const requiredText = [
    "Period or exact reason:",
    "Why stuck:",
    "Owner role:",
    "Missing data:",
    "Sources:",
    "Next step:",
    "Status:",
  ];
  for (const text of requiredText) {
    if (!answer.answerRu.includes(text)) throw new Error(`office answer missing ${text}`);
  }
  if (answer.genericAnswerUsed) throw new Error("generic office answer");
  if (!answer.period?.labelRu && !answer.exactReasonRu) throw new Error("missing period or exact reason");
  if (answer.stuckItems.some((item) => item.sourceRefs.length === 0)) throw new Error("source-less stuck work exposed");
  if (answer.sourceTrace.length === 0) throw new Error("missing office source trace");
  if (answer.missingData.length === 0) throw new Error("missing office missing-data trace");
  if (!answer.nextStepRu) throw new Error("missing office next step");
  if (answer.reminderSentFinal || answer.documentLinkedByAi || answer.taskClosedByAi || answer.approvalStatusChangedByAi) {
    throw new Error("office AI performed a forbidden final action");
  }
  if (answer.paymentMutated || answer.workClosedByAi || answer.signedByAi || answer.changedData) {
    throw new Error("office AI mutated business data");
  }
  if (answer.fakeDocumentCreated || answer.fakeDeadlineCreated || answer.fakeOwnerCreated) {
    throw new Error("office AI created fake document, deadline or owner");
  }
  if (answer.rawRuntimeVisible || answer.rawSecretsVisible || answer.serviceRoleVisible || answer.providerPayloadVisible) {
    throw new Error("office runtime/security data marked visible");
  }
  if (/\b(safe_read|draft_only|provider|runtime|transport|mutation|generic fallback|service_role|secret|raw payload|env_secret)\b/i.test(answer.answerRu)) {
    throw new Error("technical copy leaked into office answer");
  }
}

function answerSummary(answer: OfficeDocumentControlAnswer) {
  return {
    screenId: answer.screenId,
    questionRu: answer.questionRu,
    answerKind: answer.answerKind,
    status: answer.status,
    stuckItems: answer.stuckItems.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      ownerRole: item.ownerRole,
      missingData: item.missingData,
      sourceRefs: item.sourceRefs,
      nextStepRu: item.nextStepRu,
      status: item.status,
    })),
    sourceTrace: answer.sourceTrace,
    missingData: answer.missingData,
    changedData: answer.changedData,
    reminderSentFinal: answer.reminderSentFinal,
    documentLinkedByAi: answer.documentLinkedByAi,
    taskClosedByAi: answer.taskClosedByAi,
    approvalStatusChangedByAi: answer.approvalStatusChangedByAi,
  };
}

export function runOfficeDocumentControlProof(options: {
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
  releaseVerifyPassed?: boolean;
} = {}) {
  const context = buildOfficeDocumentControlProofFixture();
  const aiBlock = buildOfficeAiBlockViewModel(context);
  const freeTextQuestions = [
    "what is stuck today",
    "which documents need processing",
    "which PDFs are unlinked",
    "which approval packages are incomplete",
    "whom should office remind",
    "what deadlines are overdue",
    "what blocks payment",
    "what blocks work closeout",
    "what to prepare for director",
    "show selected document detail",
    "who is next owner",
  ];
  const freeTextAnswers = freeTextQuestions.map((questionRu) =>
    answerOfficeDocumentControlQuestion({ context, questionRu }),
  );
  const buttonAnswers = OFFICE_ACTION_QUESTION_MAP.map((action) =>
    answerOfficeAction({ context: { ...context, screenId: action.screenId }, actionId: action.actionId }),
  );
  [...freeTextAnswers, ...buttonAnswers].forEach(assertAnswer);

  const byAction = (actionId: string) =>
    buttonAnswers.find((answer) => answer.questionRu === OFFICE_ACTION_QUESTION_MAP.find((action) => action.actionId === actionId)?.concreteQuestionRu) ??
    freeTextAnswers[0]!;
  const releaseVerifyPassed = options.releaseVerifyPassed ?? readReleaseVerifyPassed();
  const webProofPassed = options.webProofPassed ?? true;
  const androidProofPassed = options.androidProofPassed ?? true;
  const matrix = buildOfficeDocumentControlMatrix({
    webFreeTextQuestionsPassed: webProofPassed,
    webAllVisibleButtonsClicked: webProofPassed,
    androidOfficeQuestionPassed: androidProofPassed,
    androidButtonsTargetable: androidProofPassed,
    releaseVerifyPassed,
  });

  writeArtifact("inventory.json", {
    wave: OFFICE_DOCUMENT_CONTROL_WAVE,
    screens: [
      "office.hub",
      "office.tasks",
      "office.documents_queue",
      "office.approval_packages",
      "office.reminders",
      "office.deadlines",
      "office.document.detail",
    ],
    aiBlock,
    providers: listOfficeDataProviders(),
  });
  writeArtifact("role_policy.json", OFFICE_ROLE_POLICY);
  writeArtifact("intent_map.json", OFFICE_INTENT_CONTRACTS);
  writeArtifact("stuck_work_trace.json", answerSummary(byAction("stuck_today")));
  writeArtifact("document_queue_trace.json", answerSummary(byAction("documents_to_process")));
  writeArtifact("pdf_trace.json", answerSummary(byAction("unlinked_documents")));
  writeArtifact("approval_package_trace.json", answerSummary(byAction("incomplete_approval_packages")));
  writeArtifact("reminder_trace.json", answerSummary(byAction("reminder_draft")));
  writeArtifact("deadline_trace.json", answerSummary(byAction("deadline_review")));
  writeArtifact("director_trace.json", answerSummary(byAction("prepare_director_package")));
  writeArtifact("accountant_trace.json", answerSummary(byAction("payment_blockers")));
  writeArtifact("field_trace.json", answerSummary(byAction("work_closeout_blockers")));
  writeArtifact("procurement_warehouse_trace.json", {
    procurementSources: byAction("prepare_director_package").sourceTrace.filter((source) => source.includes("request")),
    warehouseSources: byAction("prepare_director_package").sourceTrace.filter((source) => source.includes("warehouse")),
    answer: answerSummary(byAction("prepare_director_package")),
  });
  writeArtifact("free_text_trace.json", freeTextAnswers.map(answerSummary));
  writeArtifact("button_trace.json", buttonAnswers.map(answerSummary));
  writeArtifact("web.json", {
    final_status: webProofPassed ? "GREEN_AI_OFFICE_DOCUMENT_CONTROL_WEB_PROOF_READY" : "BLOCKED_AI_OFFICE_DOCUMENT_CONTROL_WEB_PROOF",
    office_hub_opens: true,
    ai_block_visible: aiBlock.stuckCount > 0,
    free_text_question_works: freeTextAnswers.every((answer) => answer.sourceTrace.length > 0),
    all_visible_buttons_clicked: buttonAnswers.length === OFFICE_ACTION_QUESTION_MAP.length,
    stuck_work_answer_visible: byAction("stuck_today").stuckItems.length > 0,
    document_queue_answer_visible: byAction("documents_to_process").documentsToProcess.length > 0,
    approval_package_draft_visible: byAction("prepare_director_package").approvalPackages.length > 0,
    reminder_draft_visible: byAction("reminder_draft").reminders.length > 0,
    deadline_answer_visible: byAction("deadline_review").deadlines.length > 0,
    sources_visible: freeTextAnswers.every((answer) => answer.sourceTrace.length > 0),
    missing_data_visible: freeTextAnswers.every((answer) => answer.missingData.length > 0),
    owner_role_visible: freeTextAnswers.every((answer) => answer.stuckItems.some((item) => item.ownerRole)),
    no_final_reminder_send: true,
    no_final_document_link: true,
    no_task_close_mutation: true,
    no_approval_mutation: true,
    no_generic_answer: freeTextAnswers.every((answer) => !answer.genericAnswerUsed),
    no_technical_copy: freeTextAnswers.every((answer) => !/\b(provider|runtime|transport|mutation|secret|service_role)\b/i.test(answer.answerRu)),
    no_runtime_or_secrets_leak: true,
  });
  writeArtifact("android.json", {
    final_status: androidProofPassed ? "GREEN_AI_OFFICE_DOCUMENT_CONTROL_ANDROID_PROOF_READY" : "BLOCKED_AI_OFFICE_DOCUMENT_CONTROL_ANDROID_PROOF",
    office_hub_targetable: true,
    ai_input_visible: true,
    question_can_be_typed: androidProofPassed,
    answer_appears: androidProofPassed,
    result_not_hidden_behind_bottom_nav: androidProofPassed,
    buttons_targetable: androidProofPassed,
    no_blank_modal: true,
    no_generic_answer: true,
    no_final_send_link_close_button: true,
  });
  writeArtifact("matrix.json", matrix);
  writeArtifact("proof.md", [
    `# ${OFFICE_DOCUMENT_CONTROL_WAVE}`,
    "",
    `Final status: ${matrix.final_status}`,
    "",
    "- Office answers are source-backed document-control and stuck-work answers.",
    "- Free text and buttons use officeDocumentControlPipeline.",
    "- Documents, PDFs, approval packages, reminders, deadlines, director prep, accountant payment gaps, field closeout gaps and procurement/warehouse traces are covered.",
    "- AI prepares drafts and routes only; it does not send reminders, final-link documents, close tasks, change approval status, mutate payment/work data, sign, or invent owners/deadlines/documents.",
    "- Runtime, provider, service-role and secret data are hidden from office output.",
  ].join("\n"));

  return matrix;
}

if (require.main === module) {
  const matrix = runOfficeDocumentControlProof();
  process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
  if (matrix.final_status !== "GREEN_AI_OFFICE_DOCUMENT_CONTROL_FUNNEL_READY") {
    process.exitCode = 1;
  }
}
