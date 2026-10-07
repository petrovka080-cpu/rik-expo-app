import { buildAutomaticConstructionOwnerR1, type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec, type AutomaticInclusionCondition } from './automaticConstructionOwnerR1';
import { PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID, PVC_ROOF_MEMBRANE_INSTALLATION_PARAMETERS, PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS, PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES } from './pvcRoofMembraneInstallationR1';
import { effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { withG6NextServiceComponents } from './g6PvcCompletionServiceComponentsS2741';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export const PVC15_BASE = Object.freeze({ eps: 'Пенополистирол EPS или XPS', mineral: 'Минеральная вата', bitumen: 'Битумное основание', other: 'Другое основание по согласованной системе' });
export const PVC15_MACHINE = Object.freeze({ own: 'Собственный аппарат подрядчика', rent: 'Аренда по подтверждённому предложению', provided: 'Аппарат предоставляет исполнитель основной работы', purchase: 'Отдельное приобретение аппарата', unknown: 'Способ обеспечения ещё не уточнён' });
export const PVC15_SYSTEM = Object.freeze({ verified:'Проверенная система LOGICROOF V-RP 1,5 мм', other:'Другая проектная ПВХ-система 1,5 мм с отдельным подтверждением' });
export const PVC15_REQUIRED = 'Требуется по подтверждённой границе';
export const PVC15_NOT_REQUIRED = 'Не требуется по подтверждённой границе';
export const PVC15_SOURCE_ID = 'technonicol_pvc15_installation_and_project_layout_s2743';
export const PVC15_SOURCE_LOCATOR = 'LOGICROOF V-RP: ТЛ2.01, 03.2026, с.1–3; инструкция монтажа полимерных мембран: PDF19/печатная22 (проект крепления), PDF20/23 (оснастка), PDF34/38 (разделение), PDF41/46 (контроль); каталог логистики PDF15/14: выбранная поставка V-RP1,5 — 42 м². Количества, труд, энергия, цена и поставка — отдельные факты проекта.';
const sourceHash = 'b235b9e3c0b50514bccfd4a0405988210dbc348dcb7cf9647082477760280728';
const scope = { catalogId: PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID, measureId: 'area_m2', unitId: 'm2', groupId: 'pvc15-roof-field', groupTitleRu: 'Монтаж поля кровельной ПВХ-мембраны 1,5 мм' };
const positive = { kind: 'greater_than' as const, parameterId: 'area_m2', value: 0 };
const eq = (parameterId: string, value: string): AutomaticInclusionCondition => ({ kind: 'equals', parameterId, value });
const selected = (id: string) => eq(id, PVC15_REQUIRED);
const bases = (value: string) => eq('pvc15_base', value);
const verifiedBase = (value: string) => and(eq('pvc15_system_profile',PVC15_SYSTEM.verified),bases(value));
const machine = (value: string) => eq('pvc15_machine_provision', value);
const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: 'and', operands });

const facts: AutomaticParameterSpec[] = PVC_ROOF_MEMBRANE_INSTALLATION_PARAMETERS.filter(p => p.parameter_id !== 'area_m2').map(p => ({
  id: p.parameter_id, title: p.title_ru, valueType: p.parameter_id === 'telescopic_fastener_quantity_piece' || p.parameter_id === 'weld_probe_control_count_test' ? 'integer' : p.value_type as AutomaticParameterSpec['valueType'],
  unitId: p.unit_id, kind: 'conditional', min: p.parameter_id === 'telescopic_fastener_quantity_piece' || p.parameter_id === 'weld_probe_control_count_test' ? 1 : typeof p.constraints_json.min === 'number' ? p.constraints_json.min : undefined,
  values: p.constraints_json.values as readonly string[] | undefined,
  requiredWhen: p.constraints_json.requiredWhen as AutomaticInclusionCondition | undefined ?? positive,
}));
function fact(id: string, title: string, valueType: AutomaticParameterSpec['valueType'], unitId: string | null, condition: AutomaticInclusionCondition = positive, extra: Partial<AutomaticParameterSpec> = {}) {
  facts.push({ id, title, valueType, unitId, kind: 'conditional', requiredWhen: condition,
    ...(['decimal','integer'].includes(valueType) ? { min: 0 } : {}), ...extra });
}
function quantity(id: string, title: string, unit: string, condition: AutomaticInclusionCondition = positive, integer = false) {
  fact(id, title, integer ? 'integer' : 'decimal', unit, condition, { min: integer ? 1 : 0.000001 });
}
fact('pvc15_base', 'Фактическое основание непосредственно под мембраной', 'enum', null, positive, { values: Object.values(PVC15_BASE) });
fact('pvc15_system_profile','Выбранная система мембраны 1,5 мм; условия изготовителя применяются только к совместимой системе','enum',null,positive,{values:Object.values(PVC15_SYSTEM)});
fact('pvc15_system_reference', 'Проектная система, раскладка и редакция паспорта выбранной мембраны 1,5 мм', 'text', null);
quantity('pvc15_membrane_consumption_m2', 'Расход армированной мембраны по раскладке; прежняя закупочная площадь — отдельный факт', 'm2');
fact('pvc15_machine_provision', 'Как обеспечивается сварочный аппарат; время использования не число аппаратов', 'enum', null, positive, { values: Object.values(PVC15_MACHINE) });
fact('pvc15_machine_reference', 'Подтверждённая граница обеспечения аппаратом и затрат; энергия и труд указаны отдельно', 'text', null);
fact('pvc15_rental_basis', 'Единица подтверждённого тарифа аренды', 'enum', null, machine(PVC15_MACHINE.rent), { values: ['За машино-час', 'За сутки'] });
quantity('pvc15_rental_billable_hours', 'Оплачиваемые машино-часы по предложению; включая явно подтверждённый минимум', 'machine_hour', and(machine(PVC15_MACHINE.rent), eq('pvc15_rental_basis','За машино-час')));
quantity('pvc15_rental_billable_days', 'Оплачиваемые сутки по предложению; из часов автоматически не переводятся', 'day', and(machine(PVC15_MACHINE.rent), eq('pvc15_rental_basis','За сутки')));
quantity('pvc15_machine_purchase_count', 'Фактическое число приобретаемых аппаратов', 'piece', machine(PVC15_MACHINE.purchase), true);
fact('pvc15_machine_maintenance_hours', 'Фактическое обслуживание собственного аппарата; отдельно от ставки использования; ноль только по подтверждённому факту', 'decimal', 'man_hour', machine(PVC15_MACHINE.own), {min:0});
quantity('pvc15_welding_energy_kwh', 'Фактическая энергия сварки по учёту или подтверждённой карте; не оценка по площади', 'kwh');
fact('pvc15_energy_reference', 'Источник электроэнергии и граница её оплаты; повторно включённое не оплачивается', 'text', null);
fact('pvc15_energy_cost_scope','Как оплачивается фактическая энергия сварки','enum',null,positive,{values:['Отдельная оплата энергии','Энергия включена в основную расценку']});
const deliveredMachine={kind:'or' as const,operands:[machine(PVC15_MACHINE.rent),machine(PVC15_MACHINE.purchase)]};
fact('pvc15_machine_delivery_mode','Нужно отдельное начисление доставки аппарата; включённая в тариф доставка повторно не оплачивается','enum',null,deliveredMachine,{values:[PVC15_REQUIRED,PVC15_NOT_REQUIRED]});
fact('pvc15_machine_delivery_reference','Граница доставки и подтверждённое предложение; минимум аренды и доставка не предполагаются','text',null,deliveredMachine);
quantity('pvc15_machine_delivery_trips','Фактические оплачиваемые рейсы доставки аппарата','trip',and(deliveredMachine,selected('pvc15_machine_delivery_mode')),true);

const otherBaseOrSystem: AutomaticInclusionCondition = {kind:'or',operands:[bases(PVC15_BASE.other),eq('pvc15_system_profile',PVC15_SYSTEM.other)]};
const otherLayer = and(otherBaseOrSystem, selected('pvc15_other_layer_mode'));
fact('pvc15_other_layer_mode', 'Нужен ли разделительный слой для другого основания или системы по согласованному решению', 'enum', null, otherBaseOrSystem, { values: [PVC15_REQUIRED,PVC15_NOT_REQUIRED] });
fact('pvc15_other_layer_reference', 'Подтверждённый источник совместимости другого основания или системы и решения о слое', 'text', null, otherBaseOrSystem);
fact('pvc15_other_layer_specification', 'Разделительный материал для другого основания по согласованной системе', 'text', null, otherLayer);
quantity('pvc15_separation_area_m2', 'Фактическая площадь разделительного слоя по раскладке; для проверенной системы нахлёсты не менее 100 мм', 'm2', { kind:'or', operands:[verifiedBase(PVC15_BASE.eps), verifiedBase(PVC15_BASE.mineral), verifiedBase(PVC15_BASE.bitumen), otherLayer] });
fact('pvc15_separation_product', 'Выбранный материал разделения: подтверждённые паспорт, плотность и совместимость с основанием', 'text', null, {kind:'or',operands:[verifiedBase(PVC15_BASE.eps),verifiedBase(PVC15_BASE.mineral),verifiedBase(PVC15_BASE.bitumen),otherLayer]});

const rows: AutomaticRowSpec[] = PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES.map(r => ({ rowId:r.row_id, title:r.title_ru, section:r.section, category:r.category, unitId:r.unit_id,
  formulaId:r.formula_id, expression:PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS.find(f=>f.formula_id===r.formula_id)!.expression_source,
  procurement:r.procurement_eligible, titleParameterIds:r.resource_graph.titleSpecificationParameterIds as string[] | undefined,
  ...(r.row_id==='rc09:unreinforced_pvc_detail_membrane' ? {inclusion:eq('detail_membrane_mode','REQUIRED')} : {}),
  ...(r.row_id==='rc09:pvc_contact_adhesive' ? {inclusion:eq('contact_adhesive_mode','REQUIRED')} : {}),
  ...(r.row_id==='rc09:automatic_hot_air_roof_welder' ? {procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const} : {}),
}));
const operations = new Map<string,{id:string;title:string;ordinal:number;criterion:string}>();
const included = new Map<string,string>();
function row(id: string, title: string, unit: string, expression: string, operation: string, operationTitle: string, ordinal: number,
  options: Partial<AutomaticRowSpec> = {}, criterion = 'Объём, применимость, источники и результат подтверждены по выбранной границе проекта') {
  rows.push({rowId:id,title,unitId:unit,expression,formulaId:id.replace(/[^a-zA-Z0-9]/g,'_')+'_v1',section:'Работы и ресурсы',category:'construction_work',...options});
  operations.set(id,{id:operation,title:operationTitle,ordinal,criterion});
}
function balance(rowId: string, consumed: string, unit: string, condition: AutomaticInclusionCondition, fixedOrder?: string) {
  const prefix='pvc15_supply_'+rowId.replace(/[^a-zA-Z0-9]/g,'_');
  fact(prefix+'_stock', 'Выделенное пригодное наличие: '+rows.find(r=>r.rowId===rowId)!.title, unit==='piece'?'integer':'decimal',unit,condition,{min:0});
  fact(prefix+'_reserve', 'Сохраняемый резерв: '+rows.find(r=>r.rowId===rowId)!.title, unit==='piece'?'integer':'decimal',unit,condition,{min:0});
  quantity(prefix+'_quantum','Фактический шаг поставки: '+rows.find(r=>r.rowId===rowId)!.title,unit,condition,unit==='piece');
  const current=rows.find(r=>r.rowId===rowId)!;
  const policy=effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:unit,consumed,stock:prefix+'_stock',reserve:prefix+'_reserve',quantum:prefix+'_quantum'});
  current.expression=fixedOrder??`ceil(max(0,(${consumed})+${prefix}_reserve-${prefix}_stock)/${prefix}_quantum)*${prefix}_quantum`;
  current.effectiveQuantityOutput=policy.owner.effectiveQuantityOutput;
  current.purchaseBalance=policy.owner.purchaseBalance;
  current.inputParameterIds=[...(current.inputParameterIds??[]),prefix+'_stock',prefix+'_reserve',prefix+'_quantum',consumed];
}
balance('rc09:reinforced_pvc_roof_membrane_1_5mm','pvc15_membrane_consumption_m2','m2',positive,'reinforced_membrane_quantity_m2');
balance('rc09:pvc_membrane_telescopic_fastener','telescopic_fastener_quantity_piece','piece',positive);
balance('rc09:pvc_membrane_edge_rail','edge_rail_length_m','m',positive);
balance('rc09:liquid_pvc_joint_sealant','liquid_pvc_volume_l','l',positive);
balance('rc09:unreinforced_pvc_detail_membrane','detail_membrane_area_m2','m2',eq('detail_membrane_mode','REQUIRED'));
balance('rc09:pvc_contact_adhesive','contact_adhesive_mass_kg','kg',eq('contact_adhesive_mode','REQUIRED'));
for (const [suffix,base,title] of [ ['glass',PVC15_BASE.eps,'Стеклохолст разделительный не менее 100 г/м² для EPS/XPS'], ['mineral',PVC15_BASE.mineral,'Геотекстиль термообработанный не менее 100 г/м² по минеральной вате'], ['bitumen',PVC15_BASE.bitumen,'Геотекстиль термообработанный не менее 300 г/м² по битумному основанию'] ] as const) {
  row('pvc15:separation:'+suffix,title,'m2','pvc15_separation_area_m2','separation','Устройство совместимого разделительного слоя',2,{category:'material',procurement:true,inclusion:verifiedBase(base),titleParameterIds:['pvc15_separation_product'],inputParameterIds:['pvc15_system_reference','pvc15_separation_product']},'Материал соответствует основанию и инструкции PDF34/38; нахлёсты не менее100 мм, количество по раскладке');
  balance('pvc15:separation:'+suffix,'pvc15_separation_area_m2','m2',verifiedBase(base));
}
row('pvc15:separation:other','Разделительный материал согласованной системы другого основания','m2','pvc15_separation_area_m2','separation','Устройство совместимого разделительного слоя',2,{category:'material',procurement:true,inclusion:otherLayer,titleParameterIds:['pvc15_other_layer_specification'],inputParameterIds:['pvc15_other_layer_reference']});
balance('pvc15:separation:other','pvc15_separation_area_m2','m2',otherLayer);
row('pvc15:scope:other-base','Решение о совместимости другого основания или ПВХ-системы','m2','area_m2','base-check','Проверка готового основания и границы системы',0,{category:'service',costTreatment:'INFORMATIONAL_SCOPE',inclusion:otherBaseOrSystem,inputParameterIds:['pvc15_other_layer_mode','pvc15_other_layer_reference','pvc15_system_profile','pvc15_base']});

quantity('pvc15_preparation_worker_hours','Фактический труд проверки, очистки и разметки готового основания; ремонт пирога отдельно','man_hour');
row('pvc15:labor:preparation','Проверка, очистка и разметка готового основания','man_hour','pvc15_preparation_worker_hours','base-check','Проверка и очистка готового основания, разметка',0,{inputParameterIds:['pvc15_base','pvc15_system_reference','pvc15_system_profile']});
fact('pvc15_protection_mode','Защита соседних поверхностей требуется по границе проекта','enum',null,positive,{values:[PVC15_REQUIRED,PVC15_NOT_REQUIRED]});
quantity('pvc15_protection_hours','Фактический труд защиты соседних поверхностей','man_hour',selected('pvc15_protection_mode'));
quantity('pvc15_protection_quantity','Количество защитного материала по фактической раскладке','m2',selected('pvc15_protection_mode'));
fact('pvc15_protection_specification','Совместимый защитный материал для соседних поверхностей','text',null,selected('pvc15_protection_mode'));
row('pvc15:labor:protection','Защита соседних поверхностей','man_hour','pvc15_protection_hours','protection','Защита соседних поверхностей',1,{inclusion:selected('pvc15_protection_mode')});
row('pvc15:material:protection','Защитный материал соседних поверхностей','m2','pvc15_protection_quantity','protection','Защита соседних поверхностей',1,{inclusion:selected('pvc15_protection_mode'),category:'material',procurement:true,titleParameterIds:['pvc15_protection_specification']});
balance('pvc15:material:protection','pvc15_protection_quantity','m2',selected('pvc15_protection_mode'));

for (const [id,title,ordinal] of [['layout','Раскладка и раскрой армированных полотен',3],['fastening','Механическое крепление по проекту ветровых зон',4],['welding','Сварка горячим воздухом и соединения',5],['details','Устройство подтверждённых примыканий и деталей',6]] as const) {
  const condition=id==='details'?eq('detail_membrane_mode','REQUIRED'):positive;
  quantity('pvc15_'+id+'_worker_hours','Труд: '+title+'; входит в основную монтажную расценку, без новой нормы','man_hour',condition);
  const rowId='pvc15:labor:'+id;
  row(rowId,title+' — труд включён в основную работу','man_hour','pvc15_'+id+'_worker_hours',id,title,ordinal,{inclusion:condition,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  included.set(rowId,'rc09:pvc_membrane_hot_air_install');
}
for (const [id,title,op,opTitle,ordinal,parent] of [
  ['preparation','Щётки и оснастка очистки, рулетка и разметочная оснастка','base-check','Проверка и очистка готового основания, разметка',0,'pvc15:labor:preparation'],
  ['cutting','Монтажный нож и ножницы раскроя мембраны','layout','Раскладка и раскрой армированных полотен',3,'rc09:pvc_membrane_hot_air_install'],
  ['fastening','Шуруповёрт и совместимая оснастка выбранного крепежа','fastening','Механическое крепление по проекту ветровых зон',4,'rc09:pvc_membrane_hot_air_install'],
  ['welding','Насадки, прикаточные ролики, щётка и удлинитель сварочного аппарата','welding','Сварка горячим воздухом и соединения',5,'rc09:pvc_membrane_hot_air_install'],
  ['safety','Перчатки и СИЗ по технологической карте и условиям работ','protection','Подготовка безопасного рабочего места',1,'rc09:pvc_membrane_hot_air_install'],
  ['probe','Пробник контроля сварных швов','control','Контроль сварных швов по плану',7,'rc09:pvc_membrane_weld_probe_test'],
] as const) {
  quantity('pvc15_tool_'+id+'_sets','Подтверждённое число выделенных комплектов: '+title,'set',positive,true);
  fact('pvc15_tool_'+id+'_reference','Состав и предоставление исполнителем: '+title+'; включено в соответствующий труд или контроль','text',null);
  const rowId='pvc15:tools:'+id;
  row(rowId,title+' — предоставляет исполнитель, включено в соответствующую работу','set','pvc15_tool_'+id+'_sets',op,opTitle,ordinal,{category:'equipment',costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inputParameterIds:['pvc15_tool_'+id+'_reference']});
  included.set(rowId,parent);
}
row('pvc15:equipment:own-use','Использование собственного сварочного аппарата; обслуживание, энергия и труд отдельно','machine_hour','hot_air_welder_machine_h','welding','Сварка горячим воздухом и соединения',5,{category:'equipment',inclusion:machine(PVC15_MACHINE.own),inputParameterIds:['pvc15_machine_reference']});
row('pvc15:equipment:maintenance','Обслуживание собственного сварочного аппарата','man_hour','pvc15_machine_maintenance_hours','welding','Сварка горячим воздухом и соединения',5,{inclusion:machine(PVC15_MACHINE.own)});
row('pvc15:equipment:rental-hours','Аренда сварочного аппарата по подтверждённым машино-часам','machine_hour','pvc15_rental_billable_hours','welding','Сварка горячим воздухом и соединения',5,{category:'service',inclusion:and(machine(PVC15_MACHINE.rent),eq('pvc15_rental_basis','За машино-час')),inputParameterIds:['pvc15_machine_reference']});
row('pvc15:equipment:rental-days','Аренда сварочного аппарата по подтверждённым суткам','day','pvc15_rental_billable_days','welding','Сварка горячим воздухом и соединения',5,{category:'service',inclusion:and(machine(PVC15_MACHINE.rent),eq('pvc15_rental_basis','За сутки')),inputParameterIds:['pvc15_machine_reference']});
row('pvc15:equipment:provided','Обеспечение сварочным аппаратом включено в подтверждённую основную расценку','machine_hour','hot_air_welder_machine_h','welding','Сварка горячим воздухом и соединения',5,{category:'equipment',inclusion:machine(PVC15_MACHINE.provided),costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inputParameterIds:['pvc15_machine_reference']});
included.set('pvc15:equipment:provided','rc09:pvc_membrane_hot_air_install');
row('pvc15:equipment:purchase','Приобретение сварочного аппарата — число аппаратов, не машино-часы','piece','pvc15_machine_purchase_count','welding','Сварка горячим воздухом и соединения',5,{category:'equipment',procurement:true,inclusion:machine(PVC15_MACHINE.purchase),titleParameterIds:['hot_air_welder_designation'],inputParameterIds:['pvc15_machine_reference']});
row('pvc15:equipment:provision-need','Уточнить способ обеспечения сварочным аппаратом; время использования сохранено отдельно','machine_hour','hot_air_welder_machine_h','welding','Сварка горячим воздухом и соединения',5,{category:'service',costTreatment:'INFORMATIONAL_SCOPE',inclusion:machine(PVC15_MACHINE.unknown),inputParameterIds:['pvc15_machine_reference']});
row('pvc15:material:welding-energy','Электроэнергия сварки по подтверждённому учёту; отдельная граница оплаты','kwh','pvc15_welding_energy_kwh','welding','Сварка горячим воздухом и соединения',5,{category:'service',inclusion:eq('pvc15_energy_cost_scope','Отдельная оплата энергии'),inputParameterIds:['pvc15_energy_reference']});
row('pvc15:material:included-welding-energy','Электроэнергия сварки включена в подтверждённую основную расценку','kwh','pvc15_welding_energy_kwh','welding','Сварка горячим воздухом и соединения',5,{category:'service',inclusion:eq('pvc15_energy_cost_scope','Энергия включена в основную расценку'),costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inputParameterIds:['pvc15_energy_reference']});
included.set('pvc15:material:included-welding-energy','rc09:pvc_membrane_hot_air_install');
row('pvc15:service:machine-delivery','Доставка аппарата по подтверждённым отдельным рейсам','trip','pvc15_machine_delivery_trips','welding','Обеспечение сварочным аппаратом и доставка',5,{category:'service',inclusion:and(deliveredMachine,selected('pvc15_machine_delivery_mode')),inputParameterIds:['pvc15_machine_delivery_reference']});

fact('pvc15_cleaner_mode','Очиститель и активация сварных зон требуются по состоянию полотен и технологии','enum',null,positive,{values:[PVC15_REQUIRED,PVC15_NOT_REQUIRED]});
fact('pvc15_cleaner_specification','Совместимый очиститель выбранной ПВХ-системы и редакция его листка; расход 1,2 мм не переносится','text',null,selected('pvc15_cleaner_mode'));
quantity('pvc15_cleaner_consumption_l','Подтверждённый расход выбранного очистителя по фактически обрабатываемым зонам','l',selected('pvc15_cleaner_mode'));
row('pvc15:material:cleaner','Совместимый очиститель и активатор сварных зон ПВХ-мембраны','l','pvc15_cleaner_consumption_l','welding','Подготовка и очистка сварных зон по технологии',5,{category:'material',procurement:true,inclusion:selected('pvc15_cleaner_mode'),titleParameterIds:['pvc15_cleaner_specification']});
balance('pvc15:material:cleaner','pvc15_cleaner_consumption_l','l',selected('pvc15_cleaner_mode'));
fact('pvc15_defects_mode','Обнаружены дефекты сварных швов, требующие устранения','enum',null,positive,{values:[PVC15_REQUIRED,PVC15_NOT_REQUIRED]});
fact('pvc15_defect_reference','Ведомость дефектов, способ исправления и граница повторного контроля','text',null,selected('pvc15_defects_mode'));
quantity('pvc15_defect_worker_hours','Фактический труд исправления выявленных дефектов; не доля основной нормы','man_hour',selected('pvc15_defects_mode'));
quantity('pvc15_defect_patch_area_m2','Расход совместимой мембраны для локальных исправлений по ведомости','m2',selected('pvc15_defects_mode'));
fact('pvc15_defect_patch_specification','Мембрана локальных исправлений: совместимость, толщина и паспорт','text',null,selected('pvc15_defects_mode'));
quantity('pvc15_defect_recheck_count','Количество повторных отдельных проверок устранённых дефектов','test',selected('pvc15_defects_mode'),true);
row('pvc15:labor:defects','Устранение выявленных дефектов сварных швов','man_hour','pvc15_defect_worker_hours','defects','Устранение выявленных дефектов и повторный контроль',8,{inclusion:selected('pvc15_defects_mode'),inputParameterIds:['pvc15_defect_reference']});
row('pvc15:material:defect-patches','Совместимая мембрана локальных исправлений','m2','pvc15_defect_patch_area_m2','defects','Устранение выявленных дефектов и повторный контроль',8,{category:'material',procurement:true,inclusion:selected('pvc15_defects_mode'),titleParameterIds:['pvc15_defect_patch_specification']});
balance('pvc15:material:defect-patches','pvc15_defect_patch_area_m2','m2',selected('pvc15_defects_mode'));
row('pvc15:service:defect-recheck','Повторный контроль устранённых дефектов','test','pvc15_defect_recheck_count','defects','Устранение выявленных дефектов и повторный контроль',8,{category:'service',inclusion:selected('pvc15_defects_mode')});
quantity('pvc15_handover_documents','Подтверждённое число комплектов сдачи и исполнительной документации','document',positive,true);
fact('pvc15_handover_reference','Граница сдаваемого участка, результаты контроля и незакрытые соседние узлы','text',null);
row('pvc15:service:handover','Сдача выбранного участка и исполнительной документации','document','pvc15_handover_documents','handover','Сдача результата и документации выбранного участка',30,{category:'service',inputParameterIds:['pvc15_handover_reference']},'Приняты выбранный участок и контроль швов; соседние слои и неохваченные узлы не объявляются завершёнными');

let definition: AutomaticOwnerDefinition = buildAutomaticConstructionOwnerR1({contract:'pvc-roof-membrane-full-composition.s27-43/v1',semanticOwner:scope.catalogId,sourceId:PVC15_SOURCE_ID,normId:'PROJECT_LAYOUT_WITH_VERIFIED_MANUFACTURER_APPLICABILITY_NO_AREA_RATE',
 sourceMetadata:{source_title:'ПВХ-мембрана 1,5 мм: проверенные условия системы и явные проектные количества',source_document_version:'TL2.01_03.2026_AND_PINNED_INSTALLATION_GUIDE',definition_hash:sourceHash,artifact_sha256:sourceHash,exact_locator:PVC15_SOURCE_LOCATOR},
 applicabilityRu:'Механически закрепляемое поле армированной ПВХ-мембраны 1,5 мм; непосредственное основание и детали подтверждаются. Пароизоляция, утепление, уклон и ремонт пирога не выводятся из площади.',
 ordinary:[{id:'area_m2',title:'Площадь монтажа кровельной ПВХ-мембраны 1,5 мм',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0.000001}],profile:[],conditional:facts,rows,deferMissingProjectFactsToRows:true,
 excludedUnownedAssumptions:['Нет расхода, труда, крепежа, периметра, энергии, проверок или цены по умолчанию','Исходная закупочная площадь мембраны не переименовывается в расход','Нет переноса нормы ПВХ1,2 мм','Нет преобразования времени аппарата в его число или срок аренды','Каталожные42 м² не универсальная поставка','Нет массы отходов из пригодного остатка рулона']});
const baseOperations: Record<string,[string,string,number]> = {
 'rc09:pvc_membrane_hot_air_install':['main-cost','Основная монтажная работа',3], 'rc09:reinforced_pvc_roof_membrane_1_5mm':['layout','Раскладка и раскрой армированных полотен',3],
 'rc09:pvc_membrane_telescopic_fastener':['fastening','Механическое крепление по проекту ветровых зон',4], 'rc09:pvc_membrane_edge_rail':['details','Краевые узлы и подтверждённые примыкания',6],
 'rc09:liquid_pvc_joint_sealant':['control','Контроль и обработка швов по выбранной системе',7], 'rc09:automatic_hot_air_roof_welder':['welding','Сварка горячим воздухом и соединения',5],
 'rc09:pvc_membrane_weld_probe_test':['control','Контроль сварных швов по плану',7], 'rc09:unreinforced_pvc_detail_membrane':['details','Устройство подтверждённых примыканий и деталей',6], 'rc09:pvc_contact_adhesive':['details','Устройство подтверждённых примыканий и деталей',6],
};
definition={...definition,parameters:definition.parameters.map(p=>({...p,
 constraints_json:{...p.constraints_json,...(PVC_ROOF_MEMBRANE_INSTALLATION_PARAMETERS.find(old=>old.parameter_id===p.parameter_id)?.constraints_json.forbiddenWhen?{forbiddenWhen:PVC_ROOF_MEMBRANE_INSTALLATION_PARAMETERS.find(old=>old.parameter_id===p.parameter_id)!.constraints_json.forbiddenWhen}:{}),
  ...(p.parameter_id==='pvc15_machine_reference'?{forbiddenWhen:eq('pvc15_machine_provision',PVC15_MACHINE.unknown)}:{})},
 truth_metadata:{...p.truth_metadata,guide:{...(p.truth_metadata.guide as Record<string,unknown>),verified_at:'2026-10-07',
 ...(p.parameter_id.endsWith('_quantum')&&p.parameter_id.includes('reinforced_pvc_roof_membrane')?{guide_short_ru:'Для указанной каталожной поставки LOGICROOF V-RP1,5 указан рулон42 м² (PDF15/14). Подтвердите фактическую поставку: другой раскрой или шаг вводится явно; число рулонов на палете не минимум заказа.'}:{}),
 ...(p.parameter_id==='pvc15_machine_reference'?{guide_short_ru:'Уточните собственный аппарат, аренду, обеспечение основной расценкой либо приобретение. Укажите состав ставки и период предложения; девять машино-часов не означают девять аппаратов или одни сутки.'}:{}),
}}})), resources:definition.resources.map(r=>{
 const existing=baseOperations[r.row_id]; const op=operations.get(r.row_id)??{id:existing![0],title:existing![1],ordinal:existing![2],criterion:'Подтверждены проектная раскладка, совместимость, количество и граница выбранной операции'};
 const original=PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES.find(x=>x.row_id===r.row_id);
 const graph={...r.resource_graph,...(included.has(r.row_id)?{includedInResourceOwnerRowId:included.get(r.row_id)}:{}),
  publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,
   detailsRu:[...(r.row_id==='rc09:automatic_hot_air_roof_welder'?['Это время использования; способ обеспечения и собственные затраты раскрыты отдельно, покупки в машино-часах нет.']:[]),...(r.row_id==='rc09:reinforced_pvc_roof_membrane_1_5mm'?['Исходный проектный заказ сохранён; расход, наличие, резерв и фактический шаг поставки подтверждаются отдельно.']:[])]},
  operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:scope.groupId,groupTitleRu:scope.groupTitleRu,operationId:op.id,operationTitleRu:op.title,processOrdinal:op.ordinal,processRole:r.row_id==='rc09:pvc_membrane_hot_air_install'?'COST_SUMMARY':'PROCESS',completionCriterionRu:op.criterion}};
 const result={...r,resource_graph:graph,source_metadata:{...r.source_metadata,...(original?{originalProjectSourceMetadata:original.source_metadata}: {})},row_sha256:''}; return {...result,row_sha256:estimateDeterministicHash(result)};
})};
export const PVC15_FULL_DEFINITION_S2743 = withG6NextServiceComponents(definition,scope);
export const PVC15_SERIES_MANIFEST_S2743 = Object.freeze({catalogIds:[scope.catalogId],baseBranches:Object.values(PVC15_BASE),machineProvisionBranches:Object.values(PVC15_MACHINE),
 repairedExistingTypeCount:1,acceptedNewTypeDelta:0,incompatibleGenericRoofVariantsIncluded:false,projectFactsNeverDefaults:true});
