import pack from '../../../../data/estimate-benchmarks/source-packs/ce40-ready-ceramic-grouting-s27-54.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const ce40ReadyCeramicPackS2754=pack;
export const ce40ReadyCeramicPrefixS2754=(index:number)=>`ceramic:ce40-ready:${pack.types[index]?.key??'INVALID'}`;
export type Ce40ReadyCeramicSourcePackS2754=typeof pack & {applicationPresentationRu?:string;completenessCondition?:string;readyParameterTitleRu?:string};
export function buildCe40ReadyCeramicDefinitionS2754(pack:Ce40ReadyCeramicSourcePackS2754,index:number,prefix:string):AutomaticOwnerDefinition {
  const type=pack.types[index];if(!type)throw Error('EXACT_SIX_CE40_TABLE_ROWS_ONLY');
  const net=`grout_area_m2*${type.rateKgM2}`,mixed='planned_mixed_dry_kg',water=`${mixed}/2*water_l_per_2kg`;
  const facts=['supplied_product_confirmed','ready_joints_confirmed','conditions_confirmed','mixing_method_confirmed','protection_method_confirmed',
    'geometry_acceptance_reference','mixing_plan_reference','measured_joint_depth_mm','geometry_confirmed'];
  const conditional:AutomaticParameterSpec[]=[
    ...[pack.productValue,pack.readyValue,pack.conditionsValue,pack.mixingValue,pack.protectionValue].map((value,i)=>({id:facts[i],
      title:['Поставленный CE 40, белый цвет 1 и пригодное сухое наличие',pack.readyParameterTitleRu??'Готовые обычные швы, глазурованная керамика и отсутствие подогрева','Условия воздуха и основания','Рецептура, перемешивание и использование каждого замеса','Очистка и защита свежих швов'][i],
      valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[value]})),
    {id:facts[5],title:`Ссылка на принятые фактическую геометрию и применимость ориентировочной строки ${type.tileCm} см / ${type.jointMm} мм, около ${type.rateKgM2} кг/м²`,valueType:'text',unitId:null,kind:'conditional'},
    {id:facts[6],title:'Ссылка на план замесов, партию и принятую смешиваемую массу; сравнение с таблицей не является гарантией расхода',valueType:'text',unitId:null,kind:'conditional'},
    {id:facts[7],title:'Фактическая одинаковая глубина очищенных швов; из таблицы CE 40 не выводится',valueType:'decimal',unitId:'mm',kind:'conditional',min:0.1},
    {id:facts[8],title:'Точная пара формата плитки и ширины обычного шва выбранного варианта',valueType:'enum',unitId:null,kind:'conditional',
      values:[`Принята глазурованная керамика ${type.tileCm} см и обычные швы ${type.jointMm} мм; одна выбранная строка таблицы CE 40`]},
    {id:mixed,title:'Принятая суммарная сухая масса CE 40 по последовательному плану замесов',valueType:'decimal',unitId:'kg',kind:'conditional',min:0.001},
    {id:'ce40_stock_kg',title:'Пригодное сухое наличие выбранного CE 40, кг',valueType:'decimal',unitId:'kg',kind:'conditional',min:0},
    {id:'ce40_reserve_kg',title:'Сохраняемый сухой резерв выбранного CE 40, кг',valueType:'decimal',unitId:'kg',kind:'conditional',min:0},
    {id:'ce40_supplier_bucket_multiple',title:'Фактическая кратность поставщика в выбранных ведрах CE 40 по 2 кг',valueType:'integer',unitId:'pcs',kind:'conditional',min:1},
    {id:'water_l_per_2kg',title:'Одна принятая доза воды CE 40: 0,56–0,60 л на 2 кг сухой массы',valueType:'decimal',unitId:'l',kind:'conditional',min:pack.product.waterMinLPer2Kg,max:pack.product.waterMaxLPer2Kg},
    {id:'water_stock_l',title:'Пригодное наличие чистой воды затворения, л',valueType:'decimal',unitId:'l',kind:'conditional',min:0},
    {id:'water_reserve_l',title:'Сохраняемый резерв воды затворения, л',valueType:'decimal',unitId:'l',kind:'conditional',min:0},
    {id:'water_quantum_l',title:'Фактический шаг подачи или поставки воды затворения, л',valueType:'decimal',unitId:'l',kind:'conditional',min:0.001},
  ];
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,operation:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
    rowId:`${prefix}:${id}`,formulaId:`${prefix}:formula:${id}`,section:operation,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
  const info={costTreatment:'INFORMATIONAL_SCOPE' as const};
  const groutOwner=`${prefix}:ce40-order`,grout=effectivePurchaseBalanceExpressionsR1({ownerRowId:groutOwner,orderUnitId:'kg',consumed:mixed,
    stock:'ce40_stock_kg',reserve:'ce40_reserve_kg',quantum:'2*ce40_supplier_bucket_multiple'});
  add('ce40-table-quantity','Ориентировочная потребность CE 40 по выбранной строке таблицы — не гарантия расхода','mixing','material','kg',net,info);
  add('ce40-plan-coverage','Превышение плана смешивания CE 40 над ориентировочной таблицей — не сухой остаток','mixing','material','kg',`${mixed}-(${net})`,
    {...info,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg',minimum:0,
      reasonRu:'Принятый план не соответствует выбранному консервативному сопоставлению с таблицей CE 40. Уточните план и применимость; таблица не гарантирует достаточность.'}});
  add('ce40-mixed-plan','Сухая масса CE 40 для принятого плана замесов — без второй цены','mixing','material','kg',mixed,{...info,purchaseBalanceOwnerRowId:groutOwner});
  add('ce40-order',pack.product.nameRu,'mixing','material','kg',`ceil(max(0,${mixed}+ce40_reserve_kg-ce40_stock_kg)/(2*ce40_supplier_bucket_multiple))*2*ce40_supplier_bucket_multiple`,{procurement:true,...grout.owner});
  add('ce40-buckets','Ведра CE 40 по 2 кг в заказе — справочно, без второй цены','mixing','material','pcs',`${grout.effective}/2`,{...info,purchaseBalanceOwnerRowId:groutOwner});
  add('ce40-dry-remaining','Пригодный сухой остаток CE 40 после принятого плана смешивания — не мокрый излишек','mixing','material','kg',grout.remaining,{...info,purchaseBalanceOwnerRowId:groutOwner});
  const waterOwner=`${prefix}:water-order`,waterBalance=effectivePurchaseBalanceExpressionsR1({ownerRowId:waterOwner,orderUnitId:'l',consumed:water,
    stock:'water_stock_l',reserve:'water_reserve_l',quantum:'water_quantum_l'});
  add('water-mixing','Чистая вода +15…+20 °C для затворения принятой сухой массы CE 40','mixing','material','l',water,{...info,purchaseBalanceOwnerRowId:waterOwner});
  add('water-order','Вода чистая для затворения Ceresit CE 40 Aquastatic','mixing','material','l',`ceil(max(0,(${water})+water_reserve_l-water_stock_l)/water_quantum_l)*water_quantum_l`,{procurement:true,...waterBalance.owner});
  add('water-remaining','Пригодный остаток воды затворения — без второй цены','mixing','material','l',waterBalance.remaining,{...info,purchaseBalanceOwnerRowId:waterOwner});
  for(const gap of pack.sourceNeeds){const id=`open_qty_${gap.id.replaceAll('-','_')}`;
    conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});add(gap.id,gap.nameRu,gap.operation,gap.category,gap.unitId,id);}
  const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:type.normId,
    sourceMetadata:{source_title:'Ceresit CE 40 Aquastatic: выбранная ориентировочная строка и принятый план замесов',source_document_version:pack.source.edition,
      definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
    applicabilityRu:pack.scopeRu+` Выбранная строка: ${type.tileCm} см / ${type.jointMm} мм, около ${type.rateKgM2} кг/м².`,
    ordinary:[{id:'grout_area_m2',title:'Площадь готовой облицовки с обычными швами выбранного формата',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.001}],
    profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  const required=new Set(facts),operations:Record<string,[string,number]>={mixing:['Затворение CE 40 по принятому плану',10],grouting:['Заполнение обычных межплиточных швов',20],
    cleaning:['Очистка облицовки и губки',30],protection:['Защита свежих швов при твердении',40],completion:['Доставка, тара и пригодный сухой остаток',50]};
  return {...built,parameters:built.parameters.map(p=>({...p,required:p.required||required.has(p.parameter_id),
    truth_metadata:p.parameter_id.startsWith('open_qty_')?unresolvedApplicationNormTruthR1(p.truth_metadata,
      'Применимые количество, часы или владелец оплаты требуют источника/задания; это не вопрос пользователю о готовности основания.'):
      {...p.truth_metadata,source_confirmation_required:false}})),
    resources:built.resources.map(resource=>{
      const id=resource.row_id.slice(prefix.length+1),gap=pack.sourceNeeds.find(g=>g.id===id),operation=gap?.operation??'mixing';
      const isWater=id.startsWith('water-');
      const details=gap?[gap.reasonRu]:isWater?[
        'Применение: только затворение принятого плана сухой массы. Доза 0,56–0,60 л/2 кг выбирается явно и сохраняется одной для плоскости; температура воды +15…+20 °C.',
        'Вода для губки и смачивания кромок имеет отдельный открытый расход. Заказ CE 40 и сухой резерв не увеличивают воду замесов.'
      ]:[
        'Ориентировочный расход относится к выбранному формату обычных швов. Фактическая одинаковая глубина и применимость строки приняты отдельно; таблица не гарантирует расход.',
        pack.applicationPresentationRu??'Применение: готовый глазурованный керамический пол без подогрева. CE 40 не заменяет силикон для угловых, деформационных и примыкающих швов.',
        'План замесов задан явно; полное ведро не объявлено обязательным замесом. Смешанный излишек не возвращается в пригодный сухой остаток; одно изделие имеет одного владельца стоимости.'
      ];
      const {row_sha256:_old,...content}=resource,result={...content,resource_graph:{...resource.resource_graph,
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:type.titleRu,operationId:`${prefix}:${operation}`,
          operationTitleRu:operations[operation][0],processOrdinal:operations[operation][1],completionCriterionRu:'Обычные швы заполнены и очищены по принятому методу; сроки и защита подтверждены; повторная оплата исключена.'},
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,
          brandAndModelRu:gap||isWater?null:'Ceresit CE 40 Aquastatic, цвет 1 Белый',specificationRu:gap?null:isWater?'Чистая вода для затворения CE 40, +15…+20 °C.':pack.product.specificationRu,detailsRu:details}},
        source_metadata:{...resource.source_metadata,normativeTrace:[],official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,
          sourceRole:gap?'UNRESOLVED_INSTALLATION_QUANTITY':'APPROXIMATE_TABLE_ROW_AND_CONFIRMED_PROJECT_MIX_PLAN',approximateManufacturerRate:true,
          tableDoesNotDefineJointDepth:true,plannedCoverageNotManufacturerMinimum:true,waterFollowsMixedMassNotPurchase:true,fullBucketMixNotAssumed:true,
          ordinaryJointsOnly:true,wetExcessNotDryStock:true,full_technical_acceptance:false}};
      return {...result,row_sha256:estimateDeterministicHash(result)};
    })};
}
export function ce40ReadyCeramicDefinitionS2754(index:number){return buildCe40ReadyCeramicDefinitionS2754(pack,index,ce40ReadyCeramicPrefixS2754(index));}
export function compileCe40ReadyCeramicS2754(index:number,input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.types[index].catalogId,
  compilerVersion:pack.contract,primaryMeasureParameterId:'grout_area_m2',definition:ce40ReadyCeramicDefinitionS2754(index),submittedParameters:input});}
export function buildCe40ReadyCeramicCompletenessMapS2754(pack:Ce40ReadyCeramicSourcePackS2754,prefix:string){return {
  contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,
  evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
    ...[ ['ce40', 'material','kg','ce40-mixed-plan',pack.product.nameRu],['mixing-water','material','l','water-mixing','Чистая вода для затворения CE 40'] ].map(([id,category,unitId,row,name])=>({
      expectedResourceId:id,operationId:'mixing',category,specification:name,condition:pack.completenessCondition??'CONFIRMED_READY_GLAZED_FLOOR_AND_PROJECT_MIX_PLAN',sourceId:pack.sourceId,unitId,
      quantityRule:'EXPLICIT_PROJECT_MIX_PLAN_WITH_APPROXIMATE_TABLE_REFERENCE',formulaId:`${prefix}:formula:${row}`,resolution:{kind:'ROW',rowId:`${prefix}:${row}`}})),
    ...pack.sourceNeeds.map(gap=>({expectedResourceId:gap.id,operationId:gap.operation,category:gap.category,specification:gap.nameRu,condition:'OPEN_APPLICABLE_SOURCE_OR_TASK_SCOPE',
      sourceId:pack.sourceId,unitId:gap.unitId,quantityRule:'OPEN_NO_ASSUMED_QUANTITY',formulaId:`${prefix}:formula:${gap.id}`,resolution:{kind:'ROW',rowId:`${prefix}:${gap.id}`}}))
  ]};}
export function ce40ReadyCeramicCompletenessMapS2754(index:number){return buildCe40ReadyCeramicCompletenessMapS2754(pack,ce40ReadyCeramicPrefixS2754(index));}
