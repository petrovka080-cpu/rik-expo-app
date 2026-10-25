import assert from 'node:assert/strict';
import {prepareRoofFlat003006CommonR24} from './prepareRoofFlat003006CommonR24';
import {roofMasticMeshSnapshotR24,roofMasticMeshSchemaR24} from './prepareRoofMasticMeshExisting003R24';
import {buildRoofFlat003006R24} from '../../../src/lib/estimate/v4/roofFlat003006CommonR24';
import {buildRoofSingle539WholeLayersR24,roofSingle539ContractR24,roofSingle539HashR24 as hash,type Roof539LayerInputsR24} from '../../../src/lib/estimate/v4/roofSingle539WholeLayersR24';
import {roofMasticMeshControlsR24 as main} from '../../../src/lib/estimate/v4/roofMasticMeshExisting003R24';
import {roofRemaining002NativeR24} from '../../../src/lib/estimate/v4/roofMissingFlatRollWhole002R24';
import {canonicalEstimateOperationReferences} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {resolveCanonicalEstimateProfileInputsS2723} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723';
import {assertCanonicalPrimaryMeasureSelectionV1} from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import type {MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {roofSingle539FiniteCasesR24} from './roofSingle539FiniteCasesR24';
import {masterScopedNormativeRegistryCaptureSha256R1,type MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import registryScope31 from '../../../data/estimate-benchmarks/source-packs/roof-single539-exact-registry-scope31-r24.json';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';

type Json=Record<string,unknown>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
type Model=ReturnType<typeof buildRoofSingle539WholeLayersR24>;
type CoreResult=Awaited<ReturnType<typeof compileCanonicalEstimateCore>>;
export type Roof539FiniteCaseR24=Readonly<{
 name:string;input:Readonly<Json>;
 expected:Readonly<{kind:'PRELIMINARY';selectedRowIds:readonly string[];absentRowIds:readonly string[];unknownQuantityRowIds?:readonly string[];
  quantities?:readonly Readonly<{rowId:string;unitId:string;quantity:string|null}>[]}>
  |Readonly<{kind:'REJECT';code:'PARAMETER_VALIDATION_FAILED';reasonIncludes:string}>;
}>;
/** All fields are real metadata. No READY/admitted boolean can replace them.
 * A raw read path/hash records provenance; it is not authorisation. The normal
 * retainer still rereads the tuple and locks it through PRIMARY_R70. */
export type Roof539ConfigInputsR24=Readonly<{
 layers:Roof539LayerInputsR24;
 source:Readonly<{
  sourceId:string;sourceMetadata:Config['sourceMetadata'];locator:Config['locator'];
  capturedSourcePreimage:NonNullable<MasterRetainParentBindingsR1['capturedSourcePreimage']>;
  // Real RR READONLY witness only; normal/LOCKED/REGISTERED still belong to PRIMARY_R70.
  capturedScopedNormativeRegistry:MasterCapturedScopedNormativeRegistryR1;
  readEvidence:Readonly<{path:string;sha256:string}>;
  perRow:Readonly<Record<string,Readonly<{normIds:readonly string[];exactLocator:string;sourceBasisQuantity:string;sourceBasisUnitId:string}>>>;
 }>;
 evidencePaths:readonly string[];
 // One caller-owned writer preserves raw entry/result/rejection before asserts.
 record:(name:string,value:unknown)=>void;
}>;
type CompileData=Readonly<Pick<AutomaticOwnerDefinition,'parameters'|'resources'>&Pick<Model,'capture'|'formulas'>&{
 applicability:Json;
}>;
export async function compileRoofSingle539WholeLayersR24(model:CompileData,input:Readonly<Json>,onEntry:()=>void):Promise<CoreResult>{
 const c=model.capture,parameterSchema=roofMasticMeshSchemaR24(model);
 const baseline=canonicalApprovedBaselineRuntimeParameters({input_values:c.baseline.input_values,input_classification:c.baseline.input_classification});
 const profile=resolveCanonicalEstimateProfileInputsS2723({catalogId:c.definition.catalog_id,parameterSchema,sourceProfileSelectionMetadata:model.applicability.sourceProfileSelectionV1,
  confirmedParameters:baseline,effectiveUserParameters:input});
 const primary=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:model.applicability.primaryMeasureSelectionV1,parameterSchema,submittedParameters:input,confirmedParameters:profile.confirmedParameters});
 assert.equal(primary.kind,'RESOLVED');onEntry();
 return compileCanonicalEstimateCore({operation:'compile',compilerVersion:roofSingle539ContractR24,catalogId:c.definition.catalog_id,
  primaryMeasureParameterId:primary.kind==='RESOLVED'?primary.primaryMeasure.parameterId:null,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
  submittedParameters:{...input},confirmedParameters:{...profile.confirmedParameters},currencyCode:'KGS',priceItems:[],maximumResourceRows:1024,
  sourceProfileSelectionV1:{metadata:model.applicability.sourceProfileSelectionV1,effectiveUserParameters:input},hashJson:hash});
}
function legacyProjection(rows:readonly Readonly<object>[],present:ReadonlySet<string>){return rows.map(row=>{
 const next:unknown=structuredClone(row);assert(object(next));delete next.row_sha256;delete next.need_sha256;
 if(object(next.calculation_trace)&&object(next.calculation_trace.resourceGraph)){
  const op=next.calculation_trace.resourceGraph.operationCompositionV1;
  if(object(op)&&Array.isArray(op.additionalOperations)){
   const active=op.additionalOperations.filter(ref=>{assert(object(ref));if(ref.whenResourcePresent===undefined)return true;
    assert(Array.isArray(ref.whenResourcePresent)&&ref.whenResourcePresent.length>0&&ref.whenResourcePresent.every(id=>typeof id==='string'));
    return ref.whenResourcePresent.some(id=>typeof id==='string'&&present.has(id));});
   if(active.length)op.additionalOperations=active;else delete op.additionalOperations;
  }
 }return next;});}

/** Ordinary same-owner Config. The retained baseline and old arrays/bindings
 * come from the existing parent factory. No catalogAppend or alternative writer. */
export function prepareRoofSingle539WholeLayersR24(context:Parameters<typeof prepareRoofFlat003006CommonR24>[0],input:Roof539ConfigInputsR24):Config{
 const base=prepareRoofFlat003006CommonR24(context),capture=roofMasticMeshSnapshotR24(context.sourceRoot).capture;
 assert(base.binding.retainParentBindings&&base.binding.retainParentBindings.capturedSourcePreimage?.expected===null,'FIRST_ABSENCE_ROUTE_REQUIRED');
 assert(input.source.capturedSourcePreimage.expected===null&&input.source.capturedSourcePreimage.sourceKey===input.source.sourceId,'EXACT_FIRST_ABSENCE_WITNESS_REQUIRED');
 const registryColumns=registryScope31.exactRegistryColumns;
 assert.equal(input.source.sourceId,registryScope31.sourceKey,'ROOT_SELECTED_SUBJECT_KEY_REQUIRED');
 assert.equal(input.source.sourceMetadata.artifact_sha256,registryScope31.artifactSha256,'EXACT_OFFICIAL_ARTIFACT_REQUIRED');
 assert.deepEqual(input.source.locator.payload.exactColumns,registryColumns,'FULL31_LOCATOR_COLUMNS_REQUIRED');
 const capturedRegistry=input.source.capturedScopedNormativeRegistry;
 assert.equal(masterScopedNormativeRegistryCaptureSha256R1(capturedRegistry),capturedRegistry.captureSha256,'SCOPED_REGISTRY_CAPTURE_HASH_DRIFT');
 assert.equal(capturedRegistry.scope.sourceKey,input.source.sourceId,'SCOPED_REGISTRY_SOURCE_KEY_DRIFT');
 assert.equal(capturedRegistry.scope.artifactSha256,registryScope31.artifactSha256,'SCOPED_REGISTRY_ARTIFACT_DRIFT');
 assert.equal(capturedRegistry.scope.normId,registryColumns.join('/'),'EXACT31_SCOPED_REGISTRY_REQUIRED');
 assert(input.source.sourceId===input.layers.sourceKey&&input.source.sourceMetadata.artifact_sha256==='114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8');
 assert(input.source.readEvidence.path.trim()&&/^[a-f0-9]{64}$/u.test(input.source.readEvidence.sha256),'REAL_SOURCE_READ_EVIDENCE_REQUIRED');
 const model=buildRoofSingle539WholeLayersR24(buildRoofFlat003006R24(capture),{...input.layers,exactSourceBundleColumns:registryColumns});
 assert.deepEqual(model.exactNewColumns,registryScope31.newColumns,'EXACT27_NEW_COLUMNS_CHANGED');
 assert.deepEqual(model.retainedSourceColumns,registryScope31.acceptedBaseFourColumns,'EXACT4_RETAINED_SOURCE_COLUMNS_CHANGED');
 assert.deepEqual(model.exactColumns,registryColumns,'EXACT31_SOURCE_BUNDLE_COLUMNS_CHANGED');
 assert.equal(Object.keys(input.source.perRow).length,model.newNativeRowIds.length,'EXACT234_ROW_LOCATOR_MAP_REQUIRED');
 const byRow={...base.binding.applicabilityByRowId};
 for(const r of model.newNativeRows){const locator=input.source.perRow[r.row_id];assert(locator&&locator.exactLocator.trim()
  &&locator.sourceBasisQuantity.trim()&&locator.sourceBasisUnitId.trim(),'EXACT_PER_ROW_COLUMN_BASIS_REQUIRED');
  assert.deepEqual([...locator.normIds].sort(),[...(model.rowSourceColumns.get(r.row_id)??[])].sort(),'ROW_TO_NATIVE_COLUMNS_DRIFT');
  const basis=locator.normIds[0]!.startsWith('12-01-014-')||locator.normIds[0]!.startsWith('12-01-019-')?'1':'100';
  const unit=locator.normIds[0]!.startsWith('12-01-014-')?'m3':locator.normIds[0]!.startsWith('12-01-018-')?'linear_m':locator.normIds[0]!.startsWith('12-01-019-')?'t':'m2';
  assert.equal(locator.sourceBasisQuantity,basis);assert.equal(locator.sourceBasisUnitId,unit);
  byRow[r.row_id]={sourceArtifactSha256:input.source.sourceMetadata.artifact_sha256,exactColumns:locator.normIds,exactLocator:locator.exactLocator,
   sourceBasisQuantity:locator.sourceBasisQuantity,sourceBasisUnitId:locator.sourceBasisUnitId,sourceIdentityReadEvidence:input.source.readEvidence,
   publicMethodNotProjectApproval:true,fullTechnicalAcceptance:false};
 }
 const oldMap=base.passport.independentCompletenessMap;assert(oldMap&&Array.isArray(oldMap.entries)&&Array.isArray(oldMap.evidenceReferences));
 const entries=model.newNativeRows.map(r=>{const refs=canonicalEstimateOperationReferences(r.resource_graph.operationCompositionV1);assert(refs.length>0);return{
  expectedResourceId:'whole539:'+r.row_id,operationId:refs[0]!.operationId,requiredOperationIds:refs.map(x=>x.operationId),sourceId:input.source.sourceId,
  category:r.category,unitId:r.unit_id,specification:r.title_ru,condition:input.source.perRow[r.row_id]!.normIds.join('+'),quantityRule:'EXACT_NATIVE_COLUMN_AND_OWN_MEASURE_NO_OBJECT_AUTHORITY',
  formulaId:r.formula_id,resolution:{kind:'ROW',rowId:r.row_id}};});
 const remapSource=(v:unknown):unknown=>{if(v===base.sourceId)return input.source.sourceId;if(Array.isArray(v))return v.map(remapSource);
  if(object(v))return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,remapSource(x)]));return v;};
 const previousEntries=oldMap.entries.map(remapSource);
 const map={...oldMap,entries:[...previousEntries,...entries],evidenceReferences:[...oldMap.evidenceReferences,...input.evidencePaths,input.source.readEvidence.path],fullTechnicalAcceptance:false};
 const oldRetained=base.binding.retainParentBindings,knownOld=new Set(capture.parameters.map(p=>p.parameter_id));
 const newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(model.parameters.filter(p=>!knownOld.has(p.parameter_id)).map(p=>{
  const old=oldRetained.newParameterSources[p.parameter_id];
  if(old)return[p.parameter_id,{...old,sourceIds:old.sourceIds.map(id=>id===base.sourceId?input.source.sourceId:id)}];
  const unresolved=p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM';
  return[p.parameter_id,unresolved?{kind:'UNRESOLVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[input.source.sourceId]}];}));
 const retained:MasterRetainParentBindingsR1={...oldRetained,capturedSourcePreimage:input.source.capturedSourcePreimage,newParameterSources};
 const seed={[main.publicMethod]:roofRemaining002NativeR24.torchThree.systemYesRu,[main.area]:'125'};
 const config:Config={...base,contract:roofSingle539ContractR24,stopCode:'ROOF_SINGLE539_WHOLE_LAYERS_R24',applicationName:'roof-single539-whole-layers-r24',
  sourceId:input.source.sourceId,sourceMetadata:input.source.sourceMetadata,locator:input.source.locator,
  sourcePaths:[...new Set([...base.sourcePaths,...input.evidencePaths,'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts','data/estimate-benchmarks/source-packs/roof-single539-exact-registry-scope31-r24.json'])],
  normId:registryColumns.join('/'),capturedScopedNormativeRegistry:input.source.capturedScopedNormativeRegistry,
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,applicability:model.applicability,
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},shortInput:seed,acceptanceInput:seed,
  binding:{...base.binding,rowId:model.newNativeRowIds[0]!,additionalRowIds:[base.binding.rowId,...(base.binding.additionalRowIds??[]),...model.newNativeRowIds.slice(1)],applicabilityByRowId:byRow,retainParentBindings:retained},
  passport:{...base.passport,independentCompletenessMap:map,physicalResultRu:'Одна существующая плоская кровля с собственными целыми покрытиями и нижними слоями; неподтверждённые потребности сохраняются.',
   unresolvedApplicableResourceRowIds:[...new Set([...(base.passport.unresolvedApplicableResourceRowIds??[]),...model.newNativeRowIds])]},
  search:{...base.search,keyDistinguishingParameters:[main.publicMethod,main.area,...model.lowerScopes.map(s=>s.measure)],clarificationFields:[main.publicMethod,main.area,...model.lowerScopes.map(s=>s.measure)]},
  validationScenario:'ONE539_WHOLE002_014019_EXISTING6REUSE_SOURCE_AND_OBJECT_HOLDS',receiptFileStem:'roof_single539_whole_layers_r24',
  verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
   const cases=roofSingle539FiniteCasesR24(model);assert.equal(cases.length,23);
   let entered=0,results=0,rejected=0;
   for(const c of cases){let result:CoreResult|undefined,error:unknown;
    try{result=await compileRoofSingle539WholeLayersR24(model,c.input,()=>{entered++;input.record(c.name+'-entry-before-core',{entry:entered,input:c.input});});input.record(c.name+'-result-before-assert',result);}
    catch(e:unknown){error=e;input.record(c.name+'-reject-before-assert',{code:object(e)?e.code:null,message:e instanceof Error?e.message:String(e)});}
    if(c.expected.kind==='REJECT'){assert(error&&object(error));assert.equal(error.code,c.expected.code);assert(error instanceof Error&&error.message.includes(c.expected.reasonIncludes));rejected++;continue;}
    assert.ifError(error);assert(result);results++;
    const all=[...result.rows,...result.preliminaryNeeds];for(const id of c.expected.selectedRowIds)assert(all.some(r=>r.row_id===id),'WHOLE_NATIVE_ROW_MISSING:'+id);
    for(const id of c.expected.absentRowIds)assert(!all.some(r=>r.row_id===id),'MUTUALLY_EXCLUSIVE_ROW_PRESENT:'+id);
    for(const expected of c.expected.quantities??[]){const actual=all.find(r=>r.row_id===expected.rowId);assert(actual,'EXACT_NATIVE_ROW_REQUIRED:'+expected.rowId);
     assert.equal(actual.unit_id,expected.unitId,'NATIVE_UNIT_UNCHANGED:'+expected.rowId);assert.equal(actual.quantity,expected.quantity,'EXACT_NATIVE_RATE_AND_MEASURE:'+expected.rowId);}
    for(const id of c.expected.unknownQuantityRowIds??[]){const need=result.preliminaryNeeds.find(r=>r.row_id===id);assert(need&&need.quantity===null,'MISSING_GEOMETRY_IS_NOT_ZERO:'+id);}
    assert.equal(new Set(all.map(r=>r.row_id)).size,all.length,'NO_DUPLICATE_RESOURCE_OR_PAYMENT_ROW');
    for(const row of result.rows){const definition=model.resources.find(r=>r.row_id===row.row_id);assert(definition);
     if((definition.resource_graph.costTreatment??definition.source_metadata?.costTreatment)==='INFORMATIONAL_SCOPE')assert(!row.included_in_estimate&&!row.included_in_procurement,'INFO_OPERATOR_IS_NOT_SECOND_PAYMENT:'+row.row_id);}
    assert(result.preliminaryNeeds.length>0,'UNCONFIRMED_FACTS_MUST_NOT_BECOME_FULL');
    assert.equal(all.filter(r=>r.row_id===model.stockRowId).length<=1,true,'ONE_BOILER_PHYSICAL_OWNER');
   }
   const legacyInput={[main.area]:'125'};
   const before=await compileRoofSingle539WholeLayersR24({capture,parameters:capture.parameters,formulas:capture.formulas,resources:capture.resources,applicability:capture.definition.applicability},legacyInput,
    ()=>{entered++;input.record('legacy-current-v14-entry-before-core',{entry:entered,input:legacyInput});});
   input.record('legacy-current-v14-result-before-assert',before);
   const after=await compileRoofSingle539WholeLayersR24(model,legacyInput,()=>{entered++;input.record('legacy-whole539-entry-before-core',{entry:entered,input:legacyInput});});
   input.record('legacy-whole539-result-before-assert',after);
   const present=new Set([...after.rows,...after.preliminaryNeeds].flatMap(r=>[r.row_id,...(typeof r.resource_spec_id==='string'?[r.resource_spec_id]:[])]));
   input.record('legacy-conditional-operation-visibility-before-assert',{present:[...present],normalization:'ONLY row/need projection hashes and additionalOperations with nonempty whenResourcePresent and zero actual matches'});
   assert.deepEqual(legacyProjection(after.rows,present),legacyProjection(before.rows,present));
   assert.deepEqual(legacyProjection(after.preliminaryNeeds,present),legacyProjection(before.preliminaryNeeds,present));
   assert(![...after.rows,...after.preliminaryNeeds].some(r=>model.newNativeRowIds.includes(r.row_id)),'LEGACY_ABSENT_PUBLIC_METHOD_CANNOT_ACTIVATE_NEW_ROWS');results+=2;
   input.record('actual-counts-before-final-assert',{entered,results,rejected,fullTechnicalAcceptance:false,apiHttp422:'UNRUN',normalLockedPublisher:'UNRUN'});
   assert.equal(entered,25);assert.equal(results,19);assert.equal(rejected,6);
   return{status:'FINITE_ONE539_CONFIG_ONLY',actualCoreEntries:entered,completedResults:results,rejectedInputs:rejected,fullTechnicalAcceptance:false};
  }};
 assert.equal(config.catalogAppend,undefined);return config;
}
