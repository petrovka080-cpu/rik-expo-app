// Prospective pure guards only; CONTROL hashes/semantic vectors cannot satisfy actual file admission.
import {createHash} from 'node:crypto';
import {assertManualTrench05701RootDecisionR1 as decisionCheck,assertManualTrench05701GroupCaptureR1 as groupCheck,
 assertManualTrench05701RoadParentProofsR1 as parentCheck,prepareManualTrench05701AdmittedMasterAppendR1 as factory} from './prepareManualTrench05701AdmittedMasterAppendR1';
import evidence from '../../../data/estimate-benchmarks/fixtures/manual-trench05701-accepted-anchors-r1.json';
type Json=Record<string,any>;
const clone=(x:unknown):Json=>JSON.parse(JSON.stringify(x));
const TEST_ONLY_DECISION=()=>clone({
 "contract": "manual-trench05701-root-partial-append-decision/r1",
 "status": "ROOT_REVIEWED_SOURCE_SPECIFIC_PARTIAL_MANUAL_TRENCH05701_APPEND_R1",
 "decision": "ADMIT_SOURCE_SPECIFIC_PARTIAL_APPEND",
 "identity": {
  "catalogId": "canonical-work:master:manual_trench_sloped_depth_upto2m_soil1_actual_bank_m3_krer01_02_057_01",
  "workKey": "manual_trench_sloped_depth_upto2m_soil1_actual_bank_m3_krer01_02_057_01",
  "sourceIdentity": "kg:krer01:01-02-057-01:manual-trench:depth-le2m:no-support:designed-slopes:soil1:actual-bank-m3"
 },
 "source": {
  "sourceKey": "kg_krer01_02_057_01_manual_sloped_trench_g1_r1",
  "normId": "KRER01-02-057-01",
  "artifactSha256": "91c4f4db762840481de41f57b6771b5ae0adf0dada240dc1f03655e9d71eab6b",
  "primaryMeasureParameterId": "actual_manual_trench_bank_volume_m3",
  "primaryUnitId": "m3",
  "sourceDenominator": 100
 },
 "searchPlacement": {
  "groupMode": "join",
  "groupId": "wg:base:earthworks_interior_trench_excavate",
  "domainId": "earthworks",
  "systemId": "earthworks",
  "membershipOrdinal": 6,
  "capturedMemberCount": 6
 },
 "sourcePreimage": {
  "sourceKey": "kg_krer01_02_057_01_manual_sloped_trench_g1_r1",
  "expected": null
 },
 "captureScope": {
  "contract": "master-bounded-join-group-capture/r1",
  "memberCount": 6,
  "maxMembers": 32,
  "captureSha256": "4c131d2e1a5b21696494b03d3348c6d9f0a25b62a7b93ee633bfe143496816e7"
 },
 "titleRu": "Ручная разработка траншеи с откосами, глубина до 2 м, грунт группы 1",
 "shape": [
  18,
  10,
  10
 ],
 "normativeBindings": 1,
 "priceBindings": 0,
 "parameterSources": {
  "known": 9,
  "unresolvedEmpty": 9,
  "derivedEmpty": 0
 },
 "paidOwnerRowIds": [
  "manual-trench:krer01-02-057-01:whole-manual-excavation-labor"
 ],
 "informationalSourceRowIds": [],
 "includedOperations": [
  "dig-and-throw-to-edge",
  "bottom-and-wall-cleaning",
  "throw-back-from-edge"
 ],
 "applicationNeedRowIds": [
  "manual-trench:krer01-02-057-01:need:project-norm-applicability",
  "manual-trench:krer01-02-057-01:need:underground-utilities-and-site-safety",
  "manual-trench:krer01-02-057-01:need:site-preparation",
  "manual-trench:krer01-02-057-01:need:setting-out-and-survey",
  "manual-trench:krer01-02-057-01:need:temporary-water-management",
  "manual-trench:krer01-02-057-01:need:tools-and-consumables",
  "manual-trench:krer01-02-057-01:need:spoil-balance-and-haul",
  "manual-trench:krer01-02-057-01:need:follow-on-work-and-reinstatement",
  "manual-trench:krer01-02-057-01:need:acceptance-and-final-cleanup"
 ],
 "machinePriceMappings": [],
 "purchaseOwners": [],
 "quantityScope": "PARTIAL",
 "technicalScopeStatus": "NEEDS_SOURCE",
 "fullTechnicalAcceptance": false,
 "newCompleteTypesAccepted": 0,
 "productionEligible": false,
 "activationAllowed": false,
 "genericExcavationAlreadyExists": true,
 "globalPhysicalAbsenceProved": false,
 "existingEightDisposition": "KEEP_CURRENT_IMMUTABLE",
 "existingGroupLabelDisposition": "PRESERVE_EXISTING_PRESENTATION_LABEL_NOT_HIGH_LOAD_APPLICABILITY",
 "acceptedParent": {
  "definitionReleaseId": "a6a6b3be-16c2-5328-96fc-78199642064a",
  "searchReleaseId": "1a4e87b5-db76-562b-9480-571ea353b542"
 },
 "readPins": {
  "headers": {
   "path": "TEST_ONLY_NO_FILE_ADMISSION",
   "sha256": "d777ff23a2d0fb2fd86d017ca5098d0e1c79cdfe6b7280c2bbb9a4254b6e7616"
  },
  "bodies": {
   "path": "TEST_ONLY_NO_FILE_ADMISSION",
   "sha256": "7341a49fef8f6dbeb0a77d977205566bc3acab2055d894290c074ab1677c0ef5"
  },
  "group": {
   "path": "TEST_ONLY_NO_FILE_ADMISSION",
   "sha256": "4c131d2e1a5b21696494b03d3348c6d9f0a25b62a7b93ee633bfe143496816e7"
  }
 },
 "integrationSourceStatus": "ROOT_CHECKED_EXACT_MASTER_APPEND_BOUNDED6_AND_EXPLICIT_SOURCES_R1",
 "sourcePinsAtIntegration": {
  "master": {
   "path": "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
   "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "appendGuards": {
   "path": "scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts",
   "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "parameterSourceMap": {
   "path": "scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts",
   "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "publisher": {
   "path": "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
   "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "compiler": {
   "path": "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
   "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "quantityModule": {
   "path": "src/lib/estimate/v4/manualSlopedTrenchGroup1Krer01QuantityR1.ts",
   "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "quantityPack": {
   "path": "data/estimate-benchmarks/source-packs/manual-sloped-trench-g1-krer01-057-01-quantity-r1.json",
   "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "admittedWrapper": {
   "path": "src/lib/estimate/v4/manualTrench05701AdmittedR1.ts",
   "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "factory": {
   "path": "scripts/estimate/r4a13/prepareManualTrench05701AdmittedMasterAppendR1.ts",
   "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "anchorsFixture": {
   "path": "data/estimate-benchmarks/fixtures/manual-trench05701-accepted-anchors-r1.json",
   "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  }
 }
});
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
function alterGroupRaw(read:Json,mutate:(rows:Json[])=>void){const set=read.sets.exactSingleGroupCurrentAnchors,rows:Json[]=set.rawRows.map((raw:string)=>JSON.parse(raw));mutate(rows);set.rawRows=rows.map(row=>JSON.stringify(row));set.rowCount=rows.length;set.sha256=sha(set.rawRows.join('\n')+(rows.length?'\n':''));}

describe('manual trench05701 Master factory preparation; author NOT_RUN',()=>{
 it('accepts only exact partial decision schema in TEST_ONLY data, without file admission',()=>expect(()=>decisionCheck(TEST_ONLY_DECISION())).not.toThrow());
 it.each([
  ['status',true],['decision','COMPLETE'],['shape',[18,10,11]],['normativeBindings',10],['priceBindings',1],
  ['parameterSources',{known:18,unresolvedEmpty:0,derivedEmpty:0}],['paidOwnerRowIds',['extra-cleaning','extra-throwback']],
  ['includedOperations',[]],['applicationNeedRowIds',[]],['machinePriceMappings',[{code:'CONTROL_ONLY',price:'77'}]],['purchaseOwners',['soil-order']],
  ['fullTechnicalAcceptance',true],['newCompleteTypesAccepted',1],['globalPhysicalAbsenceProved',true],['existingEightDisposition','REPLACE'],
  ['existingGroupLabelDisposition','RENAME_IN_THIS_APPEND'],['integrationSourceStatus','AUTHOR_PREPARED_ONLY'],
  ['acceptedParent',{definitionReleaseId:'8b09255d-82a5-501b-9b60-e70587ff5579',searchReleaseId:'c8331c4b-dad5-5402-8c8e-2474df83d4ff'}],
 ])('rejects widened or false ROOT field %s',(key,value)=>{const d=TEST_ONLY_DECISION();d[key as string]=value;expect(()=>decisionCheck(d)).toThrow();});
 it('rejects one-m3 denominator instead of the printed100m3',()=>{const d=TEST_ONLY_DECISION();d.source.sourceDenominator=1;expect(()=>decisionCheck(d)).toThrow();});
 it('rejects borrowed source or primary unit',()=>{const d=TEST_ONLY_DECISION();d.source.primaryUnitId='m';expect(()=>decisionCheck(d)).toThrow();});
 it('rejects wrong count/tail/capture for the actual6membergroup',()=>{const d=TEST_ONLY_DECISION();d.searchPlacement.membershipOrdinal=7;expect(()=>decisionCheck(d)).toThrow();});
 it('requires the actualgroupSHA and doesnot accept declaredcountalone',()=>{const d=TEST_ONLY_DECISION();d.captureScope.captureSha256='a'.repeat(64);expect(()=>decisionCheck(d)).toThrow();});
 it('requires sourceabsence rather than reuse of identicalartifact',()=>{const d=TEST_ONLY_DECISION();d.sourcePreimage.expected={artifact_sha256:d.source.artifactSha256};expect(()=>decisionCheck(d)).toThrow();});
 it('rejects missing integrationpin while retaining historicalsourcepins elsewhere',()=>{const d=TEST_ONLY_DECISION();d.sourcePinsAtIntegration.master.sha256=null;expect(()=>decisionCheck(d)).toThrow();});
 it('doesnot accept a swapped rawread pin',()=>{const d=TEST_ONLY_DECISION();d.readPins.bodies.sha256=d.readPins.headers.sha256;expect(()=>decisionCheck(d)).toThrow();});
 it('projects actual6anchors to the existing boundedMaster captureShape',()=>{
  const actual=groupCheck(clone(evidence.groupCaptureForPureRegression));expect(actual.capturedJoinGroupMembers.members).toEqual(evidence.capturedJoinGroupMembers.members);
  expect(actual.capturedJoinGroupMembers.captureScope).toEqual({contract:'master-bounded-join-group-capture/r1',memberCount:6,maxMembers:32,captureSha256:evidence.readPins.group.sha256});
 });
 it.each(['definitionVersionId','approvedTemplateBaselineId','definitionSha256','sourceIdentity','ordinal'])('rejects samecount changedmember%s even after rawhash recomputation',key=>{
  const d=clone(evidence.groupCaptureForPureRegression);alterGroupRaw(d,rows=>{rows[0]![key]=key==='ordinal'?1:'CONTROL_CHANGED';});expect(()=>groupCheck(d)).toThrow();
 });
 it('rejects missing or extra member instead of truncating thegroup',()=>{
  for(const action of ['missing','extra']){const d=clone(evidence.groupCaptureForPureRegression);alterGroupRaw(d,rows=>{if(action==='missing')rows.pop();else rows.push({...rows[0],catalogId:'CONTROL_EXTRA'});});expect(()=>groupCheck(d)).toThrow();}
 });
 it('rejects a forged capturedlist even when rawcurrentanchors remain correct',()=>{const d=clone(evidence.groupCaptureForPureRegression);d.capturedJoinGroupMembers.members[0].workKey='FORGED';expect(()=>groupCheck(d)).toThrow();});
 it('requires contextual parentrelease consistency without claiming historicalentrySHA unchanged',()=>{const d=clone(evidence.groupCaptureForPureRegression);alterGroupRaw(d,rows=>{rows[0]!.manifestReleaseId='8b09255d-82a5-501b-9b60-e70587ff5579';});expect(()=>groupCheck(d)).toThrow();});
 it('correlates the actualacceptedROADpublication and readback schemas',()=>{const x=clone(evidence.parentProofsForPureRegression);expect(()=>parentCheck(x.apply,x.readback,x.acceptance)).not.toThrow();});
 it.each(['phase','completeReadSet','sourceHead','newState','preservation','actualReceiptSuccessor'])('rejects a changed acceptedparent proof field %s',key=>{
  const x=clone(evidence.parentProofsForPureRegression),r=x.readback;
  if(key==='phase')r.phase='dry';else if(key==='completeReadSet')r.completeReadSet=false;else if(key==='sourceHead')r.sourceHead='a'.repeat(40);
  else if(key==='newState')r.newState.priceBindings=1;else if(key==='preservation')r.preservation.unrelatedManifestMappings.unrelated_changed=1;else r.actualReceiptSuccessor.releaseId='8b09255d-82a5-501b-9b60-e70587ff5579';
  expect(()=>parentCheck(x.apply,x.readback,x.acceptance)).toThrow();
 });
 it('failsclosed with no ROOTdecision/source seals before publication or file path fallback',()=>{
  expect(()=>factory({rootDecisionPin:null,rootParentSealPin:null,sourceArtifactPin:null} as any)).toThrow('TRENCH05701_EXPLICIT_PIN_REQUIRED');
 });
});
