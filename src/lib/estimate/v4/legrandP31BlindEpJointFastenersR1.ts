// WORK v2 EP-only after specific primary method review; old unrun EP/ER packet remains frozen/blocked. No canonical edits.
import pack from '../../../../data/estimate-benchmarks/source-packs/legrand-p31-blind-ep-joint-fasteners-r1.json';
import existingPack from '../../../../data/estimate-norms/professional/electrical.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
export const legrandP31BlindEpJointPackR1=pack,p31EpPrefixR1=pack.rowPrefix;
const prefix=pack.rowPrefix,positive={kind:'greater_than' as const,parameterId:'p31_joint_count',value:0};
const active={kind:'equals' as const,parameterId:'p31_scope_confirmation',value:pack.scopeFactRu};
const selectedNorm=existingPack.norm_items.find(n=>n.norm_id===pack.existingNormId);
if(!selectedNorm||selectedNorm.rate.value!==8||selectedNorm.rate.unit!=='M6 fasteners/tray joint for 75-300 mm tray'
 ||selectedNorm.applicability.tray_width_mm_min!==75||selectedNorm.applicability.tray_width_mm_max!==300
 ||selectedNorm.applicability.tightening_torque_nm!==11)throw Error('EXISTING_P31_NORM_PREIMAGE_DRIFT');
const norm=selectedNorm;
const normId=norm.norm_id,normSourceId='src_professional_norm_pack_'+normId;
const normDefinitionHash=estimateDeterministicHash({work_group:existingPack.work_group,source_pack_version:existingPack.source_pack_version,norm_item:norm});
const manufacturerTrace={source_id:normSourceId,sourceId:normSourceId,norm_id:normId,normId,
 source_document_version:existingPack.source_pack_version,normVersion:existingPack.source_pack_version,
 source_definition_hash:normDefinitionHash,source_title:norm.source.title,exact_locator:norm.source.page,official_url:norm.source.url};
const physicalExpression='p31_joint_count*'+norm.rate.value;
const facts=['p31_tray_sku','p31_coupler_sku','p31_scope_confirmation','p31_project_reference',
 'p31_supply_scope','p31_supply_reference'];
const aliases={product_profile_id:'p31_manufacturer_profile',manufacturer_system_profile_id:'p31_manufacturer_profile',
 product_specification_id:'p31_project_reference',containment_type:'p31_containment_type',
 containment_width_mm:'p31_tray_width_mm',tray_width_mm:'p31_tray_width_mm',tray_joint_count:'p31_joint_count',
 coupler_reference:'p31_coupler_reference',installation_manual_reference:'p31_installation_manual_reference',
 tightening_torque_nm:'p31_torque_nm'};
const binding={source_id:normSourceId,norm_id:normId,technology_class:'CABLE_CHANNEL',operation_class:'INSTALL',material_system:'CABLE_CHANNEL',
 scope_mode:'FULL_APPLICABLE_SCOPE',applicability_parameter_ids:['p31_joint_count',...facts],
 parameter_projection_v1:{aliases,units:{tray_joint_count:'pcs',tray_width_mm:'mm',containment_width_mm:'mm'}},
 quantity_output_parameter_id:'quantity_containment_joint_bolt'};
export function legrandP31BlindEpJointFastenerDefinitionR1(){
 const conditional:AutomaticParameterSpec[]=[
  {id:'p31_tray_sku',title:'Артикул глухого лотка P31 GS/PG высотой60мм',kind:'conditional',valueType:'enum',unitId:null,
   values:pack.trayProducts.map(p=>p.sku),requiredWhen:positive},
  {id:'p31_coupler_sku',title:'Принятая боковая муфта только EP341213',kind:'conditional',valueType:'enum',unitId:null,
   values:pack.couplerChoices.map(c=>c.sku),requiredWhen:positive},
  {id:'p31_scope_confirmation',title:'Фактическая система, концы и проектные интерфейсы',kind:'conditional',valueType:'enum',unitId:null,
   values:[pack.scopeFactRu],requiredWhen:positive},
  {id:'p31_project_reference',title:'Проект, редакция и ведомость конкретных стыков',kind:'conditional',valueType:'text',unitId:null,requiredWhen:positive},
  {id:'p31_supply_scope',title:'Отдельный владелец поставки341895 без повторной оплаты',kind:'conditional',valueType:'enum',unitId:null,
   values:[pack.supplyScopeFactRu],requiredWhen:positive},
  {id:'p31_supply_reference',title:'Документ отдельной поставки341895, кратность заказа и граница включённой оплаты',kind:'conditional',valueType:'text',unitId:null,requiredWhen:positive},
  {id:'p31_stock_item',title:'Пригодные болтовые сборки341895 с гайкой в наличии, шт.',kind:'conditional',valueType:'integer',unitId:'item',min:0,requiredWhen:positive},
  {id:'p31_reserve_item',title:'Сохраняемый резерв сборок341895, шт.',kind:'conditional',valueType:'integer',unitId:'item',min:0,requiredWhen:positive},
  {id:'p31_supplier_quantum_item',title:'Подтверждённая кратность заказа сборок341895, шт.',kind:'conditional',valueType:'integer',unitId:'item',min:1,requiredWhen:positive},
  {id:'p31_stock_reference',title:'Подтверждение пригодного наличия341895 с гайкой',kind:'conditional',valueType:'text',unitId:null,
   requiredWhen:{kind:'greater_than',parameterId:'p31_stock_item',value:0}},
 ];
 type Lookup={id:string;title:string;type:'decimal'|'text';unit:string|null;input:string;rows:{inputValues:string[];outputValue:string|number}[]};
 const sourceLookups:Lookup[]=[
  {id:'p31_tray_width_mm',title:'Ширина по выбранному артикулу, мм',type:'decimal',unit:'mm',input:'p31_tray_sku',
   rows:pack.trayProducts.map(p=>({inputValues:[p.sku],outputValue:p.widthMm}))},
  ...([
   ['p31_manufacturer_profile','Профиль производителя',pack.existingProductProfileId],
   ['p31_containment_type','Тип несущей системы','TRAY'],
   ['p31_installation_manual_reference','Подтверждённая монтажная инструкция','Legrand FT0955-02p11 blind plus FT1045EN-01p11 EP; updated02.03.2023'],
  ] as const).map(([id,title,value])=>({id,title,type:'text' as const,unit:null,input:'p31_tray_sku',rows:pack.trayProducts.map(p=>({inputValues:[p.sku],outputValue:value}))})),
  {id:'p31_torque_nm',title:'Момент затяжки по инструкции, Н·м',type:'decimal',unit:null,input:'p31_tray_sku',
   rows:pack.trayProducts.map(p=>({inputValues:[p.sku],outputValue:11}))},
  {id:'p31_coupler_reference',title:'Муфта по принятому артикулу',type:'text',unit:null,input:'p31_coupler_sku',
   rows:pack.couplerChoices.map(c=>({inputValues:[c.sku],outputValue:c.normValue}))},
 ];
 for(const l of sourceLookups)conditional.push({id:l.id,title:l.title,kind:'conditional',valueType:l.type,unitId:l.unit,requiredWhen:positive});
 const rows:AutomaticRowSpec[]=[];
 const add=(id:string,title:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
  rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,title,unitId,expression,section:'Прямой стык P31: доказанный крепёж и незакрытый монтаж',
  category:'material',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:active,inputParameterIds:['p31_joint_count',...facts],...extra});
 const order=prefix+':fastener-order',balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:order,orderUnitId:'item',
  consumed:physicalExpression,stock:'p31_stock_item',reserve:'p31_reserve_item',quantum:'p31_supplier_quantum_item'});
 const stockConsumers=['p31_joint_count',...facts,'p31_stock_reference'];
 add('joint-count','Реальные прямые EP341213 стыки глухого P31 по принятой ведомости','pcs','p31_joint_count');
 add('fastener-consumed','Болтовые сборки M6 с гайкой:8на стык по FT0955-02','item',physicalExpression);
 add('fastener-order',pack.fastener.titleRu+' — новый заказ, цена за одну сборку','item',
  'ceil(max(0,('+physicalExpression+')+p31_reserve_item-p31_stock_item)/p31_supplier_quantum_item)*p31_supplier_quantum_item',
  {...balance.owner,costTreatment:'OWN_COST',procurement:true,inputParameterIds:stockConsumers});
 add('fastener-remaining','Пригодные сборки341895 после монтажа, не отходы','item',balance.remaining,{purchaseBalanceOwnerRowId:order,inputParameterIds:stockConsumers});
 add('fastener-free','Свободные сборки341895 сверх сохраняемого резерва','item',balance.free,{purchaseBalanceOwnerRowId:order,inputParameterIds:stockConsumers});
 add('fastener-shortage','Нехватка сборок341895 для монтажа','item',balance.consumptionShortage,{purchaseBalanceOwnerRowId:order,inputParameterIds:stockConsumers});
 add('fastener-reserve-deficit','Непокрытый сохраняемый резерв341895','item',balance.reserveDeficit,{purchaseBalanceOwnerRowId:order,inputParameterIds:stockConsumers});
 for(const gap of pack.sourceNeeds){const id='p31_open_'+gap.id.replaceAll('-','_');
  conditional.push({id,title:gap.titleRu,kind:'conditional',valueType:'decimal',unitId:gap.unitId,min:0,requiredWhen:positive});
  add('open-'+gap.id,gap.titleRu,gap.unitId,id,{category:gap.category,costTreatment:'OWN_COST'});
 }
 const d=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:normSourceId,normId,
  sourceMetadata:{source_title:norm.source.title,source_document_version:existingPack.source_pack_version,
   definition_hash:normDefinitionHash,artifact_sha256:pack.manufacturerArtifacts[0].sha256,exact_locator:pack.manufacturerArtifacts.map(s=>s.locatorRu).join(' | ')},
  applicabilityRu:pack.scopeFactRu,ordinary:[{id:'p31_joint_count',title:'Количество реальных прямых стыков по ведомости, шт.',kind:'ordinary',valueType:'integer',unitId:'pcs',min:1}],
  profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
 return{...d,parameters:d.parameters.map(p=>{
  if(p.parameter_id.startsWith('p31_open_'))return{...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,
   pack.sourceNeeds.find(g=>'p31_open_'+g.id.replaceAll('-','_')===p.parameter_id)!.reasonRu)};
  const lookup=sourceLookups.find(l=>l.id===p.parameter_id);
  if(lookup)return{...p,truth_metadata:{...p.truth_metadata,visibility_role:'USER_DERIVED_READONLY',value_source_role:'PRODUCT_PASSPORT_VALUE',
   source_confirmation_required:false,catalogue_owned_lookup_v1:true,derived_exact_lookup_v1:{version:'canonical-derived-exact-lookup:v1',
    inputParameterIds:[lookup.input],rows:lookup.rows,interpolation:'FORBIDDEN'},
   input_origin_class:'SOURCE_MANAGED_PRODUCT_PASSPORT',
   guide:{...(p.truth_metadata.guide as Record<string,unknown>),guide_short_ru:'Значение паспорта производителя по выбранному артикулу; ручная подмена не допускается.',
    source_role:'MANUFACTURER_PRODUCT_PASSPORT',source_document:'Legrand FT0955-02 + FT1045EN-01',source_locator:pack.manufacturerArtifacts[0].locatorRu,
    source_snapshot_hash:pack.manufacturerArtifacts[0].sha256}}};
  if(p.truth_metadata.visibility_role==='INTERNAL_ONLY')return p;
  return{...p,truth_metadata:{...p.truth_metadata,source_confirmation_required:false,
   provenance:{consumer_input_role_v1:p.parameter_id==='p31_joint_count'?'OBJECT_GEOMETRY':'OBJECT_FACT'},
   ...(p.parameter_id==='p31_stock_reference'?{visible_when:{kind:'greater_than',parameterId:'p31_stock_item',value:0}}:{})}};
 }),resources:d.resources.map(r=>{
  const gap=pack.sourceNeeds.find(g=>r.row_id===prefix+':open-'+g.id),consumed=r.row_id===prefix+':fastener-consumed',paid=r.row_id===order;
  const {row_sha256:_old,...body}=r;
  const value={...body,resource_graph:{...r.resource_graph,
   ...(!gap&&!paid?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',
    unitId:r.unit_id,parameterIds:d.formulas.find(f=>f.formula_id===r.formula_id)!.input_parameter_ids,
    reasonRu:'Расход крепежа и баланс вычисляются из ведомости стыков и принятого заказа. Измените исходные факты или заказ; ручное количество производной строки не принимается.'}}:{}),
   ...(consumed||paid?{professionalPhysicalNormBindingV1:{...binding,
    ...(paid?{quantity_output_formula_id:prefix+':formula:fastener-consumed'}:{})}}:{}),
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
    operationId:gap?'open-completion':'joint-fasteners',operationTitleRu:gap?'Незакрытый цикл монтажа стыка':'Крепёж принятого прямого стыка P31',processOrdinal:gap?30:20,
    completionCriterionRu:'Крепёж по принятому стыку; муфты, труд, оснащение, проверка и услуги сохраняются отдельными открытыми потребностями.'},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
    brandAndModelRu:gap?null:'Legrand P31;341895 bolt with nut',specificationRu:gap?null:'Глухой GS/PG лоток60мм;75–300мм; EP;8M6 на стык;11Нм.',
    detailsRu:[gap?gap.reasonRu:pack.fastener.oneUnitRu,'Количество крепежа не является нормой труда или полной сметой монтажа.']}},
   source_metadata:{...r.source_metadata,normativeTrace:gap?[]:[manufacturerTrace],
    sourceRole:gap?'UNRESOLVED_APPLICATION_NORM':'EXISTING_REVIEWED_MANUFACTURER_P31_JOINT_FASTENER_NORM',
    sourceNormQuantityAccepted:!gap,fullTechnicalAcceptance:false,
    ...(paid||gap?{automaticGenericPriceInheritanceAllowed:false}:{}),
    ...(gap?{unresolvedSourceQuantityReasonRu:gap.reasonRu}:{}),
    manufacturerArtifacts:pack.manufacturerArtifacts,selectedFastenerIncludesNut:true,extraNutPaidOwnerForbidden:true}};
  return{...value,row_sha256:estimateDeterministicHash(value)};
 })};
}
// Root supplies a reviewed append identity; the proposed source-pack key is not a persisted catalog ID.
// No existing consumer, old point unit or historical row is rewritten by this module.
export function compileLegrandP31BlindEpJointFastenersR1(catalogId:string,input:Record<string,unknown>,rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']){
 if(!catalogId||!catalogId.startsWith('canonical-work:'))throw Error('P31_ACTUAL_CATALOG_BINDING_REQUIRED');
 const d=legrandP31BlindEpJointFastenerDefinitionR1();
 return compileCanonicalEstimateCore({operation:rowOverrides?'recalculate':'compile',catalogId,compilerVersion:pack.contract,
  primaryMeasureParameterId:'p31_joint_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:input,confirmedParameters:{},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,
  hashJson:async value=>estimateDeterministicHash(value)});
}

/** Arithmetic-only input for review/tests, not object data or a normative default. */
export function legrandP31BlindEpJointControlInputR1():Record<string,unknown>{return{
 p31_joint_count:3,p31_tray_sku:'480305',p31_coupler_sku:'341213',p31_scope_confirmation:pack.scopeFactRu,
 p31_project_reference:'CONTROL_ONLY approved joint schedule; not an actual construction object',
 p31_supply_scope:pack.supplyScopeFactRu,p31_supply_reference:'CONTROL_ONLY separate341895 supply and confirmed order quantum',
 p31_stock_item:0,p31_reserve_item:0,p31_supplier_quantum_item:1,
};}
