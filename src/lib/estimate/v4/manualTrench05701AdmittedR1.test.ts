// Prospective36 cases NOT_RUN by author. TEST_ONLY hashes below are pure-adapter inputs, never ROOT file admission.
import {manualTrench05701AdmittedDefinitionR1 as admitted,manualTrench05701RootDecisionStatusR1 as status,
 manualTrench05701ExplicitParameterSourcesR1 as sourceMap,type ManualTrench05701RootScopeR1} from './manualTrench05701AdmittedR1';
import {manualTrench05701QuantityDefinitionR1 as historical,manualTrench05701QuantityPackR1 as pack,
 manualTrench05701PrefixR1 as prefix,manualTrench05701PrimaryR1 as primary,manualTrench05701ScenarioFactsR1 as facts,
 manualTrench05701NeedRowIdsR1 as needs,manualTrench05701NeedParameterIdsR1 as needParameters} from './manualSlopedTrenchGroup1Krer01QuantityR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
const scope:ManualTrench05701RootScopeR1={contractVersion:'manual-trench05701-root-scope-provenance/r1',rootDecisionStatus:status,
 rootDecisionSha256:'a'.repeat(64),groupSourceCaptureSha256:'4c131d2e1a5b21696494b03d3348c6d9f0a25b62a7b93ee633bfe143496816e7',sourceArtifactSha256:pack.source.sha256,
 bodyReadSha256:'7341a49fef8f6dbeb0a77d977205566bc3acab2055d894290c074ab1677c0ef5',quantityScope:'PARTIAL'};
const provenance={kind:'manual',reason:'CONTROL_ONLY77, not an actual supplier or contractor price'};
function core(input:Record<string,unknown>,overrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},prices:CanonicalEstimateCompileCoreInput['priceItems']=[]){
 const d=admitted(scope);return compileCanonicalEstimateCore({operation:'recalculate',catalogId:'TEST_ONLY:manualTrench05701-adapter',compilerVersion:'TEST_ONLY-R1',
  primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:input,confirmedParameters:{},rowOverrides:overrides,priceItems:prices,currencyCode:'KGS',maximumResourceRows:10,hashJson:async x=>estimateDeterministicHash(x)});
}
describe('manualTrench05701 metadata-only admitted proposal; exact ROOT evidence remains mandatory separately',()=>{
 it('preserves the frozen graph, business rows and runtime defaults without mutating the catalogue-null capture',()=>{
  const old=historical(),raw=JSON.stringify(old),next=admitted(scope);
  expect(next.parameters).toEqual(old.parameters);expect(next.formulas).toEqual(old.formulas);
  expect([next.parameters.length,next.formulas.length,next.resources.length]).toEqual([18,10,10]);
  for(let i=0;i<10;i++){const {source_metadata:_a,row_sha256:_b,...a}=old.resources[i]!;
   const {source_metadata:_c,row_sha256:_e,...b}=next.resources[i]!;expect(b).toEqual(a);}
  expect(next.runtimeInput).toEqual({});expect(next.runtimeClassification).toEqual(old.runtimeClassification);expect(next.runtimeSourceIds).toEqual(old.runtimeSourceIds);
  expect(JSON.stringify(old)).toBe(raw);expect((next as any).catalogId).toBeUndefined();expect((next as any).publicationAllowed).toBeUndefined();
 });
 it('promotes one wholelabour row only and retains nine empty normative traces with unitless unresolved obligations',()=>{
  const d=admitted(scope);
  for(const row of d.resources){const need=needs.includes(row.row_id),metadata=row.source_metadata!;
   expect(metadata.sourceRole).toBe(need?'UNRESOLVED_APPLICATION_NORM':'OFFICIAL_NORM');
   expect(metadata.catalogue_identity_pending).toBeUndefined();expect(metadata.normative_binding_pending).toBeUndefined();
   if(need){expect(metadata.normativeTrace).toEqual([]);expect(metadata.normative_source_ids).toEqual([]);expect(row.unit_id).toBe('');}
   expect(metadata.rootScopeProvenanceR1).toMatchObject({quantityScope:'PARTIAL',fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,
    genericExcavationAlreadyExists:true,globalPhysicalAbsenceProved:false,machinePaidBranchAdmitted:false,purchaseOrderAdmitted:false});
   const {row_sha256,...body}=row;expect(row_sha256).toBe(estimateDeterministicHash(body));
  }
 });
 it('assembles nine KNOWN source arrays plus nine UNRESOLVED empty arrays, without DERIVED/runtime invention',()=>{
  const d=admitted(scope),map=sourceMap();expect(Object.keys(map).sort()).toEqual(d.parameters.map(p=>p.parameter_id).sort());
  expect(Object.values(map).filter(x=>x.kind==='KNOWN')).toHaveLength(9);
  expect(Object.values(map).filter(x=>x.kind==='UNRESOLVED')).toHaveLength(9);
  for(const p of d.parameters)expect(map[p.parameter_id]).toEqual(needParameters.includes(p.parameter_id)?
   {kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[pack.sourceKeyProposal]});
 });
 it('retains unique parameter ordinals0..17 and resource ordinals0..9',()=>{
  const d=admitted(scope);expect(d.parameters.map(p=>p.ordinal)).toEqual(Array.from({length:18},(_,i)=>i));
  expect(d.resources.map(r=>r.ordinal)).toEqual(Array.from({length:10},(_,i)=>i));
 });
 it.each([['contractVersion','wrong'],['rootDecisionStatus','AUTHOR_PROPOSAL_NOT_ROOT_DECISION'],
  ['rootDecisionSha256',null],['groupSourceCaptureSha256','not-a-pin'],['sourceArtifactSha256','c'.repeat(64)],
  ['bodyReadSha256','d'.repeat(64)],['quantityScope','COMPLETE'],['rootDecisionStatus',true]])('rejects invalid pure provenance %s=%s',(key,value)=>{
   expect(()=>admitted({...scope,[key]:value} as any)).toThrow('MANUAL_TRENCH05701_EXACT_ROOT_SCOPE_REQUIRED');
 });
 it.each([['100',['118']],['12.5',['14.75']],['1',['1.18']],['0.001',['0.00118']]])('keeps exactbankm3 arithmetic %s and nine missing tasks',async(volume,quantities)=>{
  const r=await core(facts(volume as string));expect(r.rows.map(x=>x.quantity)).toEqual(quantities);expect(r.preliminaryNeeds.map(x=>x.row_id).sort()).toEqual([...needs].sort());
  expect(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id)).toEqual([prefix+':whole-manual-excavation-labor']);
  expect(r.rows.every(x=>x.unit_price===null&&!x.included_in_procurement)).toBe(true);
 });
 it.each(['manual_trench_maximum_depth_m','manual_trench_soil_group','manual_trench_soil_state','manual_trench_support_scope','manual_trench_layer_scope','manual_trench_bank_volume_reference','manual_trench_design_soil_reference','manual_trench_payment_boundary_reference'])('does not lose project condition %s after metadata promotion',async key=>{
  const input=facts();delete input[key];const r=await core(input);expect(r.rows).toEqual([]);
  expect(r.preliminaryNeeds.find(n=>n.row_id===prefix+':whole-manual-excavation-labor')?.missing_parameter_ids).toContain(key);
 });
 it.each(needs)('does not price or quantify unresolved %s with manual0/1',async id=>{
  for(const quantity of ['0','1'])await expect(core(facts(),{[id]:{quantity,unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 });
 it('preserves same-profile labour77/title/saved exclusion through recalculate',async()=>{
  const id=prefix+':whole-manual-excavation-labor',override={unitPrice:'77',titleRu:'CONTROL_ONLY labour',includedInEstimate:false,includedInProcurement:false,provenance};
  const before=JSON.stringify(override),r=await core(facts(),{[id]:override});expect(r.rows.find(x=>x.row_id===id)).toMatchObject({unit_price:'77',title_ru:override.titleRu,included_in_estimate:false,included_in_procurement:false});
  expect(JSON.stringify(override)).toBe(before);expect(r.preliminaryNeeds).toHaveLength(9);
 });
 it('adds no machine-paid/stock/transport input and keeps all3 included operations under wholelabour',async()=>{
  const d=admitted(scope);expect(d.resources.every(r=>!r.procurement_eligible)).toBe(true);
  const operations=d.resources[0]!.source_metadata!.included_operations as Array<{paymentOwnerRowId:string}>;
  expect(operations).toHaveLength(3);expect(operations.every(x=>x.paymentOwnerRowId===prefix+':whole-manual-excavation-labor')).toBe(true);
  for(const key of ['excavator_fulfillment','soil_loose_factor','soil_haul_trip_count'])await expect(core({...facts(),[key]:'1'})).rejects.toThrow('unknown estimate parameters');
 });
 it('zero actual bankm3 invents neither positive layout facts nor numeric missing needs',async()=>{
  const r=await core({[primary]:'0'});expect(r.rows.every(x=>x.quantity==='0')).toBe(true);expect(r.preliminaryNeeds).toEqual([]);
 });
});
