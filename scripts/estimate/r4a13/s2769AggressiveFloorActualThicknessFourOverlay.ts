import {buildAggressiveFloorActualThicknessSuccessorS2769,aggressiveFloorActualThicknessBindingS2769 as binding} from '../../../src/lib/estimate/v4/aggressiveFloorActualThicknessScopeS2769';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
export function overlayS2769AggressiveFloorActualThicknessFour(parent:PurchaseGroupRepresentative){
 const r=buildAggressiveFloorActualThicknessSuccessorS2769(parent),added=r.resources.filter(row=>!parent.resources.some(p=>p.row_id===row.row_id));
 const map=structuredClone(parent.passport.decision.independentCompletenessMap);
 for(const entry of map.entries){
  if(entry.operationId==='offsite_waste_haul'){
   entry.condition='EXTERNAL_HAUL_CONFIRMED_BY_OBJECT_FACT_AND_FULL_SERVICE_SPECIFICATION';
   entry.resolution={kind:'ROW',rowId:added.find(row=>row.row_id.endsWith(':waste-service'))!.row_id};
   entry.priceRelation='OWN_COST';entry.unitId='t';entry.quantityRule='CONFIRMED_MASS_TONNES_FULL_SERVICE';
  }
  if(entry.resolution?.rowId&&r.resources.some(row=>row.row_id===entry.resolution.rowId))
   entry.condition='OBSERVED_THICKNESS_AND_CONFIRMED_EXACT_WORK_SCOPE';
 }
 map.entries.push(...added.filter(row=>!row.row_id.endsWith(':waste-service')).map(row=>({
  expectedResourceId:row.row_id,operationId:row.row_id,category:row.category,specification:row.title_ru,unitId:row.unit_id,
  condition:'APPLICABLE_AFTER_POSITIVE_OBJECT_FACT',sourceId:binding.contract,
  quantityRule:row.category==='service'?'CONFIRMED_MASS_TONNES_FULL_SERVICE':row.row_id.endsWith(':waste-plan')?'OBJECT_CONFIRMED_BOUNDARY_AREA':'UNRESOLVED_APPLICATION_NORM',
  priceRelation:row.row_id.endsWith(':waste-plan')?'INFORMATIONAL_SCOPE':'OWN_COST',formulaId:row.formula_id,resolution:{kind:'ROW',rowId:row.row_id}})));
 r.passport.decision={...r.passport.decision,independentCompletenessMap:map,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',
  unresolvedResourceRowIds:binding.sourceNeeds.map(g=>'f09:aggressive_environment_cement_or_concrete_floor_25mm_demolition:'+g.id),
  completeTechnicalEstimateAccepted:false};
 r.passport.capability_matrix=r.passport.capability_matrix.map((c:Record<string,unknown>)=>({...c,
  ...(c.capability==='FULL_APPLICABLE_SCOPE'?{status:'NEEDS_SOURCE',unresolvedResourceRowIds:r.passport.decision.unresolvedResourceRowIds}:{})}));
 return{representative:r,legacyRowIds:parent.resources.map(row=>row.row_id),addedRowIds:added.map(row=>row.row_id),
  addedParameterIds:r.parameters.filter(p=>!parent.parameters.some(old=>old.parameter_id===p.parameter_id)).map(p=>p.parameter_id),
  changedFormulaIds:r.formulas.filter(f=>parent.formulas.some(old=>old.formula_id===f.formula_id&&old.expression_source!==f.expression_source)).map(f=>f.formula_id),
  physicalNormOwnerRowIds:[],newPayableOwnerRowIds:added.filter(row=>row.category==='service').map(row=>row.row_id),
  ownerDisposition:parent.resources.map(row=>({rowId:row.row_id,costOwnerId:row.cost_owner_id,disposition:'RETAINED_OWNER_WITH_ACTUAL_MM_IN_PLACE_OF_INTERNAL_STEPS'}))};
}
