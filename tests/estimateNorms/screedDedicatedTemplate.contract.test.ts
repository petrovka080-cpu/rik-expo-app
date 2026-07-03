import { runEstimateEngineRoutingAudit } from "../../scripts/estimate/auditEstimateEngineRouting";
import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("screed dedicated estimate template", () => {
  it("routes the 100 m2 screed flow through a dedicated screed project template", () => {
    const summary = runEstimateEngineRoutingAudit({ writeSummary: false });
    const screedCase = summary.routing_cases.find((item) => item.case_id === "screed_100_thickness_50");
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "screed_cement_sand_50mm",
      quantity: 100,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));

    expect(summary.screed_has_dedicated_template).toBe(true);
    expect(summary.screed_case_has_dedicated_template).toBe(true);
    expect(screedCase?.selected_work_key).toBe("screed_cement_sand_50mm");
    expect(screedCase?.uses_10k_template_catalog).toBe(true);
    expect(screedCase?.uses_norm_pack).toBe(true);
    expect(realRows.some((row) => row.normSourceId.includes("screed_cement_sand_mix"))).toBe(true);
    expect(realRows.some((row) => row.normSourceId.includes("flooring_ceresit_ct17"))).toBe(true);
  });
});
