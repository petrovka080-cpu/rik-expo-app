import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {knaufInteriorPlasterConditionalCompositionPackS2763 as pack,knaufPlasterRetainedScopeNeedGuardS2763,knaufPlasterScopeParameterS2763} from '../../../src/lib/estimate/v4/knaufInteriorPlasterConditionalCompositionS2763';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export const S2763_KNAUF_INTERIOR_PLASTER_SCOPE_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,t.preservedOwners.map(x=>x.rowId)]));

export function overlayS2763KnaufInteriorPlasterConditionalComposition(parent:PurchaseGroupRepresentative,locators:Record<string,string>) {
  const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
  if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion||parent.resources.length!==target.parentResourceCount)throw Error('KNAUF_SCOPE_EXACT_PARENT_DRIFT');
  for(const old of target.preservedOwners){const row=parent.resources.find(x=>x.row_id===old.rowId);if(!row||row.id!==old.resourceSpecId||row.cost_owner_id!==old.costOwnerId||row.unit_id!==old.unitId||row.formula_id!==old.formulaId)throw Error('KNAUF_SCOPE_PARENT_OWNER_DRIFT:'+old.rowId);}
  const result=structuredClone(parent),addedParameterIds:string[]=[],ownerDisposition:Record<string,unknown>[]=[];
  let ordinal=Math.max(...result.parameters.map(p=>Number(p.ordinal)))+1;
  for(const fact of pack.facts){
    if(result.parameters.some(p=>p.parameter_id===fact.parameterId)||!locators[fact.key])throw Error('KNAUF_SCOPE_FACT_OR_LOCATOR_COLLISION');
    result.parameters.push(knaufPlasterScopeParameterS2763(fact,catalogId,ordinal++));addedParameterIds.push(fact.parameterId);
    const row=result.resources.find(r=>r.row_id===fact.rowId)!;
    if(!row||row.source_metadata.sourceNormQuantityAccepted!==false)throw Error('KNAUF_SCOPE_UNRESOLVED_PARENT_NEED_REQUIRED');
    const guard=knaufPlasterRetainedScopeNeedGuardS2763(fact);
    row.inclusion_ast=guard;
    row.source_metadata={...row.source_metadata,conditionalScopeDisposition:{contract:pack.contract,parameterId:fact.parameterId,
      notApplicableOnly:fact.notApplicableValueRu,unknownKeepsNeed:true,numericNormAccepted:false,
      sourceId:pack.source.id,sourceSnapshotHash:pack.source.sha256,sourceLocator:'PDF'+fact.pdfPages.join(',')+'; '+fact.sourceLocatorRu,
      boundaryRu:fact.guideRu,baseLabourHoursReduced:false}};
    const internal=result.parameters.find(p=>p.parameter_id==='knauf_open_'+fact.rowId.split(':').at(-1)!.replace('open-','').replaceAll('-','_'))!;
    if(!internal||internal.truth_metadata.value_source_role!=='UNRESOLVED_APPLICATION_NORM'||internal.truth_metadata.visibility_role!=='INTERNAL_ONLY')throw Error('KNAUF_SCOPE_PROTECTED_NORM_REQUIRED');
    internal.constraints_json={...internal.constraints_json,requiredWhen:guard};
    const {row_sha256:_sha,...body}=row;row.row_sha256=hash(body);
    result.bindings.push({row_id:row.row_id,locator_id:locators[fact.key],applicability:{contract:pack.contract,scopeDispositionOnly:true,
      nonApplicabilityFact:fact.parameterId,notApplicableOnly:fact.notApplicableValueRu,numericNormAccepted:false,completeTechnicalEstimateAccepted:false}});
    ownerDisposition.push({rowId:row.row_id,costOwnerId:row.cost_owner_id,quantityFormulaId:row.formula_id,nonApplicabilityParameterId:fact.parameterId,
      notApplicableOnly:fact.notApplicableValueRu,missingAndPositiveNeedPreserved:true,numericNormClosed:false});
  }
  const consumers=buildMasterParameterCalculationConsumers(result);
  for(const p of result.parameters){const id=p.parameter_id;
    p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
    result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
    result.baseline.uom_by_parameter[id]=p.unit_id;result.baseline.normative_source_ids[id]??=[];
    result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
  }
  for(const fact of pack.facts)result.baseline.normative_source_ids[fact.parameterId]=[pack.contract+':'+fact.key];
  result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
  result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',priceState:'PARTIAL_NEEDS_PRICE',completeTechnicalEstimateAccepted:false,
    activationAllowed:false,productionEligible:false,conditionalScopeDisposition:ownerDisposition,newNumericNormClosures:0,maximumConditionalNotApplicableRows:4,wholePlasterGroupComplete:false};
  result.definition.passport={...result.definition.passport,conditionalCompositionContract:pack.contract,conditionalScopeFacts:pack.facts.map(f=>({parameterId:f.parameterId,rowId:f.rowId,notApplicableOnly:f.notApplicableValueRu})),fullTechnicalEstimateAccepted:false};
  return {representative:result,ownerDisposition,legacyRowIds:[],addedRowIds:[],addedParameterIds,newPhysicalNormClosureCount:0,newWorkerNormClosureCount:0,newMachineNormClosureCount:0};
}
