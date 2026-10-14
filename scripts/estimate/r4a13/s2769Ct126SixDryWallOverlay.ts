import {buildCt126SixDryWallSuccessorS2769,ct126SixDryWallBindingS2769 as binding,ct126SixDryWallExactS2769 as exact} from '../../../src/lib/estimate/v4/ct126SixDryWallReuseS2769';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const accepted=require('../../../data/estimate-benchmarks/fixtures/ct126-ready-wall-v2-s27-69.json') as {representative:PurchaseGroupRepresentative};
export function overlayS2769Ct126SixDryWall(parent:PurchaseGroupRepresentative,locatorId?:string) {
 const r=buildCt126SixDryWallSuccessorS2769(parent),added=r.resources.filter(row=>!parent.resources.some(old=>old.row_id===row.row_id));
 const unresolved=added.filter(row=>String(row.source_metadata.sourceRole).startsWith('UNRESOLVED_')
  ||row.source_metadata.sourceRole==='CANDIDATE_PRODUCT_WITH_UNRESOLVED_APPLICABILITY_AND_QUANTITY');
 if(added.length!==30||unresolved.length!==11)throw Error('CT126_THIRTY_ROWS_ELEVEN_SOURCE_GAPS_REQUIRED');
 r.bindings.push(...accepted.representative.bindings.map(b=>({...b,
  locator_id:locatorId&&binding.physicalNormOwnerRowIds.includes(b.row_id)?locatorId:b.locator_id,
  applicability:{...b.applicability,contract:binding.contract,
  exactBranch:exact,scopeRu:binding.scopeRu,acceptedReferenceDefinitionId:binding.acceptedReferenceDefinitionId,completeTechnicalAcceptance:false}})));
 const oldOpen=(parent.passport.decision.unresolvedResourceRowIds??[]) as string[],ct126Open=unresolved.map(row=>row.row_id);
 r.passport.decision={...r.passport.decision,quantityScope:'PARTIAL',priceState:'PARTIAL_NEEDS_PRICE',technicalScopeStatus:'NEEDS_SOURCE',
  unresolvedResourceRowIds:[...new Set([...oldOpen,...ct126Open])],ct126UnresolvedResourceRowIds:ct126Open,
  materialSourceScopeOnly:true,legacyPreliminarySourcesRemainUnaccepted:true,
  completeTechnicalEstimateAccepted:false,legacyScopeChangeNotCountedAsNormFilling:true};
 r.passport.capability_matrix=parent.passport.capability_matrix.map((capability:Record<string,unknown>)=>({...capability,
  ...(capability.capability==='FORMULAS_AND_PHYSICAL_PARITY'?{additionalScope:'CT126_READY_CT7_DRY_CEMENT_LIME_WALL_2_10MM'}:{}),
  ...(capability.capability==='FULL_APPLICABLE_SCOPE'?{status:'NEEDS_SOURCE',unresolvedResourceRowIds:r.passport.decision.unresolvedResourceRowIds}:{}),
 }));
 return{representative:r,legacyRowIds:parent.resources.map(row=>row.row_id),addedRowIds:added.map(row=>row.row_id),
  addedParameterIds:r.parameters.filter(p=>!parent.parameters.some(old=>old.parameter_id===p.parameter_id)).map(p=>p.parameter_id),
  changedFormulaIds:[],physicalNormOwnerRowIds:binding.physicalNormOwnerRowIds,
  newPayableOwnerRowIds:['putty:ct126-dry-wall:5kg-order','putty:ct126-dry-wall:20kg-order','putty:ct126-dry-wall:5kg-mix-water-order','putty:ct126-dry-wall:20kg-mix-water-order'],
  ownerDisposition:parent.resources.map(row=>({rowId:row.row_id,costOwnerId:row.cost_owner_id,disposition:'PRESERVED_OWNER_IN_EXPLICIT_LEGACY_SCOPE'}))};
}
