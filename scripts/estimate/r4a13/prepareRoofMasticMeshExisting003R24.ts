import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildRoofMasticMeshExisting003R24 as build,roofMasticMeshPackR24 as pack,roofMasticMeshProfilesR24 as profiles,
 roofMasticMeshControlsR24 as controls,roofMasticMeshPostRowR24,roofMasticMeshIndependentMapEntriesR24,
 type RoofMasticMeshCurrentCaptureR24} from '../../../src/lib/estimate/v4/roofMasticMeshExisting003R24';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {resolveCanonicalEstimateProfileInputsS2723} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723';
import {assertCanonicalPrimaryMeasureSelectionV1} from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput as CoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {masterRetainedParentCaptureSha256R1,masterRetainedLineageValueSha256V1 as valueSha,
 type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
type Json=Record<string,unknown>;
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
type Snapshot=Readonly<{capture:RoofMasticMeshCurrentCaptureR24&MasterRetainedParentCaptureR1;contentPassport:Json;membership:Json;publicIdentity:Json}>;
function snapshotShape(v:unknown):v is Snapshot{
 if(!record(v)||!record(v.capture))return false;const c=v.capture;
 return record(c.definition)&&record(c.baseline)
  &&['parameters','formulas','resources','bindings','normativeSources','normativeLocators'].every(k=>{const rows=c[k];return Array.isArray(rows)&&rows.every(record);})
  &&record(v.contentPassport)&&record(v.membership)&&record(v.publicIdentity);
}
export function roofMasticMeshSnapshotR24(sourceRoot='.'){
 const b=readFileSync(resolve(sourceRoot,pack.currentParent.capturePath));
 assert.equal(createHash('sha256').update(b).digest('hex'),pack.currentParent.captureSha256,'CURRENT_PARENT_FILE_BYTES_DRIFT');
 const v:unknown=JSON.parse(b.toString('utf8').replace(/^\uFEFF/u,''));assert(snapshotShape(v),'FULL_RAW_PARENT_REQUIRED');
 assert.equal(v.capture.definition.id,pack.currentParent.definitionId);assert.equal(v.capture.definition.definition_sha256,pack.currentParent.definitionSha256);
 assert.equal(v.membership.definition_version_id,pack.currentParent.definitionId);assert.equal(v.publicIdentity.catalog_id,pack.currentParent.catalogId);
 return v;
}
export function roofMasticMeshSchemaR24(model:Readonly<{parameters:RoofMasticMeshCurrentCaptureR24['parameters'];formulas:RoofMasticMeshCurrentCaptureR24['formulas']}>):NonNullable<Parameters<typeof resolveCanonicalEstimateProfileInputsS2723>[0]['parameterSchema']>{
 return model.parameters.map(p=>{const t=p.truth_metadata;assert(typeof t.visibility_role==='string'&&typeof t.value_source_role==='string');
  return{parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,defaultValue:p.default_value,constraints:p.constraints_json??undefined,
   visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:record(t.provenance)?t.provenance:undefined,
   formulaConsumers:model.formulas.filter(f=>f.input_parameter_ids.includes(p.parameter_id)).map(f=>f.formula_id)};});
}
export function roofMasticMeshProfileR24(model:ReturnType<typeof build>,input:Readonly<Record<string,unknown>>){
 return resolveCanonicalEstimateProfileInputsS2723({catalogId:pack.currentParent.catalogId,parameterSchema:roofMasticMeshSchemaR24(model),
  sourceProfileSelectionMetadata:model.applicability.sourceProfileSelectionV1,
  confirmedParameters:canonicalApprovedBaselineRuntimeParameters({input_values:model.capture.baseline.input_values,input_classification:model.capture.baseline.input_classification}),effectiveUserParameters:input});
}
export async function compileRoofMasticMeshExisting003R24(model:ReturnType<typeof build>,input:Readonly<Record<string,unknown>>,
 onEntry?:()=>void):Promise<Awaited<ReturnType<typeof compileCanonicalEstimateCore>>>{
 const profile=roofMasticMeshProfileR24(model,input),primary=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:model.applicability.primaryMeasureSelectionV1,
  parameterSchema:roofMasticMeshSchemaR24(model),submittedParameters:input,confirmedParameters:profile.confirmedParameters});
 assert.equal(primary.kind,'RESOLVED','EXPLICIT_METHOD_AND_OWN_AREA_REQUIRED');
 onEntry?.();
 return compileCanonicalEstimateCore({operation:'compile',compilerVersion:pack.contract,catalogId:pack.currentParent.catalogId,
  primaryMeasureParameterId:primary.kind==='RESOLVED'?primary.primaryMeasure.parameterId:null,parameterDefinitions:[...model.parameters],
  formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],submittedParameters:{...input},confirmedParameters:{...profile.confirmedParameters},
  currencyCode:'KGS',priceItems:[],maximumResourceRows:512,
  sourceProfileSelectionV1:{metadata:model.applicability.sourceProfileSelectionV1,effectiveUserParameters:input},
  hashJson:v=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v))});
}
/** BEFORE comparison uses the actual V14 data and its exact old metadata in
 * the same existing producer/core. No second module or calculation backend. */
export async function compileRoofMasticMeshCurrentLegacyV14R24(c:RoofMasticMeshCurrentCaptureR24,input:Readonly<Record<string,unknown>>,onEntry:()=>void){
 const schema=roofMasticMeshSchemaR24(c),profile=resolveCanonicalEstimateProfileInputsS2723({catalogId:pack.currentParent.catalogId,
  parameterSchema:schema,sourceProfileSelectionMetadata:c.definition.applicability.sourceProfileSelectionV1,
  confirmedParameters:canonicalApprovedBaselineRuntimeParameters({input_values:c.baseline.input_values,input_classification:c.baseline.input_classification}),effectiveUserParameters:input});
 const primary=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:c.definition.applicability.primaryMeasureSelectionV1,
  parameterSchema:schema,submittedParameters:input,confirmedParameters:profile.confirmedParameters});assert.equal(primary.kind,'RESOLVED');
 onEntry();return compileCanonicalEstimateCore({operation:'compile',compilerVersion:pack.contract,catalogId:pack.currentParent.catalogId,
  primaryMeasureParameterId:primary.kind==='RESOLVED'?primary.primaryMeasure.parameterId:null,parameterDefinitions:[...c.parameters],
  formulaDefinitions:[...c.formulas],resourceDefinitions:[...c.resources],submittedParameters:{...input},confirmedParameters:{...profile.confirmedParameters},
  currencyCode:'KGS',priceItems:[],maximumResourceRows:512,sourceProfileSelectionV1:{metadata:c.definition.applicability.sourceProfileSelectionV1,effectiveUserParameters:input},
  hashJson:v=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v))});
}
function save(name:string,value:unknown){const output=process.env.R24_MASTIC_MESH003_ACTUAL_OUTPUT;if(!output)return;
 mkdirSync(output,{recursive:true});writeFileSync(resolve(output,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
const literal125={bitumen:[['workers','40.325'],['included_machine_operators','0.6125'],['tower_crane_8t','0.2875'],['truck_crane_10t','0.1625'],
 ['forklift_5t','0.1625'],['mobile_bitumen_boiler_400l','11.3125'],['flatbed_truck_to_5t','0.3625'],['hot_roof_mastic','1.32'],
 ['roof_bitumen','0.07125'],['technical_kerosene','0.1625'],['gravel_dr8_5_10','1.3125'],['construction_glass_mesh','287.5']],
 bitumen_rubber:[['workers','46.0625'],['included_machine_operators','0.6125'],['tower_crane_8t','0.2875'],['truck_crane_10t','0.1625'],
 ['forklift_5t','0.1625'],['mobile_bitumen_boiler_400l','0.375'],['flatbed_truck_to_5t','0.3625'],['bitumen_rubber_roof_mastic','1.375'],
 ['roof_bitumen','0.075'],['technical_kerosene','0.1625'],['gravel_dr8_5_10','1.3125'],['construction_glass_mesh','287.5']]}as const;
/** Ordinary retained Config, using the one existing publisher. It is SOURCE
 * ONLY until ROOT reviews the opt-in owner delta and the governed gates pass. */
export function prepareRoofMasticMeshExisting003R24(context:{releaseId:string;searchReleaseId:string;outputRoot:string;sourceRoot?:string}):Config{
 assert.equal(context.releaseId,'2df79e8d-4012-5557-87c0-f36285f59f17');assert.equal(context.searchReleaseId,'9b042edf-ca06-50f6-969a-556e6d14547a');
 const saved=roofMasticMeshSnapshotR24(context.sourceRoot),c=saved.capture,model=build(c),oldMap=saved.contentPassport.decision;
 assert(record(oldMap)&&record(oldMap.independentCompletenessMap)&&Array.isArray(oldMap.independentCompletenessMap.entries)
  &&Array.isArray(oldMap.independentCompletenessMap.evidenceReferences)&&Array.isArray(oldMap.unresolvedResourceRowIds));
 assert(Array.isArray(saved.contentPassport.included_scope_ru)&&Array.isArray(saved.contentPassport.excluded_scope_ru));
 const map={...oldMap.independentCompletenessMap,entries:[...oldMap.independentCompletenessMap.entries,...roofMasticMeshIndependentMapEntriesR24()],
  evidenceReferences:[...oldMap.independentCompletenessMap.evidenceReferences,'data/estimate-benchmarks/source-packs/roof-mastic-mesh-existing-owner-operation-map-r24.json'],fullTechnicalAcceptance:false};
 const metadata=c.definition.source_metadata;assert(record(metadata.retainedParentBindingSuccessorV1));
 const lineage=metadata.retainedParentBindingLineageV1;
 assert(record(lineage)&&lineage.contract==='master-retained-binding-lineage/v1'&&Array.isArray(lineage.entries)&&lineage.entries.length>0,'EXACT_CURRENT_APPEND_LINEAGE');
 const latest=lineage.entries[lineage.entries.length-1];assert(record(latest)&&record(latest.successor),'EXACT_CURRENT_LATEST_SUCCESSOR');
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
  newParameterSources:Object.fromEntries(model.newParameterIds.map(id=>[id,{kind:id=== 'roof_mastic_mesh003_hot_feed_post_sets_r24'?'UNRESOLVED'as const:'KNOWN'as const,
   sourceIds:id==='roof_mastic_mesh003_hot_feed_post_sets_r24'?[]:[pack.sourceKey]}])),
  successorProvenanceAppendV1:{contract:'master-retained-binding-append/v1',capturedSourceMetadata:structuredClone(metadata),
   capturedSourceMetadataSha256:valueSha(metadata),capturedPreviousSuccessorSha256:valueSha(latest.successor)},
  capturedSourcePreimage:{sourceKey:pack.sourceKey,expected:null}};
 const first=model.nativeRowIds[0];assert(first);const name=c.definition.passport.canonicalRuName;assert(typeof name==='string'&&typeof saved.publicIdentity.work_key==='string');
 const byRow=Object.fromEntries(model.nativeRowIds.map(rowId=>[rowId,{exactColumn:rowId.startsWith(profiles.bitumen.prefix+':')?profiles.bitumen.normId:profiles.bitumen_rubber.normId,
  sourceArtifactSha256:profiles.bitumen.sources[0]!.sha256,sourceBasisQuantity:'100',wholeColumnRows:12,projectConditions:'UNCONFIRMED',fullTechnicalAcceptance:false}]));
 const config:Config={contract:pack.contract,stopCode:'ROOF_MASTIC_MESH003_R24',applicationName:'roof-mastic-mesh003-existing-owner-r24',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_16_2026-10-24.txt',masterSha256:'541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40',
  parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:context.outputRoot,catalogId:pack.currentParent.catalogId,sourceId:pack.sourceKey,normId:'12-01-003-01/02',
  sourcePaths:[pack.currentParent.capturePath,'data/estimate-benchmarks/source-packs/roof-mastic-mesh-native-whole00301-r24.json',
   'data/estimate-benchmarks/source-packs/roof-mastic-mesh-native-whole00302-r24.json','data/estimate-benchmarks/source-packs/roof-mastic-mesh-existing-owner-operation-map-r24.json',
   'src/lib/estimate/v4/roofMasticMeshExisting003R24.ts','scripts/estimate/r4a13/prepareRoofMasticMeshExisting003R24.ts',
   'scripts/estimate/r4a13/roofMasticMeshExisting003R24.test.ts','src/lib/estimate/backendPlatform/canonicalSourceProfileSelectionV1.ts',
   'src/lib/estimate/backendPlatform/canonicalSourceProfileSelectionV1.publicMethodR24.test.ts','src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/v4/sourcePinnedRoofNormOwnerR1.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','data/estimate-benchmarks/source-artifacts/kg-krer12-2015-roofs-114a0db0.pdf'],
  sourceMetadata:{source_title:'КРЕР12: армированное двумя слоями стеклосетки трёхслойное мастичное покрытие',source_authority:'Госстрой Кыргызской Республики',
   source_kind:'WHOLE_OFFICIAL_COLUMNS_EXISTING_CARD_METHOD_VARIANTS',official_url:'https://minstroy.gov.kg/ru/state_program/download-pdf/no12krovli_compressed-2526908358eebcf23.66556657.pdf',
   artifact_sha256:profiles.bitumen.sources[0]!.sha256,exact_locator:'КРЕР12 PDF11–12;12-01-003-01/02 целые12строк,4операции; техническая частьPDF4–6',
   use_restriction:profiles.bitumen.scopeRu+' Выбор метода не утверждает проектные условия. Котёл/приготовление грунтовки не дублируются; все37потребностейunknown, FULL0.'},
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
  shortInput:{[controls.publicMethod]:pack.choices.bitumen,[controls.area]:'125'},acceptanceInput:{[controls.publicMethod]:pack.choices.bitumen,[controls.area]:'125'},
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[152,278,284],benchmarkOrdinal:0,
  validationScenario:'CURRENT_FLAT14_TWO_NEW003_WHOLE12_METHODS_ONE_CARD_PROJECT_GATES_UNKNOWN',
  passport:{canonicalRuName:name,workKey:saved.publicIdentity.work_key,physicalResultRu:'Существующая плоская кровля с явно выбранным методом; добавлены армированные стеклосеткой варианты00301/02 без объявления полной крыши.',
   includedScopeRu:[...saved.contentPassport.included_scope_ru.filter((s):s is string=>typeof s==='string'),profiles.bitumen.scopeRu,profiles.bitumen_rubber.scopeRu],
   excludedScopeRu:[...saved.contentPassport.excluded_scope_ru.filter((s):s is string=>typeof s==='string'),...profiles.bitumen.remainingScopeRu],independentCompletenessMap:map,
   unresolvedApplicableResourceRowIds:[...oldMap.unresolvedResourceRowIds.filter((s):s is string=>typeof s==='string'),...model.nativeRowIds,roofMasticMeshPostRowR24]},
  applicability:model.applicability,binding:{rowId:first,additionalRowIds:model.nativeRowIds.slice(1),applicability:byRow[first],applicabilityByRowId:byRow,retainParentBindings:retained},
  locator:{key:'kg-krer12-native-whole00301-02-mastic-mesh-r24',payload:{contract:pack.contract,profiles,sourcePack:pack,printedPricesImported:false,
   fullTechnicalAcceptance:false,publicMethodSelectionNotProjectConfirmation:true}},
  search:{primaryUom:'m2',canonicalNameRu:name,aliases:[name,'Армированное мастичное покрытие кровли'],shortScopeRu:'Одна плоская кровля с внутренними вариантами источника',
   keyDistinguishingParameters:[controls.publicMethod,controls.area],clarificationFields:[controls.publicMethod,controls.area],
   includedBoundaries:[profiles.bitumen.scopeRu,profiles.bitumen_rubber.scopeRu],excludedBoundaries:profiles.bitumen.remainingScopeRu,
   extraSearchTermsRu:'мастичная кровля стеклосетка битум битумно-резиновая гравий',sourceProvenance:{contract:pack.contract,existingCatalogOnly:true,
    capturedParent:pack.currentParent.captureSha256,sourceProfileOwnerProposal:'SOURCE_ONLY_UNACCEPTED',fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'roof_mastic_mesh003_r24',verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
   let entries=0;for(const key of ['bitumen','bitumen_rubber']as const){const input={[controls.publicMethod]:pack.choices[key],[controls.area]:'125'};
    const result=await compileRoofMasticMeshExisting003R24(model,input,()=>{entries++;save(key+'-entry-before-core',{entry:entries,input});});
    save(key+'-result-before-assert',result);
    const prefix=profiles[key].prefix,opposite=profiles[key==='bitumen'?'bitumen_rubber':'bitumen'].prefix;
    const rows=[...result.rows,...result.preliminaryNeeds].filter(r=>r.row_id.startsWith(prefix+':'));
    assert.equal(rows.length,12);assert(rows.every(r=>result.preliminaryNeeds.some(n=>n.row_id===r.row_id)&&r.procurement_eligible===false));
    for(const[role,quantity]of literal125[key]){const row=rows.find(r=>r.row_id===prefix+':'+role);assert(row);assert.equal(row.quantity,quantity);assert.equal(row.unit_price,null);}
    assert(![...result.rows,...result.preliminaryNeeds].some(r=>r.row_id.startsWith(opposite+':')));
    for(const n of pack.existingUnknownNeedsToReuse){const need=result.preliminaryNeeds.find(r=>r.row_id===n.rowId);assert(need);assert.equal(need.quantity,null);}
    assert(result.parameters[controls.conditions]==null);assert(result.parameters[controls.measurement]==null);
    assert.equal(result.preliminaryNeeds.find(r=>r.row_id===roofMasticMeshPostRowR24)?.quantity,null);
   }
   for(const [name,key,value,message]of[
    ['forged-project-conditions',controls.conditions,profiles.bitumen.conditionsYesRu,'source-managed parameter cannot be submitted '+controls.conditions],
    ['forged-unknown-post','roof_mastic_mesh003_hot_feed_post_sets_r24','1','unresolved application norm cannot be supplied roof_mastic_mesh003_hot_feed_post_sets_r24']
   ]as const){let rejection:string|null=null;const input={[controls.publicMethod]:pack.choices.bitumen,[controls.area]:'125',[key]:value};
    try{await compileRoofMasticMeshExisting003R24(model,input,()=>{entries++;save(name+'-entry-before-core',{entry:entries,input});});}
    catch(error:unknown){rejection=error instanceof Error?error.message:String(error);save(name+'-actual-reject-before-assert',{rejection});}
    assert(rejection?.includes(message),name+':'+rejection);
   }
   const legacyInput={[controls.area]:'125'};
   const before=await compileRoofMasticMeshCurrentLegacyV14R24(c,legacyInput,()=>{entries++;save('legacy-current-v14-entry-before-core',{entry:entries,input:legacyInput});});
   save('legacy-current-v14-result-before-assert',before);
   const after=await compileRoofMasticMeshExisting003R24(model,legacyInput,()=>{entries++;save('legacy-candidate-entry-before-core',{entry:entries,input:legacyInput});});
   save('legacy-candidate-result-before-assert',after);
   const withoutProjectionHash=(rows:readonly object[])=>rows.map(row=>Object.fromEntries(Object.entries(row).filter(([k])=>k!=='row_sha256'&&k!=='need_sha256')));
   // New immutable projection hashes may differ; identities, quantities,
   // ALL calculation/normative traces and resource/pay ownership must not.
   assert.deepEqual(withoutProjectionHash(after.rows),withoutProjectionHash(before.rows),'LEGACY_CURRENT_ROWS_TRACES_PAYMENT_CHANGED');
   assert.deepEqual(withoutProjectionHash(after.preliminaryNeeds),withoutProjectionHash(before.preliminaryNeeds),'LEGACY_CURRENT_NEEDS_TRACES_CHANGED');
   assert.equal(after.parameters[controls.selector],'Два наплавляемых слоя по готовому минеральному основанию');
   assert(![...after.rows,...after.preliminaryNeeds].some(r=>r.row_id.startsWith(pack.prefix+':')),'ABSENT_NEW_METHOD_MUST_NOT_SELECT003');
   save('legacy-compatibility-equality',{sameRowsAndAllTraces:true,sameNeedsAndAllTraces:true,beforeRows:before.rows.length,beforeNeeds:before.preliminaryNeeds.length,
    beforeDefinitionId:c.definition.id,beforeDefinitionSha256:c.definition.definition_sha256,new003Rows:0,new003Defaults:0,onlyProjectionHashesExcluded:true});
   assert.equal(entries,6);save('actual-core-counts',{entries,completedResults:4,rejectedInputs:2,projectConditionsConfirmed:false});
   return{status:'SOURCE_QUANTITIES_ONLY_TWO_NEW_METHODS_PROJECT_GATES_UNKNOWN',actualCoreEntries:entries,completedResults:4,rejectedInputs:2,newNativeRowsPerMethod:12,
    reusedUnknownNeeds:36,newUnknownPost:1,newPublicCards:0,fullTechnicalAcceptance:false};
  }};
 assert.equal(config.catalogAppend,undefined);return config;
}
