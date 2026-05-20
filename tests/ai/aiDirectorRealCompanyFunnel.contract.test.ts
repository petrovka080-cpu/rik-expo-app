import {
  DIRECTOR_REAL_COMPANY_WAVE,
  answerDirectorCompanyQuestion,
  buildDirectorAiBlockViewModel,
  buildDirectorRealCompanyMatrix,
  listDirectorDataProviders,
} from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director real company funnel", () => {
  it("builds a source-backed company decision funnel without mutations", () => {
    const answer = answerDirectorCompanyQuestion({
      context: buildDirectorRealCompanyFixture(),
      questionRu: "что мне решить сегодня",
    });

    expect(answer.answerRu).toContain("Главное решение");
    expect(answer.topDecision?.titleRu).toContain("INV-1042");
    expect(answer.domainSummary.finance).toContain("finance");
    expect(answer.sourceTrace).toEqual(expect.arrayContaining(["src:invoice:INV-1042", "src:stock:STK-221", "src:work:WRK-1042"]));
    expect(answer.changedData).toBe(false);
    expect(answer.approvedByAi).toBe(false);
    expect(answer.rejectedByAi).toBe(false);
    expect(answer.paymentExecuted).toBe(false);
    expect(answer.orderCreated).toBe(false);
    expect(answer.stockMutated).toBe(false);
    expect(answer.finalSubmit).toBe(false);
    expect(answer.genericAnswerUsed).toBe(false);
  });

  it("exposes one focused director AI block model", () => {
    const model = buildDirectorAiBlockViewModel(buildDirectorRealCompanyFixture());

    expect(model.titleRu).toBe("Готово от AI");
    expect(model.decisionsCount).toBeGreaterThan(0);
    expect(model.visibleActionLabelsRu).toHaveLength(5);
    expect(model.inputPlaceholderRu).toContain("Спросить");
  });

  it("has pure providers and a green matrix when proofs pass", () => {
    expect(listDirectorDataProviders().every((provider) => provider.pure && !provider.usesHooks && !provider.dbWrites)).toBe(true);

    const matrix = buildDirectorRealCompanyMatrix({
      webFreeTextQuestionsPassed: true,
      webAllVisibleButtonsClicked: true,
      androidDirectorQuestionPassed: true,
      androidButtonsTargetable: true,
      releaseVerifyPassed: true,
    });

    expect(matrix.wave).toBe(DIRECTOR_REAL_COMPANY_WAVE);
    expect(matrix.final_status).toBe("GREEN_AI_DIRECTOR_REAL_COMPANY_FUNNEL_READY");
    expect(matrix.direct_approve_reject_paths_found).toBe(0);
    expect(matrix.fake_green_claimed).toBe(false);

    const withoutRelease = buildDirectorRealCompanyMatrix({
      webFreeTextQuestionsPassed: true,
      webAllVisibleButtonsClicked: true,
      androidDirectorQuestionPassed: true,
      androidButtonsTargetable: true,
      releaseVerifyPassed: false,
    });

    expect(withoutRelease.final_status).not.toBe("GREEN_AI_DIRECTOR_REAL_COMPANY_FUNNEL_READY");
    expect(withoutRelease.release_verify_passed).toBe(false);
  });
});
