import {
  STRIP_FOUNDATION_GOLD_INPUT,
  compileStripFoundationEstimate,
} from "../../src/lib/estimate/v4/reinforcedConcreteStripFoundationR1";
import {
  REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
} from "../../src/lib/estimate/v4/domainFactory";

const EXACT_REINFORCEMENT_SCHEDULE_INPUT = Object.freeze({
  ...STRIP_FOUNDATION_GOLD_INPUT,
  reinforcement_product_profile_id: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  reinforcement_mass_t: 2.4,
  bar_bending_schedule_reference: "BBS-S01-REV-D",
  structural_drawing_and_revision_reference: "STR-S01-REV-D",
  bar_standard_and_grade: "ASTM A615 Grade 60",
  bar_size_designation: "No. 5",
  nominal_diameter_mm: 15.875,
  shape_straight_bent_curved_or_link: "BENT:shape-code-21",
  bar_count_and_cut_length_m: "160 bars x 9.75 m approved cut length",
  selected_standard_mass_kg_per_m: 1.552,
  laps_hooks_chairs_connectors_and_accessories_scope:
    "PROJECT_SCOPE:all BBS laps and hooks, chairs scheduled separately",
  fabrication_allowance_if_documented: "NONE:INCLUDED_IN_APPROVED_SCHEDULE",
  supplier_bundle_or_length_constraints: "NONE:NO_AUTOMATIC_BUNDLE_ROUNDING",
  reinforcement_estimator_approval_reference: "EST-REBAR-REV-D",
});

describe("strip-foundation approved reinforcement schedule integration", () => {
  test("routes the approved 2.4 t schedule without a kg-per-m3 or waste multiplier", () => {
    const row = compileStripFoundationEstimate(EXACT_REINFORCEMENT_SCHEDULE_INPUT)
      .find((candidate) => candidate.rowId === "reinforcement");
    expect(row).toMatchObject({
      canonicalRuName: "Арматурная сталь по проектной ведомости стержней",
      evaluatedQuantity: "2.4",
      normalizedUom: "t",
      normSource: { sourceKey: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID },
      professionalPhysicalNormApplicabilityV1: {
        status: "APPLIED",
        source_id: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
        calculated_reinforcement_schedule_weight_kg: 2400,
      },
    });
  });

  test("keeps the schedule mass stable when concrete geometry changes", () => {
    const rows = compileStripFoundationEstimate({
      ...EXACT_REINFORCEMENT_SCHEDULE_INPUT,
      total_axis_length_m: 80,
    });
    expect(rows.find((row) => row.rowId === "reinforcement")?.evaluatedQuantity).toBe("2.4");
    expect(rows.find((row) => row.rowId === "main_concrete")?.evaluatedQuantity).toBe("61.2");
  });

  test("fails closed for an invalid schedule shape and leaves generic input unbound", () => {
    expect(() => compileStripFoundationEstimate({
      ...EXACT_REINFORCEMENT_SCHEDULE_INPUT,
      shape_straight_bent_curved_or_link: "ASSUMED",
    })).toThrow("PHYSICAL_NORM_CLASSIFICATION_INVALID:shape_straight_bent_curved_or_link=ASSUMED");
    const generic = compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT)
      .find((row) => row.rowId === "reinforcement");
    expect(generic?.professionalPhysicalNormApplicabilityV1).toBeUndefined();
    expect(generic?.normSource.sourceKey).toBe("project_documentation");
  });
});
