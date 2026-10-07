import pack from '../../../../data/estimate-benchmarks/source-packs/pvc15-field-transition-composition-s27-43.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {PVC15_FULL_DEFINITION_S2743, PVC15_MACHINE, PVC15_BASE, PVC15_SYSTEM} from './pvcRoofMembraneFullCompositionS2743';
import {PVC_BITUMEN_TRANSITION_CATALOG_S2737} from './pvcBitumenTransitionReinforcedGuide2024S2737';
import {G6_PVC_COMMERCIAL_LABOR_SERIES_S2741} from './g6PvcCommercialLaborProfilesS2741';
import {withG6NextServiceComponents} from './g6PvcCompletionServiceComponentsS2741';
import {namespaceAutomaticOwnerDefinitionR1,appendOptionalAutomaticOwnerR1} from './optionalAutomaticOwnerCompositionR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const PVC15_JOINT_PREFIX='pvc15_transition_';
export const PVC15_JOINT_CHOICE={yes:'Переход ПВХ–битум входит в выбранный участок',no:'Переход ПВХ–битум вне выбранного участка'} as const;
export const PVC15_JOINT_LAYER={separate:'Разные изделия или раздельные потребности без общей площади',common:'Одно изделие по битумному основанию; общая площадь подтверждена'} as const;
export const PVC15_JOINT_CONFIRM='Подтверждено по объекту и составу расценок';
export const PVC15_JOINT_PACK_SHA256='3fc9432b5833728ab2484d51838d4b455566204362565ca60d6e1cc8d27eb65b';
const acceptedTransition=G6_PVC_COMMERCIAL_LABOR_SERIES_S2741.find(p=>p.catalogId===PVC_BITUMEN_TRANSITION_CATALOG_S2737)!;
export const PVC15_ACCEPTED_TRANSITION_COMPONENT_S2743=withG6NextServiceComponents(acceptedTransition.definition,
 {catalogId:acceptedTransition.catalogId,measureId:acceptedTransition.measureId,unitId:acceptedTransition.unitId,
 groupId:'pvc-bitumen-transition-reinforced-guide2024-single-strip',groupTitleRu:'Устройство перехода между ПВХ-мембраной и битумной кровлей'});
const prefix=PVC15_JOINT_PREFIX,gateId='pvc15_joint_transition_scope';
const eq=(parameterId:string,value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId,value});
const and=(...operands:AutomaticInclusionCondition[]):AutomaticInclusionCondition=>({kind:'and',operands});
const yes=eq(gateId,PVC15_JOINT_CHOICE.yes),no=eq(gateId,PVC15_JOINT_CHOICE.no);
const liquidSelected=eq(prefix+'liquid_pvc_selection','Выбрано по проекту');
const commonLayer=and(yes,eq('pvc15_joint_layer_relation',PVC15_JOINT_LAYER.common));
const machine=(mode:string)=>and(yes,eq('pvc15_machine_provision',mode));
const deliveredMachine:AutomaticInclusionCondition={kind:'or',operands:[machine(PVC15_MACHINE.rent),machine(PVC15_MACHINE.purchase)]};
const facts:AutomaticParameterSpec[]=[];const rows:AutomaticRowSpec[]=[];
const fact=(id:string,title:string,valueType:AutomaticParameterSpec['valueType'],unitId:string|null,requiredWhen:AutomaticInclusionCondition=yes,extra:Partial<AutomaticParameterSpec>={})=>{
 facts.push({id,title,valueType,unitId,kind:'conditional',requiredWhen,...extra});
};
const confirm=(id:string,title:string,condition:AutomaticInclusionCondition=yes)=>fact(id,title,'enum',null,condition,{values:[PVC15_JOINT_CONFIRM]});
const qty=(id:string,title:string,unit:string,condition:AutomaticInclusionCondition=yes,integer=false,min=0.000001)=>fact(id,title,integer?'integer':'decimal',unit,condition,{min});
fact(gateId,'Входит ли армированный переход ПВХ–битум в выбранную границу','enum',null,{kind:'greater_than',parameterId:'area_m2',value:0},{values:Object.values(PVC15_JOINT_CHOICE)});
confirm('pvc15_joint_source_confirmed','Совместимость поля ПВХ1,5 и армированного перехода инструкции02.2024 подтверждена для выбранной поставки и узла');
fact('pvc15_joint_source_reference','Источник совместимости двух выбранных изделий, редакций и проектного узла','text',null);
confirm('pvc15_joint_machine_confirmed','Один совместимый аппарат для двух операций; труд перехода исключает его обеспечение, общие затраты раскрыты один раз');
fact('pvc15_joint_machine_reference','Общий аппарат: выбранная поставка или тариф, граница труда и стоимости двух участков; минимумы только по предложению','text',null);
qty('pvc15_joint_maintenance_hours','Фактическое обслуживание общего собственного аппарата для двух участков','man_hour',machine(PVC15_MACHINE.own),false,0);
qty('pvc15_joint_energy_kwh','Фактическая общая энергия сварки двух участков по учёту; не расчёт из часов','kwh');
fact('pvc15_joint_energy_reference','Учёт и единая граница оплаты энергии двух участков','text',null);
qty('pvc15_joint_rental_hours','Оплачиваемые общие машино-часы аренды двух участков, включая подтверждённый минимум','machine_hour',and(machine(PVC15_MACHINE.rent),eq('pvc15_rental_basis','За машино-час')));
qty('pvc15_joint_rental_days','Оплачиваемые общие сутки аренды двух участков по предложению; часы в сутки не переводятся','day',and(machine(PVC15_MACHINE.rent),eq('pvc15_rental_basis','За сутки')));
qty('pvc15_joint_machine_count','Подтверждённое число приобретаемых общих аппаратов','piece',machine(PVC15_MACHINE.purchase),true,1);
qty('pvc15_joint_delivery_trips','Фактические отдельные рейсы доставки общего аппарата','trip',and(deliveredMachine,eq('pvc15_machine_delivery_mode','Требуется по подтверждённой границе')),true,1);
confirm('pvc15_joint_tools_confirmed','Одна совместимая оснастка очистки, раскроя, крепления, сварки, контроля и СИЗ для двух участков; предоставление и включение в расценки подтверждены');
fact('pvc15_joint_tools_reference','Состав общей оснастки и СИЗ для выбранных мембраны, клеевой технологии и горячих работ','text',null);
for(const key of ['preparation','cutting','fastening','welding','safety','probe'])qty('pvc15_joint_tool_'+key+'_sets','Фактическое число общих комплектов: '+key.replace('preparation','очистка и разметка').replace('cutting','раскрой').replace('fastening','крепление').replace('welding','сварка и прикатка').replace('safety','СИЗ').replace('probe','пробник контроля'),'set',yes,true,1);
confirm('pvc15_joint_liquid_confirmed','Один выбранный жидкий ПВХ совместим с обеими операциями; два независимых расхода, один выделенный запас',and(yes,liquidSelected));
for(const [suffix,title,min] of [['stock','Однократно выделенное пригодное наличие',0],['reserve','Однократно сохраняемый резерв',0],['quantum','Фактический общий шаг поставки',0.000001]] as const)
 qty('pvc15_joint_liquid_'+suffix,title+' общего жидкого ПВХ','l',and(yes,liquidSelected),false,min);
fact('pvc15_joint_layer_relation','Разделение поля и перехода: разные материалы или одна общая совместимая поставка','enum',null,yes,{values:Object.values(PVC15_JOINT_LAYER)});
confirm('pvc15_joint_layer_confirmed','Один термообработанный геотекстиль не менее300г/м² подтверждён для обеих зон по битумному основанию и проверенной системе',commonLayer);
fact('pvc15_joint_layer_product','Единое выбранное изделие: термообработка, не менее300г/м², размер и подтверждённая совместимость двух зон','text',null,commonLayer);
const overlapOwner='pvc15:joint:layer-overlap-bound',overlapMax=effectiveResourceQuantityParameterId(overlapOwner);
fact('pvc15_joint_layer_overlap_m2','Фактически одна и та же физическая площадь слоя двух зон; не больше меньшей зоны, ноль только при отсутствии пересечения','decimal','m2',commonLayer,{min:0});
for(const [suffix,title,min] of [['stock','Однократно выделенное пригодное наличие',0],['reserve','Однократно сохраняемый резерв',0],['quantum','Фактический общий шаг поставки',0.000001]] as const)
 qty('pvc15_joint_layer_'+suffix,title+' общего разделительного материала','m2',commonLayer,false,min);
const add=(id:string,title:string,unit:string,expression:string,condition:AutomaticInclusionCondition=yes,options:Partial<AutomaticRowSpec>={})=>{
 rows.push({rowId:id,title,unitId:unit,expression,inclusion:condition,section:'Общие ресурсы поля и перехода',category:'service',formulaId:id.replace(/[^a-zA-Z0-9_]/gu,'_')+'_v1',...options});
};
const usage='hot_air_welder_machine_h+'+prefix+'hot_air_welder_machine_h';
const machineEvidence=['pvc15_joint_machine_confirmed','pvc15_joint_machine_reference'];
add('pvc15:joint:machine-usage','Общее время одного аппарата: поле и переход, без покупки в машино-часах','machine_hour',usage,yes,{costTreatment:'INFORMATIONAL_SCOPE',inputParameterIds:machineEvidence});
add('pvc15:joint:machine-own','Использование общего собственного сварочного аппарата; обслуживание, энергия и труд отдельно','machine_hour',usage,machine(PVC15_MACHINE.own),{category:'equipment',inputParameterIds:machineEvidence});
add('pvc15:joint:machine-maintenance','Обслуживание общего собственного аппарата двух участков','man_hour','pvc15_joint_maintenance_hours',machine(PVC15_MACHINE.own),{category:'labor',inputParameterIds:machineEvidence});
add('pvc15:joint:machine-rental-hours','Аренда общего аппарата по подтверждённым оплачиваемым машино-часам','machine_hour','pvc15_joint_rental_hours',and(machine(PVC15_MACHINE.rent),eq('pvc15_rental_basis','За машино-час')),{inputParameterIds:machineEvidence});
add('pvc15:joint:machine-rental-days','Аренда общего аппарата по подтверждённому сроку в сутках','day','pvc15_joint_rental_days',and(machine(PVC15_MACHINE.rent),eq('pvc15_rental_basis','За сутки')),{inputParameterIds:machineEvidence});
add('pvc15:joint:machine-provided','Общий аппарат предоставляет исполнитель основной расценки; труд перехода его повторно не оплачивает','machine_hour',usage,machine(PVC15_MACHINE.provided),{category:'equipment',costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inputParameterIds:machineEvidence});
add('pvc15:joint:machine-purchase','Приобретение общих аппаратов: фактическое число, без новой покупки для перехода','piece','pvc15_joint_machine_count',machine(PVC15_MACHINE.purchase),{category:'equipment',procurement:true,inputParameterIds:machineEvidence});
add('pvc15:joint:machine-need','Уточнить общее обеспечение аппаратом для поля и перехода; время использования сохранено','machine_hour',usage,machine(PVC15_MACHINE.unknown),{costTreatment:'INFORMATIONAL_SCOPE',inputParameterIds:['pvc15_joint_machine_reference']});
add('pvc15:joint:machine-delivery','Подтверждённая отдельная доставка общего аппарата двух участков','trip','pvc15_joint_delivery_trips',and(deliveredMachine,eq('pvc15_machine_delivery_mode','Требуется по подтверждённой границе')),{inputParameterIds:machineEvidence});
for(const [id,title,cost,scope] of [['energy','Общая электроэнергия сварки двух участков','OWN_COST','Отдельная оплата энергии'],['included-energy','Общая электроэнергия включена в основную расценку','INCLUDED_IN_RESOURCE_ROWS','Энергия включена в основную расценку']] as const)
 add('pvc15:joint:'+id,title,'kwh','pvc15_joint_energy_kwh',and(yes,eq('pvc15_energy_cost_scope',scope)),{costTreatment:cost,inputParameterIds:['pvc15_joint_energy_reference']});
const toolTitles={preparation:'Общая оснастка очистки и разметки',cutting:'Общий нож и ножницы раскроя',fastening:'Общая совместимая оснастка установки крепежа',welding:'Общие насадки, ролики и оснастка сварки',safety:'Общие совместимые СИЗ клеевой технологии и горячих работ',probe:'Общий пробник контроля сварного шва'};
for(const [key,title] of Object.entries(toolTitles))add('pvc15:joint:tool-'+key,title+' — предоставляет исполнитель, включено один раз','set','pvc15_joint_tool_'+key+'_sets',yes,{category:'equipment',costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inputParameterIds:['pvc15_joint_tools_confirmed','pvc15_joint_tools_reference']});
const liquid=effectivePurchaseBalanceExpressionsR1({ownerRowId:'pvc15:joint:liquid-pvc',orderUnitId:'l',consumed:'liquid_pvc_volume_l+'+prefix+'liquid_pvc_volume_l',stock:'pvc15_joint_liquid_stock',reserve:'pvc15_joint_liquid_reserve',quantum:'pvc15_joint_liquid_quantum'});
add('pvc15:joint:liquid-pvc','Общий совместимый жидкий ПВХ: сумма разных расходов поля и перехода','l',`ceil(max(0,liquid_pvc_volume_l+${prefix}liquid_pvc_volume_l+pvc15_joint_liquid_reserve-pvc15_joint_liquid_stock)/pvc15_joint_liquid_quantum)*pvc15_joint_liquid_quantum`,and(yes,liquidSelected),{category:'material',procurement:true,...liquid.owner,inputParameterIds:['pvc15_joint_liquid_confirmed']});
add(overlapOwner,'Наибольшая допустимая общая физическая площадь разделения двух участков','m2',`min(pvc15_separation_area_m2,${prefix}separation_area_m2)`,commonLayer,{costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:overlapMax,unitId:'m2'}});
add('pvc15:joint:layer-overlap-check','Доля общей физической площади разделительного слоя в меньшей зоне','ratio',`pvc15_joint_layer_overlap_m2/min(pvc15_separation_area_m2,${prefix}separation_area_m2)`,commonLayer,{costTreatment:'INFORMATIONAL_SCOPE',
 formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'ratio',minimum:0,maximum:1,
 reasonRu:'Общая физическая площадь разделительного слоя не может превышать площадь любой из двух зон'}});
const consumed=`pvc15_separation_area_m2+${prefix}separation_area_m2-pvc15_joint_layer_overlap_m2`;
const layer=effectivePurchaseBalanceExpressionsR1({ownerRowId:'pvc15:joint:separation',orderUnitId:'m2',consumed,stock:'pvc15_joint_layer_stock',reserve:'pvc15_joint_layer_reserve',quantum:'pvc15_joint_layer_quantum'});
add('pvc15:joint:separation','Один термообработанный геотекстиль не менее300г/м² для поля и перехода: общая площадь учтена один раз','m2',`ceil(max(0,(${consumed})+pvc15_joint_layer_reserve-pvc15_joint_layer_stock)/pvc15_joint_layer_quantum)*pvc15_joint_layer_quantum`,commonLayer,{category:'material',procurement:true,...layer.owner,titleParameterIds:['pvc15_joint_layer_product'],inputParameterIds:['pvc15_joint_layer_confirmed']});

const control=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:'pvc15-field-transition',sourceId:'pvc15_field_transition_explicit_composition_s2743',normId:'EXPLICIT_PROJECT_COMMON_PHYSICAL_RESOURCES_NO_NEW_NORM',
 sourceMetadata:{source_title:'Общий состав поля ПВХ1,5 и принятого армированного перехода',source_document_version:pack.contract,definition_hash:PVC15_JOINT_PACK_SHA256,artifact_sha256:PVC15_JOINT_PACK_SHA256,exact_locator:'MASTER83 §20.45.6Д; '+pack.components.map(x=>x.path).join('; ')},
 applicabilityRu:pack.scopeRu,ordinary:[],profile:[],conditional:facts.map(p=>p.id===gateId?{...p,requiredWhen:undefined}:p),rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.compositionRulesRu});
const parentOnlyRows=new Set(['rc09:automatic_hot_air_roof_welder',...PVC15_FULL_DEFINITION_S2743.resources.filter(r=>r.row_id.startsWith('pvc15:equipment:')||r.row_id.startsWith('pvc15:tools:')||r.row_id.includes('welding-energy')||r.row_id==='pvc15:service:machine-delivery').map(r=>r.row_id)]);
const base={...PVC15_FULL_DEFINITION_S2743,resources:PVC15_FULL_DEFINITION_S2743.resources.map(r=>({ ...r,
 inclusion_ast:parentOnlyRows.has(r.row_id)?and(no,r.inclusion_ast as AutomaticInclusionCondition):r.row_id==='rc09:liquid_pvc_joint_sealant'
 ?and({kind:'or',operands:[no,and(yes,eq(prefix+'liquid_pvc_selection','Не выбрано'))]},r.inclusion_ast as AutomaticInclusionCondition)
 :r.row_id.startsWith('pvc15:separation:')?and({kind:'or',operands:[no,and(yes,eq('pvc15_joint_layer_relation',PVC15_JOINT_LAYER.separate))]},r.inclusion_ast as AutomaticInclusionCondition):r.inclusion_ast}))};
const removedRows=new Set(['transition:machine:welder_included','transition:machine:welder_rental','transition:material:liquid_pvc',
 ...['cleaning','marking','cutting','fixing','weld-roller','probe','ppe'].map(key=>'transition:tool:'+key)]);
const removedParameters=new Set(['welder_cost_mode','liquid_pvc_stock','liquid_pvc_reserve','liquid_pvc_quantum','effective_resource_quantity_transition_material_liquid_pvc']);
const childSource={...PVC15_ACCEPTED_TRANSITION_COMPONENT_S2743,parameters:PVC15_ACCEPTED_TRANSITION_COMPONENT_S2743.parameters.filter(p=>!removedParameters.has(p.parameter_id)),
 resources:PVC15_ACCEPTED_TRANSITION_COMPONENT_S2743.resources.filter(r=>!removedRows.has(r.row_id)),
 formulas:PVC15_ACCEPTED_TRANSITION_COMPONENT_S2743.formulas.filter(f=>PVC15_ACCEPTED_TRANSITION_COMPONENT_S2743.resources.some(r=>r.formula_id===f.formula_id&&!removedRows.has(r.row_id)))};
const child=namespaceAutomaticOwnerDefinitionR1({definition:childSource,prefix,titlePrefixRu:'Переход ПВХ–битум: ',parameterAliases:{liquid_pvc_designation:'liquid_pvc_designation'}});
const parent={...base,parameters:[...base.parameters,...control.parameters.map((p,i)=>({...p,ordinal:base.parameters.length+i}))],formulas:[...base.formulas,...control.formulas],resources:[...base.resources,...control.resources.map((r,i)=>({...r,ordinal:base.resources.length+i}))]};
let joint:AutomaticOwnerDefinition=appendOptionalAutomaticOwnerR1({parent,child,when:yes});
const incompatibleCommonLayer={kind:'or',operands:[eq('pvc15_base',PVC15_BASE.eps),eq('pvc15_base',PVC15_BASE.mineral),eq('pvc15_base',PVC15_BASE.other),eq('pvc15_system_profile',PVC15_SYSTEM.other)]};
const fieldOnlyFacts=new Set(['pvc15_machine_reference','pvc15_machine_maintenance_hours','pvc15_welding_energy_kwh','pvc15_energy_reference',
 'pvc15_rental_billable_hours','pvc15_rental_billable_days','pvc15_machine_purchase_count','pvc15_machine_delivery_reference','pvc15_machine_delivery_trips']);
joint={...joint,parameters:joint.parameters.map(p=>({...p,constraints_json:{...p.constraints_json,
 ...(p.parameter_id==='pvc15_joint_layer_confirmed'?{forbiddenWhen:incompatibleCommonLayer}:{}),
 ...(p.parameter_id==='pvc15_joint_machine_reference'?{forbiddenWhen:eq('pvc15_machine_provision',PVC15_MACHINE.unknown)}:{}),
 ...(p.parameter_id===gateId?{requiredWhen:{kind:'greater_than',parameterId:'area_m2',value:0}}:{}),
 ...(fieldOnlyFacts.has(p.parameter_id)||p.parameter_id.startsWith('pvc15_tool_')?{requiredWhen:and(no,p.constraints_json?.requiredWhen as AutomaticInclusionCondition??{kind:'greater_than',parameterId:'area_m2',value:0})}:{}),
 ...(fieldOnlyFacts.has(p.parameter_id)&&p.constraints_json?.forbiddenWhen?{forbiddenWhen:and(no,p.constraints_json.forbiddenWhen as AutomaticInclusionCondition)}:{}),
 ...(p.parameter_id==='pvc15_separation_product'||p.parameter_id.startsWith('pvc15_supply_pvc15_separation_')?{requiredWhen:and({kind:'or',operands:[no,and(yes,eq('pvc15_joint_layer_relation',PVC15_JOINT_LAYER.separate))]},p.constraints_json?.requiredWhen as AutomaticInclusionCondition??yes)}:{}),
 ...(p.parameter_id.startsWith('pvc15_supply_rc09_liquid_pvc_joint_sealant_')?{requiredWhen:{kind:'or',operands:[no,and(yes,eq(prefix+'liquid_pvc_selection','Не выбрано'))]}}:{}),
 ...(p.parameter_id===prefix+'separation_specification'||p.parameter_id===prefix+'separation_stock'||p.parameter_id===prefix+'separation_reserve'||p.parameter_id===prefix+'separation_quantum'
 ?{requiredWhen:and(yes,eq('pvc15_joint_layer_relation',PVC15_JOINT_LAYER.separate))}:{}),
 }})),resources:joint.resources.map(r=>{
 const childOperation=r.resource_graph.operationCompositionV1 as Record<string,unknown>|undefined;
 const childRow=r.row_id.startsWith(prefix),commonRow=r.row_id.startsWith('pvc15:joint:');
 const operation=childOperation?{...childOperation,groupId:'pvc15-field-transition',groupTitleRu:'Поле ПВХ1,5 и армированный переход ПВХ–битум',
   ...(childRow?{operationId:'transition:'+childOperation.operationId,processOrdinal:Number(childOperation.processOrdinal??0)+10,
     additionalOperations:Array.isArray(childOperation.additionalOperations)?childOperation.additionalOperations.map(o=>({...o,operationId:'transition:'+o.operationId,processOrdinal:Number(o.processOrdinal??0)+10})):undefined}:{}),
 }:commonRow?{contractVersion:'canonical-operation-resource/v1',groupId:'pvc15-field-transition',groupTitleRu:'Поле ПВХ1,5 и армированный переход ПВХ–битум',
 operationId:r.row_id.includes('separation')||r.row_id.includes('layer-')?'separation':r.row_id.includes('liquid')||r.row_id.endsWith('probe')?'control':r.row_id.endsWith('preparation')?'base-check':r.row_id.endsWith('safety')?'protection':r.row_id.endsWith('cutting')?'layout':r.row_id.endsWith('fastening')?'fastening':'welding',
 operationTitleRu:r.row_id.includes('separation')||r.row_id.includes('layer-')?'Устройство совместимого разделительного слоя':r.row_id.includes('liquid')||r.row_id.endsWith('probe')?'Контроль и обработка швов':r.row_id.endsWith('preparation')?'Проверка и очистка основания, разметка':r.row_id.endsWith('safety')?'Подготовка безопасного рабочего места':r.row_id.endsWith('cutting')?'Раскладка и раскрой полотен':r.row_id.endsWith('fastening')?'Механическое крепление по проекту':'Сварка горячим воздухом и соединения',
 completionCriterionRu:'Подтверждены совместимость, общая физическая граница и единственная оплата',processRole:r.row_id.includes('layer-overlap')?'REFERENCE_ONLY':'PROCESS',
 processOrdinal:r.row_id.includes('separation')||r.row_id.includes('layer-')?2:r.row_id.includes('liquid')||r.row_id.endsWith('probe')?7:r.row_id.endsWith('preparation')?0:r.row_id.endsWith('safety')?1:r.row_id.endsWith('cutting')?3:r.row_id.endsWith('fastening')?4:5,
 additionalOperations:[{operationId:r.row_id.includes('separation')||r.row_id.includes('layer-')?'transition:separation':r.row_id.includes('liquid')||r.row_id.endsWith('probe')?'transition:control':r.row_id.endsWith('preparation')||r.row_id.endsWith('safety')?'transition:preparation':r.row_id.endsWith('cutting')?'transition:laying':r.row_id.endsWith('fastening')?'transition:fixing':'transition:welding',
 operationTitleRu:r.row_id.includes('separation')||r.row_id.includes('layer-')?'Разделение ПВХ и битума':r.row_id.includes('liquid')||r.row_id.endsWith('probe')?'Контроль шва перехода':r.row_id.endsWith('preparation')||r.row_id.endsWith('safety')?'Подготовка переходного участка':r.row_id.endsWith('cutting')?'Раскрой и укладка переходной ленты':r.row_id.endsWith('fastening')?'Механическое закрепление переходной ленты':'Сварка переходной ленты горячим воздухом',
 completionCriterionRu:'Подтверждена совместимость общего ресурса и выбранная операция',processRole:'PROCESS',
 processOrdinal:r.row_id.includes('separation')||r.row_id.includes('layer-')?15:r.row_id.includes('liquid')||r.row_id.endsWith('probe')?17:r.row_id.endsWith('preparation')||r.row_id.endsWith('safety')?10:r.row_id.endsWith('cutting')?12:r.row_id.endsWith('fastening')?14:16}]}:undefined;
 let graph:Record<string,unknown>={...r.resource_graph,...(operation?{operationCompositionV1:operation}:{})};
 if(r.row_id==='pvc15:joint:liquid-pvc')graph={...graph,titleSpecificationParameterIds:['liquid_pvc_designation'],titleSpecificationMode:'APPEND'};
 if(commonRow||childRow)graph={...graph,inputParameterIds:[...(graph.inputParameterIds as string[]??[]),'pvc15_joint_source_confirmed','pvc15_joint_source_reference']};
 if(r.row_id===prefix+'transition:labor:worker'||r.row_id===prefix+'transition:tool:adhesive'||r.row_id===prefix+'transition:tool:pressing')
  graph={...graph,inputParameterIds:[...(graph.inputParameterIds as string[]??[]),prefix+'commercial_labor_price_mode']};
 if(r.row_id==='pvc15:joint:separation')graph={...graph,inputParameterIds:[...(graph.inputParameterIds as string[]??[]),'pvc15_base','pvc15_system_profile']};
 if(r.row_id==='pvc15:joint:machine-purchase'||r.row_id==='pvc15:joint:machine-usage')graph={...graph,titleSpecificationParameterIds:['hot_air_welder_designation'],titleSpecificationMode:'APPEND'};
 if(r.row_id==='pvc15:joint:machine-provided'||r.row_id==='pvc15:joint:included-energy'||r.row_id.startsWith('pvc15:joint:tool-'))graph={...graph,includedInResourceOwnerRowId:r.row_id.endsWith('probe')?'rc09:pvc_membrane_weld_probe_test':r.row_id.endsWith('preparation')?'pvc15:labor:preparation':'rc09:pvc_membrane_hot_air_install'};
 if(r.row_id===prefix+'transition:work:labor-rate')graph={...graph,commercialCostCoverageV1:{...(graph.commercialCostCoverageV1 as Record<string,unknown>),
  scopeRu:'Труд переходного участка и отдельная оснастка нанесения мастики и прикатки; общий аппарат и общая оснастка раскрыты у своих владельцев'}};
 const result={...r,...(r.row_id===prefix+'transition:labor:worker'?{title_ru:'Труд переходного участка без повторной оплаты общего аппарата'}:{}),
  ...(r.row_id===prefix+'transition:material:separation'?{inclusion_ast:and(yes,eq('pvc15_joint_layer_relation',PVC15_JOINT_LAYER.separate))}:{}),resource_graph:graph,row_sha256:''};
 return {...result,row_sha256:estimateDeterministicHash(result)};
})};
export const PVC15_FIELD_TRANSITION_DEFINITION_S2743=joint;
