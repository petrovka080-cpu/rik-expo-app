import { buildProductionTemplate10000AcceptanceMatrix } from "../../src/lib/ai/estimateTemplate10000";

describe("no fake 10000 claim", () => {
  it("reports green only from 10000 canonical templates and explicit blockers", () => {
    const matrix = buildProductionTemplate10000AcceptanceMatrix();

    expect(matrix.fake_green_claimed).toBe(false);
    expect(matrix.unique_work_templates_total).toBe(10000);
    expect(matrix.unique_canonical_work_keys).toBe(10000);
    expect(matrix.aliases_counted_as_templates).toBe(false);
    expect(matrix.prompt_variants_counted_as_templates).toBe(false);
    expect(matrix.blockers).toHaveLength(0);
  });
});
