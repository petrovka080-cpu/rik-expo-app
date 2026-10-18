// WORK candidate. Existing formula compiler, deterministic row builder and purchase balance.
// No legacy labor/logistics planning profile is imported into parameters or runtime inputs.
import pack from '../../../../data/estimate-benchmarks/source-packs/elecor-60x40-single-route-materials-r1.json';
import {ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS as existing}
  from './electricalElecorCableChannelStandardS2723';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
export const elecorSingleRoutePackR1=pack,prefix=pack.rowPrefix;
const method={kind:'equals' as const,parameterId:'elecor_route_scope',value:pack.exactScopeRu};
const routePositive={kind:'greater_than' as const,parameterId:'elecor_route_m',value:0};
export const elecorSingleRouteActiveR1={kind:'and' as const,operands:[
 {kind:'equals' as const,parameterId:'elecor_route_scope',value:pack.exactScopeRu},
 {kind:'equals' as const,parameterId:'elecor_route_layout',value:pack.exactLayoutRu}]};
const expression=(id:string,expected:string)=>{
 const f=existing.find(f=>f.formula_id===`electrical_elecor_${id}_s2723`);
 if(f?.expression_source!==expected)throw Error('EXISTING_ELECOR_GEOMETRY_PREIMAGE_CHANGED:'+id);
 return f.expression_source;
};
// Read only the accepted standard's geometric expressions. No runtime defaults,
// productivity/reserve/logistics values or rows from that profile are copied.
const pieces=expression('channel_pieces','ceil(route_length_m/channel_section_length_m)')
 .replaceAll('route_length_m','elecor_route_m').replaceAll('channel_section_length_m','2');
const joints=expression('straight_connectors','max(0,ceil(route_length_m/channel_section_length_m)-continuous_route_count)')
 .replaceAll('route_length_m','elecor_route_m').replaceAll('channel_section_length_m','2').replaceAll('continuous_route_count','1');
export function elecorSingleRouteMaterialDefinitionR1(){
 if(pack.product.channelSectionLengthM!==2||pack.product.channelSectionsPerPackage!==9
  ||pack.product.channelTransportPackM!==18||pack.product.kmsPiecesPerSet!==4
  ||pack.product.channelSku!=='CKK10-060-040-1-K01-018'||pack.product.kmsSku!=='CKMP10D-S-060-040-K01')
  throw Error('EXACT_ELECOR_60X40_PRODUCT_AND_PACK_PREIMAGE_REQUIRED');
 const facts=['elecor_route_scope','elecor_route_layout','elecor_route_document_reference'];
 const conditional:AutomaticParameterSpec[]=[
  {id:facts[0],title:'Условия, кабельное заполнение и выбранная система',kind:'conditional',valueType:'enum',unitId:null,values:[pack.exactScopeRu],requiredWhen:routePositive},
  {id:facts[1],title:'Принятая карта секций и внутренних стыков',kind:'conditional',valueType:'enum',unitId:null,values:[pack.exactLayoutRu],requiredWhen:routePositive},
  {id:facts[2],title:'Документ, редакция и участок трассы',kind:'conditional',valueType:'text',unitId:null,requiredWhen:routePositive},
 ];
 const rows:AutomaticRowSpec[]=[];
 const add=(id:string,title:string,unitId:string,expr:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
  rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,title,unitId,expression:expr,section:'Материалы кабель-канала по принятой карте',
  category:'material',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:elecorSingleRouteActiveR1,
  inputParameterIds:[...facts,'elecor_route_m'],...extra});
 add('route-net','Измеренная чистая длина участка ELECOR 60×40','m','elecor_route_m');
 add('installed-sections','Секции ELECOR по2м, из которых монтируется участок','pcs',pieces);
 add('tail-length','Концевой отрезок от последней секции — пригодность отдельно, не норма отходов','m',`(${pieces})*2-elecor_route_m`);
 add('internal-joints','Внутренние прямые стыки секций по принятой карте','pcs',joints);
 for(const [kind,opened,perPackage,title] of [
  ['channel',`ceil((${pieces})/9)`,9,'IEK ELECOR 60×40 CKK10-060-040-1-K01-018: заводская упаковка 18 м, 9 секций по 2 м'],
  ['kms',`ceil((${joints})/4)`,4,'IEK КМС 60×40 CKMP10D-S-060-040-K01: заводской комплект 4 шт.'],
 ] as const){
  for(const [suffix,title,min] of [['stock_packages','Пригодные целые заводские упаковки в наличии',0],
    ['reserve_packages','Сохранить целых нераспечатанных упаковок',0],['supplier_multiple','Кратность поставщика в заводских упаковках',1]] as const)
   conditional.push({id:`elecor_${kind}_${suffix}`,title:`${title}: ${kind==='channel'?'ELECOR 18 м':'КМС 4 шт.'}`,
    kind:'conditional',valueType:'integer',unitId:'item',min,requiredWhen:routePositive});
  const owner=prefix+':'+kind+'-order',stock=`elecor_${kind}_stock_packages`,reserve=`elecor_${kind}_reserve_packages`,quantum=`elecor_${kind}_supplier_multiple`;
  const stockRef=`elecor_${kind}_stock_reference`;
  conditional.push({id:stockRef,title:'Подтверждение пригодного наличия целых упаковок: '+title,
   kind:'conditional',valueType:'text',unitId:null,requiredWhen:{kind:'greater_than',parameterId:stock,value:0}});
  const balanceInputs=[...facts,'elecor_route_m',stockRef];
  const b=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'item',consumed:opened,stock,reserve,quantum});
  add(kind+'-opened','Заводские упаковки, открываемые для принятой карты: '+title,'item',opened);
  add(kind+'-order',title+' — новый заказ, цена за одну заводскую упаковку','item',`ceil(max(0,(${opened})+${reserve}-${stock})/${quantum})*${quantum}`,{...b.owner,procurement:true,costTreatment:'OWN_COST',inputParameterIds:balanceInputs});
  add(kind+'-unopened','Целые нераспечатанные упаковки после работ: '+title,'item',b.remaining,{purchaseBalanceOwnerRowId:owner,inputParameterIds:balanceInputs});
  add(kind+'-free','Свободные целые упаковки сверх сохраняемого резерва: '+title,'item',b.free,{purchaseBalanceOwnerRowId:owner,inputParameterIds:balanceInputs});
  add(kind+'-pieces-in-opened','Оставшиеся целые изделия внутри открытых упаковок: '+title,'pcs',
   `(${opened})*${perPackage}-(${kind==='channel'?pieces:joints})`);
  add(kind+'-consumption-shortage','Недостающие целые упаковки для принятой карты: '+title,'item',b.consumptionShortage,{purchaseBalanceOwnerRowId:owner,inputParameterIds:balanceInputs});
  add(kind+'-reserve-deficit','Недостающие нераспечатанные упаковки для сохранения резерва: '+title,'item',b.reserveDeficit,{purchaseBalanceOwnerRowId:owner,inputParameterIds:balanceInputs});
 }
 for(const gap of pack.sourceNeeds){const id='elecor_open_qty_'+gap.id.replaceAll('-','_');
  conditional.push({id,title:gap.titleRu,kind:'conditional',valueType:'decimal',unitId:gap.unitId,min:0,requiredWhen:method});
  add('open-'+gap.id,gap.titleRu,gap.unitId,id,{category:gap.category,costTreatment:'OWN_COST'});
 }
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,
  normId:pack.normId,sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.sourceEdition,
   definition_hash:pack.catalogueSha256,artifact_sha256:pack.catalogueSha256,exact_locator:pack.catalogueLocatorRu},
  applicabilityRu:pack.scopeRu,ordinary:[{id:'elecor_route_m',title:'Измеренная длина одного нового прямого участка кабель-канала, м',kind:'ordinary',valueType:'decimal',unitId:'m',min:0.001}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:pack.excludedRu});
 return {...built,parameters:built.parameters.map(p=>p.parameter_id.startsWith('elecor_open_qty_')?{...p,
  truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Источник производителя не даёт применимых количества/часов/границы обеспечения этой подработы; не заменять профессиональную норму ручным числом.')}:
  p.truth_metadata.visibility_role==='INTERNAL_ONLY'?p:{...p,truth_metadata:{...p.truth_metadata,
  value_source_role:p.parameter_id==='elecor_route_m'?'USER_INPUT':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
  ...(p.parameter_id==='elecor_route_m'||p.parameter_id==='elecor_route_scope'?{}:{visible_when:p.parameter_id.endsWith('_stock_reference')?
   {kind:'greater_than',parameterId:p.parameter_id.replace('_stock_reference','_stock_packages'),value:0}:method}),
  provenance:{consumer_input_role_v1:p.parameter_id==='elecor_route_m'?'OBJECT_GEOMETRY':p.parameter_id.includes('packages')||p.parameter_id.endsWith('multiple')?'ADVANCED_OPTION':'OBJECT_FACT'}}}),
  resources:built.resources.map(r=>{const {row_sha256:_hash,...body}=r;const paid=r.row_id.endsWith('-order');
   const gap=pack.sourceNeeds.find(g=>r.row_id===prefix+':open-'+g.id);
   const value={...body,resource_graph:{...r.resource_graph,fullTechnicalAcceptance:false,
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
      operationId:gap?'completion':'material-plan',operationTitleRu:gap?'Незакрытый монтаж и завершение':pack.titleRu,processOrdinal:gap?40:20,
      completionCriterionRu:'Выбранные материалы и целые упаковки по принятой прямой трассе; монтаж и остальные обязательства отдельно.'},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
     brandAndModelRu:gap?null:r.row_id.includes(':channel-')?'IEK ELECOR '+pack.product.channelSku:r.row_id.includes(':kms-')?'IEK КМС '+pack.product.kmsSku:'IEK ELECOR 60×40',
     specificationRu:gap?null:'Белый канал 60×40; новая секция 2 м; заводская упаковка 18 м; КМС 60×40 отдельным комплектом 4 шт.',
     detailsRu:[gap?gap.missingRu:pack.scopeRu,'Геометрия и упаковки двух материалов не закрывают монтаж, крепёж, приёмку, логистику и уборку.']}},
    source_metadata:{...r.source_metadata,sourceRole:gap?'UNRESOLVED_APPLICATION_NORM':'MANUFACTURER_PRODUCT_GEOMETRY_WITH_EXPLICIT_PROJECT_LAYOUT',
     ...(gap?{sourceNormQuantityAccepted:false,normativeTrace:[],unresolvedSourceQuantityReasonRu:gap.missingRu}:{}),
     manufacturerConsumptionRateNotClaimed:true,materialOnly:true,noLabourFastenerOrLogisticsRateTransferred:true,
     ...(paid||gap?{automaticGenericPriceInheritanceAllowed:false}:{}),
     sourceEvidence:pack.sourceEvidence}};
   return {...value,row_sha256:estimateDeterministicHash(value)};})};
}

export function compileElecorSingleRouteMaterialR1(input:Record<string,unknown>,rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']){
 const d=elecorSingleRouteMaterialDefinitionR1();
 return compileCanonicalEstimateCore({operation:rowOverrides?'recalculate':'compile',catalogId:pack.proposedIdentity.catalogId,
  compilerVersion:pack.contract,primaryMeasureParameterId:'elecor_route_m',parameterDefinitions:[...d.parameters],
  formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input,confirmedParameters:{},
  rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:async value=>estimateDeterministicHash(value)});
}

// Arithmetic fixture only; these values never become parameter/baseline defaults.
export function elecorSingleRouteControlInputR1(){return {
 elecor_route_m:25,elecor_route_scope:pack.exactScopeRu,elecor_route_layout:pack.exactLayoutRu,
 elecor_route_document_reference:'CONTROL_ONLY_NOT_PROJECT_APPROVAL: новый прямой участок25м;13секций,12внутреннихКМС',
 elecor_channel_stock_packages:0,elecor_channel_reserve_packages:0,elecor_channel_supplier_multiple:1,
 elecor_kms_stock_packages:0,elecor_kms_reserve_packages:0,elecor_kms_supplier_multiple:1,
};}
