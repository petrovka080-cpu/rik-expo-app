import type { ConsumerRepairAiDraft } from "../../src/lib/consumerRequests/consumerRequestTypes";
import { applyDrywallCeilingPreparationPolicy } from "../../src/lib/estimate/drywallCeilingPreparationPolicy";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { isDrywallCeilingPreparationIntent } from "../../src/lib/ai/estimatorKernel/constructionDomainLexicon";

function legacyDraft(): ConsumerRepairAiDraft {
  const row = (
    itemType: ConsumerRepairAiDraft["items"][number]["itemType"],
    titleRu: string,
    quantity: number,
    unit: string,
    rowCode: string,
  ): ConsumerRepairAiDraft["items"][number] => ({
    itemType,
    titleRu,
    quantity,
    unit,
    currency: "KGS",
    source: "reference_price_book",
    sourceParameters: { rowCode, includedInProcurement: itemType !== "work" },
  });
  return {
    titleRu: "Подготовка потолка из гипсокартона в техническом помещении — 100 м²",
    summaryRu: "Предварительная профессиональная смета",
    repairType: "drywall",
    items: [
      row("material", "Ремонтный состав для локальных дефектов", 1, "kg", "repair_compound"),
      row("material", "Совместимая грунтовка основания", 1.15, "kg", "primer"),
      row("work", "Подготовка основания плоского потолка", 100, "m2", "operation_work"),
      row("service", "Единая входящая доставка материалов по подтвержденной массе и маршруту", 22.5, "t_km", "delivery"),
      row("service", "Единый вывоз подтвержденной массы строительных отходов", 0.018, "t_km", "waste"),
      row("service", "Оборудование доступа к рабочей зоне по проектному ППР", 4, "shift", "access"),
    ],
    missingData: [],
    dangerousDiyBlocked: false,
  };
}

describe("legacy drywall ceiling preparation successor", () => {
  test("does not borrow preparation intent from a generic handover condition", () => {
    const handoverPrompts = [
      "смета на потолок из ГКЛ 850 кв м в частном доме, зона работ сервисная зона, условие подготовка к сдаче, пакет работ 695",
      "смета на потолок из ГКЛ 48 кв м на производстве, зона работ чистовая зона, условие подготовка к сдаче, пакет работ 700",
      "смета на потолок из ГКЛ 850 кв м в частном доме, условие подготовка объекта к сдаче, пакет работ 1795",
      "смета на потолок из ГКЛ 48 кв м на производстве, условие подготовка работ к передаче, пакет работ 1800",
    ];

    expect(handoverPrompts.map(isDrywallCeilingPreparationIntent)).toEqual([false, false, false, false]);
    expect(isDrywallCeilingPreparationIntent("подготовка существующего потолка из гипсокартона 100 м2")).toBe(true);
    expect(isDrywallCeilingPreparationIntent("потолок из ГКЛ 100 м2 — выполнить подготовку поверхности")).toBe(true);
  });

  test("routes the reported 100 m² technical-room prompt to preparation, not partition installation", () => {
    const result = buildConsumerRepairAiDraft(
      "подготовка потолка из гипсокартона в техническом помещении 100 кв метров",
      { currency: "KGS", city: "Бишкек" },
    );
    const byCode = new Map(result.items.map((item) => [String(item.sourceParameters?.rowCode ?? ""), item]));
    const titles = result.items.map((item) => item.titleRu).join("\n");

    expect(result.selectedWork?.selectedWorkKey).toBe("drywall_ceiling_preparation");
    expect(result.titleRu).toContain("подготовка существующего потолка из ГКЛ");
    expect(titles).not.toMatch(/монтаж каркаса|обшивка (?:первой|второй) стороны|листы ГКЛ.*100/iu);
    expect(titles).not.toMatch(/Ремонтный состав для локальных дефектов|Совместимая грунтовка основания|Оборудование доступа к рабочей зоне/iu);
    expect(titles).toMatch(/Укрывная полиэтиленовая плёнка.*защитный картон/iu);
    expect(titles).toMatch(/Выбранная грунтовка.*картонной поверхностью ГКЛ/iu);
    expect(titles).toMatch(/Осмотр потолка из ГКЛ.*повреждённых швов/iu);
    expect(titles).toMatch(/Промышленный строительный пылесос класса пыли M/iu);
    expect(titles).toMatch(/Подтверждённое средство доступа к рабочей зоне/iu);
    expect(titles).toMatch(/Подготовка, проверка, перестановка.*подтверждённым средством доступа/iu);
    expect(titles).toMatch(/Подтверждённая система защиты от падения/iu);
    expect(titles).toMatch(/Доставка подтверждённого средства доступа/iu);
    expect(titles).toMatch(/Возврат подтверждённого средства доступа/iu);
    expect(result.items.some((item) => /^required_plan_|^elevated_access_/.test(String(item.sourceParameters?.rowCode ?? ""))))
      .toBe(false);

    expect(byCode.get("drywall_prepare_access_equipment")).toMatchObject({
      quantity: 0,
      unit: "shift",
      sourceParameters: {
        includedInEstimate: false,
        includedInProcurement: false,
        parameterBlockerIds: expect.arrayContaining(["working_height_m", "access_system_type"]),
      },
    });
    expect(byCode.get("drywall_prepare_joint_compound")).toMatchObject({
      quantity: 0,
      sourceParameters: {
        includedInEstimate: false,
        includedInProcurement: false,
        parameterBlockerIds: ["repair_area_share_percent", "repair_compound_kg_per_repair_m2"],
      },
    });
    expect(result.missingData).toEqual(expect.arrayContaining([
      "Укажите рабочую высоту потолка и допустимый способ установки вышки-туры.",
      "Какова доля локальных повреждений и общая длина ремонтируемых швов?",
      "Сколько работников одновременно выполняют работы на высоте?",
    ]));
  });

  test("keeps the exact preparation compiler for the reported 500 m² prompt instead of the legacy six-row route", () => {
    const result = buildConsumerRepairAiDraft(
      "подготовка потолка из гипсокартона на большой площади 500 кв метров",
      { currency: "KGS", city: "Бишкек" },
    );
    const rowCodes = result.items.map((item) => String(item.sourceParameters?.rowCode ?? ""));
    const titles = result.items.map((item) => item.titleRu).join("\n");

    expect(result.selectedWork?.selectedWorkKey).toBe("drywall_ceiling_preparation");
    expect(result.items.length).toBeGreaterThan(6);
    expect(rowCodes).toEqual(expect.arrayContaining([
      "drywall_prepare_condition_survey",
      "drywall_prepare_surface_cleaning",
      "drywall_prepare_primer_application",
      "drywall_prepare_readiness_control",
    ]));
    expect(titles).not.toMatch(/^Ремонтный состав для локальных дефектов$|^Совместимая грунтовка основания$|^Подготовка основания плоского потолка$/mu);
    expect(result.missingData.length).toBeGreaterThan(0);
  });

  test("turns the six-row projection into known physical preparation stages and keeps unknown repair quantities explicit", () => {
    const result = applyDrywallCeilingPreparationPolicy(legacyDraft());
    const titles = result.items.map((item) => item.titleRu);
    expect(titles).toEqual(expect.arrayContaining([
      "Шпаклёвочная смесь для локального ремонта ГКЛ, швов и мест крепления",
      "Грунтовка для существующего потолка из ГКЛ — марку и расход уточнить по паспорту материала",
      "Укрытие оборудования и пола перед подготовкой потолка из ГКЛ",
      "Укрывная плёнка и защитное покрытие оборудования и пола технического помещения",
      "Осмотр потолка из ГКЛ, простукивание и разметка трещин, отслоений и повреждённых швов",
      "Очистка потолка из ГКЛ от пыли, слабых участков и загрязнений перед ремонтом",
      "Нанесение грунтовки на подготовленный потолок из ГКЛ",
      "Промышленный строительный пылесос для очистки потолка и рабочей зоны",
    ]));
    expect(result.items.find((item) => item.sourceParameters?.rowCode === "drywall_prepare_protection_material")).toMatchObject({
      quantity: 100,
      unit: "m2",
      sourceParameters: { includedInProcurement: true },
    });
    expect(result.items.find((item) => item.sourceParameters?.rowCode === "drywall_prepare_dust_extractor")).toMatchObject({
      quantity: 2,
      unit: "shift",
      sourceParameters: { includedInProcurement: true },
    });
    expect(result.missingData).toEqual(expect.arrayContaining([
      "Доля площади потолка с локальными дефектами и расход шпаклёвочной смеси",
      "Длина повреждённых швов и трещин ГКЛ для армирующей ленты",
      "Марка грунтовки, расход на 1 м² и число слоёв по паспорту материала",
    ]));
    expect(applyDrywallCeilingPreparationPolicy(result).items).toHaveLength(result.items.length);
  });

  test("keeps the exact 24-row preparation successor on the canonical revision path and activates conditional rows after full input", () => {
    const rawInput = "подготовка потолка из гипсокартона в техническом помещении 100 кв метров";
    const createdAt = "2026-09-07T15:00:00.000Z";
    const initial = createEstimateDraftRevision({
      rawInput,
      city: "Bishkek",
      countryCode: "KG",
      currency: "KGS",
      createdAt,
    });

    expect(initial.matchedFamily).toBe("drywall_ceiling_preparation");
    expect(initial.selectedTemplateId).toBe("drywall_ceiling_preparation_dynamic_professional_boq_runtime_v1");
    expect(initial.status).toBe("needs_more_params_but_preliminary_available");
    expect(initial.boq.rows).toHaveLength(24);
    expect(initial.boq.rows.some((row) => row.rowId.startsWith("passport_"))).toBe(false);
    expect(initial.boq.rows.map((row) => row.rowId)).toEqual(expect.arrayContaining([
      "drywall_prepare_protection_cover",
      "drywall_prepare_joint_compound",
      "drywall_prepare_condition_survey",
      "drywall_prepare_access_equipment",
      "drywall_prepare_access_operations",
      "drywall_prepare_access_delivery",
      "drywall_prepare_access_return",
      "drywall_prepare_fall_protection",
    ]));
    expect(initial.boq.rows.some((row) => /^required_plan_|^elevated_access_/.test(row.rowId))).toBe(false);
    expect(initial.boq.rows.find((row) => row.rowId === "drywall_prepare_access_operations")).toMatchObject({
      rowType: "work",
      includedInProcurement: false,
    });
    expect(initial.boq.rows.find((row) => row.rowId === "drywall_prepare_access_delivery")).toMatchObject({
      rowType: "transport",
      includedInProcurement: false,
    });
    expect(initial.boq.rows.find((row) => row.rowId === "drywall_prepare_access_return")).toMatchObject({
      rowType: "transport",
      includedInProcurement: false,
    });
    expect(initial.missingInputs.map((entry) => entry.key)).toEqual(expect.arrayContaining([
      "working_height_m",
      "height_worker_count",
      "primer_product_reference",
      "primer_kg_per_m2",
      "primer_layer_count",
      "repair_area_share_percent",
      "repair_compound_kg_per_repair_m2",
      "repair_joint_length_m",
      "abrasive_productivity_m2_per_item",
    ]));

    const param = (value: number | string) => ({
      value,
      source: "edited_by_user" as const,
      lastChangedAt: "2026-09-07T15:05:00.000Z",
    });
    const completed = createEstimateDraftRevision({
      estimateDraftId: initial.estimateDraftId,
      previousRevisionId: initial.revisionId,
      revisionIndex: 2,
      source: "param_batch",
      rawInput,
      city: "Bishkek",
      countryCode: "KG",
      currency: "KGS",
      createdAt: "2026-09-07T15:05:00.000Z",
      paramOverrides: {
        protected_area_m2: param(100),
        protection_perimeter_m: param(60),
        waste_bag_count: param(20),
        working_height_m: param(3.2),
        height_worker_count: param(2),
        primer_product_reference: param("Паспорт совместимой грунтовки, подтверждён специалистом"),
        primer_kg_per_m2: param(0.12),
        primer_layer_count: param(1),
        repair_area_share_percent: param(10),
        repair_compound_kg_per_repair_m2: param(1.2),
        repair_joint_length_m: param(25),
        abrasive_productivity_m2_per_item: param(5),
        elevated_work_requirement_state: param("REQUIRED"),
        access_system_type: param("MOBILE_TOWER"),
        access_equipment_shift_count: param(4),
        dust_extractor_shift_count: param(4),
        access_environment: param("INDOOR_LEVEL_FLOOR"),
        access_platform_height_m: param(3.2),
        access_horizontal_reach_m: param(1),
        access_route_clear_width_m: param(1.2),
        access_base_load_capacity_kg_m2: param(500),
        access_platform_load_kg: param(200),
        access_restrictions: param("NONE"),
        access_supply_mode: param("RENT"),
        fall_protection_requirement_state: param("REQUIRED"),
        fall_protection_system_reference: param("Подтверждённая система защиты по ППР"),
        fall_protection_set_count: param(2),
        work_lighting_shift_count: param(4),
        material_delivery_trip_count: param(1),
        access_transport_pricing_mode: param("SEPARATE_TRIPS"),
        access_delivery_trip_count: param(1),
        access_return_trip_count: param(1),
        waste_removal_trip_count: param(1),
      },
    });
    const byCode = new Map(completed.boq.rows.map((row) => [row.rowId, row]));

    expect(completed.status).toBe("draft_ready");
    expect(completed.missingInputs).toEqual([]);
    expect(completed.boq.rows).toHaveLength(24);
    expect(byCode.get("drywall_prepare_joint_compound")).toMatchObject({ quantity: 12, includedInProcurement: true });
    expect(byCode.get("drywall_prepare_joint_tape")).toMatchObject({ quantity: 25, includedInProcurement: true });
    expect(byCode.get("drywall_prepare_abrasive")).toMatchObject({ quantity: 2, includedInProcurement: true });
    expect(byCode.get("drywall_prepare_defect_opening")).toMatchObject({ quantity: 25, includedInProcurement: false });
    expect(byCode.get("drywall_prepare_joint_repair")).toMatchObject({ quantity: 25, includedInProcurement: false });
    expect(byCode.get("drywall_prepare_sanding")).toMatchObject({ quantity: 10, includedInProcurement: false });
    expect(byCode.get("drywall_prepare_fall_protection")).toMatchObject({ quantity: 2, includedInProcurement: true });
    expect(byCode.get("drywall_prepare_access_equipment")).toMatchObject({ quantity: 4, includedInProcurement: true });
    expect(byCode.get("drywall_prepare_access_operations")).toMatchObject({ quantity: 4, includedInProcurement: false });
    expect(byCode.get("drywall_prepare_access_delivery")).toMatchObject({ quantity: 1, includedInProcurement: true });
    expect(byCode.get("drywall_prepare_access_return")).toMatchObject({ quantity: 1, includedInProcurement: true });
  });

  test("does not broaden an unrelated estimate", () => {
    const source = legacyDraft();
    source.items = source.items.filter((item) => item.titleRu !== "Подготовка основания плоского потолка");
    expect(applyDrywallCeilingPreparationPolicy(source)).toBe(source);
  });
});
