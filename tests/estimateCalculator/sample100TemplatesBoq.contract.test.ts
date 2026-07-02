import { validateAllProductionTemplatesBoq10000 } from "../../src/lib/ai/estimateTemplate10000";

jest.setTimeout(120000);

describe("sample 100 templates BOQ matrix", () => {
  it("keeps the representative matrix green", () => {
    const validation = validateAllProductionTemplatesBoq10000({ sampleMatrixCount: 100 });

    expect(validation.sample_matrix_count).toBe(100);
    expect(validation.sample_matrix_passed).toBe(true);
    expect(validation.starter_matrix_passed).toBe(true);
  });
});
