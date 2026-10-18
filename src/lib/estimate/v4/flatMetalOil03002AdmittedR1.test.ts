import {flatMetalOil03002AdmittedDefinitionR1 as admitted,flatMetalOil03002ExplicitParameterSourcesR1 as sourceMap,
 flatMetalOil03002CatalogIdR1 as catalogId,flatMetalOil03002RootDecisionStatusR1 as status,
 flatMetalOil03002ContinuationStatusR1 as continuationStatus,flatMetalOil03002RootClassificationShaR1 as classificationSha,
 type FlatMetalOil03002RootScopeR1} from './flatMetalOil03002AdmittedR1';
import {flatMetalOil03002QuantityDefinitionR1 as historical,flatMetalOil03002QuantityPackR1 as pack,
 flatMetalOil03002PrimaryR1 as primary,flatMetalOil03002ScenarioFactsR1 as facts,
 flatMetalOil03002PrefixR1 as prefix,flatMetalOil03002NeedParameterIdsR1 as needParameters} from './flatMetalOil03002QuantityR1';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
// TEST_ONLY scope exercises pure metadata validation. It is never a file admission/publication proof.
const scope=():FlatMetalOil03002RootScopeR1=>({contractVersion:'painting03002-root-scope-provenance/r1',rootDecisionStatus:status,
 rootDecisionSha256:'9be99f15ca3928d4bc0f2c39b487875a79591585a4d181417cf0bc084961cb2c',rootClassificationSha256:classificationSha,continuationStatus,
 continuationReadSha256:'464b86314076af3b8d73b2de98548ef9a1eafa3296c65613e271c00ee609f60e',sourceArtifactSha256:pack.source.sha256,
 quantityPackSha256:'9cf784f9848df164187529d8aeee2442ccd736e91ea04ae0f729e488f7ee42f7',quantityScope:'PARTIAL',placement:'CREATE_EXACT_ROOT_GROUP'});
const omit=(value:Record<string,unknown>,keys:string[])=>Object.fromEntries(Object.entries(value).filter(([k])=>!keys.includes(k)));
describe('painting03002 admitted metadata successor (prospective; does not admit files)',()=>{
 test.each([
  ['wrong root status',{rootDecisionStatus:'TEST_ONLY_UNREVIEWED'}],['missing decision pin',{rootDecisionSha256:''}],
  ['wrong classification',{rootClassificationSha256:'0'.repeat(64)}],['missing actual continuation pin',{continuationReadSha256:''}],
  ['failed continuation',{continuationStatus:'NOT_ACCEPTED'}],['wrong primary artifact',{sourceArtifactSha256:'0'.repeat(64)}],
  ['changed frozen pack',{quantityPackSha256:'0'.repeat(64)}],['forbidden join',{placement:'JOIN_OLD_FENCE_GROUP'}],
 ] as const)('%s refuses before producing an admitted definition',(_name,delta)=>{
  expect(()=>admitted({...scope(),...delta} as unknown as FlatMetalOil03002RootScopeR1)).toThrow('PAINTING03002_EXACT_ROOT_SCOPE_REQUIRED');
 });
 test('keeps the frozen physical definition unchanged and marks only exact ROOT provenance',()=>{
  const before=historical(),after=admitted(scope());expect(before.catalogId).toBeNull();expect(after.catalogId).toBe(catalogId);
  expect(after.parameters).toEqual(before.parameters);expect(after.formulas).toEqual(before.formulas);
  expect([after.parameters.length,after.formulas.length,after.resources.length]).toEqual([19,17,17]);
  expect(after.parameters.map(p=>p.ordinal)).toEqual(Array.from({length:19},(_,i)=>i));
  expect(after.resources.map(r=>r.row_id)).toEqual(before.resources.map(r=>r.row_id));
  for(const [index,row]of after.resources.entries()){
   expect(omit(row,['source_metadata','row_sha256'])).toEqual(omit(before.resources[index]!,['source_metadata','row_sha256']));
   const metadata=row.source_metadata??{},unresolved=metadata.sourceRole==='UNRESOLVED_APPLICATION_NORM';
   expect(metadata.rootScopeProvenanceR1).toMatchObject({existing24Disposition:'KEEP_CURRENT_IMMUTABLE',
    globalPhysicalAbsenceProved:false,machinePaidBranchAdmitted:false,purchaseOrderAdmitted:false,applicationNeedUnresolved:unresolved});
   expect(metadata).not.toHaveProperty('catalogue_identity_pending');expect(metadata).not.toHaveProperty('normative_binding_pending');
   if(unresolved){expect(metadata.normativeTrace).toEqual([]);expect(metadata.normative_source_ids).toEqual([]);}
   else expect(metadata.sourceRole).toBe('OFFICIAL_NORM');
  }
  expect(historical()).toEqual(before); // no mutation of historical resource metadata or hashes
 });
 test('maps exactly9 known inputs and10 empty unresolved arrays, never the old all-source shortcut',()=>{
  const d=admitted(scope()),map=sourceMap();expect(Object.keys(map).sort()).toEqual(d.parameters.map(p=>p.parameter_id).sort());
  expect(Object.values(map).filter(p=>p.kind==='KNOWN')).toHaveLength(9);expect(Object.values(map).filter(p=>p.kind==='UNRESOLVED')).toHaveLength(10);
  for(const p of d.parameters)expect(map[p.parameter_id]).toEqual(needParameters.includes(p.parameter_id)?{kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[pack.sourceKeyProposal]});
 });
 const compile=(rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={})=>{
  const d=admitted(scope());return compileCanonicalEstimateCore({operation:'recalculate',catalogId,compilerVersion:'TEST_ONLY_PAINTING03002_ADMITTED_METADATA',primaryMeasureParameterId:primary,
   parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:facts(),confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:17,hashJson:async x=>estimateDeterministicHash(x)});
 };
 test('CONTROL77 references on all six INFO cannot add money or procurement owners',async()=>{
  const owner=prefix+':whole-oil-painting-labor',ids=pack.rows.map(r=>prefix+':'+r.suffix),result=await compile(Object.fromEntries(ids.map(id=>[id,{unitPrice:'77',provenance:{kind:'manual' as const,reason:'TEST_ONLY CONTROL77'}}])));
  expect(result.rows.map(r=>r.quantity)).toEqual(['12.21','0.01','0.01','0.03','0.0277','3.2','0.1']);expect(result.totals.amount).toBe('940.17');
  expect(result.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id)).toEqual([owner]);expect(result.preliminaryNeeds).toHaveLength(10);
  expect(result.rows.every(r=>!r.included_in_procurement)).toBe(true);expect(result.rows.filter(r=>r.row_id!==owner).every(r=>r.unit_price==='77'&&!r.included_in_estimate)).toBe(true);
 });
 test('metadata admission cannot make direct quantity override legal for the whole source owner',async()=>{
  await expect(compile({[prefix+':whole-oil-painting-labor']:{quantity:'99',provenance:{kind:'manual',reason:'TEST_ONLY forbidden source quantity'}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 });
});
