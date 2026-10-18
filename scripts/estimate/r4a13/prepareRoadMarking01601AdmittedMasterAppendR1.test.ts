// Prospective 17 schema cases only. No file pins or publication are manufactured by this TEST_ONLY object.
import {assertRoad01601RootDecisionR1 as check} from './prepareRoadMarking01601AdmittedMasterAppendR1';
import {roadMarking01601CatalogIdR1 as catalogId,roadMarking01601WorkKeyR1 as workKey,roadMarking01601SourceIdentityR1 as sourceIdentity,
 roadMarking01601GroupIdR1 as groupId,roadMarking01601RootDecisionStatusR1 as status} from '../../../src/lib/estimate/v4/roadMarking01601AdmittedR1';
import {roadMarking01601QuantityPackR1 as pack,roadMarking01601PrimaryR1 as primary,roadMarking01601PrefixR1 as prefix,
 roadMarking01601NeedRowIdsR1 as needs} from '../../../src/lib/estimate/v4/roadMarkingContinuous100Pf133QuantityR1';
function TEST_ONLY_DECISION():Record<string,any>{return {
 contract:'road-marking01601-root-partial-append-decision/r1',status,decision:'ADMIT_SOURCE_SPECIFIC_PARTIAL_APPEND',
 identity:{catalogId,workKey,sourceIdentity},source:{sourceKey:pack.sourceKeyProposal,normId:pack.normId,artifactSha256:pack.source.sha256,primaryMeasureParameterId:primary,primaryUnitId:'km',sourceDenominator:1},
 searchPlacement:{groupMode:'join',groupId,domainId:'transport',systemId:'transport',membershipOrdinal:1,capturedMemberCount:1},sourcePreimage:{sourceKey:pack.sourceKeyProposal,expected:null},
 captureScope:{contract:'master-bounded-join-group-capture/r1',memberCount:1,maxMembers:32,captureSha256:'074ece84478be854a9077e28d1b1639af14505a4f6ed2a71e47798883e8ebbaf'},
 titleRu:'Нанесение сплошной разметки шириной 100 мм эмалью ПФ-133 тёмно-серой',shape:[17,16,16],normativeBindings:6,priceBindings:0,parameterSources:{known:7,unresolvedEmpty:10,derivedEmpty:0},
 paidOwnerRowIds:[prefix+':whole-marking-labor'],informationalSourceRowIds:pack.rows.slice(1).map(x=>prefix+':'+x.suffix),applicationNeedRowIds:[...needs],machinePriceMappings:[],purchaseOwners:[],
 quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,productionEligible:false,activationAllowed:false,genericRoadMarkingAlreadyExists:true,
 globalPhysicalAbsenceProved:false,otherFourInstallBodies:'HEADER_ONLY_NOT_EXCLUDED',old128RowsDisposition:'KEEP_CURRENT_EXACT',
 acceptedParent:{definitionReleaseId:'8b09255d-82a5-501b-9b60-e70587ff5579',searchReleaseId:'c8331c4b-dad5-5402-8c8e-2474df83d4ff'},
 commonGroupGuardStatus:'ROOT_REVIEWED_EXISTING_APPEND_GUARD_EXACT_ROAD_COUNT1_AND_LEGACY4_R2',commonGroupGuardPin:{path:'TEST_ONLY_NOT_A_REAL_ROOT_PIN',sha256:'a'.repeat(64)}
};}
describe('road01601 future ROOT decision schema, no real ROOT file/admission exercised',()=>{
 it('accepts only the exact partial shape in a pure schema test; factory still requires real byte-pinned files',()=>expect(()=>check(TEST_ONLY_DECISION())).not.toThrow());
 it.each([
  ['status','ROOT_ADMITTED_ROAD_MARKING_SOURCE_SPECIFIC_PARTIAL_PREPARATION_R1'],['decision',true],['shape',[17,16,17]],['normativeBindings',16],
  ['priceBindings',1],['parameterSources',{known:17,unresolvedEmpty:0,derivedEmpty:0}],['machinePriceMappings',[{row:'12-0400',unitPrice:'77'}]],
  ['purchaseOwners',['paint-pack']],['fullTechnicalAcceptance',true],['globalPhysicalAbsenceProved',true],['old128RowsDisposition','REPLACE'],
  ['applicationNeedRowIds',[]],['searchPlacement',{groupMode:'join',groupId,domainId:'transport',systemId:'transport',membershipOrdinal:4,capturedMemberCount:4}],
  ['captureScope',{contract:'master-bounded-join-group-capture/r1',memberCount:4,maxMembers:32,captureSha256:'074ece84478be854a9077e28d1b1639af14505a4f6ed2a71e47798883e8ebbaf'}],
  ['acceptedParent',{definitionReleaseId:'975c1da2-fa72-5a0d-8941-283f7ad933e6',searchReleaseId:'5701b1c0-667e-5c38-8737-baa655316b05'}],
 ])('rejects wrong or widened field %s',(key,value)=>{const d=TEST_ONLY_DECISION();d[key as string]=value;expect(()=>check(d)).toThrow();});
 it('rejects the known legacy4-only common guard even with a forged count1 acceptance status',()=>{
  const d=TEST_ONLY_DECISION();d.commonGroupGuardPin.sha256='8fe83695ae2e8b2f524359b8ea9b0f30360d1c35d26d01eb27ee0e5ef81648e7';
  expect(()=>check(d)).toThrow('ROAD01601_EXACT_COUNT1_COMMON_GUARD_NOT_ADOPTED');
 });
});
