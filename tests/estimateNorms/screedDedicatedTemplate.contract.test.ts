import { runEstimateEngineRoutingAudit } from "../../scripts/estimate/auditEstimateEngineRouting";
import { compileProductionExpandedEstimate10000 } from "../../src/lib/ai/estimateTemplate10000";

const RETIRED_CN87_SOURCE_ID =
  "src_professional_norm_pack_screed_cement_sand_mix_kg_m2_50mm_v1";

describe("screed dedicated estimate template", () => {
  it("keeps the 100 m2 screed route dedicated while product-specific norms fail closed", () => {
    const summary = runEstimateEngineRoutingAudit({ writeSummary: false });
    const screedCase = summary.routing_cases.find((item) => item.case_id === "screed_100_thickness_50");
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "screed_cement_sand_50mm",
      quantity: 100,
      countryCode: "KG",
    });

    expect(summary.screed_has_dedicated_template).toBe(true);
    expect(summary.screed_case_has_dedicated_template).toBe(true);
    expect(screedCase).toMatchObject({
      selected_work_key: "screed_cement_sand_50mm",
      selected_template_key: "screed_cement_sand_50mm_project_template_group_v1",
      uses_10k_template_catalog: true,
      uses_norm_pack: false,
      row_count: 59,
      real_norm_pack_rows_count: 0,
      all_rows_have_trace_schema: true,
    });
    expect(compiled.rows).toHaveLength(59);
    expect(compiled.rows.every((row) =>
      row.normSourceId.startsWith("src_professional_norm_pack_catalog_") &&
      row.calculationTrace.includes("normSource=")
    )).toBe(true);
    expect(compiled.rows.some((row) => row.normSourceId === RETIRED_CN87_SOURCE_ID)).toBe(false);
    expect(compiled.rows.some((row) => row.normSourceId.includes("flooring_ceresit_ct17"))).toBe(false);
  });
});
