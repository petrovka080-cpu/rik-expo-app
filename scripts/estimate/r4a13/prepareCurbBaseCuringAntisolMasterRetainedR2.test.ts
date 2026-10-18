// Prospective actual-capture factory checks. NOT_RUN by author; no PG or writer.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareCurbBaseCuringAntisolMasterDraftR2,assertCurbCuringAcceptedCurrentCaptureR2,
 assertCurbCuringRootDecisionAndParentSealR2,curbCuringCapturePathR2,curbCuringGuardPathR2,
 curbCuringBindingsPathR2,curbCuringParentShaR2,curbCuringBindingOriginShaR2,
 curbCuringCaptureShaR2,curbCuringRoadContextR2,curbCuringNewParameterSourcesR2} from './prepareCurbBaseCuringAntisolMasterRetainedR2';
import {prepareMasterRetainedBindingRepresentativeR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterExistingNormativeRegistryReuseR1,assertMasterExistingNormativeRegistrySnapshotR1,resolveMasterSingleDefinitionLocatorExcerptSha256R1} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {graniteKerbCementAcceptanceInputR1} from './prepareGraniteKerbCementColumn03AppendR1';
import {curbBaseCuringControlFactsR1,curbBaseCuringMaterialPackR1 as pack} from '../../../src/lib/estimate/v4/curbBaseCuringAntisol250wCompletionR1';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
const read=JSON.parse(readFileSync(curbCuringCapturePathR2,'utf8')),guard=JSON.parse(readFileSync(curbCuringGuardPathR2,'utf8'));
const witness=JSON.parse(readFileSync(curbCuringBindingsPathR2,'utf8')),d=prepareCurbBaseCuringAntisolMasterDraftR2();
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
const representative=(next:any={})=>prepareMasterRetainedBindingRepresentativeR1(d.guardInput,{parameters:d.next.parameters,formulas:d.next.formulas,
 resources:d.next.resources,newBindings:d.newBindings,successorProvenance:{testOnly:true},lifecycleMetadata:{contract:'test-only'},...next});
const compile=(p:Record<string,unknown>,rowOverrides:any={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,
 compilerVersion:pack.contract,primaryMeasureParameterId:'kerb_length_m',parameterDefinitions:[...d.next.parameters],formulaDefinitions:[...d.next.formulas],
 resourceDefinitions:[...d.next.resources],submittedParameters:p,confirmedParameters:{},currencyCode:'KGS',priceItems:[],rowOverrides,
 maximumResourceRows:34,hashJson:async v=>estimateDeterministicHash(v)});
const facts=()=>({...graniteKerbCementAcceptanceInputR1(),...curbBaseCuringControlFactsR1('49')});
const owner=pack.materialRows.owner,need=pack.completionNeedRowId;
const manual={kind:'manual',reason:'QA_CONTROL_ONLY not a source price or productivity'};
it('pins a closed actual 19-set capture and exact existing registry, not a prior draft fixture',()=>{
 expect(()=>assertCurbCuringAcceptedCurrentCaptureR2(read,guard,witness)).not.toThrow();
 expect(Object.keys(read.sets)).toHaveLength(19);expect(read.publisherEightComparison.priceBindings).toBe(0);
 expect(d.source.created_at).toBe('2026-10-11T16:33:01.026081+05:00');expect(d.locator.excerpt_sha256).toBe('41479c65d08ca7ea6864a38f04839bc2cc17dc70c0d79b71181b588cd49779a2');
});
it('retains all full50/27/27 actual rows and physical IDs exactly',()=>{
 expect([d.next.parameters.length,d.next.formulas.length,d.next.resources.length]).toEqual([69,34,34]);
 expect(d.next.parameters.slice(0,50)).toEqual(read.capturedParent.parameters);expect(d.next.formulas.slice(0,27)).toEqual(read.capturedParent.formulas);
 expect(d.next.resources.slice(0,27)).toEqual(read.capturedParent.resources);expect(d.capture).toEqual(read.capturedParent);
});
it('assembles exactly21old+2new links, with source-aware row/locator/applicability',()=>{
 const expected=d.capture.bindings.map(b=>({row_id:d.capture.resources.find(r=>r.id===b.resource_spec_id)!.row_id,locator_id:b.locator_id,applicability:b.applicability}));
 expect(d.assembled.bindings.slice(0,21)).toEqual(expected);expect(d.assembled.bindings.slice(21)).toEqual(d.newBindings);
 expect(d.newBindings.map((b:any)=>b.row_id)).toEqual(witness.newBindingRows);expect(d.assembled.expectedNormativeBindingCount).toBe(23);
 expect(d.newBindings.every((b:any)=>b.locator_id===d.locator.id)).toBe(true);
});
it('preserves all50 historic source arrays and adds exact19 explicit arrays with only one reciprocal DERIVED[]',()=>{
 for(const[k,v]of Object.entries(d.capture.baseline.normative_source_ids))expect(d.assembled.normativeSourceIds[k]).toEqual(v);
 const m=curbCuringNewParameterSourcesR2();expect(Object.keys(m)).toHaveLength(19);expect(Object.values(m).filter(x=>x.kind==='DERIVED')).toHaveLength(1);
 for(const p of d.next.parameters.slice(50)){const spec=m[p.parameter_id];expect(spec).toBeDefined();expect(d.assembled.normativeSourceIds[p.parameter_id]).toEqual(spec.sourceIds);
  if(spec.kind==='DERIVED'){expect(spec.sourceIds).toEqual([]);expect(p.truth_metadata.value_source_role).toBe('COMPILER_DERIVED_RESOURCE_QUANTITY');expect(p.truth_metadata.effective_resource_quantity_v1).toEqual({sourceRowId:owner,unitId:'l'});}
  else expect(spec).toEqual({kind:'KNOWN',sourceIds:[pack.materialSourceId]});}
});
it('leaves all six old needs and109h unchanged, adds no price or labour/machine owner',()=>{
 expect(d.next.resources.filter(r=>r.category==='labor'||r.category==='equipment')).toEqual(d.capture.resources.filter(r=>r.category==='labor'||r.category==='equipment'));
 expect(d.next.resources.find(r=>r.row_id===need)).toEqual(d.capture.resources.find(r=>r.row_id===need));
 expect(d.next.resources.slice(27).filter(r=>r.procurement_eligible).map(r=>r.row_id)).toEqual([owner]);expect(d.oldPassport.decision.unresolvedResourceRowIds).toHaveLength(6);
 expect(d.assembled.bindings.some(b=>b.row_id===need)).toBe(false);expect(d.next.runtimeInput).toEqual({});
});
it('uses explicit historical JSON-locator hash kind, original registry contract, and zero source writes',async()=>{
 expect(d.binding.reuseExistingNormativeRegistry.locatorExcerptHashKind).toBe('CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1');
 expect(d.binding.reuseExistingNormativeRegistry.source).toEqual(witness.sourceFullRow);expect(d.binding.reuseExistingNormativeRegistry.locators).toEqual([witness.locatorFullRow]);
 const proof=await d.verifyCore();expect(proof.registryRowsToWrite).toBe(0);expect(proof.priceBindings).toBe(0);expect(proof.publicationPerformed).toBe(false);
});
it('existing Master excerpt resolver uses historical JSON rule while honest exact_locator stays textual',()=>{
 const input={...d.guardInput.config,locator:{key:d.locator.locator_key,payload:d.locator.locator},sourceMetadata:{source_title:d.source.title_ru,
 source_authority:d.source.authority,exact_locator:d.locator.locator.facts.locatorRu,use_restriction:d.source.metadata.useRestriction}};
 expect(resolveMasterSingleDefinitionLocatorExcerptSha256R1(input)).toBe(d.locator.excerpt_sha256);
 expect(createHash('sha256').update(input.sourceMetadata.exact_locator).digest('hex')).not.toBe(d.locator.excerpt_sha256);
});
it('retains original sourceId/normId/domain provenance and full source/locator rows',()=>{
 const old=d.capture.definition.source_metadata,now=d.assembled.sourceMetadata;
 for(const[k,v]of Object.entries(old))if(!['contract','masterSha256','sourceFingerprint'].includes(k))expect(now[k]).toEqual(v);
 expect(now.sourceId).toBe('KRER27_2015_GRANITE_KERB_1GP_CEMENT_270201003');expect(now.normId).toBe('27-02-010-03');
 expect(d.capture.normativeSources).toEqual(read.capturedParent.normativeSources);expect(d.capture.normativeLocators).toEqual(read.capturedParent.normativeLocators);
 expect(d.binding.reuseExistingNormativeRegistry.source.metadata.contract).toBe('rik-expo-app.s27-63.concrete-curing-antisol-material-series.v1');
});
it('new binding cannot attach the Antisol locator to an old curb resource',()=>{
 expect(()=>representative({newBindings:[{row_id:d.capture.resources[0].row_id,locator_id:d.locator.id,applicability:{badScope:true}}]})).toThrow(/RETAIN_NEW_BINDING_MUST_USE_NEW_ROW_AND_SOURCE/);
});
it('full completeness map retains original27 plus7 material/control declarations',()=>{
 const old=JSON.parse(read.sets['publisher-passport'].rawRows[0]).decision.independentCompletenessMap;
 expect(d.completenessMap.entries.slice(0,27)).toEqual(old.entries);expect(d.completenessMap.entries).toHaveLength(34);
});
it('actual full-row compiler computes measured49m2→10L/19L, not an area from100m or3.9m3',async()=>{
 const r=await compile(facts());expect(r.rows.find(x=>x.row_id===pack.materialRows.consumed)?.quantity).toBe('10');
 expect(r.rows.find(x=>x.row_id===owner)).toMatchObject({quantity:'19',unit_price:null,amount:null});
 expect(r.rows.find(x=>x.row_id==='granite-kerb:1gp-cement-pavement:whole-labor')?.quantity).toBe('109');expect(r.preliminaryNeeds.some(x=>x.row_id===need)).toBe(true);
});
it('full-row no-selection path leaves material absent and original need open',async()=>{
 const r=await compile(graniteKerbCementAcceptanceInputR1());expect(r.rows.find(x=>x.row_id===owner)).toBeUndefined();expect(r.preliminaryNeeds.some(x=>x.row_id===need)).toBe(true);
});
it('CONTROL77 prices only separate19L owner and excludes it without closing umbrella need',async()=>{
 const priced=await compile(facts(),{[owner]:{unitPrice:'77',provenance:manual}});expect(priced.rows.find(x=>x.row_id===owner)).toMatchObject({quantity:'19',unit_price:'77',amount:'1463'});
 const excluded=await compile(facts(),{[owner]:{includedInEstimate:false,includedInProcurement:false,provenance:manual}});
 expect(excluded.rows.find(x=>x.row_id===owner)).toMatchObject({included_in_estimate:false,included_in_procurement:false});expect(excluded.preliminaryNeeds.some(x=>x.row_id===need)).toBe(true);
});
it.each(['0','1'])('actual full-row oldneed manual%s cannot become a paid norm',async quantity=>{
 await expect(compile(facts(),{[need]:{quantity,unitPrice:'77',provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it.each(['covered','bonding','smooth'])('rejects incompatible explicit%s scope in actual full-row compiler',async key=>{
 const changes:Record<string,Record<string,string>>={covered:{curb_curing_surface_scope:'COVERED_BASE'},bonding:{curb_curing_future_interface:'FUTURE_BONDING'},smooth:{curb_curing_surface_finish:'SMOOTH'}};
 await expect(compile({...facts(),...changes[key]})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(['status','openConnection','registryMissing','registryDrift','guardOpen'])('rejects%scapture admission damage',kind=>{
 const r=clone(read),g=clone(guard);if(kind==='status')r.status='PARTIAL';if(kind==='openConnection')r.connectionClosed=false;
 if(kind==='registryMissing')r.antisolNormalPreimage.disposition='BOTH_ABSENT';if(kind==='registryDrift')r.antisolNormalPreimage.sourceRows[0].created_at='2026-10-11T11:33:01.026081Z';
 if(kind==='guardOpen')g.remainingOwnedProcesses=[{pid:1}];expect(()=>assertCurbCuringAcceptedCurrentCaptureR2(r,g,witness)).toThrow();
});
it.each(['formula','boundUnit','boundPayment','oldSource','oldParameter'])('retention helper refuses%s drift on actual captured rows',kind=>{
 const n={parameters:clone(d.next.parameters),formulas:clone(d.next.formulas),resources:clone(d.next.resources)};
 if(kind==='formula')n.formulas[0].expression_source='0';const b=d.capture.resources.find(r=>d.capture.bindings.some(x=>x.resource_spec_id===r.id))!;
 if(kind==='boundUnit')n.resources.find(r=>r.row_id===b.row_id)!.unit_id='pcs';
 if(kind==='boundPayment')n.resources.find(r=>r.row_id===b.row_id)!.resource_graph.costTreatment='INFORMATIONAL_SCOPE';
 if(kind==='oldSource')n.resources.find(r=>r.row_id===b.row_id)!.source_metadata={wrongSource:true};
 if(kind==='oldParameter')n.parameters=n.parameters.filter(p=>p.parameter_id!=='kerb_length_m');
 expect(()=>representative(n)).toThrow(/STOP_CURB03_ANTISOL_MATERIAL_RETAINED_R2_RETAIN_/);
});
it.each(['missingKey','extraKey','unjustifiedEmpty'])('explicit newsource map refuses%s instead of fake closure',kind=>{
 const gi=clone(d.guardInput),map={...gi.config.binding.retainParentBindings.newParameterSources};
 gi.config.binding.retainParentBindings={...gi.config.binding.retainParentBindings,newParameterSources:map};
 if(kind==='missingKey')delete map.exposed_curing_surface_area_m2;if(kind==='extraKey')map.not_declared={kind:'KNOWN',sourceIds:[pack.materialSourceId]};
 if(kind==='unjustifiedEmpty')map.exposed_curing_surface_area_m2={kind:'KNOWN',sourceIds:[]};
 expect(()=>prepareMasterRetainedBindingRepresentativeR1(gi,{parameters:d.next.parameters,formulas:d.next.formulas,resources:d.next.resources,newBindings:d.newBindings,successorProvenance:{testOnly:true}})).toThrow(/RETAIN_NEW_/);
});
it.each(['absentSource','wrongTimestamp','locatorPayload'])('existing-registry snapshot rejects%s',kind=>{
 const managed=clone(d.guardInput.newSource),locators=clone(d.guardInput.newLocators);
 const resolved=resolveMasterExistingNormativeRegistryReuseR1({config:d.guardInput.config,newSource:{...managed,metadata:{...managed.metadata,contract:'test-only-successor'}},newLocators:locators});expect(resolved).not.toBeNull();
 const actual={newSources:[clone(d.source)],newLocators:[clone(d.locator)]};if(kind==='absentSource')actual.newSources=[];
 if(kind==='wrongTimestamp')actual.newSources[0].created_at='2026-10-11T11:33:01.026081Z';if(kind==='locatorPayload')actual.newLocators[0].locator.approximate=false;
 expect(()=>assertMasterExistingNormativeRegistrySnapshotR1(resolved,actual)).toThrow(/EXISTING_REGISTRY_FULL_EXISTING_/);
});
// Pure schema fixtures only: these UUIDs are test labels, never proposed releases.
const syntheticSeal=()=>({status:'ROOT_VERIFIED_POST_MANUAL_TRENCH_CURB03_PARENT_SEAL_R1',predecessorRoadContext:curbCuringRoadContextR2,
 captureResultSha256:curbCuringCaptureShaR2,curbCapturedParentSha256:curbCuringParentShaR2,fullBindingOriginSha256:curbCuringBindingOriginShaR2,
 publisherPayloadSha256:'711eb51058c5160e6a2a017b9c5c52974d9ecbc69f31dea8c5cebf4455aab0ca',
 executionContext:{sourceHead:'a'.repeat(40),recordedReleaseSourceCommit:'b'.repeat(40),definitionReleaseId:'aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa',searchReleaseId:'bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb'},
 manualTrenchApplyCommittedOnce:true,readOnlyComparisonClosed:true,unchangedCurbParentCompared:true,pointerCompared:true,allOwnedProcessesClosed:true,automaticRebaseAllowed:false,
 currentManifestAnchor:{release_id:'aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa',catalog_id:pack.catalogId,definition_version_id:pack.parentDefinitionId,approved_template_baseline_id:pack.parentBaselineId,definition_hash:'227427bd1b3cf32a104d4575c05c7b652e7f35021933e68596d74e29784b1475'},
 curbAnchor:{definitionId:pack.parentDefinitionId,baselineId:pack.parentBaselineId,definitionSha256:'227427bd1b3cf32a104d4575c05c7b652e7f35021933e68596d74e29784b1475'},
 applyResultPin:{testOnly:true},closedGuardPin:{testOnly:true},readbackPin:{testOnly:true},pointerPin:{testOnly:true}});
const syntheticDecision=()=>({status:'ROOT_REVIEWED_CURB03_ANTISOL_MATERIAL_REPLACE_RETAIN21_ADD2_R2',catalogId:pack.catalogId,captureSha256:curbCuringParentShaR2,
 captureResultSha256:curbCuringCaptureShaR2,fullBindingOriginSha256:curbCuringBindingOriginShaR2,sharedExistingRegistryHistoricalExcerptChecked:true,
 retainedAndNewBindings:[21,2],oldWholeLaborUnchanged:true,originalSixNeedsRemainOpen:true,fullTechnicalAcceptance:false,published:false,newCatalogIds:0});
it('requires explicit checked post-trench parent seal; no silentROAD rebind',()=>{expect(()=>assertCurbCuringRootDecisionAndParentSealR2(syntheticDecision(),syntheticSeal())).not.toThrow();});
it.each(['nullFuturePair','oldRoadPair','changedCurb','closedNeed','unreviewedExcerpt'])('root admission refuses%s',kind=>{
 const r:any=syntheticDecision(),s:any=syntheticSeal();if(kind==='nullFuturePair')s.executionContext.definitionReleaseId=null;
 if(kind==='oldRoadPair')s.executionContext.definitionReleaseId=curbCuringRoadContextR2.definitionReleaseId;
 if(kind==='changedCurb')s.curbCapturedParentSha256='0'.repeat(64);if(kind==='closedNeed')r.originalSixNeedsRemainOpen=false;if(kind==='unreviewedExcerpt')r.sharedExistingRegistryHistoricalExcerptChecked=false;
 expect(()=>assertCurbCuringRootDecisionAndParentSealR2(r,s)).toThrow();
});
