import { canonicalMaterialQuantityBasisFromRow } from "../../src/lib/estimate/backendPlatform/canonicalMaterialQuantityProjection";
import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import { BIA_TN10_MASONRY_REQUIRED_IDS } from "../../src/lib/estimate/v4/domainFactory";
import {
  MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
  MASONRY_BRICK_WALL_BIA_TN10_FORMULAS,
  MASONRY_BRICK_WALL_BIA_TN10_NORMATIVE_PARAMETER_IDS,
  MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS,
  MASONRY_BRICK_WALL_BIA_TN10_RESOURCES,
  compileMasonryBrickWallBiaTn10R1,
} from "../../src/lib/estimate/v4/masonryBrickWallBiaTn10R1";

function materialBasis(row: Record<string, unknown>) {
  return canonicalMaterialQuantityBasisFromRow({
    rowId: String(row.row_id),
    quantity: Number(row.quantity),
    sourceParameters: {
      smartEstimateProjectionV2: {
        formulaExplanation: row.calculation_trace as Record<string, unknown>,
      },
    },
  });
}

describe("complete canonical fired-clay brick wall estimate through BIA TN 10", () => {
  test("maps every explicit prompt fact into the exact backend catalog schema", () => {
    const prompt = [
      "Brick masonry BIA TN 10 Table 4; net brick wall area: 90 m2;",
      "gross wall area and opening deductions: GROSS_M2=100,OPENINGS_M2=10,NET_M2=90;",
      "fired clay brick confirmed: true; brick manufacturer and designation: Acme Brick Modular A-101;",
      "specified and nominal dimensions: specified 194x92x57 mm, nominal 200x100x67 mm; joint width: 10 mm;",
      "wall thickness and wythe configuration: WYTHE:single 100 mm veneer; bond pattern: RUNNING_BOND;",
      "selected BIA TN10 Table 4 row: BIA_TN10_TABLE4:modular-single-wythe-running-bond-10mm;",
      "selected brick quantity per m2: 60; selected mortar quantity per m2: 0.02;",
      "applicable bond correction factors: BRICK_FACTOR=1.05,MORTAR_FACTOR=1.10;",
      "selected project breakage and waste allowances: BRICK_PERCENT=3,MORTAR_PERCENT=5;",
      "supplier package quantities: BRICK_PIECES=500,MORTAR_M3=0.25;",
      "project approval reference: A-E-EST-BRICK-REV-C",
    ].join(" ");
    const catalog = {
      catalogId: "canonical-work:base:masonry_interior_brick_wall_lay_standard",
      workKey: "masonry_interior_brick_wall_lay_standard",
      parameterSchema: MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        titleRu: parameter.title_ru,
        valueType: parameter.value_type,
        unitId: parameter.unit_id,
        required: parameter.required,
        defaultValue: null,
        constraints: parameter.constraints_json,
        visibilityRole: "USER_INPUT",
        valueSourceRole: "PROJECT_SPECIFIC_INPUT",
        semanticParameterKey: parameter.parameter_id,
        preliminaryCompilationAllowed: false,
      })),
    } as unknown as CanonicalEstimateCatalogItem;
    const plan = buildCanonicalBaselinePlan({ catalog, prompt });
    expect(plan.primaryMeasureParameterId).toBe("measured_net_brick_wall_area_m2");
    expect(Object.keys(plan.parameters)).toHaveLength(22);
    expect(plan.parameters).toMatchObject({
      measured_net_brick_wall_area_m2: 90,
      brick_bond_correction_factor: 1.05,
      mortar_bond_correction_factor: 1.1,
      brick_breakage_percent: 3,
      mortar_waste_percent: 5,
      brick_supplier_package_pieces: 500,
      mortar_supplier_package_m3: 0.25,
    });
  });

  test("keeps need, project waste and supplier purchase quantities separate with unknown prices", async () => {
    const result = await compileMasonryBrickWallBiaTn10R1({ ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT });
    expect(MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS).toHaveLength(22);
    expect(MASONRY_BRICK_WALL_BIA_TN10_FORMULAS).toHaveLength(5);
    expect(MASONRY_BRICK_WALL_BIA_TN10_RESOURCES).toHaveLength(5);
    expect(result.rows).toHaveLength(5);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);

    const brick = result.rows.find((row) => row.row_id === "material:bia-tn10:fired-clay-brick")!;
    const mortar = result.rows.find((row) => row.row_id === "material:bia-tn10:masonry-mortar")!;
    expect(brick.quantity).toBe("5670");
    expect(mortar.quantity).toBe("1.98");
    expect(materialBasis(brick)).toMatchObject({
      netQuantity: 5670,
      grossQuantity: 5840.1,
      procurementPackageSize: 500,
      procurementQuantity: 6000,
    });
    expect(materialBasis(mortar)).toMatchObject({
      netQuantity: 1.98,
      grossQuantity: 2.079,
      procurementPackageSize: 0.25,
      procurementQuantity: 2.25,
    });
    expect(result.rows.filter((row) => row.category === "construction_work").map((row) => row.quantity))
      .toEqual(["90", "90", "90"]);
  });

  test("declares every physical applicability input as a resource consumer for the editable Web contract", () => {
    const resources = MASONRY_BRICK_WALL_BIA_TN10_RESOURCES.filter((resource) =>
      resource.row_id.startsWith("material:bia-tn10:"));
    expect(resources).toHaveLength(2);
    for (const resource of resources) {
      expect(resource.resource_graph.professionalPhysicalNormBindingV1).toMatchObject({
        applicability_parameter_ids: [...BIA_TN10_MASONRY_REQUIRED_IDS],
      });
    }
  });

  test("keeps selected-table facts separate from project and supplier inputs", () => {
    const normative = new Set<string>(MASONRY_BRICK_WALL_BIA_TN10_NORMATIVE_PARAMETER_IDS);
    expect([...normative]).toHaveLength(7);
    for (const parameter of MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS) {
      const guide = parameter.truth_metadata.guide as Record<string, unknown>;
      if (normative.has(parameter.parameter_id)) {
        expect(parameter.truth_metadata.value_source_role).toBe("SELECTED_NORMATIVE_TABLE_INPUT");
        expect(guide.source_role).toBe("SELECTED_BIA_TABLE");
        expect(guide.source_document).toBeTruthy();
      } else {
        expect(parameter.truth_metadata.value_source_role).toBe("PROJECT_SPECIFIC_INPUT");
        expect(guide.source_role).toBe("PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE");
        expect(guide.source_document).toBeNull();
        expect(guide.source_snapshot_hash).toBeNull();
      }
    }
  });

  test.each([
    "canonical-work:base:masonry_interior_brick_wall_lay_large_area",
    "canonical-work:base:masonry_interior_brick_wall_lay_small_area",
    "canonical-work:base:masonry_interior_brick_wall_lay_technical_room",
  ])("reuses the same compile owner for the admitted neutral context %s", async (catalogId) => {
    const result = await compileMasonryBrickWallBiaTn10R1(
      { ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT },
      { catalogId },
    );
    expect(result.revisionProjection.catalogId).toBe(catalogId);
    expect(result.rows).toHaveLength(5);
    expect(result.preliminaryNeeds).toHaveLength(0);
  });

  test("recalculates the full wall while preserving exact package routing", async () => {
    const result = await compileMasonryBrickWallBiaTn10R1({
      ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
      measured_net_brick_wall_area_m2: 100,
      gross_wall_area_and_opening_deductions: "GROSS_M2=110; OPENINGS_M2=10; NET_M2=100",
    });
    const brick = result.rows.find((row) => row.row_id === "material:bia-tn10:fired-clay-brick")!;
    const mortar = result.rows.find((row) => row.row_id === "material:bia-tn10:masonry-mortar")!;
    expect(brick.quantity).toBe("6300");
    expect(mortar.quantity).toBe("2.2");
    expect(materialBasis(brick)?.procurementQuantity).toBe(6500);
    expect(materialBasis(mortar)?.procurementQuantity).toBe(2.5);
    expect(result.rows.filter((row) => row.category === "construction_work").every((row) => row.quantity === "100"))
      .toBe(true);
  });

  test.each([
    ["non-clay material", { fired_clay_brick_confirmed: false }, "PHYSICAL_NORM_APPLICABILITY_FAILED"],
    ["conflicting geometry", { gross_wall_area_and_opening_deductions: "GROSS_M2=100; OPENINGS_M2=5; NET_M2=90" }, "PHYSICAL_NORM_APPLICABILITY_FAILED"],
    ["numeric factor drift", { brick_bond_correction_factor: 1 }, "PHYSICAL_NORM_APPLICABILITY_FAILED"],
  ])("rejects %s", async (_name, patch, code) => {
    await expect(compileMasonryBrickWallBiaTn10R1({
      ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
      ...patch,
    })).rejects.toMatchObject({ code });
  });
});
