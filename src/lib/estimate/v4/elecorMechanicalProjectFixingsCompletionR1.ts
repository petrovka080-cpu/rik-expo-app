// WORK prospective completion of one existing ELECOR consumer. NOT RUN / NOT ADOPTED.
// IEK supplies the mounting method; only the accepted project schedule supplies the quantity/SKU.
import pack from '../../../../data/estimate-benchmarks/source-packs/elecor-project-mechanical-fixings-completion-r1.json';
import {elecorSingleRouteMaterialDefinitionR1,elecorSingleRouteActiveR1,
 elecorSingleRouteControlInputR1,prefix} from './elecorSingleRouteMaterialR1';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
export const elecorMechanicalProjectFixingsPackR1=pack;
export const elecorMechanicalProjectFixingsOwnerR1=pack.priceOwnerRowId;
const qty=pack.projectQuantityParameterId;
const positive={kind:'greater_than' as const,parameterId:'elecor_route_m',value:0};
const mechanical={kind:'equals' as const,parameterId:'elecor_fixing_method',value:pack.method};
const active={kind:'and' as const,operands:[elecorSingleRouteActiveR1,mechanical]};
type ElecorSourceOnlyOptionsR1=Readonly<{ownedDrillingInventorySourceOnly?:true;wholeOperationProjectFactsSourceOnly?:true;endcapProjectQuantitySourceOnly?:true}>;
export function elecorMechanicalProjectFixingsDefinitionR1(parent:AutomaticOwnerDefinition=elecorSingleRouteMaterialDefinitionR1(),
 options:ElecorSourceOnlyOptionsR1={}):AutomaticOwnerDefinition{
 const old=parent.resources.find(r=>r.row_id===pack.existingNeedRowId);
 const oldFormula=parent.formulas.find(f=>f.formula_id===old?.formula_id);
 const oldParameter=parent.parameters.find(p=>p.parameter_id===pack.legacyUnresolvedQuantityParameterId);
 if(!old||old.unit_id!=='pcs'||old.category!=='material'||old.resource_graph.costTreatment!=='OWN_COST'
  ||oldFormula?.expression_source!==pack.legacyUnresolvedQuantityParameterId||oldParameter?.truth_metadata.value_source_role!=='UNRESOLVED_APPLICATION_NORM')
  throw Error('EXACT_UNRESOLVED_ELECOR_FIXINGS_PREIMAGE_REQUIRED');
 const conditional:AutomaticParameterSpec[]=[];
 const fact=(id:string,title:string,valueType:'decimal'|'integer'|'text'|'enum',unitId:string|null,extra:Partial<AutomaticParameterSpec>={})=>{
  conditional.push({id,title,valueType,unitId,kind:'conditional',requiredWhen:mechanical,...extra});
 };
 fact('elecor_fixing_method','Принятый способ крепления ELECOR по ППР','enum',null,{values:[pack.method,pack.unresolvedMethod],requiredWhen:positive});
 fact('elecor_fixing_installation_environment_acceptance','ППР подтверждает стеновой монтаж при +5…+60°C без агрессивных жидкостей','enum',null,{values:[pack.installationEnvironmentAcceptance]});
 fact('elecor_fixing_schedule_acceptance','Проверенная ведомость точек крепления этого участка','enum',null,{values:[pack.layoutAcceptance]});
 fact('elecor_fixing_ppr_reference','ППР: документ, редакция, лист, строка точек и узла крепления','text',null);
 fact('elecor_fixing_schedule_route_m','Длина участка в принятой ведомости ППР, м','decimal','m',
  {min:0.001,numericPeerConstraints:{equalToParameter:'elecor_route_m'}});
 fact(qty,'Количество точек по принятой ведомости ППР — не норма на метр','integer','pcs',{min:1});
 fact('elecor_fixing_max_interpoint_m','Наибольшее расстояние между точками по принятой ведомости ППР, м','decimal','m',{min:0,max:1});
 fact('elecor_fixing_product_sku','Комплект DuoPower 6 × 30 с винтом Panhead 4,5 × 40, артикул 535463','enum',null,{values:[pack.fixedProduct.article]});
 fact('elecor_fixing_project_node_acceptance','ППР принимает бетонную стену, узел, нагрузку, головку/отверстие и полный состав','enum',null,{values:[pack.projectNodeAcceptance]});
 fact('elecor_fixing_attachment_thickness_m','Толщина закрепляемого элемента по узлу ППР, м','decimal','m',{min:0,max:0.006});
 fact('elecor_fixing_complete_unit_acceptance','Одна штука поставки — одно комплектное изделие на одну точку ППР','enum',null,{values:[pack.skuUnitAcceptance]});
 fact('elecor_fixing_price_scope','Цена только комплектного материала крепления','enum',null,{values:[pack.priceScope]});
 for(const [id,title,min]of [['elecor_fixing_stock_pcs','Пригодное наличие точного SKU, шт.',0],
  ['elecor_fixing_reserve_pcs','Сохранить пригодного точного SKU после работ, шт.',0],
  ['elecor_fixing_supplier_box_multiple','Фактическая кратность поставщика в заводских коробках по 50 комплектов',1]]as const)
  fact(id,title,'integer',id.endsWith('box_multiple')?'item':'pcs',{min});
 fact('elecor_fixing_stock_reference','Ведомость пригодного наличия именно выбранного SKU/узла','text',null,
  {requiredWhen:{kind:'and',operands:[mechanical,{kind:'greater_than',parameterId:'elecor_fixing_stock_pcs',value:0}]}});
 const facts=[...pack.projectFactsRequired,'elecor_fixing_stock_reference','elecor_route_scope','elecor_route_layout','elecor_route_document_reference'];
 // The local extension builder validates every row input. Declare the three
 // existing parent facts here, then keep their original definitions below.
 const parentIds=new Set(parent.parameters.map(p=>p.parameter_id));
 const parentFacts:AutomaticParameterSpec[]=['elecor_route_scope','elecor_route_layout','elecor_route_document_reference'].map(id=>{
  const p=parent.parameters.find(value=>value.parameter_id===id);
  if(!p||!['enum','text'].includes(p.value_type)||p.unit_id!==null)throw Error('EXACT_ELECOR_PARENT_PROJECT_FACT_REQUIRED:'+id);
  return {id,title:p.title_ru,valueType:p.value_type as 'enum'|'text',unitId:null,kind:'conditional',requiredWhen:positive,
   ...(p.value_type==='enum'?{values:p.constraints_json?.values as readonly string[]}:{}),};
 });
 // Project quantities are not declared as manufacturer consumption or as professional labour norms.
 const b=effectivePurchaseBalanceExpressionsR1({ownerRowId:pack.priceOwnerRowId,orderUnitId:'pcs',consumed:qty,
  stock:'elecor_fixing_stock_pcs',reserve:'elecor_fixing_reserve_pcs',quantum:'(50*elecor_fixing_supplier_box_multiple)',manualQuantumViolationPolicy:'retain-raw-and-block-quantum'});
 const rows:AutomaticRowSpec[]=[];
 const add=(suffix:string,title:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
  rowId:prefix+':'+suffix,formulaId:prefix+':formula:'+suffix,title,unitId:'pcs',expression,
  category:'material',section:'Крепление ELECOR по принятому ППР',procurement:false,
  costTreatment:'INFORMATIONAL_SCOPE',inclusion:active,inputParameterIds:facts,...extra});
 add('fixings-consumed','Комплектные крепёжные изделия в точках по ведомости ППР',qty);
 add('fixings-535463-order',pack.publicOwnerSourceTitleRu,
  `ceil(max(0,${qty}+elecor_fixing_reserve_pcs-elecor_fixing_stock_pcs)/(50*elecor_fixing_supplier_box_multiple))*(50*elecor_fixing_supplier_box_multiple)`,
  {...b.owner,costTreatment:'OWN_COST',procurement:true});
 add('fixings-remaining','Пригодный остаток точного крепёжного SKU после работ',b.remaining,{purchaseBalanceOwnerRowId:pack.priceOwnerRowId});
 add('fixings-free','Свободный остаток точного крепёжного SKU сверх резерва',b.free,{purchaseBalanceOwnerRowId:pack.priceOwnerRowId});
 add('fixings-consumption-shortage','Нехватка комплектного крепежа для принятого ППР',b.consumptionShortage,{purchaseBalanceOwnerRowId:pack.priceOwnerRowId});
 add('fixings-reserve-deficit','Непокрытый сохраняемый резерв точного крепёжного SKU',b.reserveDeficit,{purchaseBalanceOwnerRowId:pack.priceOwnerRowId});
 const extension=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,
  normId:'PROJECT_FIXING_SCHEDULE_NOT_MANUFACTURER_OR_LABOUR_NORM',
  sourceMetadata:{source_title:'IEK ELECOR CKK10.001.1 edition8 + подтверждённый ППР узла/точек',
   source_document_version:'CKK10.001.1 edition8',definition_hash:pack.officialPassport.sha256,
   exact_locator:pack.officialPassport.locatorRu,artifact_sha256:pack.officialPassport.sha256},
  applicabilityRu:pack.scopeRu,ordinary:[{id:'elecor_route_m',title:'Длина прямого участка ELECOR, м',kind:'ordinary',valueType:'decimal',unitId:'m',min:0.001}],
  profile:[],conditional:[...parentFacts,...conditional],rows,deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:['Нет нормы часов из метража/шага/числа точек.','Рекомендация до 1 м не является автоматическим шагом или количеством.',
   'Не рассчитаны клей/лента/смешанный крепёж и проектное отступление от рекомендации.','Состав крепления не включает труд, инструмент, доступ, доставку.']});
 const extensionParams=extension.parameters.filter(p=>!parentIds.has(p.parameter_id)).map(p=>p.truth_metadata.visibility_role==='INTERNAL_ONLY'?p:{...p,
  ...(['elecor_fixing_attachment_thickness_m','elecor_fixing_max_interpoint_m'].includes(p.parameter_id)?{constraints_json:{...p.constraints_json,exclusiveMin:0}}:{}),
  truth_metadata:{...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   visible_when:p.parameter_id==='elecor_fixing_method'?positive:p.parameter_id==='elecor_fixing_stock_reference'?
    {kind:'and',operands:[mechanical,{kind:'greater_than',parameterId:'elecor_fixing_stock_pcs',value:0}]}:mechanical,
   guide:{...(p.truth_metadata.guide as Record<string,unknown>),guide_short_ru:p.parameter_id===qty?
    'Перенесите число точек из принятой ведомости ППР. Длина участка и рекомендация шага не задают это число.':p.title_ru},
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},fullTechnicalAcceptance:false}});
 const parameters=[...parent.parameters,...extensionParams.map((p,i)=>({...p,ordinal:parent.parameters.length+i}))];
 const resources=extension.resources.map(r=>{const {row_sha256:_hash,...body}=r;const value={...body,
  resource_graph:{...r.resource_graph,fullTechnicalAcceptance:false,
   ...(r.row_id===pack.priceOwnerRowId?{publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
    sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:'fischer DuoPower 6 × 30, 535463 + Panhead 4,5 × 40',
    specificationRu:pack.publicOwnerSpecificationRu,detailsRu:[pack.scopeRu,pack.publicOwnerSpecificationRu,
     'Количество точек только из принятой ведомости ППР. Труд, инструмент, доступ, приёмка и доставка этим материалом не оплачены.']}}:{}),
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:'Монтаж кабель-канала ELECOR',
    operationId:'project-mechanical-fixings',operationTitleRu:'Крепление по принятому ППР',processOrdinal:30,
    completionCriterionRu:'Точный материал в точках принятой ведомости ППР; труд и другие обязательства не закрыты.'}},
  source_metadata:{...r.source_metadata,sourceRole:'MANUFACTURER_METHOD_WITH_EXACT_PROJECT_QUANTITY_AND_NODE_NOT_NORM',
   normativeTrace:[],manufacturerConsumptionRateNotClaimed:true,labourNormAccepted:false,
   sourceNormQuantityAccepted:false,sourceProjectQuantityAcceptedOnlyWithRequiredFacts:true,
   recommendedMaximumSpacingNotDefault:true,materialOnly:true,automaticGenericPriceInheritanceAllowed:false,
   projectSkuParameterId:'elecor_fixing_product_sku',projectPprParameterId:'elecor_fixing_ppr_reference',
   supplyPriceScope:pack.priceScope,publicationAllowed:false,sourceEvidence:[pack.officialPassport,pack.fixedProduct.source],fixedManufacturer:pack.fixedProduct.manufacturer,fixedProductArticle:pack.fixedProduct.article,fixedProductGtin:pack.fixedProduct.gtin}};
  return {...value,row_sha256:estimateDeterministicHash(value)};});
 const reordinal=(r:typeof resources[number],ordinal:number)=>{const {row_sha256:_sha,...body}=r;const value={...body,ordinal};return {...value,row_sha256:estimateDeterministicHash(value)};};
 // Keep the old source-unknown parameter and its need row: the accepted mechanical
 // source branch is explicit, not a manual zero, new norm or same-row paid migration.
 const {row_sha256:_oldSha,...oldBody}=old;
 const oldNeedBody={...oldBody,inclusion_ast:{kind:'and',operands:[old.inclusion_ast,
  {kind:'equals',parameterId:'elecor_fixing_method',value:pack.unresolvedMethod}]},
  resource_graph:{...old.resource_graph,derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',
   mode:'PARAMETERS_ONLY',unitId:'pcs',parameterIds:[pack.legacyUnresolvedQuantityParameterId],
   reasonRu:'Старое неизвестное нормативное количество крепежа нельзя превратить в заказ ручным числом. Нужна проверенная ведомость ППР и отдельный exact-SKU owner.'}},
  source_metadata:{...old.source_metadata,completionNeedTransitionV1:{featureContract:pack.contract,
   selectedMethodParameterId:'elecor_fixing_method',resolvedOnlyForMethod:pack.method,
   resolvedThroughPaidOwnerRowId:pack.priceOwnerRowId,automaticLegacyPriceOrQuantityTransferAllowed:false}}};
 const retainedOldNeed={...oldNeedBody,row_sha256:estimateDeterministicHash(oldNeedBody)};
 const completed={...parent,parameters,formulas:[...parent.formulas,...extension.formulas],
  resources:[...parent.resources.map(r=>r.row_id===old.row_id?retainedOldNeed:r),
   ...resources.map((r,i)=>reordinal(r,parent.resources.length+i))]};
 const withDrilling=options.ownedDrillingInventorySourceOnly===true?appendElecorOwnedDrillingInventorySourceOnlyR1(completed):completed;
 const withWhole=options.wholeOperationProjectFactsSourceOnly===true?appendElecorWholeProjectOperationSourceOnlyR1(withDrilling):withDrilling;
 return options.endcapProjectQuantitySourceOnly===true?appendElecorEndcapProjectQuantitySourceOnlyR1(withWhole):withWhole;
}
export function compileElecorMechanicalProjectFixingsR1(input:Record<string,unknown>,rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'],
 options:ElecorSourceOnlyOptionsR1={}){
 const d=elecorMechanicalProjectFixingsDefinitionR1(undefined,options);
 return compileCanonicalEstimateCore({operation:rowOverrides?'recalculate':'compile',catalogId:pack.catalogId,compilerVersion:pack.contract,
  primaryMeasureParameterId:'elecor_route_m',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:input,confirmedParameters:{},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,
  hashJson:async value=>estimateDeterministicHash(value)});
}
export function elecorMechanicalProjectFixingsControlInputR1(){return{...elecorSingleRouteControlInputR1(),
 elecor_fixing_method:pack.method,elecor_fixing_installation_environment_acceptance:pack.installationEnvironmentAcceptance,elecor_fixing_schedule_acceptance:pack.layoutAcceptance,
 elecor_fixing_ppr_reference:'CONTROL_ONLY_NOT_REAL_PPR: sheetM1 revC, route25m, schedule38points, nodeF1',
 elecor_fixing_schedule_route_m:25,elecor_fixing_ppr_point_count:38,elecor_fixing_max_interpoint_m:0.8,
 elecor_fixing_product_sku:pack.fixedProduct.article,
 elecor_fixing_project_node_acceptance:pack.projectNodeAcceptance,elecor_fixing_attachment_thickness_m:0.002,
 elecor_fixing_complete_unit_acceptance:pack.skuUnitAcceptance,elecor_fixing_price_scope:pack.priceScope,
 elecor_fixing_stock_pcs:0,elecor_fixing_reserve_pcs:0,elecor_fixing_supplier_box_multiple:1};}


// Partial physical capability of this existing ELECOR mechanical operation.
// Never replaces the seven whole-installation needs or changes default Configs.
function appendElecorOwnedDrillingInventorySourceOnlyR1(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 const own='elecor_owned_drilling_',p=prefix+':owned-drilling',count=own+'usable_kits';
 const choice='Собственный пригодный сверлильный блок по ведомости';
 const fit='Ведомость подтверждает весь перечисленный состав каждого блока, пригодность и выделение на этот участок';
 const selected={kind:'selected',parameterId:own+'method',value:choice};
 const required={kind:'equals' as const,parameterId:own+'method',value:choice};
 const facts=[count,own+'inventory_reference',own+'fit'];
 const roles=[['body','Сетевой перфоратор: основной блок'],['sds-chuck','Патрон SDS plus'],
  ['auxiliary-handle','Дополнительная рукоятка'],['depth-stop','Ограничитель глубины'],
  ['spare-chuck','Сменный патрон для цилиндрического хвостовика'],['cloth','Салфетка обслуживания'],
  ['case','Кейс сверлильного оснащения']] as const;
 const conditional:AutomaticParameterSpec[]=[
   {id:own+'method',title:'Источник начального сверлильного оснащения',kind:'conditional',valueType:'enum',unitId:null,
    values:[choice,'Оснащение пока не подтверждено']},
   {id:count,title:'Фактическое число выделенных целых пригодных сверлильных блоков',kind:'conditional',valueType:'integer',unitId:'set',min:1,requiredWhen:required},
   {id:own+'inventory_reference',title:'Ведомость начального состава, состояния и выделения сверлильного оснащения',kind:'conditional',valueType:'text',unitId:null,requiredWhen:required},
   {id:own+'fit',title:'Подтверждён ли весь перечисленный начальный состав блока?',kind:'conditional',valueType:'enum',unitId:null,values:[fit],requiredWhen:required}];
 const rows:AutomaticRowSpec[]=roles.map(([key,title])=>({rowId:p+':'+key,formulaId:p+':formula:'+key,section:'Собственное сверлильное оснащение',
   category:'equipment',title,unitId:'piece',expression:count,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false,
   inputParameterIds:facts,inclusion:required}));
 const fragmentDefinition={contract:'electrical.elecor-owned-drilling-capability/source-only-r1',semanticOwner:pack.catalogId,
  sourceId:'bosch_gbh2_26f_06112a4000_owned_drilling_capability_source_only_r1',normId:'DECLARED_OWNED_INITIAL_DRILLING_BLOCK_NOT_LABOUR_OR_TOOL_RATE',conditional,rows};
 const built=buildAutomaticConstructionOwnerR1({...fragmentDefinition,
  sourceMetadata:{definition_hash:estimateDeterministicHash(fragmentDefinition),source_title:'Начальный состав сверлильного блока: предметная ссылка производителя',
   source_document_version:'Official HTML server-text witness 2026-10-26',artifact_sha256:'587c3f1cdc231b3773444dc862d4907db968cc51fd33bbabf1613f50792a9fd6',
   exact_locator:'Exact06112A4000 supplied roles and230V/SDSplus/concrete4-26mm; no wear or labour norm'},
  applicabilityRu:'Только заявленный собственный начальный сверлильный блок принятого механического узла ELECOR. Остальное оснащение и все семь обязательств полного монтажа остаются открыты.',
  ordinary:[],profile:[],deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:['Бур, пылеудаление, защита, проверка скрытых коммуникаций и рабочего питания не подтверждены.',
   'Нет ресурса буров, расхода смазки, времени аренды, нормы труда или выполненной приёмки.']});
 const parameters=built.parameters.map((q,i)=>({...q,ordinal:parent.parameters.length+i,default_value:null,
  truth_metadata:{...q.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'USER_INPUT',source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{guide_kind:'PROJECT_DEFINED',source_role:'DECLARED_INVENTORY_REQUIRES_SERVER_BINDING',
    source_document:'bosch_gbh2_26f_06112a4000_owned_drilling_capability_source_only_r1',source_locator:'Actual inventory allocation only'},
   projectAuthenticated:false,sourceAuthorityPromoted:false}}));
 const parentIds=new Set(parent.parameters.map(q=>q.parameter_id));
 if(parameters.some(q=>parentIds.has(q.parameter_id))||built.resources.some(r=>parent.resources.some(old=>old.row_id===r.row_id))
  ||built.formulas.some(f=>parent.formulas.some(old=>old.formula_id===f.formula_id)))throw Error('ELECOR_OWNED_DRILLING_ID_COLLISION');
 const owner=parent.resources.find(r=>r.row_id===pack.priceOwnerRowId),wholeToolNeed=parent.resources.find(r=>r.row_id===prefix+':open-tools');
 const main=owner?.resource_graph.operationCompositionV1,completion=wholeToolNeed?.resource_graph.operationCompositionV1;
 if(!main||typeof main!=='object'||Array.isArray(main)||!completion||typeof completion!=='object'||Array.isArray(completion))
  throw Error('ELECOR_OWNED_DRILLING_ACTUAL_EXISTING_OPERATIONS_REQUIRED');
 const operation=main as Record<string,unknown>,related=completion as Record<string,unknown>;
 if(operation.groupId!==prefix||operation.operationId!=='project-mechanical-fixings'||related.groupId!==prefix||related.operationId!=='completion')
  throw Error('ELECOR_OWNED_DRILLING_EXACT_EXISTING_OPERATION_IDS');
 const active={kind:'and',operands:[elecorSingleRouteActiveR1,mechanical,selected,{kind:'selected',parameterId:own+'fit',value:fit},
  {kind:'greater_than',parameterId:count,value:0},{kind:'present',parameterId:own+'inventory_reference'}]};
 const resources=built.resources.map((r,i)=>{const {row_sha256:_old,...body}=r;
  const next={...body,ordinal:parent.resources.length+i,inclusion_ast:active,cost_owner_id:null,procurement_eligible:false,
   resource_graph:{...r.resource_graph,operationCompositionV1:{...operation,additionalOperations:[related]},
    sourceCandidateOnlyV1:{sourceAuthorityPromoted:false,projectAuthenticated:false,publicationAllowed:false},
    derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'piece',parameterIds:[count],
     reasonRu:'Количество задаётся ведомостью целых выделенных собственных блоков; длина трассы и число отверстий его не определяют.'},
    physicalProvisionV1:{basis:'DECLARED_ACTUAL_OWNED_INITIAL_DRILLING_BLOCK',actualInventoryParameterId:count,inventoryMultiplier:1,
     manufacturerProfile:'Bosch GBH2-26F06112A4000,230V,SDSplus,concrete4-26mm',wholeToolKitClaimed:false,
     compatibleDrillBitClaimed:false,dustExtractionClaimed:false,actualInventoryAuthenticated:false,newPurchaseClaimed:false,
     rentalDurationClaimed:false,consumptionOrWearNormClaimed:false},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
     brandAndModelRu:null,specificationRu:null,detailsRu:[]}},
   source_metadata:{...r.source_metadata,normativeTrace:[],sourceRole:'CLOUD_PRIMARY_INITIAL_DRILLING_CAPABILITY_NOT_COMPLETE_TOOL_PROVISION',
    primaryCapabilityWitness:{path:'data/estimate-benchmarks/source-artifacts/elecor-owned-drilling-capability-r1/BOSCH_06112A4000_CLOUD_PRIMARY_TEXT_R1.txt',sha256:'587c3f1cdc231b3773444dc862d4907db968cc51fd33bbabf1613f50792a9fd6',representationKind:'BOUNDED_CLOUD_PRIMARY_HTML_TEXT_NOT_RAW_HTML',
     officialUrl:'https://www.bosch-professional.com/it/it/products/gbh-2-26-f-06112A4000',rawRemoteArtifactSha256:null},
    unresolvedWholeProvision:['compatible-bit-and-bit-renewal','dust-extraction-and-protection','hidden-service-clearance',
     'actual-power-and-plug','condition-maintenance','cutting-and-other-mounting-tools','whole-installation-seven-retained-needs'],
    sourceAuthorityPromoted:false,projectAuthenticated:false,publicationAllowed:false,actualDrillingOrAcceptanceProved:false,
    automaticGenericPriceInheritanceAllowed:false,full_technical_acceptance:false}};
  return {...next,row_sha256:estimateDeterministicHash(next)};});
 const combined={...parent,parameters:[...parent.parameters,...parameters],formulas:[...parent.formulas,...built.formulas],resources:[...parent.resources,...resources]};
 const consumers=buildMasterParameterCalculationConsumers(combined);
 return {...combined,parameters:combined.parameters.map(q=>({...q,truth_metadata:{...q.truth_metadata,
  formula_consumers:consumers.formulaConsumers[q.parameter_id],resource_branch_consumers:consumers.resourceConsumers[q.parameter_id]}}))};
}


/** Actual declared PPR scope replaces no source norm and accepts no project.
 * One whole-labour row serves every using operation; QA is included in it. */
function appendElecorWholeProjectOperationSourceOnlyR1(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 const f='elecor_whole_post_',p=prefix+':whole-post';
 const method='Полный труд и проверки прямого участка по фактическому ППР';
 const fit='ППР принимает подготовку, раскрой, крепление и закрытие канала, проверки и завершение; материалы, инструмент и доступ обеспечиваются отдельно';
 const scope='Только общий труд всех указанных операций; без повторной оплаты материалов, инструмента, доступа и внешних услуг';
 const selected={kind:'selected',parameterId:f+'method',value:method};
 const required={kind:'equals' as const,parameterId:f+'method',value:method};
 const conditional:AutomaticParameterSpec[]=[
  {id:f+'method',title:'Полный монтажный труд по фактическому ППР',kind:'conditional',valueType:'enum',unitId:null,values:[method,'Полный пост пока не подтверждён']},
  {id:f+'scope_fit',title:'Принят ли состав операций и обеспечен ли безопасный фронт?',kind:'conditional',valueType:'enum',unitId:null,values:[fit],requiredWhen:required},
  {id:f+'ppr_reference',title:'ППР: документ, редакция, участок и ведомость общего труда',kind:'conditional',valueType:'text',unitId:null,requiredWhen:required},
  {id:f+'labour_hours',title:'Фактический общий труд всех указанных операций по ППР',kind:'conditional',valueType:'decimal',unitId:'man_hour',min:0.000001,requiredWhen:required},
  {id:f+'qa_count',title:'Фактическое число проверок по принятой программе',kind:'conditional',valueType:'integer',unitId:'test',min:1,requiredWhen:required},
  {id:f+'qa_program_reference',title:'Программа проверок и передачи результатов: документ и позиции',kind:'conditional',valueType:'text',unitId:null,requiredWhen:required},
  {id:f+'price_scope',title:'Граница цены общего труда',kind:'conditional',valueType:'enum',unitId:null,values:[scope],requiredWhen:required},
  ...(['delivery','waste'] as const).flatMap(key=>[
   {id:f+key+'_trips',title:key==='delivery'?'Фактические рейсы внешней доставки':'Фактические рейсы внешнего вывоза',kind:'conditional' as const,
    valueType:'integer' as const,unitId:'trip',min:0,requiredWhen:required},
   {id:f+key+'_scope_reference',title:key==='delivery'?'Документ внешней доставки: состав услуги без повторной оплаты труда и материалов':'Документ вывоза: состав, упаковка/ёмкости и приём отходов без повторной оплаты труда',
    kind:'conditional' as const,valueType:'text' as const,unitId:null,
    requiredWhen:{kind:'and' as const,operands:[required,{kind:'greater_than' as const,parameterId:f+key+'_trips',value:0}]}}])];
 const facts=[f+'scope_fit',f+'ppr_reference',f+'labour_hours',f+'qa_count',f+'qa_program_reference',f+'price_scope'];
 const rows:AutomaticRowSpec[]=[
  {rowId:p+':whole-labour',formulaId:p+':formula:whole-labour',section:'Полный монтажный пост по ППР',category:'labor',title:'Общий труд монтажа кабель-канала',
   unitId:'man_hour',expression:f+'labour_hours',costTreatment:'OWN_COST',procurement:false,inputParameterIds:facts,inclusion:required},
  {rowId:p+':qa-included',formulaId:p+':formula:qa-included',section:'Проверки в составе общего труда',category:'work',title:'Проверки монтажа по принятой программе',
   unitId:'test',expression:f+'qa_count',costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,inputParameterIds:facts,inclusion:required},
  ...(['delivery','waste'] as const).map(key=>({rowId:p+':'+key,formulaId:p+':formula:'+key,section:'Внешние услуги по ППР',category:'service',
   title:key==='delivery'?'Внешняя доставка материалов':'Внешний вывоз упаковки и отходов',unitId:'trip',expression:f+key+'_trips',
   costTreatment:'OWN_COST' as const,procurement:true,inputParameterIds:[...facts,f+key+'_scope_reference'],
   inclusion:{kind:'and' as const,operands:[required,{kind:'greater_than' as const,parameterId:f+key+'_trips',value:0}]}}))];
 const fragmentDefinition={contract:'electrical.elecor-whole-project-operation/source-only-r1',semanticOwner:pack.catalogId,
  sourceId:'elecor_same_owner_declared_ppr_whole_operation_source_only_r1',normId:'DECLARED_ACTUAL_PPR_LABOUR_AND_SERVICES_NOT_CONSUMPTION_NORM',conditional,rows};
 const built=buildAutomaticConstructionOwnerR1({...fragmentDefinition,
  sourceMetadata:{definition_hash:estimateDeterministicHash(fragmentDefinition),
   // Existing genuine method artifact only; no actual project-document hash is claimed.
   artifact_sha256:pack.officialPassport.sha256,source_title:'Фактический ППР существующего прямого участка; нормы часов не заданы',source_document_version:'PROJECT_DOCUMENT_REQUIRED',
   exact_locator:'IEK edition8 and exact project mechanical node for method only; hours, QA and services are separate actual project facts'},
  applicabilityRu:'Тот же прямой участок и принятый механический узел ELECOR; один владелец общего труда, проверки включены, внешние услуги только по отдельным фактам.',
  ordinary:[],profile:[],deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:['Норма труда, число проверок и рейсов из метров/отверстий не выводятся.','Узлы окончания, всё оснащение и доступ/защита не закрыты.']});
 const oldIds=new Set(parent.parameters.map(q=>q.parameter_id));
 if(built.parameters.some(q=>oldIds.has(q.parameter_id))||built.resources.some(r=>parent.resources.some(old=>old.row_id===r.row_id))
  ||built.formulas.some(g=>parent.formulas.some(old=>old.formula_id===g.formula_id)))throw Error('ELECOR_WHOLE_PROJECT_ID_COLLISION');
 const knownExternal=(key:'delivery'|'waste')=>({kind:'or',operands:[{kind:'equals',parameterId:f+key+'_trips',value:0},
  {kind:'and',operands:[{kind:'greater_than',parameterId:f+key+'_trips',value:0},{kind:'present',parameterId:f+key+'_scope_reference'}]}]});
 const active={kind:'and',operands:[elecorSingleRouteActiveR1,mechanical,selected,{kind:'selected',parameterId:f+'scope_fit',value:fit},
  {kind:'selected',parameterId:f+'price_scope',value:scope},{kind:'greater_than',parameterId:f+'labour_hours',value:0},
  {kind:'greater_than',parameterId:f+'qa_count',value:0}]};
 const coverage={kind:'and',operands:[active,{kind:'present',parameterId:f+'ppr_reference'},
  {kind:'present',parameterId:f+'qa_program_reference'},knownExternal('delivery'),knownExternal('waste'),
  ...['elecor_fixing_installation_environment_acceptance','elecor_fixing_schedule_acceptance','elecor_fixing_ppr_reference',
   'elecor_fixing_schedule_route_m','elecor_fixing_ppr_point_count','elecor_fixing_max_interpoint_m','elecor_fixing_product_sku',
   'elecor_fixing_project_node_acceptance','elecor_fixing_attachment_thickness_m','elecor_route_document_reference'].map(parameterId=>({kind:'present',parameterId}))]};
 const actualFix=parent.resources.find(r=>r.row_id===pack.priceOwnerRowId)?.resource_graph.operationCompositionV1;
 const actualCompletion=parent.resources.find(r=>r.row_id===prefix+':open-tools')?.resource_graph.operationCompositionV1;
 if(!actualFix||typeof actualFix!=='object'||Array.isArray(actualFix)||!actualCompletion||typeof actualCompletion!=='object'||Array.isArray(actualCompletion))
  throw Error('ELECOR_WHOLE_PROJECT_EXISTING_OPERATION_REQUIRED');
 const operation=(id:string,title:string,ordinal:number)=>({contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:'Монтаж кабель-канала',
  operationId:id,operationTitleRu:title,processOrdinal:ordinal,processRole:'PROCESS',completionCriterionRu:'Операция и фактические ресурсы принимаются по ППР; сама строка труда не доказывает выполнение или допуск.'});
 const ops=[operation('ppr-readback','Подготовка и разметка участка',10),operation('ppr-cut-and-prepare','Раскрой и подготовка канала',15),
  actualFix as Record<string,unknown>,operation('ppr-close-covers','Установка и закрытие крышек',35),operation('ppr-qa','Проверки монтажа и передача результатов',37),actualCompletion as Record<string,unknown>];
 const parameters=built.parameters.map((q,i)=>({...q,ordinal:parent.parameters.length+i,default_value:null,
  truth_metadata:{...q.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{guide_kind:'PROJECT_DEFINED',source_role:'ACTUAL_PPR_OBJECT_FACT_NOT_APPLICATION_NORM',
    source_document:'elecor_same_owner_declared_ppr_whole_operation_source_only_r1',source_locator:q.title_ru},projectAuthenticated:false,sourceAuthorityPromoted:false}}));
 const replacement=new Set(['installation-labour','acceptance','delivery-handling','cleanup-disposal'].map(k=>prefix+':open-'+k));
 // Reuse the real application-owned needs at their using operations. Their
 // unknown norm, original row/editor, quantity, price and cost owner stay put.
 // Related displays require the whole-labour row to exist in the calculated
 // projection, so selecting no whole method does not create a fictitious cut.
 const needUses=new Map([
  [prefix+':open-tools',[ops[1]!,ops[2]!,ops[3]!]],
  [prefix+':open-access-protection',[ops[0]!,ops[1]!,ops[2]!,ops[3]!,ops[4]!]],
  [prefix+':open-end-node-components',[ops[3]!]],
 ]);
 if([...needUses.keys()].some(id=>!parent.resources.some(r=>r.row_id===id)))throw Error('ELECOR_WHOLE_EXISTING_THREE_UNKNOWN_NEEDS_REQUIRED');
 const retained=parent.resources.map(r=>{
  const needs=needUses.get(r.row_id);
  if(!replacement.has(r.row_id)&&!needs)return r;
  const {row_sha256:_old,...body}=r;
  const references=canonicalEstimateOperationReferences(r.resource_graph.operationCompositionV1);
  const primary=references[0];
  if(needs&&(!primary||primary.groupId!==prefix))throw Error('ELECOR_WHOLE_EXISTING_NEED_OPERATION_REQUIRED:'+r.row_id);
  const related=[...references.slice(1),...(needs??[]).flatMap(op=>canonicalEstimateOperationReferences({
   ...op,whenResourcePresent:[p+':whole-labour']}))];
  const seen=new Set(primary?[primary.operationId]:[]);
  const distinct=related.filter(op=>{if(op.groupId!==prefix||seen.has(op.operationId))return false;seen.add(op.operationId);return true;});
  const next={...body,
   ...(replacement.has(r.row_id)?{inclusion_ast:{kind:'and',operands:[r.inclusion_ast,{kind:'not',operand:coverage}]}}:{}),
   ...(needs?{resource_graph:{...r.resource_graph,operationCompositionV1:{...primary,additionalOperations:distinct}}}:{})};
  return {...next,row_sha256:estimateDeterministicHash(next)};});
 const added=built.resources.map((r,i)=>{const key=r.row_id.slice(p.length+1),qa=key==='qa-included';
  const using=key==='whole-labour'?ops:key==='qa-included'?[ops[4]!]:[operation('ppr-external-'+key,key==='delivery'?'Внешняя доставка':'Внешний вывоз',key==='delivery'?50:60)];
  const {row_sha256:_old,...body}=r;const next={...body,ordinal:parent.resources.length+i,inclusion_ast:{kind:'and',operands:[active,r.inclusion_ast]},
   cost_owner_id:qa?p+':whole-labour':r.cost_owner_id,resource_graph:{...r.resource_graph,
    inputParameterIds:[...new Set([...(r.resource_graph.inputParameterIds as string[]),
     'elecor_fixing_installation_environment_acceptance','elecor_fixing_schedule_acceptance','elecor_fixing_ppr_reference',
     'elecor_fixing_schedule_route_m','elecor_fixing_ppr_point_count','elecor_fixing_max_interpoint_m','elecor_fixing_product_sku',
     'elecor_fixing_project_node_acceptance','elecor_fixing_attachment_thickness_m','elecor_route_document_reference'])],
    sourceCandidateOnlyV1:{sourceAuthorityPromoted:false,projectAuthenticated:false,publicationAllowed:false},
    operationCompositionV1:{...using[0],additionalOperations:using.slice(1)},
    ...(qa?{parentCostOwnerId:p+':whole-labour',includedInResourceOwnerRowId:p+':whole-labour'}:{}),
    derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,
     parameterIds:built.formulas.find(g=>g.formula_id===r.formula_id)!.input_parameter_ids,reasonRu:'Количество переносится из фактического ППР; длина трассы не является нормой часов, проверок или рейсов.'},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
     brandAndModelRu:null,specificationRu:null,detailsRu:[]}},source_metadata:{...r.source_metadata,normativeTrace:[],
    sourceRole:'DECLARED_ACTUAL_PPR_SCOPE_NOT_MANUFACTURER_CONSUMPTION_OR_AUTHENTICATED_PROJECT',manufacturerLabourNormAuthored:false,
    priceNonoverlapAuthenticated:false,actualOperationOrAcceptanceProved:false,automaticGenericPriceInheritanceAllowed:false,
    projectAuthenticated:false,sourceAuthorityPromoted:false,publicationAllowed:false,full_technical_acceptance:false}};
  return {...next,row_sha256:estimateDeterministicHash(next)};});
 const combined={...parent,parameters:[...parent.parameters,...parameters],formulas:[...parent.formulas,...built.formulas],resources:[...retained,...added]};
 const consumers=buildMasterParameterCalculationConsumers(combined);
 return {...combined,parameters:combined.parameters.map(q=>({...q,truth_metadata:{...q.truth_metadata,
  formula_consumers:consumers.formulaConsumers[q.parameter_id],resource_branch_consumers:consumers.resourceConsumers[q.parameter_id]}}))};
}


/** A compatible endcap component of this existing straight route only.
 * Endpoint demand and supplier quantum are independent actual facts. Keeping
 * the old end-node need prevents a single accessory from claiming all nodes. */
function appendElecorEndcapProjectQuantitySourceOnlyR1(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 const f='elecor_endcap_',p=prefix+':endcap',owner=p+':order';
 const method='Концевые заглушки 60 × 40 по фактической ведомости торцов';
 const fit='ППР принимает белую заглушку КМЗ 60 × 40 для каждого указанного закрытого торца данного прямого участка; остальные примыкания и узлы не закрыты';
 const priceScope='Цена только одной физической заглушки, без канала, крепежа, труда и остальных узлов';
 const selected={kind:'equals' as const,parameterId:f+'method',value:method};
 const conditional:AutomaticParameterSpec[]=[
  {id:f+'method',title:'Обеспечение торцов прямого кабель-канала',kind:'conditional',valueType:'enum',unitId:null,values:[method,'Торцы пока не подтверждены']},
  {id:f+'count',title:'Количество закрываемых заглушкой торцов по ППР',kind:'conditional',valueType:'integer',unitId:'pcs',min:0,max:2,requiredWhen:selected},
  {id:f+'ppr_reference',title:'Ведомость торцов: документ, редакция и позиции узлов',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
  {id:f+'fit',title:'ППР принимает точное исполнение заглушки для указанных торцов?',kind:'conditional',valueType:'enum',unitId:null,values:[fit],requiredWhen:selected},
  {id:f+'price_scope',title:'Граница цены одной физической заглушки',kind:'conditional',valueType:'enum',unitId:null,values:[priceScope],requiredWhen:selected},
  ...(['stock','reserve','supplier_quantum_pcs'] as const).map(key=>({id:f+key,
   title:key==='stock'?'Пригодное наличие точной заглушки, шт.':key==='reserve'?'Сохраняемый пригодный резерв заглушек, шт.':'Фактическая кратность заказа по документу поставки, физических заглушек',
   kind:'conditional' as const,valueType:'integer' as const,unitId:'pcs',min:key==='supplier_quantum_pcs'?1:0,requiredWhen:selected})),
  {id:f+'supply_reference',title:'Документ поставки: точный артикул, физическая единица цены и кратность заказа',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
  {id:f+'stock_reference',title:'Ведомость пригодного наличия точной заглушки',kind:'conditional',valueType:'text',unitId:null,
   requiredWhen:{kind:'and',operands:[selected,{kind:'greater_than',parameterId:f+'stock',value:0}]}},
 ];
 const facts=[f+'count',f+'ppr_reference',f+'fit',f+'price_scope',f+'stock',f+'reserve',f+'supplier_quantum_pcs',f+'supply_reference',f+'stock_reference'];
 const b=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'pcs',consumed:f+'count',stock:f+'stock',reserve:f+'reserve',
  quantum:f+'supplier_quantum_pcs',manualQuantumViolationPolicy:'retain-raw-and-block-quantum'});
 const rows:AutomaticRowSpec[]=[];
 const add=(key:string,title:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({rowId:p+':'+key,formulaId:p+':formula:'+key,
  section:'Концевые заглушки прямого кабель-канала',category:'material',title,unitId:'pcs',expression,
  costTreatment:'INFORMATIONAL_SCOPE',procurement:false,inputParameterIds:facts,inclusion:selected,...extra});
 add('consumed','Заглушки торцов кабель-канала 60 × 40',f+'count');
 add('order','Заглушки торцов кабель-канала 60 × 40 — заказ',
  `ceil(max(0,${f}count+${f}reserve-${f}stock)/${f}supplier_quantum_pcs)*${f}supplier_quantum_pcs`,
  {...b.owner,costTreatment:'OWN_COST',procurement:true});
 add('remaining','Пригодные заглушки после установки',b.remaining,{purchaseBalanceOwnerRowId:owner});
 add('free','Свободные заглушки сверх резерва',b.free,{purchaseBalanceOwnerRowId:owner});
 add('consumption-shortage','Нехватка заглушек для указанных торцов',b.consumptionShortage,{purchaseBalanceOwnerRowId:owner});
 add('reserve-deficit','Непокрытый резерв заглушек',b.reserveDeficit,{purchaseBalanceOwnerRowId:owner});
 const fragmentDefinition={contract:'electrical.elecor-endcap-project-quantity/source-only-r1',semanticOwner:pack.catalogId,
  sourceId:'iek_elecor_white_60x40_kmz_cloud_table_project_quantity_r1',normId:'DECLARED_PROJECT_ENDPOINT_QUANTITY_AND_SUPPLY_DOCUMENT_NOT_CONSUMPTION_NORM',conditional,rows};
 const built=buildAutomaticConstructionOwnerR1({...fragmentDefinition,
  sourceMetadata:{definition_hash:estimateDeterministicHash(fragmentDefinition),source_title:'Таблица аксессуаров производителя: заглушка 60 × 40',source_document_version:'Official two-page accessory table, edition not established',
   artifact_sha256:'aadd7920e9214ebe6c6ecf16836416037f92d531a7b664a4bcbad17dc33eb6c5',exact_locator:'Physical2 actual text: headers lines1-18;60х40 line35;white row36 links CKK10-060-040-1-K01-018 to final KMZ CKMP10D-Z-060-040-K01 column, KMS connector separate; edition not established'},
  applicabilityRu:'Только совместимый элемент закрытых торцов того же нового прямого белого канала 60 × 40. Повороты, ответвления и прочие примыкания не закрываются.',
  ordinary:[],profile:[],deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:['Два геометрических торца не означают две требуемые заглушки.','Не назначается фасовка4 по поисковой выдаче.','Старое неизвестное количество узлов и его цена не переносятся.']});
 if(built.parameters.some(q=>parent.parameters.some(old=>old.parameter_id===q.parameter_id))
  ||built.resources.some(r=>parent.resources.some(old=>old.row_id===r.row_id))
  ||built.formulas.some(g=>parent.formulas.some(old=>old.formula_id===g.formula_id)))throw Error('ELECOR_ENDCAP_EXACT_EXISTING_ID_COLLISION');
 const actual=(key:string)=>{
  const value=parent.resources.find(r=>r.resource_graph.operationCompositionV1&&typeof r.resource_graph.operationCompositionV1==='object'
   &&!Array.isArray(r.resource_graph.operationCompositionV1)&&(r.resource_graph.operationCompositionV1 as Record<string,unknown>).operationId===key)?.resource_graph.operationCompositionV1;
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('ELECOR_ENDCAP_EXISTING_OPERATION_REQUIRED:'+key);
  return value as Record<string,unknown>;};
 const material=actual('material-plan'),completion=actual('completion');
 const parameters=built.parameters.map((q,i)=>q.truth_metadata.visibility_role==='INTERNAL_ONLY'?(()=>{
  const {guide:_unverifiedProductGuide,...truth}=q.truth_metadata;
  return {...q,ordinal:parent.parameters.length+i,truth_metadata:{...truth,projectAuthenticated:false,sourceAuthorityPromoted:false}};})():
  {...q,ordinal:parent.parameters.length+i,default_value:null,truth_metadata:{...q.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',
   source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},projectAuthenticated:false,sourceAuthorityPromoted:false,
   guide:{guide_kind:'PROJECT_DEFINED',source_role:'ACTUAL_ENDPOINT_AND_SUPPLY_DOCUMENT_NOT_APPLICATION_NORM',source_locator:q.title_ru}}});
 const activation={kind:'and',operands:[elecorSingleRouteActiveR1,mechanical,selected,{kind:'selected',parameterId:f+'fit',value:fit},
  {kind:'selected',parameterId:f+'price_scope',value:priceScope}]};
 const resources=built.resources.map((r,i)=>{const physical=r.row_id===p+':consumed',paid=r.row_id===owner;
  const {row_sha256:_old,...body}=r;
  const next={...body,ordinal:parent.resources.length+i,inclusion_ast:activation,resource_graph:{...r.resource_graph,
   inputParameterIds:[...facts,'elecor_route_document_reference'],
   operationCompositionV1:{...(physical?completion:material),...(physical||paid?{additionalOperations:[physical?material:completion]}:{})},
   ...(paid?{excludeKnownZeroQuantityV1:true}:{}),
   physicalProvisionV1:{basis:'EXACT_SYSTEM_ACCESSORY_WITH_DECLARED_PROJECT_ENDPOINTS',componentOnly:true,otherEndNodesClosed:false,
    quantityFromRouteLength:false,defaultTwoEndcapsClaimed:false,manufacturerPackSizeAdmitted:false,actualInventoryAuthenticated:false},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:r.title_ru,sourceTitleRu:r.title_ru,
    brandAndModelRu:null,specificationRu:null,detailsRu:[]}},
   source_metadata:{...r.source_metadata,normativeTrace:[],sourceRole:'ACTUAL_PRIMARY_TABLE_COMPATIBLE_COMPONENT_AND_DECLARED_PROJECT_QUANTITY',
    primaryArtifactCandidates:[{key:'iek-elecor-white60x40-kmz-physical2-table',logicalPath:'data/estimate-benchmarks/source-artifacts/elecor-endcap-capability-r1/IEK_ELECOR_60X40_KMZ_OFFICIAL.pdf',
     officialUrl:'https://cdn-01.iek.ru/media/original/aadd7920e9214ebe6c6ecf16836416037f92d531a7b664a4bcbad17dc33eb6c5.pdf',sha256:'aadd7920e9214ebe6c6ecf16836416037f92d531a7b664a4bcbad17dc33eb6c5',bytes:282938,
     totalPdfPages:2,readPdfPages:[2],wholeDocumentRead:false,pageTextSha256:'4cf1618ebfb5d300f90820b72ce9cb250b687e45af3ac4a9006a82d8e983c459',
     actualTextReceiptSha256:'432458ef228ac52ac944c4df092df2494ccf7a2b56d24d4a4ab2cfad9a8713ca',textGovernorReceiptSha256:'9a43b6547d966f1e98651cf84594c60fc8a9f7d19e1d5bc48506b37c25e240ca',
     locator:'Physical2:headers1-18,dimension35,white60x40 row36;KMZ cap final column, KMS connector separate',editionEstablished:false,
     sourceAdmissionStatus:'ACTUAL_BYTE_AND_PHYSICAL2_TEXT_NOT_REGISTRY_OR_OBJECT_ADMISSION',projectEndpointCountAuthored:false,manufacturerPackQuantityAdmitted:false,sourceAuthorityPromoted:false}],
    primaryCapabilityWitness:{path:'data/estimate-benchmarks/source-artifacts/elecor-endcap-capability-r1/IEK_ELECOR_60X40_KMZ_CLOUD_PRIMARY_TABLE_TEXT_R1.txt',sha256:'8d294c2d5a7a3a4c696f42cbe518b170aa680c311296262ddf5c0407da1e62dd',representationKind:'BOUNDED_CLOUD_PRIMARY_TABLE_TEXT_NOT_RAW_PDF',
     officialUrl:'https://cdn-01.iek.ru/media/original/aadd7920e9214ebe6c6ecf16836416037f92d531a7b664a4bcbad17dc33eb6c5.pdf',rawRemoteArtifactSha256:'aadd7920e9214ebe6c6ecf16836416037f92d531a7b664a4bcbad17dc33eb6c5'},
    exactChannelArticle:'CKK10-060-040-1-K01-018',exactAccessoryArticle:'CKMP10D-Z-060-040-K01',noManufacturerPackQuantityAdmitted:true,
    automaticLegacyNeedPriceOrQuantityTransferAllowed:false,automaticGenericPriceInheritanceAllowed:false,
    projectAuthenticated:false,sourceAuthorityPromoted:false,publicationAllowed:false,full_technical_acceptance:false}};
  return {...next,row_sha256:estimateDeterministicHash(next)};});
 const combined={...parent,parameters:[...parent.parameters,...parameters],formulas:[...parent.formulas,...built.formulas],resources:[...parent.resources,...resources]};
 const consumers=buildMasterParameterCalculationConsumers(combined);
 return {...combined,parameters:combined.parameters.map(q=>({...q,truth_metadata:{...q.truth_metadata,
  formula_consumers:consumers.formulaConsumers[q.parameter_id],resource_branch_consumers:consumers.resourceConsumers[q.parameter_id]}}))};
}
