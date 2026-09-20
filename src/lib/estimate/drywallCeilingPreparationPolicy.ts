import type { ConsumerRepairAiDraft } from "../consumerRequests/consumerRequestTypes";

const POLICY_ID = "drywall-ceiling-preparation-runtime-policy:v1";
const SOURCE_ID = "src_drywall_ceiling_preparation_scope_v1";
const LEGACY_REPAIR_COMPOUND_RE = /^Ремонтный состав для локальных дефектов$/iu;
const LEGACY_PRIMER_RE = /^Совместимая грунтовка основания$/iu;
const LEGACY_PREPARATION_WORK_RE = /^Подготовка основания плоского потолка$/iu;

function isLegacyShortPreparationDraft(draft: ConsumerRepairAiDraft): boolean {
  return draft.items.some((item) => LEGACY_REPAIR_COMPOUND_RE.test(item.titleRu)) &&
    draft.items.some((item) => LEGACY_PRIMER_RE.test(item.titleRu)) &&
    draft.items.some((item) => LEGACY_PREPARATION_WORK_RE.test(item.titleRu));
}

function areaM2(draft: ConsumerRepairAiDraft): number | null {
  const candidates = draft.items
    .filter((item) => ["m2", "sq_m", "sqm"].includes(item.unit.toLocaleLowerCase("en")))
    .map((item) => item.quantity)
    .filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  return candidates.length > 0 ? Math.max(...candidates) : null;
}

function sourceParameters(input: {
  rowCode: string;
  basisAreaM2: number;
  includedInProcurement: boolean;
  calculationBasis: string;
}): Record<string, unknown> {
  return {
    drywallCeilingPreparationPolicy: POLICY_ID,
    rowCode: input.rowCode,
    basisAreaM2: input.basisAreaM2,
    calculationBasis: input.calculationBasis,
    includedInProcurement: input.includedInProcurement,
  };
}

function preparationItem(input: {
  rowCode: string;
  itemType: "material" | "work" | "service";
  category: string;
  titleRu: string;
  quantity: number;
  unit: "m2" | "shift";
  currency: string;
  procurement: boolean;
  formula: string;
  trace: string;
}): ConsumerRepairAiDraft["items"][number] {
  return {
    itemType: input.itemType,
    titleRu: input.titleRu,
    quantity: input.quantity,
    unit: input.unit,
    unitLabel: input.unit === "m2" ? "м²" : "смена",
    unitPrice: null,
    currency: input.currency,
    source: "reference_price_book",
    category: input.category,
    sourceId: SOURCE_ID,
    sourceLabel: "Технологический состав подготовки существующего потолка из ГКЛ",
    formulaId: `${POLICY_ID}:${input.rowCode}`,
    quantityFormula: input.formula,
    calculationTrace: input.trace,
    sourceParameters: sourceParameters({
      rowCode: input.rowCode,
      basisAreaM2: input.unit === "m2" ? input.quantity : 0,
      includedInProcurement: input.procurement,
      calculationBasis: input.formula,
    }),
    templateId: POLICY_ID,
    templateVersion: "1",
    normId: `norm:drywall-ceiling-preparation:${input.rowCode}:v1`,
    normFamilyId: "norm-family:drywall-ceiling-preparation",
    normSourceId: SOURCE_ID,
    normSourceTitle: "Технологическая карта подготовки существующего потолка из ГКЛ",
    normVersion: "2026.09.07",
    normReviewStatus: "preliminary_scope_reviewed",
    priceStatus: "PRICE_MISSING",
    priceSource: "missing",
    priceSourceId: null,
    priceSourceLabel: "Цена материала, работы или аренды не выбрана",
    costConfidence: "missing",
    confidence: "medium",
    addedBy: "system",
  };
}

/**
 * Migrates the known six-row legacy PREPARE projection without pretending that
 * unmeasured defects or joint lengths are known. The exact backend successor
 * adds those conditional rows after the user supplies the missing measurements.
 */
export function applyDrywallCeilingPreparationPolicy(
  draft: ConsumerRepairAiDraft,
): ConsumerRepairAiDraft {
  if (!isLegacyShortPreparationDraft(draft)) return draft;
  const area = areaM2(draft);
  if (area == null) return draft;
  const currency = draft.items.find((item) => item.currency?.trim())?.currency?.trim() ?? "KGS";
  const equipmentShifts = Math.max(1, Math.ceil(area / 50));
  const existingCodes = new Set(draft.items.map((item) => String(item.sourceParameters?.rowCode ?? "")));
  const items = draft.items.map((item) => {
    if (LEGACY_REPAIR_COMPOUND_RE.test(item.titleRu)) {
      return {
        ...item,
        titleRu: "Шпаклёвочная смесь для локального ремонта ГКЛ, швов и мест крепления",
        sourceParameters: {
          ...(item.sourceParameters ?? {}),
          drywallCeilingPreparationPolicy: POLICY_ID,
          quantityConfirmationRequired: "repair_area_share_percent_and_compound_rate",
        },
      };
    }
    if (LEGACY_PRIMER_RE.test(item.titleRu)) {
      return {
        ...item,
        titleRu: "Грунтовка для существующего потолка из ГКЛ — марку и расход уточнить по паспорту материала",
        sourceParameters: {
          ...(item.sourceParameters ?? {}),
          drywallCeilingPreparationPolicy: POLICY_ID,
          quantityConfirmationRequired: "primer_kg_per_m2",
        },
      };
    }
    if (LEGACY_PREPARATION_WORK_RE.test(item.titleRu)) {
      return {
        ...item,
        titleRu: "Укрытие оборудования и пола перед подготовкой потолка из ГКЛ",
        sourceParameters: {
          ...(item.sourceParameters ?? {}),
          drywallCeilingPreparationPolicy: POLICY_ID,
          rowCode: String(item.sourceParameters?.rowCode ?? "drywall_prepare_work_zone_protection"),
          includedInProcurement: false,
        },
      };
    }
    return item;
  });
  const append = (item: ConsumerRepairAiDraft["items"][number]): void => {
    const rowCode = String(item.sourceParameters?.rowCode ?? "");
    if (!existingCodes.has(rowCode)) {
      existingCodes.add(rowCode);
      items.push(item);
    }
  };
  append(preparationItem({ rowCode: "drywall_prepare_protection_material", itemType: "material", category: "material", titleRu: "Укрывная плёнка и защитное покрытие оборудования и пола технического помещения", quantity: area, unit: "m2", currency, procurement: true, formula: "ceiling_projection_area_m2", trace: `Площадь защиты принята по горизонтальной проекции плоского потолка: ${area} м².` }));
  append(preparationItem({ rowCode: "drywall_prepare_condition_survey", itemType: "work", category: "labor", titleRu: "Осмотр потолка из ГКЛ, простукивание и разметка трещин, отслоений и повреждённых швов", quantity: area, unit: "m2", currency, procurement: false, formula: "ceiling_area_m2", trace: `Осмотр выполняется по всей площади потолка: ${area} м².` }));
  append(preparationItem({ rowCode: "drywall_prepare_surface_cleaning", itemType: "work", category: "labor", titleRu: "Очистка потолка из ГКЛ от пыли, слабых участков и загрязнений перед ремонтом", quantity: area, unit: "m2", currency, procurement: false, formula: "ceiling_area_m2", trace: `Очистка выполняется по всей площади потолка: ${area} м².` }));
  append(preparationItem({ rowCode: "drywall_prepare_primer_application", itemType: "work", category: "labor", titleRu: "Нанесение грунтовки на подготовленный потолок из ГКЛ", quantity: area, unit: "m2", currency, procurement: false, formula: "ceiling_area_m2", trace: `Грунтование выполняется по всей площади потолка: ${area} м²; число слоёв уточнить по паспорту грунтовки.` }));
  append(preparationItem({ rowCode: "drywall_prepare_dust_extractor", itemType: "service", category: "equipment", titleRu: "Промышленный строительный пылесос для очистки потолка и рабочей зоны", quantity: equipmentShifts, unit: "shift", currency, procurement: true, formula: "max(1, ceil(ceiling_area_m2 / 50))", trace: `Предварительно ${equipmentShifts} смен по площади ${area} м²; фактическую производительность подтвердить по условиям помещения.` }));

  return {
    ...draft,
    items,
    missingData: [...new Set([
      ...draft.missingData,
      "Доля площади потолка с локальными дефектами и расход шпаклёвочной смеси",
      "Длина повреждённых швов и трещин ГКЛ для армирующей ленты",
      "Марка грунтовки, расход на 1 м² и число слоёв по паспорту материала",
    ])],
  };
}
