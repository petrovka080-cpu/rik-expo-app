// Prospective metadata successor tests. TEST_ONLY provenance is never ROOT file admission.
import {pavingCut70AdmittedDefinitionR2 as admitted,pavingCut70RootDecisionStatusR2 as status,type PavingCut70RootScopeR2} from './pavingCut70AdmittedR2';
import {pavingCut70ConditionalConsumerDefinitionR1 as historical,pavingCut70AcceptanceInputR1 as facts,pavingCut70OpenNeedIdsR1 as needs} from './pavingCut70ConditionalAppendConsumerR1';
import {pavingCutStationary70QuantityPackR1 as pack,pavingCutStationary70PrimaryR1 as primary,pavingCutStationary70PrefixR1 as prefix} from './pavingCutStationary70QuantityR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
const TEST_ONLY_SCOPE:PavingCut70RootScopeR2={contractVersion:'paving-cut70-root-scope-provenance/r2',rootDecisionStatus:status,
 rootDecisionSha256:'a'.repeat(64),groupReadSha256:'b0c8f37eda9a1f40662e3b5afc98b107cd6e32eaf1f680ab53d83c9c2e1babeb',sourceArtifactSha256:pack.source.sha256,quantityScope:'PARTIAL'};
function core(input:Record<string,unknown>,overrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},prices:CanonicalEstimateCompileCoreInput['priceItems']=[]){
 const d=admitted(TEST_ONLY_SCOPE);
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId:'TEST_ONLY:paving70-metadata-successor',compilerVersion:'TEST_ONLY-R2',primaryMeasureParameterId:primary,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input,confirmedParameters:{},rowOverrides:overrides,priceItems:prices,currencyCode:'KGS',maximumResourceRows:10,hashJson:async v=>estimateDeterministicHash(v)});
}
const provenance={kind:'manual',reason:'VALIDATION_ONLY, not an actual price or source admission'};
describe('paving70 R2 metadata-only successor, prospective ROOT admission separate',()=>{
 it('preserves all calculation and owner fields and does not mutate historical definitions',()=>{
  const before=historical(),raw=JSON.stringify(before),d=admitted(TEST_ONLY_SCOPE);
  expect(d.parameters).toEqual(before.parameters);expect(d.formulas).toEqual(before.formulas);
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([12,10,10]);
  expect(d.runtimeInput).toEqual(before.runtimeInput);expect(d.runtimeClassification).toEqual(before.runtimeClassification);expect(d.runtimeSourceIds).toEqual(before.runtimeSourceIds);
  for(let i=0;i<10;i++){
   const {row_sha256:_a,source_metadata:_b,...prior}=before.resources[i]!;
   const {row_sha256:_c,source_metadata:_e,...next}=d.resources[i]!;expect(next).toEqual(prior);
  }
  expect(JSON.stringify(before)).toBe(raw);expect((d as any).catalogId).toBeUndefined();expect((d as any).publicationAllowed).toBeUndefined();
 });
 it('promotes only four exact source rows; needs have no fabricated trace or pending gate bypass',()=>{
  const d=admitted(TEST_ONLY_SCOPE);
  for(const r of d.resources){const m=r.source_metadata!;
   expect(m.catalogue_identity_pending).toBeUndefined();expect(m.normative_binding_pending).toBeUndefined();
   expect(m.rootScopeProvenanceR2).toMatchObject({rootDecisionSha256:TEST_ONLY_SCOPE.rootDecisionSha256,quantityScope:'PARTIAL',fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,genericCutOperationAlreadyExists:true,genericWalkBodyFullySurveyed:false,globalPhysicalUniquenessProved:false,machinePriceAdmission:false,discOrderAdmission:false});
   expect(m.sourceRole).toBe(needs.includes(r.row_id)?'UNRESOLVED_APPLICATION_NORM':'OFFICIAL_NORM');
   if(needs.includes(r.row_id))expect(m.normativeTrace).toEqual([]);
   const {row_sha256,...body}=r;expect(row_sha256).toBe(estimateDeterministicHash(body));
  }
 });
 it.each([
  ['contractVersion','wrong'],['rootDecisionStatus','APPROVED'],['rootDecisionSha256','not-a-pin'],
  ['groupReadSha256','b'.repeat(64)],['sourceArtifactSha256','c'.repeat(64)],['quantityScope','COMPLETE'],
 ])('rejects invalid pure provenance %s (does not replace exact ROOT file verification)',(key,value)=>{
  expect(()=>admitted({...TEST_ONLY_SCOPE,[key]:value} as any)).toThrow('CUT70_R2_EXACT_ROOT_SCOPE_REQUIRED');
 });
 it.each([['1',['0.39','0.16','0.16','0.014']],['12.5',['4.875','2','2','0.175']],['100',['39','16','16','1.4']]])('preserves source arithmetic %s and six unresolved obligations',async(length,quantities)=>{
  const r=await core(facts(length as string));expect(r.rows.map(x=>x.quantity)).toEqual(quantities);
  expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual([...needs].sort());
  expect(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id)).toEqual([prefix+':whole-cutting-labor']);
  expect(r.rows.every(x=>x.unit_price===null&&!x.included_in_procurement)).toBe(true);
 });
 it.each(needs)('keeps unresolved obligation %s resistant to manual0/1 prices',async id=>{
  for(const quantity of ['0','1'])await expect(core(facts(),{[id]:{quantity,unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 });
 it.each(['operator-information','stationary-machine-consumed','diamond-disc-consumed'])('does not turn %s into paid or procurement owner through manual/snapshot evidence',async suffix=>{
  const id=prefix+':'+suffix,d=admitted(TEST_ONLY_SCOPE),resource=d.resources.find(x=>x.row_id===id)!;
  const manual=await core(facts(),{[id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
  expect(manual.rows.find(x=>x.row_id===id)).toMatchObject({included_in_estimate:false,included_in_procurement:false});
  const snapshot=await core(facts(),{},[{price_key:resource.cost_owner_id??id,unit_id:resource.unit_id,unit_price:'77',currency_code:'KGS',snapshot_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]);
  expect(snapshot.rows.find(x=>x.row_id===id)).toMatchObject({included_in_estimate:false,included_in_procurement:false});
 });
 it('preserves manual title,77 price and saved labour exclusion on recalculate',async()=>{
  const id=prefix+':whole-cutting-labor',override={unitPrice:'77',titleRu:'VALIDATION_ONLY own labour',includedInEstimate:false,includedInProcurement:false,provenance},before=JSON.stringify(override);
  const r=await core(facts(),{[id]:override});expect(r.rows.find(x=>x.row_id===id)).toMatchObject({unit_price:'77',title_ru:override.titleRu,included_in_estimate:false,included_in_procurement:false});
  expect(JSON.stringify(override)).toBe(before);expect(r.preliminaryNeeds).toHaveLength(6);
 });
 it('zero length requires no invented layout/defaults or quantified application needs',async()=>{
  const r=await core({[primary]:'0'});expect(r.rows.every(x=>x.quantity==='0')).toBe(true);expect(r.preliminaryNeeds).toHaveLength(0);
 });
 it('retains literal33-0667 conflict and forbids fractional disc order/usable-leftover assumptions',async()=>{
  const d=admitted(TEST_ONLY_SCOPE);expect(d.resources.find(r=>r.row_id.endsWith(':stationary-machine-consumed'))?.source_metadata)
   .toMatchObject({resource_code:'33-0667',machine_price_admission:false,printed_resource_name_ru:pack.rows[2]!.printedNameRu});
  expect(d.resources.every(r=>!r.procurement_eligible)).toBe(true);
  await expect(core({...facts(),blade_order_quantum:'1'})).rejects.toThrow('unknown estimate parameters');
 });
});
