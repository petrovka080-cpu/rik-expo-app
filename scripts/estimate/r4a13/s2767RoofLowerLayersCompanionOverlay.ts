import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {ROOF_LOWER_LAYERS_PACK_V1 as pack,ROOF_ASSEMBLY_SEMANTIC_ROW_V1,roofLowerLayersOwnersV1,roofLowerLayersObligationsV1,lowerLayersExistingRowV1,lowerLayersConditionParameterV1} from '../../../src/lib/estimate/backendPlatform/canonicalRoofLowerLayersCompanionV1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export function overlayS2767RoofLowerLayersCompanion(parent:PurchaseGroupRepresentative,locatorId:string){
 const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==9||parent.resources.length!==153||parent.parameters.length!==69)throw Error('ROOF_LOWER_LAYERS_EXACT_PARENT_DRIFT');
 for(const old of target.preservedOwners){const r=parent.resources.find(r=>r.row_id===old.rowId);if(!r||r.id!==old.resourceSpecId||r.cost_owner_id!==old.costOwnerId||r.unit_id!==old.unitId||r.formula_id!==old.formulaId)throw Error('ROOF_LOWER_LAYERS_PARENT_OWNER_DRIFT');}
 const result=structuredClone(parent),owners=roofLowerLayersOwnersV1(catalogId),oldAssembly=result.resources.find(r=>r.row_id===ROOF_ASSEMBLY_SEMANTIC_ROW_V1);if(!oldAssembly)throw Error('ROOF_LOWER_LAYERS_ASSEMBLY_REQUIRED');
 const scopes=roofLowerLayersObligationsV1(oldAssembly,catalogId),added=[...owners.vapor.resources,...owners.clay.resources,...scopes];
 if(added.length!==16)throw Error('ROOF_LOWER_LAYERS_DELTA_INVALID');
 let ordinal=oldAssembly.ordinal;for(const row of result.resources)if(row.ordinal>=ordinal)row.ordinal+=16;
 const addedRows=added.map(r=>({...r,ordinal:ordinal++}));
 result.resources=result.resources.map(lowerLayersExistingRowV1) as typeof result.resources;
 result.parameters=result.parameters.map(lowerLayersConditionParameterV1) as typeof result.parameters;
 const addedParameters=[...owners.vapor.parameters,...owners.clay.parameters,owners.other];let pOrdinal=Math.max(...result.parameters.map(p=>p.ordinal))+1;
 result.parameters.push(...addedParameters.map(p=>({...p,ordinal:pOrdinal++})));
 result.formulas.push(...[...owners.vapor.formulas,...owners.clay.formulas].map(f=>({...f,ast_sha256:hash(f.ast)})));
 result.resources.push(...addedRows);result.resources.sort((a,b)=>a.ordinal-b.ordinal);
 for(const row of addedRows)result.bindings.push({row_id:row.row_id,locator_id:locatorId,applicability:{contract:pack.contract,normId:pack.normId,numericQuantityAdmitted:row.resource_graph.costTreatment==='OWN_COST',completeTechnicalEstimateAccepted:false}});
 for(const row of result.resources){const{row_sha256:_old,...body}=row;row.row_sha256=hash(body);}
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
  if(addedParameters.some(n=>n.parameter_id===id)||id==='roof_torch_conditions'){result.baseline.normative_source_ids[id]=[...(result.baseline.normative_source_ids[id]??[]),pack.contract+':roof'];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;}}
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 const pendingIds=new Set(result.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').map(p=>p.parameter_id));
 const requiredPendingIds=new Set(result.parameters.filter(p=>p.required===true&&pendingIds.has(p.parameter_id)).map(p=>p.parameter_id));
 const unresolvedResourceRowIds=result.resources.filter(r=>result.formulas.some(f=>f.formula_id===r.formula_id&&f.input_parameter_ids.some((id:string)=>pendingIds.has(id)))
  ||Array.isArray(r.resource_graph.inputParameterIds)&&r.resource_graph.inputParameterIds.some((id:string)=>requiredPendingIds.has(id))).map(r=>r.row_id);
 result.passport.decision={...result.passport.decision,unresolvedResourceRowIds,roofLowerLayersCompanionContract:pack.contract,quantityScope:'PARTIAL',newNumericNormClosures:11,completeTechnicalEstimateAccepted:false,wholeRoofGroupComplete:false};
 result.passport.capability_matrix=result.passport.capability_matrix.map((c:Record<string,unknown>)=>c.capability==='FULL_APPLICABLE_SCOPE'?{...c,unresolvedResourceRowIds}:c);
 result.passport.included_scope_ru=[...result.passport.included_scope_ru,pack.scopeRu];result.definition.passport={...result.definition.passport,roofLowerLayersCompanionContract:pack.contract,rowCount:result.resources.length,fullTechnicalEstimateAccepted:false};
 return {representative:result,addedRowIds:addedRows.map(r=>r.row_id),addedParameterIds:addedParameters.map(p=>p.parameter_id),changedScopeRowIds:[ROOF_ASSEMBLY_SEMANTIC_ROW_V1],changedFormulaIds:[],candidatePublished:false};
}
