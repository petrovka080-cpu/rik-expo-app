import type { ProfessionalNormSourceAdmission, ProfessionalNormSourceAdmissionInput } from './professionalNormSourceAdmissionContract';
import { classifyStaticProfessionalNormSourceAdmission } from './professionalNormSourceStaticAdmission';
import { isCanonicalNormSourceAdmissionEvidenceV1,canonicalNormResolutionIdentitySha256V1 } from './backendPlatform/canonicalNormSourceAdmissionEvidenceV1';
export type { ProfessionalNormSourceAdmission, ProfessionalNormSourceAdmissionInput } from './professionalNormSourceAdmissionContract';
const rejected=(reason:ProfessionalNormSourceAdmission['reason']):ProfessionalNormSourceAdmission=>({admitted:false,route:'NONE',reason});
/** Read a bound server decision. A bare APPLIED flag cannot certify a physical norm. */
export function classifyProfessionalNormSourceAdmission(input:ProfessionalNormSourceAdmissionInput):ProfessionalNormSourceAdmission {
  const source=input.sourceParameters,value=source?.canonicalNormSourceAdmissionEvidenceV1;
  if(value==null){
    const staticAdmission=classifyStaticProfessionalNormSourceAdmission(input);
    if(staticAdmission)return staticAdmission;
    const resolution=source?.professionalPhysicalNormApplicabilityV1;
    const applied=resolution!=null&&typeof resolution==='object'&&!Array.isArray(resolution)&&'status' in resolution&&resolution.status==='APPLIED';
    return rejected(applied?'BACKEND_SOURCE_ADMISSION_REQUIRED':'PHYSICAL_APPLICABILITY_NOT_APPLIED');
  }
  if(!isCanonicalNormSourceAdmissionEvidenceV1(value)||value.revisionId!==source?.canonicalBackendRevisionId
    ||value.releaseId!==source?.canonicalBackendReleaseId||value.catalogId!==source?.canonicalBackendCatalogId
    ||value.revisionChecksumSha256!==source?.canonicalBackendRevisionChecksumSha256||value.rowId!==source?.rowCode||value.rowSha256!==source?.rowSha256
    ||value.normIdentity.normSourceId!==(String(input.normSourceId ?? '').trim()||null)
    ||value.normIdentity.normId!==(String(input.normId ?? '').trim()||null)
    ||value.normIdentity.normVersion!==(String(input.normVersion ?? '').trim()||null)
    ||value.resolutionSha256!==canonicalNormResolutionIdentitySha256V1(source?.professionalPhysicalNormApplicabilityV1 ?? null)) {
    return rejected('BACKEND_SOURCE_ADMISSION_IDENTITY_MISMATCH');
  }
  return value.decision;
}
export function isAdmittedProfessionalNormSource(input:ProfessionalNormSourceAdmissionInput):boolean {
  return classifyProfessionalNormSourceAdmission(input).admitted;
}
