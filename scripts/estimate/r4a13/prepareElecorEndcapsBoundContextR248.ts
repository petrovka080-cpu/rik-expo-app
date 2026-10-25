// TEST_ONLY local evidence adapter. No SQL, source authority, publisher or project authentication.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,isAbsolute,relative,resolve} from 'node:path';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
import {elecorEndcapPackR239 as pack} from '../../../src/lib/estimate/v4/elecorProjectEndcapsCompletionR239';
import type {ElecorCurrentEndcapCaptureR239,ElecorCurrentEndcapReadsetR239,
  ElecorEndcapCurrentMasterContextR239} from './prepareElecorEndcapsCurrentMasterR239';

const base='.release-runtime/elecor-endcaps-r248-inputs/';
const pins={
  parent:{path:base+'actual-full-parent.json',sha256:'1108b91aee4828bee5aae83f954b3c1aca5c749fa288fd9bb188bb88efe89db1'},
  parentAcceptance:{path:base+'parent-acceptance-r244.json',sha256:'52cb049d20a8a06c85086904ae4627748d30086e77e16a2bf7f25c3d098b7e76'},
  registry:{path:base+'exact-source-preimage.json',sha256:'db0fbcb41eaa6975a09dda55f79368d52a0883e2752a6e23d2835af66fdc1e22'},
  registryAcceptance:{path:base+'registry-acceptance-r248.json',sha256:'d84e478c852ca3d558fd8e6bf35016dda24269ff6728cf5870ff33d48df89e44'},
};
const pointer={path:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  sha256:'404bdb3657d36efb731f8131f63dc126e452f635579926d0f3855dbf749053f6'};
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function strings(value:unknown):value is string[]{return Array.isArray(value)&&value.every(v=>typeof v==='string');}
function rows<T>(value:unknown,guard:(row:unknown)=>row is T,label:string):T[]{
  assert(Array.isArray(value),label);const result:T[]=[];
  for(const row of value){assert(guard(row),label);result.push(row);}return result;
}
function requiredRecord(value:unknown,label:string){assert(record(value),label);return value;}
type Parameter=AutomaticOwnerDefinition['parameters'][number];
type Formula=AutomaticOwnerDefinition['formulas'][number];
type Resource=AutomaticOwnerDefinition['resources'][number];
function parameter(value:unknown):value is Parameter{
  return record(value)&&typeof value.parameter_id==='string'&&typeof value.value_type==='string'
    &&typeof value.ordinal==='number'&&Number.isInteger(value.ordinal)&&typeof value.title_ru==='string'
    &&(value.unit_id===null||typeof value.unit_id==='string')&&typeof value.required==='boolean'
    &&Object.hasOwn(value,'default_value')&&(value.constraints_json===null||record(value.constraints_json))
    &&record(value.truth_metadata);
}
function formula(value:unknown):value is Formula{
  if(!record(value)||typeof value.formula_id!=='string'||typeof value.expression_source!=='string'
    ||typeof value.output_unit_id!=='string'||!strings(value.input_parameter_ids)||typeof value.ast_sha256!=='string')return false;
  try{assert.deepEqual(value.ast,compileFormulaGraph(value.expression_source).ast);return true;}catch{return false;}
}
function resource(value:unknown):value is Resource{
  if(!record(value))return false;
  return ['id','row_id','section','category','title_ru','unit_id','formula_id','row_sha256'].every(k=>typeof value[k]==='string')
    &&typeof value.ordinal==='number'&&Number.isInteger(value.ordinal)&&record(value.inclusion_ast)
    &&record(value.resource_graph)&&typeof value.procurement_eligible==='boolean'
    &&(value.cost_owner_id===null||typeof value.cost_owner_id==='string')
    &&(value.source_metadata===null||record(value.source_metadata));
}
/** Type decoding preserves every original record and field; the owned Config owns semantic admission. */
function captureOf(value:unknown):ElecorCurrentEndcapCaptureR239{
  const c=requiredRecord(value,'WHOLE_CAPTURE_RECORD_REQUIRED');
  const capture:ElecorCurrentEndcapCaptureR239={...c,
    definition:requiredRecord(c.definition,'WHOLE_DEFINITION_REQUIRED'),baseline:requiredRecord(c.baseline,'WHOLE_BASELINE_REQUIRED'),
    parameters:rows(c.parameters,parameter,'ACTUAL_PARAMETER_STRUCTURAL_TYPE'),
    formulas:rows(c.formulas,formula,'ACTUAL_FORMULA_STRUCTURAL_TYPE'),resources:rows(c.resources,resource,'ACTUAL_RESOURCE_STRUCTURAL_TYPE'),
    bindings:rows(c.bindings,record,'WHOLE_BINDINGS_REQUIRED'),normativeSources:rows(c.normativeSources,record,'WHOLE_SOURCE_ROWS_REQUIRED'),
    normativeLocators:rows(c.normativeLocators,record,'WHOLE_LOCATOR_ROWS_REQUIRED')};
  assert.deepEqual(capture,c,'NO_CAPTURE_FIELD_OR_ARRAY_VALUE_CHANGED');return capture;
}
export function prepareElecorEndcapsBoundContextR248(options:Readonly<{
  sourceRoot:string;onCoreCall?:ElecorEndcapCurrentMasterContextR239['onCoreCall'];
  onOutcome?:ElecorEndcapCurrentMasterContextR239['onOutcome'];
}>):Readonly<{context:ElecorEndcapCurrentMasterContextR239;evidence:Record<string,unknown>}>{
  const root=resolve(options.sourceRoot);assert.equal(root,resolve(__dirname,'../../..'),'ONE_ACTUAL_SOURCE_ROOT_REQUIRED');
  const own=(logical:string)=>{const p=resolve(root,logical),rel=relative(root,p);
    assert(!isAbsolute(logical)&&rel!==''&&!isAbsolute(rel)&&!rel.startsWith('..'),'PIN_STAYS_IN_ACTUAL_ROOT');return p;};
  const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
  const read=(pin:Readonly<{path:string;sha256:string}>):unknown=>{const bytes=readFileSync(own(pin.path));
    assert.equal(digest(bytes),pin.sha256,'EXACT_HELD_INPUT_BYTES:'+pin.path);return JSON.parse(bytes.toString('utf8'));};
  const whole=requiredRecord(read(pins.parent),'ACTUAL_WHOLE_PARENT_REQUIRED');
  const parentAcceptance=requiredRecord(read(pins.parentAcceptance),'ACTUAL_PARENT_ACCEPTANCE_REQUIRED');
  const accepted=requiredRecord(read(pins.registryAcceptance),'ACTUAL_SCOPED_ACCEPTANCE_REQUIRED');
  const witness=requiredRecord(read(pins.registry),'ACTUAL_SOURCE_WITNESS_REQUIRED');
  const current=requiredRecord(read(pointer),'ACTUAL_POINTER_REQUIRED');
  assert.equal(whole.readOnly,true);assert.equal(whole.sourceMetadataLosslessRoundtrip,true);
  assert.equal(parentAcceptance.status,'PASS_READONLY_R244_ONE_SELECTED_EXISTING_PARENT_WITH_PROJECTED_CONTEXT');
  assert.equal(accepted.status,'PASS_READONLY_R248_SELECTED_PARENT_AND_THREE_EXACT_REGISTRY_SCOPES');
  for(const acceptance of [parentAcceptance,accepted]){
    assert.equal(acceptance.readOnly,true);assert.equal(acceptance.databaseWrites,0);assert.equal(acceptance.rawRowsReadTwice,true);
    assert.equal(acceptance.transactionRolledBack,true);assert.equal(acceptance.allCardAndSourceRowsWhole,true);assert.equal(acceptance.timeZone,'UTC');
    assert.equal(acceptance.definitionReleaseId,current.definitionReleaseId);assert.equal(acceptance.searchReleaseId,current.searchReleaseId);
  }
  const registry=requiredRecord(accepted.registry,'THREE_SCOPED_READS_REQUIRED');
  assert.equal(registry.freshScopesExecuted,3);assert.deepEqual(registry.scopes,
    ['EXACT_SOURCE_KEY','EXACT_ARTIFACT_SHA256_ACROSS_SOURCE_KEYS','EXACT_LOCATOR_KEYS_AND_ACTUAL_SOURCE_CLOSURE']);
  assert.equal(registry.globalAbsence,false);assert.equal(registry.physicalOwnerAdmission,false);assert.equal(registry.sourceAdmission,false);
  const registryPin=requiredRecord(registry.sourcePreimage,'SCOPED_PREIMAGE_PIN_REQUIRED');assert.equal(registryPin.sha256,pins.registry.sha256);
  assert.equal(witness.sourceKey,pack.sourceId);assert.equal(witness.artifactSha256,pack.source.sha256);
  assert.deepEqual(witness.exactLocatorKeys,['exact-60x40-kmz-complete4-and-project-end-schedule-r239']);
  for(const key of ['sourceRows','sameArtifactSourceRows','allLocatorsForActualSourceIds','exactLocatorRows'])assert.deepEqual(witness[key],[]);
  assert.equal(witness.readOnly,true);assert.equal(witness.exactKeyAbsent,true);assert.equal(witness.globalAbsence,false);
  assert.equal(witness.physicalOwnerAdmission,false);assert.equal(witness.sourceAdmission,false);assert.equal(witness.artifactAliasOrLocatorReviewRequired,false);
  const capture=captureOf(whole.capture);
  assert.equal(capture.definition.id,'6d2a0632-e348-524b-bc04-b2f06875f9d7');assert.equal(capture.baseline.id,'43fef1fe-1332-5952-8edd-1141a5b134ba');
  assert.equal(capture.definition.definition_sha256,'a0a70082cc699463cff1bee880d2d3b3c3db6ec09f296539596b7cdb6bf93972');
  const results=rows(accepted.results,record,'ACTUAL_SELECTED_RESULT_REQUIRED');assert.equal(results.length,1);
  assert.equal(results[0].catalogId,pack.catalogId);assert.equal(results[0].definitionId,capture.definition.id);
  const actualParentPin=requiredRecord(results[0].fullParent,'WHOLE_PARENT_RESULT_PIN_REQUIRED');assert.equal(actualParentPin.sha256,pins.parent.sha256);
  assert.equal(typeof current.definitionReleaseId,'string');assert.equal(typeof current.searchReleaseId,'string');
  // Semantic capture hashing stays with the existing owner, including all original persisted fields.
  const capturedParentSha256=masterRetainedParentCaptureSha256R1(capture);
  const readset:ElecorCurrentEndcapReadsetR239={readOnly:true,databaseWrites:0,sameRawFullRowsReadTwice:true,
    catalogId:pack.catalogId,definitionReleaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId,
    capture,capturedParentSha256,sourcePreimage:{sourceKey:pack.sourceId,expected:null}};
  const logical='.release-runtime/elecor-endcaps-r248-generated/actual-bound-whole-readset.json';
  const target=own(logical);mkdirSync(dirname(target),{recursive:true});
  const bytes=Buffer.from(JSON.stringify(readset,null,2)+'\n','utf8');writeFileSync(target,bytes,{flag:'wx'});
  const actual=readFileSync(target);assert.deepEqual(actual,bytes,'WHOLE_READSET_WRITE_READ_BYTES');
  const currentFullRead={path:logical,sha256:digest(actual)};
  return {context:{sourceRoot:root,readset,currentFullRead,currentPointerSha256:pointer.sha256,
    onCoreCall:options.onCoreCall,onOutcome:options.onOutcome},
    evidence:{contract:'elecor-actual-bound-ordinary-context/r248',parentByteSha256:pins.parent.sha256,
      capturedParentSha256,currentFullRead,evidencePins:pins,sourcePreimage:readset.sourcePreimage,
      originalCaptureAllFieldsAndRecordsPreserved:true,sourceScope:'THREE_EXACT_SCOPES_ONLY',
      sourceAuthorityGranted:false,projectAuthenticated:false,publisherExecuted:false,databaseWrites:0}};
}
