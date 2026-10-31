import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {applyMonolithicExistingDeepAssemblyReuseR3, compileMonolithicPhysicalR2,
 monolithicPreparedModelFingerprintR2, MONOLITHIC_DEEP_REUSE_CONTROL_R3} from '../../../src/lib/estimate/v4/monolithicPhysicalProvisionMasterR2';
import {monolithicPhysicalProvisionPackR2 as physicalPack} from '../../../src/lib/estimate/v4/monolithicPhysicalProvisionR2';
import {applyMonolithicSimpleGeometryProfilesR3,MONOLITHIC_GEOMETRY_PROFILE_PACK_R3,
 MONOLITHIC_GEOMETRY_PROFILE_PACK_SHA_R3} from '../../../src/lib/estimate/v4/monolithicSimpleGeometryProfilesR3';
import {masterRetainedParentCaptureSha256R1, type MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences, type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import type {PurchaseGroupRepresentative as Rep} from './s2732PurchaseGroupOverlay';

const consumerPackPath='data/estimate-benchmarks/source-packs/monolithic-existing-deep-reuse-current-consumers-r3.json';
const consumerPackSha='80864c4da09ac82a308226016eba28f1a5b95e6579a9464ebdcc3395533d86b5';
type CaptureRecord={capture:MasterRetainedParentCaptureR1;contentPassport:Rep['passport']};
type Target={kind:string;catalogId:string;canonicalRuName:string;definitionId:string;baselineId:string;shape:[number,number,number];
 capturePath:string;captureSha256:string;aggregateCapture:boolean;consumerNeedRowIds:string[]|null;simpleGeometryParameterIds:string[]};
const consumerPack=createRequire(__filename)('../../../'+consumerPackPath) as {targets:Target[]};
const sha=(value:unknown)=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const fileSha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const masterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_14_2026-10-23.txt';
const masterSha='e24f52197dab5a1bb4bbca8d139b5b6a5c722efce6c758b3efffd6266f1d78ed';
type Context={releaseId:string;searchReleaseId:string;outputRoot:string};

/** The existing source guide distinguishes measured geometry from PPR,
 * equipment, design and norm facts. Metadata ownership changes no quantity,
 * default, constraint, formula, baseline value, or saved historical version. */
export function applyMonolithicSimpleConsumerOwnershipR3(model:Rep,geometryParameterIds:readonly string[]=[]):void {
 // All retained branches keep their measured primary identity, including an
 // old guide that called measured plan volume a norm. Inactive branches remain
 // controlled by their original visibility conditions and exact source scope.
 const primaryMeasures=(model.definition.applicability.primaryMeasureSelectionV1?.selections??[])
  .map((s:{primaryMeasureParameterId:string})=>s.primaryMeasureParameterId);
 const explicitGeometry=new Set([...geometryParameterIds,...primaryMeasures]);
 const technicalRoles=new Set(['PROJECT_DOCUMENTATION','ENGINEERING_DESIGN','SITE_SURVEY','MANDATORY_NORM_VALUE',
  'MANUFACTURER_CONFIRMED','SELECTED_EQUIPMENT_PASSPORT','SOURCE_BACKED_PRELIMINARY_PROFILE','NORM_REQUIRED_BUT_PROJECT_SELECTED']);
 const measuredRoles=new Set(['USER_SUPPLIED_PRIMARY_FACT','USER_SUPPLIED_OBJECT_FACT','USER_INPUT','USER_MEASURED','USER_OR_PROJECT_MEASURED']);
 for(const p of model.parameters){
  const t=p.truth_metadata,g=t.guide;
  if(t.visibility_role!=='USER_INPUT'||!g)continue;
  const geometry=['decimal','integer'].includes(p.value_type)
   &&(explicitGeometry.has(p.parameter_id)||g.guide_kind==='MEASUREMENT_RULE'&&measuredRoles.has(g.source_role));
  if(geometry){
   if(explicitGeometry.has(p.parameter_id))p.truth_metadata={...t,value_source_role:'USER_MEASURED',
    provenance:{...t.provenance,consumer_input_role_v1:'OBJECT_FACT'},
    guide:{...g,guide_kind:'MEASUREMENT_RULE',source_role:'USER_SUPPLIED_PRIMARY_FACT'}};
   continue;
  }
  const sourceRole=technicalRoles.has(g.source_role)?g.source_role:'PROJECT_DOCUMENTATION';
  const valueRole=technicalRoles.has(t.value_source_role)?t.value_source_role
   :p.value_type==='enum'?'SOURCE_BACKED_PRELIMINARY_PROFILE':sourceRole;
  p.truth_metadata={...t,visibility_role:'INTERNAL_ONLY',value_source_role:valueRole,
   provenance:{...t.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL',
    retained_parameter_ownership_r3:{visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,guideSourceRole:g.source_role}},
   guide:{...g,...(technicalRoles.has(g.source_role)?{}:{guide_kind:'PROJECT_DEFINED',source_role:sourceRole})}};
 }
}

/** Content configuration for the existing publisher. No DB or runtime writes on import. */
export function monolithicExistingDeepAssemblyReuseConfigR3(context:Context,catalogId:string):Config {
 const target=consumerPack.targets.find(t=>t.catalogId===catalogId);
 assert(target,'CURRENT_CAPTURED_MONOLITHIC_CONSUMER_REQUIRED');
 assert.equal(fileSha(consumerPackPath),consumerPackSha);assert.equal(fileSha(target.capturePath),target.captureSha256);
 // Read only this current consumer, without caching an entire family capture.
 const parsed=JSON.parse(readFileSync(target.capturePath,'utf8')) as CaptureRecord&{captures?:CaptureRecord[]};
 const record=target.aggregateCapture?parsed.captures?.find(r=>r.capture.definition.catalog_id===catalogId):parsed;
 assert(record,'CURRENT_CAPTURED_MONOLITHIC_RECORD_REQUIRED');
 const c=structuredClone(record.capture),passport=structuredClone(record.contentPassport);
 assert.equal(c.definition.id,target.definitionId);assert.equal(c.baseline.id,target.baselineId);
 const ids=new Map(c.resources.map(r=>[r.id,r.row_id]));
 const parent:Rep={definition:c.definition,baseline:c.baseline,passport,parameters:[...c.parameters],formulas:[...c.formulas],
  resources:[...c.resources],bindings:c.bindings.map(b=>({row_id:ids.get(b.resource_spec_id),locator_id:b.locator_id,applicability:b.applicability}))};
 const model=applyMonolithicExistingDeepAssemblyReuseR3(parent,{contract:'root-approved-existing-deep-assembly-reuse/r3',
  parentDefinitionId:c.definition.id,parentDefinitionSha256:c.definition.definition_sha256,
  preparedModelFingerprint:monolithicPreparedModelFingerprintR2(parent),
  ...(target.consumerNeedRowIds?{consumerNeedRowIds:target.consumerNeedRowIds}:{})});
 applyMonolithicSimpleConsumerOwnershipR3(model,target.simpleGeometryParameterIds);
 const geometry=applyMonolithicSimpleGeometryProfilesR3(model);
 const oldParams=new Set(c.parameters.map(p=>p.parameter_id));
 const newParams=model.parameters.filter(p=>!oldParams.has(p.parameter_id));
 const kind=target.kind;
 const sourceId='root_monolithic_existing_deep_assembly_reuse_r3:'+kind;
 const metadata=c.definition.source_metadata;
 const latest=metadata.retainedParentBindingLineageV1?.entries?.at(-1)?.successor??metadata.retainedParentBindingContinuationV2?.successor??metadata.retainedParentBindingContinuationV1?.successor??metadata.retainedParentBindingSuccessorV1;
 assert(latest,'CAPTURED_PREVIOUS_SUCCESSOR_REQUIRED');
 const retained={capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
  // This source identifies the reuse/control rule, never an external quantity norm.
  newParameterSources:Object.fromEntries(newParams.map(p=>[p.parameter_id,geometry.geometryParameterIds.includes(p.parameter_id)
   ?{kind:'KNOWN' as const,sourceIds:[...new Set(geometry.sources.map(s=>s.sourceId))]}
   :{kind:'DERIVED' as const,sourceIds:[sourceId]}])),
  capturedSourcePreimage:{sourceKey:sourceId,expected:null},
  successorProvenanceAppendV1:{contract:'master-retained-binding-append/v1' as const,capturedSourceMetadata:structuredClone(metadata),
   capturedSourceMetadataSha256:sha(metadata),capturedPreviousSuccessorSha256:sha(latest)}};
 const map=structuredClone(passport.decision.independentCompletenessMap);
 const consumerIds=target.consumerNeedRowIds??['master212:concrete-cycle:r1:need:vibrator-working-kit'];
 const operations=[...new Set(consumerIds.map(id=>c.resources.find(r=>r.row_id===id)!.resource_graph.operationCompositionV1.operationId as string))];
 for(const operationId of operations)map.entries.push({operationId,expectedResourceId:MONOLITHIC_DEEP_REUSE_CONTROL_R3,
  condition:'Existing exact deep device selected with documented quantity and compatible power; every existing part remains present.',
  sourceId:physicalPack.sourceId,formulaId:MONOLITHIC_DEEP_REUSE_CONTROL_R3+':formula',category:'control',unitId:'piece',
  requiredOperationIds:operations,resolution:{kind:'ROW',rowId:MONOLITHIC_DEEP_REUSE_CONTROL_R3}});
 map.evidenceReferences=[...new Set([...(map.evidenceReferences??[]),target.capturePath,consumerPackPath,'src/lib/estimate/v4/monolithicExistingDeepAssemblyReuseR3.test.ts'])];
 map.fullTechnicalAcceptance=false;
 const input={...structuredClone(c.baseline.input_values),...geometry.geometryInput};
 const name=target.canonicalRuName;
 const sourcePaths=[consumerPackPath,target.capturePath,'scripts/estimate/r4a13/prepareMonolithicExistingDeepAssemblyReuseR3.ts',
  'src/lib/estimate/v4/monolithicPhysicalProvisionMasterR2.ts','src/lib/estimate/v4/monolithicPhysicalProvisionR2.ts',
  'src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts',
  'src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723.ts',
  'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/parameterConstraints.ts',
  'src/lib/estimate/backendPlatform/formulaGraph.ts','src/lib/estimate/backendPlatform/inclusionGraph.ts',
  'src/lib/estimate/v4/monolithicSimpleGeometryProfilesR3.ts',MONOLITHIC_GEOMETRY_PROFILE_PACK_R3,
  'scripts/estimate/r4a13/monolithicSimpleGeometryProfilesR3.test.ts',
  'src/lib/estimate/v4/monolithicExistingDeepAssemblyReuseR3.test.ts','data/estimate-benchmarks/source-packs/monolithic-family-physical-provision-r2.json',
  ...physicalPack.sourceArtifacts.map(a=>a.path)];
 return {contract:'monolithic-existing-deep-assembly-reuse/r3',stopCode:'MONOLITHIC_EXISTING_DEEP_REUSE_R3_'+kind.toUpperCase(),
  applicationName:'monolithic-existing-deep-reuse-'+kind,expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256:masterSha,
  parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:context.outputRoot,sourcePaths,catalogId,sourceId,normId:'EXISTING_COMPLETE_DEEP_DEVICE_CONTROL_R3',
   sourceMetadata:{source_title:'Повторное использование полного комплекта глубинного уплотнения',source_authority:'Точный паспорт уже применённого устройства и существующий состав карточки',
   source_kind:'PINNED_EXISTING_ASSEMBLY_REUSE_CONTROL',official_url:physicalPack.sourceArtifacts[0]!.officialUrl,
   artifact_sha256:physicalPack.sourceArtifacts[0]!.sha256,exact_locator:'Existing IRFU45/230/5 non-GV six-part device; exact current captured monolithic consumer; reciprocal effective quantities.',
   use_restriction:'Контроль состава существующего устройства. Новых норм расхода, постов, труда, машино-часов, оплаты и закупки не добавляет. Полноту операции уплотнения не подтверждает.'},
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
  shortInput:geometry.geometryInput,
  acceptanceInput:input,runtimeProfileInput:input,
  runtimeProfileClassification:Object.fromEntries(Object.keys(input).map(id=>[id,c.baseline.input_classification[id]??'VALIDATION_FIXTURE'])),
  runtimeProfileSourceIds:Object.fromEntries(Object.keys(input).map(id=>[id,structuredClone(c.baseline.normative_source_ids[id]
   ??[...new Set(geometry.sources.map(s=>s.sourceId))])])),
  expectedParentShape:[c.parameters.length,c.formulas.length,c.resources.length],benchmarkOrdinal:0,
  validationScenario:'CURRENT_MONOLITHIC_CONSUMER_RETAINED_BASELINE_AND_EXISTING_DEEP_ASSEMBLY',
  passport:{canonicalRuName:name,workKey:catalogId.split(':').at(-1)!,physicalResultRu:passport.physical_result_ru,
   includedScopeRu:[...passport.included_scope_ru,'Шесть существующих частей глубинного устройства повторно используются операцией уплотнения с контролем фактических количеств.'],
   excludedScopeRu:passport.excluded_scope_ru,independentCompletenessMap:map,
   // This passport list identifies missing application norms. The new kit
   // check is an object-scope/effective-quantity control, retained separately
   // in the independent completeness map and canonical resource graph.
   unresolvedApplicableResourceRowIds:[...passport.decision.unresolvedResourceRowIds]},
  applicability:model.definition.applicability,
  binding:{rowId:MONOLITHIC_DEEP_REUSE_CONTROL_R3,applicability:{contract:'monolithic-existing-deep-assembly-reuse/r3',
   exactAssemblySourceSha256:physicalPack.sourceArtifacts[0]!.sha256,noNewQuantityNorm:true,noNewPaidOrPurchaseOwner:true},retainParentBindings:retained},
  locator:{key:'existing-deep-working-kit-control-'+kind+'-r3',payload:{currentParentDefinitionId:c.definition.id,currentParentBaselineId:c.baseline.id,
   currentCaptureSha256:retained.capturedParentSha256,independentCompletenessMap:map,sourceArtifact:physicalPack.sourceArtifacts[0],
   existingPhysicalRule:'Every existing component effective quantity equals the same positive documented device count.',
   derivedSourceArraysIdentifyControlRuleOnly:true,newQuantityNorm:false,newPaidOwners:0,newProcurementOwners:0,wholeOperationFull:false}},
  search:{primaryUom:'m3',canonicalNameRu:name,aliases:[name],shortScopeRu:'Сохранённые подработы монолитной конструкции и повторное использование полного глубинного устройства.',
   keyDistinguishingParameters:[],clarificationFields:[],includedBoundaries:passport.included_scope_ru,excludedBoundaries:passport.excluded_scope_ru,
   extraSearchTermsRu:'бетон монолит железобетон уплотнение',sourceProvenance:{currentParentId:c.definition.id,existingAssemblyReused:true,wholeFamilyFull:false}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_MONOLITHIC_DEEP_REUSE',receiptFileStem:'monolithic_existing_deep_reuse_'+kind,
  verifyCore:async()=>{
   assert.equal(fileSha(target.capturePath),target.captureSha256);assert.equal(fileSha(consumerPackPath),consumerPackSha);assert.equal(fileSha(masterPath),masterSha);
   assert.equal(fileSha(MONOLITHIC_GEOMETRY_PROFILE_PACK_R3),MONOLITHIC_GEOMETRY_PROFILE_PACK_SHA_R3);
   for(const source of geometry.sources)assert(c.normativeSources.some(s=>s.source_key===source.sourceId&&s.artifact_sha256===source.artifactSha256),
    'SOURCE_PROFILE_REQUIRES_EXACT_ALREADY_REGISTERED_SOURCE');
   for(const artifact of physicalPack.sourceArtifacts)assert.equal(fileSha(artifact.path),artifact.sha256);
   assert.equal(newParams.length,6+geometry.geometryParameterIds.filter(id=>!oldParams.has(id)).length);assert.equal(model.resources.length,c.resources.length+1);
   assert.deepEqual(model.formulas.slice(0,c.formulas.length),c.formulas);
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
   const before=await compileMonolithicPhysicalR2(parent,{}, {},undefined,structuredClone(c.baseline.input_values));
   const after=await compileMonolithicPhysicalR2(model,geometry.geometryInput, {},undefined,input);
   const view=(result:typeof before)=>({rows:result.rows.map(r=>[r.row_id,r.quantity,r.unit_price,r.amount,r.included_in_estimate,r.included_in_procurement]),
    needs:result.preliminaryNeeds.map(n=>[n.row_id,n.quantity,n.need_state,n.missing_parameter_ids]),totals:result.totals});
   assert.deepEqual(view(after),view(before));
   return {status:'CURRENT_CAPTURE_BASELINE_AND_INDEPENDENT_REUSE_BINDINGS_VERIFIED',currentDefinitionId:c.definition.id,
    existingPartsReused:6,newQuantityNorms:0,newPaidOwners:0,newPurchaseOwners:0,newFull:0};
  }};
}
export const monolithicExistingDeepAssemblyReuseTargetsR3=consumerPack.targets.map(r=>r.catalogId);
