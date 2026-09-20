import type { ConsumerRepairAiDraft } from "../../src/lib/consumerRequests/consumerRequestTypes";
import { buildProfessionalBoqRowsFromConsumerDraft } from "../../src/lib/estimate/createEstimateDraftRevision";
import { applyElevatedWorkAccessPolicy } from "../../src/lib/estimate/elevatedWorkAccessPolicy";
import { applyConstructionScopeCompletenessPolicies } from "../../src/lib/estimate/professionalBoqAssumptions";
import { resolveProfessionalPriceRecord } from "../../src/lib/estimate/professionalPricebookRegistry";

function draft(input: {
  titleRu: string;
  itemTitles?: readonly string[];
  abstractAccess?: boolean;
  currency?: string;
}): ConsumerRepairAiDraft {
  const currency = input.currency ?? "KGS";
  const items: ConsumerRepairAiDraft["items"] = (input.itemTitles ?? [input.titleRu]).map((titleRu, index) => ({
    itemType: "work",
    titleRu,
    quantity: 100,
    unit: "m2",
    currency,
    source: "reference_price_book",
    sourceParameters: { rowCode: `source_${index}`, includedInProcurement: false },
  }));
  if (input.abstractAccess) {
    items.push({
      itemType: "service",
      titleRu: "Оборудование доступа к рабочей зоне по проектному ППР",
      quantity: 4,
      unit: "shift",
      currency,
      source: "reference_price_book",
      sourceParameters: { rowCode: "source_access", includedInProcurement: false },
    });
  }
  return {
    titleRu: input.titleRu,
    summaryRu: "Предварительная профессиональная смета",
    repairType: input.titleRu,
    items,
    missingData: [],
    dangerousDiyBlocked: false,
  };
}

describe("professional elevated-work access policy", () => {
  test("replaces the abstract ceiling equipment row and adds every connected operation without duplication", () => {
    const source = draft({
      titleRu: "Подготовка потолка из гипсокартона в техническом помещении — 100 м²",
      abstractAccess: true,
      currency: "RUB",
    });
    const result = applyElevatedWorkAccessPolicy(source, {
      prompt: "подготовка потолка из гипсокартона в техническом помещении 100 кв метров",
    });

    expect(result.items.filter((row) =>
      row.titleRu === "Передвижная алюминиевая вышка-тура с настилом, ограждением и опорами-стабилизаторами"
    )).toHaveLength(1);
    const equipment = result.items.find((row) => row.sourceParameters?.rowCode === "source_access");
    expect(equipment).toMatchObject({
      titleRu: "Передвижная алюминиевая вышка-тура с настилом, ограждением и опорами-стабилизаторами",
      currency: "RUB",
      sourceParameters: { includedInProcurement: true },
    });
    expect(result.items.some((row) => /Сборка, предсменный осмотр, перестановка и разборка/iu.test(row.titleRu))).toBe(true);
    expect(result.items.some((row) => /Доставка на объект и возврат/iu.test(row.titleRu))).toBe(true);
    expect(result.items.some((row) => /страховочная привязь.*анкерная линия/iu.test(row.titleRu))).toBe(true);
    expect(result.missingData.some((item) => item.startsWith("Рабочая высота:"))).toBe(true);
    expect(result.missingData.some((item) => item.startsWith("Численность бригады на высоте"))).toBe(true);

    const professionalRows = buildProfessionalBoqRowsFromConsumerDraft(result);
    expect(professionalRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rowId: "source_access",
        rowType: "equipment",
        normFamilyId: "norm-family:elevated-access:mobile-aluminium-tower",
      }),
      expect.objectContaining({
        rowId: "elevated_access_assembly_reposition_dismantle",
        rowType: "work",
        normFamilyId: "norm-family:elevated-access:mobile-aluminium-tower",
      }),
      expect.objectContaining({
        rowId: "elevated_access_delivery_return",
        rowType: "transport",
        normFamilyId: "norm-family:elevated-access:mobile-aluminium-tower",
      }),
      expect.objectContaining({
        rowId: "elevated_access_fall_protection_set",
        rowType: "equipment",
        normFamilyId: "norm-family:elevated-access:fall-protection",
      }),
    ]));
    for (const row of professionalRows.filter((item) =>
      [
        "source_access",
        "elevated_access_assembly_reposition_dismantle",
        "elevated_access_delivery_return",
        "elevated_access_fall_protection_set",
      ].includes(item.rowId)
    )) {
      const price = resolveProfessionalPriceRecord({
        normFamilyId: row.normFamilyId,
        rowType: row.rowType,
        unit: row.unit,
      });
      expect(price).toMatchObject({ trustLevel: "preliminary_only", currency: "KGS" });
      expect(price?.unitPrice).toBeGreaterThan(0);
    }
    expect(result.items.filter((row) => row.normSourceId === "src_professional_elevated_work_access_scope_v1")
      .every((row) => row.unitPrice == null && row.priceStatus === "PRICE_MISSING")).toBe(true);

    const repeated = applyElevatedWorkAccessPolicy(result, { prompt: source.titleRu });
    expect(repeated.items).toHaveLength(result.items.length);
  });

  test.each<[string, RegExp, string]>([
    ["Штукатурка стен производственного помещения 200 м²", /алюминиевая вышка-тура/iu, "norm-family:elevated-access:mobile-aluminium-tower"],
    ["Ремонт фасада здания 300 м²", /Инвентарные рамные фасадные леса/iu, "norm-family:elevated-access:facade-frame-scaffold"],
    ["Монтаж наружной световой вывески", /Коленчатая автовышка/iu, "norm-family:elevated-access:articulated-aerial-platform"],
    ["Монтаж подвесных воздуховодов вентиляции", /алюминиевая вышка-тура/iu, "norm-family:elevated-access:mobile-aluminium-tower"],
    ["Монтаж кабельных лотков под потолком", /алюминиевая вышка-тура/iu, "norm-family:elevated-access:mobile-aluminium-tower"],
    ["Монтаж пожарной сигнализации и дымовых извещателей", /алюминиевая вышка-тура/iu, "norm-family:elevated-access:mobile-aluminium-tower"],
    ["Монтаж спринклерной системы пожаротушения под перекрытием", /алюминиевая вышка-тура/iu, "norm-family:elevated-access:mobile-aluminium-tower"],
    ["Монтаж трубопровода пожаротушения на высоте 6 м", /ножничный подъёмник/iu, "norm-family:elevated-access:self-propelled-scissor-lift"],
    ["Монтаж оповещения СОУЭ в производственном помещении", /алюминиевая вышка-тура/iu, "norm-family:elevated-access:mobile-aluminium-tower"],
    ["Монтаж системы дымоудаления", /алюминиевая вышка-тура/iu, "norm-family:elevated-access:mobile-aluminium-tower"],
    ["Ремонт кровли производственного здания", /рамные леса.*выходом на кровлю/iu, "norm-family:elevated-access:facade-frame-scaffold"],
    ["Монтаж металлического навеса над входом", /Коленчатая автовышка/iu, "norm-family:elevated-access:articulated-aerial-platform"],
    ["Монтаж наружного дымохода котельной", /алюминиевая вышка-тура/iu, "norm-family:elevated-access:mobile-aluminium-tower"],
  ])("adds a concrete safe-access package for an elevated construction scope: %s", (prompt, equipmentPattern, normFamilyId) => {
    const result = applyElevatedWorkAccessPolicy(draft({ titleRu: prompt }), { prompt });
    expect(result.items.some((row) => equipmentPattern.test(row.titleRu))).toBe(true);
    expect(result.items.find((row) => row.sourceParameters?.rowCode === "elevated_access_equipment")?.normFamilyId).toBe(normFamilyId);
    expect(result.items.some((row) => row.sourceParameters?.rowCode === "elevated_access_assembly_reposition_dismantle")).toBe(true);
    expect(result.items.some((row) => row.sourceParameters?.rowCode === "elevated_access_delivery_return")).toBe(true);
    expect(result.items.some((row) => row.sourceParameters?.rowCode === "elevated_access_fall_protection_set")).toBe(true);
  });

  test("runs the physical-scope policy for legacy drafts without professional provenance", () => {
    const source = draft({ titleRu: "Монтаж светильников на потолке 80 м²" });
    const result = applyConstructionScopeCompletenessPolicies(source, { prompt: source.titleRu });

    expect(result.items.some((row) => row.sourceParameters?.rowCode === "elevated_access_equipment")).toBe(true);
    expect(result.items.some((row) => row.sourceParameters?.rowCode === "elevated_access_assembly_reposition_dismantle")).toBe(true);
    expect(result.items.some((row) => row.sourceParameters?.rowCode === "elevated_access_delivery_return")).toBe(true);
    expect(result.items.some((row) => row.sourceParameters?.rowCode === "elevated_access_fall_protection_set")).toBe(true);
  });

  test("adds a sheet lift only when gypsum-board ceiling installation is actually in scope", () => {
    const result = applyElevatedWorkAccessPolicy(draft({
      titleRu: "Монтаж потолка из гипсокартона 100 м²",
      itemTitles: ["Монтаж листов гипсокартона на потолок"],
    }), { prompt: "Монтаж потолка из гипсокартона 100 м²" });
    expect(result.items.some((row) => row.titleRu === "Подъёмник листов ГКЛ для монтажа потолка")).toBe(true);
  });

  test("binds supplemental access rows to the selected professional work identity", () => {
    const source = draft({ titleRu: "Монтаж подвесных воздуховодов вентиляции 100 м²" });
    source.selectedWork = {
      selectedWorkKey: "duct_installation",
      selectedWorkTitleRu: "Монтаж воздуховодов",
      selectedWorkCategoryKey: "ventilation_ac",
      selectedWorkCategoryTitleRu: "Вентиляция",
      selectedWorkRawInput: source.titleRu,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    };
    const result = applyElevatedWorkAccessPolicy(source, { prompt: source.titleRu });
    const supplemental = result.items.filter((row) =>
      row.sourceParameters?.supplementalCompositionOwner === "professional-elevated-work-access-policy:v1"
    );

    expect(supplemental.length).toBeGreaterThan(0);
    expect(supplemental.every((row) => row.sourceParameters?.selectedWorkKey === "duct_installation")).toBe(true);
  });

  test("reuses a confirmed ceiling height already carried by the canonical draft", () => {
    const source = draft({ titleRu: "Капитальный ремонт: потолок 3 м" });
    const firstItem = source.items[0];
    if (!firstItem) throw new Error("test draft item missing");
    firstItem.sourceParameters = {
      ...firstItem.sourceParameters,
      ceiling_height_m: 3,
    };
    const result = applyElevatedWorkAccessPolicy(source, { prompt: source.titleRu });

    expect(result.items.find((row) => row.sourceParameters?.rowCode === "elevated_access_equipment")
      ?.sourceParameters?.workingHeightM).toBe(3);
    expect(result.missingData.some((item) => item.startsWith("Рабочая высота:"))).toBe(false);
  });

  test("does not invent height equipment for ground-level floor preparation", () => {
    const source = draft({ titleRu: "Подготовка пола под ламинат 100 м²" });
    const result = applyElevatedWorkAccessPolicy(source, { prompt: source.titleRu });
    expect(result).toBe(source);
  });

  test("does not treat an asphalt upper layer as work above human height", () => {
    const source = draft({
      titleRu: "Ремонт асфальтового покрытия 100 м²",
      itemTitles: [
        "Укладка верхнего слоя асфальтобетонной смеси",
        "Уплотнение верхнего слоя дорожным катком",
      ],
    });
    source.repairType = "asphalt_repair";
    const result = applyElevatedWorkAccessPolicy(source, {
      prompt: "Ремонт асфальтового покрытия 100 м²",
    });

    expect(result).toBe(source);
    expect(result.items.some((row) => String(row.sourceParameters?.rowCode).startsWith("elevated_access_"))).toBe(false);
  });
});
