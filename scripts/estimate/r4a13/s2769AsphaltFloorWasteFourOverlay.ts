import {buildAsphaltFloorWasteSuccessorS2769,asphaltFloorWasteBindingS2769 as binding} from '../../../src/lib/estimate/v4/asphaltFloorWasteScopeS2769';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
export function overlayS2769AsphaltFloorWasteFour(parent:PurchaseGroupRepresentative){
 const r=buildAsphaltFloorWasteSuccessorS2769(parent),added=r.resources.filter(row=>!parent.resources.some(p=>p.row_id===row.row_id));
 const prefix='f09:asphalt_floor_covering_demolition',pendingId=prefix+':unconfirmed-waste-scope';
 const resolution={modeParameterId:'asphalt_floor_waste_handling_mode',unknownRemainsOpen:true,
  retain:{value:binding.retainModeValue,kind:'NOT_APPLICABLE_AFTER_POSITIVE_OBJECT_FACT',reasonRu:binding.retainModeValue},
  onsite:{value:binding.onSiteExtraModeValue,coveringRowId:prefix+':waste-onsite-service',reasonRu:'Дополнительная услуга на объекте; внешнего вывоза нет.'},
  external:{value:binding.contractorModeValue,coveringRowId:prefix+':waste-service',reasonRu:'Полная внешняя услуга по подтверждённой массе и спецификации; одна цена за тонну.'},
  unknown:{coveringRowId:pendingId,reasonRu:'Отсутствие вывоза в норме не определяет его применимость на объекте.'},
  evidence:{sourcePack:binding.sourcePack,sha256:binding.sourcePackSha256,primarySourceSha256:binding.source.sha256,
   projectReferenceParameterId:'asphalt_floor_waste_service_specification_ref'}};
 const map=structuredClone(parent.passport.decision.independentCompletenessMap);
 const oldOutside=map.entries.filter((entry:Record<string,unknown>)=>entry.operationId==='offsite_waste_haul');
 if(oldOutside.length!==1)throw Error('ASPHALT_FLOOR_EXACT_PREDECESSOR_OUTSIDE_SCOPE_REQUIRED');
 oldOutside[0].condition='EXTERNAL_HAUL_CONFIRMED_BY_OBJECT_FACT_AND_FULL_SERVICE_SPECIFICATION';
 oldOutside[0].resolution={kind:'ROW',rowId:prefix+':waste-service'};
 oldOutside[0].conditionalScopeResolutionS2769=resolution;
 map.entries.push(...added.map(row=>({expectedResourceId:row.row_id,operationId:row.resource_graph.operationCompositionV1.operationId,
  category:row.category,specification:row.title_ru,unitId:row.unit_id,
  condition:row.row_id===pendingId?'WASTE_HANDLING_MODE_NOT_YET_CONFIRMED':'POSITIVE_OBJECT_SCOPE_AND_COMPLETE_SERVICE_SPECIFICATION',
  sourceId:binding.contract,quantityRule:row.category==='service'?'CONFIRMED_MASS_TONNES_ONE_TO_ONE_FULL_SERVICE':'INFORMATIONAL_SCOPE_AREA_NOT_WASTE_MASS',
  priceRelation:row.category==='service'?'OWN_COST':'INFORMATIONAL_SCOPE',formulaId:row.formula_id,resolution:{kind:'ROW',rowId:row.row_id}})));
 r.passport.included_scope_ru=[...parent.passport.included_scope_ru,
  'Дополнительное обращение со снятыми материалами — только по подтверждённому способу и полной спецификации услуги.'];
 r.passport.excluded_scope_ru=parent.passport.excluded_scope_ru.filter((scope:string)=>scope!=='внеобъектовый вывоз и размещение отходов');
 r.passport.decision={...r.passport.decision,independentCompletenessMap:map,quantityScope:'PARTIAL',technicalScopeStatus:'OBJECT_SCOPE_REQUIRES_CONFIRMATION',
  unresolvedResourceRowIds:[pendingId],positiveObjectScopeResolutionS2769:resolution,completeTechnicalEstimateAccepted:false,
  unknownWasteHandlingStillPartial:true,unresolvedNumericalSourceGaps:0,newPhysicalNorms:0};
 r.passport.capability_matrix=parent.passport.capability_matrix.map((capability:Record<string,unknown>)=>({...capability,
  ...(capability.capability==='FULL_APPLICABLE_SCOPE'?{status:'NEEDS_OBJECT_FACT',unresolvedResourceRowIds:[pendingId],conditionalScopeResolutionS2769:resolution}:{}),
 }));
 return{representative:r,legacyRowIds:parent.resources.map(row=>row.row_id),addedRowIds:added.map(row=>row.row_id),
  addedParameterIds:r.parameters.filter(p=>!parent.parameters.some(old=>old.parameter_id===p.parameter_id)).map(p=>p.parameter_id),changedFormulaIds:[],
  physicalNormOwnerRowIds:[],newPayableOwnerRowIds:added.filter(row=>row.category==='service').map(row=>row.row_id),
  ownerDisposition:parent.resources.map(row=>({rowId:row.row_id,costOwnerId:row.cost_owner_id,disposition:'UNCHANGED_PREDECESSOR_OWNER_WITH_CONFIRMED_CONDITIONAL_SCOPE'}))};
}
