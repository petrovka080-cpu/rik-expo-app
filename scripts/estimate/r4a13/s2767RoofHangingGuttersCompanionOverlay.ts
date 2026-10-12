import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {ROOF_HANGING_GUTTERS_PACK_V1 as pack,ROOF_WATER_SEMANTIC_ROWS_V1,roofGutterOwnerV1,roofGutterObligationV1,roofGutterExistingRowV1} from '../../../src/lib/estimate/backendPlatform/canonicalRoofHangingGuttersCompanionV1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export function overlayS2767RoofHangingGuttersCompanion(parent:PurchaseGroupRepresentative,locatorId:string){
 const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==10||parent.resources.length!==169||parent.parameters.length!==75)throw Error('ROOF_GUTTERS_EXACT_PARENT_DRIFT');
 for(const old of target.preservedOwners){const r=parent.resources.find(r=>r.row_id===old.rowId);if(!r||r.id!==old.resourceSpecId||r.cost_owner_id!==old.costOwnerId||r.unit_id!==old.unitId||r.formula_id!==old.formulaId)throw Error('ROOF_GUTTERS_PARENT_OWNER_DRIFT');}
 const result=structuredClone(parent),owner=roofGutterOwnerV1(catalogId),original=result.resources.find(r=>r.row_id===ROOF_WATER_SEMANTIC_ROWS_V1[0]);if(!original)throw Error('ROOF_GUTTERS_WATER_SCOPE_REQUIRED');
 const added=[...owner.resources,roofGutterObligationV1(original,catalogId)];if(added.length!==9)throw Error('ROOF_GUTTERS_DELTA_INVALID');
 let ordinal=original.ordinal;for(const r of result.resources)if(r.ordinal>=ordinal)r.ordinal+=9;
 const addedRows=added.map(r=>({...r,ordinal:ordinal++}));result.resources=result.resources.map(roofGutterExistingRowV1) as typeof result.resources;
 let pOrdinal=Math.max(...result.parameters.map(p=>p.ordinal))+1;result.parameters.push(...owner.parameters.map(p=>({...p,ordinal:pOrdinal++})));
 result.formulas.push(...owner.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));result.resources.push(...addedRows);result.resources.sort((a,b)=>a.ordinal-b.ordinal);
 for(const r of addedRows)result.bindings.push({row_id:r.row_id,locator_id:locatorId,applicability:{contract:pack.contract,normId:pack.normId,numericQuantityAdmitted:r.resource_graph.costTreatment==='OWN_COST',completeTechnicalEstimateAccepted:false}});
 for(const r of result.resources){const{row_sha256:_old,...body}=r;r.row_sha256=hash(body);}
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
  if(owner.parameters.some(n=>n.parameter_id===id)){result.baseline.normative_source_ids[id]=[...(result.baseline.normative_source_ids[id]??[]),pack.contract+':roof'];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;}}
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 const pendingIds=new Set(result.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').map(p=>p.parameter_id)),requiredIds=new Set(result.parameters.filter(p=>p.required===true&&pendingIds.has(p.parameter_id)).map(p=>p.parameter_id));
 const unresolvedResourceRowIds=result.resources.filter(r=>result.formulas.some(f=>f.formula_id===r.formula_id&&f.input_parameter_ids.some((id:string)=>pendingIds.has(id)))||Array.isArray(r.resource_graph.inputParameterIds)&&r.resource_graph.inputParameterIds.some((id:string)=>requiredIds.has(id))).map(r=>r.row_id);
 result.passport.decision={...result.passport.decision,unresolvedResourceRowIds,roofHangingGuttersCompanionContract:pack.contract,quantityScope:'PARTIAL',newNumericNormClosures:7,completeTechnicalEstimateAccepted:false,wholeRoofGroupComplete:false};
 result.passport.capability_matrix=result.passport.capability_matrix.map((c:Record<string,unknown>)=>c.capability==='FULL_APPLICABLE_SCOPE'?{...c,unresolvedResourceRowIds}:c);
 result.passport.included_scope_ru=[...result.passport.included_scope_ru,pack.scopeRu];result.definition.passport={...result.definition.passport,roofHangingGuttersCompanionContract:pack.contract,rowCount:result.resources.length,fullTechnicalEstimateAccepted:false};
 return {representative:result,addedRowIds:addedRows.map(r=>r.row_id),addedParameterIds:owner.parameters.map(p=>p.parameter_id),changedScopeRowIds:[...ROOF_WATER_SEMANTIC_ROWS_V1],changedFormulaIds:[],candidatePublished:false};
}
