// Prospective 33 cases. TEST_ONLY hashes below are pure-adapter inputs, never ROOT file admission.
import {roadMarking01601AdmittedDefinitionR1 as admitted,roadMarking01601RootDecisionStatusR1 as status,
 roadMarking01601ExplicitParameterSourcesR1 as sourceMap,type RoadMarking01601RootScopeR1} from './roadMarking01601AdmittedR1';
import {roadMarking01601QuantityDefinitionR1 as historical,roadMarking01601QuantityPackR1 as pack,
 roadMarking01601PrefixR1 as prefix,roadMarking01601PrimaryR1 as primary,roadMarking01601ScenarioFactsR1 as facts,
 roadMarking01601NeedRowIdsR1 as needs,roadMarking01601NeedParameterIdsR1 as needParameters} from './roadMarkingContinuous100Pf133QuantityR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
const scope:RoadMarking01601RootScopeR1={contractVersion:'road-marking01601-root-scope-provenance/r1',rootDecisionStatus:status,
 rootDecisionSha256:'a'.repeat(64),groupSourceCaptureSha256:'074ece84478be854a9077e28d1b1639af14505a4f6ed2a71e47798883e8ebbaf',sourceArtifactSha256:pack.source.sha256,
 bodyReadSha256:'deae249b7687926ac82f5f14cdc47e8c3bbe8b5927747fa6d412ffbc88badcaa',quantityScope:'PARTIAL'};
const provenance={kind:'manual',reason:'CONTROL_ONLY77, not an actual supplier or contractor price'};
function core(input:Record<string,unknown>,overrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},prices:CanonicalEstimateCompileCoreInput['priceItems']=[]){
 const d=admitted(scope);return compileCanonicalEstimateCore({operation:'recalculate',catalogId:'TEST_ONLY:road01601-adapter',compilerVersion:'TEST_ONLY-R1',
  primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:input,confirmedParameters:{},rowOverrides:overrides,priceItems:prices,currencyCode:'KGS',maximumResourceRows:16,hashJson:async x=>estimateDeterministicHash(x)});
}
describe('road01601 metadata-only admitted proposal; exact ROOT evidence remains mandatory separately',()=>{
 it('preserves the frozen graph, business rows and runtime defaults without mutating the catalogue-null capture',()=>{
  const old=historical(),raw=JSON.stringify(old),next=admitted(scope);
  expect(next.parameters).toEqual(old.parameters);expect(next.formulas).toEqual(old.formulas);
  expect([next.parameters.length,next.formulas.length,next.resources.length]).toEqual([17,16,16]);
  for(let i=0;i<16;i++){const {source_metadata:_a,row_sha256:_b,...a}=old.resources[i]!;
   const {source_metadata:_c,row_sha256:_e,...b}=next.resources[i]!;expect(b).toEqual(a);}
  expect(next.runtimeInput).toEqual({});expect(next.runtimeClassification).toEqual(old.runtimeClassification);expect(next.runtimeSourceIds).toEqual(old.runtimeSourceIds);
  expect(JSON.stringify(old)).toBe(raw);expect((next as any).catalogId).toBeUndefined();expect((next as any).publicationAllowed).toBeUndefined();
 });
 it('promotes six literal rows only and retains ten empty normative traces with unitless unresolved obligations',()=>{
  const d=admitted(scope);
  for(const row of d.resources){const need=needs.includes(row.row_id),metadata=row.source_metadata!;
   expect(metadata.sourceRole).toBe(need?'UNRESOLVED_APPLICATION_NORM':'OFFICIAL_NORM');
   expect(metadata.catalogue_identity_pending).toBeUndefined();expect(metadata.normative_binding_pending).toBeUndefined();
   if(need){expect(metadata.normativeTrace).toEqual([]);expect(metadata.normative_source_ids).toEqual([]);expect(row.unit_id).toBe('');}
   expect(metadata.rootScopeProvenanceR1).toMatchObject({quantityScope:'PARTIAL',fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,
    genericRoadMarkingAlreadyExists:true,globalPhysicalAbsenceProved:false,machinePaidBranchAdmitted:false,paintPurchaseAdmitted:false});
   const {row_sha256,...body}=row;expect(row_sha256).toBe(estimateDeterministicHash(body));
  }
 });
 it('assembles seven KNOWN source arrays plus ten UNRESOLVED empty arrays, without DERIVED/runtime invention',()=>{
  const d=admitted(scope),map=sourceMap();expect(Object.keys(map).sort()).toEqual(d.parameters.map(p=>p.parameter_id).sort());
  expect(Object.values(map).filter(x=>x.kind==='KNOWN')).toHaveLength(7);
  expect(Object.values(map).filter(x=>x.kind==='UNRESOLVED')).toHaveLength(10);
  for(const p of d.parameters)expect(map[p.parameter_id]).toEqual(needParameters.includes(p.parameter_id)?
   {kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[pack.sourceKeyProposal]});
 });
 it('retains unique parameter ordinals0..16 and resource ordinals0..15',()=>{
  const d=admitted(scope);expect(d.parameters.map(p=>p.ordinal)).toEqual(Array.from({length:17},(_,i)=>i));
  expect(d.resources.map(r=>r.ordinal)).toEqual(Array.from({length:16},(_,i)=>i));
 });
 it.each([['contractVersion','wrong'],['rootDecisionStatus','ROOT_ADMITTED_ROAD_MARKING_SOURCE_SPECIFIC_PARTIAL_PREPARATION_R1'],
  ['rootDecisionSha256',null],['groupSourceCaptureSha256','not-a-pin'],['sourceArtifactSha256','c'.repeat(64)],
  ['bodyReadSha256','d'.repeat(64)],['quantityScope','COMPLETE'],['rootDecisionStatus',true]])('rejects invalid pure provenance %s=%s',(key,value)=>{
   expect(()=>admitted({...scope,[key]:value} as any)).toThrow('ROAD01601_EXACT_ROOT_SCOPE_REQUIRED');
 });
 it.each([['0.1',['0.366','0.204','0.101','0.103','0.0042','0.00008']],['1',['3.66','2.04','1.01','1.03','0.042','0.0008']],
  ['1.25',['4.575','2.55','1.2625','1.2875','0.0525','0.001']]])('keeps exact single-km arithmetic %s and the ten missing tasks',async(km,quantities)=>{
   const r=await core(facts(km as string));expect(r.rows.map(x=>x.quantity)).toEqual(quantities);expect(r.preliminaryNeeds.map(x=>x.row_id).sort()).toEqual([...needs].sort());
   expect(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id)).toEqual([prefix+':whole-marking-labor']);
   expect(r.rows.every(x=>x.unit_price===null&&!x.included_in_procurement)).toBe(true);
 });
 it.each(pack.rows.slice(1).map(x=>x.suffix))('keeps manual/snapshot %s prices reference-only, outside totals/procurement',async suffix=>{
  const id=prefix+':'+suffix,d=admitted(scope),resource=d.resources.find(x=>x.row_id===id)!;
  const manual=await core(facts(),{[id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
  expect(manual.rows.find(x=>x.row_id===id)).toMatchObject({unit_price:'77',ownership_status:'OWNED_EXCLUDED',included_in_estimate:false,included_in_procurement:false});
  expect(manual.totals.amount).toBe('0');
  const snapshot=await core(facts(),{},[{price_key:resource.cost_owner_id!,unit_id:resource.unit_id,unit_price:'77',currency_code:'KGS',snapshot_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]);
  expect(snapshot.rows.find(x=>x.row_id===id)).toMatchObject({included_in_estimate:false,included_in_procurement:false});expect(snapshot.totals.amount).toBe('0');
 });
 it.each(needs)('does not price or quantify unresolved %s with manual0/1',async id=>{
  for(const quantity of ['0','1'])await expect(core(facts(),{[id]:{quantity,unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 });
 it('preserves same-profile labour77/title/saved exclusion through recalculate',async()=>{
  const id=prefix+':whole-marking-labor',override={unitPrice:'77',titleRu:'CONTROL_ONLY labour',includedInEstimate:false,includedInProcurement:false,provenance};
  const before=JSON.stringify(override),r=await core(facts(),{[id]:override});expect(r.rows.find(x=>x.row_id===id)).toMatchObject({unit_price:'77',title_ru:override.titleRu,included_in_estimate:false,included_in_procurement:false});
  expect(JSON.stringify(override)).toBe(before);expect(r.preliminaryNeeds).toHaveLength(10);
 });
 it('adds no machine-paid or paint/cord pack parameter and preserves a null cord code',async()=>{
  const d=admitted(scope);expect(d.resources.every(r=>!r.procurement_eligible)).toBe(true);
  expect(d.resources.find(r=>r.row_id.endsWith(':layout-cord-consumed'))?.source_metadata?.resource_code).toBeNull();
  for(const key of ['marking_machine_fulfillment','paint_pack_kg','cord_order_quantum'])await expect(core({...facts(),[key]:'1'})).rejects.toThrow('unknown estimate parameters');
 });
 it('zero actual line km invents neither positive layout facts nor numeric missing needs',async()=>{
  const r=await core({[primary]:'0'});expect(r.rows.every(x=>x.quantity==='0')).toBe(true);expect(r.preliminaryNeeds).toEqual([]);
 });
});
