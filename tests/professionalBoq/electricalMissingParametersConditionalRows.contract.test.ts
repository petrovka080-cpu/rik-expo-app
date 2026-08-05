import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";

describe("electrical BOQ with incomplete route parameters", () => {
  it("shows cable as a blocked conditional row without charging a hidden default", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "смета на электромонтаж дома 180 кв м",
      countryCode: "KG",
      city: "Bishkek",
      language: "ru",
      locale: "ru-KG",
    });
    const cableRow = estimate.sections
      .flatMap((section) => section.rows)
      .find((row) => row.code === "electrical_cable_parameters_required");

    expect(cableRow).toEqual(expect.objectContaining({
      name: expect.stringContaining("Кабель"),
      quantity: 0,
      unitPrice: 0,
      total: 0,
      priceStatus: "unavailable",
      includedInEstimate: false,
      includedInProcurement: false,
      optional: true,
      editable: true,
    }));
    expect(cableRow?.sourceParameters?.parameterBlockerIds).toEqual([
      "route_length_m",
      "cable_type",
      "cable_section_mm2",
      "line_count",
      "cable_reserve_factor",
    ]);
    expect(cableRow?.calculationTrace).toContain(
      "not_calculated_until(route_length_m, cable_type, cable_section_mm2)",
    );
  });

  it("shows panel and chasing scope as honest blocked rows", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "смета на электромонтаж дома 180 кв м",
      countryCode: "KG",
      city: "Bishkek",
      language: "ru",
      locale: "ru-KG",
    });
    const rows = estimate.sections.flatMap((section) => section.rows);
    const panelRow = rows.find(
      (row) => row.code === "electrical_panel_parameters_required",
    );
    const chasingRow = rows.find(
      (row) => row.code === "electrical_chasing_parameters_required",
    );

    expect(panelRow).toEqual(expect.objectContaining({
      name: expect.stringContaining("Щит и автоматика"),
      quantity: 0,
      unitPrice: 0,
      total: 0,
      includedInEstimate: false,
      includedInProcurement: false,
      optional: true,
      editable: true,
    }));
    expect(panelRow?.sourceParameters?.parameterBlockerIds).toEqual([
      "panel_included",
      "protective_devices_included",
      "phase_count",
      "estimated_load_kw",
    ]);
    expect(chasingRow).toEqual(expect.objectContaining({
      name: expect.stringContaining("штроборез"),
      quantity: 0,
      unitPrice: 0,
      total: 0,
      includedInEstimate: false,
      includedInProcurement: false,
    }));
  });
});
