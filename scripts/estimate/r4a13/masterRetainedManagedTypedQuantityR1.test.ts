import {prepareLinoleumCurrentProjectQuantityR2 as recipe,observedLinoleumParentR1115R2 as observed} from './prepareLinoleumCurrentProjectQuantityR2';
import {masterRetainedParentCaptureSha256R1 as captureHash} from './masterSingleDefinitionRetainParentBindingsR1';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1 as candidateFor,validateMasterTypedPartialQuantityPreparationR1 as errors} from './prepareMasterSingleDefinitionSuccessorR1';
import {makeMasterScopedNormativeRegistryCaptureR1 as capture} from './masterScopedNormativeRegistryPreimageR1';
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
// Empty synthetic scope is a PURE UNIT fixture only. It is never persisted as an actual DB capture.
function fixture(){const actualParent=observed();const config=recipe({expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'TEST_ONLY_PURE_GUARD_NO_WRITE',
 masterSha256:'92c04a456ecd85afcc699e7da5e6cf97114db1a74019fd203f1816c2b81ca08f',parentReleaseId:actualParent.definition.release_id,
 parentSearchReleaseId:'TEST_ONLY',currentReleasePath:'TEST_ONLY',outputRoot:'TEST_ONLY',actualParent,actualParentCaptureSha256:captureHash(actualParent),
 verifyCore:async()=>({testOnly:true}),verifyTargetPrecondition:async()=>{throw Error('TEST_ONLY_NEVER_EXECUTE');}});
 const candidate=candidateFor(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
 return {...config,capturedScopedNormativeRegistry:capture({artifactSha256:String(candidate.newSource.artifact_sha256),normId:config.normId,
 sourceKey:config.sourceId,generatedSourceId:candidate.newSource.id,generatedLocatorIds:candidate.newLocators.map(l=>l.id),
 generatedLocatorKeys:candidate.newLocators.map(l=>l.locator_key)},{sourceRows:[],locatorRows:[]})};}
type Fixture=ReturnType<typeof fixture>;
const retained=(c:Fixture)=>{const r=c.binding.retainParentBindings;if(!r)throw Error('TEST_RETAINED_REQUIRED');return r;};
const basis=(c:Fixture)=>{const b=c.passport.partialQuantityBasis;if(!b||b.kind!=='DEFERRED_PROJECT_QUANTITIES')throw Error('TEST_DEFERRED_REQUIRED');return b;};
describe('retained managed typed quantity admission R1125',()=>{
 test('admits a concrete retained native59 and exact65new source with all70 quantities still unknown',()=>{
  const c=fixture();expect(errors(c)).toEqual([]);expect(basis(c).parameters).toHaveLength(70);
  expect(c.binding.additionalRowIds).toHaveLength(64);expect(retained(c).capturedParent.resources).toHaveLength(59);
  expect(basis(c).parameters.every(f=>c.parameterDefinitions.find(p=>p.parameter_id===f.parameterId)?.default_value===null)).toBe(true);
  expect(retained(c).capturedParent.baseline.input_values.q).toBe(100);expect(c.runtimeProfileClassification?.q).toBe('ASSUMPTION');
 });
 const negatives:readonly [string,(c:Fixture)=>void,string][]=[
  ['missing scoped capture',c=>{delete (c as Partial<Fixture>).capturedScopedNormativeRegistry;},'FRESH_SCOPED_PREIMAGE_REQUIRED'],
  ['bad scoped checksum',c=>{c.capturedScopedNormativeRegistry={...c.capturedScopedNormativeRegistry,captureSha256:'f'.repeat(64)};},'CAPTURE_HASH'],
  ['foreign scope',c=>{c.capturedScopedNormativeRegistry={...c.capturedScopedNormativeRegistry,scope:{...c.capturedScopedNormativeRegistry.scope,normId:'FOREIGN'}};},'EXACT_GENERATED_SCOPE'],
  ['parent checksum drift',c=>{c.binding={...c.binding,retainParentBindings:{...retained(c),capturedParentSha256:'f'.repeat(64)}};},'CAPTURE_SHA256'],
  ['missing new binding',c=>{c.binding={...c.binding,additionalRowIds:c.binding.additionalRowIds!.slice(1)};},'EXACT_NEW_RESOURCE_BINDINGS'],
  ['native row rebound',c=>{c.binding={...c.binding,additionalRowIds:[...c.binding.additionalRowIds!,retained(c).capturedParent.resources[0]!.row_id]};},'EXACT_NEW_RESOURCE_BINDINGS'],
  ['duplicate binding',c=>{c.binding={...c.binding,additionalRowIds:[...c.binding.additionalRowIds!,c.binding.rowId]};},'COMPOSITE_BINDING_DUPLICATE_ROW_ID'],
  ['foreign row binding',c=>{c.binding={...c.binding,additionalRowIds:[...c.binding.additionalRowIds!,'FOREIGN_ROW']};},'COMPOSITE_BINDING_UNKNOWN_ROW_ID'],
  ['source artifact substituted',c=>{const b=basis(c);c.passport={...c.passport,partialQuantityBasis:{...b,source:{...b.source,artifactSha256:'f'.repeat(64)}}};},'REGISTERED_SOURCE_LOCATOR_ARTIFACT'],
  ['unresolved norm disguised',c=>{const id=basis(c).parameters[0]!.parameterId;c.parameterDefinitions=c.parameterDefinitions.map(p=>p.parameter_id===id?{...p,truth_metadata:{...p.truth_metadata,value_source_role:'UNRESOLVED_APPLICATION_NORM'}}:p);},'APPLICATION_NORM_CONFLICT'],
  ['quantity default invented',c=>{const id=basis(c).parameters[0]!.parameterId;c.parameterDefinitions=c.parameterDefinitions.map(p=>p.parameter_id===id?{...p,default_value:1}:p);},'FACT_DEFAULT'],
  ['ordinary source conflict',c=>{c.binding={...c.binding,ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',capturedSourcePreimage:{sourceKey:c.sourceId,expected:null}}};},'TYPED_QUANTITY_REGISTERED_RETAINED_SOURCE_REQUIRED'],
 ];
 test.each(negatives)('refuses %s',(name,mutate,code)=>{const c=clone(fixture());mutate(c);expect(errors(c).join(',')).toContain(code);});
});
