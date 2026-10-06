import pack from '../../../../data/estimate-benchmarks/source-packs/pvc-bitumen-transition-reinforced-guide2024-s27-37.json';
import {buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec, type AutomaticRowSpec, type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS} from './pvcRoofMembraneInstallationR1';

export const PVC_BITUMEN_TRANSITION_WORK_KEY_S2737 = 'roof_pvc_bitumen_transition_reinforced_tape_guide2024_single_strip';
export const PVC_BITUMEN_TRANSITION_CATALOG_S2737 = 'canonical-work:master:' + PVC_BITUMEN_TRANSITION_WORK_KEY_S2737;
export const PVC_BITUMEN_TRANSITION_SOURCE_ID_S2737 = 'tn_tape_pvc_b_reinforced_guide2024_s2737';
export const PVC_BITUMEN_TRANSITION_NORM_ID_S2737 = 'manufacturer:tn:tape-pvc-b:guide02-2024:single-strip';
export const PVC_BITUMEN_TRANSITION_DISPLAY_NAME_RU = 'Устройство перехода между ПВХ-мембраной и битумной кровлей';
export const PVC_BITUMEN_TRANSITION_SOURCE_PACK_SHA256_S2737 = '5084bac5ae48e3b348890afb920e0f37a3eeb8f49c896dc50387dcb01e9a4065';
export const PVC_BITUMEN_TRANSITION_SOURCE_METADATA_S2737 = {
  source_title: 'Армированная LOGICROOF Tape PVC-B: один непрерывный участок по инструкции февраля 2024',
  source_authority: 'ТЕХНОНИКОЛЬ; обмеры и подтверждённая поставка объекта',
  source_document_version: pack.contract, definition_hash: PVC_BITUMEN_TRANSITION_SOURCE_PACK_SHA256_S2737,
  artifact_sha256: PVC_BITUMEN_TRANSITION_SOURCE_PACK_SHA256_S2737,
  official_url: null, primaryDocument: pack.primaryDocument,
  exact_locator: 'data/estimate-benchmarks/source-packs/pvc-bitumen-transition-reinforced-guide2024-s27-37.json; ' + pack.adhesive.lowerLocatorRu + '; ' + pack.adhesive.upperLocatorRu,
  use_restriction: pack.scopeRu + ' Обе клеевые площади обмеряются отдельно. Труд, машинное время, выдержка, защитные материалы и фактические упаковки — открытые факты проекта; готовность инженерного решения не утверждается.',
};
if (pack.adhesive.lowerRateKgM2 !== 1 || pack.adhesive.upperRateKgM2 !== 1 || pack.engineeringAccepted !== false) {
  throw Error('PVC_BITUMEN_TRANSITION_SOURCE_DRIFT');
}
const inheritedLiquid = PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS.find(f => f.formula_id === 'liquid_pvc_joint_sealant_volume_v1');
if (!inheritedLiquid || inheritedLiquid.expression_source !== 'liquid_pvc_volume_l') throw Error('PVC_TRANSITION_LIQUID_PVC_OPERATION_DRIFT');

const eq = (parameterId: string, value: string): AutomaticInclusionCondition => ({kind:'equals',parameterId,value});
const parameter = (id: string, title: string, unitId: string | null, valueType: AutomaticParameterSpec['valueType']='decimal',
  extra: Partial<AutomaticParameterSpec>={}): AutomaticParameterSpec => ({id,title,unitId,valueType,kind:'conditional',...extra});
const choice = (id: string, title: string, values: readonly string[]): AutomaticParameterSpec => parameter(id,title,null,'enum',{values});
const facts = ['reinforced_guide2024_profile_confirmed','single_straight_undamaged_strip_confirmed'] as const;
const parameters: AutomaticParameterSpec[] = [
  {id:'transition_length_m',title:'Обмеренная длина прямого участка перехода, м',kind:'ordinary',valueType:'decimal',unitId:'m',min:0.001},
  ...facts.map(id=>choice(id,id===facts[0]
    ? 'Поставленная армированная лента и условия узла соответствуют инструкции февраля 2024; не неармированный профиль KZ 08.2026'
    : 'Один непрерывный прямой участок без стыков лент, углов и повреждённого геотекстиля',['Подтверждено по объекту'])),
  parameter('tape_required_length_m','Полный расход ленты на участок с фактическим раскроем, м; не меньше длины перехода','m','decimal',
    {min:0.001,numericPeerConstraints:{greaterThanOrEqualParameter:'transition_length_m',lessThanOrEqualParameter:'tape_roll_length_m'}}),
  parameter('tape_roll_length_m','Подтверждённая длина рулона поставленной армированной ленты, м; 15/19 м не подставляются автоматически','m','decimal',{min:0.001}),
  parameter('tape_width_mm','Подтверждённая общая ширина поставленной ленты, мм','mm','decimal',{min:0.001}),
  parameter('tape_thickness_mm','Подтверждённая толщина поставленной ленты, мм','mm','decimal',{min:0.001}),
  parameter('lower_adhesive_area_m2','Отдельно обмеренная площадь нижней зоны приклейки, м²','m2','decimal',{min:0.000001}),
  parameter('upper_adhesive_area_m2','Отдельно обмеренная площадь верхней зоны дополнительной мастики, м²','m2','decimal',{min:0.000001}),
  parameter('fixing_count_piece','Количество крепёжных мест по подтверждённой ветровой схеме, шт.; не выводится только из шага','piece','integer',{min:1}),
  parameter('screw_specification','Фактический саморез: размер, покрытие и применимость к основанию',null,'text'),
  choice('fixing_scheme_and_supply_confirmed','Основание, держатель, саморез и раскладка креплений проверены по проекту',['Подтверждено по объекту']),
  parameter('separation_area_m2','Обмеренная площадь разделительного слоя с выбранными нахлёстами, м²','m2','decimal',{min:0.000001}),
  parameter('separation_specification','Выбранный геотекстиль: изделие, размер и подтверждённая термообработка не менее 300 г/м²',null,'text'),
  choice('separation_compliance_confirmed','Термообработка и масса выбранного геотекстиля не менее 300 г/м² подтверждены',['Подтверждено по объекту']),
  parameter('exposed_adhesive_area_m2','Обмеренная открытая площадь мастики, требующая защиты от УФ; 0 только по подтверждённой геометрии','m2','decimal',{min:0}),
  choice('uv_method','Выбранная защита открытой мастики от УФ',['Посыпка','Бандажная полоса']),
  parameter('uv_grit_required_kg','Количество выбранной посыпки по проверенному плану, кг; расход не угадывается','kg','decimal',{min:0.000001}),
  parameter('uv_grit_specification','Выбранная совместимая посыпка: изделие и назначение',null,'text'),
  parameter('uv_band_required_m2','Количество выбранной битумной бандажной полосы с раскроем, м²; не меньше всей открытой площади мастики','m2','decimal',
    {min:0.000001,numericPeerConstraints:{greaterThanOrEqualParameter:'exposed_adhesive_area_m2'}}),
  parameter('uv_band_specification','Выбранный битумный/битумно-полимерный материал бандажа: изделие и размер',null,'text'),
  parameter('adhesive_drying_instruction','Срок и условия полного высыхания по паспорту выбранной мастики и условиям объекта',null,'text'),
  choice('hot_delivery_confirmation','Горячая поставка выбранного материала и владелец оборудования/энергии подтверждены по договору',
    ['Поставка при температуре применения; оборудование и энергия обеспечения температуры включены в цену материала']),
  parameter('hot_delivery_plan','План поставки и обеспечения температуры горячего материала: условия применения, оборудование/энергия и включение в цену материала',null,'text'),
  parameter('transition_worker_man_h','Единый труд переходного участка по проверенному плану, чел·ч; норма поля кровли не переносится','man_hour','decimal',{min:0.000001}),
  parameter('hot_air_welder_machine_h','Фактическое время аппарата горячего воздуха по плану, маш·ч','machine_hour','decimal',{min:0.000001}),
  {id:'welder_cost_mode',title:'Аппарат горячего воздуха: принадлежность и владелец стоимости',kind:'profile',valueType:'enum',unitId:null,
    defaultValue:'Включён в труд подрядчика',values:['Включён в труд подрядчика','Отдельная аренда по плану']},
  {id:'contractor_tool_sets',title:'Предварительно одно звено: ручная оснастка включена в труд подрядчика, не новая закупка',kind:'profile',valueType:'integer',unitId:'set',defaultValue:1,min:1},
  {id:'liquid_pvc_selection',title:'Жидкий ПВХ для повышения герметичности: рекомендация, выбирается отдельно',kind:'profile',valueType:'enum',unitId:null,
    defaultValue:'Не выбрано',values:['Не выбрано','Выбрано по проекту']},
  parameter('liquid_pvc_designation','Выбранный совместимый жидкий ПВХ; поставка и количество подтверждены в литрах',null,'text'),
  parameter('liquid_pvc_volume_l','Подтверждённый объём жидкого ПВХ, л; прежняя операция, без автоматического расхода и перевода кг','l','decimal',{min:0.000001}),
];
const rows: AutomaticRowSpec[]=[];
const stages=new Map<string,string>();
const includedOwners=new Map<string,string>();
const allocations=new Map<string,string>();
const add=(row:Omit<AutomaticRowSpec,'formulaId'>,stage:string)=>{
  rows.push({...row,formulaId:row.rowId.replaceAll(':','_')+'_v1'});stages.set(row.rowId,stage);
};
const stocked=(key:string,title:string,unit:string,integer=false)=>{
  for(const suffix of ['stock','reserve'])parameters.push({id:key+'_'+suffix,title:(suffix==='stock'?'Предварительное пригодное наличие':'Предварительный сохраняемый резерв')+' — '+title+'; 0, уточнить по объекту',
    unitId:unit,valueType:integer?'integer':'decimal',kind:'profile',defaultValue:0,min:0});
};
const supply=(key:string,title:string,unit:string,consumed:string,stage:string,extra:Partial<AutomaticRowSpec>={})=>{
  stocked(key,title,unit,unit==='piece');
  parameters.push(parameter(key+'_quantum','Подтверждённая кратность поставки: '+title,unit,unit==='piece'?'integer':'decimal',{min:unit==='piece'?1:0.000001}));
  const rowId='transition:material:'+key;
  const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:unit,consumed,stock:key+'_stock',reserve:key+'_reserve',quantum:key+'_quantum'});
  add({rowId,title,section:'Материалы переходного узла',category:'material',unitId:unit,
    expression:`ceil(max(0,(${consumed})+${key}_reserve-${key}_stock)/${key}_quantum)*${key}_quantum`,procurement:true,...balance.owner,...extra},stage);
};
add({rowId:'transition:scope:length',title:'Длина выбранного непрерывного переходного участка',section:'Граница работы',category:'construction_work',unitId:'m',expression:'transition_length_m',costTreatment:'INFORMATIONAL_SCOPE'},'boundary');
parameters.push({id:'tape_stock_full_rolls',title:'Предварительно 0 целых пригодных рулонов выбранной армированной ленты; обрезки не считаются целым рулоном',kind:'profile',valueType:'integer',unitId:'roll',defaultValue:0,min:0},
  {id:'tape_reserve_m',title:'Предварительно 0 м сохраняемого резерва выбранной ленты, уточнить по объекту',kind:'profile',valueType:'decimal',unitId:'m',defaultValue:0,min:0});
const tapeBalance=effectivePurchaseBalanceExpressionsR1({ownerRowId:'transition:material:tape',orderUnitId:'m',consumed:'tape_required_length_m',
  stock:'tape_stock_full_rolls*tape_roll_length_m',reserve:'tape_reserve_m',quantum:'tape_roll_length_m'});
add({rowId:'transition:material:tape',title:'Армированная битумостойкая переходная лента ПВХ с геотекстилем — LOGICROOF Tape PVC-B; поставленную редакцию подтвердить',
  section:'Переходная лента',category:'material',unitId:'m',expression:'ceil(max(0,tape_required_length_m+tape_reserve_m-tape_stock_full_rolls*tape_roll_length_m)/tape_roll_length_m)*tape_roll_length_m',
  procurement:true,...tapeBalance.owner,titleParameterIds:['tape_width_mm','tape_thickness_mm','tape_roll_length_m']},'laying');
export const PVC_TRANSITION_ADHESIVE_CHOICES = [
  {key:'adhesive22',value:'Временный узел — ТЕХНОНИКОЛЬ №22',title:'Мастика приклеивающая ТЕХНОНИКОЛЬ №22 для временного перехода'},
  {key:'adhesive23',value:'Временный узел — ТЕХНОНИКОЛЬ №23',title:'Мастика Фиксер ТЕХНОНИКОЛЬ №23 для временного перехода'},
  {key:'hot_mastic',value:'Постоянный узел — горячая мастика',title:'Битумная горячая мастика ТЕХНОНИКОЛЬ для постоянного перехода'},
  {key:'hot_bitumen',value:'Постоянный узел — горячий битум БН 90-10',title:'Горячий битум БН 90-10 для постоянного перехода'},
] as const;
parameters.push(choice('adhesive_profile','Выбранный клеевой материал и временный/постоянный узел',PVC_TRANSITION_ADHESIVE_CHOICES.map(x=>x.value)));
for(const profile of PVC_TRANSITION_ADHESIVE_CHOICES){
  const selected=eq('adhesive_profile',profile.value);
  parameters.push(parameter(profile.key+'_supply_specification','Поставленное изделие и тара: '+profile.title,null,'text'));
  supply(profile.key,profile.title+'; обе клеевые зоны по 1 кг/м² в пределах инструкции 02.2024','kg',
    `lower_adhesive_area_m2*${pack.adhesive.lowerRateKgM2}+upper_adhesive_area_m2*${pack.adhesive.upperRateKgM2}`,'lower-adhesive',
    {inclusion:selected,titleParameterIds:[profile.key+'_supply_specification'],
      ...(profile.key.startsWith('hot_')?{inputParameterIds:['hot_delivery_confirmation','hot_delivery_plan']}:{})});
  if(profile.key.startsWith('hot_')){
    const rowId='transition:scope:'+profile.key+':hot-delivery';
    add({rowId,title:'Горячая поставка и обеспечение температуры применения: оборудование/энергия включены в цену выбранного материала',
      section:'Горячая технология по плану поставки',category:'material',unitId:'kg',
      expression:`lower_adhesive_area_m2*${pack.adhesive.lowerRateKgM2}+upper_adhesive_area_m2*${pack.adhesive.upperRateKgM2}`,
      costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inclusion:selected,inputParameterIds:['hot_delivery_confirmation','hot_delivery_plan'],titleParameterIds:['hot_delivery_plan']},'preparation');
    includedOwners.set(rowId,'transition:material:'+profile.key);
  }
  for(const [zone,field,rate] of [['lower','lower_adhesive_area_m2',pack.adhesive.lowerRateKgM2],['upper','upper_adhesive_area_m2',pack.adhesive.upperRateKgM2]] as const){
    const rowId='transition:allocation:'+profile.key+':'+zone;
    add({rowId,title:(zone==='lower'?'Нижняя':'Верхняя')+' зона мастики: отдельный расход, включён в общую закупку',
      section:'Распределение одной мастики',category:'material',unitId:'kg',expression:field+'*'+rate,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inclusion:selected},zone==='lower'?'lower-adhesive':'upper-adhesive');
    includedOwners.set(rowId,'transition:material:'+profile.key);allocations.set(rowId,'transition:material:'+profile.key);
  }
}
parameters.push(choice('holder_profile','Выбранный держатель крепёжного места',['Тарельчатый держатель','Телескопический элемент']));
for(const [key,value] of [['plate_holder','Тарельчатый держатель'],['telescopic_holder','Телескопический элемент']] as const){
  parameters.push(parameter(key+'_specification','Фактическое изделие и размер: '+value,null,'text'));
  supply(key,value+' для выбранной ленты и основания','piece','fixing_count_piece','fixing',
    {inclusion:eq('holder_profile',value),inputParameterIds:['fixing_scheme_and_supply_confirmed'],titleParameterIds:[key+'_specification']});
}
supply('screw','Саморез крепления переходной ленты к подтверждённому основанию','piece','fixing_count_piece','fixing',
  {inputParameterIds:['fixing_scheme_and_supply_confirmed'],titleParameterIds:['screw_specification']});
supply('separation','Геотекстиль термообработанный, не менее 300 г/м², для разделения ПВХ и битума','m2','separation_area_m2','separation',
  {inputParameterIds:['separation_compliance_confirmed'],titleParameterIds:['separation_specification']});
const exposed:AutomaticInclusionCondition={kind:'greater_than',parameterId:'exposed_adhesive_area_m2',value:0};
supply('uv_grit','Совместимая посыпка для защиты открытой мастики от УФ','kg','uv_grit_required_kg','uv-protection',
  {inclusion:{kind:'and',operands:[exposed,eq('uv_method','Посыпка')]},titleParameterIds:['uv_grit_specification']});
supply('uv_band','Бандажная полоса битумного/битумно-полимерного материала для защиты от УФ','m2','uv_band_required_m2','uv-protection',
  {inclusion:{kind:'and',operands:[exposed,eq('uv_method','Бандажная полоса')]},titleParameterIds:['uv_band_specification']});
supply('liquid_pvc','Жидкий ПВХ выбранной совместимой системы: отдельная рекомендация; подтверждённое количество в литрах','l',
  inheritedLiquid.expression_source,'control',{inclusion:eq('liquid_pvc_selection','Выбрано по проекту'),titleParameterIds:['liquid_pvc_designation']});
add({rowId:'transition:scope:drying',title:'Выдержка выбранного участка до полного высыхания мастики; срок не является дополнительным трудом',section:'Завершение',
  category:'construction_work',unitId:'m',expression:'transition_length_m',costTreatment:'INFORMATIONAL_SCOPE',inputParameterIds:['adhesive_drying_instruction'],titleParameterIds:['adhesive_drying_instruction']},'drying');
add({rowId:'transition:labor:worker',title:'Единый труд переходного участка по проверенному плану; норма труда поля кровли не перенесена',section:'Труд всего комплекса',category:'labor',unitId:'man_hour',expression:'transition_worker_man_h'},'cost-summary');
for(const [key,value,included] of [['welder_included','Включён в труд подрядчика',true],['welder_rental','Отдельная аренда по плану',false]] as const){
  const rowId='transition:machine:'+key;
  add({rowId,title:included?'Аппарат горячего воздуха: время включено в труд подрядчика':'Аппарат горячего воздуха: отдельно оплачиваемая аренда по плану',
    section:'Оснащение сварки',category:'equipment',unitId:'machine_hour',expression:'hot_air_welder_machine_h',inclusion:eq('welder_cost_mode',value),
    ...(included?{costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const}:{})},'welding');
  if(included)includedOwners.set(rowId,'transition:labor:worker');
}
for(const [key,title,stage] of [
  ['cleaning','Оснастка очистки готового основания по плану','preparation'],['marking','Рулетка и разметочная оснастка','preparation'],
  ['adhesive','Металлический шпатель либо щётка нанесения мастики','lower-adhesive'],['pressing','Оснастка прикатки переходной ленты','laying'],
  ['cutting','Монтажный нож либо ножницы раскроя ленты','laying'],['fixing','Совместимая оснастка установки выбранного крепежа','fixing'],
  ['weld-roller','Ролик прикатки сварного шва','welding'],['probe','Пробник контроля сварного шва','control'],
  ['ppe','СИЗ для выбранной клеевой технологии и горячих работ по плану','preparation'],
] as const){
  const rowId='transition:tool:'+key;
  add({rowId,title:title+'; предоставляет подрядчик, включено в труд, не новая закупка',section:'Ручная оснастка подрядчика',category:'material',unitId:'set',
    expression:'contractor_tool_sets',costTreatment:'INCLUDED_IN_RESOURCE_ROWS'},stage);includedOwners.set(rowId,'transition:labor:worker');
}
const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:PVC_BITUMEN_TRANSITION_WORK_KEY_S2737,
  sourceId:PVC_BITUMEN_TRANSITION_SOURCE_ID_S2737,normId:PVC_BITUMEN_TRANSITION_NORM_ID_S2737,sourceMetadata:PVC_BITUMEN_TRANSITION_SOURCE_METADATA_S2737,
  applicabilityRu:PVC_BITUMEN_TRANSITION_SOURCE_METADATA_S2737.use_restriction,ordinary:parameters.filter(x=>x.kind==='ordinary'),
  profile:parameters.filter(x=>x.kind==='profile'),conditional:parameters.filter(x=>x.kind==='conditional').map(p=>{
    const adhesive=PVC_TRANSITION_ADHESIVE_CHOICES.find(x=>p.id.startsWith(x.key+'_'));
    const holder=p.id.startsWith('plate_holder_')?'Тарельчатый держатель':p.id.startsWith('telescopic_holder_')?'Телескопический элемент':null;
    const requiredWhen:AutomaticInclusionCondition=p.id.startsWith('hot_delivery_')?{kind:'or',operands: [eq('adhesive_profile',PVC_TRANSITION_ADHESIVE_CHOICES[2].value),eq('adhesive_profile',PVC_TRANSITION_ADHESIVE_CHOICES[3].value)]}
      :adhesive?eq('adhesive_profile',adhesive.value)
      :holder?eq('holder_profile',holder)
      :p.id.startsWith('uv_grit_')?{kind:'and',operands:[exposed,eq('uv_method','Посыпка')]}
      :p.id.startsWith('uv_band_')?{kind:'and',operands:[exposed,eq('uv_method','Бандажная полоса')]}
      :p.id==='uv_method'?exposed
      :p.id.startsWith('liquid_pvc_')?eq('liquid_pvc_selection','Выбрано по проекту')
      :{kind:'greater_than',parameterId:'transition_length_m',value:0};
    return {...p,requiredWhen};
  }),rows,
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.exclusionsRu});
const process=[
  ['preparation','Проверка и очистка готового основания, разметка'],['lower-adhesive','Нанесение мастики на нижнюю клеевую зону'],
  ['laying','Раскрой, приклеивание и прикатка непрерывной ленты'],['upper-adhesive','Дополнительная мастика на отдельную верхнюю зону'],
  ['fixing','Механическое закрепление переходной ленты'],['separation','Разделение ПВХ и битума термообработанным геотекстилем'],
  ['welding','Сварка горячим воздухом: шов не менее 30 мм'],['control','Контроль шва пробником; выбранный жидкий ПВХ отдельно'],
  ['drying','Выдержка мастики до полного высыхания'],['uv-protection','Выбранная защита открытой мастики от УФ'],
] as const;
export const PVC_BITUMEN_TRANSITION_DEFINITION_S2737=Object.freeze({...built,
  parameters:built.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,
    guide:{...(p.truth_metadata.guide as Record<string,unknown>),verified_at:pack.primaryDocument.checkedAt}}})),
  resources:built.resources.map(row=>{
  const stage=stages.get(row.row_id)!;
  const step=process.find(x=>x[0]===stage);
  const operation={contractVersion:'canonical-operation-resource/v1',groupId:'pvc-bitumen-transition-reinforced-guide2024-single-strip',
    groupTitleRu:PVC_BITUMEN_TRANSITION_DISPLAY_NAME_RU,operationId:stage,operationTitleRu:step?.[1]??(stage==='cost-summary'?'Труд всего переходного участка':'Граница выбранного участка'),
    completionCriterionRu:'Подтвердить армированное исполнение по инструкции 02.2024, непрерывную полосу, две клеевые площади, крепление, совместимость материалов и поставку',
    ...(step?{processRole:'PROCESS',processOrdinal:process.findIndex(x=>x[0]===stage)}:{processRole:stage==='cost-summary'?'COST_SUMMARY':'REFERENCE_ONLY'})};
  const shared=row.row_id.startsWith('transition:material:')&&PVC_TRANSITION_ADHESIVE_CHOICES.some(x=>row.row_id==='transition:material:'+x.key)
    ||row.row_id==='transition:tool:adhesive';
  const resource={...row,source_metadata:{...row.source_metadata,engineeringApprovalClaimed:false,
    primaryDocument:pack.primaryDocument,sourceRole:row.row_id.startsWith('transition:allocation:')?'MANUFACTURER_RATE_PER_SEPARATELY_MEASURED_ZONE':
      row.row_id.startsWith('transition:tool:')?'VISIBLE_CONTRACTOR_TOOL_PLAN_NOT_CONSUMPTION_NORM':'PINNED_GUIDE_AND_EXPLICIT_PROJECT_FACTS',
    normOfFieldRoofNotImported:true,unreinforcedKz082026NotImported:true,
    ...(row.row_id==='transition:material:liquid_pvc'?{reusedOperation:{originalFormulaId:inheritedLiquid.formula_id,arithmeticPreserved:true}}:{})},
    resource_graph:{...row.resource_graph,inputParameterIds:[...(row.resource_graph.inputParameterIds as string[]??[]),...(stage==='boundary'?[]:facts)],
      operationCompositionV1:{...operation,...(shared?{additionalOperations:[{operationId:'upper-adhesive',operationTitleRu:process[3][1],
        completionCriterionRu:operation.completionCriterionRu,processRole:'PROCESS',processOrdinal:3}]}:{})},
      ...(includedOwners.has(row.row_id)?{includedInResourceOwnerRowId:includedOwners.get(row.row_id)}:{}),
      ...(allocations.has(row.row_id)?{purchaseConsumptionAllocationV1:{contractVersion:'canonical-purchase-consumption-allocation/v1',ownerRowId:allocations.get(row.row_id)}}:{})}};
  return {...resource,row_sha256:estimateDeterministicHash({...resource,row_sha256:''})};
})});
export function compilePvcBitumenTransitionReinforcedGuide2024S2737(submittedParameters:Record<string,unknown>){
  return compileAutomaticConstructionOwnerR1({compilerVersion:pack.contract,catalogId:PVC_BITUMEN_TRANSITION_CATALOG_S2737,
    primaryMeasureParameterId:'transition_length_m',definition:PVC_BITUMEN_TRANSITION_DEFINITION_S2737,submittedParameters});
}
