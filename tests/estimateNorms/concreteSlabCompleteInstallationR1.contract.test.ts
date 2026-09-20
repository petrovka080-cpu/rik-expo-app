import {
  CONCRETE_SLAB_COMPLETE_INSTALLATION_FORMULAS,
  CONCRETE_SLAB_COMPLETE_INSTALLATION_PARAMETERS,
  CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES,
  CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS,
  compileConcreteSlabCompleteInstallationR1,
  concreteSlabCompleteInstallationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabCompleteInstallationR1";

describe("complete concrete slab installation R1", () => {
  test("owns exactly the seven complete m3 catalog promises", () => {
    expect(CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS).toHaveLength(7);
    expect(new Set(CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS.map(
      (target) => target.catalogId,
    )).size).toBe(7);
    expect(CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS.every(
      (target) => target.catalogId.includes("_concrete_slab_form_"),
    )).toBe(true);
  });

  test("has one collision-free graph assembled from accepted component definitions", () => {
    expect(new Set(CONCRETE_SLAB_COMPLETE_INSTALLATION_PARAMETERS.map(
      (parameter) => parameter.parameter_id,
    )).size).toBe(CONCRETE_SLAB_COMPLETE_INSTALLATION_PARAMETERS.length);
    expect(new Set(CONCRETE_SLAB_COMPLETE_INSTALLATION_FORMULAS.map(
      (formula) => formula.formula_id,
    )).size).toBe(CONCRETE_SLAB_COMPLETE_INSTALLATION_FORMULAS.length);
    expect(new Set(CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES.map(
      (resource) => resource.row_id,
    )).size).toBe(CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES.length);
  });

  test.each(CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS)(
    "compiles the complete accepted project fixture for $contextKey through the shared core",
    async (target) => {
      const input = concreteSlabCompleteInstallationAcceptanceInputR1(target.contextKey);
      const result = await compileConcreteSlabCompleteInstallationR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(result.preliminaryNeeds).toEqual([]);
      expect(result.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(true);
      expect(result.rows.some(
        (row) => row.row_id === "material:reinforcement:steel-approved-schedule",
      )).toBe(true);
      expect(result.rows.some(
        (row) => row.row_id === "equipment:formwork:dokaflex-floor-props-rental",
      )).toBe(true);
      expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
      if (target.contextKey === "repair") {
        expect(result.rows.some((row) => row.row_id.includes("slab-embedded-items"))).toBe(false);
      } else {
        expect(result.rows.some(
          (row) => row.row_id === "material:concrete:slab-embedded-items",
        )).toBe(true);
      }
    },
  );

  test("does not ask for reinforcement, Dokaflex, or embedments when the project excludes them", async () => {
    const input = concreteSlabCompleteInstallationAcceptanceInputR1("standard");
    const placementOnly = Object.fromEntries(Object.entries(input).filter(([key]) =>
      key === "slab_concrete_volume_m3"
      || key.startsWith("placement_")));
    const result = await compileConcreteSlabCompleteInstallationR1({
      ...placementOnly,
      slab_support_condition: "SLAB_ON_GRADE",
      reinforcement_applicable: false,
      embedded_items_applicable: false,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
    expect(result.rows.some((row) => row.row_id.includes("dokaflex"))).toBe(false);
    expect(result.rows.some((row) => row.row_id.includes("slab-embedded-items"))).toBe(false);
    expect(result.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(true);
  });

  test("keeps unknown project quantities as explicit preliminary needs instead of inventing them", async () => {
    const input = { ...concreteSlabCompleteInstallationAcceptanceInputR1("standard") };
    delete input.reinforcement_approved_reinforcement_schedule_weight_kg;
    // The optional source profile is deliberately absent on the first screen.
    // Without a schedule value the core must expose a need, not claim that the
    // physical-norm applicability contract has already been satisfied.
    delete input.reinforcement_product_profile_id;
    const result = await compileConcreteSlabCompleteInstallationR1(input);
    expect(result.preliminaryNeeds.some((need) =>
      need.row_id === "material:reinforcement:steel-approved-schedule"
      && need.missing_parameter_ids.includes(
        "reinforcement_approved_reinforcement_schedule_weight_kg",
      ))).toBe(true);
    expect(result.rows.some(
      (row) => row.row_id === "material:reinforcement:steel-approved-schedule",
    )).toBe(false);
  });
});
