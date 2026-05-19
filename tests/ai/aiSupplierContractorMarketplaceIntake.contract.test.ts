import {
  MARKETPLACE_INTAKE_ACTION_QUESTION_MAP,
  MARKETPLACE_INTAKE_INTENT_CONTRACTS,
  MARKETPLACE_INTAKE_ROLE_POLICY,
  answerMarketplaceIntakeQuestion,
  buildMarketplaceIntakeAiBlockViewModel,
  buildMarketplaceIntakeMatrix,
  listMarketplaceIntakeDataProviders,
} from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture } from "./aiMarketplaceIntake.fixture";

describe("Supplier contractor marketplace intake", () => {
  it("exposes one pure marketplace intake layer without hooks or direct mutations", () => {
    const providers = listMarketplaceIntakeDataProviders();
    expect(providers).toHaveLength(11);
    expect(providers.every((provider) => provider.pure)).toBe(true);
    expect(providers.every((provider) => provider.usesHooks === false)).toBe(true);
    expect(providers.every((provider) => provider.usesUseEffectHack === false)).toBe(true);
    expect(providers.every((provider) => provider.dbWrites === false)).toBe(true);
    expect(providers.every((provider) => provider.directMutation === false)).toBe(true);
    expect(providers.every((provider) => provider.createsFakeData === false)).toBe(true);
    expect(MARKETPLACE_INTAKE_INTENT_CONTRACTS.map((item) => item.intent)).toEqual(expect.arrayContaining([
      "add_product_draft",
      "add_service_draft",
      "send_to_moderation",
      "marketplace_source_check",
    ]));
    expect(MARKETPLACE_INTAKE_ACTION_QUESTION_MAP.length).toBeGreaterThanOrEqual(16);
    expect(MARKETPLACE_INTAKE_ROLE_POLICY.supplier.directPublishAllowed).toBe(false);
    expect(MARKETPLACE_INTAKE_ROLE_POLICY.supplier.directOrderAllowed).toBe(false);

    const matrix = buildMarketplaceIntakeMatrix(buildMarketplaceIntakeFixture(), {
      webAllVisibleButtonsClicked: true,
      androidButtonsTargetable: true,
      releaseVerifyPassed: true,
    });
    expect(matrix.final_status).toBe("GREEN_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_READY");
    expect(matrix.second_ai_framework_created).toBe(false);
    expect(matrix.direct_publish_paths_found).toBe(0);
    expect(matrix.direct_order_paths_found).toBe(0);
  });

  it("builds one AI block view model for marketplace screens", () => {
    const viewModel = buildMarketplaceIntakeAiBlockViewModel(buildMarketplaceIntakeFixture());
    expect(viewModel.titleRu).toBe("Готово от AI");
    expect(viewModel.pendingModerationCount).toBeGreaterThanOrEqual(0);
    expect(viewModel.missingDocumentsCount).toBe(0);
    expect(viewModel.requestMatchesCount).toBe(1);
    expect(viewModel.visibleActionLabelsRu).toContain("+ Добавить товар");
    expect(viewModel.visibleActionLabelsRu).toContain("Отправить на модерацию");
  });

  it("answers through the shared intake pipeline with source trace", () => {
    const answer = answerMarketplaceIntakeQuestion({
      context: buildMarketplaceIntakeFixture(),
      questionRu: "добавить товар в marketplace",
    });
    expect(answer.answerKind).toBe("offer_draft");
    expect(answer.providerTrace).toContain("marketplaceIntakePipeline");
    expect(answer.sourceTrace.length).toBeGreaterThan(0);
    expect(answer.answerRu).toContain("Карточка не опубликована");
  });
});
