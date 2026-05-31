import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import {
  estimateFor,
  expectForbiddenRowsAbsent,
  expectRows,
} from "./liveB2cEstimateRealityTestHelpers";

const ELECTRICAL_PROMPT =
  "смета на прокладку электрокабеля с розетками в количестве 10 штук и выключателей 10 штук площадь квартиры 100 кв метров";

describe("/request electrical semantic mapping", () => {
  it("maps cable, outlets and switches to electrical work, not masonry", () => {
    const outcome = resolveEstimatorOutcome({ text: ELECTRICAL_PROMPT, currency: "KGS" });
    expect(outcome.plan?.semanticFrame.domain).toBe("electrical");
    expect(outcome.plan?.semanticFrame.object).toBe("electrical_network");
    expect(outcome.plan?.semanticFrame.operation).toBe("installation");

    const estimate = estimateFor("/request", ELECTRICAL_PROMPT);
    expect(estimate.work.category).toBe("electrical");
    expectRows(estimate, ["кабель", "розетки", "выключатели", "прокладка", "проверка"], 5);
    expectForbiddenRowsAbsent(estimate, ["кирпич", "кладочный", "masonry wall"]);
  });
});
