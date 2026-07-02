import { validateAllProductionTemplatesBoq10000 } from "../../src/lib/ai/estimateTemplate10000";

jest.setTimeout(120000);

describe("estimate template recipes", () => {
  it("requires material, labor, service/equipment recipes and traceable typed rows for every template", () => {
    const validation = validateAllProductionTemplatesBoq10000();

    expect(validation.all_10000_templates_material_recipe_valid).toBe(true);
    expect(validation.all_10000_templates_labor_recipe_valid).toBe(true);
    expect(validation.all_10000_templates_service_equipment_recipe_valid).toBe(true);
    expect(validation.material_work_service_equipment_lines_separated).toBe(true);
    expect(validation.line_type_required).toBe(true);
    expect(validation.template_id_required).toBe(true);
    expect(validation.template_version_required).toBe(true);
    expect(validation.formula_id_required).toBe(true);
    expect(validation.calculation_trace_required).toBe(true);
    expect(validation.source_parameters_required).toBe(true);
    expect(validation.procurement_flag_required).toBe(true);
  });
});
