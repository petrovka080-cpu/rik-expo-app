/** Canonical Jest registration of the isolated source oracle; assertions preserved. */
import assert from 'node:assert/strict';
import {buildAutomaticConstructionOwnerR1}from'../v4/automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore}from'./canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash}from'../estimateDeterministicHash';
const selector='test_method',quantity='test_mapped_quantity',volume='test_geometry';
const exact={kind:'in',parameterId:selector,values:['YES']};
const positive={kind:'greater_than',parameterId:volume,value:0};
const policy={version:'canonical-conditional-enum-positive-quantity:v1',selectorParameterId:selector,applicableValues:['YES'],notApplicableValues:['NO'],quantityParameterIds:[quantity],errorCodeNamespace:'TEST_ENUM_COMPOSITION'};
function model(inclusion:Record<string,unknown>,policyOverride:Record<string,unknown>={}){
 const d=buildAutomaticConstructionOwnerR1({contract:'test-only-m212-and',semanticOwner:'test-only-m212-and',sourceId:'TEST_ONLY_NO_NORM',normId:'TEST_ONLY',sourceMetadata:{source_title:'TEST_ONLY_NO_NORM',source_document_version:'TEST_ONLY',definition_hash:'0'.repeat(64),artifact_sha256:'0'.repeat(64),exact_locator:'TEST_ONLY'},applicabilityRu:'Synthetic common-contract regression only',ordinary:[
  {id:volume,title:'Geometry',valueType:'decimal',unitId:'m3',min:0,kind:'ordinary'},
  {id:selector,title:'Method',valueType:'enum',unitId:null,values:['YES','NO'],kind:'ordinary'},
  {id:quantity,title:'Quantity',valueType:'decimal',unitId:'piece',min:0,kind:'ordinary'},
  {id:'test_unconsumed',title:'Unconsumed',valueType:'decimal',unitId:'piece',min:0,kind:'ordinary'},
 ],profile:[],conditional:[],rows:[{rowId:'test:enum-composition',formulaId:'test:enum-composition:formula',section:'Test',title:'Test',category:'equipment',unitId:'piece',expression:quantity+'+'+volume+'*0',inclusion:{kind:'greater_than',parameterId:volume,value:0},costTreatment:'INFORMATIONAL_SCOPE',procurement:false}],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[]});
 return{...d,parameters:d.parameters.map(p=>({...p,required:false,default_value:null})),resources:d.resources.map(r=>({...r,inclusion_ast:inclusion,resource_graph:{...r.resource_graph,conditionalEnumPositiveQuantityPolicyV1:{...policy,...policyOverride}}}))};
}
async function compile(inclusion:Record<string,unknown>,input:Record<string,unknown>,override:Record<string,unknown>={}){
 const d=model(inclusion,override);return compileCanonicalEstimateCore({operation:'compile',catalogId:'test-only:enum-and-m212',compilerVersion:'regression',primaryMeasureParameterId:volume,parameterDefinitions:d.parameters,formulaDefinitions:[...d.formulas],resourceDefinitions:d.resources,submittedParameters:input,confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:8,hashJson:async x=>hash(x)});
}
test('original top-level exactIN positive policy behavior unchanged',async()=>{
 const r=await compile(exact,{[volume]:10,[selector]:'YES',[quantity]:3});assert.equal(r.rows[0]?.quantity,'3');
 await assert.rejects(compile(exact,{[volume]:10,[selector]:'YES',[quantity]:0}),/positive quantity/);
 const off=await compile(exact,{[volume]:10,[selector]:'NO',[quantity]:0});assert.equal(off.rows.length,0);
 await assert.rejects(compile(exact,{[volume]:10,[selector]:'NO',[quantity]:3}),/cannot retain quantity/);
});
for(const operands of [[positive,exact],[exact,positive]])test('positive AND exactIN accepted in both orders '+operands[0].kind,async()=>{
 const r=await compile({kind:'and',operands},{[volume]:10,[selector]:'YES',[quantity]:3});assert.equal(r.rows[0]?.quantity,'3');
 for(const zero of [0,'0.0']){const r=await compile({kind:'and',operands},{[volume]:zero});assert.equal(r.rows.length,0);assert.equal(r.preliminaryNeeds.length,0);}
});
for(const ast of [
 {kind:'or',operands:[positive,exact]},
 {kind:'and',operands:[positive,{...exact,parameterId:'some_other_selector'}]},
 {kind:'and',operands:[positive,{...exact,values:['YES','NO']}]},
 {kind:'and',operands:[positive,{kind:'or',operands:[exact,{kind:'literal',value:false}]}]},
 {kind:'and',operands:[positive,exact,exact]},
])test('OR, foreign selector, wrongvalues, nestedOR and duplicateIN rejected '+JSON.stringify(ast),async()=>{
 await assert.rejects(compile(ast,{[volume]:10,[selector]:'YES',[quantity]:3}),/binding invalid/);
});
test('mappedquantity must be a declared formula input, unchanged underAND',async()=>{
 await assert.rejects(compile({kind:'and',operands:[positive,exact]},{[volume]:10,[selector]:'YES',[quantity]:3},{quantityParameterIds:['test_unconsumed']}),/binding invalid/);
});
const booleanLeaf={kind:'parameter',id:selector};
async function compileBoolean(inclusion:Record<string,unknown>,input:Record<string,unknown>,quantityIds=[quantity]){
 const d=model(inclusion);d.parameters=d.parameters.map(p=>p.parameter_id===selector?{...p,value_type:'boolean',constraints_json:{}}:p)as typeof d.parameters;
 for(const r of d.resources){const graph=r.resource_graph as Record<string,unknown>;delete graph.conditionalEnumPositiveQuantityPolicyV1;graph.conditionalPositiveQuantityPolicyV1={version:'canonical-conditional-positive-quantity:v1',applicabilityParameterId:selector,quantityParameterIds:quantityIds,errorCodeNamespace:'TEST_BOOLEAN_COMPOSITION'};}
 return compileCanonicalEstimateCore({operation:'compile',catalogId:'test-only:boolean-and-m212',compilerVersion:'regression',primaryMeasureParameterId:volume,parameterDefinitions:d.parameters,formulaDefinitions:[...d.formulas],resourceDefinitions:d.resources,submittedParameters:input,confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:8,hashJson:async x=>hash(x)});
}
test('original boolean exactparameter positive policy unchanged',async()=>{
 const r=await compileBoolean(booleanLeaf,{[volume]:10,[selector]:true,[quantity]:3});assert.equal(r.rows[0]?.quantity,'3');
 await assert.rejects(compileBoolean(booleanLeaf,{[volume]:10,[selector]:true,[quantity]:0}),/positive quantity/);
 assert.equal((await compileBoolean(booleanLeaf,{[volume]:10,[selector]:false,[quantity]:0})).rows.length,0);
 await assert.rejects(compileBoolean(booleanLeaf,{[volume]:10,[selector]:false,[quantity]:3}),/cannot retain quantity/);
});
for(const operands of[[positive,booleanLeaf],[booleanLeaf,positive]])test('boolean AND exactparameter accepted both orders '+operands[0].kind,async()=>{
 const ast={kind:'and',operands};assert.equal((await compileBoolean(ast,{[volume]:10,[selector]:true,[quantity]:3})).rows[0]?.quantity,'3');
 for(const zero of[0,'0.0']){const r=await compileBoolean(ast,{[volume]:zero});assert.equal(r.rows.length,0);assert.equal(r.preliminaryNeeds.length,0);}
});
for(const ast of[{kind:'or',operands:[positive,booleanLeaf]},{kind:'and',operands:[positive,{kind:'parameter',id:'foreign'}]},{kind:'and',operands:[positive,{kind:'not',operand:booleanLeaf}]},{kind:'and',operands:[positive,booleanLeaf,booleanLeaf]}])test('boolean OR/foreign/not/duplicate leaf rejected '+JSON.stringify(ast),async()=>{
 await assert.rejects(compileBoolean(ast,{[volume]:10,[selector]:true,[quantity]:3}),/binding invalid/);
});
test('boolean AND mappedquantity still requires real formula input',async()=>{
 await assert.rejects(compileBoolean({kind:'and',operands:[positive,booleanLeaf]},{[volume]:10,[selector]:true,[quantity]:3},['test_unconsumed']),/binding invalid/);
});
