import {canonicalPublicResourceCategoryTitleRuV1,canonicalPublicResourceKindTitleRuV1} from './canonicalPublicResourcePresentationV1';
import { parseCanonicalExactPurchaseQuantityV1 } from "./canonicalPurchaseSupplyReadinessV1";
import {
  canonicalArtifactMoney,
  canonicalArtifactQuantity,
  canonicalArtifactUnit,
  canonicalArtifactVisibleRowTitle,
  canonicalArtifactRentalBasis,
  canonicalArtifactWorkMeasure,
  canonicalArtifactTechnologyChecks,
  canonicalArtifactPublicResourcePresentationV1,
  canonicalArtifactSpecificationParts,
  escapeCanonicalArtifactHtml,
  type CanonicalArtifactRevision,
  type CanonicalArtifactRow,
} from "./canonicalEstimateArtifactContract";
import { canonicalEstimateResourceOperationSections, canonicalLegacyResourceKindV1, canonicalLegacyResourceNameV1, type CanonicalLegacyOperationDisplayContextV1 } from "./canonicalEstimateOperationComposition";
import { canonicalPublicEstimateWorkTitleRu, canonicalPublicEstimateRequestTextRu, canonicalPublicEstimatePendingRowTitleRu,canonicalPublicEstimateParameterTitleRu,canonicalPublicEstimateFixtureTextRu } from './canonicalPublicEstimateLanguageRu';
import { resolveCanonicalEstimateExplicitRowCategory } from './canonicalEstimateRowCategory';
import {canonicalScopeRequirementDecisionV1,groupCanonicalScopeRequirementsV1,canonicalScopeRequirementStatusIsOpenV1} from './canonicalScopeRequirementV1';
import {readRoofPrimerPrerequisiteDecisionV1,roofPrimerPhaseRuV1} from './canonicalRoofPrimerPrerequisiteV1';
import {canonicalMachineHourPriceNeedsConfirmationV1} from './canonicalMachineHourPriceCoverageV1';
import {canonicalPublicHiddenResourceAlternativeIdsV1} from './canonicalPublicResourceAlternativesV1';
import { assertCanonicalPurchaseSupplyRevisionV1, canonicalPurchaseSupplyWarningV1 } from "./canonicalPurchaseSupplyReadinessV1";
import {canonicalPublicSavedResourceRowKindV1} from './canonicalPublicResourcePresentationV1';
import {canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1} from './canonicalEstimateSavedOperationAcceptanceV1';
import {isCanonicalEstimateConsumerSuppliedParameter,isCanonicalEstimateUserEditableParameter} from './canonicalEstimateParameterSemantics';
import type {CanonicalEstimateCatalogItem} from './contracts';

export const CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION =
  "canonical-professional-pdf.r4-a13-verified-operation-composition-template87" as const;

/** All catalogs use the same money-cell contract; status text belongs outside
 * the resource table. Reject a regression before a worker creates the PDF. */
export function assertCanonicalProfessionalPdfMoneyCells(html: string): void {
  const cells = html.matchAll(/<td\b[^>]*\bclass=["'][^"']*\bmoney\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/giu);
  for (const [, content] of cells) {
    if (content === '' || /^-?\d+(?:[ \u00a0\u202f]\d{3})*,\d{2} (?:сом|[A-Z]{3})$/u.test(content)) continue;
    throw Object.assign(new Error('professional PDF money cells must contain a numeric currency amount or be empty'), {
      code: 'ARTIFACT_MONEY_CELL_PRESENTATION_INVALID',
    });
  }
}

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
  equipment: "Инструмент, оборудование и механизмы",
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

function publicRowKind(row:CanonicalArtifactRow) {
  return canonicalPublicSavedResourceRowKindV1(row);
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

function selectedResourceTitle(row: CanonicalArtifactRow, parameters: Record<string, unknown>, legacyDisplayContext?:CanonicalLegacyOperationDisplayContextV1): string {
  const title = canonicalLegacyResourceNameV1(String(row.row_id),legacyDisplayContext,objectValue(row.calculation_trace).manualTitleOverride===true) ?? canonicalArtifactVisibleRowTitle(row, parameters);
  const trace = objectValue(row.calculation_trace), graph = objectValue(trace.resourceGraph);
  if (trace.manualTitleOverride === true || graph.titleSpecificationMode !== "APPEND") return title;
  // These are saved project selections that define the resource or service.
  // Keep them in its name without restoring permanent explanatory paragraphs.
  const selected = canonicalArtifactSpecificationParts(row, parameters, { splitSelectedValues: false })
    .filter(part => part.parameterId !== "resource_presentation_v1")
    .flatMap(part => part.publicParts ?? part.parts)
    .filter(part => !title.includes(part));
  return selected.length ? `${title} — ${[...new Set(selected)].join('; ')}` : title;
}

function publicResourceCategoryTitle(row:CanonicalArtifactRow,legacyDisplayContext?:CanonicalLegacyOperationDisplayContextV1):string {
  const trace=objectValue(row.calculation_trace),graph=objectValue(trace.resourceGraph);
  return canonicalPublicResourceKindTitleRuV1(canonicalLegacyResourceKindV1(String(row.row_id),legacyDisplayContext)) ?? canonicalPublicResourceCategoryTitleRuV1({titleRu:String(row.title_ru),graph,
    category:String(row.category??''),manualTitleOverride:trace.manualTitleOverride===true})
    ?? 'Категория не определена';
}

function renderClientRow(row: CanonicalArtifactRow, displayOrdinal: number, parameters: Record<string, unknown>, referenceOnly = false, legacyDisplayContext?:CanonicalLegacyOperationDisplayContextV1): string {
  const category = canonicalProfessionalPdfCategory(row);
  const supplyWarning = canonicalPurchaseSupplyWarningV1(row);
  const exactQuantity = parseCanonicalExactPurchaseQuantityV1(objectValue(row.calculation_trace).exactPurchaseQuantityV1);
  const savedQuantityLabel = exactQuantity ? exactQuantity.quantityText ?? "Не рассчитано" : canonicalArtifactQuantity(row.quantity);
  const includedInEstimate = row.included_in_estimate === true && supplyWarning == null;
  const rental = supplyWarning ? null : canonicalArtifactRentalBasis(row, parameters);
  // Detailed stock, reserve and remainder balances belong to procurement;
  // the estimate keeps its saved quantity and exact resource name.
  const rentalText = rental ? `${canonicalArtifactQuantity(rental.physicalQuantity)} шт. × ${canonicalArtifactQuantity(rental.durationDays)} сут.` : null;
  const unitPrice = row.unit_price == null ? '' : canonicalArtifactMoney(row.unit_price, row.currency_code);
  const amount = referenceOnly || !includedInEstimate || row.amount == null ? '' : canonicalArtifactMoney(row.amount, row.currency_code);
  return `<tr${supplyWarning ? ' class="purchase-supply-block"' : ""}>
    <td class="number">${displayOrdinal}</td>
    <td class="name"><strong>${escapeCanonicalArtifactHtml(selectedResourceTitle(row, parameters,legacyDisplayContext))}</strong>${rentalText?`<span>${escapeCanonicalArtifactHtml(rentalText)}</span>`:''}</td>
    <td>${escapeCanonicalArtifactHtml(publicResourceCategoryTitle(row,legacyDisplayContext))}</td>
    <td class="unit">${escapeCanonicalArtifactHtml(canonicalArtifactUnit(row))}</td>
    <td class="numeric">${escapeCanonicalArtifactHtml(savedQuantityLabel)}</td>
    <td class="money">${escapeCanonicalArtifactHtml(unitPrice)}</td>
    <td class="money">${escapeCanonicalArtifactHtml(amount)}</td>
  </tr>`;
}

function renderPreliminaryNeedRow(row: CanonicalArtifactRow, displayOrdinal: number,parameters:Record<string,unknown>,legacyDisplayContext?:CanonicalLegacyOperationDisplayContextV1): string {
  const trace = objectValue(row.calculation_trace);
  const supplyWarning = canonicalPurchaseSupplyWarningV1(row);
  const exactQuantity = parseCanonicalExactPurchaseQuantityV1(trace.exactPurchaseQuantityV1);
  const savedQuantityLabel = exactQuantity ? exactQuantity.quantityText ?? "Не рассчитано" : canonicalArtifactQuantity(row.quantity);
  const quantityLabel = row.quantity == null ? "Не рассчитано" : savedQuantityLabel;
  const pendingTitle = canonicalLegacyResourceNameV1(String(row.row_id),legacyDisplayContext,trace.manualTitleOverride===true) ?? (supplyWarning && trace.manualTitleOverride === true
    ? canonicalArtifactVisibleRowTitle(row,parameters)
    : canonicalPublicEstimatePendingRowTitleRu(canonicalArtifactVisibleRowTitle(row,parameters)));
  // A pending physical quantity remains unpaid, but its saved manual price
  // must still be visible when the user exports the same immutable revision.
  const savedUnitPrice = row.unit_price != null
    ? canonicalArtifactMoney(row.unit_price, row.currency_code) : '';
  return `<tr class="preliminary-need">
    <td class="number">${displayOrdinal}</td>
    <td class="name"><strong>${escapeCanonicalArtifactHtml(pendingTitle)}</strong></td>
    <td>${escapeCanonicalArtifactHtml(publicResourceCategoryTitle(row,legacyDisplayContext))}</td>
    <td class="unit">${escapeCanonicalArtifactHtml(canonicalArtifactUnit(row))}</td>
    <td class="numeric">${escapeCanonicalArtifactHtml(quantityLabel)}</td>
    <td class="money">${escapeCanonicalArtifactHtml(savedUnitPrice)}</td>
    <td class="money"></td>
  </tr>`;
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
  parameterSchema?: CanonicalEstimateCatalogItem['parameterSchema'];
  /** Only the immutable revision's selected evidence, never a current definition. */
  savedIndependentComposition?: unknown;
}): CanonicalProfessionalPdfProjection {
  const { revision, rows } = input;
  const rawPrimer=objectValue(objectValue(revision.amendment_contract).parameterSources).roofPrimerPrerequisiteV1;
  const primer=readRoofPrimerPrerequisiteDecisionV1(rawPrimer);
  if(rawPrimer!=null&&!primer)throw Object.assign(new Error('professional PDF preparation reference invalid'),{code:'ARTIFACT_PREPARATION_REFERENCE_INVALID'});
  const primerAppendix=primer?`<section class="linked-work"><h2>Связанная огрунтовка основания</h2><table><thead><tr><th>Работа</th><th>Участок</th><th>Версия</th><th>Статус</th><th>Огрунтовка, м²</th><th>Покрытие, м²</th></tr></thead><tbody><tr><td>${escapeCanonicalArtifactHtml(primer.sourceDisplayTitleRu)}</td><td>${escapeCanonicalArtifactHtml(primer.sectionLabelRu)}</td><td>${primer.sourceRevisionNumber}</td><td>${escapeCanonicalArtifactHtml(roofPrimerPhaseRuV1(primer.phase))}</td><td>${canonicalArtifactQuantity(primer.sourceNormAreaM2)}</td><td>${primer.consumerNormAreaM2==null?'Не рассчитано':canonicalArtifactQuantity(primer.consumerNormAreaM2)}</td></tr></tbody></table></section>`:'';
  const preliminaryNeeds = input.preliminaryNeeds ?? [];
  const operationAcceptance=canonicalEstimateSavedOperationAcceptanceV1({revision,resources:[...rows,...preliminaryNeeds],
    savedIndependentComposition:input.savedIndependentComposition});
  assertCanonicalEstimateSavedArtifactStructureV1(operationAcceptance);
  const legacyDisplayContext:CanonicalLegacyOperationDisplayContextV1={
    revisionId:String(revision.id??''),releaseId:String(revision.release_id??''),checksumSha256:String(revision.checksum_sha256??''),
    savedResources:[...rows,...preliminaryNeeds].map(row=>({rowId:String(row.row_id),
      operation:objectValue(objectValue(row.calculation_trace).resourceGraph).operationCompositionV1})),
  };
  assertCanonicalPurchaseSupplyRevisionV1([...rows, ...preliminaryNeeds], revision.amendment_contract);
  const supplyBlockedRows = [...rows, ...preliminaryNeeds].filter(row => canonicalPurchaseSupplyWarningV1(row) != null);
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
  const hiddenAlternatives=canonicalPublicHiddenResourceAlternativeIdsV1([...rows,...preliminaryNeeds].map(row=>{
    const trace=objectValue(row.calculation_trace);return {id:String(row.row_id),sourceRowId:String(row.row_id),scopeId:String(revision.id),titleRu:String(row.title_ru),unitId:String(row.unit_id),quantity:row.quantity,
      preliminary:preliminaryNeeds.includes(row),unitPrice:row.unit_price,amount:row.amount,manual:trace.manualTitleOverride===true||trace.manualQuantityOverride===true,graph:trace.resourceGraph};
  }));
  const publicQuantitativeNeeds=quantitativeNeeds.filter(row=>!hiddenAlternatives.has(String(row.row_id))&&publicRowKind(row)==='RESOURCE');
  const scopeGroups=groupCanonicalScopeRequirementsV1(scopeDecisions);
  const hasUserExclusions=scopeDecisions.some(decision=>decision.status==='USER_EXCLUDED')
    || rows.some(row=>objectValue(row.calculation_trace).physicalScopeExcludedV1 != null);
  const openScopeGroupCount=scopeGroups.filter(g=>g.statuses.some(canonicalScopeRequirementStatusIsOpenV1)).length;
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
  // Validate parity against the complete immutable revision above. Only the
  // authored public projection omits counters and renders conditions as notes.
  const publicCompositionRows=compositionRows.filter(row=>!hiddenAlternatives.has(String(row.row_id))&&publicRowKind(row)!=='CALCULATION_DETAIL');
  const publicResourceRows=publicCompositionRows.filter(row=>publicRowKind(row)==='RESOURCE');
  // A saved quantity remains known when a source, supply or project condition
  // is still pending. Count unique public rows, separately from readiness.
  const knownQuantityRowCount=publicResourceRows.filter(row=>row.quantity!=null).length;
  const missingQuantityRowCount=publicResourceRows.length-knownQuantityRowCount;
  const parameters = objectValue(revision.input_parameters);
  const savedUserParameters=objectValue(objectValue(objectValue(revision.amendment_contract).parameterSources).userParameters);
  // Show the saved object measurements beside the original request, which may
  // describe an earlier value. Only source-approved consumer numeric inputs
  // are eligible; derived outputs and application norms stay out of this line.
  const currentMeasurements=(input.parameterSchema??[]).filter(parameter=>
    ['decimal','integer'].includes(parameter.valueType)
    &&isCanonicalEstimateConsumerSuppliedParameter(parameter)&&isCanonicalEstimateUserEditableParameter(parameter)
    &&Object.hasOwn(savedUserParameters,parameter.parameterId)&&Object.hasOwn(parameters,parameter.parameterId))
    .flatMap(parameter=>{
      const value=parameters[parameter.parameterId];
      if(!/^[+-]?\d+(?:\.\d+)?$/u.test(String(value)))return [];
      const title=canonicalPublicEstimateParameterTitleRu(parameter.parameterId,parameter.titleRu,
        {catalogId:String(revision.catalog_id),unitId:parameter.unitId});
      return [`${title}: ${canonicalArtifactQuantity(value)}${parameter.unitId?' '+canonicalArtifactUnit({unit_id:parameter.unitId}):''}`];
    });
  const technologyChecks = canonicalArtifactTechnologyChecks(parameters);
  const workMeasure = canonicalArtifactWorkMeasure(rows);
  const workTitleRu = canonicalPublicEstimateWorkTitleRu(workMeasure?.titleRu ? `${workMeasure.titleRu} — ${canonicalArtifactQuantity(workMeasure.value)} кг` : input.workTitleRu);
  const operationSections = canonicalEstimateResourceOperationSections(publicCompositionRows.map(row => ({
    rowId: String(row.row_id), titleRu: canonicalArtifactVisibleRowTitle(row, parameters),
    operation: objectValue(objectValue(row.calculation_trace).resourceGraph).operationCompositionV1,
    sourceOperation: objectValue(objectValue(row.calculation_trace).resourceGraph).originalOperationCompositionV1,
    excludedOperationKeys: objectValue(objectValue(objectValue(row.calculation_trace).resourceGraph).compositionSelectionDecisionV1).excludedOperationKeys as string[] | undefined,
  })), scopeDecisions, [...rows,...preliminaryNeeds].filter(row=>scopeRowIds.has(String(row.row_id))).map(row=>({
    rowId:String(row.row_id),operation:objectValue(objectValue(row.calculation_trace).resourceGraph).operationCompositionV1,
  })),legacyDisplayContext);
  const hasOperations = operationSections.some(section => section.operation != null);
  const multipleOperationGroups = new Set(operationSections.flatMap(section => section.operation ? [section.operation.groupId] : [])).size > 1;
  const orderedIds=(section:typeof operationSections[number])=>section.operation?[
    ...section.resourceIds.filter(id=>canonicalProfessionalPdfCategory(rowsById.get(id)!)==='work'),
    ...section.resourceIds.filter(id=>canonicalProfessionalPdfCategory(rowsById.get(id)!)!=='work'),
  ]:section.resourceIds;
  const displayOrdinals=new Map(operationSections.flatMap(orderedIds).filter(id=>publicRowKind(rowsById.get(id)!)==='RESOURCE').map((id,index)=>[id,index+1]));
  const renderedComposition = operationSections.map(section => {
    const reference = section.operation;
    const stageParameterIds=[...new Set(section.resourceIds.flatMap(id=>{
      const sourceRow=rowsById.get(id)!;
      if(publicRowKind(sourceRow)!=='RESOURCE')return [];
      const graph=objectValue(objectValue(sourceRow.calculation_trace).resourceGraph);
      if(Object.hasOwn(graph,'stageInputPresentationV1')){
        const presentation=objectValue(graph.stageInputPresentationV1),ids=presentation.parameterIds;
        const declared=Array.isArray(graph.inputParameterIds)?graph.inputParameterIds:[];
        return presentation.contractVersion==='canonical-stage-input-presentation/v1'&&Array.isArray(ids)&&ids.length<=64
          &&new Set(ids).size===ids.length&&ids.every((id:unknown)=>typeof id==='string'&&id.trim()===id&&declared.includes(id))?ids as string[]:[];
      }
      const policy=objectValue(graph.derivedQuantityEditPolicyV1);
      return policy.contractVersion==='canonical-derived-quantity-edit-policy/v1'&&policy.mode==='PARAMETERS_ONLY'&&Array.isArray(policy.parameterIds)?policy.parameterIds.filter((id):id is string=>typeof id==='string'):[];
    }))];
    const stageInputs=stageParameterIds.flatMap(id=>{
      const title=nullableText(input.parameterTitlesRu?.[id]),value=parameters[id];
      return title&&(typeof value==='number'||typeof value==='string')&&/^\d+(?:\.\d+)?$/u.test(String(value))
        ?[`${escapeCanonicalArtifactHtml(title)}: ${canonicalArtifactQuantity(value)}`]:[];
    });
    const heading = reference
      ? `<tr class="operation"><td colspan="7"><strong>${multipleOperationGroups ? `${escapeCanonicalArtifactHtml(canonicalPublicEstimateWorkTitleRu(reference.groupTitleRu))} — ` : ''}${escapeCanonicalArtifactHtml(canonicalPublicEstimateWorkTitleRu(reference.operationTitleRu))}</strong>${stageInputs.length?`<div>Исходные данные этапа: ${stageInputs.join('; ')}</div>`:''}</td></tr>`
      : hasOperations ? `<tr class="operation"><td colspan="7"><strong>Работы и ресурсы сметы</strong></td></tr>` : '';
    // Keep each operation together: its work rows lead its own resources.
    // Stored ordinals, cost ownership and shared-resource references stay intact.
    const orderedResourceIds=orderedIds(section);
    const ownRows = orderedResourceIds.map(id => {
      const row = rowsById.get(id)!;
      if(publicRowKind(row)==='PROCESS_NOTE')return '';
      return preliminaryRowIds.has(id)
        ? renderPreliminaryNeedRow(row, displayOrdinals.get(id)!,parameters,legacyDisplayContext)
        : renderClientRow(row, displayOrdinals.get(id)!, parameters,false,legacyDisplayContext);
    }).join('');
    const sharedResources = section.sharedResources.flatMap(resource => {
      const row = rowsById.get(resource.rowId);
      if (!row || publicRowKind(row) !== 'RESOURCE') return [];
      return [preliminaryRowIds.has(resource.rowId)
        ? renderPreliminaryNeedRow(row, displayOrdinals.get(resource.rowId)!,parameters,legacyDisplayContext)
        : renderClientRow(row, displayOrdinals.get(resource.rowId)!, parameters, true,legacyDisplayContext)];
    });
    // These are uses of the same immutable resources, not additional purchase
    // or price rows. Each stage exposes its equipment and shared provision.
    return heading + ownRows + sharedResources.join('');
  }).join('');
  const currencyCode = assertSingleCurrency(revision, rows);
  const payableRows = rows.filter((row) => row.included_in_estimate === true && canonicalPurchaseSupplyWarningV1(row) == null);
  const nonPayableRowCount = rows.length - payableRows.length;
  const pricedRows = payableRows.filter((row) => row.unit_price != null && row.amount != null);
  const missingPriceRowCount = payableRows.length - pricedRows.length;
  const unconfirmedMachinePriceCount=payableRows.filter(row=>canonicalMachineHourPriceNeedsConfirmationV1(row,String(revision.catalog_id))).length;
  const grandTotalStatus: CanonicalProfessionalPdfGrandTotalStatus = missingPriceRowCount === 0 && quantitativeNeeds.length === 0
    && openScopeGroupCount===0&&unconfirmedMachinePriceCount===0&&supplyBlockedRows.length===0
    ? "COMPLETE"
    : "PARTIAL_NEEDS_PRICE";
  const documentStatusRu = hasUserExclusions ? 'Состав с исключениями пользователя' : grandTotalStatus === "COMPLETE" && technologyChecks.length === 0 && operationAcceptance.completeClaimAllowed
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
      ? ""
      : canonicalArtifactMoney(categoryTotals[category], currencyCode);
    return `<tr><th>${CATEGORY_TITLES[category]}</th><td>${displayedTotal}</td></tr>`;
  }).join("");
  const grandTotal = grandTotalStatus === "COMPLETE"
    ? `<strong>${canonicalArtifactMoney(pricedSubtotal, currencyCode)}</strong>`
    : quantitativeNeeds.length > 0 || openScopeGroupCount > 0 || supplyBlockedRows.length > 0
      ? "<strong>полный итог не рассчитан</strong>"
      : "<strong>требуется уточнение цен</strong>";
  const priceNotice = grandTotalStatus === "COMPLETE"
    ? "Все учтённые оплачиваемые позиции имеют подтверждённую цену."
    : `<strong>${pricedRows.length === 0 ? "Стоимость не рассчитана. Цены не заполнены." : "Стоимость рассчитана частично."}</strong> Строк без подтверждённой цены: ${missingPriceRowCount}. ${unconfirmedMachinePriceCount>0?`В ${unconfirmedMachinePriceCount} поз. введена цена, но не подтверждён её эксплуатационный состав. Эти суммы предварительные. `:''}${quantitativeNeeds.length > 0
      ? publicQuantitativeNeeds.length>0
        ? `Ещё не рассчитано позиций: ${publicQuantitativeNeeds.length}. Нерассчитанные позиции не включены в стоимость и закупку. Полный итог не рассчитан.`
        : 'Состав требует уточнения. Итог предварительный.'
      : openScopeGroupCount>0 ? `${openScopeGroupCount===1?'Состав одного этапа':`Состав ${openScopeGroupCount} этапов`} ещё не завершён приложением. Полный итог не рассчитан.`
      : supplyBlockedRows.length > 0 ? "Условия поставки не подтверждены. Полный итог не рассчитан."
      : "Полный итог: требуется уточнение цен."}`;
  const pricedSummary = pricedRows.length === 0
    ? "Стоимость не рассчитана"
    : `${grandTotalStatus === "COMPLETE" ? (operationAcceptance.completeClaimAllowed ? "Стоимость" : "Стоимость учтённых позиций") : "Стоимость рассчитана частично"}<br>${canonicalArtifactMoney(pricedSubtotal, currencyCode)}`;
  const documentNumber = Number.isFinite(revisionNumber) ? String(revisionNumber) : shortIdentity(revision.id);
  const explicitDemo = /^ДЕМО\s*\/\s*VALIDATION_FIXTURE\s*:/iu.test(String(revision.source_request_text ?? "").trim());
  // A translated fixture supply disclaimer is a document status, never part
  // of a physical resource name or evidence of an actual supplier commitment.
  const fixtureSupplyUnconfirmed = Object.values(parameters).some(value=>typeof value==='string'
    && canonicalPublicEstimateFixtureTextRu(value)!==value
    && canonicalPublicEstimateFixtureTextRu(value).includes('поставка не подтверждена'));
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
    @page{size:A4 portrait;margin:15mm 10mm 17mm}*{box-sizing:border-box}html{font-family:"Arial","DejaVu Sans",sans-serif;color:#172033;font-size:9px;line-height:1.35}
    body{margin:0}header{border-bottom:2px solid #176b45;padding-bottom:8px;margin-bottom:10px}h1{font-size:21px;margin:0 0 5px;color:#10253d}h2{font-size:13px;color:#176b45;margin:14px 0 6px;break-after:avoid}h3{font-size:10px;margin:10px 0 4px}.subtitle{font-size:13px;font-weight:700}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;margin-top:8px}.meta-grid div,.identity div{overflow-wrap:anywhere}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}.summary div{background:#eef7f2;border-radius:4px;padding:7px}.notice{margin:8px 0 12px;padding:8px;border:1px solid #d5dde6;border-radius:4px;color:#39485b;break-inside:avoid}
    table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tfoot{display:table-footer-group}tr{break-inside:avoid;page-break-inside:avoid}td,th{border:1px solid #cbd4df;padding:3px 4px;vertical-align:top;overflow-wrap:anywhere;word-break:normal;hyphens:none}th{background:#e7edf4;text-align:left}.client th:nth-child(1){width:5%}.client th:nth-child(2){width:34%}.client th:nth-child(3){width:12%}.client th:nth-child(4){width:8%}.client th:nth-child(5){width:11%}.client th:nth-child(6),.client th:nth-child(7){width:15%}.name span{display:block;color:#526174;font-size:8px;margin-top:2px}.number,.unit{text-align:center}.number{white-space:nowrap;overflow-wrap:normal;font-variant-numeric:tabular-nums}.numeric,.money{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
    .totals{width:62%;margin:12px 0 0 auto;break-inside:avoid;page-break-inside:avoid}.question-appendix{break-inside:avoid;page-break-inside:avoid}.totals th{width:55%}.totals td{text-align:right;font-variant-numeric:tabular-nums}.grand th,.grand td{background:#e5f2ea}
    .name ul{padding-left:12px;margin:3px 0;font-size:8px;color:#526174}.operation{break-after:avoid;page-break-after:avoid}.operation td{background:#eef7f2}.operation span{display:block;color:#526174;margin-top:3px}.preliminary-need{break-inside:avoid;page-break-inside:avoid;break-after:auto;page-break-after:auto}.preliminary-need-detail{break-before:avoid;page-break-before:avoid}.preliminary-need td{background:#fff7ed}.preliminary-need .numeric,.preliminary-need .money{white-space:normal}.purchase-supply-block .numeric{white-space:normal;overflow-wrap:anywhere}.preliminary-need-detail td{color:#7c4a03;font-size:8px}.preliminary-need-specification td{color:#526174;font-size:8px}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px;break-inside:avoid}.signature{border:1px solid #cbd4df;padding:6px;min-height:72px}.signature strong{display:block;margin-bottom:5px}.signature div{border-bottom:1px solid #758195;margin-top:10px;color:#526174}.document-ending,.approval-block{break-inside:avoid;page-break-inside:avoid}.organization{margin-top:8px;border-bottom:1px solid #758195;padding-bottom:3px;break-inside:avoid}
  </style></head><body>
    <header><h1>Профессиональная смета</h1><div class="subtitle">${escapeCanonicalArtifactHtml(workTitleRu || "Строительно-монтажные работы")}</div>
      ${explicitDemo ? '<div class="notice"><strong>Проверочный пример. Не является утверждённой проектной сметой.</strong></div>' : ""}
      ${fixtureSupplyUnconfirmed ? '<div class="notice">Проверочный пример; поставка не подтверждена.</div>' : ""}
      ${nullableText(revision.source_request_text) ? `<div><strong>Исходный запрос:</strong> ${escapeCanonicalArtifactHtml(canonicalPublicEstimateRequestTextRu(String(revision.source_request_text)))}</div>` : ""}
      <div class="meta-grid"><div><strong>Номер:</strong> ${escapeCanonicalArtifactHtml(documentNumber)}</div><div><strong>Статус:</strong> ${documentStatusRu}</div><div><strong>Сформировано:</strong> ${escapeCanonicalArtifactHtml(generatedDate)}</div><div><strong>Валюта:</strong> ${escapeCanonicalArtifactHtml(currencyLabel)}</div><div><strong>Объект:</strong> ${escapeCanonicalArtifactHtml(workTitleRu)}</div><div><strong>${workMeasure ? "Объём работы" : "Первичная мера"}:</strong> ${escapeCanonicalArtifactHtml(`${primaryValue} ${primaryUnit}`)}</div><div><strong>Версия:</strong> ${escapeCanonicalArtifactHtml(String(Number.isFinite(revisionNumber) ? revisionNumber : 1))}</div></div>
    </header>
    ${currentMeasurements.length?`<div class="notice current-measurements"><strong>Данные расчёта:</strong> ${currentMeasurements.map(escapeCanonicalArtifactHtml).join('; ')}.</div>`:''}
    <div class="summary"><div><strong>Позиций сметы</strong><br>${publicResourceRows.length}</div><div><strong>Количество известно</strong><br>${knownQuantityRowCount}; ещё не рассчитано ${missingQuantityRowCount}${scopeGroups.length?`; групп состава и этапов: ${scopeGroups.length}`:''}</div><div><strong>${pricedSummary}</strong></div></div>
    <div class="notice">${priceNotice}</div>
    ${!operationAcceptance.completeClaimAllowed?'<div class="notice composition-acceptance"><strong>Предварительная смета.</strong> Состав операций проверен. Количества отдельных ресурсов ещё не рассчитаны и отмечены отдельно; стоимость относится к учтённым позициям.</div>':''}
    ${supplyBlockedRows.length > 0 ? '<div class="notice"><strong>Закупка пока не готова.</strong> Сохранённые ручные количества не исправлялись автоматически. Причины по условиям поставки указаны у позиций; зависимые количества и остатки не определены.</div>' : ''}
    ${hasUserExclusions?'<div class="notice">Состав изменён пользователем. Стоимость относится к оставшимся позициям; полнота исходной технологии этим документом не подтверждена.</div>':''}
    ${technologyChecks.map(check => `<div class="notice"><strong>Технология требует уточнения.</strong> ${escapeCanonicalArtifactHtml(check.messageRu)} Закупочная ведомость пока не готова.</div>`).join("")}
    <table class="client"><thead><tr><th>№</th><th>Наименование</th><th>Категория</th><th>Ед.</th><th>Количество</th><th>Цена за единицу</th><th>Сумма</th></tr></thead><tbody>${renderedComposition}</tbody></table>
    <section class="document-ending"><table class="totals"><tbody>${totalRows}<tr><th>Неполные цены</th><td>${missingPriceRowCount}</td></tr><tr class="grand"><th>${operationAcceptance.completeClaimAllowed ? "Итого" : "Итого по учтённым позициям"}</th><td>${grandTotal}</td></tr></tbody></table>
    ${scopeGroups.some(group=>group.groupId==='primer')?'':primerAppendix}

    <section class="approval-block"><div class="organization">Организация: __________________________________________</div>
    <div class="signatures"><div class="signature"><strong>Составил</strong><div>ФИО / должность</div><div>Дата / подпись</div></div><div class="signature"><strong>Проверил</strong><div>ФИО / должность</div><div>Дата / подпись</div></div><div class="signature"><strong>Утвердил</strong><div>ФИО / должность</div><div>Дата / подпись</div></div></div></section>
    </section>
  </body></html>`;

  assertCanonicalProfessionalPdfMoneyCells(html);
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
