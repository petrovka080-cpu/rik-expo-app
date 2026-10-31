import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from './canonicalEstimateCompileCore';
import {resolveCanonicalScopeRequirementV1} from './canonicalScopeRequirementV1';
import {compileFormulaGraph} from './formulaGraph';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
const yes={kind:'literal',value:true};
function fixture(optIn=true,cover='own'):CanonicalEstimateCompileCoreInput{
 const f=compileFormulaGraph('q'),missing=compileFormulaGraph('scope_check');
 const scope={contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:'stage',groupTitleRu:'Контроль этапа',titleRu:'Контроль обязательного ресурса',reasonRu:'Тестовый контракт обеспечения ресурса',
  exactScopeWhen:yes,sourceEvidence:[{sha256:'a'.repeat(64),locator:'Test fixture only'}],coveringRowIds:[cover],originalRowIds:[],...(optIn?{costExclusionBreaksScopeV1:true}:{})};
 return{operation:'recalculate',compilerVersion:'scope-cost-exclusion-fixture',catalogId:'fixture',primaryMeasureParameterId:'q',currencyCode:'KGS',maximumResourceRows:5,hashJson:estimateDeterministicHash,
  parameterDefinitions:[{parameter_id:'q',value_type:'decimal',unit_id:'m2',required:true,default_value:null,constraints_json:{min:0}},
   {parameter_id:'scope_check',value_type:'decimal',unit_id:'item',required:false,default_value:null,constraints_json:{},truth_metadata:{visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}}],
  submittedParameters:{q:'20'},confirmedParameters:{},formulaDefinitions:[{formula_id:'q',ast:f.ast,input_parameter_ids:f.inputParameterIds,ast_sha256:'fixture-q'},{formula_id:'check',ast:missing.ast,input_parameter_ids:missing.inputParameterIds,ast_sha256:'fixture-check'}],
  resourceDefinitions:[...['own','included','information','member'].map((id,ordinal)=>({id,row_id:id,ordinal,title_ru:id,section:'test',category:'work',unit_id:'m2',formula_id:'q',procurement_eligible:false,cost_owner_id:id,inclusion_ast:yes,source_metadata:null,row_sha256:'fixture-'+id,
   resource_graph:{costTreatment:id==='included'?'INCLUDED_IN_RESOURCE_ROWS':id==='information'?'INFORMATIONAL_SCOPE':'OWN_COST',...(id==='included'?{includedInResourceOwnerRowId:'own',parentCostOwnerId:'own'}:{})}})),
   {id:'check',row_id:'check',ordinal:4,title_ru:'check',section:'test',category:'work',unit_id:'item',formula_id:'check',procurement_eligible:false,cost_owner_id:'check',inclusion_ast:yes,source_metadata:null,row_sha256:'fixture-check',resource_graph:{costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementV1:scope}}]};
}
const decision=(r:Awaited<ReturnType<typeof compileCanonicalEstimateCore>>)=>(r.preliminaryNeeds.find(n=>n.row_id==='check')!.calculation_trace as {resourceGraph:{scopeRequirementDecisionV1:{status:string}}}).resourceGraph.scopeRequirementDecisionV1;
test('ordinary financial-only exclusion preserves quantities and manual price while opening opt-in completeness',async()=>{
 const input=fixture();input.rowOverrides={own:{unitPrice:'125',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}}};
 const r=await compileCanonicalEstimateCore(input),row=r.rows.find(r=>r.row_id==='own')!;expect(row).toMatchObject({quantity:'20',unit_price:'125',amount:'2500',included_in_estimate:false});
 expect(r.compositionSelectionV1).toBeUndefined();expect(decision(r).status).toBe('REQUIRED_RESOURCE_EXCLUDED');
 input.rowOverrides.own!.includedInEstimate=true;const restored=await compileCanonicalEstimateCore(input);expect(decision(restored).status).toBe('INCLUDED');expect(restored.rows.find(r=>r.row_id==='own')!.unit_price).toBe('125');
});
test('existing definitions without opt-in keep their previous completeness',async()=>{
 const input=fixture(false);input.rowOverrides={own:{includedInEstimate:false,provenance:{kind:'manual'}}};expect(decision(await compileCanonicalEstimateCore(input)).status).toBe('INCLUDED');
});
test.each(['missing-price','zero-price','procurement-only','zero-quantity'])('does not invent a financial refusal: %s',async kind=>{
 const input=fixture();if(kind==='zero-price')input.rowOverrides={own:{unitPrice:'0',provenance:{kind:'manual'}}};
 if(kind==='procurement-only')input.rowOverrides={own:{includedInProcurement:false,provenance:{kind:'manual'}}};if(kind==='zero-quantity')input.submittedParameters.q='0';
 expect(decision(await compileCanonicalEstimateCore(input)).status).toBe('INCLUDED');
});
test.each(['included','information'])('nonpayable component remains correctly included: %s',async id=>{
 const input=fixture(true,id);input.rowOverrides={[id]:{includedInEstimate:false,provenance:{kind:'manual'}}};expect(decision(await compileCanonicalEstimateCore(input)).status).toBe('INCLUDED');
});
test('commercial coverage is resolved before classifying an own-cost refusal',async()=>{
 const input=fixture(true,'member');input.resourceDefinitions[0]!.resource_graph.commercialCostCoverageV1={contractVersion:'canonical-commercial-cost-coverage/v1',scopeId:'test-commercial',scopeRu:'Тестовая полная стоимость',sourceReference:'Fixture only',priceScope:'LABOR_ONLY',when:yes,rateBasis:{kind:'PER_MEASURE',parameterId:'q',unitId:'m2'},members:[{rowId:'member',unitId:'m2'}]};
 input.rowOverrides={member:{includedInEstimate:false,provenance:{kind:'manual'}}};const r=await compileCanonicalEstimateCore(input);expect(decision(r).status).toBe('INCLUDED');
 expect((r.rows.find(r=>r.row_id==='member')!.calculation_trace as {resourceGraph:{costTreatment:string}}).resourceGraph.costTreatment).toBe('INCLUDED_IN_RESOURCE_ROWS');
 input.rowOverrides.own={includedInEstimate:false,provenance:{kind:'manual'}};await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({code:'COMMERCIAL_COST_COVERAGE_CONFLICT'});
});
test.each(['false','wrong-kind','no-covering-resource'])('invalid opt-in cannot silently relax scope integrity: %s',kind=>{
 const graph=fixture().resourceDefinitions.at(-1)!.resource_graph,scope=graph.scopeRequirementV1 as Record<string,unknown>;
 if(kind==='false')scope.costExclusionBreaksScopeV1=false;if(kind==='wrong-kind')scope.kind='PROJECT_SCOPE';if(kind==='no-covering-resource')scope.coveringRowIds=[];
 expect(()=>resolveCanonicalScopeRequirementV1({graph,rowId:'check',parameters:{q:20},parameterIds:new Set(['q','scope_check']),resourceIds:new Set(['check','own']),knownQuantityRowIds:new Set(['own'])})).toThrow('scope requirement identity invalid');
});

function semanticFixture(kind='INCLUDED'):CanonicalEstimateCompileCoreInput {
 const input=fixture(kind==='INCLUDED');
 input.parameterDefinitions[1]!.truth_metadata={visibility_role:'INTERNAL_ONLY',value_source_role:'COMPILER_DERIVED_RESOURCE_QUANTITY'};
 const graph=input.resourceDefinitions[4]!.resource_graph;
 graph.scopeRequirementV1={...(graph.scopeRequirementV1 as Record<string,unknown>),kind};
 return input;
}

test.each(['INCLUDED','NOT_APPLICABLE','PROCESS'])('semantic %s retains a null-quantity ledger without asking for its internal carrier',async kind=>{
 const result=await compileCanonicalEstimateCore(semanticFixture(kind));
 const note=result.preliminaryNeeds.find(n=>n.row_id==='check')!;
 expect(note).toMatchObject({quantity:null,need_state:'CONDITION_REQUIRED',missing_parameter_ids:[],selected:false,procurement_eligible:false});
 expect(decision(result).status).toBe(kind==='PROCESS'?'PROCESS_REQUIRED':kind);
 expect((note.calculation_trace as {inputParameterIds:string[]}).inputParameterIds).toEqual(['scope_check']);
 expect(result.rows.find(r=>r.row_id==='own')!.quantity).toBe('20');
});

test('missing real numeric facts are not removed by included payment or internal-looking formula names',async()=>{
 const input=semanticFixture();input.parameterDefinitions[1]!.truth_metadata={visibility_role:'ORDINARY',value_source_role:'USER_MEASURED'};
 const note=(await compileCanonicalEstimateCore(input)).preliminaryNeeds.find(n=>n.row_id==='check')!;
 expect(note).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED',missing_parameter_ids:['scope_check']});
});

test('closed informational scope does not erase an unresolved application norm',async()=>{
 const note=(await compileCanonicalEstimateCore(fixture())).preliminaryNeeds.find(n=>n.row_id==='check')!;
 expect(note.missing_parameter_ids).toContain('scope_check');
});

test('open access and excluded physical coverage remain explicit conditions',async()=>{
 const open=await compileCanonicalEstimateCore(semanticFixture('PROJECT_SCOPE'));
 expect(decision(open).status).toBe('PROJECT_SCOPE_OPEN');
 expect(open.preliminaryNeeds.find(n=>n.row_id==='check')!.need_state).toBe('CONDITION_REQUIRED');
 const input=semanticFixture();input.rowOverrides={own:{includedInEstimate:false,provenance:{kind:'manual'}}};
 const excluded=await compileCanonicalEstimateCore(input);
 expect(decision(excluded).status).toBe('REQUIRED_RESOURCE_EXCLUDED');
 expect(excluded.preliminaryNeeds.find(n=>n.row_id==='check')!.need_state).toBe('CONDITION_REQUIRED');
});

test('completed scope retains its ledger while a required object fact still opens a separate condition',async()=>{
 const completed=semanticFixture('PROCESS');
 const graph=completed.resourceDefinitions[4]!.resource_graph;
 graph.scopeRequirementV1={...(graph.scopeRequirementV1 as Record<string,unknown>),satisfiedWhen:yes};
 const result=await compileCanonicalEstimateCore(completed);
 expect(decision(result).status).toBe('COMPLETED');
 expect(result.preliminaryNeeds.find(n=>n.row_id==='check')!).toMatchObject({quantity:null,missing_parameter_ids:[]});
 const input=semanticFixture();
 input.parameterDefinitions.push({parameter_id:'site_acceptance',value_type:'string',required:false,default_value:null,constraints_json:{}});
 const source=input.resourceDefinitions[4]!.resource_graph;
 source.scopeRequirementV1={...(source.scopeRequirementV1 as Record<string,unknown>),requiredFactParameterIds:['site_acceptance']};
 const open=await compileCanonicalEstimateCore(input);
 expect(decision(open).status).toBe('OBJECT_FACT_REQUIRED');
 expect(open.preliminaryNeeds.find(n=>n.row_id==='check')!).toMatchObject({quantity:null,need_state:'CONDITION_REQUIRED',missing_parameter_ids:['site_acceptance']});
});
