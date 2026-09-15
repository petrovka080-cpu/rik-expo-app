import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import formworkNormPack from "../../data/estimate-norms/professional/formwork.json";
import {
  buildCanonicalProcurementProjection,
  canonicalArtifactUnit,
  selectCanonicalArtifactRows,
  type CanonicalArtifactRevision,
  type CanonicalArtifactRow,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate/formatEstimateUnitLabel";
import {
  FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
  FORMWORK_FRAMI_XLIFE_FORMULAS,
  FORMWORK_FRAMI_XLIFE_PARAMETERS,
  FORMWORK_FRAMI_XLIFE_RESOURCES,
  FORMWORK_FRAMI_XLIFE_SENSITIVITY_INPUT,
  FORMWORK_FRAMI_XLIFE_SOURCE_ID,
  FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
  compileFormworkFramiXlifeProjectKitR1,
} from "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";

function rowById(rows: readonly Record<string, unknown>[], rowId: string): Record<string, unknown> {
  const row = rows.find((candidate) => candidate.row_id === rowId);
  if (!row) throw new Error(`missing test row ${rowId}`);
  return row;
}

describe("complete Doka Frami Xlife project-scheduled formwork estimate", () => {
  test("adds a reviewed technology source without replacing the RICS measurement norm", () => {
    expect(formworkNormPack.source_pack_version)
      .toBe("2026.09-rics-nrm2-formwork-measurement-primary-review-r2");
    expect(formworkNormPack.norm_items).toHaveLength(1);
    expect(formworkNormPack.norm_items[0]?.norm_id)
      .toBe("formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1");
    expect(formworkNormPack.technology_sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source_id: FORMWORK_FRAMI_XLIFE_SOURCE_ID,
        document_version: "999810202-2023-11",
        review_status: "reviewed",
        limitations: expect.arrayContaining([
          "no_universal_bill_of_materials_or_turnover_factor_is_published",
          "an_approved_project_layout_and_project_or_supplier_schedule_are_required_for_every_commercial_quantity",
        ]),
      }),
    ]));
  });

  test("compiles one full project schedule through the shared canonical core with no preliminary needs", async () => {
    const result = await compileFormworkFramiXlifeProjectKitR1({ ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT });

    expect(FORMWORK_FRAMI_XLIFE_PARAMETERS).toHaveLength(52);
    expect(FORMWORK_FRAMI_XLIFE_PARAMETERS.every((parameter) => (
      parameter.required === true
      && parameter.default_value == null
      && parameter.truth_metadata.preliminary_compilation_allowed === false
    ))).toBe(true);
    expect(FORMWORK_FRAMI_XLIFE_FORMULAS).toHaveLength(20);
    expect(FORMWORK_FRAMI_XLIFE_RESOURCES).toHaveLength(24);
    expect(result.rows).toHaveLength(24);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.totals).toMatchObject({
      amount: "0",
      includedRowCount: 17,
      excludedRowCount: 7,
      pricedRowCount: 0,
      unpricedRowCount: 17,
      currencyCode: "KGS",
    });
    expect(new Set(result.rows.map((row) => row.category))).toEqual(new Set([
      "material",
      "construction_work",
      "equipment",
      "service",
      "delivery",
    ]));
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("keeps installed area, returnable rental, consumables, labor, services and two-way logistics separate", async () => {
    const result = await compileFormworkFramiXlifeProjectKitR1({ ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT });
    const quantity = (rowId: string) => rowById(result.rows, rowId).quantity;

    expect(quantity("information:formwork:measured-contact-area")).toBe("100");
    expect(quantity("equipment:formwork:frami-xlife-panels-rental")).toBe("336");
    expect(quantity("equipment:formwork:frami-xlife-corners-rental")).toBe("112");
    expect(quantity("equipment:formwork:frami-panel-connectors-rental")).toBe("896");
    expect(quantity("equipment:formwork:frami-flat-ties-10-80-rental")).toBe("448");
    expect(quantity("equipment:formwork:frami-flat-tie-clips-rental")).toBe("896");
    expect(quantity("equipment:formwork:frami-foundation-clamps-rental")).toBe("448");
    expect(quantity("equipment:formwork:plumbing-struts-260-rental")).toBe("112");
    expect(quantity("material:formwork:perforated-tape-50x2")).toBe("50");
    expect(quantity("material:formwork:joint-sealing-tape")).toBe("40");
    expect(quantity("material:formwork:release-agent")).toBe("8");
    expect(quantity("work:formwork:receive-sort-handle-kit")).toBe("16");
    expect(quantity("work:formwork:assemble-install-align")).toBe("72");
    expect(quantity("work:formwork:strip-clean-return-preparation")).toBe("32");
    expect(quantity("service:formwork:engineer-layout-review")).toBe("1");
    expect(quantity("equipment:formwork:crane-handling")).toBe("6");
    expect(quantity("delivery:formwork:outbound-kit")).toBe("60");
    expect(quantity("delivery:formwork:return-kit")).toBe("60");

    const panelGraph = (rowById(result.rows, "equipment:formwork:frami-xlife-panels-rental")
      .calculation_trace as Record<string, Record<string, unknown>>).resourceGraph;
    expect(panelGraph).toMatchObject({
      supplyMode: "RENTAL_RETURNABLE",
      returnable: true,
      stageAccounting: "PEAK_SIMULTANEOUS_KIT_TIMES_TOTAL_RENTAL_DURATION",
      universalTurnoverFactorApplied: false,
    });
    const consumableGraph = (rowById(result.rows, "material:formwork:perforated-tape-50x2")
      .calculation_trace as Record<string, Record<string, unknown>>).resourceGraph;
    expect(consumableGraph).toMatchObject({
      supplyMode: "PURCHASE_FOR_PROJECT",
      wasteAndLossTreatment: "INCLUDED_IN_APPROVED_SCHEDULE_NO_ADDITIONAL_FACTOR",
      packageRounding: "NOT_APPLIED_PROJECT_SCHEDULE_ALREADY_COMMERCIAL",
    });
  });

  test("preserves equipment rental, consumables, service, crane and both transport legs in procurement", async () => {
    const compiled = await compileFormworkFramiXlifeProjectKitR1({ ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT });
    const selection = selectCanonicalArtifactRows(compiled.rows as CanonicalArtifactRow[]);
    const projection = buildCanonicalProcurementProjection({
      revision: {
        id: "formwork-revision-1",
        release_id: "formwork-release-1",
        catalog_id: compiled.revisionProjection.catalogId,
        checksum_sha256: "formwork-checksum-1",
        row_count: compiled.rows.length,
        currency_code: "KGS",
        input_parameters: compiled.parameters,
        totals: compiled.totals,
      } as CanonicalArtifactRevision,
      procurementRows: selection.procurementRows,
    });

    expect(selection.estimateRows).toHaveLength(17);
    expect(projection.selectedRowCount).toBe(14);
    expect(new Set(projection.rows.map((row) => row.category))).toEqual(new Set([
      "material",
      "equipment",
      "service",
      "delivery",
    ]));
    expect(projection.rows.filter((row) => row.category === "equipment")).toHaveLength(8);
    expect(projection.rows.filter((row) => row.category === "material")).toHaveLength(3);
    expect(projection.rows.filter((row) => row.category === "service")).toHaveLength(1);
    expect(projection.rows.filter((row) => row.category === "delivery")).toHaveLength(2);
    expect(projection.rows.some((row) => row.category === "construction_work")).toBe(false);
    expect(projection.rows.some((row) => row.rowId.includes("deposit"))).toBe(false);
    expect(projection.rows.some((row) => row.rowId.includes("not-applicable"))).toBe(false);
  });

  test("keeps every explicit N/A decision visible in the professional composition but non-payable", async () => {
    const result = await compileFormworkFramiXlifeProjectKitR1({ ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT });
    const notApplicable = result.rows.filter((row) => row.row_id.includes("not-applicable"));

    expect(notApplicable).toHaveLength(5);
    expect(notApplicable.every((row) => (
      row.quantity === "0"
      && row.included_in_estimate === false
      && row.included_in_procurement === false
      && (row.calculation_trace as Record<string, Record<string, unknown>>)
        .resourceGraph.costTreatment === "INFORMATIONAL_SCOPE"
    ))).toBe(true);
    expect(rowById(result.rows, "information:formwork:installation-stages")).toMatchObject({
      quantity: "2",
      included_in_estimate: false,
      included_in_procurement: false,
    });
  });

  test("does not derive a universal kit from area; a sensitivity revision changes only submitted schedule values", async () => {
    const exact = await compileFormworkFramiXlifeProjectKitR1({ ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT });
    const areaOnly = await compileFormworkFramiXlifeProjectKitR1({
      ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
      measured_formwork_contact_area_m2: 120,
    });
    const revised = await compileFormworkFramiXlifeProjectKitR1({ ...FORMWORK_FRAMI_XLIFE_SENSITIVITY_INPUT });

    expect(rowById(areaOnly.rows, "information:formwork:measured-contact-area").quantity).toBe("120");
    for (const exactRow of exact.rows.filter((row) => row.row_id !== "information:formwork:measured-contact-area")) {
      expect(rowById(areaOnly.rows, exactRow.row_id).quantity).toBe(exactRow.quantity);
    }
    expect(rowById(revised.rows, "equipment:formwork:frami-xlife-panels-rental").quantity).toBe("392");
    expect(rowById(revised.rows, "material:formwork:perforated-tape-50x2").quantity).toBe("60");
    expect(rowById(revised.rows, "work:formwork:assemble-install-align").quantity).toBe("86");
    expect(rowById(revised.rows, "delivery:formwork:outbound-kit").quantity).toBe("70");
  });

  test.each([
    ["wrong system", { formwork_system_profile_id: "standard-profile:generic-formwork" }, "PARAMETER_VALIDATION_FAILED"],
    ["missing layout", { project_formwork_layout_reference: undefined }, "PARAMETER_VALIDATION_FAILED"],
    ["wall too thick for flat tie", { foundation_wall_thickness_cm: 81 }, "PARAMETER_VALIDATION_FAILED"],
    ["wrong measurement class", { single_or_double_sided_scope: "UNDECLARED" }, "PHYSICAL_NORM_APPLICABILITY_FAILED"],
  ])("rejects %s", async (_name, patch, code) => {
    await expect(compileFormworkFramiXlifeProjectKitR1({
      ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
      ...patch,
    })).rejects.toMatchObject({ code });
  });

  test("contains no hidden area rate, package multiplier or turnover factor", () => {
    expect(FORMWORK_FRAMI_XLIFE_EXACT_INPUT.formwork_system_profile_id)
      .toBe(FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID);
    expect(FORMWORK_FRAMI_XLIFE_FORMULAS.map((item) => item.expression_source).join("\n"))
      .not.toMatch(/m2_per_m3|turnover|waste|package/iu);
    expect(FORMWORK_FRAMI_XLIFE_FORMULAS.filter((item) => (
      item.expression_source.includes("measured_formwork_contact_area_m2")
    )).map((item) => item.formula_id)).toEqual(["formwork_measured_contact_area_v1"]);
    expect(formatEstimateUnitLabel("piece_day")).toBe("шт.·сут");
    expect(canonicalArtifactUnit({ unit_id: "piece_day" })).toBe("шт.·сут");
  });

  test("publisher prepares a forward-only local successor and never activates or deploys it", () => {
    const source = readFileSync(resolve(
      process.cwd(),
      "scripts/estimate/r4a13/prepareFormworkFramiXlifeSuccessor.ts",
    ), "utf8");
    expect(source).toContain("compileFormworkFramiXlifeProjectKitR1");
    expect(source).toContain('compilerOwner: "compileCanonicalEstimateCore"');
    expect(source).toContain("MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (7).md");
    expect(source).toContain('status: "GREEN_FORMWORK_FRAMI_XLIFE_SUCCESSOR_PRECHECK_NO_MUTATION"');
    expect(source).toContain('activationPerformed: false');
    expect(source).toContain('deployPerformed: false');
    expect(source).toContain('otaPerformed: false');
    expect(source).not.toContain("estimate_runtime_pointer");
    expect(source).not.toContain("estimate_search_runtime_pointer");
    expect(source).not.toContain("status='active'");
  });
});
