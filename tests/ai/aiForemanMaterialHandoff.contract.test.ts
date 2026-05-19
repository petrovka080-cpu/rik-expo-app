import { answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman material handoff", () => {
  it("creates a draft-only procurement handoff without direct order", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanRealWorkdayFixture(),
      questionRu: "что по материалам и складу",
    });

    expect(answer.intent).toBe("material_blockers");
    expect(answer.providerTrace).toContain("aiWarehouseLinkedStockProvider");
    expect(answer.providerTrace).toContain("aiProcurementLinkedRequestProvider");
    expect(answer.answerRu).toContain("ГКЛ 12.5 мм");
    expect(answer.answerRu).toContain("Заявка MR-1042");
    expect(answer.answerRu).toContain("заказ не создаётся автоматически");
    expect(answer.changedData).toBe(false);
  });
});
