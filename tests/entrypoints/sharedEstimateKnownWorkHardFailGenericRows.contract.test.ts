import { assertNoGenericKnownWorkRows } from "../../src/lib/ai/estimatePresentation";

describe("shared estimate known work generic row hard fail", () => {
  it("throws for generic known-work rows", () => {
    expect(() =>
      assertNoGenericKnownWorkRows({
        workKey: "laminate_laying",
        rows: [{ rowNumber: "1.1", code: "bad", name: "Строительные работы" }],
      }),
    ).toThrow("ESTIMATE_PRESENTATION_GENERIC_KNOWN_WORK_ROW");
  });
});
