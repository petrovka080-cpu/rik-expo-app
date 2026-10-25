import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import fixture from '../../../data/estimate-benchmarks/fixtures/low-current-scs-eight-cases-r24.json';
import idc from '../../../data/estimate-benchmarks/source-packs/low-current-idc-whole-manual-post-r24.json';
import pro from '../../../data/estimate-benchmarks/source-packs/low-current-copper-certifier-pro-stock-r24.json';
import {lowCurrentScsPostsSingleSuccessorConfigR24,lowCurrentScsPostsSingleSuccessorDefinitionR24,type LowCurrentScsPostsCompositionInputR24} from './prepareLowCurrentScsPostsSingleSuccessorR24';
import {compileCanonicalEstimateCore,canonicalEstimateResourceIncludedByDefault,type CanonicalEstimateCompileCoreInput,
  type CanonicalEstimateCompileCoreResult} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1,
  type MasterScopedNormativeRegistryInputR1} from './masterScopedNormativeRegistryPreimageR1';

type Pin=Readonly<{path:string;sha256:string}>;
type CurrentBinding=Readonly<{catalogId:string;definitionId:string;definitionVersion:number;definitionSha256:string;
  definition:AutomaticOwnerDefinition}>;
type CoreContext=Omit<CanonicalEstimateCompileCoreInput,'parameterDefinitions'|'formulaDefinitions'|'resourceDefinitions'
  |'submittedParameters'|'confirmedParameters'|'maximumResourceRows'>;
export type LowCurrentScsFiniteRuntimeInputR24=Readonly<{
  composition:Omit<LowCurrentScsPostsCompositionInputR24,'capturedParentDefinition'|'expectedCapturedComputationSha256'|'verifyWholePostCore'>;
  currentCapture:Pin;registryCapture:Pin;
  expectedCurrent:Readonly<{catalogId:string;definitionId:string;definitionVersion:number;definitionSha256:string;computationSha256:string}>;
  sourceTuple:Readonly<{sourceId:string;normId:string;locatorKey:string;bundleArtifactSha256:string}>;
  /** ROOT's actual capture adapter; no historical/default implementation here. */
  bindActualCapture:(raw:unknown)=>CurrentBinding;
  bindActualRegistryCapture:(raw:unknown)=>MasterCapturedScopedNormativeRegistryR1;
  registryAssembly:Pick<MasterScopedNormativeRegistryInputR1,'newSource'|'newLocators'>;
  coreContext:CoreContext;
  nativeSubmittedParameters:Readonly<Record<string,unknown>>;
  nativeConfirmedParameters:Readonly<Record<string,unknown>>;
  /** Only ROOT-provided new count facts. No local JSON becomes an approval. */
  confirmedNewCountFactsByCase:Readonly<Record<string,Readonly<Record<string,unknown>>>>;
  outputDirectory:string;
}>;
const hash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const ownIds=[idc.profileId,idc.frontCountId,pro.profileId,pro.frontCountId];
const countIds=new Set([idc.frontCountId,pro.frontCountId]);

function readPinnedJson(pin:Pin):unknown{
  assert.match(pin.sha256,/^[a-f0-9]{64}$/);
  assert(fs.statSync(pin.path).size<=4194304,'FINITE_INPUT_JSON_BYTE_CAP_HOLD');
  const bytes=fs.readFileSync(pin.path);assert.equal(sha(bytes),pin.sha256,'EXACT_ROOT_INPUT_SHA');
  const result:unknown=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));return result;
}
function saveRaw(directory:string,name:string,value:unknown):Pin{
  const file=path.join(directory,name),bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');
  fs.writeFileSync(file,bytes,{flag:'wx'});return{path:file,sha256:sha(bytes)};
}
function errorRecord(error:unknown):Record<string,unknown>{
  if(error instanceof Error)return{name:error.name,message:error.message,
    code:'code' in error?error.code:null,stack:error.stack??null};
  return{thrown:error};
}

/** Creates the ordinary Config and installs its real finite-core callback.
 * Importing this module performs no FS reads, SQL, core calls or approval.
 * Caller uses the existing governed Jest/Config route; this is not a launcher. */
export function createLowCurrentScsPostsFiniteConfigR24(input:LowCurrentScsFiniteRuntimeInputR24):MasterSingleDefinitionSuccessorConfig{
  assert(!fs.existsSync(input.outputDirectory),'FRESH_FINITE_OUTPUT_REQUIRED');
  fs.mkdirSync(input.outputDirectory,{recursive:true});
  saveRaw(input.outputDirectory,'declared-input-pins.raw.json',{currentCapture:input.currentCapture,registryCapture:input.registryCapture,
    expectedCurrent:input.expectedCurrent,sourceTuple:input.sourceTuple,sourceOrServerApprovalClaimed:false});
  try{return constructBoundConfig(input);}catch(error){
    saveRaw(input.outputDirectory,'constructor-error.raw.json',errorRecord(error));throw error;
  }
}
function constructBoundConfig(input:LowCurrentScsFiniteRuntimeInputR24):MasterSingleDefinitionSuccessorConfig{
  const capture=readPinnedJson(input.currentCapture);
  const registryRaw=readPinnedJson(input.registryCapture);
  const current=input.bindActualCapture(capture),host=input.composition.hostConfig;
  assert.equal(current.catalogId,input.expectedCurrent.catalogId);
  assert.equal(current.catalogId,idc.hostCatalogId);assert.equal(current.catalogId,pro.hostCatalogId);
  assert.equal(current.definitionId,input.expectedCurrent.definitionId);
  assert.equal(current.definitionVersion,input.expectedCurrent.definitionVersion);
  assert.equal(current.definitionSha256,input.expectedCurrent.definitionSha256);
  assert.equal(hash({parameters:current.definition.parameters,formulas:current.definition.formulas,resources:current.definition.resources}),input.expectedCurrent.computationSha256);
  assert.equal(host.catalogId,current.catalogId);assert.equal(input.coreContext.catalogId,current.catalogId);
  assert.equal(input.coreContext.operation,'compile');
  assert.equal(host.sourceId,input.sourceTuple.sourceId);assert.equal(host.normId,input.sourceTuple.normId);
  assert.equal(host.locator.key,input.sourceTuple.locatorKey);
  assert.equal(host.sourceMetadata.artifact_sha256,input.sourceTuple.bundleArtifactSha256);
  assert.equal(input.composition.rootReviewedBundleArtifact.sha256,input.sourceTuple.bundleArtifactSha256);
  assert(fs.statSync(input.composition.rootReviewedBundleArtifact.path).size<=4194304,'FINITE_BUNDLE_BYTE_CAP_HOLD');
  const bundle=fs.readFileSync(input.composition.rootReviewedBundleArtifact.path);
  assert.equal(sha(bundle),input.sourceTuple.bundleArtifactSha256,'ACTUAL_BUNDLE_FILE_SHA');
  assert(host.capturedScopedNormativeRegistry,'REAL_CAPTURED_REGISTRY_OBJECT_REQUIRED');
  assert.deepEqual(host.capturedScopedNormativeRegistry,input.bindActualRegistryCapture(registryRaw),'ACTUAL_REGISTRY_FILE_AND_CONFIG_SAME_CAPTURE');
  assert(resolveMasterScopedNormativeRegistryOptInR1({config:host,...input.registryAssembly}),'EXISTING_SCOPED_REGISTRY_GUARD_REQUIRED');
  assert(input.coreContext.primaryMeasureParameterId,'ACTUAL_CURRENT_PRIMARY_MEASURE_REQUIRED');
  assert(current.definition.parameters.some(p=>p.parameter_id===input.coreContext.primaryMeasureParameterId));
  assert.equal(input.coreContext.customRows?.length??0,0,'NO_EXOGENOUS_CUSTOM_ROWS_IN_FINITE_BENCHMARK');
  for(const key of ownIds){
    assert(!Object.hasOwn(input.nativeSubmittedParameters,key),'NEW_CONTROL_NOT_A_CAPTURED_NATIVE_INPUT');
    assert(!Object.hasOwn(input.nativeConfirmedParameters,key),'NEW_CONTROL_NOT_A_CAPTURED_NATIVE_CONFIRMATION');
  }
  const composerInput:LowCurrentScsPostsCompositionInputR24={...input.composition,capturedParentDefinition:current.definition,
    expectedCapturedComputationSha256:input.expectedCurrent.computationSha256,
    verifyWholePostCore:async()=>runFiniteCases()};
  const definition=lowCurrentScsPostsSingleSuccessorDefinitionR24(composerInput);
  const config:MasterSingleDefinitionSuccessorConfig=lowCurrentScsPostsSingleSuccessorConfigR24(composerInput);
  assert.deepEqual(config.parameterDefinitions,definition.parameters);
  assert.deepEqual(config.formulaDefinitions,definition.formulas);
  assert.deepEqual(config.resourceDefinitions,definition.resources);
  const nativeIds=new Set(current.definition.resources.map(row=>row.row_id));
  const additions=definition.resources.filter(row=>!nativeIds.has(row.row_id));
  assert.equal(additions.length,15);assert.equal(new Set(additions.map(row=>row.row_id)).size,15);
  assert.equal(definition.resources.length,current.definition.resources.length+15);
  assert.deepEqual(definition.resources.slice(0,current.definition.resources.length),current.definition.resources);
  assert.deepEqual(definition.formulas.slice(0,current.definition.formulas.length),current.definition.formulas);
  assert.deepEqual(definition.parameters.slice(0,current.definition.parameters.length),current.definition.parameters);
  assert.deepEqual(definition.resources.filter(row=>nativeIds.has(row.row_id)&&canonicalEstimateResourceIncludedByDefault(row)).map(row=>row.row_id),
    current.definition.resources.filter(canonicalEstimateResourceIncludedByDefault).map(row=>row.row_id));
  assert.deepEqual(additions.filter(canonicalEstimateResourceIncludedByDefault).map(row=>row.row_id),[idc.prefix+':provision-owner']);
  assert(additions.every(row=>row.procurement_eligible===false));
  for(const rowId of Object.keys(input.coreContext.rowOverrides??{}))assert(!additions.some(row=>row.row_id===rowId),'NO_NEW_ROW_MANUAL_QUANTITY_OR_PAYMENT_BYPASS');
  saveRaw(input.outputDirectory,'constructor-and-input-pins.json',{currentCapture:input.currentCapture,registryCapture:input.registryCapture,
    currentIdentity:input.expectedCurrent,sourceTuple:input.sourceTuple,newRowIds:additions.map(row=>row.row_id),
    oldPaidOwnerIds:current.definition.resources.filter(canonicalEstimateResourceIncludedByDefault).map(row=>row.row_id),
    oldHourOwnerId:pro.existingMachineHourOwnerRowId,plannedCases:8,plannedCoreCallbacks:9,
    serverApprovalClaimed:false,actualObjectConfirmed:false,normalLockedPublisher:'UNRUN'});
  let called=false;
  async function runFiniteCases():Promise<Record<string,unknown>>{
    assert(!called,'FINITE_CALLBACK_NOT_REPLAYABLE');called=true;
    let attempts=0;
    const outcomes:Record<string,unknown>[]=[];
    async function actual(label:string,subject:AutomaticOwnerDefinition,submitted:Record<string,unknown>,confirmed:Record<string,unknown>):Promise<CanonicalEstimateCompileCoreResult>{
      saveRaw(input.outputDirectory,label+'-input.raw.json',{submittedParameters:submitted,confirmedParameters:confirmed});
      attempts++;console.log('ACTUAL_SCS_CORE_START '+label+' '+attempts);
      try{
        const result=await compileCanonicalEstimateCore({...input.coreContext,parameterDefinitions:[...subject.parameters],
          formulaDefinitions:[...subject.formulas],resourceDefinitions:[...subject.resources],submittedParameters:submitted,
          confirmedParameters:confirmed,maximumResourceRows:subject.resources.length});
        const raw=saveRaw(input.outputDirectory,label+'-result.raw.json',result);
        console.log('ACTUAL_SCS_CORE_RETURN '+label+' '+attempts);outcomes.push({label,result:raw});return result;
      }catch(error){
        saveRaw(input.outputDirectory,label+'-error.raw.json',errorRecord(error));throw error;
      }
    }
    for(const item of fixture.cases){
      assert(Object.hasOwn(input.confirmedNewCountFactsByCase,item.id),'ROOT_CASE_CONFIRMED_FACT_INPUT_REQUIRED:'+item.id);
      const newConfirmed=input.confirmedNewCountFactsByCase[item.id];assert(newConfirmed);
      for(const key of Object.keys(newConfirmed))assert(countIds.has(key),'ONLY_NEW_ROOT_COUNT_FACTS_ALLOWED');
      const submitted:Record<string,unknown>={...input.nativeSubmittedParameters};
      const profile=idc.profiles.find(p=>p.key===item.idcProfileKey);
      if(item.idcProfileKey==='NOT_SELECTED')submitted[idc.profileId]=idc.notSelected;
      else{assert(profile,'EXACT_SOURCE_PROFILE');submitted[idc.profileId]=profile.titleRu;}
      submitted[pro.profileId]=item.proSelected?pro.selectedProfile:pro.notSelected;
      if(item.idcF!==null)submitted[idc.frontCountId]=item.idcF;
      if(item.proF!==null)submitted[pro.frontCountId]=item.proF;
      for(const [key,value] of Object.entries(newConfirmed))assert.deepEqual(value,submitted[key],'CONFIRMED_TEST_COUNT_MUST_EQUAL_SUBMITTED_FINITE_CASE');
      if(item.mode==='LEGACY_EQUALITY'||item.mode==='MISSING_COUNTS')assert.equal(Object.keys(newConfirmed).length,0);
      let before:CanonicalEstimateCompileCoreResult|undefined;
      if(item.mode==='LEGACY_EQUALITY')before=await actual(item.id+'-BEFORE',current.definition,{...input.nativeSubmittedParameters},{...input.nativeConfirmedParameters});
      const result=await actual(item.id,definition,submitted,{...input.nativeConfirmedParameters,...newConfirmed});
      const newRows=result.rows.filter(row=>!nativeIds.has(row.row_id));
      if(item.mode==='LEGACY_EQUALITY'){
        assert(before);assert.deepEqual(result.rows,before.rows);assert.deepEqual(result.preliminaryNeeds,before.preliminaryNeeds);
        assert.deepEqual(result.totals,before.totals);assert.equal(newRows.length,0);
      }else if(item.mode==='MISSING_COUNTS'){
        for(const key of countIds)assert(result.preliminaryNeeds.some(need=>need.missing_parameter_ids.includes(key)),key+' MUST_REMAIN_UNKNOWN');
        assert.equal(newRows.length,0,'MISSING_PHYSICAL_COUNT_MUST_NOT_BECOME_ZERO_OR_ONE');
      }else{
        const expected=new Map<string,unknown>([...Object.entries(item.expectedIdc).map(([key,value])=>[idc.prefix+':'+key,value] as const),
          ...Object.entries(item.expectedPro).map(([key,value])=>[pro.prefix+':'+key,value] as const)]);
        assert.equal(newRows.length,expected.size);
        for(const row of newRows){assert(expected.has(row.row_id));assert.equal(row.quantity,expected.get(row.row_id));
          assert.equal(row.included_in_procurement,false);
          if(row.row_id!==idc.prefix+':provision-owner')assert.equal(row.included_in_estimate,false,'NO_SECOND_PAID_COMPONENT');}
        assert.equal(new Set(result.rows.map(row=>row.row_id)).size,result.rows.length,'NO_DUPLICATE_OLD_OR_NEW_PAY_OWNER_ROWS');
      }
      saveRaw(input.outputDirectory,item.id+'-assertions-completed.json',{caseId:item.id,sourceInventoryOnly:true,
        actualObjectConfirmed:false,oldPaidOwnersNotAddedAgain:true,operationalPostAccepted:false});
    }
    assert.equal(fixture.cases.length,8);assert.equal(attempts,9);
    const report={contract:'scs-posts-finite-eight-cases/r24',completedCases:8,actualCoreCallbacks:attempts,outcomes,
      oldArithmeticSuitesReplayed:0,newPublicCards:0,operationalPostsAccepted:0,sourceOrServerApprovalClaimed:false,
      normalLockedPublisher:'UNRUN',FULL:false};
    saveRaw(input.outputDirectory,'finite-outcome.json',report);return report;
  }
  return config;
}
