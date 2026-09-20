import type { ConsumerRepairAiDraft } from "../consumerRequests/consumerRequestTypes";

export const ELEVATED_WORK_ACCESS_POLICY_ID = "professional-elevated-work-access-policy:v1";
export const ELEVATED_WORK_ACCESS_SUPPLEMENT_ROW_CODES = [
  "elevated_access_assembly_reposition_dismantle",
  "elevated_access_delivery_return",
  "elevated_access_equipment",
  "elevated_access_fall_protection_set",
  "drywall_ceiling_board_lift",
] as const;

const ACCESS_POLICY_ID = ELEVATED_WORK_ACCESS_POLICY_ID;
const ACCESS_NORM_SOURCE_ID = "src_professional_elevated_work_access_scope_v1";
const DEFAULT_ACCESS_PRODUCTIVITY_M2_PER_SHIFT = 25;

type ElevatedWorkAccessSupplementCarrier = {
  sourceParameters?: Readonly<Record<string, unknown>> | null;
};

export function isElevatedWorkAccessSupplement(
  item: ElevatedWorkAccessSupplementCarrier,
): boolean {
  const sourceParameters = item.sourceParameters;
  if (sourceParameters?.supplementalCompositionOwner !== ACCESS_POLICY_ID) return false;
  if (sourceParameters.elevatedWorkAccessPolicy !== ACCESS_POLICY_ID) return false;
  const rowCode = String(sourceParameters.rowCode ?? "");
  return (ELEVATED_WORK_ACCESS_SUPPLEMENT_ROW_CODES as readonly string[]).includes(rowCode);
}

const ELEVATED_SCOPE_RE =
  /(?:потол|кровл|крыш|фасад|высотн|на\s+высот|выше\s+человеческого\s+роста|подвесн|над\s+голов|верхн[^.;]{0,24}(?:част|зон)|стен|перегород|колонн|витраж|наружн[^.;]{0,20}остекл|воздуховод|вентиляц|кабельн[^.;]{0,20}лот|светильник|люстр|спринклер|пожаротуш|пожарн[^.;]{0,30}(?:извещ|датчик|сигнализац|систем|трубопровод|клапан|оповещ)|(?:^|\s)апс(?:\s|$)|соуэ|дымоудален|опор[^.;]{0,20}освещ|вывеск|металлоконструк|ферм|балк|ceiling|overhead|roof|facade|wall|partition|column|duct|cable\s+tray|luminaire|sprinkler|fire\s+(?:alarm|suppression|protection)|at\s+height)/iu;
const ADDITIONAL_ELEVATED_SCOPE_RE =
  /(?:навес|козыр[еёьк]|дымох|водосток|антенн|мачт|верхолаз|эстакад|галере|наружн[^.;]{0,24}(?:блок|кондиционер|трубопровод)|canopy|awning|chimney|gutter|antenna|mast|pipe\s+rack)/iu;
const ROOF_ELEVATED_SCOPE_RE = /(?:кровл|крыш|roof)/iu;
const EXTERIOR_ELEVATED_SCOPE_RE = /(?:фасад|кровл|крыш|facade|roof)/iu;
const AERIAL_PLATFORM_SCOPE_RE =
  /(?:опор[^.;]{0,20}освещ|наружн[^.;]{0,20}(?:светильник|вывеск|остекл)|металлоконструк|ферм|навес|козыр[еёьк]|автовышк|aerial\s+platform|lighting\s+pole|steel\s+structure|canopy|awning)/iu;
const DRYWALL_CEILING_RE = /(?:гипсокартон|гкл|drywall)[^.;]{0,80}(?:потол|ceiling)|(?:потол|ceiling)[^.;]{0,80}(?:гипсокартон|гкл|drywall)/iu;
const CONCRETE_ACCESS_EQUIPMENT_RE =
  /(?:вышка-тур|вышки-тур|подмост|строительн[^.;]{0,20}лес(?:а|ов|ам|ами|ах)?(?![\p{L}])|ножничн[^.;]{0,20}подъёмн|фасадн[^.;]{0,20}платформ|mobile\s+tower|scaffold|scissor\s+lift|aerial\s+platform)/iu;
const ACCESS_ASSEMBLY_RE =
  /(?:монтаж|сборк|перестанов|демонтаж)[^.;]{0,80}(?:вышк|подмост|лес(?:а|ов|ам|ами|ах)?(?![\p{L}])|access\s+tower|scaffold)/iu;
const ACCESS_DELIVERY_RE =
  /(?:доставк|возврат|вывоз)[^.;]{0,80}(?:вышк|подмост|лес(?:а|ов|ам|ами|ах)?(?![\p{L}])|подъёмник|подъемник|автовышк|платформ|access\s+tower|scaffold|lift|platform)/iu;
const FALL_PROTECTION_RE =
  /(?:страховочн[^.;]{0,30}(?:привяз|строп|систем)|анкерн[^.;]{0,20}лини|fall[-\s]?arrest|safety\s+harness)/iu;
const ABSTRACT_ACCESS_EQUIPMENT_RE = /^оборудование\s+доступа\s+к\s+рабочей\s+зоне/iu;
const BOARD_LIFT_RE = /(?:подъёмник|подъемник)[^.;]{0,40}(?:гкл|лист|drywall)|drywall\s+(?:board|panel)\s+lift/iu;
const DRYWALL_INSTALLATION_RE =
  /(?:лист[^.;]{0,20}гипсокартон|обшивк[^.;]{0,20}лист|монтаж[^.;]{0,20}лист|drywall\s+(?:board|sheet))/iu;

function normalizedRequestScopeText(draft: ConsumerRepairAiDraft, prompt: string): string {
  return [
    prompt,
    draft.titleRu,
    draft.repairType,
    draft.selectedWork?.selectedWorkKey,
    draft.selectedWork?.selectedWorkTitleRu,
  ].filter(Boolean).join(" ");
}

function normalizedBoqText(draft: ConsumerRepairAiDraft, prompt: string): string {
  return [
    normalizedRequestScopeText(draft, prompt),
    ...draft.items.map((item) => item.titleRu),
  ].filter(Boolean).join(" ");
}

function explicitWorkingHeightM(text: string): number | null {
  const normalized = text.normalize("NFKC").replace(/,/gu, ".");
  const patterns = [
    /(?:высот(?:а|е|ы|ой|у)?|рабочая\s+высота|working\s+height|at\s+height)\D{0,16}(\d+(?:\.\d+)?)\s*(?:м|m)(?![\p{L}\p{N}])/iu,
    /(\d+(?:\.\d+)?)\s*(?:м|m)\D{0,16}(?:высот(?:а|е|ы|ой|у)?|working\s+height)/iu,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(normalized);
    if (!match?.[1]) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function workingHeightMFromDraft(draft: ConsumerRepairAiDraft): number | null {
  const candidates = draft.items.flatMap((item) => {
    const source = item.sourceParameters ?? {};
    return [
      source.working_height_m,
      source.workingHeightM,
      source.ceiling_height_m,
      source.ceilingHeightM,
      source.height_m,
      source.heightM,
    ];
  });
  for (const candidate of candidates) {
    const value = typeof candidate === "number" ? candidate : Number(String(candidate ?? "").replace(",", "."));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function basisAreaM2(draft: ConsumerRepairAiDraft): number | null {
  const areaRows = draft.items.filter((item) =>
    ["m2", "sq_m", "sqm"].includes(item.unit.toLocaleLowerCase("en")) &&
    item.quantity != null && Number.isFinite(item.quantity) &&
    item.quantity > 0
  );
  const measuredWorkRows = areaRows.filter((item) =>
    item.itemType === "work" && item.sourceParameters?.includedInEstimate !== false
  );
  const areas = (measuredWorkRows.length > 0 ? measuredWorkRows : areaRows)
    .map((item) => item.quantity)
    .filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  return areas.length > 0 ? Math.max(...areas) : null;
}

function accessShiftCount(areaM2: number | null): number {
  return areaM2 == null
    ? 1
    : Math.max(1, Math.ceil(areaM2 / DEFAULT_ACCESS_PRODUCTIVITY_M2_PER_SHIFT));
}

type PreliminaryAccessSystem = {
  normFamilyId: string;
  equipmentTitleRu: string;
  temporaryWorkTitleRu: string;
  deliveryTitleRu: string;
};

function preliminaryAccessSystem(scopeText: string, workingHeightM: number | null): PreliminaryAccessSystem {
  if (AERIAL_PLATFORM_SCOPE_RE.test(scopeText)) {
    return {
      normFamilyId: "norm-family:elevated-access:articulated-aerial-platform",
      equipmentTitleRu: "Коленчатая автовышка с ограждённой рабочей платформой",
      temporaryWorkTitleRu: "Подготовка и ограждение площадки, предсменный осмотр и перестановка коленчатой автовышки",
      deliveryTitleRu: "Подача коленчатой автовышки на объект и её возврат после работ",
    };
  }
  if (ROOF_ELEVATED_SCOPE_RE.test(scopeText)) {
    return {
      normFamilyId: "norm-family:elevated-access:facade-frame-scaffold",
      equipmentTitleRu: "Инвентарные рамные леса с лестничной секцией, ограждённым настилом и оборудованным выходом на кровлю",
      temporaryWorkTitleRu: "Монтаж, анкеровка, приёмка и демонтаж рамных лесов с безопасным выходом на кровлю",
      deliveryTitleRu: "Доставка на объект и возврат комплекта рамных лесов и лестничных секций для выхода на кровлю",
    };
  }
  if (EXTERIOR_ELEVATED_SCOPE_RE.test(scopeText)) {
    return {
      normFamilyId: "norm-family:elevated-access:facade-frame-scaffold",
      equipmentTitleRu: "Инвентарные рамные фасадные леса с настилами, ограждением и лестничными секциями",
      temporaryWorkTitleRu: "Монтаж, анкеровка, приёмка, перестановка и демонтаж инвентарных фасадных лесов",
      deliveryTitleRu: "Доставка на объект и возврат комплекта инвентарных фасадных лесов",
    };
  }
  if (workingHeightM != null && workingHeightM > 5) {
    return {
      normFamilyId: "norm-family:elevated-access:self-propelled-scissor-lift",
      equipmentTitleRu: "Самоходный ножничный подъёмник с ограждённой рабочей платформой",
      temporaryWorkTitleRu: "Подготовка площадки, предсменный осмотр и перестановка ножничного подъёмника",
      deliveryTitleRu: "Доставка на объект и возврат самоходного ножничного подъёмника",
    };
  }
  return {
    normFamilyId: "norm-family:elevated-access:mobile-aluminium-tower",
    equipmentTitleRu: "Передвижная алюминиевая вышка-тура с настилом, ограждением и опорами-стабилизаторами",
    temporaryWorkTitleRu: "Сборка, предсменный осмотр, перестановка и разборка передвижной вышки-туры",
    deliveryTitleRu: "Доставка на объект и возврат передвижной алюминиевой вышки-туры",
  };
}

function accessSourceParameters(input: {
  rowCode: string;
  areaM2: number | null;
  workingHeightM: number | null;
  procurement: boolean;
}): Record<string, unknown> {
  return {
    elevatedWorkAccessPolicy: ACCESS_POLICY_ID,
    rowCode: input.rowCode,
    basisAreaM2: input.areaM2,
    workingHeightM: input.workingHeightM,
    assumedAccessProductivityM2PerShift: DEFAULT_ACCESS_PRODUCTIVITY_M2_PER_SHIFT,
    accessSelectionStatus: input.workingHeightM == null
      ? "WORKING_HEIGHT_CONFIRMATION_REQUIRED"
      : "PRELIMINARY_SELECTION_REQUIRES_PPR_CONFIRMATION",
    includedInProcurement: input.procurement,
  };
}

function accessItem(input: {
  rowCode: string;
  itemType: "work" | "service";
  category: "equipment" | "temporary_work" | "logistics";
  titleRu: string;
  quantity: number;
  unit: "shift" | "trip" | "set";
  formulaId: string;
  quantityFormula: string;
  calculationTrace: string;
  areaM2: number | null;
  workingHeightM: number | null;
  procurement: boolean;
  currency: string;
  normFamilyId: string;
}): ConsumerRepairAiDraft["items"][number] {
  return {
    itemType: input.itemType,
    titleRu: input.titleRu,
    quantity: input.quantity,
    unit: input.unit,
    unitLabel: input.unit === "shift" ? "смена" : input.unit === "trip" ? "рейс" : "компл.",
    unitPrice: null,
    currency: input.currency,
    source: "reference_price_book",
    category: input.category,
    sourceId: ACCESS_NORM_SOURCE_ID,
    sourceLabel: "Предварительный состав безопасного доступа; тип и цена после обмера и ППР",
    formulaId: input.formulaId,
    quantityFormula: input.quantityFormula,
    calculationTrace: input.calculationTrace,
    sourceParameters: accessSourceParameters(input),
    templateId: ACCESS_POLICY_ID,
    templateVersion: "1",
    normId: `norm:elevated-access:${input.rowCode}:v1`,
    normFamilyId: input.normFamilyId,
    normSourceId: ACCESS_NORM_SOURCE_ID,
    normSourceTitle: "Профессиональная карта комплектации рабочего места на высоте",
    normVersion: "2026.09.07",
    normReviewStatus: "safety_scope_reviewed",
    priceStatus: "PRICE_MISSING",
    priceSource: "missing",
    priceSourceId: null,
    priceSourceLabel: "Цена аренды/услуги не выбрана",
    costConfidence: "missing",
    confidence: "medium",
    addedBy: "system",
  };
}

function accessNormFamilyFromTitle(titleRu: string, fallback: string): string {
  if (/(?:автовыш|коленчат|aerial\s+platform)/iu.test(titleRu)) {
    return "norm-family:elevated-access:articulated-aerial-platform";
  }
  if (/(?:фасадн[^.;]{0,30}лес|frame\s+scaffold)/iu.test(titleRu)) {
    return "norm-family:elevated-access:facade-frame-scaffold";
  }
  if (/(?:ножничн[^.;]{0,30}подъ[её]мник|scissor\s+lift)/iu.test(titleRu)) {
    return "norm-family:elevated-access:self-propelled-scissor-lift";
  }
  if (/(?:вышк[аи]-тур|mobile\s+tower)/iu.test(titleRu)) {
    return "norm-family:elevated-access:mobile-aluminium-tower";
  }
  return fallback;
}

function normalizeExistingAccessItem(input: {
  item: ConsumerRepairAiDraft["items"][number];
  titleRu?: string;
  rowCode: string;
  normFamilyId: string;
  areaM2: number | null;
  workingHeightM: number | null;
  procurement: boolean;
  category?: string;
}): ConsumerRepairAiDraft["items"][number] {
  return {
    ...input.item,
    titleRu: input.titleRu ?? input.item.titleRu,
    category: input.category ?? input.item.category,
    normId: `norm:elevated-access:${input.normFamilyId.split(":").at(-1)}:${input.rowCode}:v1`,
    normFamilyId: input.normFamilyId,
    normSourceId: ACCESS_NORM_SOURCE_ID,
    normSourceTitle: "Профессиональная карта комплектации рабочего места на высоте",
    normVersion: "2026.09.07",
    normReviewStatus: "safety_scope_reviewed",
    unitPrice: null,
    priceStatus: "PRICE_MISSING",
    priceSource: "missing",
    priceSourceId: null,
    priceSourceLabel: "Цена аренды/услуги не выбрана",
    sourceParameters: {
      ...(input.item.sourceParameters ?? {}),
      ...accessSourceParameters({
        rowCode: input.rowCode,
        areaM2: input.areaM2,
        workingHeightM: input.workingHeightM,
        procurement: input.procurement,
      }),
    },
  };
}

/**
 * Adds real access resources only when the request itself proves elevated work.
 * It does not choose a final access method without working height and PPR.
 */
export function applyElevatedWorkAccessPolicy(
  draft: ConsumerRepairAiDraft,
  input: { prompt: string },
): ConsumerRepairAiDraft {
  if (draft.items.length === 0) return draft;
  // Height applicability belongs to the requested work scope. BOQ row names can
  // contain words such as "верхний слой" (asphalt) without implying elevated
  // work, so they must never activate the policy by themselves.
  const requestScopeText = normalizedRequestScopeText(draft, input.prompt);
  const boqText = normalizedBoqText(draft, input.prompt);
  const workingHeightM = explicitWorkingHeightM(requestScopeText) ?? workingHeightMFromDraft(draft);
  if (
    !ELEVATED_SCOPE_RE.test(requestScopeText) &&
    !ADDITIONAL_ELEVATED_SCOPE_RE.test(requestScopeText) &&
    !(workingHeightM != null && workingHeightM > 1.8)
  ) return draft;

  const areaM2 = basisAreaM2(draft);
  const shifts = accessShiftCount(areaM2);
  const currency = draft.items.find((item) => item.currency?.trim())?.currency?.trim() ?? "KGS";
  const accessSystem = preliminaryAccessSystem(requestScopeText, workingHeightM);
  const rowCodeOf = (item: ConsumerRepairAiDraft["items"][number]) =>
    String(item.sourceParameters?.rowCode ?? "");
  const hasConcreteEquipment = draft.items.some((item) => CONCRETE_ACCESS_EQUIPMENT_RE.test(item.titleRu));
  const hasAbstractEquipment = draft.items.some((item) => ABSTRACT_ACCESS_EQUIPMENT_RE.test(item.titleRu));
  const hasDeclaredAccessEquipment = draft.items.some((item) =>
    rowCodeOf(item) === "drywall_prepare_access_equipment"
  );
  const hasAssembly = draft.items.some((item) =>
    ACCESS_ASSEMBLY_RE.test(item.titleRu) || rowCodeOf(item) === "drywall_prepare_access_operations"
  );
  const hasDelivery = draft.items.some((item) =>
    ACCESS_DELIVERY_RE.test(item.titleRu) ||
    rowCodeOf(item) === "drywall_prepare_access_delivery" ||
    rowCodeOf(item) === "drywall_prepare_access_return"
  );
  const hasFallProtection = draft.items.some((item) =>
    FALL_PROTECTION_RE.test(item.titleRu) || rowCodeOf(item) === "drywall_prepare_fall_protection"
  );
  const isDrywallCeiling = DRYWALL_CEILING_RE.test(boqText);
  const needsBoardLift = isDrywallCeiling && draft.items.some((item) => DRYWALL_INSTALLATION_RE.test(item.titleRu));
  const hasBoardLift = draft.items.some((item) => BOARD_LIFT_RE.test(item.titleRu));

  const normalizedExistingItems = draft.items.map((item) => {
    const rowCode = String(item.sourceParameters?.rowCode ?? "");
    if (ABSTRACT_ACCESS_EQUIPMENT_RE.test(item.titleRu)) {
      return normalizeExistingAccessItem({
        item,
        titleRu: accessSystem.equipmentTitleRu,
        rowCode: rowCode || "elevated_access_equipment",
        normFamilyId: accessSystem.normFamilyId,
        areaM2,
        workingHeightM,
        procurement: true,
        category: "equipment",
      });
    }
    if (ACCESS_ASSEMBLY_RE.test(item.titleRu)) {
      return normalizeExistingAccessItem({
        item,
        rowCode: rowCode || "elevated_access_assembly_reposition_dismantle",
        normFamilyId: accessNormFamilyFromTitle(item.titleRu, accessSystem.normFamilyId),
        areaM2,
        workingHeightM,
        procurement: false,
      });
    }
    if (ACCESS_DELIVERY_RE.test(item.titleRu)) {
      return normalizeExistingAccessItem({
        item,
        rowCode: rowCode || "elevated_access_delivery_return",
        normFamilyId: accessNormFamilyFromTitle(item.titleRu, accessSystem.normFamilyId),
        areaM2,
        workingHeightM,
        procurement: true,
      });
    }
    if (FALL_PROTECTION_RE.test(item.titleRu)) {
      return normalizeExistingAccessItem({
        item,
        rowCode: rowCode || "elevated_access_fall_protection_set",
        normFamilyId: "norm-family:elevated-access:fall-protection",
        areaM2,
        workingHeightM,
        procurement: true,
        category: "equipment",
      });
    }
    if (BOARD_LIFT_RE.test(item.titleRu)) {
      return normalizeExistingAccessItem({
        item,
        rowCode: rowCode || "drywall_ceiling_board_lift",
        normFamilyId: "norm-family:elevated-access:drywall-board-lift",
        areaM2,
        workingHeightM,
        procurement: true,
        category: "equipment",
      });
    }
    if (CONCRETE_ACCESS_EQUIPMENT_RE.test(item.titleRu)) {
      return normalizeExistingAccessItem({
        item,
        rowCode: rowCode || "elevated_access_equipment",
        normFamilyId: accessNormFamilyFromTitle(item.titleRu, accessSystem.normFamilyId),
        areaM2,
        workingHeightM,
        procurement: true,
        category: "equipment",
      });
    }
    return item;
  });

  const extraItems: ConsumerRepairAiDraft["items"] = [];
  if (!hasConcreteEquipment && !hasAbstractEquipment && !hasDeclaredAccessEquipment) {
    extraItems.push(accessItem({
      rowCode: "elevated_access_equipment",
      itemType: "service",
      category: "equipment",
      titleRu: accessSystem.equipmentTitleRu,
      quantity: shifts,
      unit: "shift",
      formulaId: "elevated_access_equipment_shifts_v1",
      quantityFormula: "max(1, ceil(work_area_m2 / 25))",
      calculationTrace: `Площадь ${areaM2 ?? "не указана"} м²; предварительная производительность ${DEFAULT_ACCESS_PRODUCTIVITY_M2_PER_SHIFT} м²/смена; итог ${shifts} смен; тип доступа уточнить по рабочей высоте и ППР.`,
      areaM2,
      workingHeightM,
      procurement: true,
      currency,
      normFamilyId: accessSystem.normFamilyId,
    }));
  }
  if (!hasAssembly) {
    extraItems.push(accessItem({
      rowCode: "elevated_access_assembly_reposition_dismantle",
      itemType: "work",
      category: "temporary_work",
      titleRu: accessSystem.temporaryWorkTitleRu,
      quantity: shifts,
      unit: "shift",
      formulaId: "elevated_access_temporary_work_shifts_v1",
      quantityFormula: "access_equipment_shift_count",
      calculationTrace: `Временные работы по средствам доступа: ${shifts} смен; состав уточнить по ППР.`,
      areaM2,
      workingHeightM,
      procurement: false,
      currency,
      normFamilyId: accessSystem.normFamilyId,
    }));
  }
  if (!hasDelivery) {
    extraItems.push(accessItem({
      rowCode: "elevated_access_delivery_return",
      itemType: "service",
      category: "logistics",
      titleRu: accessSystem.deliveryTitleRu,
      quantity: 1,
      unit: "trip",
      formulaId: "elevated_access_delivery_return_trip_v1",
      quantityFormula: "1 delivery-and-return service",
      calculationTrace: "Один комплекс доставки и возврата; маршрут и габариты оборудования уточнить.",
      areaM2,
      workingHeightM,
      procurement: true,
      currency,
      normFamilyId: accessSystem.normFamilyId,
    }));
  }
  if (!hasFallProtection) {
    extraItems.push(accessItem({
      rowCode: "elevated_access_fall_protection_set",
      itemType: "service",
      category: "equipment",
      titleRu: "Комплект защиты от падения: страховочная привязь, строп с амортизатором, анкерная линия и каска с подбородочным ремнём",
      quantity: 1,
      unit: "set",
      formulaId: "elevated_access_fall_protection_set_v1",
      quantityFormula: "1 preliminary workplace safety set; final quantity = crew size",
      calculationTrace: "Предварительно учтён один комплект оснащения рабочего места; число индивидуальных комплектов уточнить по составу бригады и ППР.",
      areaM2,
      workingHeightM,
      procurement: true,
      currency,
      normFamilyId: "norm-family:elevated-access:fall-protection",
    }));
  }
  if (needsBoardLift && !hasBoardLift) {
    extraItems.push(accessItem({
      rowCode: "drywall_ceiling_board_lift",
      itemType: "service",
      category: "equipment",
      titleRu: "Подъёмник листов ГКЛ для монтажа потолка",
      quantity: shifts,
      unit: "shift",
      formulaId: "drywall_ceiling_board_lift_shifts_v1",
      quantityFormula: "access_equipment_shift_count",
      calculationTrace: `Подъём листов ГКЛ учтён на ${shifts} смен; тип листа и рабочую высоту уточнить.`,
      areaM2,
      workingHeightM,
      procurement: true,
      currency,
      normFamilyId: "norm-family:elevated-access:drywall-board-lift",
    }));
  }

  const heightAlreadyRequested = draft.missingData.some((item) => /рабоч[^.;]{0,20}высот/iu.test(item));
  const crewAlreadyRequested = draft.missingData.some((item) => /(?:численност[^.;]{0,20}бригад|сколько[^.;]{0,20}работник)/iu.test(item));
  const heightMissing = workingHeightM == null && !heightAlreadyRequested
    ? [`Рабочая высота: подтвердить предварительно выбранное оборудование — ${accessSystem.equipmentTitleRu}`]
    : [];
  const crewMissing = crewAlreadyRequested
    ? []
    : ["Численность бригады на высоте для точного количества индивидуальных комплектов защиты от падения"];
  const selectedWorkKey = draft.selectedWork?.selectedWorkKey?.trim();
  const selectedCatalogWorkId = draft.selectedWork?.selectedCatalogWorkId?.trim();
  const identityBoundExtraItems = extraItems.map((item) => ({
    ...item,
    sourceParameters: {
      ...(item.sourceParameters ?? {}),
      ...(selectedWorkKey ? { selectedWorkKey } : {}),
      ...(selectedCatalogWorkId ? { selectedCatalogWorkId } : {}),
      supplementalCompositionOwner: ACCESS_POLICY_ID,
    },
  }));
  return {
    ...draft,
    items: [...normalizedExistingItems, ...identityBoundExtraItems],
    missingData: [...new Set([...draft.missingData, ...heightMissing, ...crewMissing])],
  };
}
