import {
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID,
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
  constructionNormativeRegistryV1,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildInteriorFinishesFromInlineInputV1,
  interiorFinishesDomainFactory,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import {
  WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID,
  WALL_PUTTY_CT127_KRER15_OFFICIAL_PDF,
  WALL_PUTTY_CT127_KRER15_RATE_CODE,
  WALL_PUTTY_CT127_KRER15_RATES,
  WALL_PUTTY_CT127_KRER15_SOURCE_ID,
  WALL_PUTTY_CT127_KRER15_SOURCE_PDF_SHA256,
  WALL_PUTTY_CT127_KRER15_WORK_KEY,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/wallPuttyCeresitCt127Krer15ProfessionalV1";

const explicit = (value: string | number | boolean) => ({ value, source: "user" as const });

function exactOverrides() {
  return {
    work_included: explicit(true),
    estimate_scope_mode: explicit("FULL_APPLICABLE_SCOPE"),
    scope_capability: explicit("standard"),
    funding_source: explicit("PRIVATE_RECOMMENDED"),
    project_type: explicit("INTERIOR_FINISH_PUTTY_PROJECT"),
    area_m2: explicit(100),
    surface_type: explicit("CEMENT_PLASTER"),
    product_profile_id: explicit(CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID),
    layer_thickness_mm: explicit(2),
    substrate_type: explicit("cement_plaster"),
    substrate_absorbency: explicit("absorbent"),
    substrate_load_bearing_dry_clean_confirmed: explicit(true),
    substrate_preparation_system: explicit("CERESIT_CT17"),
    selected_consumption_kg_m2: explicit(0.7),
    dry_interior_no_permanent_humidity_confirmed: explicit(true),
    application_temperature_confirmed: explicit(true),
    [WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID]: explicit(true),
  };
}

describe("CT 127 + KRER 15-04-027-01 normative wall-putty wave", () => {
  test("registers one exact official KG resource source instead of the generic guidance route", () => {
    expect(constructionNormativeRegistryV1.get(WALL_PUTTY_CT127_KRER15_SOURCE_ID)).toMatchObject({
      source_type: "RESOURCE_ESTIMATE_NORM",
      jurisdiction: "KG",
      document_code: "КРЕР-2015 №15, 15-04-027-01",
      clause_table_rate_code: WALL_PUTTY_CT127_KRER15_RATE_CODE,
      unit_basis: "100 m2 of painted wall surface",
      official_reference: WALL_PUTTY_CT127_KRER15_OFFICIAL_PDF,
      revision: `official-scan-sha256:${WALL_PUTTY_CT127_KRER15_SOURCE_PDF_SHA256}`,
      operation_class_applicability: ["APPLY"],
      material_system_applicability: ["WALL_PUTTY"],
      exact_rate_code_required: true,
    });

    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(
      (row) => row.work_key === WALL_PUTTY_CT127_KRER15_WORK_KEY,
    );
    if (!inventory) throw new Error("WALL_PUTTY_CT127_KRER15_INVENTORY_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const profile = technology && interiorFinishesDomainFactory.normative_profile_by_id.get(
      technology.normative_profile_ids[0],
    );
    const assembly = technology && interiorFinishesDomainFactory.assembly_profile_by_id.get(
      technology.assembly_profile_id,
    );
    expect(technology?.method).toBe("KRER15:15-04-027-01:CERESIT_CT127");
    expect(profile?.requested_source_ids).toEqual([WALL_PUTTY_CT127_KRER15_SOURCE_ID]);
    expect(profile?.requested_source_ids).not.toContain("kg_krer_2015_application_guidance");
    expect(assembly?.child_assemblies).toHaveLength(1);
    expect(assembly?.child_assemblies.flatMap((child) => child.rows)).toHaveLength(7);
  });

  test("does not treat preliminary product, project or table confirmation as normative acceptance", () => {
    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Финишная шпаклёвка стен 100 м²",
      selectedWorkKey: WALL_PUTTY_CT127_KRER15_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
    });
    expect(result.production).toBeNull();
    expect(result.missing_parameter_ids).toEqual(expect.arrayContaining([
      `PROJECT_VALUE_REQUIRED_EXPLICIT:product_profile_id=${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID}`,
      expect.stringContaining(`NORMATIVE_RATE_CODE_MISMATCH:${WALL_PUTTY_CT127_KRER15_SOURCE_ID}:`),
      `PROJECT_VALUE_REQUIRED_EXPLICIT:${WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID}=true`,
      "PROJECT_VALUE_REQUIRED_EXPLICIT:funding_source",
      "PROJECT_VALUE_REQUIRED_EXPLICIT:project_type",
    ]));
  });

  test("calculates the seven exact rows independently and keeps every unknown price null", () => {
    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Третья финишная шпаклёвка стен 100 м² Ceresit CT 127 под высококачественную окраску",
      selectedWorkKey: WALL_PUTTY_CT127_KRER15_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides: exactOverrides(),
    });
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    const items = result.production?.draft?.items ?? [];
    expect(items).toHaveLength(7);
    const quantities = new Map(items.map((item) => [item.sourceParameters?.rowCode, item.quantity]));
    const technologyId = result.inventory?.canonical_technology_id;
    expect(quantities.get(`${technologyId}:row:primary_material`)).toBe(70);
    expect(quantities.get(`${technologyId}:row:construction_worker_labor`))
      .toBe(WALL_PUTTY_CT127_KRER15_RATES.construction_worker_man_hours);
    expect(quantities.get(`${technologyId}:row:machine_operator_labor`))
      .toBe(WALL_PUTTY_CT127_KRER15_RATES.machine_operator_man_hours);
    expect(quantities.get(`${technologyId}:row:cargo_lift`))
      .toBe(WALL_PUTTY_CT127_KRER15_RATES.cargo_lift_machine_hours);
    expect(quantities.get(`${technologyId}:row:flatbed_truck`))
      .toBe(WALL_PUTTY_CT127_KRER15_RATES.flatbed_truck_machine_hours);
    expect(quantities.get(`${technologyId}:row:sanding_sheet`))
      .toBe(WALL_PUTTY_CT127_KRER15_RATES.sanding_sheet_m2);
    expect(quantities.get(`${technologyId}:row:rags`)).toBe(WALL_PUTTY_CT127_KRER15_RATES.rags_kg);
    expect(items.every((item) => item.unitPrice === null && item.priceStatus === "PRICE_MISSING")).toBe(true);

    const material = items.find((item) => item.sourceParameters?.rowCode === `${technologyId}:row:primary_material`);
    expect(material?.sourceParameters?.normativeSourceIds).toContain(
      CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
    );
    expect(material?.sourceParameters?.professionalMaterialQuantityBasisV1).toMatchObject({
      netQuantity: 70,
      procurementPackageSize: 20,
      procurementQuantity: 80,
      wastePercent: 0,
    });
    expect(items.filter((item) => item.sourceParameters?.rowCode !== `${technologyId}:row:primary_material`)
      .every((item) => (item.sourceParameters?.normativeSourceIds as readonly string[])
        .includes(WALL_PUTTY_CT127_KRER15_SOURCE_ID))).toBe(true);
  });
});
