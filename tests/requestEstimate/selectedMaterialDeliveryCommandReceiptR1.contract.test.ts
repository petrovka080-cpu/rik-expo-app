import {canonicalEstimateRecalculateIdempotencyKey as key} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCommandIdentity';
import {canonicalUserCommandSemanticPayloadV1 as semantic,readCanonicalUserCommandReplayV1 as replay} from '../../src/lib/estimate/backendPlatform/canonicalUserCommandIntentV1';
import {buildCanonicalRevisionCommitPayload as payload} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {parseCanonicalSelectedMaterialDeliveryRequestR1 as parse} from '../../src/lib/estimate/backendPlatform/canonicalSelectedMaterialDeliveryContractR1';

const revision='11111111-1111-4111-8111-111111111111';
const request=()=>({contractVersion:'canonical-selected-material-delivery-request/v1' as const,
 readFence:{contractVersion:'canonical-selected-delivery-read-fence/v1' as const,parentRevisionId:revision,parentChecksumSha256:'1'.repeat(64),readSetSha256:'2'.repeat(64)},
 command:{contractVersion:'canonical-selected-material-delivery-command/v1' as const,consignmentId:'synthetic:shipment',documentReference:'synthetic:document',documentCapturedAt:'2026-10-17T00:00:00Z',separatePaymentConfirmed:true as const,
  skuBindings:[{rowId:'synthetic:material-order',skuKey:'synthetic:sku'}]}});
const identity=(delivery=request())=>({parentRevisionId:revision,parameters:{selected_delivery_cargo_weight_kg:6396},rowOverrides:{},customRows:[],selectedMaterialDeliveryV1:delivery});
test('delivery command and its saved-context fence participate in semantic replay',()=>{
 const delivery=request();expect(semantic({parameters:{},currencyCode:'KGS',selectedMaterialDeliveryV1:delivery}).selectedMaterialDeliveryV1).toEqual(delivery);
});
test.each(['consignmentId','documentReference'] as const)('another %s cannot replay under the same command identity',field=>{
 const first=request(),second=request();second.command[field]+=':changed';expect(key(identity(first))).not.toBe(key(identity(second)));
});
test('a changed row or price fingerprint changes command identity',()=>{
 const first=request(),second=request();second.readFence.readSetSha256='3'.repeat(64);expect(key(identity(first))).not.toBe(key(identity(second)));
});
test('exact shipment inputs survive the established six-decimal hash canonicalization',()=>{
 const original=identity(),changed={...identity(),parameters:{selected_delivery_cargo_weight_kg:6396.0000001}};
 expect(key(original)).not.toBe(key(changed));
});
test('a legacy command has precisely the same identity when delivery is absent',()=>{
 const ordinary={parentRevisionId:revision,parameters:{q:10},rowOverrides:{},customRows:[]};
 expect(key(ordinary)).toBe(key({...ordinary}));expect(semantic({parameters:{q:10},currencyCode:'KGS'})).not.toHaveProperty('selectedMaterialDeliveryV1');
});
test('same interactive intent with another saved delivery is a conflict, not a replay',async()=>{
 const old=request(),next=request();next.command.consignmentId+=':changed';
 const current:any={ownerUserId:'owner',organizationId:null,targetReleaseId:'release',operation:'recalculate',catalogId:'catalog',parentRevisionId:revision,
  clientIdempotencyKey:'same-intent',persistenceIdempotencyKey:'same-intent',payload:{parameters:{},currencyCode:'KGS',selectedMaterialDeliveryV1:next,commandIntentV1:{contractVersion:'canonical-user-command-intent:v1',key:'same-intent'}}};
 const store={query:async(_sql:string,values?:any[])=>({rows:values?.length===1?[]:[{...current,owner_user_id:'owner',organization_id:null,target_release_id:'release',operation:'recalculate',catalog_id:'catalog',parent_revision_id:revision,
  status:'succeeded',result_revision_id:'child',input_payload:{...current.payload,selectedMaterialDeliveryV1:old}}]})};
 await expect(replay(store,current)).rejects.toMatchObject({code:'COMMAND_INTENT_PAYLOAD_MISMATCH'});
});
test('the existing writer stores the server receipt without rebasing its origin onto the child UUID',()=>{
 const receipt={contractVersion:'canonical-selected-material-delivery-receipt/v1',originRevisionId:revision,originChecksumSha256:'1'.repeat(64),ownerKey:'one-immutable-owner',savedRowSha256:'4'.repeat(64)};
 const result=payload({selectedMaterialDeliveryV1:receipt,rowCount:1,currencyCode:'KGS',totals:{amount:'0'},checksumSha256:'5'.repeat(64),compilerVersion:'staged',parameters:{},approvedTemplateBaselineId:null,
  baselineAssumptions:{},effectiveUserParameters:{},parentRevisionId:revision,identityContract:{}});
 expect((result.parameterSources as any).selectedMaterialDeliveryV1).toEqual(receipt);
 expect(result.checksumSha256).toBe('5'.repeat(64));expect((result.parameterSources as any).parentRevisionId).toBe(revision);
});
test('normal writer payloads keep their old shape when there is no delivery',()=>{
 const result=payload({rowCount:0,currencyCode:'KGS',totals:{amount:'0'},checksumSha256:'6'.repeat(64),compilerVersion:'staged',parameters:{},approvedTemplateBaselineId:null,
  baselineAssumptions:{},effectiveUserParameters:{},parentRevisionId:null,identityContract:{}});
 expect(result.parameterSources).not.toHaveProperty('selectedMaterialDeliveryV1');
});
test('the request shape rejects a caller-supplied paid owner or saved row',()=>{
 const invalid={...request(),existingOwners:[],savedRow:{quantity:'3'}};expect(()=>parse(invalid)).toThrow(expect.objectContaining({code:'INVALID_ARGUMENT'}));
});
test('the typed document request retains the exact acknowledgement',()=>{
 const original=request();expect(parse(original)).toEqual(original);
});
