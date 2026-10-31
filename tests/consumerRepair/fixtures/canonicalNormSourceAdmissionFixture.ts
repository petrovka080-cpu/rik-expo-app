import type {CanonicalEstimateRevisionRowView} from '../../../src/lib/estimate/backendPlatform/contracts';
import type {CanonicalPhysicalNormRevisionV1} from '../../../src/lib/estimate/backendPlatform/canonicalPhysicalNormEvidenceV1';
import {projectCanonicalNormSourceAdmissionEvidenceV1} from '../../../src/lib/estimate/backendPlatform/canonicalEstimatePhysicalNormProjection';
import {RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,resolveProfessionalPhysicalNormParameterValuesV1} from '../../../src/lib/estimate/v4/domainFactory';
import type {ProfessionalParameterValueV4} from '../../../src/lib/estimate/v4/professionalProjectAssemblyV4';
const NOW='2026-09-13T00:00:00.000Z';
function explicit(
  value: string | number,
  unitId: string | null = null,
): ProfessionalParameterValueV4 {
  return {
    value,
    unit_id: unitId,
    source_type: "USER_EXPLICIT",
    source_id: `test:${String(value)}`,
    captured_at: NOW,
    confidence: "high",
    applicability: "Exact test project value",
  };
}

export function appliedFormworkResolution() {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FORMWORK_MEASUREMENT",
    operation_class: "MEASURE",
    material_system: "FORMWORK_CONTACT_AREA",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: {
      product_profile_id: explicit(RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID),
      measured_formwork_contact_area_m2: explicit(10, "m2"),
      project_drawing_reference: explicit("FW-01-REV-A"),
      element_type: explicit("WALL"),
      element_dimensions_and_face_count: explicit("5m x 1m x 2 faces"),
      plain_or_special_finish: explicit("PLAIN"),
      vertical_battered_horizontal_or_curved_class: explicit("VERTICAL"),
      single_or_double_sided_scope: explicit("DOUBLE_SIDED"),
      openings_voids_and_deduction_rule: explicit("PROJECT_RULE:none"),
      permanent_or_removable_formwork: explicit("REMOVABLE"),
      project_measurement_rule_reference: explicit("RICS_NRM2_WS11_CONFIRMED:FW-01-REV-A"),
      estimator_approval_reference: explicit("EST-FW-01"),
    },
  });
}

/** Unit-test transport fixture; no authenticated API/admission receipt is asserted. */
export function boundNormSourceFixture(resolution=appliedFormworkResolution()) {
 const revision:CanonicalPhysicalNormRevisionV1={revisionId:'TEST_ONLY_REVISION',releaseId:'TEST_ONLY_RELEASE',catalogId:'TEST_ONLY_CATALOG',
  checksumSha256:'a'.repeat(64),parameters:{},createdAt:NOW};
 const row:CanonicalEstimateRevisionRowView={rowId:'TEST_ONLY_ROW',rowSha256:'b'.repeat(64),ordinal:0,section:'Р Р°Р±РѕС‚С‹',category:'construction_work',
  titleRu:'РўРµСЃС‚РѕРІР°СЏ СЃС‚СЂРѕРєР°',unitId:'m2',quantity:'10',unitPrice:null,amount:null,currencyCode:null,procurementEligible:false,
  includedInEstimate:true,includedInProcurement:false,ownershipStatus:'OWNED',calculationTrace:{formulaId:'TEST_ONLY',inputParameterIds:[],resourceGraph:{}},
  normativeTrace:[{document_code:resolution.source_id,source_id:resolution.source_id,norm_id:resolution.norm_id,source_document_version:resolution.source_document_version}]};
 const context={revision,row,resolution};
 const evidence=projectCanonicalNormSourceAdmissionEvidenceV1(context);if(!evidence)throw Error('TEST_FIXTURE_EXPECTS_BOUND_APPLIED_RESOLUTION');
 const source={canonicalBackendRevisionId:revision.revisionId,canonicalBackendReleaseId:revision.releaseId,canonicalBackendCatalogId:revision.catalogId,
  canonicalBackendRevisionChecksumSha256:revision.checksumSha256,rowCode:row.rowId,rowSha256:row.rowSha256,
  professionalPhysicalNormApplicabilityV1:resolution,canonicalNormSourceAdmissionEvidenceV1:evidence};
 const input={normSourceId:resolution.source_id,normId:resolution.norm_id,normVersion:resolution.source_document_version,sourceParameters:source};
 return {context,source,input};
}
