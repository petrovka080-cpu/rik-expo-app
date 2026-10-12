import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {ROOF_METAL_TRIM_PACK_V1 as pack,ROOF_METAL_TRIM_SEMANTIC_ROWS_V1,roofMetalTrimExistingRowV1,roofMetalTrimCompanionOwnerV1} from '../../../src/lib/estimate/backendPlatform/canonicalRoofMetalTrimCompanionV1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export function overlayS2767RoofMetalTrimCompanion(parent:PurchaseGroupRepresentative,locatorId:string){
 const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==8||parent.resources.length!==146||parent.parameters.length!==67)throw Error('ROOF_METAL_TRIM_EXACT_PARENT_DRIFT');
 for(const old of target.preservedOwners){const r=parent.resources.find(r=>r.row_id===old.rowId);if(!r||r.id!==old.resourceSpecId||r.cost_owner_id!==old.costOwnerId||r.unit_id!==old.unitId||r.formula_id!==old.formulaId)throw Error('ROOF_METAL_TRIM_PARENT_OWNER_DRIFT');}
 const result=structuredClone(parent),owner=roofMetalTrimCompanionOwnerV1(catalogId);
 const obligations=result.resources.filter(r=>ROOF_METAL_TRIM_SEMANTIC_ROWS_V1.includes(r.row_id));if(obligations.length!==3||owner.parameters.length!==2)throw Error('ROOF_METAL_TRIM_OBLIGATION_MISSING');
 const paid=owner.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id);
 let ordinal=Math.min(...obligations.map(r=>r.ordinal));for(const row of result.resources)if(row.ordinal>=ordinal)row.ordinal+=7;
 const addedRows=owner.resources.map(r=>({...r,ordinal:ordinal++}));
 result.resources=result.resources.map(r=>roofMetalTrimExistingRowV1(r,paid)) as typeof result.resources;
 let pOrdinal=Math.max(...result.parameters.map(p=>p.ordinal))+1;
 result.parameters.push(...owner.parameters.map(p=>({...p,ordinal:pOrdinal++})));
 result.formulas.push(...owner.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
 result.resources.push(...addedRows);result.resources.sort((a,b)=>a.ordinal-b.ordinal);
 for(const row of addedRows)result.bindings.push({row_id:row.row_id,locator_id:locatorId,applicability:{contract:pack.contract,normId:pack.normId,numericQuantityAdmitted:row.resource_graph.costTreatment==='OWN_COST',completeTechnicalEstimateAccepted:false}});
 for(const row of result.resources){const{row_sha256:_old,...body}=row;row.row_sha256=hash(body);}
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
  if(owner.parameters.some(n=>n.parameter_id===id)){result.baseline.normative_source_ids[id]=[pack.contract+':roof'];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;}}
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 result.passport.decision={...result.passport.decision,roofMetalTrimCompanionContract:pack.contract,quantityScope:'PARTIAL',newNumericNormClosures:6,completeTechnicalEstimateAccepted:false,wholeRoofGroupComplete:false};
 result.passport.included_scope_ru=[...result.passport.included_scope_ru,pack.scopeRu];result.definition.passport={...result.definition.passport,roofMetalTrimCompanionContract:pack.contract,rowCount:result.resources.length,fullTechnicalEstimateAccepted:false};
 return {representative:result,addedRowIds:addedRows.map(r=>r.row_id),addedParameterIds:owner.parameters.map(p=>p.parameter_id),changedScopeRowIds:[...ROOF_METAL_TRIM_SEMANTIC_ROWS_V1],changedFormulaIds:[],candidatePublished:false};
}
