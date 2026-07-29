import { buildCanonicalElectricalConsumerRepairAiDraft } from "../../src/lib/estimate/v4/electrical/buildCanonicalElectricalConsumerRepairAiDraft";
import type { ElectricalCanonicalParameterValues } from "../../src/lib/estimate/v4/electrical/electricalCanonicalV1";

const FULL_ELECTRICAL_PARAMETERS: ElectricalCanonicalParameterValues = {
  area_m2: 87,
  route_length_m: 154,
  outlet_count: 10,
  switch_count: 10,
  lighting_point_count: 8,
  estimated_load_kw: 21,
  wiring_method: "open",
  containment_type: "cable_channel",
  wall_material: "concrete",
  cable_type: "ВВГнг-LS",
  cable_section_mm2: 2.5,
  line_count: 7,
  group_count: 7,
  phase_count: 1,
  panel_included: true,
  protective_devices_included: true,
  grounding_included: true,
  demolition_included: false,
  installation_height_m: 2.5,
  access_condition: "normal",
  cable_reserve_factor: 1.1,
  work_scope_type: "new_installation",
};

function buildElectricalDraft(routeLengthM = 154) {
  return buildCanonicalElectricalConsumerRepairAiDraft({
    text: [
      "электромонтаж 10 розеток и 10 выключателей, 8 точек освещения",
      `длина трассы ${routeLengthM} м, площадь 87 м², нагрузка 21 кВт`,
      "открытая прокладка в кабель-канале, кабель ВВГнг-LS 2,5 мм²",
    ].join("\n"),
    parameterOverrides: {
      ...FULL_ELECTRICAL_PARAMETERS,
      route_length_m: routeLengthM,
    },
  });
}

describe("normative electrical professional BOQ assembly", () => {
  it("produces a non-padded named assembly comparable in depth to infrastructure BOQ", () => {
    const draft = buildElectricalDraft();
    const detailedRows = draft.items.filter((item) =>
      String(item.sourceParameters?.rowCode).startsWith(
        "electrical_reference_",
      ),
    );

    expect(draft.items.length).toBeGreaterThanOrEqual(130);
    expect(detailedRows.length).toBeGreaterThanOrEqual(105);
    expect(
      detailedRows.filter((item) => item.category === "materials").length,
    ).toBeGreaterThanOrEqual(40);
    expect(
      detailedRows.filter((item) => item.category === "labor").length,
    ).toBeGreaterThanOrEqual(55);
    expect(
      detailedRows.filter((item) => item.category === "equipment").length,
    ).toBeGreaterThanOrEqual(8);
    expect(
      detailedRows.filter((item) => item.category === "delivery").length,
    ).toBeGreaterThanOrEqual(2);

    const codes = detailedRows.map(
      (item) => item.sourceParameters?.rowCode,
    );
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual(expect.arrayContaining([
      "electrical_reference_route_fixings",
      "electrical_reference_wall_sleeves",
      "electrical_reference_firestop",
      "electrical_reference_main_isolator",
      "electrical_reference_rcd",
      "electrical_reference_panel_terminal_blocks",
      "electrical_reference_channel_internal_angles",
      "electrical_reference_channel_external_angles",
      "electrical_reference_channel_tees",
      "electrical_reference_bonding_conductor",
      "electrical_reference_ferrule_crimping",
      "electrical_reference_channel_body_install",
      "electrical_reference_panel_internal_wiring",
      "electrical_reference_breakers_install",
      "electrical_reference_loop_impedance_test",
      "electrical_reference_prospective_fault_current",
      "electrical_reference_rcd_test",
      "electrical_reference_test_protocol",
      "electrical_reference_material_certificates_register",
      "electrical_reference_as_built_plan",
      "electrical_reference_installation_tester",
    ]));

    const visibleNames = detailedRows.map((item) =>
      item.titleRu.replace(/^\d+\.\d+\s+/, ""),
    );
    expect(new Set(visibleNames).size).toBe(visibleNames.length);
    expect(
      visibleNames.some((name) =>
        /^(материал|работы|прочее|дополнительные материалы)$/iu.test(name)
      ),
    ).toBe(false);
    expect(
      visibleNames.some((name) => /assurance|padding|резервная строка/iu.test(name)),
    ).toBe(false);
  });

  it("binds every detailed row to honest Kyrgyz or IEC scope metadata", () => {
    const detailedRows = buildElectricalDraft().items.filter((item) =>
      String(item.sourceParameters?.rowCode).startsWith(
        "electrical_reference_",
      ),
    );

    expect(
      detailedRows.every((item) =>
        Boolean(
          item.formulaId &&
          item.quantityFormula &&
          item.calculationTrace &&
          item.normId &&
          item.normFamilyId &&
          item.normSourceId &&
          item.normSourceTitle &&
          item.normVersion &&
          item.normReviewStatus,
        )
      ),
    ).toBe(true);
    expect(new Set(detailedRows.map((item) => item.normSourceId))).toEqual(
      new Set([
        "KG_KRERM_08_2015",
        "KG_MATERIAL_BOOKS_25_26_27",
        "IEC_60364_5_53_2019_AMD2_2024",
        "IEC_60364_5_54_2011_AMD1_2021",
        "KG_KRERP_01_2015",
        "SP_256_1325800_2016_SP_76_13330_2016",
        "KG_GOST_31565_2012",
      ]),
    );
    expect(
      detailedRows.every((item) =>
        !/verified|certified|approved_rate/iu.test(item.normReviewStatus ?? "")
      ),
    ).toBe(true);

    const conditionalSpd = detailedRows.find(
      (item) =>
        item.sourceParameters?.rowCode === "electrical_reference_spd",
    );
    expect(conditionalSpd).toEqual(expect.objectContaining({
      unitPrice: null,
      priceStatus: "PRICE_MISSING",
    }));
    expect(conditionalSpd?.sourceParameters).toEqual(expect.objectContaining({
      includedInEstimate: false,
      includedInProcurement: false,
      parameterBlockerIds: [
        "surge_protection_requirement",
        "earthing_system_type",
      ],
    }));
  });

  it("recalculates route-derived named materials and operations from canonical input", () => {
    const before = buildElectricalDraft(154);
    const after = buildElectricalDraft(200);
    const quantity = (
      draft: ReturnType<typeof buildElectricalDraft>,
      rowCode: string,
    ) => draft.items.find(
      (item) => item.sourceParameters?.rowCode === rowCode,
    )?.quantity;

    expect(quantity(before, "electrical_reference_route_fixings")).toBe(257);
    expect(quantity(after, "electrical_reference_route_fixings")).toBe(334);
    expect(quantity(before, "electrical_reference_channel_body_install")).toBe(154);
    expect(quantity(after, "electrical_reference_channel_body_install")).toBe(200);
    expect(quantity(before, "electrical_reference_cable_measure_cut")).toBe(
      1185.8,
    );
    expect(quantity(after, "electrical_reference_cable_measure_cut")).toBe(1540);
  });
});
