import {buildCn87SubfloorSuccessorS2769,cn87SubfloorBindingS2769 as binding,cn87SubfloorExactS2769 as exact} from '../../../src/lib/estimate/v4/cn87SubfloorSeriesS2769';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
export function overlayS2769Cn87SubfloorFour(parent:PurchaseGroupRepresentative,locatorId:string){
 const r=buildCn87SubfloorSuccessorS2769(parent),added=r.resources.filter(row=>!parent.resources.some(p=>p.row_id===row.row_id));
 const unresolved=added.filter(row=>String(row.source_metadata.sourceRole).startsWith('UNRESOLVED_'));
 if(unresolved.length!==21)throw Error('CN87_21_SOURCE_AND_INHERITED_NEEDS_REQUIRED');
 for(const row of added)if(!unresolved.includes(row))r.bindings.push({row_id:row.row_id,locator_id:locatorId,applicability:{contract:binding.contract,exactBranch:exact,scopeRu:binding.scopeRu,fullTechnicalAcceptance:false}});
 const oldOpen=(parent.passport.decision.unresolvedResourceRowIds??[]) as string[],cn87Open=unresolved.map(row=>row.row_id);
 r.passport.decision={...r.passport.decision,quantityScope:'PARTIAL',priceState:'PARTIAL_NEEDS_PRICE',technicalScopeStatus:'NEEDS_SOURCE',
  materialSourceScopeOnly:true,legacyPreliminarySourcesRemainUnaccepted:true,unresolvedResourceRowIds:[...new Set([...oldOpen,...cn87Open])],
  cn87UnresolvedResourceRowIds:cn87Open,cn87ActiveUnresolvedDefinitions:21,completeTechnicalEstimateAccepted:false,wholeFloorGroupComplete:false};
 r.passport.capability_matrix=[...(parent.passport.capability_matrix??[]),{capability:'CN87_PHYSICAL_CONSUMPTION',status:'GREEN',scope:'EXACT_50MM_READY_SEPARATION_MANUAL_ONLY'},
  {capability:'CN87_FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',unresolvedResourceRowIds:cn87Open}];
 return{representative:r,legacyRowIds:parent.resources.map(row=>row.row_id),addedRowIds:added.map(row=>row.row_id),
  addedParameterIds:r.parameters.filter(p=>!parent.parameters.some(old=>old.parameter_id===p.parameter_id)).map(p=>p.parameter_id),changedFormulaIds:[],
  newPayableOwnerRowId:'cn87:separation-50mm:cn87-order',physicalNormOwnerRowIds:binding.knownConsumptionOwners,
  ownerDisposition:parent.resources.map(row=>({rowId:row.row_id,costOwnerId:row.cost_owner_id,disposition:'UNCHANGED_PREDECESSOR_OWNER'}))};
}
