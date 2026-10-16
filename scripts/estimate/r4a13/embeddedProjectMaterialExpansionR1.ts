import {strict as assert} from 'node:assert';
import {buildExplicitProjectMaterialItemsR1,requireExplicitMaterialOperationR1} from '../../../src/lib/estimate/v4/explicitProjectMaterialItemsR1';
import {CONCRETE_FOUNDATION_ATOMIC_CONSTRUCTION_PROFILES_R1 as profiles,foundationAtomicChoiceLabelRuR1 as label} from '../../../src/lib/estimate/v4/concreteFoundationAtomicConstructionR1';
import type {CanonicalEstimateParameterDefinition as Parameter,CanonicalEstimateFormulaDefinition as Formula,CanonicalEstimateResourceDefinition as Resource} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';

type Json=Record<string,any>;
export type EmbeddedProjectMaterialParentR1={definition:Json;parameters:readonly Parameter[];formulas:readonly Formula[];resources:readonly Resource[]};
export type EmbeddedProjectMaterialExpansionOptionsR1=Readonly<{
 contract:string;
 target:Readonly<{catalogId:string;titleRu:string;contextKey:string}>;
 changedOwnerRowIds:readonly string[];
}>;

/** Preserve the current structure model. Only the four aggregate material kits
 * become explicit, independently selected physical positions. No slab geometry,
 * hours, old q or example inputs are copied into a new runtime definition. */
export function buildEmbeddedProjectMaterialExpansionR1(parent:EmbeddedProjectMaterialParentR1,options:EmbeddedProjectMaterialExpansionOptionsR1){
 const catalogId=String(parent.definition.catalog_id),target=options.target;
 assert.equal(target.catalogId,catalogId,'EMBEDDED_MATERIAL_EXACT_TARGET_REQUIRED');assert.equal(parent.resources.length,30,'PILE_CAP_SIX_CURRENT_PARENT_SHAPE_DRIFT');
 const profile=profiles.find(p=>p.operation==='anchor'&&p.contextKey===target.contextKey);
 assert(profile,'PILE_CAP_SIX_SHARED_MATERIAL_POSITIONS_REQUIRED');
 const parameters:Parameter[]=structuredClone([...parent.parameters]);
 const formulas:Formula[]=structuredClone([...parent.formulas]);
 const resources:Resource[]=structuredClone([...parent.resources]);
 const originalIds=new Set(resources.map(r=>r.row_id)),retiredRows:string[]=[],retiredParameters=new Set<string>();
 const groups:Json[]=[];
 const localize=(value:any):any=>{
  if(Array.isArray(value))return value.map(localize);if(!value||typeof value!=='object')return value;
  const result=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,localize(v)]));
  if(typeof value.parameterId==='string'&&value.parameterId.startsWith('foundation_item_')&&typeof value.value==='string')result.value=label(value.value);
  return result;
 };
 for(const group of profile.completionMaterialGroups){
  const separate=resources.find(r=>r.row_id===group.separateRowId);assert(separate,'PILE_CAP_SIX_SEPARATE_KIT_MISSING');
  const includedRows=group.includedRowIds.map(id=>{const row=resources.find(r=>r.row_id===id);assert(row,'PILE_CAP_SIX_INCLUDED_KIT_MISSING');return row;});
  const active=requireExplicitMaterialOperationR1(separate.inclusion_ast as any);
  const included=includedRows.map(row=>{
   const ownerRowId=String(row.resource_graph.includedInResourceOwnerRowId),owner=resources.find(r=>r.row_id===ownerRowId);
   assert(owner,'PILE_CAP_SIX_INCLUDED_PAID_OWNER_MISSING');
   return {condition:requireExplicitMaterialOperationR1(row.inclusion_ast as any),ownerRowId,titleRu:owner.title_ru};
  });
  const addition=buildExplicitProjectMaterialItemsR1(catalogId,group.key,active,included,parameters,group.positions,'42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50');
  for(const p of addition.parameters)if(!parameters.some(old=>old.parameter_id===p.parameter_id)){
   const parameter={...p,constraints_json:localize(p.constraints_json??{})};
   if(Array.isArray(parameter.constraints_json.values))parameter.constraints_json.values=parameter.constraints_json.values.map((v:unknown)=>typeof v==='string'?label(v):v);
   parameters.push(parameter);
  }
  for(const f of addition.formulas){assert(!formulas.some(old=>old.formula_id===f.formula_id),'PILE_CAP_SIX_FORMULA_COLLISION');formulas.push(f);}
  for(const r of addition.resources){assert(!originalIds.has(r.row_id),'PILE_CAP_SIX_ROW_COLLISION');resources.push({...r,inclusion_ast:localize(r.inclusion_ast),resource_graph:{...localize(r.resource_graph),operationCompositionV1:structuredClone(separate.resource_graph.operationCompositionV1)}});}
  for(const row of [separate,...includedRows]){
   retiredRows.push(row.row_id);row.inclusion_ast={kind:'literal',value:false};row.procurement_eligible=false;row.cost_owner_id=null;
   const {purchaseBalanceV1:_balance,effectiveQuantityOutputV1:_effective,includedInResourceOwnerRowId:_owner,...graph}=row.resource_graph;
   row.resource_graph={...graph,costOwner:'scope',costTreatment:'INFORMATIONAL_SCOPE',retiredAggregateKitScopeOnly:true,expandedMaterialRowOwnerScope:group.key};
   row.source_metadata={...row.source_metadata,automaticGenericPriceInheritanceAllowed:false};
   row.title_ru=`Прежний агрегатный состав «${group.titleRu}»: заменён отдельными материальными позициями`;
  }
  groups.push({key:group.key,positions:group.positions.map(p=>({...p})),ownerRowIds:included.map(i=>i.ownerRowId)});
 }
 for(const p of parameters)if(/_accessories_(pricing_mode|specification|set_count)$/u.test(p.parameter_id)){
  retiredParameters.add(p.parameter_id);p.required=false;
  const {requiredWhen:_required,forbiddenWhen:_forbidden,...constraints}=p.constraints_json??{};
  p.constraints_json=constraints;p.truth_metadata={...p.truth_metadata,visibility_role:'INTERNAL_ONLY',retiredAggregateKitParameter:true};
 }
 const modifiedOwnerInputRows:string[]=[];
 for(const row of resources.filter(r=>!r.resource_graph.retiredAggregateKitScopeOnly)){
  const inputs=row.resource_graph.inputParameterIds;
  if(Array.isArray(inputs)&&inputs.some(id=>typeof id==='string'&&retiredParameters.has(id))){
   assert(options.changedOwnerRowIds.includes(row.row_id),'PILE_CAP_SIX_UNREVIEWED_OWNER_SELECTOR_REFERENCE');
   row.resource_graph={...row.resource_graph,inputParameterIds:inputs.filter(id=>typeof id!=='string'||!retiredParameters.has(id))};
   row.source_metadata={...row.source_metadata,automaticGenericPriceInheritanceAllowed:false};
   modifiedOwnerInputRows.push(row.row_id);
  }
 }
 assert.equal(modifiedOwnerInputRows.length,2,'PILE_CAP_SIX_PARENT_OWNER_SELECTOR_SHAPE_DRIFT');
 const referencesRetired=(v:any):boolean=>typeof v==='string'?retiredParameters.has(v):Array.isArray(v)?v.some(referencesRetired):!!v&&typeof v==='object'&&Object.values(v).some(referencesRetired);
 for(const row of resources.filter(r=>!r.resource_graph.retiredAggregateKitScopeOnly)){
  const formula=formulas.find(f=>f.formula_id===row.formula_id);
  assert(!referencesRetired([row.inclusion_ast,row.resource_graph,formula?.input_parameter_ids??[]]),'PILE_CAP_SIX_LIVE_ROW_REFERENCES_RETIRED_KIT');
 }
 for(const p of parameters.filter(p=>!retiredParameters.has(p.parameter_id)))assert(!referencesRetired(p.constraints_json),'PILE_CAP_SIX_LIVE_PARAMETER_REFERENCES_RETIRED_KIT');
 assert.equal(new Set(parameters.map(p=>p.parameter_id)).size,parameters.length);assert.equal(new Set(resources.map(r=>r.row_id)).size,resources.length);
 assert(parameters.every(p=>p.default_value==null),'PILE_CAP_SIX_HIDDEN_DEFAULT');
 return {contract:options.contract,catalogId,titleRu:target.titleRu,primaryMeasureParameterId:'embedded_item_count_piece',
  parameters:parameters.map((p,ordinal)=>({...p,ordinal})),formulas,resources:resources.map((r,ordinal)=>({...r,ordinal})),
  groups,retiredAggregateRowIds:retiredRows,retiredAggregateParameterIds:[...retiredParameters],modifiedOwnerInputRows,
  preservedParentRowIds:parent.resources.filter(r=>!retiredRows.includes(r.row_id)&&!modifiedOwnerInputRows.includes(r.row_id)).map(r=>r.row_id),
  projectFactsRequired:true,engineeringAccepted:false,confirmedOrder:false};
}
