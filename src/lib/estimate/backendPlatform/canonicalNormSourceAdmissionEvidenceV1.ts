import type { CanonicalEstimateRevisionRowView } from './contracts';
import type { CanonicalPhysicalNormRevisionV1 } from './canonicalPhysicalNormEvidenceV1';
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from '../v4/domainFactory/professionalPhysicalNormApplicabilityV1';
import type { ProfessionalNormSourceAdmission } from '../professionalNormSourceAdmissionContract';
import { canonicalProjectedNormIdentityV1 } from './canonicalNormativeTraceV1';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';

export type CanonicalNormSourceAdmissionContextV1={revision:CanonicalPhysicalNormRevisionV1;row:CanonicalEstimateRevisionRowView;resolution:ProfessionalPhysicalNormApplicabilityResolutionV1|null};
export type CanonicalNormSourceAdmissionEvidenceV1={
  contractVersion:'canonical-norm-source-admission/v1';owner:'canonical-estimate-backend';
  revisionId:string;releaseId:string;catalogId:string;revisionChecksumSha256:string;rowId:string;rowSha256:string;
  normIdentity:{normSourceId:string|null;normId:string|null;normVersion:string|null};
  resolutionSha256:string;decision:ProfessionalNormSourceAdmission;
};
export type CanonicalNormSourceAdmissionProjectionV1=(input:CanonicalNormSourceAdmissionContextV1)=>CanonicalNormSourceAdmissionEvidenceV1|null;
const object=(value:unknown):value is Record<string,unknown>=>value!=null&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;
const nullableText=(value:unknown)=>value===null||text(value);
const sha=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);
const rejectedReasons=['SOURCE_ID_MISSING','STATIC_REGISTRY_IDENTITY_MISMATCH','PHYSICAL_APPLICABILITY_NOT_APPLIED',
  'PHYSICAL_APPLICABILITY_IDENTITY_MISMATCH','PHYSICAL_RUNTIME_BINDING_MISSING','NORMATIVE_SOURCE_REGISTRY_MISSING_OR_INACTIVE',
  'BACKEND_SOURCE_ADMISSION_REQUIRED','BACKEND_SOURCE_ADMISSION_IDENTITY_MISMATCH'];
function decision(value:unknown):value is ProfessionalNormSourceAdmission {
  if(!object(value))return false;
  return value.admitted===true
    ? (value.route==='STATIC_CATALOG_REGISTRY'&&value.reason==='ADMITTED_STATIC_CATALOG_REGISTRY')
      ||(value.route==='CANONICAL_PHYSICAL_APPLICABILITY'&&value.reason==='ADMITTED_CANONICAL_PHYSICAL_APPLICABILITY')
    : value.admitted===false&&value.route==='NONE'&&typeof value.reason==='string'&&rejectedReasons.includes(value.reason);
}
export function isCanonicalNormSourceAdmissionEvidenceV1(value:unknown):value is CanonicalNormSourceAdmissionEvidenceV1 {
  if(!object(value)||!object(value.normIdentity))return false;
  const identity=value.normIdentity;
  return value.contractVersion==='canonical-norm-source-admission/v1'&&value.owner==='canonical-estimate-backend'
    &&[value.revisionId,value.releaseId,value.catalogId,value.rowId].every(text)
    &&sha(value.revisionChecksumSha256)&&sha(value.rowSha256)&&sha(value.resolutionSha256)
    &&object(value.normIdentity)&&['normSourceId','normId','normVersion'].every(key=>Object.hasOwn(identity,key))
    &&nullableText(value.normIdentity.normSourceId)&&nullableText(value.normIdentity.normId)&&nullableText(value.normIdentity.normVersion)
    &&decision(value.decision);
}
/** Hash the exact JSON text as a string, avoiding numeric normalization of its contents. */
export function canonicalNormResolutionIdentitySha256V1(resolution:unknown):string {
  return canonicalEstimateSha256HexText(JSON.stringify(resolution ?? null));
}
export const readCanonicalNormSourceAdmissionEvidenceV1:CanonicalNormSourceAdmissionProjectionV1=input=>{
  const value=input.row.normSourceAdmissionEvidenceV1;
  if(value==null)return null;
  const identity=canonicalProjectedNormIdentityV1(input.row,input.resolution);
  if(!isCanonicalNormSourceAdmissionEvidenceV1(value)||value.revisionId!==input.revision.revisionId
    ||value.releaseId!==input.revision.releaseId||value.catalogId!==input.revision.catalogId
    ||value.revisionChecksumSha256!==input.revision.checksumSha256||value.rowId!==input.row.rowId||value.rowSha256!==input.row.rowSha256
    ||value.normIdentity.normSourceId!==identity.normSourceId||value.normIdentity.normId!==identity.normId||value.normIdentity.normVersion!==identity.normVersion
    ||value.resolutionSha256!==canonicalNormResolutionIdentitySha256V1(input.resolution)) {
    throw Object.assign(new Error('backend norm source admission identity mismatch'),{code:'CANONICAL_NORM_SOURCE_ADMISSION_IDENTITY_MISMATCH'});
  }
  return value;
};
