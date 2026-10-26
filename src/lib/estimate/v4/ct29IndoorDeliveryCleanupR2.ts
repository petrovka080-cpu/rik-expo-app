import pack from '../../../../data/estimate-benchmarks/source-packs/ct29-indoor-delivery-cleanup-r2.json';
import {buildCt29IndoorGeometryDefinitionR1,buildCt29PlasterCompletenessMapS2754,
 ct29IndoorGeometrySourcePackR1,type Ct29PlasterSourcePackS2754} from './ct29IndoorPlasterS2754';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const ct29IndoorDeliveryCleanupPackR2=pack;
export const ct29IndoorDeliveryCleanupPackSha256R2='fe488000268fdf3391e92173625424ece2ae1d1bf1301af90ee268dbe53df018';
export const ct29DeliveryDistanceParameterR2='ct29_delivery_distance_km';

/** A narrow successor of the retained geometry definition. No vehicle/payload,
 * waste mass, tariff or production fact is inferred from the user's geometry. */
export function buildCt29IndoorDeliveryCleanupDefinitionR2(source:Ct29PlasterSourcePackS2754,prefix:string):AutomaticOwnerDefinition {
 if(source.catalogId!==pack.catalogId||source.weatherProtectionValue)throw Error('EXACT_CT29_DELIVERY_CLEANUP_R2_SCOPE_REQUIRED');
 const base=buildCt29IndoorGeometryDefinitionR1({...source,contract:ct29IndoorGeometrySourcePackR1.contract},prefix),
  id=(key:string)=>prefix+':'+key,labor=id('labor'),order=id('25kg-order'),effective=effectiveResourceQuantityParameterId(order),
  distance=ct29DeliveryDistanceParameterR2,cleanup='ct29_cleanup_scope',transport=pack.transportSource,overheads=pack.cleanupSource;
 const extras=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:transport.id,normId:pack.contract,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:'NSC2024 + КР накладные приложение6',
   definition_hash:ct29IndoorDeliveryCleanupPackSha256R2,artifact_sha256:ct29IndoorDeliveryCleanupPackSha256R2,
   exact_locator:transport.locator+'; '+overheads.locator},applicabilityRu:source.scopeRu,ordinary:[],profile:[],
  conditional:[{id:distance,title:'Расстояние доставки CT29 от склада до объекта, км',valueType:'decimal',unitId:'km',kind:'conditional',min:0},
   {id:effective,title:'Принятая масса заказа CT29',valueType:'decimal',unitId:'kg',kind:'internal'},
   {id:cleanup,title:'Включённая уборка и вывоз обычного мусора при сдаче',valueType:'decimal',unitId:null,kind:'internal'}],
  rows:[{rowId:id('delivery'),formulaId:id('formula:delivery'),section:'delivery',category:'service',
   title:'Доставка CT29 от склада до объекта',unitId:'t_km',expression:`${effective}/1000*${distance}`,procurement:true,
   inclusion:{kind:'greater_than',parameterId:effective,value:0},inputParameterIds:[distance]},
   {rowId:id('scope-cleanup'),formulaId:id('formula:scope-cleanup'),section:'completion',category:'service',
    title:'Уборка и вывоз обычного строительного мусора при сдаче',unitId:'',expression:cleanup,costTreatment:'INFORMATIONAL_SCOPE'}],
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[pack.transportPolicyRu,pack.cleanupPolicyRu]});
 const parameters=[...base.parameters.filter(p=>p.parameter_id!=='ct29_logistics_cleanup_qty'),
  ...extras.parameters.filter(p=>p.parameter_id!==effective).map(p=>({...p,truth_metadata:{...p.truth_metadata,
   guide:{...p.truth_metadata.guide as Record<string,unknown>,verified_at:'2026-10-21T01:44:19Z'}}}))].map((p,ordinal)=>({...p,ordinal,
   ...(p.parameter_id===distance?{truth_metadata:{...p.truth_metadata,visibility_role:'USER_INPUT',value_source_role:'USER_INPUT',
    input_origin_class:'KNOWN_PRIMARY_WORK_SCOPE',source_confirmation_required:false,
    provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...p.truth_metadata.guide as Record<string,unknown>,
     guide_kind:'MEASUREMENT_RULE',source_role:'USER_SUPPLIED_PRIMARY_FACT',guide_short_ru:'Укажите расстояние от склада до объекта в одну сторону. Массу заказа приложение возьмёт из расчёта; рейсы и параметры машины вводить не требуется.'}}}:{})}));
 const operation=(key:'delivery'|'completion')=>({contractVersion:'canonical-operation-resource/v1' as const,groupId:prefix,groupTitleRu:pack.titleRu,
  operationId:id('operation:'+key),operationTitleRu:key==='delivery'?'Доставка CT29 со склада':'Уборка и сдача',processOrdinal:key==='delivery'?5:60,
  processRole:'PROCESS' as const,completionCriterionRu:key==='delivery'?'Согласован объём перевозки сухой массы заказа и расстояние; фактическая перевозка принимается отдельно.':pack.cleanupPolicyRu});
 const resources=[...base.resources.filter(r=>r.row_id!==id('logistics-cleanup')),...extras.resources].map((r,ordinal)=>{
  const delivery=r.row_id===id('delivery'),isCleanup=r.row_id===id('scope-cleanup'),isLabor=r.row_id===labor,
   {row_sha256:_old,...body}=r,graph=r.resource_graph??{},presentation=graph.publicResourcePresentationV1 as Record<string,unknown>|undefined,
   originalOperation=graph.operationCompositionV1 as Record<string,unknown>|undefined;
  const changed={...body,ordinal,...(isCleanup?{cost_owner_id:labor}:{}),resource_graph:{...graph,
   ...(delivery||isCleanup?{operationCompositionV1:operation(delivery?'delivery':'completion'),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
     brandAndModelRu:null,specificationRu:delivery?'Транспортная работа, т·км сухой смеси заказа; отдельный тариф без повторной разгрузки.':null,
     detailsRu:[delivery?pack.transportPolicyRu:pack.cleanupPolicyRu],...(isCleanup?{rowKind:'PROCESS_NOTE'}:{})}}:{}),
   ...(presentation?{publicResourcePresentationV1:{...presentation,detailsRu:[ct29IndoorGeometrySourcePackR1.scopeRu,
    ...(r.row_id===id('curing-water')?pack.readiness.openAuthorObligationsRu:[ct29IndoorGeometrySourcePackR1.planningPolicyRu]),
    ...(isLabor||r.row_id===id('scope-tools')?[pack.cleanupPolicyRu]:[])]}}:{}),
   ...(isLabor?{operationCompositionV1:{...originalOperation,additionalOperations:[
    ...(originalOperation?.additionalOperations as Record<string,unknown>[]??[]),operation('completion')]}}:{}),
   ...(isCleanup?{parentCostOwnerId:labor,includedInResourceOwnerRowId:labor,scopeRequirementV1:{
    contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:prefix,groupTitleRu:pack.titleRu,titleRu:r.title_ru,
    reasonRu:pack.cleanupPolicyRu,exactScopeWhen:{kind:'greater_than',parameterId:'plaster_area_m2',value:0},
    coveringRowIds:[labor],originalRowIds:[],costExclusionBreaksScopeV1:true,
    sourceEvidence:[{sha256:overheads.sha256,locator:overheads.locator}]}}:{})},
   source_metadata:{...r.source_metadata,sourceAuthorObligations:pack.readiness.openAuthorObligationsRu,
    ...(delivery||isCleanup?{official_url:delivery?transport.url:overheads.url,artifact_sha256:delivery?transport.sha256:overheads.sha256,
     exact_locator:delivery?transport.locator:overheads.locator,
     sourceRole:delivery?'DERIVED_DRY_ORDER_MASS_DISTANCE_TRANSPORT_WORK':'DOCUMENTED_OVERHEAD_INCLUDED_CLEANUP_SCOPE',
     normativeTrace:[{sourceId:delivery?transport.id:overheads.id,normId:pack.contract,source_url:delivery?transport.url:overheads.url,
      source_definition_hash:delivery?transport.sha256:overheads.sha256,exact_locator:delivery?transport.locator:overheads.locator}],
     full_technical_acceptance:false,geometryOnlyFullBranch:false,requiredNonGeometryTechnicalQuestions:0}:{}),
    ...(delivery?{basisOwnerRowId:order,transportMassBasis:'EFFECTIVE_ORDER_DRY_MASS_KG',
     actualGrossCargoMassNotClaimed:true,vehicleTripsHoursFuelNotInferred:true,automaticTariffForbidden:true,
     materialPriceMustExcludeSeparateFreight:true,insideHandlingExcludedFromFreightTariff:true}:{}),
    ...(isLabor?{includedCleanupScopeOwner:true}:{}),...(isCleanup?{numericWasteOrLaborNormAccepted:false}:{}),
   }};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 return {...base,parameters,formulas:[...base.formulas.filter(f=>f.formula_id!==id('formula:logistics-cleanup')),...extras.formulas],resources};
}

export function ct29IndoorDeliveryCleanupCompletenessMapR2(source:Ct29PlasterSourcePackS2754,prefix:string){
 const base=buildCt29PlasterCompletenessMapS2754({...source,contract:ct29IndoorGeometrySourcePackR1.contract},prefix),id=(key:string)=>prefix+':'+key;
 return {...base,sourceKind:'NORMATIVE_OPERATION_MAP',evidenceSha256:ct29IndoorDeliveryCleanupPackSha256R2,
  evidenceReferences:[...base.evidenceReferences,pack.transportSource.url],
  entries:[...base.entries.filter(e=>e.expectedResourceId!=='logistics-cleanup'),
   {expectedResourceId:'delivery',operationId:'delivery',category:'service',specification:'Перевозка сухой массы нового заказа CT29',
    condition:'POSITIVE_EFFECTIVE_CT29_ORDER_AND_MEASURED_DISTANCE',sourceId:pack.contract,unitId:'t_km',
    quantityRule:'EFFECTIVE_PURCHASE_KG_DIV_1000_X_ONE_WAY_DISTANCE_KM',formulaId:id('formula:delivery'),resolution:{kind:'ROW',rowId:id('delivery')}},
   {expectedResourceId:'scope-cleanup',operationId:'completion',category:'service',specification:pack.cleanupPolicyRu,
    condition:'LABOR_WITH_OVERHEAD_PROVIDER_SELECTED',sourceId:'kr_overheads',unitId:'',quantityRule:'DOCUMENTED_INCLUDED_SCOPE_NOT_NUMERIC_NORM',
    formulaId:id('formula:scope-cleanup'),resolution:{kind:'ROW',rowId:id('scope-cleanup')}}],
  openAuthorObligations:pack.readiness.openAuthorObligationsRu};
}
