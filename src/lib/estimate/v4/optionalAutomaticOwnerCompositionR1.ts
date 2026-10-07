import type { AutomaticOwnerDefinition, AutomaticInclusionCondition } from './automaticConstructionOwnerR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {NUMERIC_PARAMETER_RELATIONS} from '../backendPlatform/numericParameterRelations';

type Json = Record<string, unknown>;
type BoundAutomaticOwnerDefinitionR1=AutomaticOwnerDefinition & {
  parameterAliasBindings?:readonly {sourceParameterId:string;targetParameterId:string}[];
};
const expressionKeys = new Set(['expression', 'expression_source', 'consumedExpression', 'stockExpression',
  'reserveExpression', 'orderQuantumExpression', 'plannedConsumptionExpression']);
const parameterKeys = new Set(['parameterId', 'parameter_id', 'quantityParameterId', 'selectorParameterId',
  'applicabilityParameterId', 'valueParameterId', 'scopeParameterId', 'rentalDurationParameterId',
  'projectStageCountParameterId', 'titleSpecificationParameterId', ...NUMERIC_PARAMETER_RELATIONS.map(([key])=>key)]);
const parameterListKeys = new Set(['input_parameter_ids', 'inputParameterIds', 'titleSpecificationParameterIds',
  'scopeContextParameterIds', 'sourceScheduleParameterIds']);
const rowKeys = new Set(['rowId', 'row_id', 'ownerRowId', 'sourceRowId', 'includedInResourceOwnerRowId', 'purchaseBalanceOwnerRowId',
  'cost_owner_id', 'effectiveQuantitySourceRowId', 'coveredRowIds', 'includedContractorResourceRowIds']);

/** A data binding, never another evaluator. Every authored expression is
 * reparsed by the existing formula graph and later evaluated by the same core.
 * Child source documents, rates, enum values and guide prose stay unchanged. */
export function namespaceAutomaticOwnerDefinitionR1(input: {
  definition: AutomaticOwnerDefinition; prefix: string; titlePrefixRu: string;
  /** Authored product-specification bindings, never aliases inferred from names. */
  parameterAliases?: Readonly<Record<string,string>>;
}): BoundAutomaticOwnerDefinitionR1 {
  if (!/^[a-z][a-z0-9_]*_$/u.test(input.prefix)) throw Error('COMPOSITION_NAMESPACE_INVALID');
  for(const [source,target] of Object.entries(input.parameterAliases??{})){
    const parameter=input.definition.parameters.find(p=>p.parameter_id===source);
    if(!parameter||parameter.value_type!=='text'||parameter.unit_id!==null
      ||parameter.truth_metadata.visibility_role==='INTERNAL_ONLY'||parameter.truth_metadata.visibility_role==='USER_DERIVED_READONLY'
      ||!/^[_A-Za-z][_A-Za-z0-9]*$/u.test(target))throw Error('COMPOSITION_PARAMETER_ALIAS_INVALID:'+source);
  }
  const parameterIds=new Map(input.definition.parameters.map(p=>[p.parameter_id,input.parameterAliases?.[p.parameter_id]??input.prefix+p.parameter_id]));
  const rowIds=new Map(input.definition.resources.map(r=>[r.row_id,input.prefix+r.row_id]));
  const formulaIds=new Map(input.definition.formulas.map(f=>[f.formula_id,input.prefix+f.formula_id]));
  const expression=(source:string)=>source.replace(/[A-Za-z_][A-Za-z0-9_]*/gu,id=>parameterIds.get(id)??id);
  const bind=(value:unknown,key=''):unknown=>{
    if(typeof value==='string') {
      if(expressionKeys.has(key))return expression(value);
      if(parameterKeys.has(key)||parameterListKeys.has(key))return parameterIds.get(value)??value;
      if(rowKeys.has(key))return rowIds.get(value)??value;
      if(key==='formulaId'||key==='formula_id')return formulaIds.get(value)??value;
      return value;
    }
    if(Array.isArray(value))return value.map(item=>bind(item,key));
    if(value&&typeof value==='object') {
      const object=value as Json;
      return Object.fromEntries(Object.entries(object).map(([field,child])=>[
        key==='titleSpecificationParameterLabelsRu'?(parameterIds.get(field)??field):field,
        object.kind==='parameter'&&field==='id'&&typeof child==='string'?(parameterIds.get(child)??child):bind(child,field),
      ]));
    }
    return value;
  };
  const parameters=input.definition.parameters.filter(p=>!Object.hasOwn(input.parameterAliases??{},p.parameter_id)).map(p=>({ ...p,parameter_id:parameterIds.get(p.parameter_id)!,
    title_ru:input.titlePrefixRu+p.title_ru,default_value:null,constraints_json:bind(p.constraints_json) as Json|null,
    truth_metadata:{...bind(p.truth_metadata) as Json,semantic_parameter_key:input.prefix+String(p.truth_metadata.semantic_parameter_key),
      originalComponentParameterId:p.parameter_id,runtime_profile_value:false,hidden_default_forbidden:true},
  }));
  const formulas=input.definition.formulas.map(f=>{
    if(typeof f.expression_source!=='string')throw Error('COMPOSITION_FORMULA_SOURCE_REQUIRED:'+f.formula_id);
    const source=expression(f.expression_source),compiled=compileFormulaGraph(source);
    return {...f,formula_id:formulaIds.get(f.formula_id)!,expression_source:source,ast:compiled.ast,
      input_parameter_ids:compiled.inputParameterIds,ast_sha256:estimateDeterministicHash(compiled.ast)};
  });
  const resources=input.definition.resources.map(r=>{
    const result={...r,id:input.prefix+r.id,row_id:rowIds.get(r.row_id)!,formula_id:formulaIds.get(r.formula_id)!,
      cost_owner_id:r.cost_owner_id==null?null:rowIds.get(r.cost_owner_id)??r.cost_owner_id,
      inclusion_ast:bind(r.inclusion_ast) as Json,resource_graph:{...bind(r.resource_graph) as Json,
        semanticOwnerId:input.prefix+String(r.resource_graph.semanticOwnerId)},
      source_metadata:{...r.source_metadata,originalComponentRowId:r.row_id},row_sha256:''};
    return {...result,row_sha256:estimateDeterministicHash(result)};
  });
  return {parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
    parameterAliasBindings:Object.entries(input.parameterAliases??{}).map(([sourceParameterId,targetParameterId])=>({sourceParameterId,targetParameterId})),
    ordinaryParameterIds:input.definition.ordinaryParameterIds.map(id=>parameterIds.get(id)!)};
}

/** Optional scopes cannot inject their default profiles or demand inputs when
 * the user has explicitly excluded the scope. A missing choice remains a need. */
export function appendOptionalAutomaticOwnerR1(input: {
  parent: AutomaticOwnerDefinition; child: BoundAutomaticOwnerDefinitionR1; when: AutomaticInclusionCondition;
}): AutomaticOwnerDefinition {
  for(const alias of input.child.parameterAliasBindings??[]){
    const target=input.parent.parameters.find(p=>p.parameter_id===alias.targetParameterId);
    if(!target||target.value_type!=='text'||target.unit_id!==null
      ||target.truth_metadata.visibility_role==='INTERNAL_ONLY'||target.truth_metadata.visibility_role==='USER_DERIVED_READONLY')
      throw Error('COMPOSITION_PRODUCT_ALIAS_TARGET_INVALID:'+alias.targetParameterId);
  }
  const combine=(previous:unknown):Json=>({kind:'and',operands:[input.when,previous??{kind:'literal',value:true}]});
  const parameters=[...input.parent.parameters,...input.child.parameters.map((p,index)=>{
    const internal=p.truth_metadata.visibility_role==='INTERNAL_ONLY'||p.truth_metadata.visibility_role==='USER_DERIVED_READONLY';
    return {...p,ordinal:input.parent.parameters.length+index,required:false,default_value:null,
      constraints_json:{...p.constraints_json,...(!internal?{requiredWhen:combine(p.constraints_json?.requiredWhen)}:{})}};
  })];
  const resources=[...input.parent.resources,...input.child.resources.map((r,index)=>{
    const coverage=r.resource_graph.commercialCostCoverageV1 as Json|undefined;
    const result={...r,ordinal:input.parent.resources.length+index,inclusion_ast:combine(r.inclusion_ast),
      resource_graph:{...r.resource_graph,...(coverage?{commercialCostCoverageV1:{...coverage,when:combine(coverage.when)}}:{})},row_sha256:''};
    return {...result,row_sha256:estimateDeterministicHash(result)};
  })];
  for(const [kind,ids] of [['parameter',parameters.map(p=>p.parameter_id)],['formula',[...input.parent.formulas,...input.child.formulas].map(f=>f.formula_id)],['row',resources.map(r=>r.row_id)]] as const)
    if(new Set(ids).size!==ids.length)throw Error('COMPOSITION_DUPLICATE_'+kind.toUpperCase());
  const declared=new Set(parameters.map(p=>p.parameter_id));
  for(const formula of [...input.parent.formulas,...input.child.formulas])for(const id of formula.input_parameter_ids)
    if(!declared.has(id))throw Error('COMPOSITION_UNDECLARED_FORMULA_PARAMETER:'+id);
  return {...input.parent,parameters,formulas:[...input.parent.formulas,...input.child.formulas],resources};
}
