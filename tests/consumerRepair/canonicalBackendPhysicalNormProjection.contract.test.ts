import { adaptCanonicalRevisionToStructuredEstimate as projectClientRevision } from '../../src/lib/estimate/backendPlatform/canonicalEstimateClientForemanProjection';
import { attachCanonicalPhysicalNormEvidenceV1, canonicalPhysicalNormRevisionFromStorageV1 } from '../../src/lib/estimate/backendPlatform/canonicalEstimatePhysicalNormProjection';
import { buildStructuredEstimateRequestDraft } from "../../src/lib/estimateStructuredPipeline/structuredEstimateRequestBinding";
import { adaptCanonicalRevisionToStructuredEstimate } from "../../src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter";
import { classifyProfessionalNormSourceAdmission } from "../../src/lib/estimate/professionalNormSourceAdmission";
import type {
  CanonicalEstimateCatalogItem,
  CanonicalEstimateRevisionRowView,
  CanonicalEstimateRevisionView,
} from "../../src/lib/estimate/backendPlatform/contracts";
import { ESTIMATE_PLATFORM_API_VERSION } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
} from "../../src/lib/estimate/v4/domainFactory";

const PARAMETERS = {
  product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  measured_formwork_contact_area_m2: 100,
  project_drawing_reference: "FW-01-REV-A",
  element_type: "WALL",
  element_dimensions_and_face_count: "50 m x 2 m x 1 measured face",
  plain_or_special_finish: "PLAIN",
  vertical_battered_horizontal_or_curved_class: "VERTICAL",
  single_or_double_sided_scope: "SINGLE_SIDED",
  openings_voids_and_deduction_rule: "PROJECT_RULE:no openings",
  permanent_or_removable_formwork: "REMOVABLE",
  project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:FW-01-REV-A",
  estimator_approval_reference: "EST-FW-01",
};

function revision(parameters: Record<string, string | number | boolean> = PARAMETERS): CanonicalEstimateRevisionView {
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    revisionId: "11111111-1111-4111-8111-111111111111",
    parentRevisionId: null,
    releaseId: "22222222-2222-4222-8222-222222222222",
    catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_standard",
    revisionNumber: 1,
    status: "ready",
    sourceRequestText: "РћРїР°Р»СѓР±РєР° RICS NRM 2, РёР·РјРµСЂРµРЅРЅР°СЏ РїР»РѕС‰Р°РґСЊ РєРѕРЅС‚Р°РєС‚Р° 100 РјВІ",
    displayTitleRu: "РћРїР°Р»СѓР±РєР° РїРѕ РёР·РјРµСЂРµРЅРЅРѕР№ РїР»РѕС‰Р°РґРё РєРѕРЅС‚Р°РєС‚Р°",
    primaryMeasureParameterId: "measured_formwork_contact_area_m2",
    primaryMeasureValue: "100",
    primaryMeasureUnitId: "m2",
    currencyCode: "KGS",
    amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
    totals: { amount: "0" },
    rowCount: 1,
    checksumSha256: "a".repeat(64),
    compilerVersion: "canonical-estimate-compile-core-r1",
    parameters,
    createdAt: "2026-09-15T00:00:00.000Z",
  };
}

function row(): CanonicalEstimateRevisionRowView {
  return {
    rowId: "formwork:rics-nrm2:measured-contact-area:work",
    ordinal: 0,
    section: "Р Р°Р±РѕС‚С‹",
    category: "construction_work",
    titleRu: "РњРѕРЅС‚Р°Р¶ Рё РґРµРјРѕРЅС‚Р°Р¶ РѕРїР°Р»СѓР±РєРё РїРѕ РёР·РјРµСЂРµРЅРЅРѕР№ РїР»РѕС‰Р°РґРё РєРѕРЅС‚Р°РєС‚Р°",
    unitId: "m2",
    quantity: "100",
    unitPrice: null,
    amount: null,
    currencyCode: null,
    procurementEligible: false,
    includedInEstimate: true,
    includedInProcurement: false,
    ownershipStatus: "OWNED",
    calculationTrace: {
      formulaId: "rics_nrm2_formwork_measured_contact_area_v1",
      inputParameterIds: ["measured_formwork_contact_area_m2"],
      resourceGraph: {
        professionalPhysicalNormBindingV1: {
          technology_class: "FORMWORK_MEASUREMENT",
          operation_class: "MEASURE",
          material_system: "FORMWORK_CONTACT_AREA",
          scope_mode: "FULL_APPLICABLE_SCOPE",
        },
      },
    },
    normativeTrace: [{
      document_code: RICS_NRM2_FORMWORK_SOURCE_ID,
      source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
      norm_id: RICS_NRM2_FORMWORK_NORM_ID,
      source_document_version: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
      source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
      exact_locator: RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator,
    }],
    rowSha256: "b".repeat(64),
  };
}

const catalog: CanonicalEstimateCatalogItem = {
  catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_standard",
  releaseId: "22222222-2222-4222-8222-222222222222",
  namespace: "global",
  domain: "concrete",
  workKey: "formwork_rics_nrm2_measured_contact_area",
  titleRu: "РћРїР°Р»СѓР±РєР° РїРѕ РёР·РјРµСЂРµРЅРЅРѕР№ РїР»РѕС‰Р°РґРё РєРѕРЅС‚Р°РєС‚Р°",
  definitionVersion: 4,
  applicability: {},
  professionalMetadata: {},
  parameterSchema: [],
};

describe("canonical backend physical norm projection", () => {
  test("replays the shared resolver and preserves the exact source identity", () => {
    const payload = adaptCanonicalRevisionToStructuredEstimate({
      catalog,
      revision: revision(),
      rows: [row()],
    });
    const draft = buildStructuredEstimateRequestDraft(payload);
    expect(payload.rows[0]).toMatchObject({
      normId: RICS_NRM2_FORMWORK_NORM_ID,
      normSourceId: RICS_NRM2_FORMWORK_SOURCE_ID,
      normVersion: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
      sourceParameters: {
        professionalPhysicalNormApplicabilityV1: {
          status: "APPLIED",
          calculated_formwork_measured_contact_area_m2: 100,
          source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
        },
      },
    });
    expect(classifyProfessionalNormSourceAdmission({
      normId: draft.items[0]?.normId,
      normSourceId: draft.items[0]?.normSourceId,
      normVersion: draft.items[0]?.normVersion,
      sourceParameters: draft.items[0]?.sourceParameters,
    })).toMatchObject({
      admitted: true,
      route: "CANONICAL_PHYSICAL_APPLICABILITY",
    });
  });

  test("does not admit the row when an exact applicability input is invalid", () => {
    const payload = adaptCanonicalRevisionToStructuredEstimate({
      catalog,
      revision: revision({ ...PARAMETERS, project_measurement_rule_reference: "UNCONFIRMED" }),
      rows: [row()],
    });
    const item = buildStructuredEstimateRequestDraft(payload).items[0];
    expect(classifyProfessionalNormSourceAdmission({
      normId: item?.normId,
      normSourceId: item?.normSourceId,
      normVersion: item?.normVersion,
      sourceParameters: item?.sourceParameters,
    })).toMatchObject({
      admitted: false,
      reason: "PHYSICAL_APPLICABILITY_NOT_APPLIED",
    });
  });
});


describe('backend physical norm evidence transport', () => {
  test.each([PARAMETERS,{...PARAMETERS,project_measurement_rule_reference:'UNCONFIRMED'}])(
    'client presentation exactly matches existing server projection including applied and blocked evidence', parameters => {
      const rev=revision(parameters),original=row(),before=JSON.stringify({rev,original});
      const stored={id:rev.revisionId,release_id:rev.releaseId,catalog_id:rev.catalogId,
        checksum_sha256:rev.checksumSha256,input_parameters:rev.parameters,created_at:rev.createdAt};
      const context=canonicalPhysicalNormRevisionFromStorageV1(stored);
      const transported=JSON.parse(JSON.stringify(attachCanonicalPhysicalNormEvidenceV1(context,original)));
      const client=projectClientRevision({catalog,revision:rev,rows:[transported]});
      expect(client).toEqual(adaptCanonicalRevisionToStructuredEstimate({catalog,revision:rev,rows:[original]}));
      expect(JSON.stringify({rev,original})).toBe(before);
      const {physicalNormEvidenceV1,normSourceAdmissionEvidenceV1,...sameRow}=transported;
      expect(normSourceAdmissionEvidenceV1.revisionId).toBe(rev.revisionId);
      expect(normSourceAdmissionEvidenceV1.rowSha256).toBe(original.rowSha256);
      expect(sameRow).toEqual(original);
      expect(physicalNormEvidenceV1).toMatchObject({revisionId:rev.revisionId,rowSha256:original.rowSha256});
    });
  test.each(['revisionId','releaseId','catalogId','revisionChecksumSha256','rowId','rowSha256','owner','contractVersion'])(
    'rejects stale or substituted %s without recalculating a client norm', key => {
      const rev=revision(),transported=attachCanonicalPhysicalNormEvidenceV1(rev,row());
      const forged=JSON.parse(JSON.stringify(transported));forged.physicalNormEvidenceV1[key]='different';
      expect(()=>projectClientRevision({catalog,revision:rev,rows:[forged]}))
        .toThrow(expect.objectContaining({code:'CANONICAL_PHYSICAL_NORM_EVIDENCE_IDENTITY_MISMATCH'}));
    });
  test('requires backend evidence for a bound historic row instead of silently replaying its norm locally',()=>{
    expect(()=>projectClientRevision({catalog,revision:revision(),rows:[row()]}))
      .toThrow(expect.objectContaining({code:'CANONICAL_PHYSICAL_NORM_EVIDENCE_REQUIRED'}));
  });
  test('preserves unbound historic rows and ignores forged incoming evidence on the backend',()=>{
    const rev=revision(),original=row();original.calculationTrace={...original.calculationTrace,resourceGraph:{}};
    expect(projectClientRevision({catalog,revision:rev,rows:[original]}))
      .toEqual(adaptCanonicalRevisionToStructuredEstimate({catalog,revision:rev,rows:[original]}));
    const legitimate=attachCanonicalPhysicalNormEvidenceV1(rev,row());
    const incoming=JSON.parse(JSON.stringify(legitimate));incoming.physicalNormEvidenceV1.resolution={status:'FAKE_FULL'};
    expect(attachCanonicalPhysicalNormEvidenceV1(rev,incoming)).toEqual(legitimate);
  });
});


describe('physical norm evidence rejects malformed transport',()=>{
  test.each([{caseId:'missing',bad:undefined},{caseId:'empty-string',bad:''},{caseId:'array',bad:[]},{caseId:'number',bad:42},{caseId:'incomplete-applied',bad:{status:'APPLIED'}}])('rejects malformed resolution $caseId',({bad})=>{
    const rev=revision(),transported=attachCanonicalPhysicalNormEvidenceV1(rev,row());
    const malformed=JSON.parse(JSON.stringify(transported));malformed.physicalNormEvidenceV1.resolution=bad;
    expect(()=>projectClientRevision({catalog,revision:rev,rows:[malformed]}))
      .toThrow(expect.objectContaining({code:'CANONICAL_PHYSICAL_NORM_EVIDENCE_IDENTITY_MISMATCH'}));
  });
  test.each(['revisionId','releaseId','catalogId','rowId'])('rejects missing reference and evidence %s',key=>{
    const rev=revision(),original=row(),transported=attachCanonicalPhysicalNormEvidenceV1(rev,original);
    const empty=JSON.parse(JSON.stringify({rev,transported}));empty.transported.physicalNormEvidenceV1[key]='';
    if(key==='rowId')empty.transported.rowId='';else empty.rev[key]='';
    expect(()=>projectClientRevision({catalog,revision:empty.rev,rows:[empty.transported]}))
      .toThrow(expect.objectContaining({code:'CANONICAL_PHYSICAL_NORM_EVIDENCE_IDENTITY_MISMATCH'}));
  });
  test('accepts explicit null resolution without inventing applicability',()=>{
    const rev=revision(),unbound=row();unbound.calculationTrace={...unbound.calculationTrace,resourceGraph:{}};
    const transported=attachCanonicalPhysicalNormEvidenceV1(rev,unbound);
    expect(transported.physicalNormEvidenceV1?.resolution).toBeNull();
    expect(projectClientRevision({catalog,revision:rev,rows:[transported]}))
      .toEqual(adaptCanonicalRevisionToStructuredEstimate({catalog,revision:rev,rows:[unbound]}));
  });
});
