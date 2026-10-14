import {buildConcreteBasePlannedPreparationS2769} from '../../../src/lib/estimate/v4/concreteBasePlannedPreparationS2769';
import pack from '../../../data/estimate-benchmarks/source-packs/concrete-base-planned-preparation-two-s27-69.json';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
export function overlayS2769ConcreteBasePlannedPreparation(parent:PurchaseGroupRepresentative,dustLocatorId:string){
 const r=buildConcreteBasePlannedPreparationS2769(parent),added=r.resources.filter(row=>!parent.resources.some(p=>p.row_id===row.row_id));
 for(const row of added.filter(row=>row.row_id.startsWith('dust:')))r.bindings.push({row_id:row.row_id,locator_id:dustLocatorId,
  applicability:{source_id:pack.dustSource.sourceId,norm_id:'norm:kg:krer:'+pack.dustSource.norm+':2015',
   quantity_basis:'INDEPENDENT_ACCEPTED_DUST_SURFACE_AREA_TIMES_EXACT_RATE_PER_ONE_M2',official_artifact_sha256:pack.dustSource.sha256,
   exact_locator:pack.dustSource.locatorRu,quality_control_included:true,separate_machinist_norm_absent:true}});
 const ownerIds=added.filter(row=>row.resource_graph.costTreatment==='OWN_COST'&&!row.row_id.startsWith('floor-demolition-preparation:')).map(row=>row.row_id);
 return {representative:r,legacyRowIds:parent.resources.map(row=>row.row_id),addedRowIds:added.map(row=>row.row_id),
  addedParameterIds:r.parameters.filter(p=>!parent.parameters.some(old=>old.parameter_id===p.parameter_id)).map(p=>p.parameter_id),
  physicalNormOwnerRowIds:ownerIds,newPayableOwnerRowIds:ownerIds,reusedPayableOwnerRowIds:ownerIds,
  ownerDisposition:parent.resources.map(row=>({rowId:row.row_id,costOwnerId:row.cost_owner_id,disposition:'RETAINED_OWNER_WITH_SEPARATE_NEW_COMPOSITION_INTENT'}))};
}
