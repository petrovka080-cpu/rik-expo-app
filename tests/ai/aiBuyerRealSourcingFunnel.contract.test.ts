import {
  BUYER_ACTION_QUESTION_MAP,
  BUYER_INTENT_CONTRACTS,
  BUYER_ROLE_POLICY,
  answerBuyerSourcingQuestion,
  buildBuyerAiBlockViewModel,
  buildBuyerRealSourcingMatrix,
  listBuyerDataProviders,
} from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer real sourcing funnel", () => {
  it("exposes one pure buyer sourcing layer without hooks or mutations", () => {
    const providers = listBuyerDataProviders();
    expect(providers).toHaveLength(23);
    expect(providers.every((provider) => provider.pure)).toBe(true);
    expect(providers.every((provider) => provider.usesHooks === false)).toBe(true);
    expect(providers.every((provider) => provider.usesUseEffectHack === false)).toBe(true);
    expect(providers.every((provider) => provider.dbWrites === false)).toBe(true);
    expect(providers.every((provider) => provider.directMutation === false)).toBe(true);
    expect(providers.every((provider) => provider.createsFakeData === false)).toBe(true);
    expect(BUYER_INTENT_CONTRACTS.map((item) => item.intent)).toEqual(expect.arrayContaining([
      "approved_request_sourcing",
      "find_5_10_suppliers",
      "compare_suppliers",
      "find_analogs",
      "prepare_shortlist",
      "prepare_approval_handoff",
    ]));
    expect(BUYER_ACTION_QUESTION_MAP.length).toBeGreaterThanOrEqual(13);
    expect(BUYER_ROLE_POLICY.directOrderAllowed).toBe(false);
    expect(BUYER_ROLE_POLICY.autoApprovalAllowed).toBe(false);

    const matrix = buildBuyerRealSourcingMatrix({
      webFreeTextQuestionsPassed: true,
      webAllVisibleButtonsClicked: true,
      androidBuyerQuestionPassed: true,
      androidButtonsTargetable: true,
      releaseVerifyPassed: true,
    });
    expect(matrix.final_status).toBe("GREEN_AI_BUYER_REAL_SOURCING_FUNNEL_READY");
    expect(matrix.second_ai_framework_created).toBe(false);
    expect(matrix.direct_order_paths_found).toBe(0);
  });

  it("builds one AI block view model for request sourcing", () => {
    const viewModel = buildBuyerAiBlockViewModel(buildBuyerRealSourcingFixture());
    expect(viewModel.titleRu).toBe("Готово от AI");
    expect(viewModel.request.id).toBe("MR-1042");
    expect(viewModel.needToBuy.itemRu).toContain("ГКЛ");
    expect(viewModel.stock.deficitQty).toBe(24);
    expect(viewModel.offerCounts.ownMarketplace).toBeGreaterThanOrEqual(4);
    expect(viewModel.visibleActionLabelsRu).toHaveLength(5);
    expect(viewModel.hiddenActionLabelsRu).toContain("Отправить на согласование");
  });

  it("answers through the buyer sourcing pipeline with source-backed data", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "найди 10 вариантов по этой заявке",
    });
    expect(answer.answerKind).toBe("sourcing_result");
    expect(answer.offers.length).toBeGreaterThanOrEqual(5);
    expect(answer.stockCheck.deficitQty).toBe(24);
    expect(answer.providerTrace).toContain("buyerSourcingPipeline");
    expect(answer.answerRu).toContain("Заказ не создан");
  });
});
