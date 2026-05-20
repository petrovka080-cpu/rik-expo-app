import {
  WAREHOUSE_REAL_STOCK_WAVE,
  answerWarehouseStockQuestion,
  buildWarehouseAiBlockViewModel,
  buildWarehouseRealStockMatrix,
  listWarehouseDataProviders,
} from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse real stock funnel", () => {
  it("builds a source-backed stock funnel without mutations", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "what material blocks work today",
    });

    expect(answer.answerRu).toContain("Concrete M300");
    expect(answer.sourceTrace).toEqual(expect.arrayContaining(["src:stock:MAT-1", "src:request:MR-300"]));
    expect(answer.changedData).toBe(false);
    expect(answer.stockMutated).toBe(false);
    expect(answer.incomingAccepted).toBe(false);
    expect(answer.issueExecuted).toBe(false);
    expect(answer.writeoffCreated).toBe(false);
    expect(answer.genericAnswerUsed).toBe(false);
  });

  it("exposes one focused warehouse AI block model", () => {
    const model = buildWarehouseAiBlockViewModel(buildWarehouseRealStockFixture());

    expect(model.titleRu).toBe("Готово от AI");
    expect(model.stockItemsCount).toBe(1);
    expect(model.incomingCount).toBe(1);
    expect(model.issueCount).toBe(1);
    expect(model.visibleActionLabelsRu.length).toBe(5);
  });

  it("has pure providers and green matrix when proofs pass", () => {
    expect(listWarehouseDataProviders().every((provider) =>
      provider.pure && !provider.usesHooks && !provider.dbWrites && !provider.directMutation,
    )).toBe(true);

    const matrix = buildWarehouseRealStockMatrix({
      webFreeTextQuestionsPassed: true,
      webAllVisibleButtonsClicked: true,
      androidWarehouseQuestionPassed: true,
      androidButtonsTargetable: true,
      releaseVerifyPassed: true,
    });

    expect(matrix.wave).toBe(WAREHOUSE_REAL_STOCK_WAVE);
    expect(matrix.final_status).toBe("GREEN_AI_WAREHOUSE_REAL_STOCK_FUNNEL_READY");
    expect(matrix.direct_issue_paths_found).toBe(0);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
