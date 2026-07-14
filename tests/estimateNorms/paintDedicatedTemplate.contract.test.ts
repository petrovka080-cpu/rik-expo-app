import { runEstimateEngineRoutingAudit } from "../../scripts/estimate/auditEstimateEngineRouting";
import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("paint dedicated estimate template", () => {
  it("routes the 200 m2 paint flow through a dedicated paint project template", () => {
    const summary = runEstimateEngineRoutingAudit({ writeSummary: false });
    const paintCase = summary.routing_cases.find((item) => item.case_id === "paint_200_two_coats");
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "paint_wall_ceiling_2_coats",
      quantity: 200,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));

    expect(summary.paint_has_dedicated_template).toBe(true);
    expect(summary.paint_case_mapped_to_plaster_group).toBe(false);
    expect(paintCase?.selected_work_key).toBe("paint_wall_ceiling_2_coats");
    expect(paintCase?.selected_norm_work_group).toBe("paint");
    expect(paintCase?.uses_norm_pack).toBe(true);
    expect(realRows.length).toBeGreaterThanOrEqual(2);
    expect(new Set(realRows.map((row) => row.unit))).toContain("l");
  });
});
