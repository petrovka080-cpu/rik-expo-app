import {createHash} from 'node:crypto';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import pack from '../../../data/estimate-norms/professional/delivery.json';
import {FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA as norm} from '../../../src/lib/estimate/v4/domainFactory/deliveryFordTransitPhysicalNormV1';
const hash=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex');
const uuid=(value:unknown)=>{const chars=hash(value).slice(0,32).split('');chars[12]='5';chars[16]='8';const s=chars.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
/** A preparation payload for the existing registry, without SQL or activation.
 * artifact_sha256 identifies the reviewed local JSON, never the remote PDF.
 * The manufacturer reference rate remains forbidden as an automatic rate.
 */
export function prepareSelectedDeliveryNormativeRegistryR1(input:Readonly<{reviewedNormPackBytes:Uint8Array;expectedNormPackSha256:string}>){
 const bytesSha=createHash('sha256').update(input.reviewedNormPackBytes).digest('hex');
 if(bytesSha!==input.expectedNormPackSha256||!/^[a-f0-9]{64}$/u.test(bytesSha))throw new Error('DELIVERY_REVIEWED_SOURCE_BYTES_CHANGED');
 const artifact=JSON.parse(Buffer.from(input.reviewedNormPackBytes).toString('utf8').replace(/^\uFEFF/u,''));
 if(hash(artifact)!==hash(pack)||artifact.review_status!=='reviewed'||artifact.source_pack_version!==norm.source_document_version)throw new Error('DELIVERY_REVIEWED_SOURCE_IDENTITY_CHANGED');
 const item=artifact.norm_items.find((entry:Record<string,unknown>)=>entry.norm_id===norm.norm_id);
 if(!item||item.unit!=='trip'||item.source.url!==norm.source_url||item.source.page!==norm.exact_locator
  ||item.applicability.reference_rate_not_for_automatic_production_binding!==true)throw new Error('DELIVERY_REVIEWED_LOCATOR_CHANGED');
 const sourceId=uuid(['selected-delivery-existing-reviewed-source',norm.source_id,bytesSha]);
 const locatorKey=`${norm.norm_id}:${norm.source_document_version}:${norm.definition_hash}`;
 const source={id:sourceId,source_key:norm.source_id,title_ru:'Ford Transit V363: проверенный профиль ограничений выбранной машины',
  authority:'Ford Motor Company; existing reviewed local norm pack',official_url:norm.source_url,artifact_sha256:bytesSha,
  metadata:{artifactKind:'REVIEWED_LOCAL_NORM_PACK_JSON',artifactPath:'data/estimate-norms/professional/delivery.json',
   remotePdfBytesHashed:false,sourcePackVersion:norm.source_document_version,reviewEvidence:artifact.review_evidence,
   licenseStatus:artifact.license_status,existingNormReused:true,newPhysicalNorms:0,automaticReferenceRateAllowed:false}};
 const locator={id:uuid([sourceId,locatorKey]),source_id:sourceId,locator_key:locatorKey,
  locator:{normId:norm.norm_id,sourceUrl:norm.source_url,exactLocator:norm.exact_locator,sourceDefinitionHash:norm.definition_hash,
   sourceDocumentVersion:norm.source_document_version,unitId:'trip',selectedVehicleFactsRequired:true,automaticReferenceRateAllowed:false,
   supplierPaymentAndUnloadingIncluded:false,reviewedNormItemSha256:hash(item)},excerpt_sha256:hash(item)};
 return {source,locator,registeredInDatabase:false as const,publicationReady:false as const};
}
