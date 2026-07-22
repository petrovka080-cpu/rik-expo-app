import {
  compileAsphaltProfessionalEstimateV4,
} from "../../src/lib/estimate/v4/asphalt";
import { convertEngineeringUnitV4 } from "../../src/lib/estimate/v4/engineeringUnitRegistryV4";
import {
  ASPHALT_PHASE1_COMPLETE_PARAMETERS,
  asphaltPhase1CompleteInput,
} from "./fixtures/asphaltPhase1.fixture";

function rows(overrides: Record<string, unknown> = {}) {
  return compileAsphaltProfessionalEstimateV4(asphaltPhase1CompleteInput(overrides)).compiled_rows;
}

function rowQuantity(rowId: string, overrides: Record<string, unknown> = {}): number | null {
  return rows(overrides).find((row) => row.definition.row_id === rowId)?.quantity ?? null;
}

function rowIds(overrides: Record<string, unknown> = {}): string[] {
  return rows(overrides).map((row) => row.definition.row_id);
}

describe("Asphalt V4 Phase 1 scenario matrix", () => {
  test("supports direct area and length × width minus exclusions", () => {
    expect(rowQuantity("asphalt_layer_1_paving")).toBe(1000);
    expect(rowQuantity("asphalt_layer_1_paving", {
      geometry_method: "length_width",
      area_m2: undefined,
      length_m: 50,
      width_m: 20,
      exclusions_m2: 50,
    })).toBe(950);
  });

  test("keeps new construction, repair with milling and repair without milling distinct", () => {
    expect(rowIds({ construction_mode: "new_construction", milling_required: false })).not.toContain("milling");
    expect(rowIds({ construction_mode: "repair", milling_required: false })).not.toContain("milling");
    const milled = rowIds({
      construction_mode: "repair",
      milling_required: true,
      milling_depth_mm: 50,
      milling_productivity_m3_per_machine_hour: 35,
      disposal_distance_km: 18,
    });
    expect(milled).toEqual(expect.arrayContaining(["milling", "milling_machine", "milled_material_transport"]));
  });

  test("compiles one or two layers without inserting a fake interlayer treatment", () => {
    const firstLayer = ASPHALT_PHASE1_COMPLETE_PARAMETERS.asphalt_layers[0];
    const oneLayer = rowIds({ asphalt_layers: [firstLayer] });
    expect(oneLayer).toContain("asphalt_layer_1_material");
    expect(oneLayer).not.toContain("asphalt_layer_2_material");
    expect(oneLayer.some((id) => id.startsWith("emulsion_interface_"))).toBe(false);
    expect(rowIds()).toContain("emulsion_interface_1_2");
  });

  test("changes thickness and density only in the correct mass and dependent logistics", () => {
    const baselineLayer1 = rowQuantity("asphalt_layer_1_material")!;
    const baselineLayer2 = rowQuantity("asphalt_layer_2_material")!;
    const thickerLayers = ASPHALT_PHASE1_COMPLETE_PARAMETERS.asphalt_layers.map((layer, index) =>
      index === 0 ? { ...layer, thickness_mm: 80 } : layer,
    );
    const denserLayers = ASPHALT_PHASE1_COMPLETE_PARAMETERS.asphalt_layers.map((layer, index) =>
      index === 1 ? { ...layer, density_t_m3: 2.5 } : layer,
    );

    expect(rowQuantity("asphalt_layer_1_material", { asphalt_layers: thickerLayers })).toBeGreaterThan(baselineLayer1);
    expect(rowQuantity("asphalt_layer_2_material", { asphalt_layers: thickerLayers })).toBe(baselineLayer2);
    expect(rowQuantity("asphalt_layer_1_material", { asphalt_layers: denserLayers })).toBe(baselineLayer1);
    expect(rowQuantity("asphalt_layer_2_material", { asphalt_layers: denserLayers })).toBeGreaterThan(baselineLayer2);
  });

  test("toggles geotextile, curbs and drainage only from applicable facts", () => {
    expect(rowIds()).not.toEqual(expect.arrayContaining(["geotextile_material", "curb_material", "drainage"]));
    expect(rowIds({ geotextile_required: true, geotextile_type: "separation", geotextile_overlap_percent: 10 }))
      .toEqual(expect.arrayContaining(["geotextile_material", "geotextile_installation"]));
    expect(rowIds({ curb_length_m: 120 })).toEqual(expect.arrayContaining(["curb_material", "curb_installation"]));
    expect(rowIds({ drainage_type: "surface", drainage_length_m: 80 })).toContain("drainage");
  });

  test("keeps delivery distance sensitivity, unknown geology and project documents honest", () => {
    expect(rowQuantity("asphalt_delivery", { asphalt_plant_distance_km: 40 }))
      .toBe(2 * rowQuantity("asphalt_delivery", { asphalt_plant_distance_km: 20 })!);
    const unknownGeology = compileAsphaltProfessionalEstimateV4(asphaltPhase1CompleteInput({ soil_condition: "unknown" }));
    expect(unknownGeology.compile_blockers).toEqual([]);
    expect(unknownGeology.passport.assumptions_ru.join(" ")).toMatch(/грунт|основан|проект/iu);
    expect(rowIds({ project_document: "road-design-rev-c.pdf" })).toContain("project_document");
  });

  test("allows a recommended input to remain missing without synthetic rows", () => {
    const partial = compileAsphaltProfessionalEstimateV4({
      raw_text: "Устройство асфальтобетонного покрытия площадью 500 м², один слой 50 мм",
    });
    expect(partial.compiled_rows.map((row) => row.definition.row_id)).toEqual(["asphalt_layer_1_paving"]);
    expect(partial.compiled_rows[0].quantity).toBe(500);
    expect(partial.price_coverage.total_amount).toBeNull();
    expect(partial.expert_questions_ru.length).toBeGreaterThan(0);
  });

  test("converts millimetres, centimetres and metres through one unit registry", () => {
    expect(convertEngineeringUnitV4(50, "mm", "cm")).toBeCloseTo(5, 8);
    expect(convertEngineeringUnitV4(5, "cm", "m")).toBeCloseTo(0.05, 8);
    expect(convertEngineeringUnitV4(0.05, "m", "mm")).toBeCloseTo(50, 8);
  });
});
