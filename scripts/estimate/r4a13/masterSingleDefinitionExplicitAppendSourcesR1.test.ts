import {assembleMasterExplicitParameterSourcesR1 as assemble} from './masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterAppendExplicitParameterSourcesR1 as appendSources,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import {pavingCut70ConditionalConsumerDefinitionR1 as paving} from '../../../src/lib/estimate/v4/pavingCut70ConditionalAppendConsumerR1';
import {pavingCutStationary70QuantityPackR1 as pack} from '../../../src/lib/estimate/v4/pavingCutStationary70QuantityR1';
import {buildAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
type Json=Record<string,any>;
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
const next=()=>{const d=paving();return {parameters:[...d.parameters],formulas:[...d.formulas],resources:[...d.resources]};};
const precise=()=>Object.fromEntries(next().parameters.map(p=>[p.parameter_id,
 p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[pack.sourceKeyProposal]}]));
const config=(value:unknown):Pick<Config,'stopCode'|'sourceId'|'catalogAppend'>=>({stopCode:'SOURCE_MAP_TEST',sourceId:pack.sourceKeyProposal,
 catalogAppend:{explicitParameterSources:value}} as unknown as Pick<Config,'stopCode'|'sourceId'|'catalogAppend'>);
const sourceInput=()=>({errorPrefix:'STOP_SOURCE_MAP_TEST_RETAIN_',parameters:next().parameters,newParameterSources:precise(),sourceClosure:[pack.sourceKeyProposal],oldResourceRowIds:[],next:next()});

it('paving append assigns exactly6facts to its emitted source and6UNRESOLVED slots to[] without runtime defaults',()=>{
 const n=next(),map=precise(),before=JSON.stringify({n,map}),result=appendSources(config(map),n)!;
 expect(Object.keys(result)).toEqual(n.parameters.map(p=>p.parameter_id));expect(Object.keys(result)).toHaveLength(12);
 const known=n.parameters.filter(p=>p.truth_metadata.value_source_role!=='UNRESOLVED_APPLICATION_NORM');
 const unresolved=n.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM');
 expect(known).toHaveLength(6);expect(unresolved).toHaveLength(6);
 for(const p of known)expect(result[p.parameter_id]).toEqual([pack.sourceKeyProposal]);
 for(const p of unresolved)expect(result[p.parameter_id]).toEqual([]);
 expect(n.parameters.every(p=>p.default_value===null)).toBe(true);expect(JSON.stringify({n,map})).toBe(before);
 result[known[0]!.parameter_id].push('TEST_ONLY mutation');expect(map[known[0]!.parameter_id]!.sourceIds).toEqual([pack.sourceKeyProposal]);
});
it('omitted property or absent append returns null, preserving the exact old baseline fallback and hash input shape',()=>{
 const n=next(),c={stopCode:'TEST',sourceId:pack.sourceKeyProposal,catalogAppend:{}} as unknown as Pick<Config,'stopCode'|'sourceId'|'catalogAppend'>;
 const before=JSON.stringify(c);expect(appendSources(c,n)).toBeNull();expect(JSON.stringify(c)).toBe(before);
 expect(appendSources({stopCode:'TEST',sourceId:pack.sourceKeyProposal,catalogAppend:undefined},n)).toBeNull();
});
const malformed:[string,unknown,string][]=[['undefined',undefined,'NEW_PARAMETER_SOURCE_MAP_REQUIRED'],['null',null,'NEW_PARAMETER_SOURCE_MAP_REQUIRED'],
 ['array',[],'NEW_PARAMETER_SOURCE_MAP_REQUIRED'],['missing all keys',{},'NEW_PARAMETER_SOURCE_EXACT_KEYS']];
it.each(malformed)('present %s never falls back to all-source shortcut',(_label,value,code)=>{
 expect(()=>appendSources(config(value),next())).toThrow('STOP_SOURCE_MAP_TEST_APPEND_'+code);
});
const invalidMaps:[string,(v:Json)=>void,string][]=[
 ['missing one parameter',v=>{delete v.actual_paving_cut_length_m;},'NEW_PARAMETER_SOURCE_EXACT_KEYS'],
 ['extra unknown key',v=>{v.not_a_parameter={kind:'KNOWN',sourceIds:[pack.sourceKeyProposal]};},'NEW_PARAMETER_SOURCE_EXACT_KEYS'],
 ['unknown source key',v=>{v.actual_paving_cut_length_m.sourceIds=['unapproved-source'];},'NEW_PARAMETER_SOURCE_VALUE'],
 ['duplicated source key',v=>{v.actual_paving_cut_length_m.sourceIds=[pack.sourceKeyProposal,pack.sourceKeyProposal];},'NEW_PARAMETER_SOURCE_VALUE'],
 ['not an array',v=>{v.actual_paving_cut_length_m.sourceIds=pack.sourceKeyProposal;},'NEW_PARAMETER_SOURCE_VALUE'],
 ['null entry',v=>{v.actual_paving_cut_length_m=null;},'NEW_PARAMETER_SOURCE_VALUE'],
 ['unknown kind',v=>{v.actual_paving_cut_length_m.kind='MANUAL';},'NEW_PARAMETER_SOURCE_VALUE'],
 ['known without source',v=>{v.actual_paving_cut_length_m.sourceIds=[];},'NEW_KNOWN_SOURCE_REQUIRED'],
 ['known falsely labelled unresolved',v=>{v.actual_paving_cut_length_m={kind:'UNRESOLVED',sourceIds:[]};},'NEW_UNRESOLVED_KIND_MISMATCH'],
 ['known falsely labelled derived',v=>{v.actual_paving_cut_length_m.kind='DERIVED';},'NEW_DERIVED_KIND_MISMATCH'],
 ['unresolved falsely labelled known',v=>{const id=Object.keys(v).find(k=>k.startsWith('paving_cut70_application_need_'))!;v[id]={kind:'KNOWN',sourceIds:[pack.sourceKeyProposal]};},'NEW_UNRESOLVED_KIND_MISMATCH'],
 ['unresolved cites normative source',v=>{const id=Object.keys(v).find(k=>k.startsWith('paving_cut70_application_need_'))!;v[id].sourceIds=[pack.sourceKeyProposal];},'NEW_UNRESOLVED_SOURCE_FORBIDDEN'],
];
it.each(invalidMaps)('rejects %s in append and preserves retained error suffix',(_label,change,code)=>{
 const map=clone(precise());change(map);expect(()=>appendSources(config(map),next())).toThrow('STOP_SOURCE_MAP_TEST_APPEND_'+code);
 expect(()=>assemble({...sourceInput(),newParameterSources:map})).toThrow('STOP_SOURCE_MAP_TEST_RETAIN_'+code);
});
it('keeps emitted-source-only append closure while retained callers may cite their already verified old+new closure',()=>{
 const n=next(),map=precise();map.actual_paving_cut_length_m!.sourceIds=['old-captured-source'];
 expect(()=>appendSources(config(map),n)).toThrow('NEW_PARAMETER_SOURCE_VALUE');
 const result=assemble({...sourceInput(),newParameterSources:map,sourceClosure:[pack.sourceKeyProposal,'old-captured-source']});
 expect(result.actual_paving_cut_length_m).toEqual(['old-captured-source']);
});
it('rejects a new parameter with missing truth role instead of inventing a source kind',()=>{
 const n=next();n.parameters[0]!.truth_metadata={};expect(()=>appendSources(config(precise()),n)).toThrow('NEW_PARAMETER_TRUTH_ROLE_REQUIRED');
});
function reciprocal(){
 // TEST_ONLY compiler-control integrity fixture; not an external quantity norm or a catalog proposal.
 const d=buildAutomaticConstructionOwnerR1({contract:'TEST_ONLY_EXPLICIT_SOURCE_MAP',semanticOwner:'test-only:map',sourceId:pack.sourceKeyProposal,normId:pack.normId,
  sourceMetadata:{source_title:'TEST_ONLY reciprocal control',source_document_version:'TEST_ONLY',definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:'TEST_ONLY no external norm'},
  applicabilityRu:'TEST_ONLY integrity fixture',ordinary:[{id:'test_count',title:'TEST_ONLY project count',valueType:'decimal',unitId:'piece',kind:'ordinary',min:0}],profile:[],conditional:[],
  rows:[{rowId:'test-only:new-owner',formulaId:'test-only:new-formula',section:'TEST_ONLY',category:'material',title:'TEST_ONLY output owner',unitId:'piece',expression:'test_count',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:'test_effective',unitId:'piece'}}],excludedUnownedAssumptions:[]});
 const n={parameters:clone([...d.parameters]) as Json[],formulas:clone([...d.formulas]) as Json[],resources:clone([...d.resources]) as Json[]};
 const map={test_count:{kind:'KNOWN',sourceIds:[pack.sourceKeyProposal]},test_effective:{kind:'DERIVED',sourceIds:[]}};
 return {n,map};
}
it('admits empty DERIVED[] only for a reciprocal compiler-effective output without a fake external source',()=>{
 const {n,map}=reciprocal(),result=appendSources(config(map),n)!;expect(result).toEqual({test_count:[pack.sourceKeyProposal],test_effective:[]});
});
const invalidDerived:[string,(s:ReturnType<typeof reciprocal>)=>void][]=[
 ['missing owner output',s=>{delete s.n.resources[0]!.resource_graph.effectiveQuantityOutputV1;}],
 ['invented role',s=>{s.n.parameters[1]!.truth_metadata.value_source_role='DERIVED_ASSUMPTION';}],
 ['not internal',s=>{s.n.parameters[1]!.truth_metadata.visibility_role='USER_INPUT';}],
 ['hidden default',s=>{s.n.parameters[1]!.default_value=1;}],
 ['required input',s=>{s.n.parameters[1]!.required=true;}],
 ['wrong value type',s=>{s.n.parameters[1]!.value_type='text';}],
 ['different unit',s=>{s.n.parameters[1]!.unit_id='m';}],
 ['different formula unit',s=>{s.n.formulas[0]!.output_unit_id='m';}],
 ['wrong reciprocal owner',s=>{s.n.parameters[1]!.truth_metadata.effective_resource_quantity_v1.sourceRowId='missing-owner';}],
 ['unexpected metadata key',s=>{s.n.parameters[1]!.truth_metadata.effective_resource_quantity_v1.extra=true;}],
 ['duplicate effective output',s=>{s.n.resources.push({...clone(s.n.resources[0]!),row_id:'test-only:second-owner'});}],
];
it.each(invalidDerived)('rejects empty derived with %s via the existing canonical integrity validator',(_label,mutate)=>{
 const s=reciprocal();mutate(s);expect(()=>appendSources(config(s.map),s.n)).toThrow('EMPTY_DERIVED_CONTROL_INVALID');
});
it('retained plan validation still forbids claiming an old owner as a new empty-derived control',()=>{
 const {n,map}=reciprocal();expect(()=>assemble({errorPrefix:'STOP_SOURCE_MAP_TEST_RETAIN_',parameters:n.parameters,newParameterSources:map,
  sourceClosure:[pack.sourceKeyProposal],oldResourceRowIds:['test-only:new-owner'],next:n})).toThrow('STOP_SOURCE_MAP_TEST_RETAIN_EMPTY_DERIVED_CONTROL_INVALID');
});
