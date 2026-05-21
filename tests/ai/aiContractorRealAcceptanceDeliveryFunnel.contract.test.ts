import {
  answerContractorAcceptanceAction,
  answerContractorAcceptanceQuestion,
  buildContractorAcceptanceMatrix,
  buildDefaultContractorAcceptanceContext,
  contractorActionQuestionMap,
  contractorIntentContracts,
} from "../../src/lib/ai/contractorAcceptance";
import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL", () => {
  it("answers contractor acceptance from own works with missing evidence and sources", () => {
    const answer = answerContractorAcceptanceQuestion({
      questionRu: "что мешает приёмке",
    });

    expect(answer.role).toBe("contractor");
    expect(answer.intent).toBe("acceptance_blockers");
    expect(answer.events.length).toBeGreaterThan(0);
    expect(answer.events.every((event) => event.linkedContext.contractorId === "CTR-GKL")).toBe(true);
    expect(answer.missingData.join("\n")).toMatch(/фото после|подпись|документ/i);
    expect(answer.sources.map((source) => source.type)).toEqual(expect.arrayContaining(["contractor_work", "remark", "act", "photo"]));
    expect(answer.nextStepRu).toMatch(/фото|акт|RMK-14/i);
    expect(answer.changedData).toBe(false);
    expect(answer.workStatusChangedByAi).toBe(false);
    expect(answer.remarkClosedByAi).toBe(false);
    expect(answer.actSignedByAi).toBe(false);
    expect(answer.finalSubmit).toBe(false);
  });

  it("keeps draft actions draft-only without signing, closeout, or final submit", () => {
    const act = answerContractorAcceptanceAction({ actionId: "act_draft" });
    const remark = answerContractorAcceptanceAction({ actionId: "remark_response_draft" });
    const review = answerContractorAcceptanceAction({ actionId: "review_request_draft" });

    for (const answer of [act, remark, review]) {
      expect(answer.status).toBe("draft_prepared");
      expect(answer.changedData).toBe(false);
      expect(answer.workStatusChangedByAi).toBe(false);
      expect(answer.remarkClosedByAi).toBe(false);
      expect(answer.actSignedByAi).toBe(false);
      expect(answer.finalSubmit).toBe(false);
      expect(answer.roleActions.length).toBeGreaterThan(0);
    }
  });

  it("limits payment status and hides full cashflow/security/runtime", () => {
    const answer = answerContractorAcceptanceQuestion({
      questionRu: "что мешает оплате моей работы",
    });

    expect(answer.intent).toBe("limited_payment_status_check");
    expect(answer.shortAnswerRu).toMatch(/ограниченном статусе оплаты|cashflow скрыт/i);
    expect(answer.hiddenByPermission.map((item) => item.sourceType)).toEqual(
      expect.arrayContaining(["full_cashflow", "other_contractor_work", "security_runtime"]),
    );
    expect(JSON.stringify(answer)).not.toMatch(/bank_balance|service_role|runtime_secret|all_company_cashflow/i);
  });

  it("scopes marketplace service draft by permission and never publishes", () => {
    const allowed = answerContractorAcceptanceAction({
      context: buildDefaultContractorAcceptanceContext({ marketplacePermission: true }),
      actionId: "contractor_marketplace_service_draft",
    });
    const blocked = answerContractorAcceptanceAction({
      context: buildDefaultContractorAcceptanceContext({ marketplacePermission: false }),
      actionId: "contractor_marketplace_service_draft",
    });

    expect(allowed.answerKind).toBe("marketplace_service_draft");
    expect(allowed.status).toBe("draft_prepared");
    expect(allowed.finalSubmit).toBe(false);
    expect(allowed.roleActions.map((item) => item.actionRu).join("\n")).toMatch(/карточку услуги marketplace/i);
    expect(blocked.shortAnswerRu).toMatch(/permission/i);
    expect(blocked.finalSubmit).toBe(false);
  });

  it("connects live contractor route to contractorAcceptance pipeline for free text and buttons", () => {
    const freeText = answerLiveAiForContext({
      context: "contractor",
      userText: "что мешает приёмке",
    });
    const button = answerLiveAiForContext({
      context: "contractor",
      forceActionId: "acceptance_blockers",
    });

    expect(freeText.pipelineKey).toBe("contractorAcceptance");
    expect(button.pipelineKey).toBe("contractorAcceptance");
    expect(freeText.providerTrace).toContain("contractorAcceptancePipeline");
    expect(button.providerTrace).toContain("contractorAcceptancePipeline");
    expect(freeText.answerTextRu).toMatch(/фото|замеч|акт/i);
    expect(button.answerTextRu).toMatch(/фото|замеч|акт/i);
    expect(freeText.dangerousMutationsFound).toBe(0);
    expect(button.dangerousMutationsFound).toBe(0);
  });

  it("keeps contractor role policy, intent map, and matrix fake-green protection", () => {
    expect(contractorIntentContracts.length).toBeGreaterThanOrEqual(18);
    expect(contractorActionQuestionMap.length).toBeGreaterThanOrEqual(8);
    expect(contractorActionQuestionMap.every((item) => item.concreteQuestionRu.length > 20)).toBe(true);

    const green = buildContractorAcceptanceMatrix({
      releaseVerifyPassed: true,
      webProofPassed: true,
      androidProofPassed: true,
    });
    const blocked = buildContractorAcceptanceMatrix({ releaseVerifyPassed: false });

    expect(green.final_status).toBe("GREEN_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL_READY");
    expect(blocked.final_status).not.toBe("GREEN_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL_READY");
    expect(blocked.release_verify_passed).toBe(false);
    expect(green.fake_green_claimed).toBe(false);
  });
});
