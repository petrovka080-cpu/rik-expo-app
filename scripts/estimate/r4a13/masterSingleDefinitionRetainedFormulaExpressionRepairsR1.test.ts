import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {masterRetainParentBindingsOptInR1,masterRetainedParentCaptureSha256R1,
 assertMasterRetainedParentComputationR1,type MasterRetainedBindingGuardInputR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateMasterFormulaGraphConsistency} from './prepareMasterSingleDefinitionSuccessorR1';

type Json=Record<string,any>;
const copy=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const bytes=readFileSync('data/estimate-benchmarks/fixtures/stairs-doka-standard-full-retention-read-r2.json');
const raw=JSON.parse(bytes.toString('utf8'));
const rows=(name:string):Json[]=>raw.sets[name].rawRows.map((r:string)=>JSON.parse(r));
const id='concrete_order_quantity_v1';
const corrected='stairs_concrete_volume_m3 * (1 + placement_selected_contingency_percent / 100)';
function setup(){
 const c={definition:rows('fullDefinitionRows')[0]!,baseline:rows('fullBaselineRows')[0]!,parameters:rows('fullParameterRows'),
  formulas:rows('fullFormulaRows'),resources:rows('fullResourceRows'),bindings:rows('fullPhysicalBindingRows'),
  normativeSources:rows('fullNormativeSourceRows'),normativeLocators:rows('fullNormativeLocatorRows')};
 const old=c.formulas.find(f=>f.formula_id===id)!;
 const opt:any={capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),newParameterSources:{},
  formulaExpressionRepairs:{[id]:{capturedExpressionSource:old.expression_source,correctedExpressionSource:corrected}}};
 const input:MasterRetainedBindingGuardInputR1={config:{stopCode:'FORMULA_TEXT_TEST',catalogId:c.definition.catalog_id,
  parentReleaseId:'d3bc6c1a-e16d-5fcc-b36c-cc584a31c529',binding:{retainParentBindings:opt}},
  newSource:{id:'10000000-0000-5000-8000-000000000001',source_key:'CONTROL_ONLY_NEW_SOURCE',title_ru:'Test only',authority:'Test',
   official_url:null,artifact_sha256:null,effective_from:null,effective_to:null,metadata:{testOnly:true}},
  newLocators:[{id:'10000000-0000-5000-8000-000000000002',source_id:'10000000-0000-5000-8000-000000000001',
   locator_key:'CONTROL_ONLY',locator:{testOnly:true},excerpt_sha256:'a'.repeat(64)}]};
 const next={parameters:copy(c.parameters),formulas:c.formulas.map(f=>f.formula_id===id?{...copy(f),expression_source:corrected}:copy(f)),resources:copy(c.resources)};
 return {input,opt,c,old,next};
}
it('reproduces actual immutable legacy expression mismatch and corrects only successor text under the strict Master gate',()=>{
 expect(createHash('sha256').update(bytes).digest('hex')).toBe('9951b6c5d3ef3b67e158567b25d2266aff20526fd19b2d45d2429ef34959e5b4');
 const s=setup(),before=copy(s.c);
 expect(validateMasterFormulaGraphConsistency(s.c.formulas)).toEqual([id+':AST_EXPRESSION_DRIFT',id+':INPUT_PARAMETER_DRIFT']);
 expect(validateMasterFormulaGraphConsistency(s.next.formulas)).toEqual([]);
 expect(masterRetainParentBindingsOptInR1(s.input)).toBe(s.opt);
 assertMasterRetainedParentComputationR1(s.input,s.next,'REPRESENTATIVE');
 expect(s.c).toEqual(before);
 const now=s.next.formulas.find(f=>f.formula_id===id)!;
 expect({...now,expression_source:s.old.expression_source}).toEqual(s.old);
});
it('permits only ordinary new definition FK/timestamp differences in the clone plan',()=>{
 const s=setup();s.next.formulas=s.next.formulas.map(f=>({...f,definition_version_id:'successor',created_at:'new'}));
 assertMasterRetainedParentComputationR1(s.input,s.next,'PLAN');
});
it('omission preserves exact old behavior and rejects an undeclared expression change',()=>{
 const s=setup();delete s.opt.formulaExpressionRepairs;
 assertMasterRetainedParentComputationR1(s.input,{...s.next,formulas:copy(s.c.formulas)},'REPRESENTATIVE');
 expect(()=>assertMasterRetainedParentComputationR1(s.input,s.next,'REPRESENTATIVE')).toThrow('OLD_FORMULA_SEMANTICS_DRIFT');
});
test.each([['null',null],['undefined',undefined],['array',[]],['empty',{}]])('present invalid map %s fails',(_name,value)=>{
 const s=setup();s.opt.formulaExpressionRepairs=value;expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow('FORMULA_EXPRESSION_REPAIR_MAP');
});
const bad:Array<[string,(s:ReturnType<typeof setup>)=>void,string]>=[
 ['foreign formula',s=>{s.opt.formulaExpressionRepairs.foreign=s.opt.formulaExpressionRepairs[id];delete s.opt.formulaExpressionRepairs[id];},'DECLARATION'],
 ['stale original text',s=>s.opt.formulaExpressionRepairs[id].capturedExpressionSource='77','DECLARATION'],
 ['extra option',s=>s.opt.formulaExpressionRepairs[id].skipValidation=true,'DECLARATION'],
 ['unchanged text',s=>s.opt.formulaExpressionRepairs[id].correctedExpressionSource=s.old.expression_source,'DECLARATION'],
 ['empty expression',s=>s.opt.formulaExpressionRepairs[id].correctedExpressionSource=' ','DECLARATION'],
 ['oversized expression',s=>s.opt.formulaExpressionRepairs[id].correctedExpressionSource='1'.repeat(16385),'DECLARATION'],
 ['different arithmetic',s=>s.opt.formulaExpressionRepairs[id].correctedExpressionSource='stairs_concrete_volume_m3 * 77','SEMANTICS'],
 ['different parameter',s=>s.opt.formulaExpressionRepairs[id].correctedExpressionSource=s.old.expression_source+' + 0','SEMANTICS'],
 ['invalid syntax',s=>s.opt.formulaExpressionRepairs[id].correctedExpressionSource='a + (','COMPILE'],
 ['bad old AST hash',s=>s.old.ast_sha256='0'.repeat(64),'OLD_WITNESS'],
 ['duplicate old input',s=>s.old.input_parameter_ids.push(s.old.input_parameter_ids[0]),'OLD_WITNESS'],
 ['unknown old input',s=>s.old.input_parameter_ids.push('foreign'),'OLD_WITNESS'],
 ['uncompilable original',s=>{s.old.expression_source='a + (';s.opt.formulaExpressionRepairs[id].capturedExpressionSource=s.old.expression_source;},'OLD_COMPILE'],
 ['already consistent original',s=>{s.old.expression_source=corrected;s.opt.formulaExpressionRepairs[id]={capturedExpressionSource:corrected,correctedExpressionSource:'('+corrected+')'};},'UNNECESSARY'],
];
test.each(bad)('rejects %s',(_name,change,code)=>{
 const s=setup();change(s);s.opt.capturedParentSha256=masterRetainedParentCaptureSha256R1(s.c);
 expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow('FORMULA_EXPRESSION_REPAIR_'+code);
});
const drift:Array<[string,(f:Json)=>void]>=[
 ['AST',f=>f.ast={kind:'literal',value:'77'}],['inputs',f=>f.input_parameter_ids=[]],['unit',f=>f.output_unit_id='kg'],
 ['hash',f=>f.ast_sha256='0'.repeat(64)],['expression',f=>f.expression_source='77'],['extra field',f=>f.extra=true],
 ['other formula expression',()=>{}],
];
test.each(drift)('rejects successor %s drift in representative and plan',(_name,change)=>{
 const s=setup();if(_name==='other formula expression')s.next.formulas.find(f=>f.formula_id!==id)!.expression_source='77';
 else change(s.next.formulas.find(f=>f.formula_id===id)!);
 for(const phase of ['REPRESENTATIVE','PLAN']as const)expect(()=>assertMasterRetainedParentComputationR1(s.input,s.next,phase)).toThrow('OLD_FORMULA_SEMANTICS_DRIFT');
});
