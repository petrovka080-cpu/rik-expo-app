import {createHash} from 'node:crypto';
import evidence from '../../../data/estimate-benchmarks/fixtures/painting03002-accepted-evidence-r1.json';
import {assertPainting03002RootDecisionR1 as decision,assertPainting03002ContinuationR1 as continuation,
 assertPainting03002IntegrationR1 as integration,assertPainting03002ParentSealR1 as parent,
 painting03002IntegrationPathsR1 as paths} from './prepareFlatMetalOil03002CreateAppendR1';
type Json=Record<string,any>;
const copy=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
const actualDecision=()=>copy(evidence.formalRootDecisionSemantic);
const actualContinuation=()=>copy(evidence.continuationSemanticForPureTestsOnly);
const memberSet='exactFourFullCurrentMemberIdentityManifestSearchHeaders';
function rewrite(read:Json,key:string,change:(rows:Json[])=>void){
 const set=read.sets[key],rows=set.rawRows.map((raw:string)=>JSON.parse(raw));change(rows);
 set.rawRows=rows.map((row:Json)=>JSON.stringify(row));set.rowCount=rows.length;
 set.sha256=createHash('sha256').update(set.rawRows.join('\n')+(rows.length?'\n':'')).digest('hex');
}
describe('painting03002 thin existing-Master admission; prospective pure checks only',()=>{
 test('accepts the exact actual ROOT decision without turning it into publication authority',()=>{
  const d=actualDecision();expect(()=>decision(d)).not.toThrow();expect(d.published).toBe(false);
  expect(d.noPublicationAuthorityFromThisFileAlone).toBe(true);expect(d.searchPlacement.groupMode).toBe('create');
  expect(d.newPaidOwners).toBe(1);expect(d.newInfoRows).toBe(6);expect(d.openNeeds).toBe(10);expect(d.priceBindings).toBe(0);
 });
 test.each([
  ['fence JOIN',(d:Json)=>{d.searchPlacement.groupMode='join';d.searchPlacement.groupId=evidence.fenceGroupId;}],
  ['search leaf taxonomy as parent system',(d:Json)=>{d.searchPlacement.systemId='profile_sheet_fence';}],
  ['second paid owner',(d:Json)=>{d.newPaidOwners=2;}],
  ['changed whole labour',(d:Json)=>{d.scope.wholeLabourManHoursPer100m2='24.42';}],
  ['operator assigned extra labour',(d:Json)=>{d.scope.operatorInfoManHoursPer100m2='2.04';}],
  ['third coat',(d:Json)=>{d.scope.includedOperations.push('third-coat');}],
  ['invented large-area threshold',(d:Json)=>{d.scope.numericLargeAreaThreshold=100;}],
  ['unconfirmed room height',(d:Json)=>{d.scope.roomsHeightAtMostM='6';}],
  ['broadened MA25 product',(d:Json)=>{d.scope.interiorMa25AllowedColours.push('any-colour');}],
  ['changed primary artifact',(d:Json)=>{d.primarySource.sha256='0'.repeat(64);}],
  ['source absence replaced by boolean',(d:Json)=>{d.readPins.actualRemainingHeadersAndSource0={sourceAbsent:true};}],
  ['existing profile history rewritten',(d:Json)=>{d.all24ExistingModelsKeepFullBodiesOwnersAndSavedHistory=false;}],
  ['production enabled',(d:Json)=>{d.productionAllowed=true;}],
 ] as const)('refuses %s even with a reviewed status',(_name,change)=>{const d=actualDecision();change(d);expect(()=>decision(d)).toThrow();});
 test('accepts actual R9 four headers with historical parent-system/leaf-system distinction and exact source0',()=>{
  const r=actualContinuation();expect(()=>continuation(r)).not.toThrow();
  expect(r.historicalGroupRow.system_id).toBe('carpentry_metal');
  expect(JSON.parse(r.sets[memberSet].rawRows[0]!).search.system_id).toBe('profile_sheet_fence');
  expect(r.commonSnapshotClaim).toBe(false);
 });
 test.each([
  ['repointed definition',(r:Json)=>rewrite(r,memberSet,rows=>{rows[0]!.manifest.definition_version_id=rows[1]!.manifest.definition_version_id;})],
  ['repointed baseline',(r:Json)=>rewrite(r,memberSet,rows=>{rows[0]!.manifest.approved_template_baseline_id=rows[1]!.manifest.approved_template_baseline_id;})],
  ['changed definition hash',(r:Json)=>rewrite(r,memberSet,rows=>{rows[0]!.manifest.definition_hash='0'.repeat(64);})],
  ['search release drift',(r:Json)=>rewrite(r,memberSet,rows=>{rows[0]!.search.definition_release_id=rows[0]!.definition_anchor.release_id;})],
  ['forged inherited definition origin',(r:Json)=>rewrite(r,memberSet,rows=>{rows[0]!.definition_anchor.release_id=r.executionContext.definitionReleaseId;})],
  ['source appears',(r:Json)=>rewrite(r,'exactPainting03002SourcePreimageAndCurrentConsumers',rows=>{rows[0]!.exact_source_count=1;rows[0]!.source_preimage={source_key:evidence.sourceKey};})],
  ['missing member',(r:Json)=>rewrite(r,memberSet,rows=>{rows.pop();})],
 ] as const)('refuses semantic %s even after recomputing raw-set SHA',(_name,change)=>{const r=actualContinuation();change(r);expect(()=>continuation(r)).toThrow();});
 test('rejects raw set drift without accepting the unchanged wrapper status',()=>{
  const r=actualContinuation();const raws=r.sets[memberSet].rawRows;raws[0]=raws[0]!+' ';expect(()=>continuation(r)).toThrow('PAINTING03002_RAW_SET_DRIFT');
 });
 test('NULL future parent/source integration cannot become a runtime default or guessed pair',()=>{
  const pending:Json={contract:'root-painting03002-checked-integration-and-parent-inputs/r1',status:'ROOT_CHECKED_PAINTING03002_CREATE_FACTORY_INTEGRATION_R1',
   templateOnly:true,pending:['ACTUAL_ROOT_CLOSED_PARENT','CHECKED_SOURCE_PINS'],rootDecisionSha256:evidence.formalRootDecisionSha256,
   continuationReadSha256:evidence.knownPins.continuation.sha256,rootParentSealSha256:null,
   acceptedParent:{definitionReleaseId:null,searchReleaseId:null,recordedReleaseSourceCommit:null,releaseSourceTree:null},
   sourcePinsAtIntegration:Object.fromEntries(Object.entries(paths).map(([key,path])=>[key,{path,sha256:null}]))};
  expect(()=>integration(pending)).toThrow();pending.templateOnly=false;pending.pending=[];expect(()=>integration(pending)).toThrow();
 });
 test('pending parent descriptor never passes the pure declaration guard',()=>{
  expect(()=>parent({contract:'root-painting03002-create-parent-seal/r1',status:'ROOT_SEALED_ACTUAL_CURRENT_PARENT_FOR_PAINTING03002_CREATE_APPEND_R1',
   templateOnly:true,pending:['ACTUAL_CLOSED_APPLY_READBACK_CURRENT_CONTEXT']},{})).toThrow();
 });
});
