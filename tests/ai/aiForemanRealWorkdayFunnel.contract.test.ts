import {
  FOREMAN_ACTION_QUESTION_MAP,
  FOREMAN_INTENT_CONTRACTS,
  buildForemanAiBlockViewModel,
  buildForemanRealWorkdayMatrix,
  listForemanDataProviders,
} from "../../src/lib/ai/foremanIntelligence";
import { buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman real workday funnel", () => {
  it("exposes one pure foreman intelligence layer without hooks or mutations", () => {
    const providers = listForemanDataProviders();
    expect(providers).toHaveLength(20);
    expect(providers.every((provider) => provider.pure)).toBe(true);
    expect(providers.every((provider) => provider.usesHooks === false)).toBe(true);
    expect(providers.every((provider) => provider.usesUseEffectHack === false)).toBe(true);
    expect(providers.every((provider) => provider.dbWrites === false)).toBe(true);
    expect(providers.every((provider) => provider.directMutation === false)).toBe(true);
    expect(providers.every((provider) => provider.createsFakeData === false)).toBe(true);
    expect(FOREMAN_INTENT_CONTRACTS.map((item) => item.intent)).toEqual(expect.arrayContaining([
      "daily_object_report",
      "closeout_readiness",
      "estimate_comparison",
      "architecture_pdf_check",
      "construction_norms_check",
      "material_blockers",
      "contractor_message_draft",
    ]));
    expect(FOREMAN_ACTION_QUESTION_MAP.length).toBeGreaterThanOrEqual(18);

    const matrix = buildForemanRealWorkdayMatrix({
      webFreeTextQuestionsPassed: true,
      webAllVisibleButtonsClicked: true,
      androidForemanQuestionPassed: true,
      androidButtonsTargetable: true,
      releaseVerifyPassed: true,
    });
    expect(matrix.final_status).toBe("GREEN_AI_FOREMAN_REAL_WORKDAY_FUNNEL_READY");
    expect(matrix.new_hooks_added).toBe(false);
    expect(matrix.db_writes_from_ai_answer_used).toBe(false);
    expect(matrix.direct_final_submit_paths_found).toBe(0);
  });

  it("builds a single foreman AI block view model with capped visible actions", () => {
    const viewModel = buildForemanAiBlockViewModel(buildForemanRealWorkdayFixture());
    expect(viewModel.titleRu).toBe("Готово от AI");
    expect(viewModel.today.done).toBeGreaterThan(0);
    expect(viewModel.inputPlaceholderRu).toContain("работам");
    expect(viewModel.visibleActionLabelsRu).toHaveLength(5);
    expect(viewModel.hiddenActionLabelsRu).toContain("Сверить со сметой/проектом");
  });
});
