import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';

import { buildMasterParameterCalculationConsumers } from './canonicalDefinitionParameterConsumersR1';
import { roofScreed25OwnerV1, roofScreed25ConditionsV1, extendRoofScreed25ForecastV1,
  ROOF_SCREED25_PACK_V1 as pack, ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1,
  ROOF_SCREED25_TECHNOLOGY_UNKNOWN_V1,ROOF_SCREED25_DIRECT_BASE_UNKNOWN_V1 } from './canonicalRoofScreed25CompanionV1';
import { roofScreed15DirectBaseParameterV1, roofScreed15DirectBaseRowV1,
  ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1, ROOF_SCREED15_SUPPORTED_BASE_V1,
  ROOF_SCREED15_UNKNOWN_BASE_V1, ROOF_SCREED_DIRECT_BASE_SOURCE_V1 } from './canonicalRoofScreedDirectBaseV1';
import { ROOF_LOWER_CHAIN_SCOPE_ROW_V1 } from './canonicalRoofLowerLayersCompanionV1';
import { ROOF_SCREED_SEMANTIC_ROW_V1 } from './canonicalRoofScreedCompanionV1';
import screed15 from '../../../../data/estimate-benchmarks/source-packs/roof-screed15-companion-s27-67.json';
type PurchaseGroupRepresentative = { definition: Json; parameters: Json[]; formulas: Json[]; resources: Json[]; bindings: Json[]; baseline: Json; passport: Json; };

type Json = Record<string, any>;
const hash = (v: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const parents = {
  'canonical-work:base:roofing_interior_flat_roof_install_technical_room': '66084d87-deac-5f5c-88c2-f15085f69757',
  'canonical-work:base:roofing_interior_flat_roof_install_wet_zone': '01da80c5-169e-552a-8479-9da5a16b3ded',
};
export function buildRoofScreed25SuccessorV1(parent: PurchaseGroupRepresentative, locatorId: string) {
  const catalogId = String(parent.definition.catalog_id);
  if (parents[catalogId as keyof typeof parents] !== parent.definition.id || parent.definition.definition_version !== 11
    || parent.resources.length !== 178 || parent.parameters.length !== 78) throw new Error('ROOF_SCREED25_EXACT_PARENT_REQUIRED');
  const result = structuredClone(parent), owner = roofScreed25OwnerV1(catalogId);
  const oldIds = new Set(screed15.rates.map(r => `${screed15.prefix}:${r.role}`));
  const original15 = parent.resources.find(r => r.row_id === `${screed15.prefix}:workers`)!;
  const area15 = parent.parameters.find(p => p.parameter_id === screed15.measurementParameterId)!;
  if (!original15 || !area15) throw new Error('ROOF_SCREED25_PARENT15_REQUIRED');
  const baseFact = roofScreed15DirectBaseParameterV1(area15, original15.inclusion_ast as Json, catalogId);
  result.resources = result.resources.map(row => {
    if (oldIds.has(row.row_id)) return roofScreed15DirectBaseRowV1(row) as typeof row;
    const graph = row.resource_graph as Json, originalScope = graph.scopeRequirementV1;
    const modified = row.row_id === ROOF_LOWER_CHAIN_SCOPE_ROW_V1 ? roofScreed15DirectBaseRowV1(row) : structuredClone(row);
    modified.inclusion_ast = extendRoofScreed25ForecastV1(row.inclusion_ast);
    if (originalScope) {
      const scope = (modified.resource_graph as Json).scopeRequirementV1;
      if (row.row_id === ROOF_LOWER_CHAIN_SCOPE_ROW_V1) {
        scope.exactScopeWhen = extendRoofScreed25ForecastV1(originalScope.exactScopeWhen);
        scope.reasonRu += ' Вариант25мм допускается только для отдельного участка с проверенными основанием, жёсткостью раствора и машинной подачей. Подготовка верха засыпки и фактическое выполнение не выводятся из количества раствора.';
      } else if (row.row_id === ROOF_SCREED_SEMANTIC_ROW_V1) {
        // The new25mm scope owns its own quantities/facts. The historical15mm
        // obligation cannot require an unrelated old area in the new profile.
        const branch25 = { kind: 'equals', parameterId: 'roof_torch_conditions', value: ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1 };
        scope.notApplicableWhen = scope.notApplicableWhen ? { kind: 'or', operands: [scope.notApplicableWhen, branch25] } : branch25;
        scope.contextWhen = scope.contextWhen ? extendRoofScreed25ForecastV1(scope.contextWhen) : { kind: 'or', operands: [scope.exactScopeWhen, branch25] };
        scope.reasonRu += ' Для выбранной стяжки25мм приложение использует отдельный расчёт и площадь её участка; прежняя площадь15мм не требуется.';
      } else scope.exactScopeWhen = extendRoofScreed25ForecastV1(scope.exactScopeWhen);
      if (scope.contextWhen) scope.contextWhen = extendRoofScreed25ForecastV1(scope.contextWhen);
      if (scope.projectOperationContextsV1) scope.projectOperationContextsV1 = scope.projectOperationContextsV1
        .map((context: Json) => ({ ...context, when: context.applicabilityWhen ? context.when : extendRoofScreed25ForecastV1(context.when) }));
      // satisfiedWhen describes completed work and is deliberately preserved.
    }
    return modified as typeof row;
  });
  result.parameters = result.parameters.map(p => p.parameter_id !== 'roof_torch_conditions' ? p : {
    ...p, constraints_json: { ...p.constraints_json, values: [...p.constraints_json.values, ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1] },
  });
  const addedParameters = [...owner.parameters, baseFact];
  let ordinal = Math.max(...result.parameters.map(p => p.ordinal)) + 1;
  result.parameters.push(...addedParameters.map(p => ({ ...p, ordinal: ordinal++ })) as typeof result.parameters);
  result.formulas.push(...owner.formulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })) as typeof result.formulas);
  let rowOrdinal = Math.max(...result.resources.map(r => r.ordinal)) + 1;
  const added = owner.resources.map(row => ({ ...row, ordinal: rowOrdinal++ })) as PurchaseGroupRepresentative['resources'];
  const scopeTemplate = parent.resources.find(r => r.row_id === 'roof:torch-two:krer12-002-09:source-gap:roof_assembly')!;
  if (!scopeTemplate) throw new Error('ROOF_SCREED25_SCOPE_TEMPLATE_REQUIRED');
  const createScope = (rowId: string, title: string, operation: Json, scope: Json) => ({ ...structuredClone(scopeTemplate),
    id: `resource-${rowId.replaceAll(':', '-')}`, row_id: rowId, title_ru: title, ordinal: rowOrdinal++,
    semantic_owner: `${catalogId}:${rowId}`, cost_owner_id: `${catalogId}:${rowId}`,
    resource_graph: { ...scopeTemplate.resource_graph, operationCompositionV1: operation, scopeRequirementV1: scope },
    source_metadata: { ...scopeTemplate.source_metadata, scopeClassificationContract: pack.contract, numericNormClosed: false } });
  const paid25 = added.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id);
  const operation25 = added[0]!.resource_graph.operationCompositionV1 as Json;
  const projectChain = result.resources.find(row => row.row_id === ROOF_LOWER_CHAIN_SCOPE_ROW_V1)!;
  (projectChain.resource_graph as Json).scopeRequirementV1.projectOperationContextsV1.push({
    when: {kind:'equals',parameterId:'roof_torch_conditions',value:ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1},
    resourceRowIds: paid25, applicabilityWhen: roofScreed25ConditionsV1(),
    requiredFactParameterIds:[pack.conditionsParameterId,pack.areaParameterId],
    unknownFactValues:{[pack.conditionsParameterId]:[ROOF_SCREED25_TECHNOLOGY_UNKNOWN_V1],[pack.areaParameterId]:[ROOF_SCREED25_DIRECT_BASE_UNKNOWN_V1]} });
  const scope25 = createScope(`${pack.prefix}:project-scope`, 'Стяжка25мм: применимость и готовность расчёта', operation25, {
    contractVersion: 'canonical-scope-requirement/v1', kind: 'INCLUDED', groupId: pack.prefix, groupTitleRu: pack.groupTitleRu,
    titleRu: pack.groupTitleRu, reasonRu: pack.systemRu + ' Укажите только основание, проектный способ подачи и площадь участка; все нормативные добавки приложение получает само.',
    contextWhen: { kind: 'equals', parameterId: 'roof_torch_conditions', value: ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1 },
    exactScopeWhen: roofScreed25ConditionsV1(), objectFactParameterId: pack.conditionsParameterId,
    unknownObjectValues: [ROOF_SCREED25_TECHNOLOGY_UNKNOWN_V1], requiredFactParameterIds: [pack.measurementParameterId, pack.areaParameterId],
    operationExclusionSatisfiesScopeV1: true, coveringRowIds: paid25, originalRowIds: [],
    sourceEvidence: pack.sources.map(s => ({ sha256: s.sha256, locator: s.locators })) });
  const base15 = createScope(`${screed15.prefix}:direct-base-check`, 'Непосредственное основание стяжки15мм', original15.resource_graph.operationCompositionV1 as Json, {
    contractVersion: 'canonical-scope-requirement/v1', kind: 'OBJECT_SCOPE', groupId: `${screed15.prefix}:direct-base`,
    groupTitleRu: 'Основание участка стяжки15мм', titleRu: 'Проверка непосредственного основания',
    reasonRu: '15мм не допускаются общей отметкой о согласованном пироге непосредственно по засыпке. Для отдельного подходящего плитного или монолитного участка прежние нормы сохраняются. Разные площади и исключение стоимости утепления не устанавливают расположение слоёв.',
    objectFactMode: 'PROJECT_APPLICABILITY_ONLY', objectFactParameterId: ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1,
    unknownObjectValues: [ROOF_SCREED15_UNKNOWN_BASE_V1], exactScopeWhen: { kind: 'equals',
      parameterId: ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1, value: ROOF_SCREED15_SUPPORTED_BASE_V1 },
    projectOperationContextsV1: [{ when: original15.inclusion_ast, resourceRowIds: [...oldIds] }],
    coveringRowIds: [], originalRowIds: [], sourceEvidence: [ROOF_SCREED_DIRECT_BASE_SOURCE_V1] });
  added.push(scope25 as typeof added[number], base15 as typeof added[number]);
  result.resources.push(...added as typeof result.resources);
  for (const row of added) result.bindings.push({ row_id: row.row_id, locator_id: locatorId,
    applicability: { contract: pack.contract, normId: pack.normId, numericQuantityAdmitted: row.resource_graph.costTreatment === 'OWN_COST',
      completeTechnicalEstimateAccepted: false } });
  const consumers = buildMasterParameterCalculationConsumers(result);
  for (const p of result.parameters) {
    const id = p.parameter_id;
    p.truth_metadata = { ...p.truth_metadata, contract:pack.contract, semantic_parameter_key:`${catalogId}:${id}`,
      formula_consumers: consumers.formulaConsumers[id], resource_branch_consumers: consumers.resourceConsumers[id] };
    result.baseline.formula_consumer_ids[id] = consumers.formulaConsumers[id];
    result.baseline.resource_consumer_row_ids[id] = consumers.resourceConsumers[id];
    result.baseline.uom_by_parameter[id] = p.unit_id;
    if (addedParameters.some(next => next.parameter_id === id)) {
      result.baseline.normative_source_ids[id] = [pack.contract + (id === ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1 ? ':design' : ':roof')];
      result.baseline.guide_provenance_ru[id] = p.truth_metadata?.guide?.guide_short_ru ?? p.title_ru;
    }
  }
  result.baseline.parameter_schema_sha256 = hash(result.parameters.map(p => ({ parameterId: p.parameter_id,
    unitId: p.unit_id, valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  for (const row of result.resources) { const { row_sha256: _old, ...body } = row; row.row_sha256 = hash(body); }
  const unresolvedIds = new Set(result.parameters.filter(p => p.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM').map(p => p.parameter_id));
  const unresolvedResourceRowIds = result.resources.filter(row => result.formulas.some(formula => formula.formula_id === row.formula_id
    && formula.input_parameter_ids.some((id: string) => unresolvedIds.has(id)))).map(row => row.row_id);
  result.passport.decision = { ...result.passport.decision, unresolvedResourceRowIds, quantityScope: 'PARTIAL', roofScreed25CompanionContract: pack.contract,
    completeTechnicalEstimateAccepted: false, wholeRoofGroupComplete: false };
  result.passport.capability_matrix = result.passport.capability_matrix.map((item: Json) => item.capability === 'FULL_APPLICABLE_SCOPE' ? { ...item, unresolvedResourceRowIds } : item);
  result.passport.included_scope_ru = [...result.passport.included_scope_ru, pack.scopeRu];
  result.definition.passport = { ...result.definition.passport, roofScreed25CompanionContract: pack.contract, rowCount: result.resources.length, fullTechnicalEstimateAccepted: false };
  return { representative: result, addedRowIds: added.map(r => r.row_id),
    addedParameterIds: addedParameters.map(p => p.parameter_id), candidatePublished: false };
}

/** The same finite source transformation for publication and migration admission.
 * Storage identities and passport bookkeeping are not price/quantity semantics. */
export function roofScreed25SuccessorModelV1(from: {resources: readonly Json[]; formulas: readonly Json[]; parameters: readonly Json[]}, catalogId: string) {
  const parentId = parents[catalogId as keyof typeof parents];
  const result = buildRoofScreed25SuccessorV1({definition: {id: parentId, catalog_id: catalogId, definition_version: 11, passport: {}},
    resources: [...from.resources], formulas: [...from.formulas], parameters: [...from.parameters], bindings: [],
    baseline: {formula_consumer_ids: {}, resource_consumer_row_ids: {}, uom_by_parameter: {}, normative_source_ids: {}, guide_provenance_ru: {}},
    passport: {decision: {}, capability_matrix: [], included_scope_ru: []}}, 'migration-semantic-check').representative;
  return {resources: result.resources, formulas: result.formulas, parameters: result.parameters};
}
