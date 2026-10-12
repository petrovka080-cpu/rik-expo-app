import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {ROOF_SCREED_PACK_V1 as pack,ROOF_SCREED_SEMANTIC_ROW_V1,forecastRoofExistingRowV1,forecastRoofConditionParameterV1,roofScreedCompanionOwnerV1} from '../../../src/lib/estimate/backendPlatform/canonicalRoofScreedCompanionV1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export function overlayS2767RoofScreedCompanion(parent:PurchaseGroupRepresentative,locatorId:string){
 const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==7||parent.resources.length!==138||parent.parameters.length!==66)throw Error('ROOF_SCREED_EXACT_PARENT_DRIFT');
 for(const old of target.preservedOwners){const r=parent.resources.find(r=>r.row_id===old.rowId);if(!r||r.id!==old.resourceSpecId||r.cost_owner_id!==old.costOwnerId||r.unit_id!==old.unitId||r.formula_id!==old.formulaId)throw Error('ROOF_SCREED_PARENT_OWNER_DRIFT');}
 const result=structuredClone(parent),owner=roofScreedCompanionOwnerV1(catalogId);
 const obligation=result.resources.find(r=>r.row_id===ROOF_SCREED_SEMANTIC_ROW_V1);if(!obligation||owner.parameters.length!==1)throw Error('ROOF_SCREED_OBLIGATION_MISSING');
 const paid=owner.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id);
 let ordinal=obligation.ordinal;for(const row of result.resources)if(row.ordinal>=ordinal)row.ordinal+=8;
 const addedRows=owner.resources.map(r=>({...r,ordinal:ordinal++}));
 result.resources=result.resources.map(r=>forecastRoofExistingRowV1(r,paid)) as typeof result.resources;
 result.parameters=result.parameters.map(forecastRoofConditionParameterV1) as typeof result.parameters;
 result.parameters.push({...owner.parameters[0]!,ordinal:Math.max(...result.parameters.map(p=>p.ordinal))+1});
 result.formulas.push(...owner.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
 result.resources.push(...addedRows);result.resources.sort((a,b)=>a.ordinal-b.ordinal);
 for(const row of addedRows)result.bindings.push({row_id:row.row_id,locator_id:locatorId,applicability:{contract:pack.contract,normId:pack.normId,numericQuantityAdmitted:row.resource_graph.costTreatment==='OWN_COST',completeTechnicalEstimateAccepted:false}});
 for(const row of result.resources){const{row_sha256:_old,...body}=row;row.row_sha256=hash(body);}
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
  if(id===pack.measurementParameterId){result.baseline.normative_source_ids[id]=[pack.contract+':roof'];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;}}
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 result.passport.decision={...result.passport.decision,roofScreedCompanionContract:pack.contract,quantityScope:'PARTIAL',newNumericNormClosures:7,completeTechnicalEstimateAccepted:false,wholeRoofGroupComplete:false};
 result.passport.included_scope_ru=[...result.passport.included_scope_ru,pack.scopeRu];result.definition.passport={...result.definition.passport,roofScreedCompanionContract:pack.contract,rowCount:result.resources.length,fullTechnicalEstimateAccepted:false};
 return {representative:result,addedRowIds:addedRows.map(r=>r.row_id),addedParameterIds:[pack.measurementParameterId],changedScopeRowIds:[obligation.row_id],changedFormulaIds:[],candidatePublished:false};
}
