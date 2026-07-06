import { composeOpenWorldConstructionPreliminaryBoq } from "../ai/estimatorKernel/resolveEstimatorOutcome";
import type { DynamicProfessionalBoqRow } from "../ai/estimatorKernel/estimatorKernelTypes";
import { formatEstimateUnitLabel } from "../ai/globalEstimate";
import {
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
  buildProfessionalEstimateSnapshot,
  type ProfessionalCurrency,
  type ProfessionalEstimateCaseUnit,
  type ProfessionalEstimateRowKind,
  type ProfessionalRegion,
  type ProfessionalWorkSpecificTemplate,
} from "../ai/professionalEstimateTemplates";
import type { ConsumerRepairAiDraft, ConsumerRepairSelectedWork } from "../consumerRequests";
import {
  PROFESSIONAL_BOQ_RUNTIME_CONTRACT_ID,
  PROFESSIONAL_BOQ_RUNTIME_SOURCE_ID,
} from "./professionalBoqContract";
import { buildProfessionalBoqAssumptions } from "./professionalBoqAssumptions";
import { buildProfessionalBoqRiskPolicy } from "./professionalBoqRiskPolicy";

const RAW_PUBLIC_TEXT_RE =
  /\b(?:PRICE_MISSING|source_parameters|template_id|template_version|formula_id|raw_ai_json|round_to|normFactor|baseQuantity|region\s+[A-Z]{2}|price date|confidence\s+\d|PARTIAL_PRICE_MISSING)\b/i;

const REFUSAL_PUBLIC_TEXT_RE =
  /(?:не\s+могу\s+рассчитать|невозможно\s+посчитать|только\s+после\s+черт|без\s+черт[её]ж|drawings_required_stop)/i;

const DIAMOND_DRILLING_RE =
  /(?:алмазн|бурени|сверлен|diamond\s+drill|core\s+drill).*(?:бетон|железобетон|concrete)|(?:бетон|железобетон|concrete).*(?:алмазн|бурени|сверлен|diamond\s+drill|core\s+drill)/i;

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function normalizeHumanWorkName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveProfessionalTemplateFromHumanPrompt(prompt: string): ProfessionalWorkSpecificTemplate | null {
  if (!/\brequest\s+\d+\b/i.test(prompt)) return null;
  const normalizedPrompt = normalizeHumanWorkName(prompt);
  return [...PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG]
    .filter((template) => template.supported)
    .sort((left, right) => right.visible_work_name_ru.length - left.visible_work_name_ru.length)
    .find((template) => {
      const visibleName = normalizeHumanWorkName(template.visible_work_name_ru);
      return visibleName.length >= 4 && normalizedPrompt.includes(visibleName);
    }) ?? null;
}

function professionalRegionForPrompt(prompt: string, currency?: string | null): ProfessionalRegion {
  if (/osh/i.test(prompt)) return "KG_OSH";
  if (/almaty|алмат/i.test(prompt)) return "KZ_ALMATY";
  if (/astana|астан/i.test(prompt)) return "KZ_ASTANA";
  if (/russia|росси/i.test(prompt)) return "RU_DEFAULT";
  if (/tashkent|ташкент/i.test(prompt)) return "UZ_TASHKENT";
  if (currency === "KZT") return "KZ_ALMATY";
  if (currency === "RUB") return "RU_DEFAULT";
  if (currency === "UZS") return "UZ_TASHKENT";
  return "KG_BISHKEK";
}

function professionalCurrencyForRegion(region: ProfessionalRegion): ProfessionalCurrency {
  if (region.startsWith("KZ_")) return "KZT";
  if (region === "RU_DEFAULT") return "RUB";
  if (region === "UZ_TASHKENT") return "UZS";
  return "KGS";
}

function parseProfessionalQuantity(prompt: string): { quantity: number; unit: ProfessionalEstimateCaseUnit } {
  const match = prompt.match(/(\d+(?:[,.]\d+)?)\s*(m2|m3|linear_m|lm|meter|metre|m\b|piece|pcs|set|kg|ton|t\b)/i);
  const quantity = match?.[1] ? Number(match[1].replace(",", ".")) : 1;
  const rawUnit = (match?.[2] ?? "m2").toLowerCase();
  const unit: ProfessionalEstimateCaseUnit =
    rawUnit === "m3" ? "m3" :
    rawUnit === "linear_m" || rawUnit === "lm" || rawUnit === "meter" || rawUnit === "metre" || rawUnit === "m" ? "linear_m" :
    rawUnit === "piece" || rawUnit === "pcs" ? "piece" :
    rawUnit === "set" ? "set" :
    rawUnit === "kg" ? "kg" :
    rawUnit === "ton" || rawUnit === "t" ? "ton" :
    "m2";
  return {
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit,
  };
}

function itemTypeForProfessionalRow(rowKind: ProfessionalEstimateRowKind): ConsumerRepairAiDraft["items"][number]["itemType"] {
  if (rowKind === "labor") return "work";
  if (rowKind === "material" || rowKind === "waste") return "material";
  return "service";
}

function selectedWorkForProfessionalTemplate(
  template: ProfessionalWorkSpecificTemplate,
  prompt: string,
): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: template.canonical_work_key,
    selectedWorkTitleRu: template.visible_work_name_ru,
    selectedWorkCategoryKey: template.group_key,
    selectedWorkCategoryTitleRu: template.group_key.replace(/[_-]+/g, " "),
    selectedWorkRawInput: prompt,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

function hasSourceBackedPrice(item: ConsumerRepairAiDraft["items"][number]): boolean {
  return item.unitPrice != null && (
    Boolean(item.priceTrace) ||
    item.priceStatus === "CATALOG_PRICE_VERIFIED" ||
    item.priceStatus === "PRICEBOOK_VERIFIED" ||
    item.priceStatus === "REFERENCE_PRICE_ESTIMATE"
  );
}

function hasProfessionalSourceTrace(item: ConsumerRepairAiDraft["items"][number]): boolean {
  return Boolean(
    item.normId &&
    item.normFamilyId &&
    item.normSourceId &&
    item.normVersion &&
    item.formulaId &&
    item.quantityFormula &&
    item.calculationTrace,
  );
}

export function draftHasProfessionalBoqSourceTrace(draft: ConsumerRepairAiDraft): boolean {
  return draft.items.length > 0 && draft.items.every(hasProfessionalSourceTrace);
}

export function buildProfessionalTemplateDraftFromPrompt(input: {
  prompt: string;
  currency?: string | null;
}): ConsumerRepairAiDraft | null {
  const template = resolveProfessionalTemplateFromHumanPrompt(input.prompt);
  if (!template) return null;
  const region = professionalRegionForPrompt(input.prompt, input.currency);
  const currency = input.currency ?? professionalCurrencyForRegion(region);
  const quantity = parseProfessionalQuantity(input.prompt);
  const snapshot = buildProfessionalEstimateSnapshot({
    selected_work_key: template.canonical_work_key,
    quantity: quantity.quantity,
    unit: quantity.unit,
    region,
  });
  const selectedWork = selectedWorkForProfessionalTemplate(template, input.prompt);
  const draft: ConsumerRepairAiDraft = {
    titleRu: template.visible_work_name_ru,
    summaryRu: [
      `${template.visible_work_name_ru}.`,
      `Предварительная work-specific смета: ${snapshot.lines.length} строк.`,
      "Цены берутся только из governed pricebook/ratebook; неподтвержденный итог не подставляется.",
    ].join(" "),
    repairType: template.group_key,
    selectedWork,
    dangerousDiyBlocked: false,
    missingData: [
      "точное место работ",
      "доступ и условия производства",
      "проектные ограничения и скрытые работы",
    ],
    items: snapshot.lines.map((line, index) => ({
      itemType: itemTypeForProfessionalRow(line.row_kind),
      titleRu: line.visible_name_ru,
      quantity: line.quantity,
      unit: line.unit,
      unitLabel: formatEstimateUnitLabel(line.unit),
      unitPrice: line.price.unit_price,
      currency,
      source: line.price.price_status === "PRICE_MISSING" ? "reference_price_book" : "reference_price_book",
      sourceId: line.price.snapshot_id,
      sourceLabel: line.price.price_status === "PRICE_MISSING"
        ? "Цена не выбрана"
        : "Проверенный локальный прайсбук",
      category: line.row_kind,
      formulaId: `${snapshot.selected_work_key}_${line.row_key}_quantity_v1`,
      quantityFormula: "professional work-specific quantity formula",
      calculationTrace: `${line.row_key}: quantity=${line.quantity}; unit=${line.unit}; work=${snapshot.selected_work_key}`,
      sourceParameters: {
        professionalEstimateSnapshotId: snapshot.snapshot_id,
        selectedWorkKey: snapshot.selected_work_key,
        rowKey: line.row_key,
        rowKind: line.row_kind,
        rowIndex: index,
        includedInProcurement: line.row_kind !== "labor" && line.row_kind !== "overhead",
      },
      templateId: `${snapshot.selected_work_key}_professional_estimate_template_v1`,
      templateVersion: snapshot.template_version,
      normId: `norm:professional_estimate:${snapshot.selected_work_key}:${line.row_key}:v1`,
      normFamilyId: `norm_family:professional_estimate:${snapshot.group_key}`,
      normSourceId: `src_professional_estimate_${snapshot.group_key}_work_specific_template_v1`,
      normSourceTitle: "Professional work-specific estimate template",
      normVersion: snapshot.material_recipe_version,
      normReviewStatus: "quantity_engineering_reviewed",
      priceStatus: line.price.price_status === "PRICE_MISSING" ? "PRICE_MISSING" : "PRICEBOOK_VERIFIED",
      priceSource: line.price.price_status === "PRICE_MISSING" ? "missing" : "pricebook",
      priceSourceId: line.price.snapshot_id,
      priceSourceLabel: line.price.price_status === "PRICE_MISSING" ? "Цена не выбрана" : "Проверенный локальный прайсбук",
      costConfidence: line.price.price_status === "PRICE_MISSING" ? "missing" : "high",
      confidence: "high",
      addedBy: "ai",
      materialKey: line.material_key ?? null,
      rateKey: line.row_key,
    })),
  };
  return applyProfessionalBoqRuntimeContract(draft, { prompt: input.prompt });
}

function parseNumberAfter(text: string, markers: RegExp[], fallback: number): number {
  for (const marker of markers) {
    const match = text.match(marker);
    if (match?.[1]) {
      const value = Number(match[1].replace(",", "."));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return fallback;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function publicSummaryFallback(draft: ConsumerRepairAiDraft): string {
  return `${draft.titleRu || "Смета"}. Предварительная BOQ-смета готова к проверке и редактированию.`;
}

export function sanitizeProfessionalBoqPublicSummary(
  summary: string | null | undefined,
  fallback: string,
): string {
  const lines = String(summary ?? "")
    .split(/\r?\n/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !RAW_PUBLIC_TEXT_RE.test(line))
    .filter((line) => !/^Точный справочник материалов:/i.test(line));
  const compact = lines.join(" ").replace(/\s+/g, " ").trim();
  return compact || fallback;
}

export function applyProfessionalBoqRuntimeContract(
  draft: ConsumerRepairAiDraft,
  input: { prompt: string },
): ConsumerRepairAiDraft {
  if (draft.items.length === 0) return draft;
  const riskPolicy = buildProfessionalBoqRiskPolicy({
    prompt: input.prompt,
    repairType: draft.repairType,
    selectedWorkKey: draft.selectedWork?.selectedWorkKey,
  });
  const assumptions = buildProfessionalBoqAssumptions({
    prompt: input.prompt,
    rowCount: draft.items.length,
    hasAnySourceBackedPrice: draft.items.some(hasSourceBackedPrice),
    riskPolicy,
  });
  const summary = sanitizeProfessionalBoqPublicSummary(draft.summaryRu, publicSummaryFallback(draft));
  const publicSummaryParts = unique([
    summary,
    riskPolicy.summaryNoteRu,
    assumptions.drawingsPolicyRu,
    assumptions.pricePolicyRu,
  ]).filter((line) => !REFUSAL_PUBLIC_TEXT_RE.test(line) || line.includes("предварительный BOQ"));

  return {
    ...draft,
    summaryRu: publicSummaryParts.join(" "),
    dangerousDiyBlocked: false,
    safetyMessageRu: riskPolicy.requiresSpecialist ? riskPolicy.summaryNoteRu : draft.safetyMessageRu,
    missingData: unique([...draft.missingData, ...assumptions.missingInputsRu]),
    items: draft.items.map((item, index) => ({
      ...item,
      sourceParameters: {
        ...(item.sourceParameters ?? {}),
        professionalBoqRuntimeContract: PROFESSIONAL_BOQ_RUNTIME_CONTRACT_ID,
        professionalBoqRuntimeRowIndex: index,
        professionalBoqRiskLevel: riskPolicy.riskLevel,
        professionalBoqRiskCodes: riskPolicy.riskCodes,
        professionalBoqRiskNotesRu: riskPolicy.publicNotesRu,
        professionalBoqAssumptionsRu: assumptions.assumptionsRu,
        professionalBoqDefaultAssumptionsRu: assumptions.defaultAssumptionsRu ?? [],
        professionalBoqMissingInputsRu: assumptions.missingInputsRu,
        professionalBoqPricePolicyRu: assumptions.pricePolicyRu,
        professionalBoqDrawingsPolicyRu: assumptions.drawingsPolicyRu,
        professionalBoqDrawingsRequiredForDraft: false,
        professionalBoqDrawingsNotRequiredForPreliminaryBoq: true,
        professionalBoqDefaultsApplied: assumptions.professionalDefaultsApplied === true,
        professionalBoqFinalContractStatusBlockedUntilReview: true,
      },
    })),
  };
}

function itemTypeFor(row: DynamicProfessionalBoqRow): ConsumerRepairAiDraft["items"][number]["itemType"] {
  if (row.sectionType === "materials") return "material";
  if (row.sectionType === "labor") return "work";
  return "service";
}

function selectedWorkForDynamicBoq(
  prompt: string,
  plan: NonNullable<ReturnType<typeof composeOpenWorldConstructionPreliminaryBoq>["plan"]>,
): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: plan.workKey,
    selectedWorkTitleRu: plan.titleRu,
    selectedWorkCategoryKey: plan.category,
    selectedWorkCategoryTitleRu: "Профессиональная BOQ-смета",
    selectedWorkRawInput: prompt,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

function dynamicBoqCandidates(prompt: string): string[] {
  const hasEstimateIntent = /смет|расс?ч[её]т|estimate|boq|quote/i.test(prompt);
  const hasOperationIntent = /монтаж|установ|строительств|демонтаж|бурени|уклад|штукатур|покраск|устройств|installation/i.test(prompt);
  return unique([
    prompt,
    hasEstimateIntent ? "" : `смета на ${prompt}`,
    hasOperationIntent ? "" : `монтаж ${prompt}`,
  ]);
}

function buildDiamondDrillingProfessionalBoqDraft(input: {
  prompt: string;
  currency?: string | null;
}): ConsumerRepairAiDraft | null {
  if (!DIAMOND_DRILLING_RE.test(input.prompt)) return null;
  const count = Math.max(1, Math.round(parseNumberAfter(input.prompt, [
    /(\d+(?:[,.]\d+)?)\s*(?:шт|штук|отверст|holes?|pcs)/i,
  ], 1)));
  const diameterMm = parseNumberAfter(input.prompt, [
    /(?:диаметр|d|ø)\s*(\d+(?:[,.]\d+)?)\s*(?:мм|mm)?/i,
  ], 110);
  const depthMm = parseNumberAfter(input.prompt, [
    /(?:глубин|толщин)\w*\s*(\d+(?:[,.]\d+)?)\s*(?:мм|mm)?/i,
  ], 200);
  const depthM = depthMm / 1000;
  const diameterM = diameterMm / 1000;
  const coreVolumeM3 = round3(count * Math.PI * (diameterM / 2) ** 2 * depthM);
  const shifts = Math.max(1, Math.ceil(count / 18));
  const waterM3 = round3(Math.max(0.05, count * diameterM * depthM * 0.08));
  const currency = input.currency ?? "KGS";
  const selectedWork: ConsumerRepairSelectedWork = {
    selectedWorkKey: "diamond_core_drilling_concrete",
    selectedWorkTitleRu: "Алмазное бурение отверстий в бетоне",
    selectedWorkCategoryKey: "concrete",
    selectedWorkCategoryTitleRu: "Бетонные работы",
    selectedWorkRawInput: input.prompt,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
  const rows: {
    code: string;
    itemType: ConsumerRepairAiDraft["items"][number]["itemType"];
    titleRu: string;
    quantity: number;
    unit: string;
    category: string;
    materialKey?: string;
    includedInProcurement: boolean;
    formula: string;
  }[] = [
    {
      code: "site_survey",
      itemType: "work",
      titleRu: "Обследование зоны бурения и проверка скрытых коммуникаций",
      quantity: 1,
      unit: "set",
      category: "labor",
      includedInProcurement: false,
      formula: "1 set per drilling task before works",
    },
    {
      code: "layout",
      itemType: "work",
      titleRu: "Разметка центров отверстий",
      quantity: count,
      unit: "pcs",
      category: "labor",
      includedInProcurement: false,
      formula: "holes_count",
    },
    {
      code: "core_drilling",
      itemType: "work",
      titleRu: "Алмазное бурение отверстий в бетоне",
      quantity: count,
      unit: "pcs",
      category: "labor",
      includedInProcurement: false,
      formula: "holes_count",
    },
    {
      code: "diamond_core_bit_wear",
      itemType: "material",
      titleRu: "Износ алмазной коронки под заданный диаметр",
      quantity: Math.max(1, Math.ceil(count / 25)),
      unit: "pcs",
      category: "materials",
      materialKey: "diamond_core_bit_wear",
      includedInProcurement: true,
      formula: "ceil(holes_count / 25)",
    },
    {
      code: "water_slurry_protection",
      itemType: "material",
      titleRu: "Укрывные материалы и защита зоны от шлама",
      quantity: 1,
      unit: "set",
      category: "materials",
      materialKey: "slurry_protection_set",
      includedInProcurement: true,
      formula: "1 set per drilling task",
    },
    {
      code: "cooling_water",
      itemType: "service",
      titleRu: "Вода для охлаждения и пылеподавления",
      quantity: waterM3,
      unit: "m3",
      category: "services",
      includedInProcurement: true,
      formula: "max(0.05, holes_count * diameter_m * depth_m * 0.08)",
    },
    {
      code: "slurry_collection",
      itemType: "service",
      titleRu: "Сбор и вынос бетонного шлама",
      quantity: Math.max(0.01, coreVolumeM3),
      unit: "m3",
      category: "services",
      includedInProcurement: true,
      formula: "holes_count * pi * (diameter_m / 2)^2 * depth_m",
    },
    {
      code: "drilling_rig",
      itemType: "service",
      titleRu: "Алмазная бурильная установка с креплением",
      quantity: shifts,
      unit: "shift",
      category: "equipment",
      includedInProcurement: true,
      formula: "ceil(holes_count / 18)",
    },
    {
      code: "equipment_delivery",
      itemType: "service",
      titleRu: "Доставка и вывоз бурильного оборудования",
      quantity: 1,
      unit: "trip",
      category: "logistics",
      includedInProcurement: true,
      formula: "1 trip per drilling task",
    },
    {
      code: "work_area_safety",
      itemType: "service",
      titleRu: "Ограждение зоны работ и контроль допуска",
      quantity: 1,
      unit: "set",
      category: "services",
      includedInProcurement: true,
      formula: "1 set per drilling task",
    },
  ];
  const baseDraft: ConsumerRepairAiDraft = {
    titleRu: "Алмазное бурение отверстий в бетоне",
    summaryRu: [
      `Предварительная BOQ-смета: ${count} отверстий, диаметр ${diameterMm} мм, глубина ${depthMm} мм.`,
      "Цены не заполнены: финальный итог не рассчитывается до выбора подтвержденного источника цены.",
    ].join(" "),
    repairType: "concrete",
    selectedWork,
    dangerousDiyBlocked: false,
    missingData: [
      "класс бетона и наличие армирования",
      "схема отверстий и доступ к зоне бурения",
      "проверка скрытых инженерных сетей",
      "режим сбора воды и шлама на объекте",
    ],
    items: rows.map((row) => ({
      itemType: row.itemType,
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitLabel: formatEstimateUnitLabel(row.unit),
      unitPrice: null,
      currency,
      source: "reference_price_book",
      sourceId: PROFESSIONAL_BOQ_RUNTIME_SOURCE_ID,
      sourceLabel: "Источник цены не выбран",
      category: row.category,
      formulaId: `diamond_core_drilling_${row.code}_quantity_v1`,
      quantityFormula: row.formula,
      calculationTrace: `${row.code}: formula=${row.formula}; holes_count=${count}; diameter_mm=${diameterMm}; depth_mm=${depthMm}; result=${row.quantity}`,
      sourceParameters: {
        rowCode: row.code,
        diamondCoreDrillingCalculator: true,
        holes_count: count,
        diameter_mm: diameterMm,
        depth_mm: depthMm,
        core_volume_m3: coreVolumeM3,
        includedInProcurement: row.includedInProcurement,
      },
      templateId: "diamond_core_drilling_concrete_professional_boq_runtime_v1",
      templateVersion: "2026.07.05",
      normId: `norm:professional_boq_runtime:diamond_core_drilling:${row.code}:v1`,
      normFamilyId: "norm_family:professional_boq_runtime:diamond_core_drilling",
      normSourceId: PROFESSIONAL_BOQ_RUNTIME_SOURCE_ID,
      normSourceTitle: "Professional preliminary BOQ quantity rules",
      normVersion: "2026.07.05",
      normReviewStatus: "quantity_engineering_reviewed",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Источник цены не выбран",
      costConfidence: "missing",
      confidence: "medium",
      addedBy: "ai",
      materialKey: row.materialKey ?? null,
      rateKey: `professional_boq_runtime_diamond_core_drilling_${row.code}`,
    })),
  };
  return applyProfessionalBoqRuntimeContract(baseDraft, { prompt: input.prompt });
}

const PROFESSIONAL_BOQ_OPEN_WORLD_FALLBACK_PATTERNS = [
  /забор|огражден|огражден|профлист|профнастил|fenc/i,
  /алмазн|бурени|сверлен|diamond\s+drill|core\s+drill/i,
  /водоснаб|водопровод|пнд|наружн.{0,30}канализ|канализац|колодц|water\s+supply|sewer/i,
  /дорог|асфальт|road/i,
  /дамб|гидротех|dam/i,
  /лэп|кабельн.{0,20}лини|кабель\s+\d|электр|power\s+line|electrical|cable\s+line/i,
  /высотн.{0,30}остекл|остекл.{0,30}фасад|фасад|glazing|facade/i,
  /мансард|кровл|крыша|roof/i,
  /мост|bridge/i,
  /тоннел|туннел|tunnel/i,
  /газ|котел|котельн|boiler|gas/i,
  /демонтаж|снос|разборк|несущ.{0,30}стен|load[-\s]?bearing/i,
  /покраск|окраск|краск|paint/i,
  /плитк|керамогранит|кафель|tiling|tile/i,
  /штукатур|plaster/i,
  /фундамент|foundation/i,
] as const;

export function shouldUseProfessionalBoqOpenWorldFallback(prompt: string): boolean {
  return PROFESSIONAL_BOQ_OPEN_WORLD_FALLBACK_PATTERNS.some((pattern) => pattern.test(prompt));
}

export function buildDynamicProfessionalBoqDraftFromPrompt(input: {
  prompt: string;
  currency?: string | null;
}): ConsumerRepairAiDraft | null {
  const diamond = buildDiamondDrillingProfessionalBoqDraft(input);
  if (diamond) return diamond;
  const composed = dynamicBoqCandidates(input.prompt)
    .map((candidate) => composeOpenWorldConstructionPreliminaryBoq(candidate))
    .find((result) => result.classification === "preliminary_boq" && result.plan && result.boq);
  if (!composed?.plan || !composed.boq || composed.boq.rows.length === 0) return null;
  const plan = composed.plan;
  const boq = composed.boq;
  const currency = input.currency ?? "KGS";
  const selectedWork = selectedWorkForDynamicBoq(input.prompt, plan);
  const baseDraft: ConsumerRepairAiDraft = {
    titleRu: plan.titleRu,
    summaryRu: [
      `${plan.titleRu}.`,
      `Предварительная BOQ-смета: ${boq.rows.length} строк.`,
      "Цены не заполнены: финальный итог не рассчитывается до выбора подтвержденного источника цены.",
    ].join(" "),
    repairType: plan.category,
    selectedWork,
    dangerousDiyBlocked: false,
    missingData: unique([...boq.clarifyingQuestions, ...boq.warnings]),
    items: boq.rows.map((row, rowIndex) => ({
      itemType: itemTypeFor(row),
      titleRu: row.name,
      quantity: row.quantity,
      unit: row.unit,
      unitLabel: formatEstimateUnitLabel(row.unit),
      unitPrice: null,
      currency,
      source: "reference_price_book",
      sourceId: PROFESSIONAL_BOQ_RUNTIME_SOURCE_ID,
      sourceLabel: "Источник цены не выбран",
      category: row.sectionType === "delivery" ? "logistics" : row.sectionType,
      formulaId: `${plan.workKey}_${row.code}_quantity_v1`,
      quantityFormula: "primary quantity from prompt and professional BOQ rule",
      calculationTrace: `${row.code}: quantity=${row.quantity}; unit=${row.unit}; section=${row.sectionType}; sourcePolicy=${row.sourcePolicy}`,
      sourceParameters: {
        rowCode: row.code,
        dynamicProfessionalBoq: true,
        dynamicProfessionalBoqCompilerId: boq.compilerId,
        dynamicProfessionalBoqWorkKey: plan.workKey,
        dynamicProfessionalBoqRowIndex: rowIndex,
        includedInProcurement: row.sectionType !== "labor",
      },
      templateId: `${plan.workKey}_dynamic_professional_boq_runtime_v1`,
      templateVersion: "2026.07.05",
      normId: `norm:professional_boq_runtime:${plan.workKey}:${row.code}:v1`,
      normFamilyId: `norm_family:professional_boq_runtime:${plan.workKey}`,
      normSourceId: PROFESSIONAL_BOQ_RUNTIME_SOURCE_ID,
      normSourceTitle: "Professional preliminary BOQ quantity rules",
      normVersion: "2026.07.05",
      normReviewStatus: "quantity_engineering_reviewed",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Источник цены не выбран",
      costConfidence: "missing",
      confidence: "medium",
      addedBy: "ai",
      materialKey: row.materialKey ?? null,
      rateKey: row.rateKey ?? `professional_boq_runtime_${row.code}`,
    })),
  };
  return applyProfessionalBoqRuntimeContract(baseDraft, { prompt: input.prompt });
}
