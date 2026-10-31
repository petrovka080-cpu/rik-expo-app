import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {createCanonicalDefinitionClonePlan} from './canonicalDefinitionPublisherR1';
import {buildMasterPublicationResourceRowsR1} from './prepareMasterSingleDefinitionSuccessorR1';
import {
  prepareMasterRetainedBindingRepresentativeR1,assertMasterRetainedBindingPlanR1,
  assertMasterRetainedBindingSnapshotR1,assertMasterRetainedBindingPreflightUnchangedR1,
  masterRetainedParentCaptureSha256R1,masterRetainedLineageValueSha256V1 as hash,
  type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1,
  type MasterRetainedBindingSnapshotR1,type MasterRetainedBindingGuardInputR1,
} from './masterSingleDefinitionRetainParentBindingsR1';

const raw=readFileSync(resolve(process.cwd(),
  'data/estimate-benchmarks/fixtures/master-retained-first-authority-parent-r26.json'));
const fixture=JSON.parse(raw.toString('utf8')) as {
  capture:MasterRetainedParentCaptureR1&{contentPassport:Record<string,unknown>};definitionReleaseId:string;
};
const copy=<T,>(value:T):T=>structuredClone(value);
const gates=['bitumen_roof_system','bitumen_roof_conditions','bitumen_roof_area_scope'];
const omit=<T extends Record<string,unknown>>(value:T,keys:readonly string[])=>
  Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));

function setup(){
  expect(createHash('sha256').update(raw).digest('hex')).toBe('9efd8d1ffd08ba0d5b4e350d41b1826cf546711ccd240b1057f46998d42fe75b');
  const capture=copy(fixture.capture);
  const parameters=capture.parameters.map(parameter=>{
    const next=copy(parameter);
    if(gates.includes(next.parameter_id))next.truth_metadata={...next.truth_metadata,
      visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
      provenance:{...next.truth_metadata.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'}};
    return next;
  });
  const changes=Object.fromEntries(gates.map(id=>{
    const before=capture.parameters.find(parameter=>parameter.parameter_id===id)!;
    const after=parameters.find(parameter=>parameter.parameter_id===id)!;
    return[id,{capturedTruthMetadata:copy(before.truth_metadata),
      capturedTruthMetadataSha256:hash(before.truth_metadata),afterTruthMetadataSha256:hash(after.truth_metadata)}];
  }));
  const mode={contract:'master-retained-truth-authority-only/v1' as const,
    capturedContentPassport:capture.contentPassport,capturedContentPassportSha256:hash(capture.contentPassport),
    changes,changesSha256:hash(changes)};
  const opt:MasterRetainParentBindingsR1={capturedParent:capture,
    capturedParentSha256:masterRetainedParentCaptureSha256R1(capture),newParameterSources:{},truthAuthorityOnlyV1:mode};
  const source=capture.normativeSources.find(item=>item.source_key==='rik-expo-app.s27-63.bitumen-tile-soft-roof-six.v1:roof')!;
  const locators=capture.normativeLocators.filter(item=>item.source_id===source.id);
  const config={stopCode:'TEST_ONLY_FIRST_AUTHORITY_R26',catalogId:String(capture.definition.catalog_id),
    parentReleaseId:fixture.definitionReleaseId,binding:{retainParentBindings:opt,
      reuseExistingNormativeRegistry:{contract:'master-existing-normative-registry-reuse/r1',source,locators,
        locatorExcerptHashKind:'CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1'}}};
  const input:MasterRetainedBindingGuardInputR1={config,newSource:omit(source,['created_at']),newLocators:locators};
  const next={parameters,formulas:[...copy(capture.formulas)],resources:[...copy(capture.resources)],newBindings:[],
    lifecycleMetadata:{contract:'TEST_ONLY_FIRST_AUTHORITY_R26',masterSha256:'b'.repeat(64),sourceFingerprint:'c'.repeat(64)},
    successorProvenance:{contract:'TEST_ONLY_FIRST_AUTHORITY_R26',parentDefinitionId:capture.definition.id,
      parentBaselineId:capture.baseline.id,capturedParentSha256:opt.capturedParentSha256,
      truthAuthorityOnlyV1:{contract:mode.contract,changesSha256:mode.changesSha256,parameterIds:Object.keys(changes).sort()}}};
  return{capture,opt,mode,input,next,source};
}
const prepare=(state:ReturnType<typeof setup>)=>prepareMasterRetainedBindingRepresentativeR1(state.input,state.next);

function planFor(state:ReturnType<typeof setup>){
  const representative=prepare(state),capture=state.capture,passport=capture.contentPassport;
  const plan=createCanonicalDefinitionClonePlan({contract:'TEST_ONLY_FIRST_AUTHORITY_R26',
    definition:{id:randomUUID(),releaseId:randomUUID(),catalogId:state.input.config.catalogId,
      definitionVersion:Number(capture.definition.definition_version)+1,passport:capture.definition.passport,
      applicability:capture.definition.applicability,definitionSha256:'1'.repeat(64),sourceMetadata:representative.sourceMetadata},
    representative:{parameters:state.next.parameters,formulas:state.next.formulas,
      resources:buildMasterPublicationResourceRowsR1(state.next.resources),bindings:[...representative.bindings],
      baseline:capture.baseline,passport},parameterTruthMetadata:parameter=>parameter.truth_metadata,
    resourceId:()=>randomUUID(),resourceSemanticOwner:resource=>resource.semantic_owner,resourceSha256:hash,
    baseline:{id:randomUUID(),key:'TEST_ONLY_FIRST_AUTHORITY_R26',sourceDefinitionVersionId:capture.definition.id,
      validationScenarioRefs:[],acceptanceEvidenceSha256:'2'.repeat(64),acceptedReleaseId:randomUUID(),
      supersedesBaselineId:capture.baseline.id},
    passport:{physicalResultRu:String(passport.physical_result_ru),excludedScopeRu:passport.excluded_scope_ru,
      decision:passport.decision as Record<string,unknown>,payloadSha256:'3'.repeat(64),sourceHead:String(passport.source_head),
      sourceTree:String(passport.source_tree)},bindingApplicability:binding=>binding.applicability,
    expectedNormativeBindingCount:representative.expectedNormativeBindingCount});
  return{plan,representative};
}

test('first metadata-only successor uses the actual parent without fabricated retained history',()=>{
  const state=setup(),{plan,representative}=planFor(state),before=state.capture;
  const metadata=representative.sourceMetadata;
  expect(metadata.retainedParentBindingSuccessorV1).toMatchObject({parentDefinitionId:before.definition.id,
    parentBaselineId:before.baseline.id,capturedParentSha256:state.opt.capturedParentSha256});
  expect(metadata).not.toHaveProperty('retainedParentBindingLineageV1');
  expect(metadata).not.toHaveProperty('retainedParentBindingContinuationV1');
  expect(representative.normativeSourceIds).toEqual(before.baseline.normative_source_ids);
  expect(representative.bindings).toHaveLength(before.bindings.length);
  expect(state.next.resources).toEqual(before.resources);
  expect(state.next.formulas).toEqual(before.formulas);
  expect(plan.baseline.input_values).toEqual(before.baseline.input_values);
  expect(()=>assertMasterRetainedBindingPlanR1(state.input,plan,representative)).not.toThrow();
});

test.each(['retainedParentBindingSuccessorV1','retainedParentBindingContinuationV1',
  'retainedParentBindingContinuationV2','retainedParentBindingLineageV1'])(
  'a present retained-history key requires its real append witness: %s',key=>{
    const state=setup();state.capture.definition.source_metadata[key]={testOnlyMalformedHistory:true};
    Object.assign(state.opt,{capturedParentSha256:masterRetainedParentCaptureSha256R1(state.capture)});
    expect(()=>prepare(state)).toThrow(/AUTHORITY_EXCLUSIVE_LINEAGE/u);
  });

test.each([undefined,null,{}])('an absent retained envelope cannot be supplied a fake append: %p',value=>{
  const state=setup();Object.assign(state.opt,{successorProvenanceAppendV1:value});
  expect(()=>prepare(state)).toThrow(/AUTHORITY_EXCLUSIVE_LINEAGE/u);
});

test.each(['default','unit','formula','payment','undeclaredTruth','sourceGuide'])(
  'authority-only mode still rejects a substantive change: %s',kind=>{
    const state=setup();
    if(kind==='default')state.next.parameters[0]!.default_value='1';
    if(kind==='unit')state.next.parameters[0]!.unit_id='m3';
    if(kind==='formula')state.next.formulas[0]!.expression_source='1';
    if(kind==='payment')state.next.resources[0]!.cost_owner_id='TEST_ONLY_FAKE_OWNER';
    if(kind==='undeclaredTruth'){
      const parameter=state.next.parameters.find(item=>!gates.includes(item.parameter_id))!;
      parameter.truth_metadata={...parameter.truth_metadata,source_confirmation_required:!parameter.truth_metadata.source_confirmation_required};
    }
    if(kind==='sourceGuide'){
      const id=gates[0]!,parameter=state.next.parameters.find(item=>item.parameter_id===id)!;
      parameter.truth_metadata.guide={...parameter.truth_metadata.guide,guide_short_ru:'TEST_ONLY_FAKE_NORM'};
      state.mode.changes[id]!.afterTruthMetadataSha256=hash(parameter.truth_metadata);
      state.mode.changesSha256=hash(state.mode.changes);
    }
    expect(()=>prepare(state)).toThrow(/AUTHORITY_|CAPTURE_|PARAMETER_|RESOURCE_/u);
  });

test('a first metadata successor preserves baseline and readiness in the final clone plan',()=>{
  const state=setup(),{plan,representative}=planFor(state);
  plan.baseline.input_values={TEST_ONLY_FAKE_APPROVAL:true};
  expect(()=>assertMasterRetainedBindingPlanR1(state.input,plan,representative)).toThrow(/AUTHORITY_BASELINE_SEMANTICS/u);
});

test('normal and locked preflight still reject full-parent or content-passport drift',()=>{
  const state=setup(),capture=state.capture;
  const snapshot:MasterRetainedBindingSnapshotR1={membership:[{release_id:state.input.config.parentReleaseId,
    catalog_id:state.input.config.catalogId,definition_version_id:capture.definition.id,
    approved_template_baseline_id:capture.baseline.id,definition_hash:capture.definition.definition_sha256}],
    capture:omit(capture,['contentPassport']) as unknown as MasterRetainedParentCaptureR1,
    newSources:[state.source],newLocators:state.input.newLocators,contentPassport:capture.contentPassport};
  expect(()=>assertMasterRetainedBindingSnapshotR1(state.input,snapshot)).not.toThrow();
  expect(()=>assertMasterRetainedBindingPreflightUnchangedR1(state.input,snapshot,copy(snapshot))).not.toThrow();
  const drift=copy(snapshot);drift.capture.resources[0]!.cost_owner_id='TEST_ONLY_FAKE_OWNER';
  expect(()=>assertMasterRetainedBindingPreflightUnchangedR1(state.input,snapshot,drift)).toThrow(/PARENT_FULL_CAPTURE_DRIFT/u);
  const passportDrift=copy(snapshot);passportDrift.contentPassport!.physical_result_ru='TEST_ONLY_FAKE_SCOPE';
  expect(()=>assertMasterRetainedBindingPreflightUnchangedR1(state.input,snapshot,passportDrift)).toThrow(/AUTHORITY_CONTENT_PASSPORT_DRIFT/u);
});

test('omitting authority mode retains the existing source-distinctness guard',()=>{
  const state=setup();Reflect.deleteProperty(state.opt,'truthAuthorityOnlyV1');
  expect(()=>prepare(state)).toThrow(/NEW_SOURCE_MUST_BE_DISTINCT_COMPLETE_ROW/u);
});
