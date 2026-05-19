import {
  WAREHOUSE_ACTION_QUESTION_MAP,
  answerWarehouseAction,
  answerWarehouseStockQuestion,
} from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse buttons and free text use same pipeline", () => {
  it("uses warehouseStockPipeline for every action and free question", () => {
    const context = buildWarehouseRealStockFixture();
    const free = answerWarehouseStockQuestion({ context, questionRu: "check incoming documents" });
    const buttonAnswers = WAREHOUSE_ACTION_QUESTION_MAP.map((action) =>
      answerWarehouseAction({ context: { ...context, screenId: action.screenId }, actionId: action.actionId }),
    );

    expect(free.providerTrace).toContain("warehouseStockPipeline");
    expect(buttonAnswers.every((answer) => answer.providerTrace.includes("warehouseStockPipeline"))).toBe(true);
    expect(buttonAnswers.every((answer) => answer.changedData === false)).toBe(true);
  });
});
