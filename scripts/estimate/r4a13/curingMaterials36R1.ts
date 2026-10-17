import {assertCuring36PrimaryBindingR1} from './curingMaterials36PrimaryBindingR1';
import {strict as assert} from 'node:assert';
import pins from '../../../data/estimate-benchmarks/fixtures/curing-thirty-six-current-parents-r1.json';
import {buildExplicitProjectMaterialItemsR1,requireExplicitMaterialOperationR1,type ExplicitProjectMaterialPositionR1 as Position} from '../../../src/lib/estimate/v4/explicitProjectMaterialItemsR1';
import type {AutomaticInclusionCondition as Condition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {foundationAtomicChoiceLabelRuR1 as label} from '../../../src/lib/estimate/v4/concreteFoundationAtomicConstructionR1';
import type {EmbeddedProjectMaterialParentR1 as Parent} from './embeddedProjectMaterialExpansionR1';
import type {CanonicalEstimateParameterDefinition as Parameter} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';

type Json=Record<string,any>;
const and=(...operands:Condition[]):Condition=>({kind:'and',operands});
const positive=(parameterId:string):Condition=>({kind:'greater_than',parameterId,value:0});
const methodSourceSha='6d113ae1664bf9b908d82f3fa1232594bb3275e9e20d12eff9c51e3e9532e98d';
const prefix='material:concrete:';
export const curingMaterials36ContractR1='rik-expo-app.curing36-individual-materials.r1';
export const CURING36_ANTISOL_OWNER_R1=prefix+'membrane-curing-compound:antisol250w-us';
export const CURING36_EXACT_QUOTE_PARAMETER_R1='antisol_exact_material_included_kit_quote_reference';
export const CURING36_RETIRED_KITS_R1=[
 'curing-application-included-kit','curing-application-separate-kit',
 'wet-curing-material-included-kit','sheet-curing-material-included-kit',
 'compound-curing-material-included-kit','curing-material-separate-kit',
 'compound-curing-material-included-kit:antisol250w-us',
].map(id=>prefix+id);
const priceOwners=[prefix+'wet-curing-covering',prefix+'impervious-curing-sheet',
 prefix+'membrane-curing-compound',CURING36_ANTISOL_OWNER_R1,'equipment:concrete:curing-application'];
const part=(key:string,titleRu:string,unitId='piece'):Position=>({key,titleRu,unitId});
// These are selectable project positions, never a mandatory product kit or a
// consumption allowance. Main coverings, water and compound remain untouched.
const groups=[
 {key:'curing_application',separate:prefix+'curing-application-separate-kit',included:[prefix+'curing-application-included-kit'],
  positions:[part('hose','Шланг подачи материала для ухода по проекту','m'),part('coupling','Соединительная деталь оборудования для ухода по проекту'),
   part('nozzle','Насадка или распылитель оборудования для ухода по проекту'),part('filter','Совместимый фильтр оборудования для ухода по проекту')]},
 {key:'curing_material',separate:prefix+'curing-material-separate-kit',included:[prefix+'wet-curing-material-included-kit',prefix+'sheet-curing-material-included-kit',prefix+'compound-curing-material-included-kit',prefix+'compound-curing-material-included-kit:antisol250w-us'],
  positions:[part('fixing','Крепление материала для ухода по проекту'),part('sealing','Соединительная или герметизирующая лента материала для ухода по проекту','m'),
   part('protection','Защитный материал для выбранного способа ухода по проекту','m2')]},
];
const localize=(value:any):any=>{
 if(Array.isArray(value))return value.map(localize);if(!value||typeof value!=='object')return value;
 const result=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,localize(v)]));
 if(typeof value.parameterId==='string'&&value.parameterId.startsWith('foundation_item_')&&typeof value.value==='string')result.value=label(value.value);
 return result;
};

/** Forward authoring adapter only. All 23 existing formula ASTs, the primary
 * m3 and the separately admitted exact Antisol calculation remain unchanged. */
export function buildCuringMaterials36R1(parent:Parent){
 assertCuring36PrimaryBindingR1(parent);
 const catalogId=String(parent.definition.catalog_id),pin=pins.parents.find(p=>p.catalogId===catalogId);
 assert(pin,'CURING36_EXACT_TARGET_REQUIRED');
 assert.equal(parent.definition.id,pin.definitionId);assert.equal(parent.definition.definition_version,pin.definitionVersion);
 assert.equal(parent.definition.definition_sha256,pin.definitionSha256);
 assert.equal(parent.parameters.length,45);assert.equal(parent.formulas.length,23);assert.equal(parent.resources.length,23);
 assert.deepEqual(parent.resources.map(r=>[r.row_id,r.row_sha256]),pin.rows.map(r=>[r.rowId,r.rowSha256]));
 const parameters:(Parameter&{title_ru?:string})[]=structuredClone([...parent.parameters]);
 const formulas=structuredClone([...parent.formulas]),resources=structuredClone([...parent.resources]);
 const resultGroups:Json[]=[],quoteConditions:Condition[]=[];
 for(const group of groups){
  const separate=parent.resources.find(r=>r.row_id===group.separate);assert(separate);
  const included=group.included.map(id=>{
   const kit=parent.resources.find(r=>r.row_id===id);assert(kit);
   const owner=parent.resources.find(r=>r.row_id===kit.resource_graph.includedInResourceOwnerRowId);assert(owner);
   // Stock can cover the entire Antisol purchase. Its confirmed accessories
   // still have physical demand and must not disappear behind a zero order.
   const branch=requireExplicitMaterialOperationR1(kit.inclusion_ast as Condition);
   return {condition:owner.row_id===CURING36_ANTISOL_OWNER_R1?and(branch,positive('exposed_curing_surface_area_m2')):branch,
    ownerRowId:owner.row_id,titleRu:owner.title_ru};
  });
  const addition=buildExplicitProjectMaterialItemsR1(catalogId,group.key,requireExplicitMaterialOperationR1(separate.inclusion_ast as Condition),included,parent.parameters,group.positions,methodSourceSha);
  for(const p of addition.parameters)if(!parameters.some(old=>old.parameter_id===p.parameter_id)){
   const next={...p,constraints_json:localize(p.constraints_json??{})};
   if(Array.isArray(next.constraints_json.values))next.constraints_json.values=next.constraints_json.values.map((v:unknown)=>typeof v==='string'?label(v):v);
   parameters.push(next);
  }
  formulas.push(...addition.formulas);
  for(const row of addition.resources){
   const graph=localize(row.resource_graph),exact=graph.includedInResourceOwnerRowId===CURING36_ANTISOL_OWNER_R1;
   const inclusion=localize(row.inclusion_ast);
   if(exact)quoteConditions.push(inclusion);
   resources.push({...row,inclusion_ast:inclusion,resource_graph:{...graph,
    ...(exact?{inputParameterIds:[...graph.inputParameterIds,CURING36_EXACT_QUOTE_PARAMETER_R1]}:{}),
    operationCompositionV1:structuredClone(separate.resource_graph.operationCompositionV1)}});
  }
  resultGroups.push({...group,ownerRowIds:included.map(i=>i.ownerRowId)});
 }
 const retiredParameters=new Set<string>();
 for(const p of parameters)if(/^(application_equipment|curing_material)_accessories_(pricing_mode|specification|set_count)$/u.test(p.parameter_id)){
  retiredParameters.add(p.parameter_id);p.required=false;
  const {requiredWhen:_required,forbiddenWhen:_forbidden,...constraints}=p.constraints_json??{};
  const {required_when:_truthRequired,visible_when:_visible,...truth}=p.truth_metadata??{};
  p.constraints_json=constraints;p.truth_metadata={...truth,visibility_role:'INTERNAL_ONLY',retiredAggregateKitParameter:true};
 }
 assert.equal(retiredParameters.size,6);assert.equal(quoteConditions.length,3);
 const quote=parameters.find(p=>p.parameter_id===CURING36_EXACT_QUOTE_PARAMETER_R1);assert(quote);
 const quoteRequired={kind:'or',operands:quoteConditions};
 quote.constraints_json={...quote.constraints_json,requiredWhen:quoteRequired};
 quote.truth_metadata={...quote.truth_metadata,required_when:quoteRequired,visible_when:quoteRequired};
 quote.title_ru='Источник подтверждённого включения выбранных принадлежностей в цену Antisol; при заказе 0 — документ ранее оплаченной поставки и её комплектности';
 for(const row of resources){
  if(CURING36_RETIRED_KITS_R1.includes(row.row_id)){
   row.inclusion_ast={kind:'literal',value:false};row.procurement_eligible=false;row.cost_owner_id=null;
   const {purchaseBalanceV1:_balance,effectiveQuantityOutputV1:_effective,includedInResourceOwnerRowId:_owner,...graph}=row.resource_graph;
   row.resource_graph={...graph,costOwner:'scope',costTreatment:'INFORMATIONAL_SCOPE',retiredAggregateKitScopeOnly:true};
   row.source_metadata={...row.source_metadata,automaticGenericPriceInheritanceAllowed:false};
   row.title_ru='Прежний агрегатный комплект: заменён отдельными проектными материальными позициями';
  }else if(priceOwners.includes(row.row_id))row.source_metadata={...row.source_metadata,automaticGenericPriceInheritanceAllowed:false};
 }
 const refers=(v:any):boolean=>typeof v==='string'?retiredParameters.has(v):Array.isArray(v)?v.some(refers):!!v&&typeof v==='object'&&Object.values(v).some(refers);
 for(const row of resources.filter(r=>!r.resource_graph.retiredAggregateKitScopeOnly))assert(!refers([row.inclusion_ast,row.resource_graph,formulas.find(f=>f.formula_id===row.formula_id)?.input_parameter_ids]),'CURING36_LIVE_RETIRED_KIT_REFERENCE:'+row.row_id);
 for(const p of parameters.filter(p=>!retiredParameters.has(p.parameter_id)))assert(!refers(p.constraints_json),'CURING36_LIVE_CONSTRAINT_RETIRED_KIT_REFERENCE:'+p.parameter_id);
 assert.equal(resources.length,46);assert.equal(new Set(resources.map(r=>r.row_id)).size,46);
 assert.equal(new Set(parameters.map(p=>p.parameter_id)).size,parameters.length);assert.equal(new Set(formulas.map(f=>f.formula_id)).size,formulas.length);
 assert(parameters.every(p=>p.default_value==null));
 return {contract:curingMaterials36ContractR1,catalogId,titleRu:String(parent.definition.passport.canonicalRuName),primaryMeasureParameterId:'cured_concrete_volume_m3',
  parameters:parameters.map((p,ordinal)=>({...p,ordinal})),formulas,resources:resources.map((r,ordinal)=>({...r,ordinal})),groups:resultGroups,
  retiredAggregateRowIds:CURING36_RETIRED_KITS_R1,retiredAggregateParameterIds:[...retiredParameters],modifiedOwnerPriceRows:priceOwners,
  preservedParentRowIds:parent.resources.filter(r=>!CURING36_RETIRED_KITS_R1.includes(r.row_id)&&!priceOwners.includes(r.row_id)).map(r=>r.row_id),
  projectFactsRequired:true,engineeringAccepted:false,confirmedOrder:false};
}
