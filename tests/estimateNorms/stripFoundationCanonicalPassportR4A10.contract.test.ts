import {
  REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT as COMPATIBILITY_PASSPORT,
  STRIP_FOUNDATION_FORMULAS as COMPATIBILITY_FORMULAS,
  STRIP_FOUNDATION_INPUTS as COMPATIBILITY_INPUTS,
  STRIP_FOUNDATION_ROWS as COMPATIBILITY_ROWS,
} from "../../scripts/estimate/concreteBackendR6/reinforcedConcreteStripFoundationR1";
import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import {
  buildProfessionalWorkPassport,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { buildProfessionalWorkPassportV2 } from "../../src/lib/estimate/buildProfessionalWorkPassportV2";
import {
  REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT,
  STRIP_FOUNDATION_FORMULAS,
  STRIP_FOUNDATION_INPUTS,
  STRIP_FOUNDATION_ROWS,
  stripFoundationParameterConsumerRowIds,
} from "../../src/lib/estimate/v4/reinforcedConcreteStripFoundationR1";
import { auditStripFoundationScopeCompletenessR1 } from "../../src/lib/estimate/v4/stripFoundationScopeCompletenessR1";
import {
  STRIP_FOUNDATION_COMPOSED_TYPED_CHILD_ROW_IDS_R2,
  STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
  STRIP_FOUNDATION_PROFESSIONAL_INPUTS_R2,
  STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2,
  STRIP_FOUNDATION_SOURCE_GAP_ROW_IDS_R2,
  auditStripFoundationProfessionalCompositionR2,
  compileStripFoundationProfessionalGoldR2,
  stripFoundationProfessionalParameterConsumerRowIdsR2,
} from "../../src/lib/estimate/v4/stripFoundationProfessionalCompositionR2";
import {
  createStripFoundationCanonicalBackendAuditRevision,
  recalculateStripFoundationCanonicalBackendAuditRevision,
} from "../../scripts/estimate/stripFoundationCanonicalBackendAuditAdapter";

const TEMPLATE_ID = "strip_foundation_preliminary_boq_expanded_complex_v1";
const WRONG_BUILDING_FINGERPRINTS = [
  "Здания и жилые комплексы",
  "Несущий каркас",
  "Ограждающие конструкции / фасад",
  "Общестроительные работы каркаса",
  "highRiseBuildingCalculator",
];

describe("R4-A10 canonical strip-foundation catalog passport", () => {
  test("fails the legacy expanded-complex ingress closed instead of compiling a high-rise building", () => {
    const estimate = calculateExpandedComplexEstimate({
      prompt: "устройство ленточного фундамента 100 метров длина и 20 метров ширина",
      familyId: "strip_foundation",
    });
    expect(estimate).toMatchObject({
      work_family_id: "strip_foundation",
      professionalNameRu: "Устройство монолитного железобетонного ленточного фундамента",
      calculatorId: "stripFoundationCanonicalBackendHandoff",
      estimate_level: "NEEDS_INPUT",
      input_parameters: {
        source_length_mention_m: 100,
        source_width_mention_m: 20,
        total_axis_length_m: null,
        strip_width_m: null,
        strip_height_m: null,
        canonical_backend_handoff_required: true,
      },
    });
    expect([
      ...(estimate?.material_rows ?? []),
      ...(estimate?.work_rows ?? []),
      ...(estimate?.equipment_rows ?? []),
      ...(estimate?.service_rows ?? []),
    ]).toEqual([]);
    const serialized = JSON.stringify(estimate);
    for (const fingerprint of WRONG_BUILDING_FINGERPRINTS.slice(1)) expect(serialized).not.toContain(fingerprint);
  });

  test("keeps the historical tooling path as a re-export of the shared product owner", () => {
    expect(COMPATIBILITY_PASSPORT).toBe(REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT);
    expect(COMPATIBILITY_INPUTS).toBe(STRIP_FOUNDATION_INPUTS);
    expect(COMPATIBILITY_FORMULAS).toBe(STRIP_FOUNDATION_FORMULAS);
    expect(COMPATIBILITY_ROWS).toBe(STRIP_FOUNDATION_ROWS);
  });

  test("replaces the high-rise fallback with the 68/28/39 canonical backend definition", () => {
    const passport = buildProfessionalWorkPassport(TEMPLATE_ID);
    expect(passport).not.toBeNull();
    expect(STRIP_FOUNDATION_INPUTS).toHaveLength(68);
    expect(STRIP_FOUNDATION_INPUTS.map((input) => input.parameterId)).toEqual(
      expect.arrayContaining([
        "product_profile_id",
        "plan_volume_calculation_reference",
        "mix_design_or_project_specification_reference",
        "mixture_designation",
        "placement_location",
        "contingency_selection_justification",
        "delivery_schedule_and_truck_capacity",
        "producer_order_confirmation",
        "estimator_approval_reference",
        "reinforcement_product_profile_id",
        "bar_bending_schedule_reference",
        "structural_drawing_and_revision_reference",
        "reinforcement_estimator_approval_reference",
      ]),
    );
    expect(STRIP_FOUNDATION_FORMULAS).toHaveLength(28);
    expect(STRIP_FOUNDATION_ROWS).toHaveLength(39);
    expect(passport).toMatchObject({
      localizedNameRu: "Устройство монолитного железобетонного ленточного фундамента",
      workKey: "strip_foundation",
      familyId: "strip_foundation",
      contentPack: {
        calculatorId: "r6-concrete:reinforced-concrete-strip-foundation",
      },
    });
    expect(passport?.boqRecipe.rowCount).toBe(39);
    expect(passport?.boqRecipe.requiredRowTypes).toEqual([
      "equipment",
      "material",
      "transport",
      "work",
    ]);
    expect(passport?.boqRecipe.allRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ rowId: "excavation_work", rowType: "work", canonicalUnit: "m3" }),
      expect.objectContaining({ rowId: "reinforcement", rowType: "material", canonicalUnit: "t" }),
      expect.objectContaining({ rowId: "concrete_pump", rowType: "equipment", canonicalUnit: "machine_hour" }),
      expect.objectContaining({ rowId: "excavated_soil_disposal", rowType: "transport", canonicalUnit: "t_km" }),
      expect.objectContaining({ rowId: "concrete_delivery", rowType: "transport", canonicalUnit: "m3_km" }),
    ]));
    const serialized = JSON.stringify(passport);
    for (const fingerprint of WRONG_BUILDING_FINGERPRINTS) expect(serialized).not.toContain(fingerprint);
  });

  test("binds every professional parameter to its canonical consumer rows", () => {
    for (const parameter of STRIP_FOUNDATION_INPUTS) {
      expect(stripFoundationParameterConsumerRowIds(parameter.parameterId)).not.toEqual([]);
    }
    expect(stripFoundationParameterConsumerRowIds("bar_bending_schedule_reference")).toEqual(["reinforcement"]);
    expect(stripFoundationParameterConsumerRowIds("placement_location")).toEqual(["main_concrete"]);
    expect(stripFoundationParameterConsumerRowIds("concrete_class")).toContain("main_concrete");

    const passport = buildProfessionalWorkPassport(TEMPLATE_ID);
    const reinforcement = passport?.boqRecipe.allRows.find((row) => row.rowId === "reinforcement");
    const mainConcrete = passport?.boqRecipe.allRows.find((row) => row.rowId === "main_concrete");
    expect(reinforcement?.formulaContext?.professionalParameterIds).toContain("bar_bending_schedule_reference");
    expect(mainConcrete?.formulaContext?.professionalParameterIds).toContain("placement_location");
  });

  test("does not mistake the compiler's own 39-row inventory for an independent completeness proof", () => {
    const audit = auditStripFoundationScopeCompletenessR1();

    expect(audit).toMatchObject({
      status: "RED",
      productionBuilderUsedAsOracle: false,
      fixedRowQuotaUsed: false,
    });
    expect(audit.unresolvedExpectationIds).toEqual(expect.arrayContaining([
      "site_layout_and_axis_control",
      "as_built_survey_and_record",
      "formwork_accessories_and_release_agent",
      "formwork_cleaning_and_return_logistics",
      "formwork_tie_consumable_components",
      "reinforcement_accessories",
      "reinforcement_handling_and_control",
      "reinforcement_lifting",
      "concrete_quality_control",
      "water_curing_material_and_supply",
      "concrete_construction_joints",
      "waterproofing_system_accessories",
      "horizontal_cutoff_waterproofing",
      "temporary_excavation_support_and_dewatering",
      "cleanup_and_non_soil_construction_waste",
    ]));
    expect(audit.decisions.find((decision) =>
      decision.expectationId === "reinforcement_handling_and_control"
    )?.disposition).toBe("AVAILABLE_TYPED_CHILD_NOT_COMPOSED");
    expect(audit.decisions.find((decision) =>
      decision.expectationId === "concrete_placement_and_compaction"
    )?.disposition).toBe("INCLUDED_IN_CURRENT_DEFINITION");
    expect(audit.decisions.find((decision) =>
      decision.expectationId === "concrete_quality_control"
    )?.disposition).toBe("AVAILABLE_TYPED_CHILD_NOT_COMPOSED");
  });

  test("composes unique typed-child resources and closes source-backed gaps explicitly", () => {
    expect(auditStripFoundationProfessionalCompositionR2()).toMatchObject({
      status: "GREEN",
      errors: [],
      baseRowCount: 39,
      typedChildRowCount: 10,
      sourceGapRowCount: 27,
      composedRowCount: 76,
    });
    const rowIds = STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2.map((row) => row.rowId);
    expect(rowIds).toEqual(expect.arrayContaining([
      ...STRIP_FOUNDATION_COMPOSED_TYPED_CHILD_ROW_IDS_R2,
      ...STRIP_FOUNDATION_SOURCE_GAP_ROW_IDS_R2,
    ]));
    expect(rowIds).not.toEqual(expect.arrayContaining([
      "material:reinforcement:steel-approved-schedule",
      "material:concrete:ready-mix",
      "work:concrete:place-and-compact",
      "delivery:concrete:ready-mix",
    ]));

    const scope = auditStripFoundationScopeCompletenessR1({ currentDefinitionRowIds: rowIds });
    expect(scope.status).toBe("GREEN");
    expect(scope.unresolvedExpectationIds).toEqual([]);
    expect(scope.decisions.find((decision) =>
      decision.expectationId === "reinforcement_handling_and_control"
    )).toMatchObject({
      disposition: "INCLUDED_IN_CURRENT_DEFINITION",
      composedTypedChildRowIds: [
        "work:reinforcement:unload-store",
        "work:reinforcement:cover-control",
        "service:reinforcement:inspection",
        "service:reinforcement:mill-certificates",
      ],
    });
    expect(STRIP_FOUNDATION_PROFESSIONAL_INPUTS_R2.filter((input) =>
      stripFoundationProfessionalParameterConsumerRowIdsR2(input.parameterId).length === 0
    )).toEqual([]);
    const compiled = compileStripFoundationProfessionalGoldR2();
    expect(compiled).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "material" }),
      expect.objectContaining({ category: "construction_work" }),
      expect.objectContaining({ category: "machine_equipment" }),
      expect.objectContaining({ category: "delivery" }),
      expect.objectContaining({ category: "service" }),
    ]));
    expect(compiled).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rowId: "material:waterproofing:system-primer",
        normalizedUom: "l",
        evaluatedQuantity: "6",
      }),
      expect.objectContaining({
        rowId: "work:waterproofing:system-primer-application",
        normalizedUom: "m2",
        evaluatedQuantity: "120",
      }),
      expect.objectContaining({
        rowId: "material:reinforcement:spacer-chairs",
        normalizedUom: "piece",
        evaluatedQuantity: "480",
      }),
      expect.objectContaining({
        rowId: "material:formwork:release-agent",
        normalizedUom: "l",
        evaluatedQuantity: "1.2",
      }),
      expect.objectContaining({
        rowId: "bituminous_waterproofing",
        normalizedUom: "l",
        evaluatedQuantity: "480",
      }),
      expect.objectContaining({
        rowId: "material:waterproofing:detail-reinforcement",
        normalizedUom: "m2",
        evaluatedQuantity: "132",
      }),
      expect.objectContaining({
        rowId: "delivery:formwork:return-kit",
        normalizedUom: "t_km",
        evaluatedQuantity: "216",
      }),
      expect.objectContaining({
        rowId: "service:foundation:as-built-survey",
        normalizedUom: "m",
        evaluatedQuantity: "40",
      }),
      expect.objectContaining({
        rowId: "document:foundation:as-built-survey-record",
        normalizedUom: "document",
        evaluatedQuantity: "1",
      }),
      expect.objectContaining({
        rowId: "material:waterproofing:horizontal-cutoff",
        normalizedUom: "m2",
        evaluatedQuantity: "22",
      }),
      expect.objectContaining({
        rowId: "work:waterproofing:horizontal-cutoff-install",
        normalizedUom: "m2",
        evaluatedQuantity: "22",
      }),
      expect.objectContaining({
        rowId: "material:formwork:tie-consumables-separate",
        normalizedUom: "piece",
        evaluatedQuantity: "160",
        procurementEligible: true,
      }),
      expect.objectContaining({
        rowId: "material:earthworks:excavation-support",
        normalizedUom: "m2",
        evaluatedQuantity: "96",
      }),
      expect.objectContaining({
        rowId: "equipment:earthworks:dewatering",
        normalizedUom: "machine_hour",
        evaluatedQuantity: "14",
      }),
      expect.objectContaining({
        rowId: "work:foundation:site-cleanup",
        normalizedUom: "man_hour",
        evaluatedQuantity: "12",
      }),
      expect.objectContaining({
        rowId: "delivery:foundation:construction-waste-haul",
        normalizedUom: "t_km",
        evaluatedQuantity: "12",
      }),
      expect.objectContaining({
        rowId: "service:foundation:construction-waste-disposal",
        normalizedUom: "t",
        evaluatedQuantity: "0.8",
      }),
    ]));
  });

  test("keeps water-curing material and separate supply equipment conditional and source-owned", () => {
    const compiled = compileStripFoundationProfessionalGoldR2({
      ...STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
      curing_method: "water",
      curing_water_m3: 12,
      curing_water_supply_mode: "separate_equipment",
      curing_water_supply_equipment_designation: "PROJECT-WATER-SUPPLY-01",
      curing_water_supply_machine_h: 9,
    });
    expect(compiled).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rowId: "material:concrete:curing-water",
        evaluatedQuantity: "12",
      }),
      expect.objectContaining({
        rowId: "equipment:concrete:curing-water-supply",
        evaluatedQuantity: "9",
      }),
    ]));
    expect(compiled.some((row) => row.rowId === "curing_membrane")).toBe(false);

    const withoutSeparateEquipment = compileStripFoundationProfessionalGoldR2({
      ...STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
      curing_method: "water",
      curing_water_m3: 12,
      curing_water_supply_mode: "site_connection_included_in_curing_work",
    });
    expect(withoutSeparateEquipment.some(
      (row) => row.rowId === "material:concrete:curing-water",
    )).toBe(true);
    expect(withoutSeparateEquipment.some(
      (row) => row.rowId === "equipment:concrete:curing-water-supply",
    )).toBe(false);
  });

  test("keeps included and separately purchased formwork tie consumables mutually exclusive", () => {
    const included = compileStripFoundationProfessionalGoldR2({
      ...STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
      formwork_tie_consumables_supply_mode: "included_in_formwork_system",
    });
    expect(included).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rowId: "material:formwork:tie-consumables-included",
        evaluatedQuantity: "160",
        includedInParentRate: true,
        procurementEligible: false,
      }),
    ]));
    expect(included.some(
      (row) => row.rowId === "material:formwork:tie-consumables-separate",
    )).toBe(false);
  });

  test("does not add temporary works or separate waste costs when the project says they are not separate", () => {
    const compiled = compileStripFoundationProfessionalGoldR2({
      ...STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
      excavation_support_required: false,
      excavation_dewatering_required: false,
      site_cleanup_cost_mode: "included_in_primary_works",
      non_soil_waste_handling_mode: "included_in_primary_works",
    });
    expect(compiled.some((row) => [
      "material:earthworks:excavation-support",
      "work:earthworks:excavation-support-install-remove",
      "equipment:earthworks:dewatering",
      "work:foundation:site-cleanup",
      "material:foundation:waste-packaging",
      "work:foundation:waste-sort-load",
      "delivery:foundation:construction-waste-haul",
      "service:foundation:construction-waste-disposal",
    ].includes(row.rowId))).toBe(false);
  });

  test("gives legacy estimates editable non-applicable defaults for newly introduced conditional branches", () => {
    const defaults = Object.fromEntries(STRIP_FOUNDATION_PROFESSIONAL_INPUTS_R2
      .filter((parameter) => parameter.defaultValue != null)
      .map((parameter) => [parameter.parameterId, parameter.defaultValue]));
    expect(defaults).toMatchObject({
      formwork_supply_mode: "contractor_owned",
      as_built_survey_included: false,
      horizontal_cutoff_waterproofing_included: false,
      formwork_tie_consumables_required: false,
      excavation_support_required: false,
      excavation_dewatering_required: false,
      site_cleanup_cost_mode: "included_in_primary_works",
      non_soil_waste_handling_mode: "included_in_primary_works",
    });
  });

  test("uses the same shared owner at every selectable estimate level", () => {
    const templateIds = listProfessionalWorkPassportTemplateIds()
      .filter((templateId) => templateId.startsWith("strip_foundation_"));
    expect(templateIds).toHaveLength(5);
    for (const templateId of templateIds) {
      const passport = buildProfessionalWorkPassportV2(templateId);
      expect(passport).toMatchObject({
        identity: {
          canonical_name_ru: "Устройство монолитного железобетонного ленточного фундамента",
          calculator_id: "r6-concrete:reinforced-concrete-strip-foundation",
        },
        validation: {
          status: "SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW",
          blockers: [],
        },
      });
      expect(passport?.quantity_formulas).toHaveLength(39);
      const serialized = JSON.stringify(passport);
      for (const fingerprint of WRONG_BUILDING_FINGERPRINTS) expect(serialized).not.toContain(fingerprint);
    }
  });

  test("keeps an explicitly selected foundation sub-operation template locked across recalculation", () => {
    const catalogTemplateId =
      "concrete_foundation_interior_strip_foundation_pour_standard_professional_expanded_v1";
    const passport = buildProfessionalWorkPassport(catalogTemplateId);
    if (!passport) throw new Error("explicit_foundation_sub_operation_passport_missing");
    const first = createEstimateDraftRevision({
      estimateDraftId: "strip-foundation-explicit-sub-operation",
      rawInput: `${passport.localizedNameRu} 100 м2`,
      selectedTemplateId: catalogTemplateId,
      selectedTemplateName: passport.localizedNameRu,
      createdAt: "2026-09-06T00:00:00.000Z",
    });
    const patch = parseUserParamPatch({
      revision: first,
      operation: first.params.area_m2 ? "update_param" : "add_param",
      paramKey: "area_m2",
      rawValue: "80 м2",
    });
    const second = recalculateEstimateDraftRevision(first, patch, {
      createdAt: "2026-09-06T00:01:00.000Z",
      revisionIndex: 2,
    }).revision;

    expect(first.selectedTemplateId).toBe(catalogTemplateId);
    expect(second.selectedTemplateId).toBe(catalogTemplateId);
    expect(first.boq.rows).toHaveLength(passport.boqRecipe.rowCount);
    expect(second.boq.rows).toHaveLength(passport.boqRecipe.rowCount);
    expect(second.previousRevisionId).toBe(first.revisionId);
    expect(second.params.area_m2?.value).toBe(80);
    expect(second.selectedTemplateId).not.toBe("professional-estimate-passport:v4:strip_foundation");
  });

  test("projects every selectable assembly level through the shared R6 backend for regression proofs", () => {
    const templateIds = listProfessionalWorkPassportTemplateIds()
      .filter((templateId) => templateId.startsWith("strip_foundation_"));
    for (const [index, templateId] of templateIds.entries()) {
      const passport = buildProfessionalWorkPassport(templateId);
      if (!passport) throw new Error(`strip_foundation_passport_missing:${templateId}`);
      const first = createStripFoundationCanonicalBackendAuditRevision({
        passport,
        estimateDraftId: `strip-foundation-r6-audit-${index}`,
        rawInput: `${passport.localizedNameRu}: backend regression fixture`,
        createdAt: "2026-09-06T00:00:00.000Z",
        artifacts: {
          snapshotId: `strip-snapshot-${index}`,
          pdfArtifactId: `strip-pdf-${index}`,
          buyerHandoffId: `strip-buyer-${index}`,
          artifactsValidForRevisionId: `strip-revision-${index}`,
        },
      });
      const result = recalculateStripFoundationCanonicalBackendAuditRevision({
        passport,
        previous: first,
        operation: "update_param",
        paramKey: "total_axis_length_m",
        rawValue: "80 m",
        createdAt: "2026-09-06T00:01:00.000Z",
        revisionIndex: 2,
      });

      expect(first.selectedTemplateId).toBe(templateId);
      expect(first.matchedFamily).toBe("strip_foundation");
      expect(first.boq.rows).toHaveLength(29);
      expect(new Set(first.boq.rows.map((row) => row.rowType))).toEqual(
        new Set(["material", "work", "equipment", "transport"]),
      );
      expect(first.boq.rows.some((row) => row.rowType === "document")).toBe(false);
      expect(first.boq.rows.every((row) => row.sourceParameters?.canonicalBackendProjectionV1 === true)).toBe(true);
      expect(result.revision.previousRevisionId).toBe(first.revisionId);
      expect(result.revision.params.total_axis_length_m?.value).toBe(80);
      expect(result.diff.changedRowsCount).toBeGreaterThan(0);
      expect(result.diff.staleArtifactsAfterEdit).toEqual({
        snapshotInvalidated: true,
        pdfInvalidated: true,
        buyerHandoffInvalidated: true,
      });
    }
  });

  test("exposes typed technological questions and condition dependencies without building defaults", () => {
    const passport = buildProfessionalWorkPassportV2(TEMPLATE_ID);
    expect(passport?.validation).toMatchObject({
      status: "SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW",
      blockers: [],
    });
    expect(passport?.parameter_graph.p0_required).toEqual([
      "strip_height_m",
      "total_axis_length_m",
      "strip_width_m",
    ]);
    expect(passport?.parameter_graph.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({
        canonical_key: "scope_variant",
        input_type: "select",
        allowed_values: ["full_reinforced_structure", "placement_only"],
      }),
      expect.objectContaining({ canonical_key: "groundworks_included", input_type: "boolean" }),
      expect.objectContaining({
        canonical_key: "excavation_volume_m3",
        input_type: "number",
        dependencies: expect.arrayContaining(["groundworks_included", "scope_variant"]),
      }),
    ]));
    const parameterKeys = passport?.parameter_graph.parameters.map((parameter) => parameter.canonical_key) ?? [];
    expect(parameterKeys).not.toEqual(expect.arrayContaining(["area_m2", "floors", "structural_concrete_m3"]));
    expect(passport).toMatchObject({
      material_assemblies: expect.arrayContaining([expect.objectContaining({ material_code: "main_concrete" })]),
      work_operations: expect.arrayContaining([expect.objectContaining({ operation_code: "concrete_placement" })]),
      equipment: expect.arrayContaining([expect.objectContaining({ equipment_code: "concrete_pump" })]),
      services: expect.arrayContaining([expect.objectContaining({ service_code: "concrete_delivery" })]),
    });
  });
});
