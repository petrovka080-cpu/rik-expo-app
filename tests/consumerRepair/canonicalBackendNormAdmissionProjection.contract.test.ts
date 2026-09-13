import { appendCanonicalBackendRevisionProjection } from "../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection";
import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests/consumerRequestTypes";
import type { StructuredEstimatePayload } from "../../src/lib/estimateStructuredPipeline/structuredEstimateTypes";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
} from "../../src/lib/estimate/v4/domainFactory";

const REVISION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RELEASE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CREATED_AT = "2026-09-13T00:00:00.000Z";

function payload(): StructuredEstimatePayload {
  return {
    workKey: "formwork_rics_nrm2_measured_contact_area",
    inputText: "Exact formwork measurement",
    canonicalBackend: {
      compilerOwner: "backend",
      revisionId: REVISION_ID,
      parentRevisionId: null,
      revisionNumber: 1,
      releaseId: RELEASE_ID,
      catalogId: "canonical-work:formwork-rics-nrm2",
      createdAt: CREATED_AT,
      checksumSha256: "a".repeat(64),
      formulaGraphVersion: "formwork-formula-v1",
      parameterSchemaHash: "b".repeat(64),
      parameters: { measured_formwork_contact_area_m2: 10 },
    },
  } as unknown as StructuredEstimatePayload;
}

function bundle(sourceBacked: boolean): ConsumerRepairDraftBundle {
  const binding = CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.find(
    (candidate) => candidate.source_id === RICS_NRM2_FORMWORK_SOURCE_ID,
  );
  if (!binding) throw new Error("RICS_NRM2_RUNTIME_BINDING_MISSING");
  return {
    draft: {
      id: "draft-norm-admission",
      consumerUserId: "owner",
      repairType: "formwork",
      status: "draft",
      missingData: [],
      createdAt: CREATED_AT,
    },
    items: [{
      id: "formwork-row",
      requestDraftId: "draft-norm-admission",
      itemType: "work",
      titleRu: "Измеренная площадь контакта опалубки",
      quantity: 10,
      unit: "m2",
      unitPrice: null,
      totalPrice: null,
      currency: "KGS",
      source: "reference_price_book",
      normId: sourceBacked ? RICS_NRM2_FORMWORK_NORM_ID : "norm:generated",
      normSourceId: sourceBacked
        ? RICS_NRM2_FORMWORK_SOURCE_ID
        : "src_professional_norm_pack_catalog_generated",
      normVersion: sourceBacked
        ? RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version
        : "generated-v1",
      sourceParameters: {
        rowCode: "formwork-row",
        canonicalBackendRevisionId: REVISION_ID,
        canonicalBackendReleaseId: RELEASE_ID,
        ...(sourceBacked ? {
          professionalPhysicalNormApplicabilityV1: {
            status: "APPLIED",
            source_id: binding.source_id,
            norm_id: binding.norm_id,
            source_document_version: binding.source_document_version,
            source_definition_hash: binding.source_definition_hash,
            blockers: [],
          },
        } : {}),
      },
      addedBy: "ai",
      editableByConsumer: true,
      createdAt: CREATED_AT,
    }],
    media: [],
    pdfs: [],
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: "market-link",
      requestDraftId: "draft-norm-admission",
      status: "not_sent",
      createdAt: CREATED_AT,
    },
    events: [],
  } as ConsumerRepairDraftBundle;
}

describe("canonical backend norm admission projection", () => {
  test("does not promote unregistered generated rows to source-backed level", () => {
    const projected = appendCanonicalBackendRevisionProjection({
      previousBundle: null,
      nextBundle: bundle(false),
      payload: payload(),
    });
    expect(projected.estimateDraftRevisionState?.revisions[0]).toMatchObject({
      estimateLevel: "PRELIMINARY_QUANTITY_BOQ",
      status: "draft_ready",
      normSourceAdmission: {
        evaluatedActiveCalculatedRows: 1,
        admittedRows: 0,
        status: "SOURCE_GAPS",
        gaps: [{
          rowId: "formwork-row",
          normSourceId: "src_professional_norm_pack_catalog_generated",
          reason: "PHYSICAL_APPLICABILITY_NOT_APPLIED",
        }],
      },
    });
  });

  test("promotes only the same exact applied physical source identity", () => {
    const projected = appendCanonicalBackendRevisionProjection({
      previousBundle: null,
      nextBundle: bundle(true),
      payload: payload(),
    });
    expect(projected.estimateDraftRevisionState?.revisions[0]).toMatchObject({
      estimateLevel: "SOURCE_BACKED_PROFESSIONAL_BOQ",
      normSourceAdmission: {
        evaluatedActiveCalculatedRows: 1,
        admittedRows: 1,
        status: "SOURCE_BACKED",
        gaps: [],
      },
    });
  });
});
