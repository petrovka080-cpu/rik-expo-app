// Unbound WORK authoring only. No publisher, DB client or saved-project input.
import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {knaufProtektor105922DefinitionR1,knaufProtektor105922OriginalScopeR1,
  knaufProtektor105922PackR1 as pack} from '../../../src/lib/estimate/v4/knaufProtektor105922ForwardR1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';

type Json = Record<string,any>;
export type KnaufProtektorSevenParentGateR1 = typeof pack.currentParentGate;
const hash = (value:unknown) => createHash('sha256').update(stringifyCanonicalEstimateJson(value)).digest('hex');
function invariant(value:unknown,code:string):asserts value {
  if(!value) throw new Error('KNAUF_PROTEKTOR105922_FORWARD:'+code);
}
const strip = (value:Json,keys:readonly string[]) => Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));

/** Produces a concrete draft payload against one of the seven observed public
 * parents. It is intentionally named previewRepresentative: the current DB
 * registry/price compatibility/transaction gates are not satisfied here.
 * Parent version and resource UUIDs remain lineage, not new persisted IDs. */
export function prepareKnaufProtektor105922UnboundOverlayR1(
  parent:PurchaseGroupRepresentative,gate:KnaufProtektorSevenParentGateR1,
) {
  invariant(hash(gate) === hash(pack.currentParentGate),'EXACT_CAPTURED_SEVEN_PARENT_GATE_REQUIRED');
  const target = gate.targets.find(item=>item.catalogId === parent.definition.catalog_id);
  invariant(target && hash(parent) === target.parentInputSha256
    && parent.definition.id === target.definitionId
    && Number(parent.definition.definition_version) === target.version
    && parent.definition.definition_sha256 === target.definitionSha256
    && parent.baseline.id === target.baselineId && parent.passport.payload_sha256 === target.payloadSha256,
  'EXACT_CAPTURED_PARENT_PAYLOAD_REQUIRED');
  const original = parent.resources.find(row=>row.row_id === pack.ownerRowId);
  const originalFormula = parent.formulas.find(row=>row.formula_id === pack.ownerFormulaId);
  invariant(original && originalFormula && original.id === target.corner.resourceSpecId
    && original.row_sha256 === target.corner.rowSha256
    && hash(original) === target.corner.resourcePayloadSha256
    && hash(originalFormula) === target.corner.formulaPayloadSha256
    && original.unit_id === 'm' && original.cost_owner_id === pack.ownerRowId
    && original.procurement_eligible === false && original.resource_graph.costTreatment === 'OWN_COST'
    && originalFormula.expression_source === 'knauf_open_corner'
    && hash(original.inclusion_ast) === hash(knaufProtektor105922OriginalScopeR1),
  'ORIGINAL_CORNER_IDENTITY_SCOPE_AND_OWNER_REQUIRED');
  invariant(parent.resources.filter(row=>row.formula_id === pack.ownerFormulaId).length === 1,
    'CORNER_FORMULA_MUST_NOT_BE_SHARED');
  invariant(parent.parameters.length === target.shape.parameters
    && parent.resources.length === target.shape.resources && parent.formulas.length === target.shape.formulas
    && parent.bindings.length === target.shape.bindings,'CAPTURED_PARENT_SHAPE_REQUIRED');
  for(const rowId of [...pack.installationCoverage.baseOwnerRowIds,...pack.installationCoverage.retainedResidualRowIds]) {
    invariant(parent.resources.filter(row=>row.row_id === rowId).length === 1,'EXISTING_LABOUR_SCOPE_REQUIRED:'+rowId);
  }
  invariant(parent.resources.find(row=>row.row_id === pack.installationCoverage.baseOwnerRowIds[0])!
    .resource_graph.operationCompositionV1?.operationId === 'plaster:krer15-manual-base:base',
  'EXISTING_BASE_OPERATION_REQUIRED');
  const shared = knaufProtektor105922DefinitionR1();
  const borrowed = new Set<string>(pack.borrowedParameterIds);
  for(const id of borrowed) invariant(parent.parameters.filter(p=>p.parameter_id === id).length === 1,
    'BORROWED_PARAMETER_REQUIRED:'+id);
  const result = structuredClone(parent);
  const addedParameterIds:string[] = [];
  for(const p of shared.parameters) {
    if(borrowed.has(p.parameter_id)) continue;
    invariant(!result.parameters.some(old=>old.parameter_id === p.parameter_id),'PARAMETER_COLLISION:'+p.parameter_id);
    invariant(p.default_value == null,'NEW_DEFAULT_FORBIDDEN');
    result.parameters.push({...p,ordinal:result.parameters.length,truth_metadata:{...p.truth_metadata,
      semantic_parameter_key:target.catalogId+':'+p.parameter_id}});
    addedParameterIds.push(p.parameter_id);
  }
  for(const f of shared.formulas) {
    const current = result.formulas.find(old=>old.formula_id === f.formula_id);
    if(f.formula_id === pack.ownerFormulaId) {
      invariant(current,'EXISTING_OWNER_FORMULA_REQUIRED');
      Object.assign(current,f,{ast_sha256:hash(f.ast)});
    } else {
      invariant(!current,'FORMULA_COLLISION:'+f.formula_id);
      result.formulas.push({...f,ast_sha256:hash(f.ast)});
    }
  }
  const addedRowIds:string[] = [];
  for(const row of shared.resources) {
    const {row_sha256:_oldHash,...body} = row;
    const existing = result.resources.find(old=>old.row_id === row.row_id);
    invariant(row.row_id === pack.ownerRowId ? existing != null : existing == null,'ROW_COLLISION:'+row.row_id);
    // Exact captured original AST is retained as an independent conjunct.
    // No-corners remains false even with all new facts and a manual order.
    const value = {...(existing??{}),...body,
      id:existing?.id ?? body.id,ordinal:existing?.ordinal ?? result.resources.length,
      row_type:existing?.row_type ?? row.category,
      semantic_owner:existing?.semantic_owner ?? target.catalogId+':'+row.row_id,
      inclusion_ast:{kind:'and',operands:[structuredClone(original.inclusion_ast),row.inclusion_ast]},
      source_metadata:{...(existing?.source_metadata??{}),...row.source_metadata,
        capturedParentDefinitionId:target.definitionId,capturedParentInputSha256:target.parentInputSha256,
        priorCornerScopeBindingRetained:true,
        priceCompatibilityReviewRequired:row.row_id === pack.ownerRowId,
        automaticGenericPriceInheritanceAllowed:false}};
    if(existing) Object.assign(existing,value,{row_sha256:hash(value)});
    else {result.resources.push({...value,row_sha256:hash(value)});addedRowIds.push(row.row_id);}
  }
  // No new locator is invented, and all 29 existing bindings are retained.
  invariant(hash(result.bindings) === hash(parent.bindings),'OLD_BINDINGS_CHANGED');
  const consumers = buildMasterParameterCalculationConsumers(result);
  for(const p of result.parameters) {
    const id = p.parameter_id;
    p.truth_metadata = {...p.truth_metadata,formula_consumers:consumers.formulaConsumers[id],
      resource_branch_consumers:consumers.resourceConsumers[id]};
    result.baseline.formula_consumer_ids[id] = consumers.formulaConsumers[id];
    result.baseline.resource_consumer_row_ids[id] = consumers.resourceConsumers[id];
    result.baseline.uom_by_parameter[id] = p.unit_id;
    result.baseline.normative_source_ids[id] ??= [];
    result.baseline.guide_provenance_ru[id] ??= p.truth_metadata.guide?.guide_short_ru ?? p.title_ru;
  }
  result.baseline.parameter_schema_sha256 = hash(result.parameters.map(p=>({parameterId:p.parameter_id,
    unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
  result.passport.decision = {...result.passport.decision,status:'WORK_UNBOUND_NOT_PUBLISHABLE',allowed:false,
    quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',
    completeTechnicalEstimateAccepted:false,protektor105922UnboundDraft:{contract:pack.contract,
      snapshotSha256:gate.snapshotSha256,currentParentInputSha256:target.parentInputSha256,
      sourceRegistryLocatorId:null,priceCompatibilityGate:null,publicationReady:false,
      inheritedLabourScopeUnchanged:true,installationCoverage:pack.installationCoverage,
      savedRevisionMigration:false,newQuantityNorms:0,sourceNeedsClosed:0}};
  invariant(result.resources.filter(r=>r.row_id === pack.ownerRowId && r.resource_graph.costTreatment === 'OWN_COST').length === 1,
    'ONE_EXISTING_PAID_OWNER_REQUIRED');
  invariant(result.resources.filter(r=>r.row_id !== pack.ownerRowId && !addedRowIds.includes(r.row_id))
    .every(r=>hash(r) === hash(parent.resources.find(old=>old.row_id === r.row_id))),
  'UNRELATED_RESOURCE_CHANGED');
  for(const p of parent.parameters) {
    const next = result.parameters.find(x=>x.parameter_id === p.parameter_id)!;
    invariant(hash(strip(next,['truth_metadata'])) === hash(strip(p,['truth_metadata']))
      && hash(strip(next.truth_metadata,['formula_consumers','resource_branch_consumers']))
        === hash(strip(p.truth_metadata,['formula_consumers','resource_branch_consumers'])),
    'INHERITED_PARAMETER_OR_DEFAULT_CHANGED:'+p.parameter_id);
  }
  return {status:'WORK_UNBOUND_FORWARD_OVERLAY_NOT_PUBLISHABLE' as const,previewRepresentative:result,
    addedParameterIds,addedRowIds,replacedOwnerRowId:pack.ownerRowId,
    pendingOwnerBinding:{rowId:pack.ownerRowId,sourceId:null,locatorId:null,excerptSha256:null,
      currentParentDefinitionId:target.definitionId,contract:pack.contract},
    pendingPriceCompatibility:{ownerRowId:pack.ownerRowId,automaticInheritanceAllowed:false as const,
      reviewedCompatibility:null,required:pack.manualPolicy.requiresExplicitPriceCompatibility},
    originalDefinitionId:target.definitionId,originalParentInputSha256:target.parentInputSha256,
    newDefinitionId:null,newBaselineId:null,savedRevisionMigrationPerformed:false as const,
    publicationReady:false as const,sourceNeedsClosed:0 as const,newCompleteTechnicalTypes:0 as const};
}

export function prepareKnaufProtektor105922UnboundSevenR1(
  parents:readonly PurchaseGroupRepresentative[],gate:KnaufProtektorSevenParentGateR1,
) {
  invariant(parents.length === 7 && new Set(parents.map(p=>p.definition.catalog_id)).size === 7
    && hash(parents.map(p=>p.definition.catalog_id).sort()) === hash([...pack.targetCatalogIds].sort()),
  'EXACT_SEVEN_NO_SUBSTITUTED_GROUP_REQUIRED');
  const entries = pack.targetCatalogIds.map(id=>prepareKnaufProtektor105922UnboundOverlayR1(
    parents.find(p=>p.definition.catalog_id === id)!,gate));
  return {contract:pack.contract,entries,publicationReady:false as const,
    productionRegistryLocatorId:null,savedRevisionMigrationPerformed:false as const};
}
