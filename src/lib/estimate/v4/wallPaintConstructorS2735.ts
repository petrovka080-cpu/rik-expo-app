import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import ct54ActualQuantityPlan from '../../../../data/estimate-benchmarks/source-packs/ct54-actual-project-quantity-plan-r1.json';
import ct54ReferenceProjectSystem from '../../../../data/estimate-benchmarks/source-packs/ct54-manual-reference-project-system-r608.json';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {buildPaintCeresitCt54Ct17ProfessionalPackagePartsV1} from './domains/interiorFinishesComplete/paintCeresitCt54Ct17ProfessionalV1';
import {INTERIOR_FINISHES_DOMAIN_INVENTORY} from './domains/interiorFinishesComplete/inventory';
import {CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA as CT54,CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA as CT17} from './domainFactory/professionalPhysicalNormApplicabilityV1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const WALL_PAINT_VARIANTS_S2735=['standard','high_load','technical_room','wet_zone'] as const;
export const WALL_PAINT_CATALOGS_S2735=WALL_PAINT_VARIANTS_S2735.map(variant=>'canonical-work:base:plaster_paint_interior_paint_wall_paint_'+variant);
export const WALL_PAINT_CONTRACT_S2735='wall-paint-constructor:s27-35.v1';
export const WALL_PAINT_SOURCE_ID_S2735='src_wall_paint_ready_ct54_ct17_s27_35';
export const WALL_PAINT_NORM_ID_S2735='project:wall-paint:ct54-ct17-ct29:s27-35.v1';
export const WALL_PAINT_SOURCE_METADATA_S2735={source_title:'Внутренняя окраска: готовые CT54/CT17 операции, условный минеральный ремонт CT29, отдельные материалы и совместимая поставка',
  source_authority:'Henkel: конкретные материалы; условия и производительность подтверждаются по объекту',source_document_version:WALL_PAINT_CONTRACT_S2735,
  definition_hash:'3082ca85aad1910475d5531d5d23c6daa7e3dca4d6f27974e4aa02882031ee42',artifact_sha256:'3082ca85aad1910475d5531d5d23c6daa7e3dca4d6f27974e4aa02882031ee42',
  exact_locator:'source-packs/wall-paint-constructor-s27-35.json; CT54en_GL C_CT54_TDS_1_0819 pp1–2; CT17en_GL PROFI03.24 pp1–2; CT29en_GL C_CT29_TDS_1_0120 pp1–2; ready paint package labour/equipment/preparation/control ASTs',
  use_restriction:'Предварительно внутренняя цементно-известковая минеральная стена: CT54 два слоя, CT17en_GL по выбранному способу, CT29 по обследованию. Не применять молча к акриловым/полимерным основаниям, фасадам, потолкам или другой версии продукта. Готовность, возраст/влажность, высыхание, условия и труд не подтверждены площадью. Потребности/цены и инженерное утверждение требуют фактов.'};
const inventory=INTERIOR_FINISHES_DOMAIN_INVENTORY.find(item=>item.work_key==='plaster_paint_interior_paint_wall_paint_standard');
if(!inventory)throw Error('WALL_PAINT_READY_INVENTORY_MISSING');
const parts=buildPaintCeresitCt54Ct17ProfessionalPackagePartsV1(inventory);
if(!parts||CT54.rate_value!==0.3||CT54.coat_count!==2||CT17.rate_range_l_m2[0]!==0.1||CT17.rate_range_l_m2[1]!==0.5)throw Error('WALL_PAINT_READY_SOURCE_DRIFT');
const ready=parts.child_assemblies.flatMap(child=>child.rows);
const pick=(suffix:string)=>{const row=ready.find(r=>r.row_id.endsWith(':row:'+suffix));if(!row)throw Error('WALL_PAINT_READY_ROW_MISSING:'+suffix);return row;};
export const WALL_PAINT_READY_ROWS_S2735=Object.fromEntries(['paint_labor','paint_equipment','substrate_preparation','quality_tests','documentation_records','ct17_paint_primer','ct54_paint'].map(key=>[key,pick(key)]));
const profile=(id:string,title:string,valueType:AutomaticParameterSpec['valueType'],unitId:string|null,defaultValue:string|number,extra:Partial<AutomaticParameterSpec>={}):AutomaticParameterSpec=>({id,title,valueType,unitId,kind:'profile',defaultValue,...extra});
const fact=(id:string,title:string,unitId:string|null,valueType:AutomaticParameterSpec['valueType']='decimal',extra:Partial<AutomaticParameterSpec>={}):AutomaticParameterSpec=>({id,title,valueType,unitId,kind:'conditional',...(valueType==='decimal'?{min:0}:{}),...extra});
const eq=(parameterId:string,value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId,value});
const and=(...operands:AutomaticInclusionCondition[]):AutomaticInclusionCondition=>({kind:'and',operands});
const or=(...operands:AutomaticInclusionCondition[]):AutomaticInclusionCondition=>({kind:'or',operands});
const confirmed=eq('applicability_mode','CONFIRMED_PROJECT_FACTS');
const prime=or(eq('paint_priming_mode','CT17_UNDILUTED'),eq('paint_priming_mode','CT17_DILUTED_1_TO_1'));
const diluted=eq('paint_priming_mode','CT17_DILUTED_1_TO_1');
const noPrime=or(eq('paint_priming_mode','NOT_REQUIRED'),eq('paint_priming_mode','ALREADY_PRIMED'));
const repair=eq('mineral_repair_mode','CT29_REQUIRED');
const noRepair=or(eq('mineral_repair_mode','SURVEY_PENDING'),eq('mineral_repair_mode','NOT_REQUIRED'));
const repairPrime=and(repair,eq('repair_preparation_mode','CT17_UNDILUTED'));
const noRepairPrime=or(noRepair,and(repair,eq('repair_preparation_mode','MOISTEN_ONLY')));
const spray=eq('paint_application_mode','PAID_SPRAY_EQUIPMENT');
const manual=eq('paint_application_mode','MANUAL_ROLLER_BRUSH');
const paintDiluted=eq('ct54_first_coat_water_ratio','0.1');
const actualSystemFacts=['mineral_compatible_substrate_confirmed','prepared_clean_dry_wall_confirmed','primer_complete_drying_confirmed','processing_conditions_confirmed','selected_products_batch_confirmed'] as const;
const systemInputs=['applicability_mode',...actualSystemFacts,'substrate_age_days'];
const parameters:AutomaticParameterSpec[]=[
  {...fact('area_m2','Измеренная площадь внутренних стен, без потолка/пола и без автоматически включённых проёмов','m2'),kind:'ordinary',min:0.001},
  profile('applicability_mode','Предварительный профиль либо факты объекта, подтверждённые по обследованию','enum',null,'PRELIMINARY_PROFILE',{values:['PRELIMINARY_PROFILE','CONFIRMED_PROJECT_FACTS']}),
  profile('substrate_product_profile','Выбранная область: минеральная цементно-известковая штукатурка, не акрил/полимерная шпаклёвка','enum',null,'CEMENT_LIME_MINERAL_PLASTER',{values:['CEMENT_LIME_MINERAL_PLASTER']}),
  profile('ct54_delivered_version','Выбранная краска CT54en_GL C_CT54_TDS_1_0819; другое производство требует своего профиля','enum',null,'CT54_EN_GL_0819',{values:['CT54_EN_GL_0819']}),
  profile('ct54_colour_batch','Цвет и партия краски должны быть выбраны; одна совместимая партия на плоскость','text',null,'CT54 Silicate Aero; цвет/база и партия ещё не подтверждены'),
  profile('ct54_coat_count','Точный предварительный профиль: два слоя, расход0.3л/м² относится к обоим слоям','integer','item',CT54.coat_count,{min:2,max:2}),
  profile('ct54_total_rate_l_m2','CT54: средний приблизительный расход0.3л/м² для двух слоёв; пригодность среднего по основанию проверить','decimal','l_per_m2',CT54.rate_value,{min:CT54.rate_value,max:CT54.rate_value}),
  profile('ct54_container_l','Фасовка выбранной версии CT54; предварительно15л','enum','l','15',{values:CT54.documented_container_sizes_l.map(String)}),
  profile('ct54_intercoat_hours','CT54: минимум12ч между слоями, не оплачиваемые рабочие часы','decimal','hour',CT54.minimum_intercoat_break_hours,{min:CT54.minimum_intercoat_break_hours}),
  profile('ct54_first_coat_water_ratio','Вода только в первый слой при применимом впитывающем основании: предварительно без разбавления','enum',null,'0',{values:['0','0.1']}),
  fact('ct54_first_coat_paint_l','Фактическая положительная часть общего объёма CT54 в первом слое; меньше общего расхода двух слоёв, не делить молча пополам','l','decimal',{requiredWhen:paintDiluted,min:0.000001}),
  profile('paint_priming_mode','Предварительно CT17en_GL без разбавления, один проход; применимость либо уже выполненное грунтование уточнить','enum',null,'CT17_UNDILUTED',{values:['CT17_UNDILUTED','CT17_DILUTED_1_TO_1','NOT_REQUIRED','ALREADY_PRIMED']}),
  profile('ct17_delivered_version','Точная CT17 PROFIen_GL03.24; расход и фасовка не от ru_KZ и не от концентрата','enum',null,'CT17_PROFI_EN_GL_03_24',{values:['CT17_PROFI_EN_GL_03_24']}),
  profile('ct17_product_rate_l_m2_pass','CT17: предварительно0.2л продукта/м² за проход в диапазоне0.1–0.5; не расход разведённого раствора','decimal','l_per_m2',0.2,{min:CT17.rate_range_l_m2[0],max:CT17.rate_range_l_m2[1]}),
  profile('ct17_paint_pass_count','Предварительно1проход; повторить при оставшейся впитываемости, уточнить по основанию','integer','item',1,{min:1,max:10}),
  profile('ct17_container_l','Одна выбранная совместимая поставка CT17PROFIen_GL; предварительно5л','enum','l','5',{values:CT17.documented_container_sizes_l.map(String)}),
  fact('ct17_diluted_product_rate_l_m2_pass','Для1:1 указать проверенный расход именно неразведённого продукта, не общий объём раствора','l_per_m2','decimal',{requiredWhen:diluted,min:0.000001}),
  profile('paint_application_mode','Предварительно ручные валик/кисть; отдельно оплачиваемый распылитель выбирается явно','enum',null,'MANUAL_ROLLER_BRUSH',{values:['MANUAL_ROLLER_BRUSH','PAID_SPRAY_EQUIPMENT']}),
  fact('paint_productivity_m2_per_man_hour','Производительность готовой операции двух слоёв с перемешиванием и оператором по фактическому ППР','m2_per_man_hour','decimal',{min:0.000001}),
  fact('paint_equipment_productivity_m2_per_machine_hour','Фактическая производительность распыления; производительность аппарата12л/мин не является нормой м²/ч','m2_per_machine_hour','decimal',{requiredWhen:spray,min:0.000001}),
  fact('spray_payment_scope_reference','Ставка распылителя включает аппарат/шланг/пистолет/форсунку; оператор уже в труде, миксер отдельно',null,'text',{requiredWhen:spray}),
  fact('substrate_preparation_productivity_m2_per_man_hour','Производительность очистки/приёмки стены готовой операции; грунтование и ремонт оплачиваются отдельным применимым трудом','m2_per_man_hour','decimal',{min:0.000001}),
  fact('primer_productivity_m2_pass_per_man_hour','Производительность применимого грунтования по фактической карте','m2_per_man_hour','decimal',{requiredWhen:or(prime,repairPrime),min:0.000001}),
  fact('qa_interval_m2_per_test','Фактический план контроля покрытия, м² на проверку; не норма по варианту зоны','m2','decimal',{min:0.000001}),
  profile('documentation_record_count','Предварительно одна запись материалов/контроля','integer','item',1,{min:0}),
  profile('mineral_repair_mode','Ремонт минеральной стены: обследование ещё не выполнено; CT29 только по обнаруженному объёму','enum',null,'SURVEY_PENDING',{values:['SURVEY_PENDING','NOT_REQUIRED','CT29_REQUIRED']}),
  fact('repair_area_m2','Фактически обследованная площадь ремонта CT29, внутри измеренной площади стены','m2','decimal',{requiredWhen:repair,min:0.000001,numericPeerConstraints:{lessThanOrEqualParameter:'area_m2'}}),
  fact('repair_average_depth_mm','Средняя фактическая толщина минерального ремонта CT29','mm','decimal',{requiredWhen:repair,min:0.000001}),
  profile('ct29_pack_kg','Фасовка CT29en_GL; предварительно25кг, другая допустимая5кг','enum','kg','25',{values:['5','25']}),
  profile('ct29_additional_full_batches','Дополнительные полные замесы CT29 по карте/перерывам сверх минимальных: предварительно0, это не подтверждённая норма потерь','integer','piece',0,{min:0}),
  profile('ct29_stock_full_bags','Пригодное сухое наличие CT29 только целыми мешками выбранной фасовки; предварительно0','integer','piece',0,{min:0}),
  profile('ct29_reserve_full_bags','Сохраняемый сухой резерв CT29 целыми мешками выбранной фасовки; предварительно0','integer','piece',0,{min:0}),
  profile('ct29_water_l_per_25kg','CT29: предварительно6л/25кг в опубликованных5.7–6.2','decimal','l',6,{min:5.7,max:6.2}),
  profile('ct29_water_l_per_5kg','CT29: предварительно1.2л/5кг в опубликованных1.1–1.3','decimal','l',1.2,{min:1.1,max:1.3}),
  fact('repair_preparation_mode','Фактическая подготовка CT29: увлажнение либо совместимая CT17 до ремонта; без обследования способ не назначается',null,'enum',{requiredWhen:repair,values:['MOISTEN_ONLY','CT17_UNDILUTED']}),
  fact('repair_preparation_reference','Подтверждённая подготовка основания CT29: влажное не мокрое, либо CT17 и применимая выдержка; SURVEY_PENDING не подтверждает готовность',null,'text',{requiredWhen:repair}),
  fact('repair_drying_compatibility_reference','Проверенная готовность минерального ремонта к CT54 по возрасту/влажности/поверхности; неподходящая полимерная шпаклёвка исключена',null,'text',{requiredWhen:repair}),
  fact('repair_productivity_m2_per_man_hour','Фактическая производительность ремонта выбранной толщины; готовая формула подготовки привязана к ремонтной площади','m2_per_man_hour','decimal',{requiredWhen:repair,min:0.000001}),
  fact('repair_additional_water_l','Дополнительная вода увлажнения, защиты/выдержки и очистки ремонта по фактической карте; явный0 только при подтверждённом отсутствии','l','decimal',{requiredWhen:repair}),
  profile('paint_cleaning_water_l_m2','Предварительный план мойки малярного инструмента0.1л/м² стены; заменить фактическим планом, это не норма изготовителя','decimal','l_per_m2',0.1,{min:0}),
  profile('water_order_quantum_l','Кратность единой поставки чистой воды: предварительно5л, заменить фактической','decimal','l',5,{min:0.000001}),
  fact('separate_delivery_trip_count','Единые отдельно оплачиваемые рейсы всей малярной системы; явный0 если доставка уже включена','trip'),
  fact('delivery_payment_scope_reference','Граница оплаты единой доставки материалов, без повторной перевозки поставщика/другой операции',null,'text',{requiredWhen:{kind:'greater_than',parameterId:'separate_delivery_trip_count',value:0}}),
  ...actualSystemFacts.map(id=>fact(id,({mineral_compatible_substrate_confirmed:'Минеральное совместимое основание без акрилового/полимерного покрытия подтверждено',prepared_clean_dry_wall_confirmed:'Ровная прочная сухая чистая стена подтверждена',primer_complete_drying_confirmed:'Полное высыхание применимого грунта до краски подтверждено',processing_conditions_confirmed:'Температура5–25°C, влажность<80%, выдержки и защита проверены',selected_products_batch_confirmed:'Соответствие конкретных поставленных версий и партий продуктов подтверждено'})[id],null,'enum',{requiredWhen:id==='primer_complete_drying_confirmed'?and(confirmed,or(prime,repairPrime)):confirmed,values:['YES']})),
  fact('substrate_age_days','Фактический возраст выбранной традиционной минеральной штукатурки перед CT54, не менее14дней','day','decimal',{requiredWhen:confirmed,min:14}),
];
const rows:AutomaticRowSpec[]=[{rowId:'scope:wall-paint:area',formulaId:'wall_paint_area_v1',section:'Объём и применимость',category:'service',title:'Измеренная площадь выбранной внутренней минеральной стены; отдельная стоимость площади не суммируется',unitId:'m2',expression:'area_m2',costTreatment:'INFORMATIONAL_SCOPE',titleParameterIds:['substrate_product_profile']},
 {rowId:'scope:wall-paint:ct54-net',formulaId:'wall_paint_ct54_net_v1',section:'Потребление краски',category:'service',title:'CT54: общий приблизительный расход для двух слоёв, не умножать второй раз на число слоёв',unitId:'l',expression:'area_m2*ct54_total_rate_l_m2',costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:'wall_paint_ct54_net_l',unitId:'l'},inputParameterIds:['ct54_coat_count']},
 {rowId:'scope:wall-paint:ct54-first-coat-check',formulaId:'wall_paint_ct54_first_coat_check_v1',section:'Проверка двух слоёв',category:'service',title:'После фактического первого слоя должна оставаться краска для второго; отдельная стоимость не суммируется',unitId:'l',expression:'wall_paint_ct54_net_l-ct54_first_coat_paint_l',inclusion:paintDiluted,costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'l',exclusiveMinimum:0,reasonRu:'Первый слой CT54 должен быть меньше общего расхода двух слоёв'}},
 {rowId:'scope:wall-paint:repair-net',formulaId:'wall_paint_ct29_net_v1',section:'Применимый минеральный ремонт',category:'service',title:'CT29: масса из обследованных площади и толщины,1.8кг/м²/мм; отдельно не оплачивается',unitId:'kg',expression:'repair_area_m2*repair_average_depth_mm*1.8',inclusion:repair,costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:'wall_paint_ct29_net_kg',unitId:'kg'},inputParameterIds:['repair_preparation_mode','repair_preparation_reference','repair_drying_compatibility_reference']},
 {rowId:'scope:wall-paint:ct29-full-mixes',formulaId:'wall_paint_ct29_mixed_v1',section:'Полные замесы CT29',category:'service',title:'CT29: сухая масса полных замесов по инструкции; минимальное число мешков и явные дополнительные замесы, не закупка с резервом',unitId:'kg',expression:'(ceil(wall_paint_ct29_net_kg/ct29_pack_kg)+ct29_additional_full_batches)*ct29_pack_kg',inclusion:repair,costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:'wall_paint_ct29_mixed_kg',unitId:'kg'}},
 {rowId:'scope:wall-paint:ct29-wet-surplus',formulaId:'wall_paint_ct29_wet_surplus_v1',section:'Остаток после полных замесов',category:'service',title:'CT29: сухой эквивалент материала в мокром остатке сверх укладываемой потребности, без массы воды; не пригодное сухое наличие или резерв',unitId:'kg',expression:'wall_paint_ct29_mixed_kg-wall_paint_ct29_net_kg',inclusion:repair,costTreatment:'INFORMATIONAL_SCOPE'},
 {rowId:'scope:wall-paint:primer-undiluted-net',formulaId:'wall_paint_primer_undiluted_net_v1',section:'Потребление грунта перед краской',category:'service',title:'CT17PROFI: выбранный неразведённый продукт для применимого грунтования стены',unitId:'l',expression:'area_m2*ct17_product_rate_l_m2_pass*ct17_paint_pass_count',inclusion:eq('paint_priming_mode','CT17_UNDILUTED'),costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:'wall_paint_primer_undiluted_net_l',unitId:'l'}},
 {rowId:'scope:wall-paint:primer-diluted-net',formulaId:'wall_paint_primer_diluted_net_v1',section:'Потребление грунта перед краской',category:'service',title:'CT17PROFI1:1: фактический объём неразведённого продукта, вода равным объёмом отдельно',unitId:'l',expression:'area_m2*ct17_diluted_product_rate_l_m2_pass*ct17_paint_pass_count',inclusion:diluted,costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:'wall_paint_primer_diluted_net_l',unitId:'l'}},
 {rowId:'scope:wall-paint:repair-primer-net',formulaId:'wall_paint_repair_primer_net_v1',section:'Потребление грунта до ремонта',category:'service',title:'CT17PROFI перед применимым CT29: отдельный проход по ремонтной площади, та же выбранная совместимая поставка',unitId:'l',expression:'repair_area_m2*ct17_product_rate_l_m2_pass',inclusion:repairPrime,costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:'wall_paint_repair_primer_net_l',unitId:'l'},inputParameterIds:['repair_preparation_reference']}];
const provenance=new Map<string,ReturnType<typeof pick>>();
function availability(prefix:string,title:string,unitId:string){parameters.push(profile(prefix+'_stock',title+': предварительно0 пригодного наличия, уточнить','decimal',unitId,0,{min:0}),profile(prefix+'_reserve',title+': предварительно0 сохраняемого резерва, уточнить','decimal',unitId,0,{min:0}));}
function supply(rowId:string,title:string,unitId:string,consumed:string,quantum:string,extra:Partial<AutomaticRowSpec>={},balancePrefix?:string,inventoryExpressions?:{stock:string;reserve:string}){const prefix=balancePrefix??rowId.replace(/[^A-Za-z0-9_]/gu,'_');
 if(!balancePrefix&&!inventoryExpressions)availability(prefix,title,unitId);
 const stock=inventoryExpressions?.stock??prefix+'_stock',reserve=inventoryExpressions?.reserve??prefix+'_reserve';
 rows.push({rowId,formulaId:rowId.replace(/[^A-Za-z0-9_]/gu,'_')+'_order_v1',section:'Материалы и оснащение',category:'material',title,unitId,expression:`ceil(max(0,(${consumed})+(${reserve})-(${stock}))/(${quantum}))*(${quantum})`,procurement:true,
  ...effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:unitId,consumed,stock,reserve,quantum}).owner,inputParameterIds:systemInputs,...extra});}
function allocation(ownerRowId:string,key:string,title:string,unitId:string,expression:string,inclusion:AutomaticInclusionCondition){rows.push({rowId:'allocation:'+ownerRowId+':'+key,formulaId:(ownerRowId+'_'+key+'_allocation_v1').replace(/[^A-Za-z0-9_]/gu,'_'),section:'Распределение общей поставки по операциям',category:'material',title,unitId,expression,inclusion,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,purchaseBalanceOwnerRowId:ownerRowId});}
supply('material:wall-paint:ct54','CT54 Silicate Aero en_GL: выбранная краска для двух слоёв','l','wall_paint_ct54_net_l','ct54_container_l',{titleParameterIds:['ct54_delivered_version','ct54_colour_batch','ct54_container_l','ct54_intercoat_hours']});
provenance.set('material:wall-paint:ct54',pick('ct54_paint'));
supply('material:wall-paint:ct29','CT29en_GL: минеральный ремонт с полными замесами мешков; мокрый остаток отделён от сухого','kg','wall_paint_ct29_mixed_kg','ct29_pack_kg',{inclusion:repair,inputParameterIds:[...systemInputs,'repair_preparation_reference','repair_drying_compatibility_reference'],titleParameterIds:['ct29_pack_kg','ct29_additional_full_batches']},undefined,{stock:'ct29_stock_full_bags*ct29_pack_kg',reserve:'ct29_reserve_full_bags*ct29_pack_kg'});
availability('wall_paint_ct17','Общая совместимая CT17PROFIen_GL до ремонта и перед краской','l');
const primerStates=[{id:'NONE',condition:noPrime,net:'0'},{id:'UNDILUTED',condition:eq('paint_priming_mode','CT17_UNDILUTED'),net:'wall_paint_primer_undiluted_net_l'},{id:'DILUTED',condition:diluted,net:'wall_paint_primer_diluted_net_l'}];
for(const state of primerStates)for(const repairPrimed of [false,true]){
 if(state.id==='NONE'&&!repairPrimed)continue;
 const inclusion=and(state.condition,repairPrimed?repairPrime:noRepairPrime),suffix=state.id+'_'+(repairPrimed?'REPAIR_PRIMED':'NO_REPAIR_PRIMER');
 const owner='material:wall-paint:shared-ct17:'+suffix,repairNet=repairPrimed?'wall_paint_repair_primer_net_l':'0';
 supply(owner,'Общая совместимая CT17PROFIen_GL03.24: грунт до ремонта и перед краской, один заказ','l',state.net+'+'+repairNet,'ct17_container_l',{inclusion,titleParameterIds:['ct17_delivered_version','ct17_container_l']},'wall_paint_ct17');
 provenance.set(owner,pick('ct17_paint_primer'));
 if(state.id!=='NONE')allocation(owner,'before-paint','Распределение CT17 перед краской; отдельно не оплачивается','l',state.net,inclusion);
 if(repairPrimed)allocation(owner,'before-repair','Распределение CT17 до ремонта; отдельно не оплачивается','l',repairNet,inclusion);
}
availability('wall_paint_water','Общая чистая вода грунта, первого слоя, ремонта и мойки','l');
for(const primerState of primerStates)for(const repairPack of ['NONE','5','25'])for(const paintWater of [false,true]){
 const repairCondition=repairPack==='NONE'?noRepair:and(repair,eq('ct29_pack_kg',repairPack));
 const inclusion=and(primerState.condition,repairCondition,eq('ct54_first_coat_water_ratio',paintWater?'0.1':'0'));
 const owner='material:wall-paint:shared-water:'+primerState.id+'_'+repairPack+'_'+(paintWater?'FIRST_DILUTED':'UNDILUTED');
 const primerWater=primerState.id==='DILUTED'?primerState.net:'0';
 const firstWater=paintWater?'ct54_first_coat_paint_l*0.1':'0';
 const repairWater=repairPack==='NONE'?'0':`wall_paint_ct29_mixed_kg*ct29_water_l_per_${repairPack}kg/${repairPack}+repair_additional_water_l`;
 const cleaning='area_m2*paint_cleaning_water_l_m2';
 supply(owner,'Единая чистая вода: применимое разведение грунта/первого слоя, ремонт и мойка до округления','l',primerWater+'+'+firstWater+'+'+repairWater+'+'+cleaning,'water_order_quantum_l',{inclusion},'wall_paint_water');
 if(primerState.id==='DILUTED')allocation(owner,'primer','Распределение водыCT17:1:1 к неразведённому продукту','l',primerWater,inclusion);
 if(paintWater)allocation(owner,'first-coat','Распределение воды только первого слояCT54','l',firstWater,inclusion);
 if(repairPack!=='NONE')allocation(owner,'repair','Распределение водыCT29 и применимого ухода/подготовки','l',repairWater,inclusion);
 allocation(owner,'cleaning','Распределение воды мойки; предварительный план не норма изготовителя','l',cleaning,inclusion);
}
const tools=[['paint-roller','Валик ручной окраски с выбранным ворсом','piece',2,manual],['primer-roller','Валик применимого грунтования','piece',1,or(prime,repairPrime)],['cut-in-brush','Кисть примыканий/углов','piece',2,undefined],['roller-tray','Малярная ванночка с вкладышем','piece',2,undefined],['telescopic-pole','Телескопическая рукоять выбранного способа','piece',1,manual],
 ['mixing-drill','Дрель для перемешивания CT54 и применимого CT29; оператор учтён в труде','piece',1,undefined],['mixing-paddle','Совместимый миксер, без ржавчины','piece',1,undefined],['mixing-bucket','Чистая ёмкость перемешивания/воды','piece',2,undefined],['scraper','Скребок очистки основания','piece',1,undefined],['sanding-sheet','Шлифовальный лист выбранного основания; предварительное оснащение','piece',4,undefined],
 ['sanding-block','Шлифовальный брусок','piece',1,undefined],['dust-brush','Щётка обеспыливания','piece',1,undefined],['masking-tape','Малярная защитная лента: предварительный запас0.5м/м² стены, не геометрическая норма','m',0.5,undefined],['protection-film','Плёнка защиты: предварительно0.3м²/м² стены, заменить обмером защищаемых поверхностей','m2',0.3,undefined],
 ['wipes','Салфетки очистки; предварительное количество','piece',10,undefined],['gloves','Защитные перчатки совместимые с щелочным материалом, пары','pair',2,undefined],['eye-protection','Защитные очки','piece',1,undefined],['dust-mask','Респиратор применимого пыльного способа подготовки; предварительное оснащение','piece',2,undefined],['waste-bags','Мешки отходов/упаковки','piece',2,undefined],['repair-float','Металлическая гладилка CT29','piece',1,repair],['repair-felt-float','Тёрка выбранного минерального ремонта','piece',1,repair]] as const;
for(const [key,title,unitId,value,inclusion]of tools){const id='wall_paint_tool_'+key.replaceAll('-','_')+'_required';parameters.push(profile(id,title+': видимое предварительное количество/план, заменить фактическим','decimal',unitId,value,{min:0}));
 supply('material:wall-paint:tool:'+key,title,unitId,key==='masking-tape'||key==='protection-film'?'area_m2*'+id:id,key==='masking-tape'?'25':'1',inclusion?{inclusion}:{});}
for(const key of ['paint_labor','paint_equipment','substrate_preparation','quality_tests','documentation_records']){
 const source=pick(key),rowId='wall-paint:ready:'+key;
 rows.push({rowId,formulaId:'wall_paint_ready_'+key+'_v1',section:source.section,category:source.category==='testing'||source.category==='documentation'?'service':source.category,
   title:key==='paint_equipment'?'Оплачиваемый аппарат распыления с пистолетом/форсункой; оператор в едином труде, миксер отдельно':source.title_ru,
   expression:source.formula.expression,unitId:source.formula.output_unit_id,costTreatment:source.category==='testing'||source.category==='documentation'?'INFORMATIONAL_SCOPE':'OWN_COST',
   ...(key==='paint_equipment'?{inclusion:spray}:{}),inputParameterIds:key==='paint_equipment'?[...systemInputs,'spray_payment_scope_reference']:systemInputs});provenance.set(rowId,source);
}
const preparationSource=pick('substrate_preparation');
for(const stage of [{key:'primer-before-paint',inclusion:prime,area:'area_m2*ct17_paint_pass_count',productivity:'primer_productivity_m2_pass_per_man_hour',title:'Применимое грунтование перед краской: площадь и реальные проходы'},
 {key:'primer-before-repair',inclusion:repairPrime,area:'repair_area_m2',productivity:'primer_productivity_m2_pass_per_man_hour',title:'Применимое грунтование до CT29: один отдельный проход ремонтной площади'},
 {key:'mineral-repair',inclusion:repair,area:'repair_area_m2',productivity:'repair_productivity_m2_per_man_hour',title:'Минеральный ремонт CT29 обследованной площади и толщины'}]){
 const rowId='labor:wall-paint:'+stage.key;
 rows.push({rowId,formulaId:rowId.replaceAll(':','_').replaceAll('-','_')+'_v1',section:stage.title,category:'labor',title:stage.title,unitId:'man_hour',
   expression:preparationSource.formula.expression.replace(/area_m2/gu,'('+stage.area+')').replace(/substrate_preparation_productivity_m2_per_man_hour/gu,stage.productivity),inclusion:stage.inclusion,inputParameterIds:systemInputs});
 provenance.set(rowId,preparationSource);
}
rows.push({rowId:'delivery:wall-paint:system',formulaId:'wall_paint_system_delivery_v1',section:'Общая доставка системы',category:'service',title:'Единая отдельно оплачиваемая доставка материалов всей малярной системы',unitId:'trip',expression:'separate_delivery_trip_count',inclusion:{kind:'greater_than',parameterId:'separate_delivery_trip_count',value:0},inputParameterIds:['delivery_payment_scope_reference']});
const built=buildAutomaticConstructionOwnerR1({contract:WALL_PAINT_CONTRACT_S2735,semanticOwner:'wall-paint',sourceId:WALL_PAINT_SOURCE_ID_S2735,normId:WALL_PAINT_NORM_ID_S2735,sourceMetadata:WALL_PAINT_SOURCE_METADATA_S2735,applicabilityRu:WALL_PAINT_SOURCE_METADATA_S2735.use_restriction,
 ordinary:parameters.filter(p=>p.kind==='ordinary'),profile:parameters.filter(p=>p.kind==='profile'),conditional:parameters.filter(p=>p.kind==='conditional'),rows,deferMissingProjectFactsToRows:true,
 excludedUnownedAssumptions:['обследованная готовность/партия/цвет','нормы труда и техники по названию варианта','полимерная/акриловая шпаклёвка без совместимости','расход первого слоя ровно половина общего','цены/инженерное утверждение']});
export const WALL_PAINT_DEFINITION_S2735=Object.freeze({...built,ordinaryParameterIds:['area_m2'],
 parameters:built.parameters.map(parameter=>({...parameter,truth_metadata:{...parameter.truth_metadata,guide:{...(parameter.truth_metadata.guide as Record<string,unknown>),verified_at:'2026-10-05T00:00:00+06:00'}}})),
 resources:built.resources.map(row=>{
 const source=provenance.get(row.row_id),owner=row.row_id.startsWith('allocation:')?(row.resource_graph as Record<string,unknown>).purchaseBalanceOwnerRowId:null;
 const resource={...row,resource_graph:{...row.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'wall-paint-ct54',groupTitleRu:'Минеральная стена: готовая окраскаCT54, применимый CT17/CT29 и отдельные ресурсы',
  operationId:row.row_id.includes('repair')?'mineral-repair':row.row_id.includes('primer')||row.row_id.includes('ct17')?'priming':row.row_id.includes('shared-water')?'shared-supply':row.category==='material'?'supply':'painting-preparation-control',
  operationTitleRu:row.category==='material'?'Материалы, оснащение и совместимая поставка':'Готовые операции, граница и контроль',completionCriterionRu:'Подтвердить минеральную систему, подготовку/высыхание, фактический труд, оснащение и оплату'},
  ...(owner?{includedInResourceOwnerRowId:owner,purchaseConsumptionAllocationV1:{contractVersion:'canonical-purchase-consumption-allocation/v1',ownerRowId:owner}}:{})},
  source_metadata:{...row.source_metadata,projectApprovalClaimed:false,universalProductivityClaimed:false,preliminaryWithoutHiddenDemo:true,
   reusedOperation:source?{sourceRowId:source.row_id,sourceFormulaId:source.formula.formula_id,sourceVersion:'ceresit-ct54-ct17-professional-v1',quantityBasis:'existing source-bound rate or preserved ready AST, canonical balance owner'}:null}};
 return {...resource,row_sha256:estimateDeterministicHash({...resource,row_sha256:''})};})});
export function compileWallPaintConstructorS2735(submittedParameters:Record<string,unknown>,catalogId=WALL_PAINT_CATALOGS_S2735[0]){
 if(!WALL_PAINT_CATALOGS_S2735.includes(catalogId))throw Error('WALL_PAINT_CATALOG_UNSUPPORTED');
 return compileAutomaticConstructionOwnerR1({compilerVersion:WALL_PAINT_CONTRACT_S2735,catalogId,primaryMeasureParameterId:'area_m2',definition:WALL_PAINT_DEFINITION_S2735,submittedParameters});
}

/** Explicit PROJECT_SYSTEM demonstration, source-only. Existing catalog/old
 * definitions and source norms are untouched; no reference input is a default. */
export const CT54_REFERENCE_INDEPENDENT_COMPOSITION_S2735=ct54ReferenceProjectSystem.independentComposition;
export function buildWallPaintReferenceProjectSystemS2735():AutomaticOwnerDefinition{
  const source=ct54ReferenceProjectSystem;
  const conditions=Object.entries(source.conditions);
  const conditionTitles:Record<string,string>=source.conditionTitlesRu;
  const ordinary:AutomaticParameterSpec[]=[{id:'area_m2',title:'Площадь стены',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0.001},
    ...conditions.map(([id,value]):AutomaticParameterSpec=>({id,title:conditionTitles[id]!,kind:'ordinary',valueType:'enum',unitId:null,values:[value]}))];
  const conditional:AutomaticParameterSpec[]=source.resources.filter(r=>!r.rowId.endsWith(':ct54')).map(r=>({
    id:r.quantityParameterId,title:r.nameRu,kind:'internal',valueType:'decimal',unitId:r.unitId,min:0}));
  const rows:AutomaticRowSpec[]=source.resources.map(r=>({rowId:r.rowId,section:'Ручная окраска готовой стены',
    category:r.resourceKind==='LABOR'?'labor':r.resourceKind==='MATERIAL'||r.resourceKind==='CONSUMABLE'?'material':'equipment',
    title:r.nameRu,unitId:r.unitId,formulaId:r.rowId+':reference-quantity',
    expression:r.rowId.endsWith(':ct54')?'area_m2 * 0.3':r.quantityParameterId,
    inputParameterIds:conditions.map(([id])=>id),procurement:false,costTreatment:'INFORMATIONAL_SCOPE'}));
  const built=buildAutomaticConstructionOwnerR1({contract:source.contract,semanticOwner:'wall-paint:ct54-reference-project-system',
    sourceId:source.sourceId,normId:'PROJECT_SYSTEM_COMPOSITION_NOT_A_NEW_QUANTITY_NORM',
    sourceMetadata:{source_title:'Ручная окраска готовой минеральной стены',source_document_version:source.contract,
      definition_hash:source.projectSystemDocumentSha256,artifact_sha256:source.projectSystemDocumentSha256,
      exact_locator:'PROJECT_SYSTEM_METHOD.md; CT54 C_CT54_TDS_1_0819 pp1–2; selected manual roller source'},
    applicabilityRu:'Только явно выбранные DEMO-условия PROJECT_SYSTEM; условия не переносятся в существующие сметы.',
    ordinary,profile:[],conditional,rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:['Не переносить демонстрационные факты в реальный объект или старую смету.',
      'Не переносить нормы труда, износа, доступа или другой краски. Количества остаются неизвестными.',
      'Подача всех ресурсов в точку работы и заданная накопительная зона — явные входные границы, не нулевая доставка/утилизация.']});
  const operations=new Map(source.operationRoster.map(op=>[op.operationId,{...op,processRole:'PROCESS' as const}]));
  return {...built,resources:built.resources.map(row=>{
    const r=source.resources.find(item=>item.rowId===row.row_id)!;
    const refs=r.operationIds.map(id=>{const op=operations.get(id);if(!op)throw Error('CT54_REFERENCE_EXACT_OPERATION_REQUIRED:'+id);return op;});
    const [primary,...shared]=refs;
    const body={...row,resource_graph:{...row.resource_graph,
      operationCompositionV1:{...primary!,...(shared.length?{additionalOperations:shared}:{})},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,
        nameRu:r.nameRu,resourceKind:r.resourceKind,brandAndModelRu:null,specificationRu:null,detailsRu:[r.authority]}},
      source_metadata:{...row.source_metadata,sourceRole:'EXPLICIT_REFERENCE_PROJECT_SYSTEM',
        objectFactsAreDemoOnly:true,quantityNormsAdded:0,full_technical_acceptance:false},row_sha256:''};
    return {...body,row_sha256:estimateDeterministicHash(body)};
  })};
}
export function compileWallPaintReferenceProjectSystemS2735(submittedParameters:Record<string,unknown>,catalogId:string=WALL_PAINT_CATALOGS_S2735[0]){
  if(!WALL_PAINT_CATALOGS_S2735.includes(catalogId))throw Error('CT54_REFERENCE_EXISTING_CATALOG_REQUIRED');
  return compileAutomaticConstructionOwnerR1({compilerVersion:ct54ReferenceProjectSystem.contract,catalogId,
    primaryMeasureParameterId:'area_m2',definition:buildWallPaintReferenceProjectSystemS2735(),submittedParameters});
}

export const CT54_ACTUAL_QUANTITY_PLAN_R1=ct54ActualQuantityPlan;
/** An opt-in set of ordinary formula graphs, not an alternate calculator.
 * The default R608/R613 reference and every immutable capture stay unchanged. */
export function withWallPaintCt54ActualQuantityPlanR1(base:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 const p=ct54ActualQuantityPlan,source=ct54ReferenceProjectSystem,byId=new Map(p.rules.map(rule=>[rule.rowId,rule])),
  existing=new Map(base.resources.map(row=>[row.row_id,row]));
 if(base.resources.length!==31||base.formulas.length!==31||source.resources.some(v=>!existing.has(v.rowId))
  ||p.rules.length!==30||p.rules.some(v=>existing.get(v.rowId)?.formula_id!==v.formulaId||existing.get(v.rowId)?.unit_id!==v.unitId))
  throw Error('CT54_QUANTITY_PLAN_EXACT_CURRENT_REFERENCE_ROSTER_REQUIRED');
 const positive=new Set(['fresh_l_per_wash_cycle','collected_liquid_l','container_usable_l','protection_cut_length_m','protection_cut_width_m']),
  compiled=buildAutomaticConstructionOwnerR1({contract:p.contract,semanticOwner:'wall-paint:ct54-reference-project-system',sourceId:p.sourceId,normId:'ACTUAL_MEASUREMENTS_AND_DOCUMENTED_ORGANIZATIONAL_ALLOCATION_NOT_CONSUMPTION_NORM',
   sourceMetadata:{source_title:'Количества ручной окраски по фактическому плану',source_document_version:p.contract,definition_hash:canonicalEstimateSha256HexText(canonicalEstimateStableJson(p)),artifact_sha256:p.sourceDocumentSha256,
    exact_locator:p.sourceDocumentPath+'; CT54TDS pp1-2 retained0.3l/m2; actual project evidence remains required'},
   applicabilityRu:p.scopeRu,ordinary:[],profile:[],conditional:p.parameters.map(v=>({id:v.id,title:v.titleRu,kind:'conditional',valueType:v.valueType,unitId:v.unitId,
    ...('min'in v?{min:v.min}:{}),...('numericPeerConstraints'in v?{numericPeerConstraints:v.numericPeerConstraints}:{})}) as AutomaticParameterSpec),
   rows:p.rules.filter(v=>v.after!=='DIRECT_MANUAL_UNCHANGED').map(rule=>{const row=existing.get(rule.rowId)!;return{rowId:rule.rowId,formulaId:rule.formulaId,title:row.title_ru,unitId:row.unit_id,
    section:row.section,category:row.category,expression:rule.expression,procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const};}),excludedUnownedAssumptions:[
    'No kit1/stock0/area-wear/labourproductivity defaults. All22numeric inputs are independent actualfacts or retainedmanualquantities.',
    'A named document is evidence to verify; it does not replace original substrate/access/utilities/PPE/receiver/conditions.']});
 const byFormula=new Map(compiled.formulas.map(f=>[f.formula_id,f])),retired=new Set(p.rules.filter(v=>v.after!=='DIRECT_MANUAL_UNCHANGED').map(v=>v.quantityParameterId)),
  direct=new Set(p.rules.filter(v=>v.after==='DIRECT_MANUAL_UNCHANGED').map(v=>v.quantityParameterId)),
  oldParameters=base.parameters.map(v=>retired.has(v.parameter_id)?{...v,required:false,default_value:null,
   constraints_json:{...v.constraints_json,forbiddenWhen:{kind:'equals',parameterId:'ct54_reference_method',value:source.conditions.ct54_reference_method}},
   truth_metadata:{...v.truth_metadata,visibility_role:'INTERNAL_ONLY',provenance:{...v.truth_metadata.provenance as Record<string,unknown>,consumer_input_role_v1:'APPLICATION_TECHNICAL'},
    retiredOnlyInActualQuantityPlanR1:true,guide:{...v.truth_metadata.guide as Record<string,unknown>,guide_short_ru:'В этом варианте количество производно от фактического плана; старое поле сохранено для истории и ввод запрещён.'}}}:
   direct.has(v.parameter_id)?{...v,constraints_json:{...v.constraints_json,requiredWhen:{kind:'greater_than',parameterId:'area_m2',value:0}},truth_metadata:{...v.truth_metadata,visibility_role:'USER_INPUT',value_source_role:'CONDITIONAL_PROJECT_FACT',preliminary_compilation_allowed:true,
    provenance:{...v.truth_metadata.provenance as Record<string,unknown>,consumer_input_role_v1:'ADVANCED_OPTION'},directManualUnchanged:true}}:v),
  added=compiled.parameters.map((v,i)=>{const spec=p.parameters.find(item=>item.id===v.parameter_id)!;return{...v,ordinal:base.parameters.length+i,required:false,default_value:null,
   constraints_json:{...v.constraints_json,requiredWhen:{kind:'greater_than',parameterId:'area_m2',value:0},...(positive.has(spec.key)?{exclusiveMin:0}:{})},truth_metadata:{...v.truth_metadata,visibility_role:'USER_INPUT',value_source_role:spec.valueType==='text'?'USER_INPUT':'CONDITIONAL_PROJECT_FACT',
    preliminary_compilation_allowed:true,source_confirmation_required:false,provenance:{consumer_input_role_v1:'ADVANCED_OPTION'},input_origin_class:'KNOWN_PRIMARY_WORK_SCOPE',
    guide:{...v.truth_metadata.guide as Record<string,unknown>,guide_version:p.contract,source_document:p.sourceId,source_snapshot_hash:p.sourceDocumentSha256,source_role:'USER_SUPPLIED_OBJECT_FACT',guide_kind:spec.valueType==='text'?'MEASUREMENT_RULE':'PROJECT_DEFINED',
     guide_validation_policy:'MANDATORY_BLOCK',applicability:p.scopeRu,guide_short_ru:'Только фактический обмер, журнал, именная опись или утверждённый план. Отсутствие не равно нулю/одной единице; источник/traceID обязателен.'}}};}),
  resources=base.resources.map(row=>{const rule=byId.get(row.row_id);if(!rule)return row;
   const original=row.resource_graph.operationCompositionV1 as Record<string,unknown>|undefined,
    extraKeys=row.row_id==='reference:wall-paint:ct54:water'?['paint']:row.row_id==='material:wall-paint:tool:mixing-drill'?['clean-tools']:[],
    extra=extraKeys.map(key=>{const op=source.operationRoster.find(op=>op.operationId===key);if(!op)throw Error('CT54_WHOLE_CONSUMER_REQUIRED:'+key);return{...op,processRole:'PROCESS' as const};}),
    existing=original?[String(original.operationId),...(Array.isArray(original.additionalOperations)?original.additionalOperations.map(value=>String((value as Record<string,unknown>).operationId)):[])]:[];
   const body={...row,resource_graph:{...row.resource_graph,inputParameterIds:[...new Set([...(row.resource_graph.inputParameterIds as string[]??[]),...rule.requiredEvidenceIds])],...(original&&extra.length?{operationCompositionV1:{...original,additionalOperations:[...(Array.isArray(original.additionalOperations)?original.additionalOperations:[]),...extra.filter(op=>!existing.includes(op.operationId))]}}:{})},
    source_metadata:{...row.source_metadata,quantityRuleV1:{contract:p.contract,kind:rule.after,sourceId:p.sourceId,ruleSourceHash:canonicalEstimateSha256HexText(canonicalEstimateStableJson(p)),primarySourceSha256:p.primarySource.sha256,
     expression:rule.expression,independentInputIds:rule.independentInputs,requiredEvidenceParameterIds:rule.requiredEvidenceIds,organizationalDocumentIsNotTechnologyWaiver:true},
     actualObjectQuantityAsserted:false,manufacturerNormAdded:false,paidOwnerAdded:false,full_technical_acceptance:false},row_sha256:''};return{...body,row_sha256:estimateDeterministicHash(body)};
  });
 // Same31 IDs and7 operations; two explicit shared consumers reuse existing owners.
 // No additional wet site-cleaning allowance is inferred from tool-wash litres.
 // Missing derivedfacts or traceID remain ordinary preliminary requirements.
 const next:AutomaticOwnerDefinition={...base,parameters:[...oldParameters,...added],formulas:base.formulas.map(v=>byFormula.get(v.formula_id)??v),resources,
  ordinaryParameterIds:base.ordinaryParameterIds.filter(v=>!retired.has(v))};
 const consumers=buildMasterParameterCalculationConsumers(next as unknown as Parameters<typeof buildMasterParameterCalculationConsumers>[0]);
 return{...next,parameters:next.parameters.map(v=>({...v,truth_metadata:{...v.truth_metadata,formula_consumers:consumers.formulaConsumers[v.parameter_id]??[],resource_branch_consumers:consumers.resourceConsumers[v.parameter_id]??[]}}))};
}
