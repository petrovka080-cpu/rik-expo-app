import {
  OFFICE_ACTION_QUESTION_MAP,
  OFFICE_DOCUMENT_CONTROL_WAVE,
  OFFICE_INTENT_CONTRACTS,
  OFFICE_ROLE_POLICY,
  answerOfficeAction,
  answerOfficeDocumentControlQuestion,
  assertOfficeReadOnlyPolicy,
  buildOfficeAiBlockViewModel,
  buildOfficeDocumentControlMatrix,
  listOfficeDataProviders,
  type OfficeAnswerKind,
  type OfficeDocumentControlIntent,
  type OfficeDocumentControlScreenId,
} from "../../src/lib/ai/officeDocumentControl";
import { buildOfficeDocumentControlFixture } from "./aiOfficeDocumentControl.fixture";

const DANGEROUS_VISIBLE_COPY =
  /\b(safe_read|draft_only|provider|runtime|transport|mutation|generic fallback|service_role|secret|raw payload|env_secret)\b/i;

function expectOfficeAnswerContract(
  answer: ReturnType<typeof answerOfficeDocumentControlQuestion>,
): void {
  expect(answer.answerRu).toContain("Period or exact reason:");
  expect(answer.answerRu).toContain("Why stuck:");
  expect(answer.answerRu).toContain("Owner role:");
  expect(answer.answerRu).toContain("Missing data:");
  expect(answer.answerRu).toContain("Sources:");
  expect(answer.answerRu).toContain("Next step:");
  expect(answer.answerRu).toContain("Status:");
  expect(answer.answerRu).not.toMatch(DANGEROUS_VISIBLE_COPY);
  expect(answer.stuckItems.every((item) => item.sourceRefs.length > 0)).toBe(true);
  expect(answer.changedData).toBe(false);
  expect(answer.reminderSentFinal).toBe(false);
  expect(answer.documentLinkedByAi).toBe(false);
  expect(answer.taskClosedByAi).toBe(false);
  expect(answer.approvalStatusChangedByAi).toBe(false);
  expect(answer.paymentMutated).toBe(false);
  expect(answer.workClosedByAi).toBe(false);
  expect(answer.signedByAi).toBe(false);
  expect(answer.genericAnswerUsed).toBe(false);
  expect(answer.fakeDocumentCreated).toBe(false);
  expect(answer.fakeDeadlineCreated).toBe(false);
  expect(answer.fakeOwnerCreated).toBe(false);
}

describe("office document-control funnel", () => {
  it("builds a source-backed stuck-work funnel without mutations", () => {
    const answer = answerOfficeDocumentControlQuestion({
      context: buildOfficeDocumentControlFixture(),
      questionRu: "what is stuck today and what blocks payment",
    });

    expect(answer.answerRu).toContain("Office document-control answer");
    expect(answer.answerRu).toContain("Period or exact reason: 2026-05-20");
    expect(answer.answerRu).toContain("Status: data unchanged");
    expect(answer.stuckItems.length).toBeGreaterThan(0);
    expect(answer.stuckItems.some((item) => item.id.includes("DOC-NOSOURCE"))).toBe(false);
    expect(answer.paymentBlockers.length).toBeGreaterThan(0);
    expect(answer.workCloseoutBlockers.length).toBeGreaterThan(0);
    expect(answer.sourceTrace).toEqual(
      expect.arrayContaining([
        "src:doc:DOC-17",
        "src:package:PKG-9",
        "src:deadline:DL-9",
        "src:request:MR-900",
        "src:warehouse:WH-900",
      ]),
    );
    expect(answer.missingData).toEqual(expect.arrayContaining(["Document DOC-NOSOURCE: source missing; item is not treated as confirmed stuck work."]));
    expectOfficeAnswerContract(answer);
  });

  it("covers every required office screen and action with source-backed answers", () => {
    const cases: Array<{
      screenId: OfficeDocumentControlScreenId;
      actionId: OfficeDocumentControlIntent;
      answerKind: OfficeAnswerKind;
      sourceRefs: string[];
    }> = [
      { screenId: "office.hub", actionId: "stuck_today", answerKind: "stuck_work_queue", sourceRefs: ["src:office:TASK-17"] },
      { screenId: "office.tasks", actionId: "next_owner", answerKind: "stuck_work_queue", sourceRefs: ["src:office:TASK-17"] },
      { screenId: "office.documents_queue", actionId: "documents_to_process", answerKind: "document_queue", sourceRefs: ["src:doc:DOC-17", "src:pdf:DOC-17:1"] },
      { screenId: "office.documents_queue", actionId: "unlinked_documents", answerKind: "document_queue", sourceRefs: ["src:doc:DOC-17"] },
      { screenId: "office.approval_packages", actionId: "incomplete_approval_packages", answerKind: "approval_package_review", sourceRefs: ["src:package:PKG-9", "src:approval:APR-9"] },
      { screenId: "office.approval_packages", actionId: "prepare_director_package", answerKind: "director_prep", sourceRefs: ["src:package:PKG-9", "src:payment:PAY-900"] },
      { screenId: "office.reminders", actionId: "reminder_draft", answerKind: "reminder_draft", sourceRefs: ["src:reminder:REM-9"] },
      { screenId: "office.deadlines", actionId: "deadline_review", answerKind: "deadline_review", sourceRefs: ["src:deadline:DL-9"] },
      { screenId: "office.document.detail", actionId: "document_detail", answerKind: "document_detail", sourceRefs: ["src:doc:DOC-17", "src:pdf:DOC-17:1"] },
    ];

    for (const item of cases) {
      const answer = answerOfficeAction({
        context: { ...buildOfficeDocumentControlFixture(), screenId: item.screenId },
        actionId: item.actionId,
      });

      expect(answer.screenId).toBe(item.screenId);
      expect(answer.answerKind).toBe(item.answerKind);
      expect(answer.providerTrace[0]).toBe("officeDocumentControlPipeline");
      expect(answer.sourceTrace).toEqual(expect.arrayContaining(item.sourceRefs));
      expectOfficeAnswerContract(answer);
    }
  });

  it("routes free text and buttons through the same office pipeline", () => {
    const context = buildOfficeDocumentControlFixture();
    const freeText = answerOfficeDocumentControlQuestion({
      context,
      questionRu: "which approval packages are incomplete",
    });
    const button = answerOfficeAction({
      context: { ...context, screenId: "office.approval_packages" },
      actionId: "incomplete_approval_packages",
    });

    expect(freeText.providerTrace[0]).toBe("officeDocumentControlPipeline");
    expect(button.providerTrace[0]).toBe("officeDocumentControlPipeline");
    expect(button.answerKind).toBe("approval_package_review");
    expect(button.approvalPackages[0]?.sourceRefs).toContain("src:package:PKG-9");
    expect(button.approvalStatusChangedByAi).toBe(false);
    expectOfficeAnswerContract(freeText);
    expectOfficeAnswerContract(button);
  });

  it("keeps director, accountant, field, procurement and warehouse traces grounded", () => {
    const context = buildOfficeDocumentControlFixture();
    const director = answerOfficeAction({
      context: { ...context, screenId: "office.approval_packages" },
      actionId: "prepare_director_package",
    });
    const accountant = answerOfficeAction({ context, actionId: "payment_blockers" });
    const field = answerOfficeAction({ context, actionId: "work_closeout_blockers" });

    expect(director.sourceTrace).toEqual(expect.arrayContaining(["src:package:PKG-9", "src:approval:APR-9", "src:payment:PAY-900"]));
    expect(accountant.sourceTrace).toEqual(expect.arrayContaining(["src:invoice:INV-900", "src:payment:PAY-900", "src:doc:DOC-17"]));
    expect(field.sourceTrace).toEqual(expect.arrayContaining(["src:work:WRK-900", "src:act:ACT-900"]));
    expect(director.sourceTrace).toEqual(expect.arrayContaining(["src:request:MR-900", "src:warehouse:WH-900"]));
    expectOfficeAnswerContract(director);
    expectOfficeAnswerContract(accountant);
    expectOfficeAnswerContract(field);
  });

  it("prepares reminder drafts without sending final reminders", () => {
    const answer = answerOfficeAction({
      context: { ...buildOfficeDocumentControlFixture(), screenId: "office.reminders" },
      actionId: "reminder_draft",
    });

    expect(answer.answerKind).toBe("reminder_draft");
    expect(answer.status).toBe("draft_prepared");
    expect(answer.answerRu).toContain("Status: draft prepared");
    expect(answer.reminders.length).toBeGreaterThan(0);
    expect(answer.reminderSentFinal).toBe(false);
    expect(answer.answerRu).toContain("AI does not send final reminders");
  });

  it("hides runtime, provider, security and secret data from office answers", () => {
    const answer = answerOfficeDocumentControlQuestion({
      context: buildOfficeDocumentControlFixture(),
      questionRu: "show safe office summary",
    });

    expect(answer.hiddenTechnicalData.map((item) => item.sourceType)).toEqual(
      expect.arrayContaining(["raw_runtime", "raw_security_event", "service_role", "provider_payload", "env_secret"]),
    );
    expect(answer.answerRu).not.toContain("service_role_secret");
    expect(answer.answerRu).not.toContain("OFFICE_SECRET_TOKEN");
    expect(answer.answerRu).not.toMatch(DANGEROUS_VISIBLE_COPY);
    expect(answer.rawRuntimeVisible).toBe(false);
    expect(answer.rawSecretsVisible).toBe(false);
    expect(answer.serviceRoleVisible).toBe(false);
    expect(answer.providerPayloadVisible).toBe(false);
  });

  it("exposes one focused office AI block model", () => {
    const model = buildOfficeAiBlockViewModel(buildOfficeDocumentControlFixture());

    expect(model.titleRu).toBe("AI office control ready");
    expect(model.stuckCount).toBeGreaterThan(0);
    expect(model.documentsCount).toBe(3);
    expect(model.unlinkedDocumentsCount).toBe(1);
    expect(model.incompletePackagesCount).toBe(1);
    expect(model.visibleActionLabelsRu).toHaveLength(5);
    expect(model.inputPlaceholderRu).toContain("office documents");
  });

  it("has pure providers, role policy and complete intent/action maps", () => {
    expect(assertOfficeReadOnlyPolicy()).toBe(true);
    expect(OFFICE_ROLE_POLICY.finalReminderSendAllowed).toBe(false);
    expect(OFFICE_ROLE_POLICY.directDocumentLinkAllowed).toBe(false);
    expect(OFFICE_ROLE_POLICY.taskCloseAllowed).toBe(false);
    expect(OFFICE_ROLE_POLICY.approvalStatusMutationAllowed).toBe(false);
    expect(listOfficeDataProviders().every((provider) => provider.pure && !provider.usesHooks && !provider.dbWrites)).toBe(true);
    expect(OFFICE_INTENT_CONTRACTS.map((item) => item.intent)).toEqual(expect.arrayContaining(OFFICE_ACTION_QUESTION_MAP.map((item) => item.actionId)));
  });

  it("has a green matrix only after release verify passes", () => {
    const matrix = buildOfficeDocumentControlMatrix({
      webFreeTextQuestionsPassed: true,
      webAllVisibleButtonsClicked: true,
      androidOfficeQuestionPassed: true,
      androidButtonsTargetable: true,
      releaseVerifyPassed: true,
    });

    expect(matrix.wave).toBe(OFFICE_DOCUMENT_CONTROL_WAVE);
    expect(matrix.final_status).toBe("GREEN_AI_OFFICE_DOCUMENT_CONTROL_FUNNEL_READY");
    expect(matrix.stuck_work_report_ready).toBe(true);
    expect(matrix.document_queue_review_ready).toBe(true);
    expect(matrix.approval_package_review_ready).toBe(true);
    expect(matrix.deadline_report_ready).toBe(true);
    expect(matrix.director_package_summary_ready).toBe(true);
    expect(matrix.reminders_are_draft_only).toBe(true);
    expect(matrix.document_linking_suggestions_are_draft_only).toBe(true);
    expect(matrix.final_reminder_sent_by_ai).toBe(false);
    expect(matrix.document_linked_by_ai_final).toBe(false);
    expect(matrix.task_closed_by_ai).toBe(false);
    expect(matrix.approval_status_changed_by_ai).toBe(false);
    expect(matrix.fake_responsible_owner_created).toBe(false);
    expect(matrix.office_security_runtime_leak_found).toBe(false);
    expect(matrix.technical_copy_visible_to_user).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);

    const withoutRelease = buildOfficeDocumentControlMatrix({
      webFreeTextQuestionsPassed: true,
      webAllVisibleButtonsClicked: true,
      androidOfficeQuestionPassed: true,
      androidButtonsTargetable: true,
      releaseVerifyPassed: false,
    });

    expect(withoutRelease.final_status).not.toBe("GREEN_AI_OFFICE_DOCUMENT_CONTROL_FUNNEL_READY");
    expect(withoutRelease.release_verify_passed).toBe(false);
  });
});
