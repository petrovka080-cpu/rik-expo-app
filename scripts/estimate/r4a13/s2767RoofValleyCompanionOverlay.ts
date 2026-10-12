import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {sourcePinnedRoofNormOwnerR1} from '../../../src/lib/estimate/v4/sourcePinnedRoofNormOwnerR1';
import {ROOF_VALLEY_PACK_V1 as pack,ROOF_VALLEY_SEMANTIC_ROW_V1,roofValleyConditionsV1,roofValleyScopeV1} from '../../../src/lib/estimate/backendPlatform/canonicalRoofValleyCompanionV1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export function overlayS2767RoofValleyCompanion(parent:PurchaseGroupRepresentative,locatorId:string){
 const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==6||parent.resources.length!==131||parent.parameters.length!==64)throw Error('ROOF_VALLEY_EXACT_PARENT_DRIFT');
 for(const old of target.preservedOwners){const row=parent.resources.find(r=>r.row_id===old.rowId);if(!row||row.id!==old.resourceSpecId||row.cost_owner_id!==old.costOwnerId||row.unit_id!==old.unitId||row.formula_id!==old.formulaId)throw Error('ROOF_VALLEY_PARENT_OWNER_DRIFT');}
 const result=structuredClone(parent),owner=sourcePinnedRoofNormOwnerR1(pack),conditions=roofValleyConditionsV1();
 const obligation=result.resources.find(r=>r.row_id===ROOF_VALLEY_SEMANTIC_ROW_V1);if(!obligation)throw Error('ROOF_VALLEY_OBLIGATION_MISSING');
 const addedParameterIds=[pack.systemParameterId,pack.measurementParameterId];
 let parameterOrdinal=Math.max(...result.parameters.map(p=>Number(p.ordinal)))+1;
 for(const id of addedParameterIds){
  if(result.parameters.some(p=>p.parameter_id===id))throw Error('ROOF_VALLEY_PARAMETER_COLLISION');
  const p=owner.parameters.find(p=>p.parameter_id===id)!;
  result.parameters.push({...p,ordinal:parameterOrdinal++,constraints_json:{...p.constraints_json,
   ...(id===pack.measurementParameterId?{exclusiveMin:0,requiredWhen:conditions.admitted}: {})}});
 }
 let ordinal=obligation.ordinal;
 for(const row of result.resources)if(row.ordinal>=ordinal)row.ordinal+=7;
 const addedRows=owner.resources.map(row=>({...row,ordinal:ordinal++,row_type:row.category,
  semantic_owner:catalogId+':'+row.row_id,cost_owner_id:catalogId+':'+row.cost_owner_id,inclusion_ast:conditions.admitted,
  source_metadata:{...row.source_metadata,printedReferenceOnly:pack.printedReferenceOnly}}));
 if(addedRows.length!==7||addedRows.some(row=>parent.resources.some(old=>old.row_id===row.row_id)))throw Error('ROOF_VALLEY_RESOURCE_COLLISION');
 result.formulas.push(...owner.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
 result.resources.push(...addedRows);result.resources.sort((a,b)=>a.ordinal-b.ordinal);
 for(const row of addedRows)result.bindings.push({row_id:row.row_id,locator_id:locatorId,applicability:{contract:pack.contract,normId:pack.normId,numericQuantityAdmitted:true,completeTechnicalEstimateAccepted:false}});
 obligation.resource_graph={...obligation.resource_graph,scopeRequirementV1:roofValleyScopeV1(obligation.resource_graph.scopeRequirementV1,addedRows.map(r=>r.row_id))};
 for(const row of result.resources){const {row_sha256:_old,...body}=row;row.row_sha256=hash(body);}
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
  if(addedParameterIds.includes(id)){result.baseline.normative_source_ids[id]=[pack.contract+':roof'];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;}}
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 result.passport.decision={...result.passport.decision,roofValleyCompanionContract:pack.contract,quantityScope:'PARTIAL',newNumericNormClosures:7,completeTechnicalEstimateAccepted:false,wholeRoofGroupComplete:false};
 result.passport.included_scope_ru=[...result.passport.included_scope_ru,pack.scopeRu];
 result.definition.passport={...result.definition.passport,roofValleyCompanionContract:pack.contract,rowCount:result.resources.length,fullTechnicalEstimateAccepted:false};
 return {representative:result,addedRowIds:addedRows.map(r=>r.row_id),addedParameterIds,changedScopeRowIds:[obligation.row_id],changedFormulaIds:[],candidatePublished:false};
}
