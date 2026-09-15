import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../../src/lib/estimate/backendPlatform/formulaGraph";
import { canonicalMaterialQuantityBasisFromRow } from "../../src/lib/estimate/backendPlatform/canonicalMaterialQuantityProjection";
import {
  BIA_TN10_MASONRY_NORM_ID,
  BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
  BIA_TN10_MASONRY_SOURCE_ID,
  BIA_TN10_MASONRY_SOURCE_METADATA,
} from "../../src/lib/estimate/v4/domainFactory";

const EXACT_PARAMETERS = {
  product_profile_id: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
  measured_net_brick_wall_area_m2: 90,
  gross_wall_area_and_opening_deductions: "GROSS_M2=100; OPENINGS_M2=10; NET_M2=90",
  fired_clay_brick_confirmed: true,
  brick_manufacturer_and_designation: "Acme Brick Modular A-101",
  specified_and_nominal_dimensions: "specified=194x92x57mm; nominal=200x100x67mm",
  joint_width_mm: 10,
  wall_thickness_and_wythe_configuration: "WYTHE:single; THICKNESS_MM=100",
  bond_pattern: "RUNNING_BOND",
  selected_bia_tn10_table_4_row: "BIA_TN10_TABLE4:modular-single-wythe-running-bond-10mm",
  selected_brick_quantity_per_m2: 60,
  selected_mortar_quantity_per_m2: 0.02,
  applicable_bond_correction_factors: "BRICK_FACTOR=1.05; MORTAR_FACTOR=1.10",
  selected_project_breakage_and_waste_allowances: "BRICK_PERCENT=3; MORTAR_PERCENT=5",
  supplier_package_quantities: "BRICK_PIECES=500; MORTAR_M3=0.25",
  project_architect_engineer_or_estimator_approval_reference: "A-E-EST-BRICK-REV-C",
  brick_bond_correction_factor: 1.05,
  brick_breakage_percent: 3,
  brick_supplier_package_pieces: 500,
} as const;

function input(outputFormulaSource: string) {
  const formula = compileFormulaGraph(
    "measured_net_brick_wall_area_m2 * selected_brick_quantity_per_m2 * brick_bond_correction_factor",
  );
  const outputFormula = compileFormulaGraph(outputFormulaSource);
  return {
    operation: "compile" as const,
    compilerVersion: "canonical-bia-tn10-parity-test",
    catalogId: "canonical-work:base:masonry_interior_brick_wall_lay_standard",
    primaryMeasureParameterId: "measured_net_brick_wall_area_m2",
    parameterDefinitions: Object.entries(EXACT_PARAMETERS).map(([parameterId, value]) => ({
      parameter_id: parameterId,
      value_type: typeof value === "number" ? "decimal" : typeof value === "boolean" ? "boolean" : "text",
      required: true,
      default_value: null,
      constraints_json: null,
    })),
    formulaDefinitions: [{
      formula_id: "bia_tn10_brick_procurement",
      ast: formula.ast,
      input_parameter_ids: formula.inputParameterIds,
      ast_sha256: "a".repeat(64),
    }, {
      formula_id: "bia_tn10_brick_package_purchase",
      ast: outputFormula.ast,
      input_parameter_ids: outputFormula.inputParameterIds,
      ast_sha256: "c".repeat(64),
    }],
    resourceDefinitions: [{
      id: "resource-bia-brick",
      row_id: "material:bia-tn10:fired-clay-brick",
      ordinal: 0,
      section: "Материалы",
      category: "material",
      title_ru: "Обожжённый глиняный кирпич по выбранной строке BIA TN 10 Table 4",
      unit_id: "piece",
      formula_id: "bia_tn10_brick_procurement",
      inclusion_ast: { kind: "literal", value: true },
      resource_graph: {
        professionalMaterialQuantityPolicyV1: {
          version: "canonical-material-quantity-policy:v1",
          basisVersion: "professional-material-quantity-basis:v1",
          materialType: "piece_material",
          unit: "piece",
          wastePercent: 0,
          wastePercentParameterId: "brick_breakage_percent",
          lossPercent: 0,
          procurementUnit: "piece",
          procurementPackageSize: 1,
          procurementPackageSizeParameterId: "brick_supplier_package_pieces",
          formula: "net selected-table need; project breakage; supplier package rounding",
          formulaInputs: {},
          formulaInputParameterIds: [
            "measured_net_brick_wall_area_m2",
            "selected_brick_quantity_per_m2",
            "brick_bond_correction_factor",
            "brick_breakage_percent",
            "brick_supplier_package_pieces",
          ],
          sourceId: BIA_TN10_MASONRY_SOURCE_ID,
          citationLabel: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator,
          quantityDependsOnParams: [
            "measured_net_brick_wall_area_m2",
            "selected_brick_quantity_per_m2",
            "brick_bond_correction_factor",
          ],
        },
        professionalPhysicalNormBindingV1: {
          technology_class: "BIA_TN10_FIRED_CLAY_BRICK_MEASUREMENT",
          operation_class: "MEASURE",
          material_system: "BIA_TN10_FIRED_CLAY_BRICK",
          scope_mode: "FULL_APPLICABLE_SCOPE",
          source_id: BIA_TN10_MASONRY_SOURCE_ID,
          quantity_output_parameter_id: "masonry_selected_brick_procurement_quantity_piece",
          quantity_output_formula_id: "bia_tn10_brick_package_purchase",
        },
      },
      procurement_eligible: true,
      cost_owner_id: null,
      source_metadata: {
        normativeTrace: [{
          source_id: BIA_TN10_MASONRY_SOURCE_ID,
          norm_id: BIA_TN10_MASONRY_NORM_ID,
          source_document_version: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
          source_definition_hash: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash,
        }],
      },
      row_sha256: "b".repeat(64),
    }],
    submittedParameters: { ...EXACT_PARAMETERS },
    confirmedParameters: {},
    currencyCode: "KGS",
    priceSnapshotIds: [],
    priceItems: [],
    rowOverrides: {},
    customRows: [],
    maximumResourceRows: 10,
    hashJson: (value: unknown) => JSON.stringify(value),
  };
}

describe("canonical BIA TN 10 quantity parity", () => {
  test("admits the package-rounded formula only when it equals the physical norm output", async () => {
    const result = await compileCanonicalEstimateCore(input(
      "ceil((measured_net_brick_wall_area_m2 * selected_brick_quantity_per_m2 * brick_bond_correction_factor * (1 + brick_breakage_percent / 100)) / brick_supplier_package_pieces) * brick_supplier_package_pieces",
    ));
    expect(result.rows[0]).toMatchObject({
      quantity: "5670",
      unit_price: null,
      amount: null,
      included_in_estimate: true,
      included_in_procurement: true,
    });
    const basis = canonicalMaterialQuantityBasisFromRow({
      rowId: String(result.rows[0]!.row_id),
      quantity: Number(result.rows[0]!.quantity),
      sourceParameters: {
        smartEstimateProjectionV2: {
          formulaExplanation: result.rows[0]!.calculation_trace,
        },
      },
    });
    expect(basis).toMatchObject({
      netQuantity: 5670,
      grossQuantity: 5840.1,
      procurementPackageSize: 500,
      procurementQuantity: 6000,
    });
  });

  test("fails closed when a formula diverges from the resolver output", async () => {
    await expect(compileCanonicalEstimateCore(input(
      "measured_net_brick_wall_area_m2 * selected_brick_quantity_per_m2",
    ))).rejects.toMatchObject({ code: "PHYSICAL_NORM_QUANTITY_MISMATCH" });
  });
});
