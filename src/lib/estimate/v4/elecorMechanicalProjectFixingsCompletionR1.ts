// WORK prospective completion of one existing ELECOR consumer. NOT RUN / NOT ADOPTED.
// IEK supplies the mounting method; only the accepted project schedule supplies the quantity/SKU.
import pack from '../../../../data/estimate-benchmarks/source-packs/elecor-project-mechanical-fixings-completion-r1.json';
import {elecorSingleRouteMaterialDefinitionR1,elecorSingleRouteActiveR1,
 elecorSingleRouteControlInputR1,prefix} from './elecorSingleRouteMaterialR1';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
export const elecorMechanicalProjectFixingsPackR1=pack;
export const elecorMechanicalProjectFixingsOwnerR1=pack.priceOwnerRowId;
const qty=pack.projectQuantityParameterId;
const positive={kind:'greater_than' as const,parameterId:'elecor_route_m',value:0};
const mechanical={kind:'equals' as const,parameterId:'elecor_fixing_method',value:pack.method};
const active={kind:'and' as const,operands:[elecorSingleRouteActiveR1,mechanical]};
export function elecorMechanicalProjectFixingsDefinitionR1(parent:AutomaticOwnerDefinition=elecorSingleRouteMaterialDefinitionR1()):AutomaticOwnerDefinition{
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
 return {...parent,parameters,formulas:[...parent.formulas,...extension.formulas],
  resources:[...parent.resources.map(r=>r.row_id===old.row_id?retainedOldNeed:r),
   ...resources.map((r,i)=>reordinal(r,parent.resources.length+i))]};
}
export function compileElecorMechanicalProjectFixingsR1(input:Record<string,unknown>,rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']){
 const d=elecorMechanicalProjectFixingsDefinitionR1();
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
