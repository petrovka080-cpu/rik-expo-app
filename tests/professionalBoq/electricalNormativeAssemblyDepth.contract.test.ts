import { buildCanonicalElectricalConsumerRepairAiDraft } from "../../src/lib/estimate/v4/electrical/buildCanonicalElectricalConsumerRepairAiDraft";
import type { ElectricalCanonicalParameterValues } from "../../src/lib/estimate/v4/electrical/electricalCanonicalV1";
import {
  buildElectricalProfessionalBoqV1Rows,
  type ElectricalProfessionalBoqV1Context,
} from "../../src/lib/estimate/v4/electrical/electricalProfessionalBoqV1";

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
  restoration_included: false,
  penetration_count: 12,
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

const FULL_ASSEMBLY_CONTEXT: ElectricalProfessionalBoqV1Context = {
  areaM2: 87,
  routeLengthM: 154,
  totalCableLengthM: 169.4,
  outletCount: 10,
  switchCount: 10,
  lightingPointCount: 8,
  lineCount: 7,
  groupCount: 7,
  phaseCount: 1,
  panelIncluded: true,
  protectiveDevicesIncluded: true,
  groundingIncluded: true,
  wiringMethod: "open",
  containmentType: "cable_channel",
  containmentKnown: true,
  cableSpecificationKnown: true,
  estimatedLoadKnown: true,
  restorationIncluded: true,
  penetrationCount: 12,
};

describe("normative electrical professional BOQ assembly", () => {
  it("covers the applicable electrical WBS with named non-padded rows", () => {
    const draft = buildElectricalDraft();
    const detailedRows = draft.items.filter((item) =>
      String(item.sourceParameters?.rowCode).startsWith(
        "electrical_reference_",
      ),
    );

    const codes = detailedRows.map(
      (item) => item.sourceParameters?.rowCode,
    );
    expect(new Set(codes).size).toBe(codes.length);
    const requiredWbsRows = {
      electrical_reference_route_fixings: "materials",
      electrical_reference_wall_sleeves: "materials",
      electrical_reference_firestop: "materials",
      electrical_reference_channel_cover: "materials",
      electrical_reference_channel_internal_angles: "materials",
      electrical_reference_channel_external_angles: "materials",
      electrical_reference_channel_tees: "materials",
      electrical_reference_channel_partitions: "materials",
      electrical_reference_panel_terminal_blocks: "materials",
      electrical_reference_main_isolator: "materials",
      electrical_reference_rcd: "materials",
      electrical_reference_bonding_conductor: "materials",
      electrical_reference_earthing_terminals: "materials",
      electrical_reference_incoming_material_inspection: "labor",
      electrical_reference_penetration_drilling: "labor",
      electrical_reference_channel_body_install: "labor",
      electrical_reference_channel_fittings_install: "labor",
      electrical_reference_channel_cover_close: "labor",
      electrical_reference_cable_measure_cut: "labor",
      electrical_reference_ferrule_crimping: "labor",
      electrical_reference_outlet_wiring: "labor",
      electrical_reference_switch_wiring: "labor",
      electrical_reference_lighting_connector_install: "labor",
      electrical_reference_panel_din_duct_install: "labor",
      electrical_reference_panel_internal_wiring: "labor",
      electrical_reference_breakers_install: "labor",
      electrical_reference_busbars_install: "labor",
      electrical_reference_bonding_connections: "labor",
      electrical_reference_pe_continuity_test: "labor",
      electrical_reference_loop_impedance_test: "labor",
      electrical_reference_prospective_fault_current: "labor",
      electrical_reference_rcd_test: "labor",
      electrical_reference_functional_test: "labor",
      electrical_reference_test_protocol: "labor",
      electrical_reference_as_built_plan: "labor",
      electrical_reference_material_certificates_register: "labor",
      electrical_reference_installation_tester: "equipment",
      electrical_reference_core_drill: "equipment",
      electrical_reference_label_printer: "equipment",
      electrical_reference_vertical_handling: "delivery",
      electrical_reference_packaging_waste: "delivery",
    } as const;
    for (const [rowCode, category] of Object.entries(requiredWbsRows)) {
      expect(
        detailedRows.filter(
          (item) => item.sourceParameters?.rowCode === rowCode,
        ),
      ).toEqual([
        expect.objectContaining({
          category,
          quantity: expect.any(Number),
          formulaId: expect.any(String),
          quantityFormula: expect.any(String),
        }),
      ]);
    }

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
    expect(codes).not.toEqual(expect.arrayContaining([
      "electrical_reference_containment_bends",
      "electrical_reference_containment_fixing",
      "electrical_reference_panel_devices_install",
      "electrical_reference_channel_cable_placement",
    ]));
    expect(
      draft.items.some(
        (item) =>
          item.sourceParameters?.rowCode === "electrical_chasing_or_channel",
      ),
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
      detailedRows.every(
        (item) => item.normReviewStatus === "EXPERT_REVIEW_REQUIRED",
      ),
    ).toBe(true);
    expect(
      new Set(
        detailedRows.map(
          (item) => item.sourceParameters?.normSourceProfile,
        ),
      ),
    ).toEqual(new Set(["KG_PRIMARY", "INTL_REFERENCE"]));
    expect(
      detailedRows.every((item) => {
        const source = item.sourceParameters ?? {};
        return (
          typeof source.normSourceJurisdiction === "string" &&
          typeof source.normSourcePublisher === "string" &&
          typeof source.normSourceEffectiveDate === "string" &&
          source.normSourceCheckedAt === "2026-07-29" &&
          typeof source.normSourceReference === "string" &&
          /^[a-f0-9]{64}$/u.test(
            String(source.normSourceSnapshotSha256),
          ) &&
          typeof source.normSourceLicenseStatus === "string" &&
          source.normSourceLifecycleStatus === "EXPERT_REVIEW_REQUIRED" &&
          typeof source.applicabilityRule === "string"
        );
      }),
    ).toBe(true);
    expect(
      detailedRows
        .filter(
          (item) =>
            item.sourceParameters?.normSourceProfile === "KG_PRIMARY",
        )
        .every(
          (item) =>
            item.sourceParameters?.normSourceJurisdiction === "KG" &&
            !String(item.normSourceId).startsWith("IEC_"),
        ),
    ).toBe(true);
    expect(
      detailedRows
        .filter(
          (item) =>
            item.sourceParameters?.normSourceProfile === "INTL_REFERENCE",
        )
        .every(
          (item) =>
            item.sourceParameters?.normSourceJurisdiction ===
              "INTERNATIONAL_REFERENCE" &&
            String(item.normSourceId).startsWith("IEC_"),
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
      169.4,
    );
    expect(quantity(after, "electrical_reference_cable_measure_cut")).toBe(220);
  });

  it("applies explicit scope switches and rejects invalid dimensions", () => {
    const codesFor = (
      patch: Partial<ElectricalProfessionalBoqV1Context>,
    ) => buildElectricalProfessionalBoqV1Rows({
      ...FULL_ASSEMBLY_CONTEXT,
      ...patch,
    }).map((row) => row.code);

    const openChannelCodes = codesFor({});
    expect(openChannelCodes).toEqual(expect.arrayContaining([
      "electrical_reference_channel_cover",
      "electrical_reference_channel_body_install",
      "electrical_reference_channel_cover_close",
    ]));
    expect(openChannelCodes).not.toContain(
      "electrical_reference_chase_repair",
    );

    const concealedConduitCodes = codesFor({
      wiringMethod: "concealed",
      containmentType: "conduit",
    });
    expect(concealedConduitCodes).toEqual(expect.arrayContaining([
      "electrical_reference_containment_bends",
      "electrical_reference_containment_fixing",
      "electrical_reference_chase_repair",
    ]));
    expect(
      concealedConduitCodes.some((code) =>
        code.startsWith("electrical_reference_channel_")
      ),
    ).toBe(false);

    const noPanelCodes = codesFor({ panelIncluded: false });
    expect(
      noPanelCodes.some((code) =>
        /panel_|main_isolator|torque|circuit_directory/iu.test(code)
      ),
    ).toBe(false);

    const noGroundingCodes = codesFor({ groundingIncluded: false });
    expect(
      noGroundingCodes.some((code) =>
        /bonding|earthing|pe_continuity|busbars/iu.test(code)
      ),
    ).toBe(false);

    const noProtectionCodes = codesFor({
      protectiveDevicesIncluded: false,
    });
    expect(
      noProtectionCodes.some((code) =>
        /protection_coordination|breakers|_rcd|_spd|loop_impedance|fault_current|controlled_energization/iu.test(
          code,
        )
      ),
    ).toBe(false);

    expect(codesFor({ phaseCount: 1 })).not.toContain(
      "electrical_reference_phase_sequence_test",
    );
    expect(codesFor({ phaseCount: 3 })).toContain(
      "electrical_reference_phase_sequence_test",
    );

    expect(() => buildElectricalProfessionalBoqV1Rows({
      ...FULL_ASSEMBLY_CONTEXT,
      routeLengthM: -1,
    })).toThrow("ELECTRICAL_PROFESSIONAL_BOQ_INVALID_QUANTITY");
    expect(() => buildElectricalProfessionalBoqV1Rows({
      ...FULL_ASSEMBLY_CONTEXT,
      phaseCount: 2,
    })).toThrow("ELECTRICAL_PROFESSIONAL_BOQ_INVALID_PHASE_COUNT");
    expect(() => buildElectricalProfessionalBoqV1Rows({
      ...FULL_ASSEMBLY_CONTEXT,
      totalCableLengthM: 100,
    })).toThrow("ELECTRICAL_PROFESSIONAL_BOQ_INCOMPATIBLE_CABLE_LENGTH");
  });
});
