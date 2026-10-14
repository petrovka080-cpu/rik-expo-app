import {buildAggressiveFloorProtectionDustCompleteS2769} from '../../../src/lib/estimate/v4/aggressiveFloorProtectionDustCompleteS2769';
import pack from '../../../data/estimate-benchmarks/source-packs/aggressive-floor-complete-protection-dust-four-s27-69.json';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
export function overlayS2769AggressiveFloorProtectionDustComplete(parent:PurchaseGroupRepresentative,dustLocatorId:string){
 const r=buildAggressiveFloorProtectionDustCompleteS2769(parent),added=r.resources.filter(row=>!parent.resources.some(p=>p.row_id===row.row_id));
 for(const row of added.filter(row=>row.row_id.startsWith('dust:')))r.bindings.push({row_id:row.row_id,locator_id:dustLocatorId,
  applicability:{source_id:pack.dustSource.sourceId,norm_id:'norm:kg:krer:'+pack.dustSource.norm+':2015',
   quantity_basis:'ENTIRE_ACCEPTED_FLOOR_AREA_TIMES_EXACT_RATE_PER_ONE_M2',official_artifact_sha256:pack.dustSource.sha256,
   exact_locator:pack.dustSource.locatorRu,quality_control_included:true,separate_machinist_norm_absent:true}});
 return{representative:r,legacyRowIds:parent.resources.map(row=>row.row_id),addedRowIds:added.map(row=>row.row_id),
  addedParameterIds:r.parameters.filter(p=>!parent.parameters.some(old=>old.parameter_id===p.parameter_id)).map(p=>p.parameter_id),
  physicalNormOwnerRowIds:added.filter(row=>row.resource_graph.costTreatment==='OWN_COST').map(row=>row.row_id),
  newPayableOwnerRowIds:added.filter(row=>row.resource_graph.costTreatment==='OWN_COST').map(row=>row.row_id),
  reusedPayableOwnerRowIds:added.filter(row=>!row.row_id.startsWith('dust:')&&row.resource_graph.costTreatment==='OWN_COST').map(row=>row.row_id),
  ownerDisposition:parent.resources.map(row=>({rowId:row.row_id,costOwnerId:row.cost_owner_id,disposition:'RETAINED_OWNER_WITH_CONDITIONAL_SOURCE_GAPS_FOR_OTHER_METHODS'}))};
}
