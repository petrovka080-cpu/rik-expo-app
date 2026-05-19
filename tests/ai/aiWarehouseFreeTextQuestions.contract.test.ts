import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse free text questions", () => {
  it("routes stock, incoming, issue, document and handoff questions through the warehouse pipeline", () => {
    const context = buildWarehouseRealStockFixture();
    const questions = [
      "what material blocks work today",
      "check incoming documents",
      "what can be issued by object",
      "find stock discrepancies",
      "prepare handoff to buyer",
    ];

    const answers = questions.map((questionRu) => answerWarehouseStockQuestion({ context, questionRu }));

    expect(answers.every((answer) => answer.providerTrace[0] === "warehouseStockPipeline")).toBe(true);
    expect(answers.every((answer) => answer.sourceTrace.length > 0)).toBe(true);
    expect(answers.every((answer) => !answer.genericAnswerUsed)).toBe(true);
  });
});
