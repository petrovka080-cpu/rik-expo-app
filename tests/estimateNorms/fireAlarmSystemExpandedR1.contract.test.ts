import {
  FIRE_ALARM_SYSTEM_EXPANDED_ACCEPTANCE_INPUT,
  FIRE_ALARM_SYSTEM_EXPANDED_CATALOG_ID,
  FIRE_ALARM_SYSTEM_EXPANDED_PARAMETERS,
  FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE,
  FIRE_ALARM_SYSTEM_EXPANDED_RESOURCES,
  FIRE_ALARM_SYSTEM_EXPANDED_RUNTIME_CLASSIFICATION,
  FIRE_ALARM_SYSTEM_EXPANDED_SHORT_INPUT,
  FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA,
  compileFireAlarmSystemExpandedR1,
  fireAlarmSystemExpandedCompletenessMap,
} from "../../src/lib/estimate/v4/fireAlarmSystemExpandedR1";

function quantity(rows: readonly { row_id: string; quantity: string }[], rowId: string): string {
  const row = rows.find((entry) => entry.row_id === rowId);
  if (!row) throw new Error(`ROW_MISSING:${rowId}`);
  return row.quantity;
}

describe("S27.7 F09 expanded fire alarm system", () => {
  it("owns the exact remaining expanded identity without a hidden factor", () => {
    expect(FIRE_ALARM_SYSTEM_EXPANDED_CATALOG_ID)
      .toBe("canonical-work:expanded:fire_alarm_system");
    expect(fireAlarmSystemExpandedCompletenessMap().catalogVariant)
      .toContain("NO_HIDDEN_QUANTITY_FACTOR");
    expect(FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA).toMatchObject({
      source_title:
        "СП КР 21-101:2024 «Пожарная автоматика зданий и сооружений» и утверждённая рабочая документация системы",
      source_authority:
        "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики (Госстрой); проектная организация пожарной автоматики; изготовитель адресной системы; ответственный инженер проекта",
    });
  });

  it("builds an automatic complete first estimate", async () => {
    const compiled = await compileFireAlarmSystemExpandedR1(
      FIRE_ALARM_SYSTEM_EXPANDED_SHORT_INPUT,
    );
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(37);
    expect(quantity(compiled.rows, "f09:fire_alarm_system_detector")).toBe("84");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_manual_call_point")).toBe("11");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_panel")).toBe("1");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_loop_isolator")).toBe("5");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_cable")).toBe("2640");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_containment")).toBe("1980");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_cable_fastener")).toBe("3960");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_waste_container")).toBe("6");
  });

  it("applies several edited system assumptions in one recalculation", async () => {
    const compiled = await compileFireAlarmSystemExpandedR1({
      ...FIRE_ALARM_SYSTEM_EXPANDED_ACCEPTANCE_INPUT,
      protected_area_m2: 500,
      device_reserve_factor: 1.1,
      smoke_detector_density_pcs_m2: 0.1,
      manual_call_point_density_pcs_m2: 0.02,
      sounder_density_pcs_m2: 0.03,
      visual_alarm_density_pcs_m2: 0.015,
      interface_module_density_pcs_m2: 0.004,
      panel_capacity_point: 100,
      loop_capacity_point: 60,
      cable_length_rate_m_m2: 3,
      cable_reserve_factor: 1.15,
      containment_share: 0.8,
      junction_box_interval_m: 30,
      cable_fastener_spacing_m: 0.4,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(37);
    expect(quantity(compiled.rows, "f09:fire_alarm_system_detector")).toBe("55");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_manual_call_point")).toBe("11");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_interface_module")).toBe("3");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_panel")).toBe("1");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_cable")).toBe("1725");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_containment")).toBe("1380");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_junction_box")).toBe("58");
    expect(quantity(compiled.rows, "f09:fire_alarm_system_cable_fastener")).toBe("3450");
  });

  it("exposes every preliminary profile value for editing", () => {
    const ids = Object.keys(FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE);
    expect(ids.length).toBe(FIRE_ALARM_SYSTEM_EXPANDED_PARAMETERS.length - 2);
    expect(ids.length).toBeGreaterThan(50);
    expect(Object.values(FIRE_ALARM_SYSTEM_EXPANDED_RUNTIME_CLASSIFICATION))
      .toEqual(ids.map(() => "ASSUMPTION"));
    for (const id of ids) {
      const parameter = FIRE_ALARM_SYSTEM_EXPANDED_PARAMETERS.find(
        (entry) => entry.parameter_id === id,
      );
      expect(parameter?.truth_metadata.runtime_profile_value).toBe(true);
      expect(parameter?.truth_metadata.hidden_default_forbidden).toBe(false);
    }
  });

  it("contains only named fire alarm system rows and no generic building-electrical substitute", () => {
    expect(FIRE_ALARM_SYSTEM_EXPANDED_RESOURCES).toHaveLength(37);
    expect(new Set(FIRE_ALARM_SYSTEM_EXPANDED_RESOURCES.map((row) => row.row_id)).size)
      .toBe(37);
    const titles = JSON.stringify(FIRE_ALARM_SYSTEM_EXPANDED_RESOURCES.map((row) => row.title_ru));
    expect(titles).not.toMatch(/розет|выключател|узо|молниезащит|распределительный щит/iu);
    expect(titles).toMatch(/извещател/iu);
    expect(titles).toMatch(/огнестойк/iu);
    expect(titles).toMatch(/пусконалад/iu);
  });
});
