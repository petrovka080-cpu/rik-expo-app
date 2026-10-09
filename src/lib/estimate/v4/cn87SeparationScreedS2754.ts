import pack from '../../../../data/estimate-benchmarks/source-packs/cn87-separation-screed-s27-54.json';
import accepted from '../../../../data/estimate-norms/professional/screed.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,
 type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const cn87SeparationSourcePackS2754=pack;
const norm=accepted.norm_items.find(item=>item.norm_id===pack.normId);
if(!norm||accepted.source_pack_version!==pack.acceptedPhysicalSourceVersion||norm.rate.value!==100||
 norm.applicability.layer_thickness_mm!==50||norm.rounding.package_size!==25||
 norm.applicability.source_rate_kg_m2_per_mm!==2)throw Error('ACCEPTED_CN87_EXACT_PROFILE_REQUIRED');
export const cn87AcceptedRateS2754=norm.rate.value,cn87AcceptedBagKgS2754=norm.rounding.package_size;
export const cn87SeparationPrefixS2754='cn87:separation-50mm';
const prefix=cn87SeparationPrefixS2754,area='screed_area_m2',consumed=`${area}*${cn87AcceptedRateS2754}`,
 water=`(${consumed})/${cn87AcceptedBagKgS2754}*mix_water_l_per_25kg`,facts=['ready_layer_confirmed','construction_confirmed','conditions_confirmed','joints_confirmed','project_detail_reference'];
const conditional:AutomaticParameterSpec[]=[
 {id:facts[0],title:'Принятая готовность разделительного слоя',valueType:'enum',unitId:null,kind:'conditional',values:[pack.readyLayerValue]},
 {id:facts[1],title:'Подтверждённая конструкция и толщина стяжки',valueType:'enum',unitId:null,kind:'conditional',values:[pack.constructionValue]},
 {id:facts[2],title:'Температура и сухие условия применения CN87',valueType:'enum',unitId:null,kind:'conditional',values:[pack.conditionsValue]},
 {id:facts[3],title:'Принятая схема швов стяжки CN87',valueType:'enum',unitId:null,kind:'conditional',values:[pack.jointsValue]},
 {id:facts[4],title:'Ссылка или номер принятого узла и схемы швов',valueType:'text',unitId:null,kind:'conditional'},
 {id:'mix_water_l_per_25kg',title:'Фактическая дозировка воды на 25 кг смешиваемой CN87: 1,75–2 л',valueType:'decimal',unitId:'l',kind:'conditional',min:pack.water.minLitresPer25Kg,max:pack.water.maxLitresPer25Kg},
 {id:'cn87_stock_kg',title:'Пригодное наличие CN87 в кг',valueType:'decimal',unitId:'kg',kind:'conditional',min:0},
 {id:'cn87_reserve_kg',title:'Сохраняемый резерв CN87 в кг',valueType:'decimal',unitId:'kg',kind:'conditional',min:0},
 {id:'cn87_supplier_bag_multiple',title:'Фактическая кратность поставщика в целых мешках CN87 по 25 кг',valueType:'integer',unitId:'pcs',kind:'conditional',min:1},
 {id:'water_stock_l',title:'Пригодное наличие чистой прохладной воды в л',valueType:'decimal',unitId:'l',kind:'conditional',min:0},
 {id:'water_reserve_l',title:'Сохраняемый резерв воды в л',valueType:'decimal',unitId:'l',kind:'conditional',min:0},
 {id:'water_supply_quantum_l',title:'Фактическая кратность подачи или поставки воды в л',valueType:'decimal',unitId:'l',kind:'conditional',min:0.001},
];
const rows:AutomaticRowSpec[]=[];
const add=(id:string,title:string,operation:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
 rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:operation,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
const mixtureName='Сухая смесь Ceresit CN87 для стяжки 50 мм, мешок 25 кг',mixtureOwner=prefix+':cn87-order',waterOwner=prefix+':water-order',
 mixtureBalance=effectivePurchaseBalanceExpressionsR1({ownerRowId:mixtureOwner,orderUnitId:'kg',consumed,
  stock:'cn87_stock_kg',reserve:'cn87_reserve_kg',quantum:`${cn87AcceptedBagKgS2754}*cn87_supplier_bag_multiple`}),
 waterBalance=effectivePurchaseBalanceExpressionsR1({ownerRowId:waterOwner,orderUnitId:'l',consumed:water,
  stock:'water_stock_l',reserve:'water_reserve_l',quantum:'water_supply_quantum_l'});
add('scope','Объём стяжки 50 мм — справочный контроль без отдельной цены','placing','work','m3',`${area}*0.05`,{costTreatment:'INFORMATIONAL_SCOPE'});
add('cn87-consumed','Чистая потребность: '+mixtureName,'mixing','material','kg',consumed,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:mixtureOwner});
add('cn87-order',mixtureName,'mixing','material','kg',`ceil(max(0,${consumed}+cn87_reserve_kg-cn87_stock_kg)/(${cn87AcceptedBagKgS2754}*cn87_supplier_bag_multiple))*${cn87AcceptedBagKgS2754}*cn87_supplier_bag_multiple`,{procurement:true,...mixtureBalance.owner});
add('cn87-bags','Мешки Ceresit CN87 по 25 кг в фактическом заказе — без второй цены','mixing','material','pcs',`${mixtureBalance.effective}/${cn87AcceptedBagKgS2754}`,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:mixtureOwner});
add('water-min','Нижняя граница воды затворения — справочно, не заказ','mixing','material','l',`(${consumed})/${cn87AcceptedBagKgS2754}*${pack.water.minLitresPer25Kg}`,{costTreatment:'INFORMATIONAL_SCOPE'});
add('water-max','Верхняя граница воды затворения — справочно, не заказ','mixing','material','l',`(${consumed})/${cn87AcceptedBagKgS2754}*${pack.water.maxLitresPer25Kg}`,{costTreatment:'INFORMATIONAL_SCOPE'});
add('water-consumed','Чистая потребность: '+pack.water.nameRu,'mixing','material','l',water,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:waterOwner});
add('water-order',pack.water.nameRu,'mixing','material','l',`ceil(max(0,(${water})+water_reserve_l-water_stock_l)/water_supply_quantum_l)*water_supply_quantum_l`,{procurement:true,...waterBalance.owner});
for(const gap of pack.sourceNeeds){const parameter='open_qty_'+gap.id.replaceAll('-','_');
 conditional.push({id:parameter,title:gap.nameRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});
 add(gap.id,gap.nameRu,gap.operation,gap.category,gap.unitId,parameter);
}
const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
 sourceMetadata:{source_title:'Ceresit CN87: принятое физическое потребление и технология на разделительном слое',source_document_version:pack.source.edition,
  definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
 applicabilityRu:pack.scopeRu,ordinary:[{id:area,title:'Площадь стяжки Ceresit CN87 слоем 50 мм',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.001}],
 profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
export const cn87SeparationDefinitionS2754:AutomaticOwnerDefinition={...built,parameters:built.parameters.map(parameter=>({...parameter,
 required:parameter.required||facts.includes(parameter.parameter_id),truth_metadata:parameter.parameter_id.startsWith('open_qty_')?
 {...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',
  provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},unresolved_norm_reason:'Технология известна, применимые количество/часы и границы цены требуют подтверждённого источника или проекта.'}:
 {...parameter.truth_metadata,source_confirmation_required:false}})),resources:built.resources.map(resource=>{
 const key=resource.row_id.slice(prefix.length+1),gap=pack.sourceNeeds.find(item=>item.id===key),waterRow=key.startsWith('water-'),
  operation=gap?.operation??(key==='scope'?'placing':'mixing');
 const titles:Record<string,string>={mixing:'Затворение смеси CN87',placing:'Укладка стяжки и общий труд',compaction:'Ручное уплотнение',joints:'Краевые и усадочные швы',acceptance:'Контроль влажности и приёмка',protection:'Защита зоны и исполнителя',completion:'Доставка, уборка и упаковка'};
 const {row_sha256:_old,...content}=resource;
 const result={...content,resource_graph:{...resource.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',
  groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':'+operation,operationTitleRu:titles[operation],processOrdinal:operation==='mixing'?10:20,
  completionCriterionRu:'Подтверждены применимый состав, расход, фактический заказ и единственный владелец цены.'},
  publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,brandAndModelRu:null,
   specificationRu:key.startsWith('cn87-')?'Ceresit CN87; мешок 25 кг; готовая цементная смесь; C40/F7, A1fl; приблизительно 2 кг/м²/мм, при 50 мм — 100 кг/м².':
    waterRow?'Чистая прохладная вода; 1,75–2 л на 25 кг фактически смешиваемой сухой массы; фактическая дозировка выбирается внутри диапазона.':null,
   detailsRu:gap?[gap.reasonRu]:waterRow?[pack.water.applicationRu,'Нижняя и верхняя границы справочные; они не суммируются и не закупаются как два материала.']:
    key==='scope'?[pack.scopeRu,'Справочный контроль не заменяет труд и не имеет второй цены.']:
     ['Применение: только выбранная стяжка CN87 50 мм на готовом разделительном слое.',
      'Чистый расход и заказ разделены: фактические наличие, резерв, мешок 25 кг и кратность поставщика. Дополнительный запас по умолчанию не добавлен.',
      'Контактный слой CC81 и грунтовка связанной стяжки в этот узел не входят.']}},
  source_metadata:{...resource.source_metadata,official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,
   sourceRole:gap?'UNRESOLVED_INSTALLATION_QUANTITY':key.endsWith('-order')||key==='cn87-bags'?'DERIVED_PURCHASE_BALANCE':'VERIFIED_MANUFACTURER_PHYSICAL_CONSUMPTION',
   ...(gap?{normativeTrace:[]}:{}),acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,acceptedPhysicalSourceVersion:accepted.source_pack_version,
   approximateConsumption:true,waterNotDerivedFromOrderedBags:true,full_technical_acceptance:false,oldBroadFlooringDefinitionsNotReplaced:true}};
 return {...result,row_sha256:estimateDeterministicHash(result)};
})};
export function compileCn87SeparationS2754(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,
 compilerVersion:pack.contract,primaryMeasureParameterId:area,definition:cn87SeparationDefinitionS2754,submittedParameters:input});}
export function cn87SeparationCompletenessMapS2754(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',
 generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu,pack.acceptedPhysicalSourcePack],
 entries:[{expectedResourceId:'cn87-mixture',operationId:'mixing',category:'material',specification:'Ceresit CN87 25 кг; 50 мм на разделительном слое',
  condition:'EXACT_50MM_READY_SEPARATION_LAYER',sourceId:pack.sourceId,unitId:'kg',quantityRule:'APPROXIMATE_100_KG_PER_M2_ACCEPTED_PROFILE',
  formulaId:prefix+':formula:cn87-consumed',resolution:{kind:'ROW',rowId:prefix+':cn87-consumed'}},
 {expectedResourceId:'mixing-water',operationId:'mixing',category:'material',specification:'Чистая прохладная вода, 1,75–2 л/25 кг фактически смешиваемой CN87',
  condition:'EXPLICIT_ACTUAL_WATER_DOSAGE',sourceId:pack.sourceId,unitId:'l',quantityRule:'ACTUAL_DOSAGE_WITHIN_MANUFACTURER_RANGE_NOT_ORDERED_BAGS',
  formulaId:prefix+':formula:water-consumed',resolution:{kind:'ROW',rowId:prefix+':water-consumed'}},
 ...pack.sourceNeeds.map(gap=>({expectedResourceId:gap.id,operationId:gap.operation,category:gap.category,specification:gap.nameRu,
  condition:'APPLICABLE_TECHNOLOGY_WITH_UNCONFIRMED_QUANTITY_OR_COST_SCOPE',sourceId:pack.sourceId,unitId:gap.unitId,quantityRule:'OPEN_NO_NORM_IN_TDS',
  formulaId:prefix+':formula:'+gap.id,resolution:{kind:'ROW',rowId:prefix+':'+gap.id}}))]};}
