import {buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec, type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {buildBaseboardGerflorInstallProfessionalPackagePartsV1} from './domains/interiorFinishesComplete/baseboardGerflorInstallProfessionalV1';
import {buildBaseboardGlueProfessionalPackagePartsV1} from './domains/interiorFinishesComplete/baseboardGlueProfessionalV1';
import {INTERIOR_FINISHES_DOMAIN_INVENTORY} from './domains/interiorFinishesComplete/inventory';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const SKIRTING_VARIANTS_S2735=['standard','high_load','technical_room','wet_zone'] as const;
export const SKIRTING_TARGETS_S2735=(['install','glue'] as const).flatMap(operation=>SKIRTING_VARIANTS_S2735.map(variant=>({operation,variant,
  catalogId:'canonical-work:base:flooring_interior_baseboard_'+operation+'_'+variant})));
export const SKIRTING_CONTRACT_S2735='skirting-constructor:s27-35.v1';
export const SKIRTING_SOURCE_ID_S2735='manufacturer_bound_skirting_constructor_s27_35';
export const SKIRTING_NORM_ID_S2735='project:skirting:ready-gerflor-forbo-system:s27-35.v1';
export const SKIRTING_SOURCE_METADATA_S2735={
  source_title:'Готовые операции плинтуса; Gerflor 6086 PMO516V1 и Forbo232 с видимым предварительным профилем и фактическими уточнениями',
  source_authority:'Изготовители, фактическая раскладка и условия проекта; подтверждение поставляемой системы ещё требуется',
  source_document_version:SKIRTING_CONTRACT_S2735,
  definition_hash:'22b58d95118d4237fa4848eadd5a551caedc6b745e8535bef511f5fb5fab7440',
  artifact_sha256:'22b58d95118d4237fa4848eadd5a551caedc6b745e8535bef511f5fb5fab7440',
  exact_locator:'source-packs/skirting-constructor-s27-35.json: Gerflor6086 PMO516V1 p1; Forbo232 Performances/Application/Working Process/Articles; исходные операции труда и числитель потребления клея',
  source_kind:'MANUFACTURER_BOUND_PRELIMINARY_SYSTEM_WITH_ACTUAL_PROJECT_CONFIRMATION',
  use_restriction:'Предварительный профиль клеевого монтажа Gerflor6086/Forbo232 на подготовленном бетонном основании. Подтвердить совместимость конкретной партии, условия, раскрой и основание. Другие плинтусы/крепления, готовность мокрых узлов и производительность по названию варианта не назначаются.',
};
const installInventory=INTERIOR_FINISHES_DOMAIN_INVENTORY.find(row=>row.work_key==='flooring_interior_baseboard_install_standard');
const glueInventory=INTERIOR_FINISHES_DOMAIN_INVENTORY.find(row=>row.work_key==='flooring_interior_baseboard_glue_standard');
if(!installInventory||!glueInventory)throw Error('SKIRTING_READY_INVENTORY_MISSING');
const installParts=buildBaseboardGerflorInstallProfessionalPackagePartsV1(installInventory);
const glueParts=buildBaseboardGlueProfessionalPackagePartsV1(glueInventory);
if(!installParts||!glueParts)throw Error('SKIRTING_READY_OPERATIONS_MISSING');
const readyInstall=installParts.child_assemblies.flatMap(part=>part.rows);
const readyGlue=glueParts.child_assemblies.flatMap(part=>part.rows);
const originalAdhesive=readyGlue.find(row=>row.row_id.endsWith(':project_specified_adhesive'));
if(!originalAdhesive)throw Error('SKIRTING_READY_ADHESIVE_MISSING');
const readyAdhesiveSourceId=originalAdhesive.row_id;
// Lift the existing consumption numerator, before its packaging ceil. The
// canonical purchase owner then applies availability/reserve/rounding once.
const consumptionMatch=originalAdhesive.formula.expression.match(/^ceil\(\((.+)\) \/ adhesive_cartridge_size_ml\) \* adhesive_cartridge_size_ml$/u);
const originalAst=compileFormulaGraph(originalAdhesive.formula.expression).ast;
if(!consumptionMatch||originalAst.kind!=='binary'||originalAst.operator!=='*'||originalAst.left.kind!=='call'
  ||originalAst.left.function!=='ceil'||originalAst.left.arguments[0]?.kind!=='binary'
  ||originalAst.left.arguments[0].operator!=='/')throw Error('SKIRTING_READY_ADHESIVE_SHAPE_CHANGED');
export const SKIRTING_READY_ADHESIVE_CONSUMPTION_AST_S2735=originalAst.left.arguments[0].left;
const parameterBindings:Record<string,string>={finished_perimeter_linear_m:'length_m',skirting_length_linear_m:'length_m',
  adhesive_consumption_ml_linear_m:'adhesive_rate_ml_m',labor_productivity_linear_m_per_man_hour:'installation_productivity_m_man_h',
  equipment_productivity_linear_m_per_machine_hour:'cutting_productivity_m_machine_h',preparation_productivity_linear_m_per_man_hour:'preparation_productivity_m_man_h',
  qa_interval_linear_m_per_test:'qa_interval_m_check'};
const bindExpression=(expression:string)=>expression.replace(/[A-Za-z_][A-Za-z0-9_]*/gu,id=>parameterBindings[id]??id);
export const SKIRTING_READY_ADHESIVE_CONSUMPTION_EXPRESSION_S2735=bindExpression(consumptionMatch[1]);
const readyRowsById=new Map([...readyInstall,...readyGlue].map(row=>[row.row_id,row]));
const profile=(id:string,title:string,valueType:AutomaticParameterSpec['valueType'],unitId:string|null,defaultValue:string|number,
  extra:Partial<AutomaticParameterSpec>={}):AutomaticParameterSpec=>({id,title,valueType,unitId,defaultValue,kind:'profile',...extra});
const fact=(id:string,title:string,unitId:string|null,valueType:AutomaticParameterSpec['valueType']='decimal',
  extra:Partial<AutomaticParameterSpec>={}):AutomaticParameterSpec=>({id,title,valueType,unitId,kind:'ordinary',...(valueType==='decimal'?{min:0}:{}),...extra});
const eq=(parameterId:string,value:string)=>({kind:'equals' as const,parameterId,value});
const confirmed=eq('applicability_mode','CONFIRMED_PROJECT_FACTS');
const prepared=eq('local_preparation_mode','REQUIRED');
const sealed=eq('junction_sealing_mode','REQUIRED');
const manualCutting=eq('cutting_mode','MANUAL_SAW');
const electricCutting=eq('cutting_mode','ELECTRIC_SAW');
const capsRequired={kind:'greater_than' as const,parameterId:'end_cap_count',value:0};
const and=(...operands:AutomaticInclusionCondition[]):AutomaticInclusionCondition=>({kind:'and',operands});
const or=(...operands:AutomaticInclusionCondition[]):AutomaticInclusionCondition=>({kind:'or',operands});
const bothSealantUses=and(capsRequired,sealed);
const sharedSealant=and(bothSealantUses,eq('sealant_supply_grouping','SHARED_COMPATIBLE_BATCH'));
const separateCaps=and(capsRequired,or(eq('junction_sealing_mode','SURVEY_PENDING'),eq('junction_sealing_mode','NOT_REQUIRED'),eq('sealant_supply_grouping','SEPARATE_DISTINCT_PRODUCTS')));
const separateJunction=and(sealed,or({kind:'less_than_or_equal',parameterId:'end_cap_count',value:0},eq('sealant_supply_grouping','SEPARATE_DISTINCT_PRODUCTS')));

export function buildSkirtingDefinitionS2735(operation:'install'|'glue'):AutomaticOwnerDefinition {
  const parameters:AutomaticParameterSpec[]=[
    fact('length_m','Измеренная чистовая длина плинтуса, без автоматического припуска на углы','m','decimal',{min:0.001}),
    profile('applicability_mode','Предварительный выбранный профиль либо подтверждённые факты объекта','enum',null,'PRELIMINARY_PROFILE',{values:['PRELIMINARY_PROFILE','CONFIRMED_PROJECT_FACTS']}),
    profile('skirting_product_code','Предварительно Gerflor Design Skirting6086; другие изделия требуют совместимого профиля','enum',null,'6086',{values:['6086']}),
    profile('skirting_colour_batch','Цвет, артикул декора и партия Gerflor6086 требуют выбора','text',null,'Gerflor6086, ПВХ60×10мм; цвет/декор и партия ещё не подтверждены'),
    ...(operation==='install'?[
      profile('cut_extra_m','Дополнительная длина закупки на раскрой: предварительно0м до обмера углов; это не норма и не подтверждённый раскрой','decimal','m',0,{min:0}),
      profile('board_order_pieces','Кратность заказа в планках2м: предварительно6 (коробка12м); изменить по фактической поставке','integer','piece',6,{min:1,max:6}),
    ]:[]),
    profile('end_cap_count','Торцевые вставки Gerflor6087: предварительно0шт, реальные окончания линии требуют обмера','integer','piece',0,{min:0}),
    profile('adhesive_product','Предварительно Forbo Eurocol232 Eurosol Montage; расход не переносится на другой клей','enum',null,'FORBO_232',{values:['FORBO_232']}),
    profile('adhesive_rate_ml_m','Forbo232: предварительно40мл/м, верхняя граница опубликованных20–40; проверить нанесением','decimal','ml_per_m',40,{min:20,max:40}),
    fact('end_cap_sealant_designation','Отдельный совместимый клей-герметик вставок6087, не монтажный Forbo232; указать точное изделие и подтверждение совместимости',null,'text',{kind:'conditional',requiredWhen:separateCaps}),
    fact('end_cap_sealant_consumption_ml','Фактический объём отдельного клея-герметика вставок6087','ml','decimal',{kind:'conditional',requiredWhen:capsRequired}),
    fact('end_cap_sealant_cartridge_ml','Фактическая ёмкость упаковки выбранного клея-герметика вставок6087','ml','decimal',{kind:'conditional',requiredWhen:separateCaps,min:0.000001}),
    fact('sealant_supply_grouping','Для вставок и примыкания: разные подтверждённые изделия либо одна совместимая партия с общим заказом',null,'enum',{kind:'conditional',requiredWhen:bothSealantUses,values:['SEPARATE_DISTINCT_PRODUCTS','SHARED_COMPATIBLE_BATCH']}),
    fact('shared_sealant_designation','Одно точное изделие/партия клея-герметика, совместимое со вставками6087 и выбранным примыканием, не Forbo232',null,'text',{kind:'conditional',requiredWhen:sharedSealant}),
    fact('shared_sealant_cartridge_ml','Фактическая упаковка общей совместимой партии клея-герметика','ml','decimal',{kind:'conditional',requiredWhen:sharedSealant,min:0.000001}),
    fact('shared_sealant_compatibility_confirmed','Совместимость общей партии с обоими узлами подтверждена',null,'enum',{kind:'conditional',requiredWhen:sharedSealant,values:['YES']}),
    profile('cutting_mode','Предварительно ручная мелкозубая ножовка со стуслом; электрораскрой выбирается отдельно','enum',null,'MANUAL_SAW',{values:['MANUAL_SAW','ELECTRIC_SAW']}),
    profile('local_preparation_mode','Местное выравнивание/грунтование линии: обследование ещё не выполнено','enum',null,'SURVEY_PENDING',{values:['SURVEY_PENDING','NOT_REQUIRED','REQUIRED']}),
    profile('junction_sealing_mode','Герметизация примыканий: необходимость и узел ещё не подтверждены','enum',null,'SURVEY_PENDING',{values:['SURVEY_PENDING','NOT_REQUIRED','REQUIRED']}),
    fact('installation_productivity_m_man_h','Производительность единого монтажа, раскроя и приклеивания по подтверждённой карте/фактическим условиям; не по названию варианта','m_per_man_hour','decimal',{min:0.000001}),
    fact('cutting_productivity_m_machine_h','Производительность принятого электрораскроя по подтверждённому способу; оператор учтён в труде','m_per_machine_hour','decimal',{kind:'conditional',requiredWhen:electricCutting,min:0.000001}),
    fact('preparation_productivity_m_man_h','Производительность очистки и подготовки линии; труд местного выравнивания добавляется только при выборе','m_per_man_hour','decimal',{min:0.000001}),
    fact('qa_interval_m_check','Фактический план контроля длины/стыков, м на проверку; не универсальная норма','m','decimal',{min:0.000001}),
    profile('documentation_record_count','Предварительно одна запись передачи линии/материала; уточнить план','integer','item',1,{min:0}),
    fact('separate_delivery_trip_count','Отдельно оплачиваемые рейсы всей системы плинтуса; явный0 если доставка включена','trip','decimal',{min:0}),
    fact('delivery_payment_scope_reference','Граница оплаты общей доставки; перевозка поставщика и других операций исключена',null,'text'),
    fact('equipment_payment_scope_reference','Граница ставки электрораскроя: оператор в труде один раз; энергия/топливо включены',null,'text',{kind:'conditional',requiredWhen:electricCutting}),
    fact('cleaner_designation','Совместимый очиститель клея/поверхностей: согласовать с печатной плёнкой ПВХ и инструкциями клея',null,'text'),
    fact('cleaner_consumption_l','Фактический расход согласованного очистителя; инструкция Forbo об ацетоне не утверждает его для декора Gerflor','l'),
    fact('cleaner_package_l','Фактическая фасовка согласованного очистителя','l','decimal',{min:0.000001}),
    fact('local_preparation_product','Совместимая смесь местного выравнивания нижней части стены по обследованию',null,'text',{kind:'conditional',requiredWhen:prepared}),
    fact('local_preparation_mass_kg','Фактическая масса выбранной смеси местного выравнивания','kg','decimal',{kind:'conditional',requiredWhen:prepared}),
    fact('local_preparation_package_kg','Фактическая фасовка смеси местного выравнивания','kg','decimal',{kind:'conditional',requiredWhen:prepared,min:0.000001}),
    fact('local_primer_product','Совместимая грунтовка выбранного местного выравнивания',null,'text',{kind:'conditional',requiredWhen:prepared}),
    fact('local_primer_consumption_l','Фактический расход грунтовки местного выравнивания','l','decimal',{kind:'conditional',requiredWhen:prepared}),
    fact('local_primer_package_l','Фактическая фасовка грунтовки местного выравнивания','l','decimal',{kind:'conditional',requiredWhen:prepared,min:0.000001}),
    fact('local_preparation_worker_h','Дополнительный труд местного выравнивания, без повторной оплаты очистки линии','man_hour','decimal',{kind:'conditional',requiredWhen:prepared}),
    fact('junction_sealant_product','Отдельный совместимый герметик и проектный узел примыкания; влагостойкость плинтуса не подтверждает узел',null,'text',{kind:'conditional',requiredWhen:separateJunction}),
    fact('junction_sealant_consumption_l','Фактический объём герметика выбранного примыкания','l','decimal',{kind:'conditional',requiredWhen:sealed}),
    fact('junction_sealant_package_l','Фактическая упаковка отдельного герметика примыкания','l','decimal',{kind:'conditional',requiredWhen:separateJunction,min:0.000001}),
    fact('junction_sealing_worker_h','Фактический дополнительный труд герметизации примыкания','man_hour','decimal',{kind:'conditional',requiredWhen:sealed}),
    ...['system_compatibility_confirmed','prepared_plane_dry_substrate_confirmed','corner_layout_confirmed','forbo_processing_ventilation_controls_confirmed'].map(id=>
      fact(id,({system_compatibility_confirmed:'Совместимость конкретных Gerflor6086/Forbo232 и основания подтверждена',prepared_plane_dry_substrate_confirmed:'Ровное сухое прочное чистое бетонное основание подтверждено',corner_layout_confirmed:'Раскрой, дополнительная длина и окончания линии обмерены',forbo_processing_ventilation_controls_confirmed:'Условия нанесения Forbo232, вентиляция и работа с растворителем подтверждены'})[id]!,null,'enum',{kind:'conditional',requiredWhen:confirmed,values:['YES']})),
  ];
  const confirmations=['applicability_mode','system_compatibility_confirmed','prepared_plane_dry_substrate_confirmed','corner_layout_confirmed','forbo_processing_ventilation_controls_confirmed'];
  const rows:AutomaticRowSpec[]=[{rowId:'scope:skirting:installed',formulaId:'skirting_installed_scope_v1',section:'Объём и границы',category:'service',title:'Чистовая длина линии выбранного профиля; монтаж оплачивается единственным ресурсом труда',unitId:'m',expression:'length_m',costTreatment:'INFORMATIONAL_SCOPE',titleParameterIds:['skirting_product_code','skirting_colour_batch']},
    {rowId:'scope:skirting:adhesive-consumption',formulaId:'skirting_ready_adhesive_consumption_v1',section:'Потребление клея',category:'service',title:'Расход клея по готовой операции, до заказа картриджей; отдельно не оплачивается',unitId:'ml',expression:SKIRTING_READY_ADHESIVE_CONSUMPTION_EXPRESSION_S2735,costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:'skirting_adhesive_net_ml',unitId:'ml'}}];
  const provenance=new Map<string,string>();
  function supply(rowId:string,title:string,unitId:string,consumed:string,quantum:string,extra:Partial<AutomaticRowSpec>={}){
    const prefix=rowId.replace(/[^A-Za-z0-9_]/gu,'_'),stock=prefix+'_stock',reserve=prefix+'_reserve';
    parameters.push(profile(stock,title+': предварительно0 пригодного наличия; подтвердить остатки','decimal',unitId,0,{min:0}),profile(reserve,title+': предварительно0 сохраняемого резерва; подтвердить','decimal',unitId,0,{min:0}));
    rows.push({rowId,formulaId:prefix+'_order_v1',section:'Поставка и оснащение',category:'material',title,unitId,expression:`ceil(max(0,(${consumed})+${reserve}-${stock})/(${quantum}))*(${quantum})`,procurement:true,
      ...effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:unitId,consumed,stock,reserve,quantum}).owner,inputParameterIds:confirmations,...extra});
  }
  if(operation==='install'){
    supply('material:skirting:board','Gerflor Design Skirting6086, ПВХ60×10мм, планка2м; выбранная кратность поставки','m','length_m+cut_extra_m','2*board_order_pieces',{titleParameterIds:['skirting_colour_batch','board_order_pieces']});
    supply('material:skirting:end-cap','Торцевая вставка Gerflor6087; количество по окончаниям линии','piece','end_cap_count','1');
  }
  supply('material:skirting:adhesive','Forbo Eurocol232 Eurosol Montage, картридж310мл; расход20–40мл/м по выбранному способу','ml','skirting_adhesive_net_ml','310',{titleParameterIds:['adhesive_product','adhesive_rate_ml_m']});
  provenance.set('material:skirting:adhesive',readyAdhesiveSourceId);
  supply('material:skirting:end-cap-sealant','Отдельный совместимый клей-герметик торцевых вставок6087','ml','end_cap_sealant_consumption_ml','end_cap_sealant_cartridge_ml',{
    inclusion:separateCaps,titleParameterIds:['end_cap_sealant_designation'],inputParameterIds:[...confirmations,'end_cap_sealant_designation']});
  supply('material:skirting:cleaner','Согласованный очиститель клея и поверхности; спецификация и фактический расход требуют подтверждения','l','cleaner_consumption_l','cleaner_package_l',{titleParameterIds:['cleaner_designation'],inputParameterIds:[...confirmations,'cleaner_designation']});
  supply('material:skirting:local-repair','Выбранная смесь местного выравнивания линии','kg','local_preparation_mass_kg','local_preparation_package_kg',{inclusion:prepared,titleParameterIds:['local_preparation_product'],inputParameterIds:[...confirmations,'local_preparation_product']});
  supply('material:skirting:local-primer','Грунтовка системы местного выравнивания','l','local_primer_consumption_l','local_primer_package_l',{inclusion:prepared,titleParameterIds:['local_primer_product'],inputParameterIds:[...confirmations,'local_primer_product']});
  supply('material:skirting:junction-sealant','Герметик подтверждённого примыкания; отдельное подтверждённое изделие','l','junction_sealant_consumption_l','junction_sealant_package_l',{inclusion:separateJunction,titleParameterIds:['junction_sealant_product'],inputParameterIds:[...confirmations,'junction_sealant_product']});
  const sharedSealantId='material:skirting:shared-sealant';
  supply(sharedSealantId,'Общая совместимая партия клея-герметика: вставки6087 и примыкание, один заказ','ml','end_cap_sealant_consumption_ml+1000*junction_sealant_consumption_l','shared_sealant_cartridge_ml',{
    inclusion:sharedSealant,titleParameterIds:['shared_sealant_designation'],inputParameterIds:[...confirmations,'shared_sealant_designation','shared_sealant_compatibility_confirmed']});
  for(const [key,title,expression]of [['end-caps','Вставки6087: распределение общей партии клея-герметика','end_cap_sealant_consumption_ml'],['junction','Примыкание: распределение общей партии клея-герметика','1000*junction_sealant_consumption_l']]){
    rows.push({rowId:'allocation:skirting:sealant:'+key,formulaId:'skirting_sealant_'+key.replaceAll('-','_')+'_allocation_v1',section:'Распределение общей поставки',category:'material',title,unitId:'ml',expression,
      inclusion:sharedSealant,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,purchaseBalanceOwnerRowId:sharedSealantId});
  }
  const tools=[['mitre-saw','Ручная мелкозубая ножовка','piece',1],['mitre-box','Стусло для обмеренных углов ручного раскроя','piece',1],['electric-saw-blade','Совместимый мелкозубый диск электрораскроя; предварительное оснащение','piece',1],['medium-sandpaper','Среднезернистая шлифовальная бумага кромок; предварительное оснащение','piece',2],['fine-sandpaper','Мелкозернистая шлифовальная бумага кромок; предварительное оснащение','piece',2],
    ['sanding-block','Шлифовальный брусок кромок','piece',1],['cartridge-gun','Совместимый ручной пистолет картриджа310мл','piece',1],['tape-measure','Рулетка обмера и раскроя','piece',1],['marking-pencil','Разметочный карандаш','piece',1],['level','Уровень проверки линии','piece',1],
    ['masking-tape','Защитная малярная лента выбранных кромок; предварительно25м','m',25],['protection-film','Плёнка защиты примыкающих поверхностей; предварительно5м²','m2',5],['wipes','Салфетки согласованной очистки; предварительное количество','piece',10],['gloves','Совместимые с выбранным клеем защитные перчатки, пары','pair',2],['eye-protection','Защитные очки раскроя','piece',1],['waste-bags','Мешки обрезков и упаковки','piece',2]] as const;
  for(const [key,title,unitId,count]of tools){const id='skirting_tool_'+key.replaceAll('-','_')+'_required';parameters.push(profile(id,title+': видимое предварительное количество, заменить по наличию/способу','decimal',unitId,count,{min:0}));
    const inclusion=key==='mitre-saw'||key==='mitre-box'?manualCutting:key==='electric-saw-blade'?electricCutting:undefined;
    supply('material:skirting:tool:'+key,title,unitId,id,unitId==='m'?'25':'1',inclusion?{inclusion}:{});}
  const selected=readyInstall.filter(row=>['installation_labor','application_equipment','preparation_labor','quality_tests','documentation_records'].some(key=>row.row_id.endsWith(':'+key)));
  if(selected.length!==5)throw Error('SKIRTING_READY_RESOURCE_SCOPE_CHANGED');
  for(const source of selected){const key=source.row_id.split(':').at(-1)!;const rowId='skirting:'+key;
    rows.push({rowId,formulaId:'skirting_ready_'+key+'_v1',section:source.section,category:source.category==='testing'||source.category==='documentation'?'service':source.category,
      title:source.title_ru,unitId:source.formula.output_unit_id,expression:bindExpression(source.formula.expression),costTreatment:source.category==='testing'||source.category==='documentation'?'INFORMATIONAL_SCOPE':'OWN_COST',
      ...(source.category==='equipment'?{inclusion:electricCutting}:{}),
      inputParameterIds:source.category==='equipment'?[...confirmations,'equipment_payment_scope_reference']:confirmations});provenance.set(rowId,source.row_id);}
  rows.push({rowId:'labor:skirting:local-preparation',formulaId:'skirting_local_preparation_h_v1',section:'Местная подготовка',category:'labor',title:'Дополнительный труд местного выравнивания по обследованию',unitId:'man_hour',expression:'local_preparation_worker_h',inclusion:prepared,inputParameterIds:confirmations},
    {rowId:'labor:skirting:junction-sealing',formulaId:'skirting_junction_sealing_h_v1',section:'Применимое примыкание',category:'labor',title:'Дополнительный труд герметизации подтверждённого примыкания',unitId:'man_hour',expression:'junction_sealing_worker_h',inclusion:sealed,inputParameterIds:confirmations},
    {rowId:'delivery:skirting:system',formulaId:'skirting_system_delivery_v1',section:'Общая доставка системы',category:'service',title:'Единая отдельно оплачиваемая доставка материалов системы плинтуса',unitId:'trip',expression:'separate_delivery_trip_count',inclusion:{kind:'greater_than',parameterId:'separate_delivery_trip_count',value:0},inputParameterIds:['delivery_payment_scope_reference']});
  const definition=buildAutomaticConstructionOwnerR1({contract:SKIRTING_CONTRACT_S2735,semanticOwner:'skirting-'+operation,sourceId:SKIRTING_SOURCE_ID_S2735,normId:SKIRTING_NORM_ID_S2735,sourceMetadata:SKIRTING_SOURCE_METADATA_S2735,applicabilityRu:SKIRTING_SOURCE_METADATA_S2735.use_restriction,
    ordinary:parameters.filter(p=>p.kind==='ordinary'),profile:parameters.filter(p=>p.kind==='profile'),conditional:parameters.filter(p=>p.kind==='conditional'),rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:['готовность стены/совместимость конкретной партии','норма раскроя и подтверждённые углы','нормы труда по названию зоны','автоматические саморезы/подложка/напольное покрытие','цены и утверждение проекта']});
  return Object.freeze({...definition,ordinaryParameterIds:['length_m'],resources:definition.resources.map(row=>{
    const sourceId=provenance.get(row.row_id),sourceRow=sourceId?readyRowsById.get(sourceId):null;
    const operationId=row.row_id.includes('end-cap')?'end-caps':row.row_id.includes('junction')?'junction':row.category==='material'?'supply':row.category==='labor'?'single-installation':row.category==='equipment'?'cutting-equipment':'scope-logistics';
    const useTitles:Record<string,string>={'end-caps':'Установка торцевых вставок','junction':'Герметизация подтверждённого примыкания'};
    const output={...row,resource_graph:{...row.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'skirting-'+operation,groupTitleRu:operation==='install'?'Монтаж плинтуса с поставкой и готовым приклеиванием':'Приклеивание предоставленного совместимого плинтуса',
      operationId,operationTitleRu:useTitles[operationId]??(row.category==='material'?'Материалы и оснащение':row.category==='labor'?'Единый монтаж и применимая подготовка':row.category==='equipment'?'Раскройное оборудование':'Граница, контроль и доставка'),completionCriterionRu:'Подтвердить выбранную систему, раскрой, состояние линии и фактические оплачиваемые ресурсы',
      // Existing compatible batch is one stock/order/cost owner. The two
      // source-declared uses display references to that same physical row.
      ...(row.row_id===sharedSealantId?{additionalOperations:['end-caps','junction'].map(stage=>({operationId:stage,operationTitleRu:useTitles[stage],
        completionCriterionRu:'Одна подтверждённая совместимая партия обеспечивает узел; её расход входит в общий заказ и оплачивается у одного владельца.'}))}:{})},
      ...(row.row_id.startsWith('allocation:')?{includedInResourceOwnerRowId:sharedSealantId,purchaseConsumptionAllocationV1:{contractVersion:'canonical-purchase-consumption-allocation/v1',ownerRowId:sharedSealantId}}:{})},
      source_metadata:{...row.source_metadata,projectApprovalClaimed:false,universal_productivity_claimed:false,preliminaryProfileWithoutHiddenDemo:true,
        reusedOperation:sourceRow?{sourceRowId:sourceRow.row_id,sourceFormulaId:sourceRow.formula.formula_id,sourceVersion:'professional-baseboard-assembly-v1',parameterBindings,consumptionNumeratorLifted:row.row_id==='material:skirting:adhesive'}:null}};
    return {...output,row_sha256:estimateDeterministicHash({...output,row_sha256:''})};})});
}
export const SKIRTING_DEFINITIONS_S2735=Object.freeze({install:buildSkirtingDefinitionS2735('install'),glue:buildSkirtingDefinitionS2735('glue')});
export function compileSkirtingConstructorS2735(submittedParameters:Record<string,unknown>,catalogId=SKIRTING_TARGETS_S2735[0].catalogId){
  const target=SKIRTING_TARGETS_S2735.find(item=>item.catalogId===catalogId);if(!target)throw Error('SKIRTING_CATALOG_UNSUPPORTED');
  return compileAutomaticConstructionOwnerR1({compilerVersion:SKIRTING_CONTRACT_S2735,catalogId,primaryMeasureParameterId:'length_m',definition:SKIRTING_DEFINITIONS_S2735[target.operation],submittedParameters});
}
