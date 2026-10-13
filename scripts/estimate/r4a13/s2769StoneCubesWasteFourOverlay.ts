import {buildStoneCubesWasteSuccessorS2769,stoneCubesWasteBindingS2769 as binding} from '../../../src/lib/estimate/v4/stoneCubesWasteScopeS2769';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
export function overlayS2769StoneCubesWasteFour(parent:PurchaseGroupRepresentative){
 const r=buildStoneCubesWasteSuccessorS2769(parent),added=r.resources.filter(row=>!parent.resources.some(p=>p.row_id===row.row_id));
 const oldOpen=parent.resources.filter(row=>row.source_metadata.sourceRole==='UNRESOLVED_SEPARATE_WASTE_SCOPE').map(row=>row.row_id);
 const resolution={modeParameterId:'stone_cubes_waste_handling_mode',unknownAndLegacyRemainOpen:true,
  retain:{value:binding.retainModeValue,kind:'NOT_APPLICABLE_AFTER_POSITIVE_OBJECT_FACT',reasonRu:binding.retainModeValue},
  onsite:{value:binding.onSiteExtraModeValue,coveringRowId:'f09:stone_tile_floor_demolition:waste-onsite-service',
   reasonRu:'Требуемые дополнительные работы на объекте включены в подтверждённую полную услугу; внешний вывоз и внешний приём не нужны.'},
  external:{value:binding.contractorModeValue,coveringRowId:'f09:stone_tile_floor_demolition:waste-service',
   reasonRu:'Каждая требуемая дополнительная операция включена в подтверждённую полную услугу; одна цена за тонну.'},
  evidence:{sourcePack:binding.sourcePack,sha256:binding.sourcePackSha256,primarySourceSha256:binding.source.sha256,
   projectReferenceParameterId:'stone_cubes_waste_service_specification_ref'},explicitPreviousExclusionBlocksBundledService:true};
 const map=structuredClone(parent.passport.decision.independentCompletenessMap);
 for(const entry of map.entries)if(oldOpen.includes(entry.resolution?.rowId))entry.conditionalScopeResolutionS2769=resolution;
 map.entries.push(...added.map(row=>({expectedResourceId:row.row_id,operationId:row.resource_graph.operationCompositionV1.operationId,
  category:row.category,specification:row.title_ru,unitId:row.unit_id,condition:'POSITIVE_OBJECT_SCOPE_AND_COMPLETE_SERVICE_SPECIFICATION',
  sourceId:binding.contract,quantityRule:row.row_id.endsWith(':waste-plan')?'INFORMATIONAL_ACCEPTED_SCOPE_AREA_NOT_WASTE_MASS':'CONFIRMED_MASS_TONNES_ONE_TO_ONE_FULL_SERVICE',
  priceRelation:row.row_id.endsWith(':waste-plan')?'INFORMATIONAL_SCOPE':'OWN_COST',formulaId:row.formula_id,resolution:{kind:'ROW',rowId:row.row_id}})));
 r.passport.decision={...r.passport.decision,independentCompletenessMap:map,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',
  unresolvedResourceRowIds:oldOpen,positiveObjectScopeResolutionS2769:resolution,completeTechnicalEstimateAccepted:false,
  legacyUnknownScopeStillPartial:true,newPhysicalNorms:0};
 r.passport.capability_matrix=parent.passport.capability_matrix.map((capability:Record<string,unknown>)=>({...capability,
  ...(capability.capability==='FULL_APPLICABLE_SCOPE'?{status:'NEEDS_SOURCE',unresolvedResourceRowIds:oldOpen,conditionalScopeResolutionS2769:resolution}:{}),
 }));
 return{representative:r,legacyRowIds:parent.resources.map(row=>row.row_id),addedRowIds:added.map(row=>row.row_id),
  addedParameterIds:r.parameters.filter(p=>!parent.parameters.some(old=>old.parameter_id===p.parameter_id)).map(p=>p.parameter_id),changedFormulaIds:[],
  physicalNormOwnerRowIds:[],newPayableOwnerRowIds:added.filter(row=>row.category==='service').map(row=>row.row_id),
  ownerDisposition:parent.resources.map(row=>({rowId:row.row_id,costOwnerId:row.cost_owner_id,disposition:'UNCHANGED_PREDECESSOR_OWNER_WITH_CONFIRMED_CONDITIONAL_SCOPE'}))};
}
