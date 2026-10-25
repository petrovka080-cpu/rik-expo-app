import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareInteriorWallFinishingExistingPaintDraftR502 as draft,prepareInteriorWallFinishingExistingPaintR502 as prepare,
 readInteriorWallFinishPinnedParentR502 as fixture,interiorWallFinishStagedBundleR502 as bundle,interiorWallFinishBundleShaR502 as bundleSha,
 interiorWallFinishBundlePathR502 as bundlePath} from './prepareInteriorWallFinishingExistingPaintR502';
import {interiorWallFinishingGroupPackR502 as subject,interiorWallCementParameterR502 as p,interiorWallCementRowR502 as r} from '../../../src/lib/estimate/v4/interiorWallFinishingGroupR502';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {isCanonicalEstimateConsumerSuppliedParameter,isCanonicalEstimateVisibleReplaceableProfile,
 isCanonicalEstimateVisibleUserResourceSelectionParameter} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';
import {resolveCanonicalParameterVisibility} from '../../../src/lib/estimate/canonicalParameters/canonicalParameterCore';
import type {CanonicalEstimateCatalogItem} from '../../../src/lib/estimate/backendPlatform/contracts';
import {validateIndependentCompletenessMapReferences,resolveMasterSingleDefinitionBindingRowIds,resolveMasterSingleDefinitionBindingApplicabilityByRowId} from './prepareMasterSingleDefinitionSuccessorR1';
type Json=Record<string,any>;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));

it('R623 paint-only fixture pins the whole parent and has no protected snapshot or invented source UUID',()=>{
 const f=fixture(),before=JSON.stringify(f),d=draft(f.parent.capturedParent);
 assert.equal(f.parent.capturedParentSha256,'a255a548b3c42fc9ee9cf4135b414e650d0c41c4e0130067e6f7d61d5ea39abe');
 assert.equal(f.producerCaptureSha256,'4bb8980f7fba6bf6d015388964787a4876b9fefb49617ac3fea5748c4e0d3124');
 assert.equal(f.protectedSnapshotCopied,false);assert(!Object.hasOwn(f,'protectedSnapshot'));
 assert.equal(createHash('sha256').update(readFileSync(bundlePath)).digest('hex'),bundleSha);
 assert.equal(bundle.primaryEvidence.length,6);for(const e of bundle.primaryEvidence)assert.equal(createHash('sha256').update(readFileSync(e.path)).digest('hex'),e.sha256);
 assert.equal(bundle.noDatabaseUuidClaimed,true);assert.equal(JSON.stringify(f),before);
 assert(!Object.hasOwn(d.binding.retainParentBindings,'legacyTemplateAssumptionSources'));
 assert(!Object.hasOwn(d.binding.retainParentBindings,'legacyCapturedFixtureSources'));
});

it('keeps170 parameters,116 formulas,116 old resources, old bindings and every payment/price-route identity unchanged apart from allowed gates',()=>{
 const f=fixture(),c=f.parent.capturedParent,d=draft(c);
 assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[185,151,151]);
 assert.deepEqual(d.parameters.map(parameter=>parameter.ordinal),Array.from({length:185},(_,index)=>index),
  'The persisted publisher reads parameters by ordinal; an unordered parent capture must not reorder the plan');
 assert.equal(d.newParameters.length,15);assert.equal(d.newResources.length,35);
 assert.deepEqual(d.formulas.slice(0,116),c.formulas);
 for(const old of c.parameters){const next=d.parameters.find(v=>v.parameter_id===old.parameter_id)!;
  assert.equal(next.parameter_id,old.parameter_id);assert.equal(next.ordinal,old.ordinal);assert.equal(next.unit_id,old.unit_id);
  assert.equal(next.value_type,old.value_type);assert.equal(next.default_value,old.default_value);
  assert.deepEqual(next.truth_metadata,{...old.truth_metadata,visible_when:{kind:'literal',value:false}});
  assert.deepEqual(next.constraints_json,{...old.constraints_json,requiredWhen:{kind:'literal',value:false}});
 }
 for(const old of c.resources){const next=d.resources.find(v=>v.row_id===old.row_id)!;
  for(const key of ['id','row_id','ordinal','unit_id','formula_id','category','row_type','cost_owner_id','semantic_owner','procurement_eligible','resource_graph','source_metadata'])assert.deepEqual(next[key],old[key],key);
  assert.deepEqual(next.inclusion_ast,{kind:'and',operands:[{kind:'literal',value:false},old.inclusion_ast]});
 }
 assert.deepEqual(d.binding.retainParentBindings.capturedParent.bindings,c.bindings);
 assert.deepEqual(d.binding.retainParentBindings.capturedParent.normativeSources,c.normativeSources);
 assert.deepEqual(d.binding.retainParentBindings.capturedParent.normativeLocators,c.normativeLocators);
 assert.deepEqual(f.parent.priceBindings,fixture().parent.priceBindings);
 for(const next of d.resources){const{row_sha256,...body}=next;assert.equal(row_sha256,estimateDeterministicHash(body));}
 const oldIds=new Set(c.parameters.map((v:Json)=>v.parameter_id));
 for(const formula of d.formulas.slice(116))assert(formula.input_parameter_ids.every((id:string)=>!oldIds.has(id)),'old baseline is never a new norm');
});

it('retains all95 baseline values,170classes and170 exact source arrays; fresh runtime never inherits a validation fixture as a new fact',()=>{
 const f=fixture(),c=f.parent.capturedParent,config=prepare(),d=draft(c);
 assert.equal(Object.keys(c.baseline.input_values).length,95);assert.equal(Object.keys(c.baseline.input_classification).length,170);
 for(const [id,value]of Object.entries(c.baseline.input_values))assert.deepEqual(config.acceptanceInput[id],value,id);
 for(const [id,classification]of Object.entries(c.baseline.input_classification)){
  assert.equal(config.runtimeProfileClassification?.[id]??'VALIDATION_FIXTURE',classification,id);
  if(classification!=='VALIDATION_FIXTURE'){
   assert.deepEqual(config.runtimeProfileInput?.[id],c.baseline.input_values[id],id);
   assert.deepEqual(config.runtimeProfileSourceIds?.[id],c.baseline.normative_source_ids[id],id);
  }else assert(!Object.hasOwn(config.runtimeProfileInput??{},id));
 }
 assert.deepEqual(d.oldBaselineSourceArrays,c.baseline.normative_source_ids);
 assert.equal(Object.keys(d.oldBaselineSourceArrays).length,170);
 assert.equal(d.parameters.find(v=>v.parameter_id===p(subject.areaId))?.default_value,null);
 assert(!Object.hasOwn(config.runtimeProfileInput??{},p(subject.areaId)));
 assert(!Object.hasOwn(config.runtimeProfileInput??{},p(subject.puttyThicknessId)));
});

it('one hidden structural technology exposes exactly4 actual editor-admitted facts, with one static measured primary area',()=>{
 const d=draft(fixture().parent.capturedParent),config=prepare(),selector=d.parameters.find(v=>v.parameter_id===bundle.selectorId)!;
 assert.equal(selector.truth_metadata.visibility_role,'INTERNAL_ONLY');assert.deepEqual(selector.constraints_json.values,[bundle.selectedTechnology]);
 assert.equal(config.runtimeProfileInput?.[bundle.selectorId],bundle.selectedTechnology);
 assert.equal(config.runtimeProfileClassification?.[bundle.selectorId],'RUNTIME_STRUCTURAL_DEFAULT');
 assert.equal(config.applicability.primaryMeasureParameterId,p(subject.areaId));assert(!Object.hasOwn(config.applicability,'primaryMeasureSelectionV1'));
 const schema=d.parameters.map(param=>{const t=param.truth_metadata,g=t.guide??{};return{parameterId:param.parameter_id,titleRu:param.title_ru,valueType:param.value_type,
  required:param.required,unitId:param.unit_id,defaultValue:param.default_value,constraints:param.constraints_json,semanticParameterKey:t.semantic_parameter_key,
  visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,
  visibleWhen:t.visible_when,requiredWhen:t.required_when,guide:{guideKind:g.guide_kind,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,
   sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideVersion:g.guide_version}} as CanonicalEstimateCatalogItem['parameterSchema'][number];});
 const admitted=schema.filter(v=>isCanonicalEstimateConsumerSuppliedParameter(v)||isCanonicalEstimateVisibleReplaceableProfile(v)||isCanonicalEstimateVisibleUserResourceSelectionParameter(v));
 const visible=admitted.filter(v=>resolveCanonicalParameterVisibility({kind:'INCLUSION_GRAPH',ast:(v.visibleWhen??{kind:'literal',value:true}) as Json},new Map(Object.entries(d.runtimeProfileInput)))===true);
 assert.deepEqual(visible.map(v=>v.parameterId).sort(),d.ordinaryParameterIds.sort());assert.equal(visible.length,4);
});

it('four cost-owner bindings share one composite locator;35independent obligations and traces separate registered bundle identity from primary evidence keys',async()=>{
 const config=prepare(),d=draft(fixture().parent.capturedParent);
 assert.equal(d.completenessMap.entries.length,35);assert.equal(d.completenessMap.generatedFromCurrentRows,false);
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:d.completenessMap,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
 const cardinalityOnly=['ONE_LOCATOR_CARDINALITY_NOT_A_DATABASE_UUID'];
 assert.deepEqual([...resolveMasterSingleDefinitionBindingRowIds({binding:config.binding},d.resources,cardinalityOnly)].sort(),bundle.paidOwnerKeys.map(key=>r(key)).sort());
 assert.equal(Object.keys(resolveMasterSingleDefinitionBindingApplicabilityByRowId({binding:config.binding},d.resources,cardinalityOnly)).length,4);
 for(const row of d.newResources){const trace=row.source_metadata.normativeTrace;assert.equal(trace.length,1);assert.equal(trace[0].sourceId,bundle.sourceKey);
  assert.equal(trace[0].sourceSnapshotHash,bundleSha);assert(bundle.primaryEvidence.some(e=>e.id===trace[0].primaryEvidenceKey&&e.sha256===trace[0].primaryArtifactSha256));}
 const sources=d.binding.retainParentBindings.newParameterSources;assert.equal(Object.keys(sources).length,15);
 assert.equal(Object.values(sources).filter(s=>s.kind==='DERIVED'&&s.sourceIds.length===0).length,3);
 assert(!config.catalogAppend);assert.equal(config.sourceMetadata.official_url,null);assert.equal(config.sourceMetadata.artifact_sha256,bundleSha);
});

it('source/capture tampering fails before publication; selected quantitative examples run through the existing core without old rows',async()=>{
 const c=clone(fixture().parent.capturedParent);c.baseline.input_values[Object.keys(c.baseline.input_values)[0]!] = 'FORGED';
 assert.throws(()=>draft(c),/EXACT_R623_PARENT_SHA/);
 const result=await prepare().verifyCore();assert.equal(result.status,'PASS_STAGED_EXISTING_PAINT_FINISH_SELECTED_CORE');
 assert.equal(result.ordinaryObjectFacts,4);assert.equal(result.engineeringAcceptance,false);assert.equal(result.published,false);
});
