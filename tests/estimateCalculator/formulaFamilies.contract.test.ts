import {
  compileProductionExpandedEstimate10000,
} from "../../src/lib/ai/estimateTemplate10000";
import { auditWorkFamilyFormulaEngine } from "../../src/features/estimates/calculator/workFamilyFormulaEngine";
import { resolveProfessionalWorkFamily } from "../../src/features/estimates/catalog/workCatalogResolver";
import { getProductionWorkDefinition10000 } from "../../src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000";

describe("formula family registry", () => {
  it("saves formula steps, unit conversions, and deterministic output for representative families", () => {
    const workKeys = [
      "plaster_paint_interior_wall_plaster_apply_standard",
      "tile_stone_interior_tile_floor_lay_standard",
      "masonry_interior_gas_block_lay_standard",
      "concrete_foundation_interior_concrete_slab_pour_standard",
      "roofing_interior_metal_roof_install_standard",
    ];

    for (const workKey of workKeys) {
      const definition = getProductionWorkDefinition10000(workKey);
      expect(definition).toBeTruthy();
      const estimate = compileProductionExpandedEstimate10000({ workKey, quantity: 100, countryCode: "KG" });
      const audit = auditWorkFamilyFormulaEngine({
        family: resolveProfessionalWorkFamily(definition!),
        estimate,
        repeatHash: estimate.compiledHash,
      });

      expect(audit.formula_steps_saved_per_row).toBe(true);
      expect(audit.same_input_same_output).toBe(true);
      expect(audit.invalid_params_rejected).toBe(true);
      expect(audit.missing_required_params_block_apply).toBe(true);
    }
  });
});
