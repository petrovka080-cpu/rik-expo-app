import assert from 'node:assert/strict';
// Use the project's existing Jest registration; keep the eight direct-core
// source-author regressions and their assertions unchanged.
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from './canonicalEstimateCompileCore';
import {assertCanonicalSubmittedSourceParameterAuthorityV1} from './parameterConstraints';
import {compileFormulaGraph} from './formulaGraph';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

function input():CanonicalEstimateCompileCoreInput{
 const formula=compileFormulaGraph('source_quantity*2');
 return{operation:'compile',compilerVersion:'TEST_ONLY_READONLY_SOURCE_FORMULA',catalogId:'TEST_ONLY_READONLY_SOURCE_FORMULA',primaryMeasureParameterId:'source_quantity',parameterDefinitions:[
  {parameter_id:'area',value_type:'decimal',unit_id:'m2',required:true,default_value:null,constraints_json:{min:0},truth_metadata:{visibility_role:'USER_INPUT',value_source_role:'USER_MEASURED',provenance:{consumer_input_role_v1:'OBJECT_FACT'}}},
  {parameter_id:'source_quantity',value_type:'decimal',unit_id:'piece',required:false,default_value:null,constraints_json:{min:0},truth_metadata:{visibility_role:'INTERNAL_ONLY',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',runtime_profile_classification:'PRELIMINARY_SOURCE_FORMULA',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},guide:{source_document:'TEST_ONLY immutable producer declaration',source_locator:'TEST_ONLY source formula area*3',source_snapshot_hash:'a'.repeat(64)},preliminary_value_formula_v1:{version:'canonical-preliminary-parameter-formula:v1',expression:'area*3',when:{kind:'greater_than',parameterId:'area',value:0},explicitValuePolicy:'REQUIRE_MATCH'}}}
 ],formulaDefinitions:[{formula_id:'use-source',output_unit_id:'piece',ast:formula.ast,input_parameter_ids:formula.inputParameterIds,ast_sha256:hash(formula.ast)}],resourceDefinitions:[{id:'test-only-source',row_id:'test:source-formula',ordinal:0,section:'Контрольный состав',category:'equipment',title_ru:'Контрольный ресурс',unit_id:'piece',formula_id:'use-source',inclusion_ast:{kind:'literal',value:true},resource_graph:{costTreatment:'INFORMATIONAL_SCOPE'},cost_owner_id:null,procurement_eligible:false,source_metadata:{testOnly:true},row_sha256:'test-only'}],submittedParameters:{area:'2'},confirmedParameters:{},priceItems:[],currencyCode:'USD',maximumResourceRows:1,hashJson:hash};
}

test('direct existing core rejects own raw readonly formula keys on compile and recalculate, including equal and empty',async()=>{
 for(const operation of ['compile','recalculate'] as const)for(const value of ['6','99',null,undefined])await assert.rejects(()=>compileCanonicalEstimateCore({...input(),operation,submittedParameters:{area:'2',source_quantity:value}}),{code:'PARAMETER_VALIDATION_FAILED',message:'source-managed parameter cannot be submitted source_quantity'});
});

test('automatic source formula still follows real geometry without a raw computed field',async()=>{
 const a=await compileCanonicalEstimateCore(input()),b=await compileCanonicalEstimateCore({...input(),operation:'recalculate',submittedParameters:{area:'5'}});
 assert.equal(a.parameters.source_quantity,'6');assert.equal(a.rows[0]?.quantity,'12');assert.equal(b.parameters.source_quantity,'15');assert.equal(b.rows[0]?.quantity,'30');assert.equal(a.rows[0]?.included_in_estimate,false);assert.equal(a.rows[0]?.included_in_procurement,false);
});

test('missing source dependencies remain preliminary and do not become zero',async()=>{
 const result=await compileCanonicalEstimateCore({...input(),submittedParameters:{}});assert.equal(result.rows.length,0);assert.equal(result.preliminaryNeeds.length,1);assert.equal(result.preliminaryNeeds[0]?.quantity,null);assert(result.preliminaryNeeds[0]?.missing_parameter_ids.includes('area'));assert(!Object.hasOwn(result.parameters,'source_quantity'));
});

test('visible replaceable legacy profile retains explicit overrides and existing require-match semantics',async()=>{
 const visible=input();visible.parameterDefinitions[1]!.truth_metadata!.visibility_role='USER_INPUT';
 assert.equal((await compileCanonicalEstimateCore({...visible,submittedParameters:{area:'2',source_quantity:'6'}})).rows[0]?.quantity,'12');
 await assert.rejects(()=>compileCanonicalEstimateCore({...visible,submittedParameters:{area:'2',source_quantity:'7'}}),{code:'PROJECT_GEOMETRY_PARAMETER_CONFLICT'});
 const policy=visible.parameterDefinitions[1]!.truth_metadata!.preliminary_value_formula_v1 as Record<string,unknown>;delete policy.explicitValuePolicy;
 assert.equal((await compileCanonicalEstimateCore({...visible,submittedParameters:{area:'2',source_quantity:'7'}})).rows[0]?.quantity,'14');
});

test('a hidden historical object-owned field is not silently changed to application authority',async()=>{
 const legacy=input();legacy.parameterDefinitions[1]!.truth_metadata!.provenance={consumer_input_role_v1:'OBJECT_FACT'};
 const result=await compileCanonicalEstimateCore({...legacy,submittedParameters:{area:'2',source_quantity:'6'}});assert.equal(result.rows[0]?.quantity,'12');
});

test('producer proof is required instead of merely blocking the whole replaceable role or classification',async()=>{
 const legacy=input();delete legacy.parameterDefinitions[1]!.truth_metadata!.preliminary_value_formula_v1;
 const result=await compileCanonicalEstimateCore({...legacy,submittedParameters:{area:'2',source_quantity:'7'}});assert.equal(result.rows[0]?.quantity,'14');
 const invalid=input();delete (invalid.parameterDefinitions[1]!.truth_metadata!.guide as Record<string,unknown>).source_snapshot_hash;
 assert.doesNotThrow(()=>assertCanonicalSubmittedSourceParameterAuthorityV1(invalid.parameterDefinitions,{source_quantity:'6'}));
 await assert.rejects(()=>compileCanonicalEstimateCore({...invalid,submittedParameters:{area:'2',source_quantity:'6'}}),{code:'DEFINITION_INTEGRITY_FAILED'});
});

test('an exact branched producer has the same submitted authority while the normal resolver owns branch arithmetic',async()=>{
 const branched=input();branched.parameterDefinitions[1]!.truth_metadata!.preliminary_value_formula_v1={version:'canonical-preliminary-parameter-formula:v1',branches:[{expression:'area*3',when:{kind:'greater_than',parameterId:'area',value:0},explicitValuePolicy:'REQUIRE_MATCH'}]};
 assert.equal((await compileCanonicalEstimateCore(branched)).rows[0]?.quantity,'12');
 for(const value of ['6',null,undefined])await assert.rejects(()=>compileCanonicalEstimateCore({...branched,submittedParameters:{area:'2',source_quantity:value}}),{code:'PARAMETER_VALIDATION_FAILED'});
});

test('trusted channel and formula conflicts retain their old validation rather than being treated as a bypass',async()=>{
 assert.equal((await compileCanonicalEstimateCore({...input(),confirmedParameters:{source_quantity:'6'}})).rows[0]?.quantity,'12');
 await assert.rejects(()=>compileCanonicalEstimateCore({...input(),confirmedParameters:{source_quantity:'7'}}),{code:'PROJECT_GEOMETRY_PARAMETER_CONFLICT'});
});
