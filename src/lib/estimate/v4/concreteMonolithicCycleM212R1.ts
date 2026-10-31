/** Source-only whole-cycle composition. Existing compiler and accepted component
 * factories own all arithmetic. No publisher, I/O, project defaults or new norm. */
import {compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition as Parameter,
 type CanonicalEstimateFormulaDefinition as Formula, type CanonicalEstimateResourceDefinition as Resource} from '../backendPlatform/canonicalEstimateCompileCore';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
 type AutomaticParameterSpec, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS as stripP, STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS as placementF,
 STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES as stripR} from './stripFoundationConcretePlacementR1';
import {SLAB_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS as slabP, SLAB_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES as slabR} from './slabFoundationConcretePlacementR1';
import {CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS as floorP, CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES as floorR} from './concreteSlabConcretePlacementR1';
import {SLAB_FOUNDATION_REINFORCEMENT_PARAMETERS as rebarP, SLAB_FOUNDATION_REINFORCEMENT_RESOURCES as rebarR} from './slabFoundationReinforcementR1';
import {STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS as stripRebarP, STRIP_FOUNDATION_REINFORCEMENT_RESOURCES as stripRebarR,
 STRIP_FOUNDATION_REINFORCEMENT_FORMULAS as rebarF} from './stripFoundationReinforcementR1';
import {CONCRETE_SLAB_REINFORCEMENT_PARAMETERS as floorRebarP, CONCRETE_SLAB_REINFORCEMENT_RESOURCES as floorRebarR} from './concreteSlabReinforcementR1';
import {formworkFramiXlifeParametersForCatalogR1, formworkFramiXlifeResourcesForCatalogR1, FORMWORK_FRAMI_XLIFE_FORMULAS as framiF} from './formworkFramiXlifeProjectKitR1';
import {FORMWORK_DOKAFLEX_PARAMETERS as dokaflexP, FORMWORK_DOKAFLEX_FORMULAS as dokaflexF, FORMWORK_DOKAFLEX_RESOURCES as dokaflexR} from './formworkDokaflexConcreteSlabR1';
import {CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS as embedP, CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS as embedF, CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES as embedR} from './concreteSlabEmbeddedItemsR1';
import config from '../../../../data/estimate-benchmarks/source-packs/concrete-monolithic-cycle-master212-r1.json';

type Json = Record<string, unknown>;
export type ConcreteCycleKindM212R1 = 'strip_foundation' | 'slab_foundation' | 'suspended_slab';
export type ConcreteCycleContextM212R1 = 'standard' | 'high_load' | 'technical_room' | 'wet_zone';
type StageKey = 'placement' | 'reinforcement' | 'formwork' | 'embedded';
export type ConcreteCyclePartM212R1 = Readonly<{parameters: readonly Parameter[]; formulas: readonly Formula[]; resources: readonly Resource[]}>;
export type ConcreteCycleTargetM212R1 = Readonly<{kind: ConcreteCycleKindM212R1; context: ConcreteCycleContextM212R1;
 catalogId: string; titleRu: string; formworkCatalogId: string}>;
export const CONCRETE_CYCLE_M212_R1_CONTRACT = 'gox-build.master212.concrete-monolithic-cycle/r1' as const;
export const CONCRETE_CYCLE_M212_R1_PRIMARY = 'm212_concrete_net_volume_m3';
export const CONCRETE_CYCLE_M212_R1_TARGETS = config.targets as readonly ConcreteCycleTargetM212R1[];
const prefix = 'master212:concrete-cycle:r1';
const positive = {kind: 'greater_than', parameterId: CONCRETE_CYCLE_M212_R1_PRIMARY, value: 0} as const;
const copy = <T>(value: T): T => structuredClone(value);

function targetFor(catalogId: string): ConcreteCycleTargetM212R1 {
 const target = CONCRETE_CYCLE_M212_R1_TARGETS.find(t => t.catalogId === catalogId);
 if (!target) throw Error('M212_CONCRETE_CYCLE_EXACT_EXISTING_TARGET_REQUIRED');
 return target;
}

/** Includes all component resources, never just the material or selected tools.
 * Reinforcement and formwork keep their independent approved takeoff; no kg/m3,
 * panel-per-m3 or load-bearing calculation is introduced. */
export function concreteCycleComponentsM212R1(target: ConcreteCycleTargetM212R1): Readonly<Record<StageKey, ConcreteCyclePartM212R1>> {
 const placement = target.kind === 'strip_foundation' ? {parameters: stripP, formulas: placementF, resources: stripR}
  : target.kind === 'slab_foundation' ? {parameters: slabP, formulas: placementF, resources: slabR}
  : {parameters: floorP, formulas: placementF, resources: floorR};
 const formwork = target.kind === 'suspended_slab' ? {parameters: dokaflexP, formulas: dokaflexF, resources: dokaflexR}
  : {parameters: formworkFramiXlifeParametersForCatalogR1(target.formworkCatalogId), formulas: framiF,
   resources: formworkFramiXlifeResourcesForCatalogR1(target.formworkCatalogId)};
 const reinforcement = target.kind === 'strip_foundation' ? {parameters: stripRebarP, formulas: rebarF, resources: stripRebarR}
  : target.kind === 'slab_foundation' ? {parameters: rebarP, formulas: rebarF, resources: rebarR}
  : {parameters: floorRebarP, formulas: rebarF, resources: floorRebarR};
 return {placement, reinforcement, formwork,
  embedded: {parameters: embedP, formulas: embedF, resources: embedR}};
}

/** Independent mandatory roster is authored in the source passport from the
 * accepted operation/component sources. A removed working part must fail. */
export function assertConcreteCyclePartRosterM212R1(stage: StageKey, part: ConcreteCyclePartM212R1, target: ConcreteCycleTargetM212R1): void {
 const rosterKey = stage === 'formwork' ? (target.kind === 'suspended_slab' ? 'dokaflex' : 'frami') : stage;
 const roster = config.requiredComponentRows[rosterKey];
 const ids = new Set(part.resources.map(r => r.row_id));
 for (const rowId of roster) if (!ids.has(rowId)) throw Error('M212_CONCRETE_REQUIRED_COMPONENT_MISSING:' + stage + ':' + rowId);
 for (const r of part.resources) {
  if (!r.unit_id || !r.category || !part.formulas.some(f => f.formula_id === r.formula_id)) throw Error('M212_CONCRETE_COMPONENT_UNIT_CATEGORY_OR_FORMULA_MISSING:' + r.row_id);
  const independent = config.criticalResourceContracts[r.row_id as keyof typeof config.criticalResourceContracts];
  if (independent && (r.unit_id !== independent.unitId || r.category !== independent.category)) throw Error('M212_CONCRETE_COMPONENT_UNIT_OR_CATEGORY_MISMATCH:' + r.row_id);
  const metadata=r.source_metadata, trace=metadata?.normativeTrace;
  // Accepted formwork project/supplier rows intentionally have no normative
  // quantity trace. Preserve that boundary instead of fabricating a norm ID.
  const directProject=metadata?.sourceRole==='APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE'
   && metadata.truth_contract_version==='R3' && metadata.synthetic===false;
  if (!metadata || !Array.isArray(trace) || (trace.length===0&&!directProject)) throw Error('M212_CONCRETE_COMPONENT_SOURCE_MISSING:' + r.row_id);
 }
}

export function concreteCycleParameterIdM212R1(stage: StageKey, parameterId: string): string {
 if (stage === 'placement' && parameterId === 'plan_dimension_concrete_volume_m3') return CONCRETE_CYCLE_M212_R1_PRIMARY;
 return 'm212_' + stage + '_' + parameterId;
}

function namespacePart(stage: StageKey, part: ConcreteCyclePartM212R1): ConcreteCyclePartM212R1 {
 const ids: Record<string, string> = {};
 for (const p of part.parameters) ids[p.parameter_id] = concreteCycleParameterIdM212R1(stage, p.parameter_id);
 for (const f of part.formulas) ids[f.formula_id] = prefix + ':' + stage + ':formula:' + f.formula_id;
 for (const r of part.resources) {ids[r.row_id] = prefix + ':' + stage + ':' + r.row_id; ids[r.id] = prefix + ':' + stage + ':' + r.id;}
 const expressions = (text: string) => text.replace(/[A-Za-z_][A-Za-z_0-9]*/gu, token => ids[token] ?? token);
 const rename = (v: unknown): unknown => typeof v === 'string' ? (ids[v] ?? v) : Array.isArray(v) ? v.map(rename)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k,x]) => [k,
   typeof x==='string'&&/(?:expression|expression_source)$/iu.test(k)?expressions(x):rename(x)])) : v;
 const formulas = part.formulas.map(f => {
  const renamed = rename(f) as Formula;
  if (f.expression_source) {
   const expression = expressions(f.expression_source), compiled = compileFormulaGraph(expression);
   return {...renamed, expression_source: expression, ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds, ast_sha256: estimateDeterministicHash(compiled.ast)};
  }
  return {...renamed, ast_sha256: estimateDeterministicHash(renamed.ast)};
 });
 const parameters = part.parameters.map(p => {
  const changed = rename(copy(p)) as Parameter;
  const constraints = {...(changed.constraints_json ?? {})};
  delete constraints.requiredWhen;
  // No acceptance input or visible budget profile becomes a catalog default.
  return {...changed, required: changed.parameter_id === CONCRETE_CYCLE_M212_R1_PRIMARY, default_value: null,
   constraints_json: changed.parameter_id === CONCRETE_CYCLE_M212_R1_PRIMARY ? {min: 0} : constraints,
   truth_metadata: {...changed.truth_metadata, source_confirmation_required: false,
    value_source_role: changed.parameter_id === CONCRETE_CYCLE_M212_R1_PRIMARY ? 'USER_INPUT' : 'PROJECT_SPECIFIC_INPUT',
    visibility_role: changed.parameter_id === CONCRETE_CYCLE_M212_R1_PRIMARY ? 'USER_INPUT' : 'INTERNAL_ONLY',
    preliminary_compilation_allowed: true, provenance: {consumer_input_role_v1: changed.parameter_id === CONCRETE_CYCLE_M212_R1_PRIMARY ? 'OBJECT_FACT' : 'APPLICATION_TECHNICAL'},
    concreteCycleInputBoundaryM212R1: 'APPROVED_PROJECT_OR_APPLICATION_NORM_IMPORT_NO_CONSUMER_NORM_QUESTIONNAIRE'}};
 });
 const resources = part.resources.map(r => {
  const changed = rename(copy(r)) as Resource;
  const formula = formulas.find(f => f.formula_id === changed.formula_id)!;
  const binding=changed.resource_graph.professionalPhysicalNormBindingV1 as Json|undefined;
  if(binding){const prior=(binding.parameter_projection_v1??{}) as Json;
   binding.parameter_projection_v1={...prior,aliases:{...((prior.aliases??{}) as Json),
    ...Object.fromEntries(part.parameters.map(p=>[p.parameter_id,ids[p.parameter_id]]))},
    units:{...((prior.units??{}) as Json),...Object.fromEntries(part.parameters.map(p=>[p.parameter_id,p.unit_id??null]))}};
  }
  const {row_sha256: _old, ...body} = changed;
  const operationId = prefix + ':operation:' + stage;
  const next = {...body, inclusion_ast: {kind: 'and', operands: [positive, changed.inclusion_ast ?? {kind: 'literal', value: true}]},
   resource_graph: {...changed.resource_graph, inputParameterIds: [...new Set([...(changed.resource_graph.inputParameterIds as string[] ?? []), ...formula.input_parameter_ids,
    'm212_project_structural_package_ref','m212_project_normative_basis'])],
    concreteCycleReuseM212R1: {stage, sourceRowId: r.row_id, sourceFormulaId: r.formula_id, includedWholeComponent: true},
    operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: prefix, groupTitleRu: 'Монолитная конструкция: полный заявленный цикл',
     operationId, operationTitleRu: config.stageTitles[stage], processOrdinal: stage === 'formwork' ? 30 : stage === 'reinforcement' ? 40 : stage === 'embedded' ? 45 : 50,
     completionCriterionRu: 'Выполнен полный принятый состав подработы; отдельные непокрытые части цикла сохраняются.',
     additionalOperations: ((config.componentOperationUses as unknown as Record<string,Record<string,string[]>>)[stage]?.[r.row_id]??[]).map(key=>({
      operationId:prefix+':operation:'+key,operationTitleRu:config.operationCategoryMatrix.find(x=>x.operationId===prefix+':operation:'+key)?.operationTitleRu??'Устройство проектных рабочих швов',
      completionCriterionRu:'Общий количественный ресурс принятой подработы используется здесь с тем же владельцем; разделение исходной нормы и повторная оплата не создаются.',processRole:'PROCESS'})).filter(x=>x.operationId!==operationId)}},
   source_metadata: {...changed.source_metadata, full_technical_acceptance: false, automaticGenericPriceInheritanceAllowed: false,
    concreteCycleWholeComponentReuseM212R1: {stage, sourceRowId: r.row_id, sourceDefinitionRowSha256: r.row_sha256, newPhysicalNorm: false}}};
  return {...next, row_sha256: estimateDeterministicHash(next)};
 });
 return {parameters, formulas, resources};
}

/** Typed mandatory residual includes the entire promised cycle independently
 * from emitted rows. Project decisions and missing internal norms stay distinct. */
export function concreteCycleResidualM212R1() {return copy(config.residual);}

export function buildConcreteMonolithicCycleM212R1(catalogId: string,
 injected?: Readonly<Record<StageKey, ConcreteCyclePartM212R1>>): ConcreteCyclePartM212R1 & Readonly<{
 target: ConcreteCycleTargetM212R1; fullTechnicalAcceptance: false; newPhysicalNorms: 0; residualNeedIds: readonly string[]}> {
 const target = targetFor(catalogId), components = injected ?? concreteCycleComponentsM212R1(target);
 for (const stage of ['placement','reinforcement','formwork','embedded'] as const) assertConcreteCyclePartRosterM212R1(stage, components[stage], target);
 const parts = (['placement','reinforcement','formwork','embedded'] as const).map(stage => namespacePart(stage, components[stage]));
 const parameters = parts.flatMap(p => [...p.parameters]), formulas = parts.flatMap(p => [...p.formulas]), resources = parts.flatMap(p => [...p.resources]);
 const ownCount = new Map<string, number>();
 for (const r of resources) if (r.resource_graph.costTreatment !== 'INCLUDED_IN_RESOURCE_ROWS' && r.cost_owner_id) ownCount.set(r.row_id, (ownCount.get(r.row_id) ?? 0) + 1);
 if ([...ownCount.values()].some(n => n !== 1)) throw Error('M212_CONCRETE_DUPLICATE_PAID_OWNER');
 const needParameters: AutomaticParameterSpec[] = config.residual.map(n => ({id: n.parameterId, title: n.titleRu,
  valueType: 'decimal', unitId: n.unitId, kind: 'internal', min: 0}));
 const needs: AutomaticRowSpec[] = config.residual.map(n => ({rowId: n.needId, formulaId: n.needId + ':formula', section: n.stageTitleRu,
  title: n.titleRu, category: n.category, unitId: n.unitId, expression: n.parameterId, procurement: false,
  costTreatment: 'INFORMATIONAL_SCOPE', inclusion: positive}));
 const supplement = buildAutomaticConstructionOwnerR1({contract: CONCRETE_CYCLE_M212_R1_CONTRACT, semanticOwner: prefix,
  sourceId: config.sourceId, normId: 'FULL_CYCLE_EXPECTED_SCOPE_NO_INVENTED_CONSUMPTION_NORM',
  sourceMetadata: {source_title: 'MASTER2.12: полный заявленный состав монолитной конструкции', source_document_version: '2026-10-22',
   definition_hash: config.masterSha256, artifact_sha256: config.masterSha256, exact_locator: '2Б.3–6,18–23;17.4'},
  applicabilityRu: config.scopeRu, ordinary: [
   {id:CONCRETE_CYCLE_M212_R1_PRIMARY,title:'Чистый геометрический объём конструкции',valueType:'decimal',unitId:'m3',kind:'ordinary',min:0},
   {id:'m212_project_structural_package_ref',title:'Подтверждённый проектный пакет конструкции',valueType:'text',unitId:null,kind:'ordinary'},
   {id:'m212_project_normative_basis',title:'Применимая нормативная база проекта и редакция',valueType:'text',unitId:null,kind:'ordinary'},
  ], profile: [], conditional: needParameters, rows: needs,
  deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: config.exclusionsRu});
 parameters.push(...supplement.parameters.filter(p=>p.parameter_id!==CONCRETE_CYCLE_M212_R1_PRIMARY).map(p => {
  const residual = config.residual.find(n => n.parameterId === p.parameter_id);
  return {...p, default_value: null, required: false, truth_metadata: residual
   ? unresolvedApplicationNormTruthR1(p.truth_metadata, residual.reasonRu)
   : {...p.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_SPECIFIC_INPUT',preliminary_compilation_allowed:true,
    provenance:{consumer_input_role_v1:'OBJECT_FACT'}}};
 }));
 formulas.push(...supplement.formulas);
 resources.push(...supplement.resources.map(r => {
  const n = config.residual.find(n => n.needId === r.row_id)!;
  const {row_sha256: _old, ...body} = r;
  const changed = {...body, resource_graph: {...r.resource_graph,
   operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: prefix, groupTitleRu: 'Монолитная конструкция: полный заявленный цикл',
    operationId: n.operationId, operationTitleRu: n.stageTitleRu, processOrdinal: n.ordinal, completionCriterionRu: n.reasonRu}},
   source_metadata: {...r.source_metadata, sourceRole: 'UNRESOLVED_APPLICATION_NORM', normativeTrace: [], normative_source_ids: [],
    missingAuthority: n.missingAuthority, missingProjectFact: n.projectFact, full_technical_acceptance: false}};
  return {...changed, row_sha256: estimateDeterministicHash(changed)};
 }));
 for (const [values, code] of [[parameters.map(p => p.parameter_id),'PARAMETER'],[formulas.map(f => f.formula_id),'FORMULA'],[resources.map(r => r.row_id),'ROW']] as const)
  if (new Set(values).size !== values.length) throw Error('M212_CONCRETE_DUPLICATE_' + code);
 return {target, parameters, formulas, resources, fullTechnicalAcceptance: false, newPhysicalNorms: 0,
  residualNeedIds: config.residual.map(n => n.needId)};
}

/** No default project BBS/PPR or payment scope is manufactured here. */
export async function compileConcreteMonolithicCycleM212R1(catalogId: string, input: Record<string, unknown>) {
 if(Object.keys(input).some(id=>/budget.*kg.*m3|kg_per_m3|reinforcementBudget/iu.test(id))) throw Error('M212_CONCRETE_BUDGET_REINFORCEMENT_NORM_FORBIDDEN');
 const model = buildConcreteMonolithicCycleM212R1(catalogId);
 return compileCanonicalEstimateCore({operation: 'compile', compilerVersion: CONCRETE_CYCLE_M212_R1_CONTRACT, catalogId,
  primaryMeasureParameterId: CONCRETE_CYCLE_M212_R1_PRIMARY, parameterDefinitions: [...model.parameters],
  formulaDefinitions: [...model.formulas], resourceDefinitions: [...model.resources], submittedParameters: input,
  confirmedParameters: {}, priceItems: [], currencyCode: 'KGS', maximumResourceRows: 512, hashJson: async value => estimateDeterministicHash(value)});
}
