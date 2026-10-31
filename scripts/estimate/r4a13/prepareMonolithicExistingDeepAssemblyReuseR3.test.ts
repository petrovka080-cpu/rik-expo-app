import {monolithicExistingDeepAssemblyReuseConfigR3 as configure,monolithicExistingDeepAssemblyReuseTargetsR3 as targets} from './prepareMonolithicExistingDeepAssemblyReuseR3';
import {masterRetainParentBindingsOptInR1,prepareMasterRetainedBindingRepresentativeR1,
 validateMasterRetainedBindingAppendV1,masterRetainedLineageValueSha256V1} from './masterSingleDefinitionRetainParentBindingsR1';
import {MONOLITHIC_DEEP_REUSE_CONTROL_R3 as control} from '../../../src/lib/estimate/v4/monolithicPhysicalProvisionMasterR2';
import {isCanonicalEstimateConsumerSuppliedParameter as consumer} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {canonicalPublisherQuantityScopeIsConsistent} from './canonicalDefinitionPublisherR1';
import {buildMasterCapabilityMatrix,buildMasterScopeReadiness} from './prepareMasterSingleDefinitionSuccessorR1';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const context={releaseId:'TEST_ONLY_NOT_A_DB_PUBLICATION',searchReleaseId:'TEST_ONLY_NOT_A_SEARCH_PUBLICATION',outputRoot:'.tmp/test-only-no-write'};
describe.each(targets)('normal retained publisher content for %s',catalogId=>{
 test('retains every missing norm and admits the independent kit control without misclassifying it as a norm gap',()=>{
  const config=configure(context,catalogId);
  const unresolved=config.passport.unresolvedApplicableResourceRowIds!;
  const pack=createRequire(__filename)('../../../data/estimate-benchmarks/source-packs/monolithic-existing-deep-reuse-current-consumers-r3.json') as {
   targets:{catalogId:string;capturePath:string;aggregateCapture:boolean}[]};
  const target=pack.targets.find(t=>t.catalogId===catalogId)!;
  const captured=JSON.parse(readFileSync(target.capturePath,'utf8'));
  const oldRecord=target.aggregateCapture?captured.captures.find((r:{capture:{definition:{catalog_id:string}}})=>r.capture.definition.catalog_id===catalogId):captured;
  expect(unresolved).toEqual(oldRecord.contentPassport.decision.unresolvedResourceRowIds);
  expect(unresolved).not.toContain(control);
  const payload={parameters:config.parameterDefinitions,formulas:config.formulaDefinitions,resources:config.resourceDefinitions,
   baseline:{input_values:config.runtimeProfileInput},passport:{decision:buildMasterScopeReadiness(unresolved,config.resourceDefinitions),
    capability_matrix:buildMasterCapabilityMatrix(unresolved,config.resourceDefinitions)}};
  expect(canonicalPublisherQuantityScopeIsConsistent(payload)).toBe(true);
  expect(payload.passport.decision.quantityScope).toBe('PARTIAL');
  expect(config.resourceDefinitions.some(r=>r.row_id===control&&r.resource_graph.scopeRequirementV1?.kind==='OBJECT_SCOPE')).toBe(true);
  expect(config.passport.independentCompletenessMap!.entries.some((e:{expectedResourceId:string})=>e.expectedResourceId===control)).toBe(true);
  const forged=structuredClone(payload);
  forged.passport.decision.unresolvedResourceRowIds.push(control);
  forged.passport.capability_matrix.find(c=>c.capability==='FULL_APPLICABLE_SCOPE')!.unresolvedResourceRowIds.push(control);
  expect(canonicalPublisherQuantityScopeIsConsistent(forged)).toBe(false);
 });
 test('keeps the real current baseline, every previous source array and six existing resource owners',async()=>{
  const config=configure(context,catalogId),retained=config.binding.retainParentBindings!;
  const shapes:Record<string,number[]>={strip:[789,410,414],slab:[616,507,492],beam:[517,384,386],column:[511,380,382],wall:[362,269,270]};
  const kind=Object.keys(shapes).find(k=>catalogId.includes('_'+k+'_'))!;
  expect(config.expectedParentShape).toEqual(shapes[kind]);
  expect(config.acceptanceInput).toMatchObject(retained.capturedParent.baseline.input_values);
  expect(config.runtimeProfileInput).toEqual(config.acceptanceInput);
  expect(Object.keys(config.acceptanceInput)).toHaveLength(Object.keys(retained.capturedParent.baseline.input_values).length
   +(['beam','column'].includes(kind)?4:0));
  expect(Object.keys(config.runtimeProfileClassification!).sort()).toEqual(Object.keys(config.runtimeProfileInput!).sort());
  expect(Object.keys(config.runtimeProfileSourceIds!).sort()).toEqual(Object.keys(config.runtimeProfileInput!).sort());
  expect(Object.keys(config.shortInput).length).toBeLessThanOrEqual(4);
  expect(Object.keys(config.shortInput).length).toBeGreaterThanOrEqual(2);
  expect(Object.values(config.shortInput).every(v=>typeof v==='number'||typeof v==='string'&&/^\d+(\.\d+)?$/.test(v))).toBe(true);
  const values={...Object.fromEntries(config.parameterDefinitions.filter(p=>p.default_value!==null).map(p=>[p.parameter_id,p.default_value])),...config.runtimeProfileInput};
  const publicFields=config.parameterDefinitions.filter(p=>{
   const t=p.truth_metadata,g=t.guide;
   const schema={parameterId:p.parameter_id,semanticParameterKey:t.semantic_parameter_key,ordinal:p.ordinal,titleRu:p.title_ru,valueType:p.value_type,
    unitId:p.unit_id,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,required:p.required,
    defaultValue:p.default_value,constraints:p.constraints_json,visibleWhen:t.visible_when,formulaConsumers:t.formula_consumers,
    resourceBranchConsumers:t.resource_branch_consumers,runtimeProfileClassification:config.runtimeProfileClassification?.[p.parameter_id],
    guide:{guideKind:g.guide_kind,sourceRole:g.source_role,guideValidationPolicy:g.guide_validation_policy,sourceDocument:g.source_document,
     sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideVersion:g.guide_version}} as unknown as Parameters<typeof consumer>[0];
   return consumer(schema)&&(!t.visible_when||resolveInclusionGraph(t.visible_when,values).value!==false);
  });
  expect(publicFields.map(p=>p.parameter_id).sort()).toEqual(Object.keys(config.shortInput).sort());
  expect(publicFields.every(p=>['decimal','integer'].includes(p.value_type))).toBe(true);
  for(const p of config.parameterDefinitions.filter(p=>p.truth_metadata.provenance?.consumer_input_role_v1==='APPLICATION_TECHNICAL'))
   expect(p.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
  expect(config.resourceDefinitions.length).toBe(retained.capturedParent.resources.length+1);
  expect((await config.verifyCore()).newFull).toBe(0);
 });
 test('uses the same strict source-aware representative assembler with an explicit append on the latest current parent',()=>{
  const config=configure(context,catalogId),retained=config.binding.retainParentBindings!,capture=retained.capturedParent;
  const source={id:'11111111-1111-5111-8111-111111111111',source_key:config.sourceId,title_ru:config.sourceMetadata.source_title,
   authority:config.sourceMetadata.source_authority,official_url:config.sourceMetadata.official_url,artifact_sha256:config.sourceMetadata.artifact_sha256,
   effective_from:null,effective_to:null,metadata:{testOnly:true}};
  const locator={id:'22222222-2222-5222-8222-222222222222',source_id:source.id,locator_key:config.locator.key,locator:config.locator.payload,excerpt_sha256:'a'.repeat(64)};
  const input={config,newSource:source,newLocators:[locator]};
  expect(masterRetainParentBindingsOptInR1(input)).toBe(retained);
  const result=prepareMasterRetainedBindingRepresentativeR1(input,{parameters:config.parameterDefinitions,formulas:config.formulaDefinitions,
   resources:config.resourceDefinitions,newBindings:[{row_id:control,locator_id:locator.id,applicability:config.binding.applicability}],
   successorProvenance:{contract:config.contract,sourceId:config.sourceId,normId:config.normId,parentDefinitionId:capture.definition.id,
    parentBaselineId:capture.baseline.id,capturedParentSha256:retained.capturedParentSha256},
   lifecycleMetadata:{contract:config.contract,masterSha256:config.masterSha256,sourceFingerprint:'b'.repeat(64)}});
  for(const [id,sources] of Object.entries(capture.baseline.normative_source_ids))expect(result.normativeSourceIds[id]).toEqual(sources);
  expect(result.expectedNormativeBindingCount).toBe(capture.bindings.length+1);
  expect(result.sourceMetadata.retainedParentBindingContinuationV2).toEqual(capture.definition.source_metadata.retainedParentBindingContinuationV2);
  expect(result.sourceMetadata.retainedParentBindingLineageV1.entries).toHaveLength(1);
  const specs=Object.values(retained.newParameterSources);
  expect(specs.filter(s=>s.kind==='DERIVED')).toHaveLength(6);
  for(const spec of specs.filter(s=>s.kind==='DERIVED'))expect(spec).toEqual({kind:'DERIVED',sourceIds:[config.sourceId]});
  for(const spec of specs.filter(s=>s.kind==='KNOWN'))expect(spec.sourceIds.length).toBeGreaterThan(0);
 });
 test('refuses a stale parent metadata preimage rather than replacing history',()=>{
  const config=configure(context,catalogId),retained=config.binding.retainParentBindings!;
  const appendContext={capture:retained.capturedParent,capturedParentSha256:retained.capturedParentSha256,catalogId,stopCode:'CONCRETE_CONFIG_TEST'};
  const metadata=retained.capturedParent.definition.source_metadata;
  const old=metadata.retainedParentBindingContinuationV2??metadata.retainedParentBindingContinuationV1??metadata;
  expect(()=>validateMasterRetainedBindingAppendV1(appendContext,{...retained.successorProvenanceAppendV1,
   capturedPreviousSuccessorSha256:masterRetainedLineageValueSha256V1(old)})).toThrow(/PREVIOUS_SUCCESSOR_DRIFT/);
 });
});
