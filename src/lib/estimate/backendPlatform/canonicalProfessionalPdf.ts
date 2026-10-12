import {
  canonicalArtifactMoney,
  canonicalArtifactQuantity,
  canonicalArtifactUnit,
  canonicalArtifactVisibleRowTitle,
  canonicalArtifactRentalBasis,
  canonicalArtifactWorkMeasure,
  canonicalArtifactTechnologyChecks,
  canonicalArtifactPublicResourcePresentationV1,
  escapeCanonicalArtifactHtml,
  type CanonicalArtifactRevision,
  type CanonicalArtifactRow,
} from "./canonicalEstimateArtifactContract";
import { canonicalEstimateResourceOperationSections } from "./canonicalEstimateOperationComposition";
import { canonicalArtifactPurchaseRequirement } from "./canonicalPersistedPurchaseBalance";
import { canonicalPublicEstimateWorkTitleRu, canonicalPublicEstimateRequestTextRu } from './canonicalPublicEstimateLanguageRu';
import { resolveCanonicalEstimateExplicitRowCategory } from './canonicalEstimateRowCategory';
import {canonicalScopeRequirementDecisionV1,groupCanonicalScopeRequirementsV1,canonicalScopeRequirementStatusRuV1} from './canonicalScopeRequirementV1';
import {readRoofPrimerPrerequisiteDecisionV1,roofPrimerPhaseRuV1} from './canonicalRoofPrimerPrerequisiteV1';

export const CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION =
  "canonical-professional-pdf.r4-a13-s27-67-planned-preparation-template35" as const;

/** A versioned job must be rendered by the server revision that accepted it.
 * Older jobs without this field retain their existing worker compatibility. */
export function assertCanonicalProfessionalPdfJobRendererVersion(input: unknown): void {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    throw Object.assign(new Error("professional PDF job payload must be an object"), { code: "ARTIFACT_RENDERER_VERSION_MISMATCH" });
  }
  const payload = input as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(payload, "rendererVersion")
    && payload.rendererVersion !== CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION) {
    throw Object.assign(new Error("professional PDF job renderer does not match this worker"), { code: "ARTIFACT_RENDERER_VERSION_MISMATCH" });
  }
}

export const CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER = [
  "material",
  "work",
  "equipment",
  "service",
  "transport",
] as const;

export type CanonicalProfessionalPdfCategory =
  (typeof CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER)[number];

export type CanonicalProfessionalPdfGrandTotalStatus =
  | "COMPLETE"
  | "PARTIAL_NEEDS_PRICE";

export type CanonicalProfessionalPdfProjection = {
  html: string;
  footerTemplate: string;
  rowCount: number;
  pricedRowCount: number;
  missingPriceRowCount: number;
  grandTotalStatus: CanonicalProfessionalPdfGrandTotalStatus;
  currencyCode: string;
  categoryTotals: Record<CanonicalProfessionalPdfCategory, number>;
  definitionVersionId: string | null;
  preliminaryNeedCount: number;
  nonPayableRowCount: number;
};

const CATEGORY_TITLES: Record<CanonicalProfessionalPdfCategory, string> = {
  material: "Материалы",
  work: "Работы",
  equipment: "Механизмы",
  service: "Услуги",
  transport: "Доставка",
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nullableText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function categoryIdentity(row: Record<string, unknown>): string {
  return `${String(row.category ?? "")} ${String(row.section ?? "")}`
    .trim()
    .toLocaleLowerCase("ru-RU");
}

export function canonicalProfessionalPdfCategory(
  row: Record<string, unknown>,
): CanonicalProfessionalPdfCategory {
  const identity = categoryIdentity(row);
  const resourceGraph = objectValue(objectValue(row.calculation_trace).resourceGraph);
  if (resourceGraph.costTreatment === "CONTROL_OR_DOCUMENT") return "service";
  const explicit = resolveCanonicalEstimateExplicitRowCategory(String(row.category ?? ""));
  if (explicit) return explicit === "delivery" ? "transport" : explicit;
  if (/delivery|transport|logistic|достав|логист/u.test(identity)) return "transport";
  if (/equipment|machine|machinery|mechanism|механ|техник|оборуд/u.test(identity)) return "equipment";
  if (/material|product|waste|материал|издел/u.test(identity)) return "material";
  if (/service|test|quality|control|document|услуг|испыт|контрол|документ|пнр/u.test(identity)) return "service";
  return "work";
}

export function canonicalProfessionalPdfCategoryTitle(
  category: CanonicalProfessionalPdfCategory,
): string {
  return CATEGORY_TITLES[category];
}

function numericAmount(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function assertSingleCurrency(
  revision: CanonicalArtifactRevision,
  rows: CanonicalArtifactRow[],
): string {
  const currencies = new Set(
    [nullableText(revision.currency_code), ...rows.map((row) => nullableText(row.currency_code))]
      .filter((value): value is string => Boolean(value)),
  );
  if (currencies.size > 1) {
    throw Object.assign(new Error("professional PDF contains multiple currencies"), {
      code: "ARTIFACT_MULTI_CURRENCY_UNSUPPORTED",
    });
  }
  return [...currencies][0] ?? nullableText(revision.currency_code) ?? "KGS";
}

function includedCostOwnerTitle(row: CanonicalArtifactRow, rowsById: ReadonlyMap<string, CanonicalArtifactRow>): string | null {
  const visited = new Set([String(row.row_id)]);
  let current = row;
  while (true) {
    const graph = objectValue(objectValue(current.calculation_trace).resourceGraph);
    if (graph.costTreatment !== "INCLUDED_IN_RESOURCE_ROWS") return null;
    const ownerId = nullableText(graph.includedInResourceOwnerRowId);
    if (!ownerId || visited.has(ownerId)) return null;
    visited.add(ownerId);
    const owner = rowsById.get(ownerId);
    if (!owner) return null;
    const ownerDecision = objectValue(objectValue(objectValue(owner.calculation_trace).resourceGraph).commercialCostCoverageOwnerDecisionV1);
    if (owner.included_in_estimate === true || (owner.selected === true && ownerDecision.active === true)) return canonicalArtifactVisibleRowTitle(owner);
    current = owner;
  }
}

function renderClientRow(row: CanonicalArtifactRow, displayOrdinal: number, parameters: Record<string, unknown>): string {
  const category = canonicalProfessionalPdfCategory(row);
  const includedInEstimate = row.included_in_estimate === true;
  const physicalExcluded = objectValue(row.calculation_trace).physicalScopeExcludedV1 != null;
  const scopeLabel = physicalExcluded ? 'Исключено пользователем из состава. Можно восстановить.'
    : !includedInEstimate && objectValue(objectValue(row.calculation_trace).resourceGraph).costTreatment === 'OWN_COST'
      ? 'Физическая потребность сохранена; стоимость в этой смете исключена.' : null;
  const rental = canonicalArtifactRentalBasis(row, parameters);
  const quantityLabel = (value: unknown, unit = row.unit_id) => `${canonicalArtifactQuantity(value)} ${canonicalArtifactUnit({ unit_id: unit })}`;
  // Detailed stock, reserve and remainder balances belong to procurement;
  // the estimate keeps its saved quantity and exact resource name.
  const rentalText = rental ? `Аренда: ${canonicalArtifactQuantity(rental.physicalQuantity)} шт. на ${canonicalArtifactQuantity(rental.durationDays)} сут.; расчёт оплаты ${quantityLabel(rental.billingQuantity)}.` : null;
  const unitPrice = !includedInEstimate
    ? "Не применяется"
    : row.unit_price == null
    ? "Требуется цена"
    : canonicalArtifactMoney(row.unit_price, row.currency_code);
  const amount = !includedInEstimate
    ? "Не суммируется"
    : row.amount == null
    ? "—"
    : canonicalArtifactMoney(row.amount, row.currency_code);
  return `<tr>
    <td class="number">${displayOrdinal}</td>
    <td class="name"><strong>${escapeCanonicalArtifactHtml(canonicalArtifactVisibleRowTitle(row, parameters))}</strong>${rentalText ? `<span>${escapeCanonicalArtifactHtml(rentalText)}</span>` : ""}${scopeLabel ? `<span>${escapeCanonicalArtifactHtml(scopeLabel)}</span>` : ''}</td>
    <td>${escapeCanonicalArtifactHtml(CATEGORY_TITLES[category])}</td>
    <td class="unit">${escapeCanonicalArtifactHtml(canonicalArtifactUnit(row))}</td>
    <td class="numeric">${escapeCanonicalArtifactHtml(canonicalArtifactQuantity(row.quantity))}</td>
    <td class="money">${escapeCanonicalArtifactHtml(unitPrice)}</td>
    <td class="money">${escapeCanonicalArtifactHtml(amount)}</td>
  </tr>`;
}

function renderPreliminaryNeedRow(row: CanonicalArtifactRow, displayOrdinal: number, parameterTitlesRu: Readonly<Record<string, string>>, questionNumbers?: ReadonlyMap<string, number>, rowsById: ReadonlyMap<string, CanonicalArtifactRow> = new Map()): string {
  const trace = objectValue(row.calculation_trace);
  const missingIds = Array.isArray(trace.missingParameterIds) ? trace.missingParameterIds : row.missing_parameter_ids;
  const titles = Array.isArray(missingIds) ? [...new Set(missingIds.flatMap(id => {
    const title = nullableText(parameterTitlesRu[String(id)]);
    return title ? [title] : [];
  }))] : [];
  const numbers = questionNumbers && Array.isArray(missingIds)
    ? [...new Set(missingIds.flatMap(id => questionNumbers.has(String(id)) ? [questionNumbers.get(String(id))!] : []))] : [];
  const missing = numbers.length > 0 ? `исходные сведения № ${numbers.join(", ")} из перечня ниже`
    : titles.length > 0 ? titles.join("; ") : "исходные сведения по этой позиции и условия её применения";
  const quantityLabel = row.quantity == null ? "Количество нужно уточнить"
    : `Введено ${canonicalArtifactQuantity(row.quantity)}; требуется подтверждение исходных сведений`;
  const graph = objectValue(trace.resourceGraph), decision = objectValue(graph.commercialCostCoverageDecisionV1);
  const rate = objectValue(graph.commercialCostCoverageOwnerDecisionV1);
  const ownerTitle = includedCostOwnerTitle(row, rowsById) ?? nullableText(decision.ownerTitleRu);
  const coverageText = [ownerTitle ? `Включено в стоимость «${ownerTitle}».` : null,
    decision.supplyParty === 'RATE_PROVIDER' ? 'Ресурс предоставляет исполнитель этой расценки.' : null,
    rate.active === true && nullableText(rate.scopeRu) ? `Состав расценки: ${String(rate.scopeRu)}` : null].filter(Boolean).join(' ');
  const requirement = canonicalArtifactPurchaseRequirement(row);
  const requirementText = requirement
    ? `${requirement.labelRu}: ${canonicalArtifactQuantity(requirement.quantity)} ${canonicalArtifactUnit({ unit_id: requirement.unitId })}. Точный заказ ещё не подтверждён.`
    : null;
  const presentation = canonicalArtifactPublicResourcePresentationV1(row);
  const specifications = presentation
    ? [...new Set([presentation.specificationRu, ...presentation.detailsRu]
      .filter((detail): detail is string => typeof detail === "string" && detail.trim().length > 0))]
    : [];
  // Each authored paragraph keeps its resource context and can move to the next
  // page independently. A long tool profile must not force one oversized row.
  const specificationRows = specifications.map(detail => `<tr class="preliminary-need-specification"><td></td><td colspan="6"><strong>${escapeCanonicalArtifactHtml(canonicalArtifactVisibleRowTitle(row))}:</strong> ${escapeCanonicalArtifactHtml(detail)}</td></tr>`).join("");
  return `<tr class="preliminary-need">
    <td class="number">${displayOrdinal}</td>
    <td class="name"><strong>${escapeCanonicalArtifactHtml(canonicalArtifactVisibleRowTitle(row))}</strong>${requirementText ? `<span>${escapeCanonicalArtifactHtml(requirementText)}</span>` : ''}<span>Предварительная потребность из определения; требуется уточнение.</span>${coverageText ? `<span>${escapeCanonicalArtifactHtml(coverageText)}</span>` : ''}</td>
    <td>${escapeCanonicalArtifactHtml(CATEGORY_TITLES[canonicalProfessionalPdfCategory(row)])}</td>
    <td class="unit">${escapeCanonicalArtifactHtml(canonicalArtifactUnit(row))}</td>
    <td class="numeric">${escapeCanonicalArtifactHtml(quantityLabel)}</td>
    <td class="money">—</td>
    <td class="money">—</td>
  </tr><tr class="preliminary-need-detail"><td></td><td colspan="6">Требуется уточнить: ${escapeCanonicalArtifactHtml(missing)}. В сумму и закупку позиция не включена.</td></tr>${specificationRows}`;
}

function shortIdentity(value: unknown): string {
  const text = String(value ?? "").trim();
  return text.length <= 12 ? text : text.slice(0, 12);
}

export function buildCanonicalProfessionalPdfProjection(input: {
  revision: CanonicalArtifactRevision;
  rows: CanonicalArtifactRow[];
  preliminaryNeeds?: CanonicalArtifactRow[];
  workTitleRu: string;
  definitionVersionId?: string | null;
  expectedProjectedRowCount?: number;
  parameterTitlesRu?: Readonly<Record<string, string>>;
}): CanonicalProfessionalPdfProjection {
  const { revision, rows } = input;
  const rawPrimer=objectValue(objectValue(revision.amendment_contract).parameterSources).roofPrimerPrerequisiteV1;
  const primer=readRoofPrimerPrerequisiteDecisionV1(rawPrimer);
  if(rawPrimer!=null&&!primer)throw Object.assign(new Error('professional PDF preparation reference invalid'),{code:'ARTIFACT_PREPARATION_REFERENCE_INVALID'});
  const primerAppendix=primer?`<section class="question-appendix"><h2>Связанная огрунтовка основания</h2><div class="notice"><strong>${escapeCanonicalArtifactHtml(roofPrimerPhaseRuV1(primer.phase))} · ${escapeCanonicalArtifactHtml(primer.sectionLabelRu)}</strong><br>Сохранённая смета: ${escapeCanonicalArtifactHtml(primer.sourceDisplayTitleRu)}, версия ${primer.sourceRevisionNumber}.<br>Стоимость подготовки учитывается в связанной смете; платные строки здесь повторно не добавляются.<br>Нормативная площадь огрунтовки: ${canonicalArtifactQuantity(primer.sourceNormAreaM2)} м²; площадь покрытия: ${primer.consumerNormAreaM2==null?'ещё не подтверждена':canonicalArtifactQuantity(primer.consumerNormAreaM2)+' м²'}. Обмеры ведутся отдельно; эта ссылка не распределяет количества и не формирует заказ.${primer.phase!=='completed_accepted'?'<br>План подготовки не подтверждает фактическую готовность основания.':''}</div></section>`:'';
  const preliminaryNeeds = input.preliminaryNeeds ?? [];
  const expectedProjectedRowCount = Number(
    input.expectedProjectedRowCount
      ?? revision.row_count,
  );
  if (rows.length !== expectedProjectedRowCount) {
    throw Object.assign(new Error("professional PDF row count differs from immutable revision"), {
      code: "ARTIFACT_ROW_PARITY_FAILED",
    });
  }
  const scopeDecisions = [...rows,...preliminaryNeeds].flatMap(row=>{
    const d=canonicalScopeRequirementDecisionV1(objectValue(objectValue(row.calculation_trace).resourceGraph).scopeRequirementDecisionV1);
    return d && d.rowId===row.row_id?[d]:[];
  });
  const scopeRowIds=new Set(scopeDecisions.map(d=>d.rowId));
  const quantitativeNeeds=preliminaryNeeds.filter(row=>!scopeRowIds.has(String(row.row_id)));
  const scopeGroups=groupCanonicalScopeRequirementsV1(scopeDecisions);
  const hasUserExclusions=scopeDecisions.some(decision=>decision.status==='USER_EXCLUDED')
    || rows.some(row=>objectValue(row.calculation_trace).physicalScopeExcludedV1 != null);
  const openScopeGroupCount=scopeGroups.filter(g=>g.statuses.some(s=>['PROJECT_SCOPE_OPEN','PARTLY_INCLUDED','SCOPE_UNVERIFIED','LEGACY_SOURCE_REQUIRED','OBJECT_FACT_REQUIRED','REQUIRED_RESOURCE_EXCLUDED'].includes(s))).length;
  const compositionRows = [...rows.filter(row=>!scopeRowIds.has(String(row.row_id))), ...quantitativeNeeds].sort(
    (left, right) => Number(left.ordinal) - Number(right.ordinal),
  );
  const compositionRowIds = compositionRows.map((row) => String(row.row_id));
  const compositionOrdinals = compositionRows.map((row) => Number(row.ordinal));
  if (
    new Set(compositionRowIds).size !== compositionRowIds.length
    || new Set(compositionOrdinals).size !== compositionOrdinals.length
  ) {
    throw Object.assign(new Error("professional PDF composition contains duplicate rows"), {
      code: "ARTIFACT_ROW_PARITY_FAILED",
    });
  }
  const preliminaryRowIds = new Set(preliminaryNeeds.map((row) => String(row.row_id)));
  const rowsById = new Map(compositionRows.map(row => [String(row.row_id), row]));
  const parameters = objectValue(revision.input_parameters);
  const technologyChecks = canonicalArtifactTechnologyChecks(parameters);
  const workMeasure = canonicalArtifactWorkMeasure(rows);
  const workTitleRu = canonicalPublicEstimateWorkTitleRu(workMeasure?.titleRu ? `${workMeasure.titleRu} — ${canonicalArtifactQuantity(workMeasure.value)} кг` : input.workTitleRu);
  const operationSections = canonicalEstimateResourceOperationSections(compositionRows.map(row => ({
    rowId: String(row.row_id), titleRu: canonicalArtifactVisibleRowTitle(row, parameters),
    operation: objectValue(objectValue(row.calculation_trace).resourceGraph).operationCompositionV1,
    sourceOperation: objectValue(objectValue(row.calculation_trace).resourceGraph).originalOperationCompositionV1,
    excludedOperationKeys: objectValue(objectValue(objectValue(row.calculation_trace).resourceGraph).compositionSelectionDecisionV1).excludedOperationKeys as string[] | undefined,
  })), scopeDecisions);
  const hasOperations = operationSections.some(section => section.operation != null);
  const multipleOperationGroups = new Set(operationSections.flatMap(section => section.operation ? [section.operation.groupId] : [])).size > 1;
  const questionNumbers = hasOperations ? new Map<string, number>() : undefined;
  if (questionNumbers) for (const row of preliminaryNeeds) {
    const missing = objectValue(row.calculation_trace).missingParameterIds ?? row.missing_parameter_ids;
    if (Array.isArray(missing)) for (const id of missing) {
      if (typeof id === "string" && nullableText(input.parameterTitlesRu?.[id]) && !questionNumbers.has(id)) questionNumbers.set(id, questionNumbers.size + 1);
    }
  }
  let rowNumber = 0;
  const renderedComposition = operationSections.map(section => {
    const reference = section.operation;
    const heading = reference
      ? `<tr class="operation"><td colspan="7"><strong>${multipleOperationGroups ? `${escapeCanonicalArtifactHtml(canonicalPublicEstimateWorkTitleRu(reference.groupTitleRu))} — ` : ''}${escapeCanonicalArtifactHtml(canonicalPublicEstimateWorkTitleRu(reference.operationTitleRu))}</strong>${reference.processRole === 'REFERENCE_ONLY' ? '<div>Справочные характеристики. Не оплачиваются и не закупаются.</div>' : reference.processRole === 'COST_SUMMARY' ? '<div>Сводные данные. Стоимость учтена в ресурсных строках.</div>' : ''}</td></tr>`
      : hasOperations ? `<tr class="operation"><td colspan="7"><strong>Работы и ресурсы сметы</strong></td></tr>` : '';
    const ownRows = section.resourceIds.map(id => {
      const row = rowsById.get(id)!;
      return preliminaryRowIds.has(id)
        ? renderPreliminaryNeedRow(row, ++rowNumber, input.parameterTitlesRu ?? {}, questionNumbers, rowsById)
        : renderClientRow(row, ++rowNumber, parameters);
    }).join('');
    const shared = section.sharedResources.map(resource => `<tr class="shared-resource"><td colspan="7">${escapeCanonicalArtifactHtml(resource.titleRu)} — общий ресурс, учтён в разделе «${escapeCanonicalArtifactHtml(canonicalPublicEstimateWorkTitleRu(resource.ownerOperationTitleRu))}».</td></tr>`).join('');
    const scopeNotes=(section.scopeRequirements ?? []).map(group => `<tr class="scope-note"><td colspan="7"><strong>${escapeCanonicalArtifactHtml(group.statuses.map(canonicalScopeRequirementStatusRuV1).join('; '))}</strong><br>${escapeCanonicalArtifactHtml(group.detailsRu.join(' '))}${group.statuses.some(status=>['PROJECT_SCOPE_OPEN','PARTLY_INCLUDED','LEGACY_SOURCE_REQUIRED','SCOPE_UNVERIFIED'].includes(status))?'<br>Расчёт этого этапа ещё не завершён приложением. Не включён в стоимость и закупку.':''}</td></tr>`).join('');
    return heading + (section.physicallyExcluded?'<tr><td colspan="7">Подработа исключена пользователем из состава. Можно восстановить.</td></tr>':'')
      + ownRows + shared + scopeNotes + (primerAppendix && section.scopeRequirements?.some(group=>group.groupId==='primer')?`<tr><td colspan="7">${primerAppendix}</td></tr>`:'');
  }).join('');
  const questionAppendix = questionNumbers?.size
    ? `<section class="question-appendix"><h2>Исходные сведения для уточнения состава</h2><div class="notice">Сведения связаны с позициями по номерам. Применимость и количество пока не подтверждены; неизвестные значения не заменены нулями.</div><table><tbody>${[...questionNumbers].map(([id, number]) => `<tr><td style="width:8%">${number}</td><td>${escapeCanonicalArtifactHtml(String(input.parameterTitlesRu?.[id]))}</td></tr>`).join("")}</tbody></table></section>` : "";
  const currencyCode = assertSingleCurrency(revision, rows);
  const payableRows = rows.filter((row) => row.included_in_estimate === true);
  const nonPayableRowCount = rows.length - payableRows.length;
  const pricedRows = payableRows.filter((row) => row.unit_price != null && row.amount != null);
  const missingPriceRowCount = payableRows.length - pricedRows.length;
  const grandTotalStatus: CanonicalProfessionalPdfGrandTotalStatus = missingPriceRowCount === 0 && quantitativeNeeds.length === 0
    && openScopeGroupCount===0
    ? "COMPLETE"
    : "PARTIAL_NEEDS_PRICE";
  const documentStatusRu = hasUserExclusions ? 'Состав с исключениями пользователя' : grandTotalStatus === "COMPLETE" && technologyChecks.length === 0
    ? "Полная"
    : "Предварительная";
  const categoryTotals = Object.fromEntries(
    CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER.map((category) => [
      category,
      pricedRows
        .filter((row) => canonicalProfessionalPdfCategory(row) === category)
        .reduce((sum, row) => sum + numericAmount(row.amount), 0),
    ]),
  ) as Record<CanonicalProfessionalPdfCategory, number>;
  const pricedSubtotal = pricedRows.reduce((sum, row) => sum + numericAmount(row.amount), 0);
  const revisionNumber = Number(revision.revision_number);
  const generatedAt = nullableText(revision.created_at) ?? new Date(0).toISOString();
  const generatedDate = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(generatedAt));
  const primaryValue = canonicalArtifactQuantity(workMeasure?.value ?? revision.primary_measure_value);
  const primaryUnit = canonicalArtifactUnit({ unit_id: workMeasure?.unitId ?? revision.primary_measure_unit_id });
  const currencyLabel = currencyCode === "KGS" ? "сом" : currencyCode;
  const totalRows = CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER.map((category) => {
    const categoryPricedRowCount = pricedRows.filter(
      (row) => canonicalProfessionalPdfCategory(row) === category,
    ).length;
    const displayedTotal = categoryPricedRowCount === 0
      ? "—"
      : canonicalArtifactMoney(categoryTotals[category], currencyCode);
    return `<tr><th>${CATEGORY_TITLES[category]}</th><td>${displayedTotal}</td></tr>`;
  }).join("");
  const grandTotal = grandTotalStatus === "COMPLETE"
    ? `<strong>${canonicalArtifactMoney(pricedSubtotal, currencyCode)}</strong>`
    : quantitativeNeeds.length > 0 || openScopeGroupCount > 0
      ? "<strong>полный итог не рассчитан</strong>"
      : "<strong>требуется уточнение цен</strong>";
  const priceNotice = grandTotalStatus === "COMPLETE"
    ? "Все строки имеют подтверждённую цену."
    : `<strong>${pricedRows.length === 0 ? "Стоимость не рассчитана. Цены не заполнены." : "Стоимость рассчитана частично."}</strong> Строк без подтверждённой цены: ${missingPriceRowCount}. ${quantitativeNeeds.length > 0
      ? `Потребностей с неуточнённым количеством или условием: ${quantitativeNeeds.length}. Полный итог не рассчитан.`
      : openScopeGroupCount>0 ? `${openScopeGroupCount===1?'Состав одного этапа':`Состав ${openScopeGroupCount} этапов`} ещё не завершён приложением; причины указаны внутри сметы. Полный итог не рассчитан.`
      : "Полный итог: требуется уточнение цен."}`;
  const pricedSummary = pricedRows.length === 0
    ? "Стоимость не рассчитана"
    : `${grandTotalStatus === "COMPLETE" ? "Стоимость" : "Стоимость рассчитана частично"}<br>${canonicalArtifactMoney(pricedSubtotal, currencyCode)}`;
  const documentNumber = Number.isFinite(revisionNumber) ? String(revisionNumber) : shortIdentity(revision.id);
  const explicitDemo = /^ДЕМО\s*\/\s*VALIDATION_FIXTURE\s*:/iu.test(String(revision.source_request_text ?? "").trim());
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
    @page{size:A4 portrait;margin:15mm 10mm 17mm}*{box-sizing:border-box}html{font-family:"Arial","DejaVu Sans",sans-serif;color:#172033;font-size:9px;line-height:1.35}
    body{margin:0}header{border-bottom:2px solid #176b45;padding-bottom:8px;margin-bottom:10px}h1{font-size:21px;margin:0 0 5px;color:#10253d}h2{font-size:13px;color:#176b45;margin:14px 0 6px;break-after:avoid}h3{font-size:10px;margin:10px 0 4px}.subtitle{font-size:13px;font-weight:700}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;margin-top:8px}.meta-grid div,.identity div{overflow-wrap:anywhere}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}.summary div{background:#eef7f2;border-radius:4px;padding:7px}.notice{margin:8px 0 12px;padding:8px;border:1px solid #d5dde6;border-radius:4px;color:#39485b;break-inside:avoid}
    table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tfoot{display:table-footer-group}tr{break-inside:avoid;page-break-inside:avoid}td,th{border:1px solid #cbd4df;padding:4px;vertical-align:top;overflow-wrap:anywhere;word-break:normal;hyphens:none}th{background:#e7edf4;text-align:left}.client th:nth-child(1){width:5%}.client th:nth-child(2){width:34%}.client th:nth-child(3){width:12%}.client th:nth-child(4){width:8%}.client th:nth-child(5){width:11%}.client th:nth-child(6),.client th:nth-child(7){width:15%}.name span{display:block;color:#526174;font-size:8px;margin-top:2px}.number,.unit{text-align:center}.number{white-space:nowrap;overflow-wrap:normal;font-variant-numeric:tabular-nums}.numeric,.money{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
    .totals{width:62%;margin:12px 0 0 auto;break-inside:avoid;page-break-inside:avoid}.question-appendix{break-inside:avoid;page-break-inside:avoid}.totals th{width:55%}.totals td{text-align:right;font-variant-numeric:tabular-nums}.grand th,.grand td{background:#e5f2ea}
    .name ul{padding-left:12px;margin:3px 0;font-size:8px;color:#526174}.operation{break-after:avoid;page-break-after:avoid}.operation td{background:#eef7f2}.operation span{display:block;color:#526174;margin-top:3px}.preliminary-need{break-after:avoid;page-break-after:avoid}.preliminary-need-detail{break-before:avoid;page-break-before:avoid}.preliminary-need td{background:#fff7ed}.preliminary-need .numeric{white-space:normal}.preliminary-need-detail td{color:#7c4a03;font-size:8px}.preliminary-need-specification td{color:#526174;font-size:8px}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px;break-inside:avoid}.signature{border:1px solid #cbd4df;padding:7px;min-height:84px}.signature strong{display:block;margin-bottom:7px}.signature div{border-bottom:1px solid #758195;margin-top:13px;color:#526174}.approval-block{break-inside:avoid;page-break-inside:avoid}.organization{margin-top:12px;border-bottom:1px solid #758195;padding-bottom:3px;break-inside:avoid}
  </style></head><body>
    <header><h1>Профессиональная смета</h1><div class="subtitle">${escapeCanonicalArtifactHtml(workTitleRu || "Строительно-монтажные работы")}</div>
      ${explicitDemo ? '<div class="notice"><strong>ДЕМО / VALIDATION_FIXTURE — испытательный документ. Не является утверждённой проектной сметой.</strong></div>' : ""}
      ${nullableText(revision.source_request_text) ? `<div><strong>Исходный запрос:</strong> ${escapeCanonicalArtifactHtml(canonicalPublicEstimateRequestTextRu(String(revision.source_request_text)))}</div>` : ""}
      <div class="meta-grid"><div><strong>Номер:</strong> ${escapeCanonicalArtifactHtml(documentNumber)}</div><div><strong>Статус:</strong> ${documentStatusRu}</div><div><strong>Сформировано:</strong> ${escapeCanonicalArtifactHtml(generatedDate)}</div><div><strong>Валюта:</strong> ${escapeCanonicalArtifactHtml(currencyLabel)}</div><div><strong>Объект:</strong> ${escapeCanonicalArtifactHtml(workTitleRu)}</div><div><strong>${workMeasure ? "Объём работы" : "Первичная мера"}:</strong> ${escapeCanonicalArtifactHtml(`${primaryValue} ${primaryUnit}`)}</div><div><strong>Версия:</strong> ${escapeCanonicalArtifactHtml(String(Number.isFinite(revisionNumber) ? revisionNumber : 1))}</div></div>
    </header>
    <div class="summary"><div><strong>Позиций расчёта</strong><br>${compositionRows.length}</div><div><strong>Количество известно</strong><br>${rows.length}; требуют уточнения ${quantitativeNeeds.length}${scopeGroups.length?`; групп состава и этапов: ${scopeGroups.length}`:''}</div><div><strong>${pricedSummary}</strong></div></div>
    <div class="notice">${priceNotice}</div>
    ${hasUserExclusions?'<div class="notice">Состав изменён пользователем. Стоимость относится к оставшимся позициям; полнота исходной технологии этим документом не подтверждена.</div>':''}
    ${technologyChecks.map(check => `<div class="notice"><strong>Технология требует уточнения.</strong> ${escapeCanonicalArtifactHtml(check.messageRu)} Закупочная ведомость пока не готова.</div>`).join("")}
    <table class="client"><thead><tr><th>№</th><th>Наименование</th><th>Категория</th><th>Ед.</th><th>Количество</th><th>Цена за единицу</th><th>Сумма</th></tr></thead><tbody>${renderedComposition}</tbody></table>
    <table class="totals"><tbody>${totalRows}<tr><th>Неполные цены</th><td>${missingPriceRowCount}</td></tr><tr class="grand"><th>Итого</th><td>${grandTotal}</td></tr></tbody></table>
    <div class="notice"><strong>Примечание.</strong> Документ отображает сохранённые позиции, объёмы и цены. Отсутствующая цена не подменяется нулём.</div>
    ${scopeGroups.some(group=>group.groupId==='primer')?'':primerAppendix}
    ${questionAppendix}
    <section class="approval-block"><div class="organization">Организация: __________________________________________</div>
    <div class="signatures"><div class="signature"><strong>Составил</strong><div>ФИО / должность</div><div>Дата / подпись</div></div><div class="signature"><strong>Проверил</strong><div>ФИО / должность</div><div>Дата / подпись</div></div><div class="signature"><strong>Утвердил</strong><div>ФИО / должность</div><div>Дата / подпись</div></div></div></section>
  </body></html>`;

  return {
    html,
    footerTemplate: `<div style="width:100%;font-size:8px;color:#667487;text-align:center;font-family:Arial,sans-serif">Страница <span class="pageNumber"></span> из <span class="totalPages"></span></div>`,
    rowCount: compositionRows.length,
    pricedRowCount: pricedRows.length,
    missingPriceRowCount,
    grandTotalStatus,
    currencyCode,
    categoryTotals,
    definitionVersionId: input.definitionVersionId ?? null,
    preliminaryNeedCount: preliminaryNeeds.length,
    nonPayableRowCount,
  };
}
