import { BELT_REPAIR_FORMULAS } from "../../src/lib/estimate/v4/beltRepairR1";
import {
  COLUMN_BASE_REPAIR_FORMULAS, COLUMN_BASE_REPAIR_PARAMETERS,
  COLUMN_BASE_REPAIR_RESOURCES, COLUMN_BASE_REPAIR_TARGETS,
  columnBaseRepairAcceptanceInputR1, compileColumnBaseRepairR1,
} from "../../src/lib/estimate/v4/columnBaseRepairR1";

describe("column-base repair canonical family", () => {
  it("compiles all seven exact schedules through the shared repair graph", async () => {
    for (const target of COLUMN_BASE_REPAIR_TARGETS) {
      const compiled = await compileColumnBaseRepairR1(
        { ...columnBaseRepairAcceptanceInputR1(target.contextKey) },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:column-base-repair-placement")).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
    }
  });

  it("reuses the ACI 562/546 graph and exposes missing direct quantities", async () => {
    expect(COLUMN_BASE_REPAIR_FORMULAS).toBe(BELT_REPAIR_FORMULAS);
    expect(COLUMN_BASE_REPAIR_PARAMETERS).toHaveLength(40);
    expect(COLUMN_BASE_REPAIR_RESOURCES).toHaveLength(16);
    const target = COLUMN_BASE_REPAIR_TARGETS[0];
    const input = { ...columnBaseRepairAcceptanceInputR1(target.contextKey) };
    for (const parameter of COLUMN_BASE_REPAIR_PARAMETERS) {
      if (parameter.value_type === "text") delete input[parameter.parameter_id];
    }
    expect((await compileColumnBaseRepairR1(input, { catalogId: target.catalogId })).preliminaryNeeds).toEqual([]);
    delete input.bonding_agent_quantity_kg;
    const compiled = await compileColumnBaseRepairR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({
        missing_parameter_ids: expect.arrayContaining(["bonding_agent_quantity_kg"]),
        quantity: null,
      }),
    ]));
  });

  it("rejects a neighboring leveling identity", async () => {
    await expect(compileColumnBaseRepairR1(columnBaseRepairAcceptanceInputR1("standard"), {
      catalogId: "canonical-work:base:concrete_foundation_interior_column_base_level_standard",
    })).rejects.toThrow("COLUMN_BASE_REPAIR_CATALOG_UNSUPPORTED");
  });
});
