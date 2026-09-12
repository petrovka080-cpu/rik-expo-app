import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID,
  KRER27_06_020_HOT_ASPHALT_40MM_PRODUCT_PROFILE_ID,
  KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_ID,
  KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4,
} from "../../src/lib/estimate/v4/asphalt/asphaltWorkSpecificParameterSchemaV4";
import { compileAsphaltProfessionalEstimateV4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltProfessionalEstimateV4";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";

const CAPTURED_AT = "2026-09-12T00:00:00.000Z";

function explicit(
  value: string | number | boolean,
  unitId: string | null = null,
): ProfessionalParameterValueV4 {
  return {
    value,
    unit_id: unitId,
    source_type: "USER_EXPLICIT",
    source_id: `test-project:${String(value)}`,
    captured_at: CAPTURED_AT,
    confidence: "high",
    applicability: "Exact KRER 27-06-020 project fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(KRER27_06_020_HOT_ASPHALT_40MM_PRODUCT_PROFILE_ID),
    pavement_area_m2: explicit(6400, "m2"),
    pavement_area_measurement_basis_m2: explicit(1000, "m2"),
    mixture_kind: explicit("HOT_ASPHALT_CONCRETE"),
    mixture_type_and_density_class: explicit("TYPE_B_GRADE_II_DENSE_PROJECT_SPEC"),
    aggregate_size_mm: explicit(20, "mm"),
    layer_thickness_mm: explicit(40, "mm"),
    selected_krer27_table_code: explicit("27-06-020"),
    selected_table_variant: explicit("27-06-020-02_COLUMN_2"),
    selected_table_variant_work_composition: explicit("APPROVED_TABLE_27_06_020_COLUMN_2_WORK_COMPOSITION"),
    selected_table_resource_rows: explicit("APPROVED_TABLE_27_06_020_COLUMN_2_RESOURCE_ROWS"),
    selected_collection_edition_and_amendments: explicit("KRER_2015_COLLECTION_27_WITH_CONFIRMED_2022_AMENDMENTS"),
    pavement_design_and_compaction_specification: explicit("RD-AD-2026-SHEET-17;PPR-AB-04"),
    current_price_level_and_regional_indices: explicit("KG-PRICE-LEVEL-2026-Q3;REGIONAL-INDEX-APPROVED"),
    estimator_approval_reference: explicit("ESTIMATOR-APPROVAL-27-06-020-2026-09-12"),
    ...changes,
  };
}

function resolve(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
  asphaltLayerCount = 1,
) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "ASPHALT_PAVEMENT",
    operation_class: "INSTALL",
    material_system: "HOT_ASPHALT_CONCRETE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
    physical_context: { asphalt_layer_count: asphaltLayerCount },
  });
}

const edited = (value: unknown) => ({ value, source: "edited_by_user" as const });

const compilerOverrides = {
  geometry_method: edited("direct_area"),
  area_m2: edited(6400),
  asphalt_layers: edited([{
    position: 1,
    mixture_type: "dense_fine",
    thickness_mm: 40,
    density_t_m3: 2.35,
    waste_percent: 2,
  }]),
  product_profile_id: edited(KRER27_06_020_HOT_ASPHALT_40MM_PRODUCT_PROFILE_ID),
  pavement_area_measurement_basis_m2: edited(1000),
  mixture_kind: edited("HOT_ASPHALT_CONCRETE"),
  mixture_type_and_density_class: edited("TYPE_B_GRADE_II_DENSE_PROJECT_SPEC"),
  aggregate_size_mm: edited(20),
  selected_krer27_table_code: edited("27-06-020"),
  selected_table_variant: edited("27-06-020-02_COLUMN_2"),
  selected_table_variant_work_composition: edited("APPROVED_TABLE_27_06_020_COLUMN_2_WORK_COMPOSITION"),
  selected_table_resource_rows: edited("APPROVED_TABLE_27_06_020_COLUMN_2_RESOURCE_ROWS"),
  selected_collection_edition_and_amendments: edited("KRER_2015_COLLECTION_27_WITH_CONFIRMED_2022_AMENDMENTS"),
  pavement_design_and_compaction_specification: edited("RD-AD-2026-SHEET-17;PPR-AB-04"),
  current_price_level_and_regional_indices: edited("KG-PRICE-LEVEL-2026-Q3;REGIONAL-INDEX-APPROVED"),
  estimator_approval_reference: edited("ESTIMATOR-APPROVAL-27-06-020-2026-09-12"),
};

describe("KRER 27-06-020 canonical physical norm", () => {
  test("registers the reviewed exact KG table and its executable contract", () => {
    expect(KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA).toMatchObject({
      norm_id: KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID,
      rate_value: 0.001,
      table: "27-06-020",
      published_layer_thickness_mm: 40,
      table_measurement_basis_m2: 1000,
    });
    expect(constructionNormativeRegistryV1.get(KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_ID))
      .toMatchObject({
        source_type: "RESOURCE_ESTIMATE_NORM",
        jurisdiction: "KG",
        operation_class_applicability: ["INSTALL"],
        material_system_applicability: ["HOT_ASPHALT_CONCRETE"],
        product_profile_applicability: [KRER27_06_020_HOT_ASPHALT_40MM_PRODUCT_PROFILE_ID],
        clause_table_rate_code: "27-06-020",
        exact_rate_code_required: true,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID,
        work_group: "roadworks",
        technology_class: "ASPHALT_PAVEMENT",
        produced_parameter_ids: ["krer27_06_020_table_norm_units"],
      }));
  });

  test("converts 6400 m2 to 6.4 fractional table units without inventing resource rates", () => {
    const resolution = resolve(exactInputs());
    expect(resolution).toMatchObject({
      status: "APPLIED",
      source_id: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_ID,
      calculated_krer27_06_020_table_norm_units: 6.4,
      produced_parameter_ids: ["krer27_06_020_table_norm_units"],
      blockers: [],
    });
    expect(resolution.parameter_values.krer27_06_020_table_norm_units).toMatchObject({
      value: 6.4,
      unit_id: "krer_norm_unit",
      source_type: "APPLICABLE_NORM",
    });
    expect(resolution.parameter_values).not.toHaveProperty("material_quantity_t");
    expect(resolution.parameter_values).not.toHaveProperty("labor_hours");
    expect(resolution.parameter_values).not.toHaveProperty("cost_amount");
  });

  test("blocks incomplete, wrong-thickness, multi-layer and conflicting-output requests", () => {
    const incomplete = { ...exactInputs() };
    delete (incomplete as Record<string, ProfessionalParameterValueV4>).selected_table_resource_rows;
    expect(resolve(incomplete)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:selected_table_resource_rows"],
    });
    expect(resolve(exactInputs({ layer_thickness_mm: explicit(50, "mm") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining([
        expect.stringContaining("layer_thickness_mm=50"),
      ]),
    });
    expect(resolve(exactInputs(), 2)).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [expect.stringContaining("asphalt_layer_count=2")],
    });
    expect(resolve(exactInputs({
      krer27_06_020_table_norm_units: explicit(6.5, "krer_norm_unit"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
    });
  });

  test("uses the resolver in the canonical asphalt compiler without changing material mass", () => {
    const withExactNorm = compileAsphaltProfessionalEstimateV4({
      raw_text: "Устройство горячего асфальтобетонного покрытия площадью 6400 м² одним слоем 40 мм",
      parameter_overrides: compilerOverrides,
    });
    const withoutExactNorm = compileAsphaltProfessionalEstimateV4({
      raw_text: "Устройство горячего асфальтобетонного покрытия площадью 6400 м² одним слоем 40 мм",
      parameter_overrides: Object.fromEntries(
        Object.entries(compilerOverrides).filter(([key]) => ![
          "product_profile_id",
          "pavement_area_measurement_basis_m2",
          "mixture_kind",
          "mixture_type_and_density_class",
          "aggregate_size_mm",
          "selected_krer27_table_code",
          "selected_table_variant",
          "selected_table_variant_work_composition",
          "selected_table_resource_rows",
          "selected_collection_edition_and_amendments",
          "pavement_design_and_compaction_specification",
          "current_price_level_and_regional_indices",
          "estimator_approval_reference",
        ].includes(key)),
      ),
    });
    expect(withExactNorm.physical_norm_resolution).toMatchObject({
      status: "APPLIED",
      calculated_krer27_06_020_table_norm_units: 6.4,
    });
    expect(withExactNorm.compile_blockers).not.toEqual(expect.arrayContaining([
      expect.stringContaining("KRER27_06_020"),
    ]));
    const exactMaterial = withExactNorm.compiled_rows.find(
      (row) => row.definition.row_id === "asphalt_layer_1_material",
    );
    const baselineMaterial = withoutExactNorm.compiled_rows.find(
      (row) => row.definition.row_id === "asphalt_layer_1_material",
    );
    expect(exactMaterial?.quantity).toBe(baselineMaterial?.quantity);
    expect(exactMaterial?.quantity).toBe(613.632);
    expect(withoutExactNorm.physical_norm_resolution).toBeNull();

    const profileParameter = ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.find(
      (parameter) => parameter.canonical_key === "product_profile_id",
    );
    expect(profileParameter?.choices).toContainEqual(expect.objectContaining({
      value: KRER27_06_020_HOT_ASPHALT_40MM_PRODUCT_PROFILE_ID,
    }));
  });
});
