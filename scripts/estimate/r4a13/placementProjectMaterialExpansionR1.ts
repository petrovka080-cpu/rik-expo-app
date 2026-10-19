import {strict as assert} from 'node:assert';
import {buildExplicitProjectMaterialItemsR1,requireExplicitMaterialOperationR1,type ExplicitProjectMaterialPositionR1 as Position} from '../../../src/lib/estimate/v4/explicitProjectMaterialItemsR1';
import type {AutomaticInclusionCondition as Condition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {foundationAtomicChoiceLabelRuR1 as label} from '../../../src/lib/estimate/v4/concreteFoundationAtomicConstructionR1';
import type {EmbeddedProjectMaterialParentR1 as Parent} from './embeddedProjectMaterialExpansionR1';

type Json=Record<string,any>;
const and=(...operands:Condition[]):Condition=>({kind:'and',operands});
const positive=(parameterId:string):Condition=>({kind:'greater_than',parameterId,value:0});
const part=(key:string,titleRu:string,unitId='piece'):Position=>({key,titleRu,unitId});
type Group={key:string;kit:string;owner:string;quantity:string;positions:Position[];separateSupplyAllowed?:boolean};
// A finite set of project item categories, not a universal bill of materials.
// Each selected position still needs its exact designation and project quantity.
const groups:Group[]=[
 {key:'curing_water',kit:'curing-water-application-kit',owner:'equipment:concrete:curing-water-application',quantity:'curing_water_equipment_machine_h',separateSupplyAllowed:false,
  positions:[part('hose','Шланг системы увлажнения по проекту','m'),part('coupling','Соединительная деталь системы увлажнения по проекту'),part('wetting_device','Устройство увлажнения по проекту')]},
 {key:'construction_joint',kit:'construction-joint-included-kit',owner:'material:concrete:construction-joint-waterstop',quantity:'construction_joint_waterstop_length_m',
  positions:[part('fixing','Крепление гидрошпонки по проекту'),part('connection','Соединительная деталь гидрошпонки по проекту'),part('joining_element','Штучный соединительный расходный элемент проектной системы гидрошпонки')]},
 {key:'vibration',kit:'vibration-equipment-included-kit',owner:'equipment:concrete:deep-vibrator',quantity:'deep_vibrator_machine_h',
  positions:[part('head','Вибронаконечник по проекту'),part('shaft','Гибкий вал по проекту'),part('cable','Кабель вибрационного оборудования по проекту','m'),part('coupling','Соединительная муфта вибрационного оборудования по проекту')]},
 {key:'placement_pump',kit:'pump-included-kit',owner:'equipment:concrete:pump',quantity:'pump_machine_h',
  positions:[part('hose','Подающий шланг или линия бетононасоса по проекту','m'),part('connection','Соединительная деталь линии бетононасоса по проекту'),part('seal','Уплотнение линии бетононасоса по проекту')]},
 {key:'placement_crane',kit:'crane-bucket-included-kit',owner:'equipment:concrete:crane-bucket',quantity:'crane_bucket_machine_h',
  positions:[part('lifting_attachment','Грузозахватное приспособление бадьи по утверждённой схеме'),part('connection','Соединительная деталь оснастки бадьи по проекту')]},
 {key:'finishing_manual',kit:'surface-finishing-manual-included-kit',owner:'work:concrete:finish-surface',quantity:'finishing_worker_h',
  positions:[part('tool','Ручной инструмент обработки поверхности по проекту')]},
 {key:'finishing_equipment',kit:'surface-finishing-equipment-included-kit',owner:'equipment:concrete:surface-finishing',quantity:'surface_finishing_equipment_machine_h',
  positions:[part('working_part','Совместимый рабочий элемент оборудования обработки поверхности по проекту'),part('cable','Соединительный кабель оборудования обработки поверхности по проекту','m')]},
 {key:'winter_heating',kit:'winter-heating-included-kit',owner:'equipment:concrete:heating-transformer',quantity:'heating_transformer_machine_h',
  positions:[part('connection_wire','Соединительный провод системы прогрева по проекту, кроме нагревательного кабеля','m'),part('connection','Соединительная деталь системы прогрева по проекту'),part('protection','Штучный защитный или изоляционный элемент системы прогрева по проекту'),part('monitor','Контрольный прибор системы прогрева по проекту')]},
];
export const PLACEMENT_PROJECT_MATERIAL_RETIRED_KIT_IDS_R1=[
 'curing-water-application-kit','construction-joint-included-kit','construction-joint-separate-kit','vibration-equipment-included-kit','vibration-equipment-separate-kit',
 'pump-included-kit','crane-bucket-included-kit','placement-equipment-separate-kit','surface-finishing-manual-included-kit','surface-finishing-equipment-included-kit','surface-finishing-separate-kit','winter-heating-included-kit','winter-heating-separate-kit',
].map(id=>'material:concrete:'+id);
const changed:Record<string,string[]>={
 'material:concrete:winter-heating-cable':['winter_heating_accessories_pricing_mode'],
 'work:concrete:finish-surface':['surface_finishing_accessories_pricing_mode'],
 'work:concrete:winter-heating':['winter_heating_accessories_pricing_mode'],
 'equipment:concrete:heating-transformer':['winter_heating_accessories_pricing_mode'],
 'equipment:concrete:curing-water-application':['curing_water_equipment_kit_specification','curing_water_equipment_set_count'],
};
const localize=(value:any):any=>{
 if(Array.isArray(value))return value.map(localize);if(!value||typeof value!=='object')return value;
 const result=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,localize(v)]));
 if(typeof value.parameterId==='string'&&value.parameterId.startsWith('foundation_item_')&&typeof value.value==='string')result.value=label(value.value);
 return result;
};
export function buildPlacementProjectMaterialExpansionR1(parent:Parent,options:Readonly<{catalogId:string;contract:string}>){
 const catalogId=String(parent.definition.catalog_id);assert.equal(options.catalogId,catalogId,'PLACEMENT_EXACT_TARGET_REQUIRED');
 assert.equal(parent.definition.definition_version,12);assert.equal(parent.parameters.length,101);assert.equal(parent.resources.length,41);assert.equal(parent.formulas.length,41);
 const parameters=structuredClone([...parent.parameters]),formulas=structuredClone([...parent.formulas]),resources=structuredClone([...parent.resources]);
 const resultGroups:Json[]=[];
 for(const group of groups){
  // Read every predicate and composition from the immutable parent: the old
  // separate pump/crane and finishing rows are shared between method branches.
  const kit=parent.resources.find(r=>r.row_id==='material:concrete:'+group.kit),owner=parent.resources.find(r=>r.row_id===group.owner);assert(kit&&owner);
  assert.equal(kit.resource_graph.includedInResourceOwnerRowId,group.owner);
  const active=requireExplicitMaterialOperationR1(kit.inclusion_ast as Condition);
  const ownerCondition=and(active,positive(group.quantity));
  const addition=buildExplicitProjectMaterialItemsR1(catalogId,group.key,active,[{condition:ownerCondition,ownerRowId:group.owner,titleRu:owner.title_ru}],parent.parameters,group.positions,
   'e6f997997824b9acc38f96fa37f90806c496fb986cf51e508cfb9daa3f44290b',group.separateSupplyAllowed===false?{separateSupplyAllowed:false}:{});
  for(const p of addition.parameters)if(!parameters.some(old=>old.parameter_id===p.parameter_id)){
   const next={...p,constraints_json:localize(p.constraints_json??{})};
   if(Array.isArray(next.constraints_json.values))next.constraints_json.values=next.constraints_json.values.map((v:unknown)=>typeof v==='string'?label(v):v);
   parameters.push(next);
  }
  formulas.push(...addition.formulas);
  resources.push(...addition.resources.map(r=>({...r,inclusion_ast:localize(r.inclusion_ast),resource_graph:{...localize(r.resource_graph),operationCompositionV1:structuredClone(kit.resource_graph.operationCompositionV1)}})));
  resultGroups.push({...group,active,includedOwnerTitleRu:owner.title_ru,ownerRowIds:[group.owner]});
 }
 const retiredParameters=new Set<string>();
 for(const p of parameters)if(/^(construction_joint|vibration_equipment|placement_equipment|surface_finishing|winter_heating)_accessories_(pricing_mode|specification|set_count)$/u.test(p.parameter_id)||/^curing_water_equipment_(kit_specification|set_count)$/u.test(p.parameter_id)){
  retiredParameters.add(p.parameter_id);p.required=false;
  const {requiredWhen:_required,forbiddenWhen:_forbidden,...constraints}=p.constraints_json??{};
  p.constraints_json=constraints;p.truth_metadata={...p.truth_metadata,visibility_role:'INTERNAL_ONLY',retiredAggregateKitParameter:true};
 }
 assert.equal(retiredParameters.size,17);
 for(const row of resources){
  if(PLACEMENT_PROJECT_MATERIAL_RETIRED_KIT_IDS_R1.includes(row.row_id)){
   row.inclusion_ast={kind:'literal',value:false};row.procurement_eligible=false;row.cost_owner_id=null;
   const {purchaseBalanceV1:_balance,effectiveQuantityOutputV1:_effective,includedInResourceOwnerRowId:_owner,...graph}=row.resource_graph;
   row.resource_graph={...graph,costOwner:'scope',costTreatment:'INFORMATIONAL_SCOPE',retiredAggregateKitScopeOnly:true};
   row.source_metadata={...row.source_metadata,automaticGenericPriceInheritanceAllowed:false};
   row.title_ru='Прежний агрегатный комплект: заменён отдельными проектными материальными позициями';
  }else if(changed[row.row_id]){
   const inputs=row.resource_graph.inputParameterIds;assert(Array.isArray(inputs));
   for(const id of changed[row.row_id]!)assert(inputs.includes(id),'PLACEMENT28_OWNER_INPUT_SHAPE_DRIFT');
   row.resource_graph={...row.resource_graph,inputParameterIds:inputs.filter(id=>!changed[row.row_id]!.includes(String(id)))};
   row.source_metadata={...row.source_metadata,automaticGenericPriceInheritanceAllowed:false};
  }
 }
 const referencesRetired=(v:any):boolean=>typeof v==='string'?retiredParameters.has(v):Array.isArray(v)?v.some(referencesRetired):!!v&&typeof v==='object'&&Object.values(v).some(referencesRetired);
 for(const row of resources.filter(r=>!r.resource_graph.retiredAggregateKitScopeOnly))assert(!referencesRetired([row.inclusion_ast,row.resource_graph,formulas.find(f=>f.formula_id===row.formula_id)?.input_parameter_ids??[]]),'PLACEMENT28_LIVE_RETIRED_REFERENCE:'+row.row_id);
 for(const p of parameters.filter(p=>!retiredParameters.has(p.parameter_id)))assert(!referencesRetired(p.constraints_json),'PLACEMENT28_LIVE_CONSTRAINT_RETIRED_REFERENCE:'+p.parameter_id);
 assert.equal(new Set(parameters.map(p=>p.parameter_id)).size,parameters.length);assert.equal(new Set(formulas.map(f=>f.formula_id)).size,formulas.length);assert.equal(new Set(resources.map(r=>r.row_id)).size,resources.length);
 assert(parameters.every(p=>p.default_value==null));
 return {contract:options.contract,catalogId,titleRu:String(parent.definition.passport.canonicalRuName),primaryMeasureParameterId:'plan_dimension_concrete_volume_m3',
  parameters:parameters.map((p,ordinal)=>({...p,ordinal})),formulas,resources:resources.map((r,ordinal)=>({...r,ordinal})),groups:resultGroups,
  retiredAggregateRowIds:PLACEMENT_PROJECT_MATERIAL_RETIRED_KIT_IDS_R1,retiredAggregateParameterIds:[...retiredParameters],modifiedOwnerInputRows:Object.keys(changed),
  preservedParentRowIds:parent.resources.filter(r=>!PLACEMENT_PROJECT_MATERIAL_RETIRED_KIT_IDS_R1.includes(r.row_id)&&!changed[r.row_id]).map(r=>r.row_id),projectFactsRequired:true,engineeringAccepted:false,confirmedOrder:false};
}
