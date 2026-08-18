import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildConsumerCanonicalParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { assertCanonicalEstimateArtifactIdentity } from "../../src/lib/estimate/backendPlatform/canonicalEstimateClient";
import {
  ESTIMATE_PLATFORM_API_VERSION,
  type CanonicalEstimateArtifactView,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateRevisionView,
} from "../../src/lib/estimate/backendPlatform/contracts";

const ASPHALT_CATALOG_ID =
  "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_drain_large_area_professional_expanded_v1";
const ASPHALT_REVISION_ID = "3f697e7c-e53b-45a7-b1cf-1d05680f9cb9";
const PIPELINE_REVISION_ID = "36ee30db-f4d9-4ea9-af9c-27b4a8f58179";
const PIPELINE_ARTIFACT_ID = "0601a039-d897-45dd-b15a-35b379944491";
const RELEASE_ID = "94443669-8f5b-5cc7-b364-2f8e9f9e3506";
const CHECKSUM = "a".repeat(64);

function revision(input: {
  revisionId: string;
  catalogId: string;
  parentRevisionId?: string | null;
  parameters: Record<string, unknown>;
  rowCount?: number;
}): CanonicalEstimateRevisionView {
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    revisionId: input.revisionId,
    parentRevisionId: input.parentRevisionId ?? null,
    releaseId: RELEASE_ID,
    catalogId: input.catalogId,
    revisionNumber: input.parentRevisionId ? 2 : 1,
    status: "ready",
    currencyCode: "KGS",
    parameters: input.parameters,
    amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
    totals: { amount: null },
    rowCount: input.rowCount ?? 11,
    checksumSha256: CHECKSUM,
    compilerVersion: "canonical-backend.r58",
    parameterSchemaHash: "schema-r58",
    createdAt: "2026-08-18T04:36:32.184Z",
  };
}

const asphaltCatalog: CanonicalEstimateCatalogItem = {
  catalogId: ASPHALT_CATALOG_ID,
  releaseId: RELEASE_ID,
  namespace: "global",
  domain: "roadworks",
  workKey: "asphalt_drain_large_area",
  titleRu: "Водоотвод для асфальтового покрытия на большой площади",
  definitionVersion: 6,
  applicability: {},
  professionalMetadata: {},
  parameterSchema: [
    ["catchment_area_m2", "Площадь водосбора", "m2", "decimal", "5000"],
    ["drain_length_m", "Длина линии водоотвода", "m", "decimal", "120"],
    ["construction_kind", "Вид работ", null, "enum", "new"],
    ["longitudinal_slope_percent", "Продольный уклон", "%", "decimal", "1.5"],
    ["cross_slope_percent", "Поперечный уклон", "%", "decimal", "2"],
    ["drainage_type", "Тип водоотвода", null, "enum", "profile"],
    ["existing_receiver", "Существующий водоприёмник", null, "boolean", true],
  ].map(([parameterId, titleRu, unitId, valueType, defaultValue], ordinal) => ({
    parameterId: String(parameterId),
    ordinal,
    valueType: valueType as "decimal" | "enum" | "boolean",
    unitId: unitId == null ? null : String(unitId),
    titleRu: String(titleRu),
    required: true,
    defaultValue,
    constraints: valueType === "enum" ? { values: parameterId === "drainage_type" ? ["profile", "linear", "point", "combined"] : ["new", "repair"] } : { min: 0 },
    visibilityRole: "USER_INPUT" as const,
    descriptionRu: `Подтверждается по проекту или обмеру: ${String(titleRu)}.`,
    formulaConsumers: [`formula:${String(parameterId)}`],
  })),
};

describe("P0 canonical parameter editor and professional PDF", () => {
  it("shows all seven accepted asphalt baseline inputs without calling them user-confirmed", () => {
    const root = revision({
      revisionId: ASPHALT_REVISION_ID,
      catalogId: ASPHALT_CATALOG_ID,
      parameters: Object.fromEntries(asphaltCatalog.parameterSchema.map((schema) => [schema.parameterId, schema.defaultValue])),
    });
    const session = buildConsumerCanonicalParameterSession({
      catalog: asphaltCatalog,
      revision: root,
      draftId: "consumer-draft-asphalt",
    });

    expect(session.parameters).toHaveLength(7);
    expect(session.parameters.every((parameter) => parameter.source === "ASSUMED")).toBe(true);
    expect(session.parameters.every((parameter) => parameter.assumption?.includes("Предварительно принято"))).toBe(true);
    expect(session.parameters.map((parameter) => parameter.unit)).toEqual(expect.arrayContaining(["m2", "m", "%"]));
    expect(session.parameters.every((parameter) => parameter.description.length > 0)).toBe(true);
  });

  it("marks only the changed child value user-confirmed and leaves the parent immutable", () => {
    const rootParameters = Object.fromEntries(asphaltCatalog.parameterSchema.map((schema) => [schema.parameterId, schema.defaultValue]));
    const parent = revision({ revisionId: ASPHALT_REVISION_ID, catalogId: ASPHALT_CATALOG_ID, parameters: rootParameters });
    const child = revision({
      revisionId: "16e00fd5-85a4-48da-9d41-b1ff2e748a1d",
      parentRevisionId: ASPHALT_REVISION_ID,
      catalogId: ASPHALT_CATALOG_ID,
      parameters: { ...rootParameters, catchment_area_m2: "7500" },
    });
    const parentSnapshot = JSON.stringify(parent);
    const session = buildConsumerCanonicalParameterSession({ catalog: asphaltCatalog, revision: child, parent, draftId: "consumer-draft-asphalt" });

    expect(session.parameters.find((parameter) => parameter.parameterId === "catchment_area_m2")?.source).toBe("USER_EXPLICIT");
    expect(session.parameters.find((parameter) => parameter.parameterId === "drain_length_m")?.source).toBe("PROJECT_SPECIFIC");
    expect(child.parentRevisionId).toBe(ASPHALT_REVISION_ID);
    expect(JSON.stringify(parent)).toBe(parentSnapshot);
  });

  it("keeps parameters from optional scope branches conditional in the consumer session", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      ...asphaltCatalog,
      parameterSchema: [
        ...asphaltCatalog.parameterSchema,
        {
          parameterId: "drainage_required",
          ordinal: 20,
          valueType: "boolean",
          unitId: null,
          titleRu: "Добавить водоотвод",
          required: false,
          defaultValue: false,
          constraints: {},
          visibilityRole: "USER_INPUT",
          resourceBranchConsumers: ["asphalt_parking_lot:drainage:pipe"],
        },
        {
          parameterId: "drainage_length_m",
          ordinal: 21,
          valueType: "decimal",
          unitId: "m",
          titleRu: "Длина водоотвода",
          required: false,
          defaultValue: 80,
          constraints: { min: 0 },
          visibilityRole: "USER_INPUT",
          visibleWhen: "drainage_required == true OR estimate_scope_mode == FULL_APPLICABLE_SCOPE",
          formulaConsumers: ["formula:drainage_length_m"],
        },
      ],
    };
    const current = revision({
      revisionId: ASPHALT_REVISION_ID,
      catalogId: ASPHALT_CATALOG_ID,
      parameters: {
        ...Object.fromEntries(asphaltCatalog.parameterSchema.map((schema) => [schema.parameterId, schema.defaultValue])),
        drainage_required: false,
        drainage_length_m: 80,
      },
    });
    const session = buildConsumerCanonicalParameterSession({
      catalog,
      revision: current,
      draftId: "consumer-draft-conditional-scope",
    });

    expect(session.parameters.find((parameter) => parameter.parameterId === "drainage_length_m")?.visibilityCondition)
      .toEqual({
        kind: "ANY_OF",
        conditions: [
          { parameterId: "drainage_required", value: true },
          { parameterId: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" },
        ],
      });
  });

  it("treats the pipeline artifact as a separate work and fails closed for any selected-revision mismatch", () => {
    const pipeline = revision({
      revisionId: PIPELINE_REVISION_ID,
      catalogId: "expanded-template:pressure_pipeline_preliminary_boq_expanded_complex_v1",
      parameters: {},
      rowCount: 202,
    });
    const artifact: CanonicalEstimateArtifactView = {
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
      artifactId: PIPELINE_ARTIFACT_ID,
      revisionId: PIPELINE_REVISION_ID,
      releaseId: RELEASE_ID,
      kind: "pdf",
      status: "ready",
      contentType: "application/pdf",
      byteSize: 1200,
      sha256: "b".repeat(64),
      metadata: {
        sourceCatalogId: pipeline.catalogId,
        sourceRowCount: 202,
        sourceRevisionChecksumSha256: CHECKSUM,
        sourceOwnerUserId: "11111111-1111-4111-8111-111111111111",
        sourceOrganizationId: "22222222-2222-4222-8222-222222222222",
        templateVersion: "professional-estimate-pdf:3",
        documentProfile: "professional_v1",
      },
      errorCode: null,
      createdAt: "2026-08-18T04:49:25.360Z",
      updatedAt: "2026-08-18T04:49:25.360Z",
      readyAt: "2026-08-18T04:49:25.360Z",
      signedUrl: "https://example.invalid/exact-artifact",
      signedUrlExpiresAt: "2026-08-18T05:04:25.360Z",
    };

    expect(() => assertCanonicalEstimateArtifactIdentity({
      artifact,
      revision: pipeline,
      expectedKind: "pdf",
      expectedDocumentProfile: "professional_v1",
    })).not.toThrow();
    const asphalt = revision({ revisionId: ASPHALT_REVISION_ID, catalogId: ASPHALT_CATALOG_ID, parameters: {} });
    expect(() => assertCanonicalEstimateArtifactIdentity({
      artifact,
      revision: asphalt,
      expectedKind: "pdf",
      expectedDocumentProfile: "professional_v1",
    }))
      .toThrow("документ не принадлежит выбранной версии");
  });

  it("keeps the raw PDF internal and routes the professional artifact through the product viewer", () => {
    const screen = readFileSync(resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"), "utf8");
    const runtime = readFileSync(resolve(process.cwd(), "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"), "utf8");
    const pdfFlow = screen.slice(screen.indexOf("private completePdfOpen"), screen.indexOf("private openDraftFromHistory"));

    expect(pdfFlow).toContain('kind: "pdf"');
    expect(pdfFlow).toContain('documentProfile: "professional_v1"');
    expect(pdfFlow).toContain("previewPdfDocument(createPdfDocumentDescriptor");
    expect(pdfFlow).not.toContain("Linking.openURL(artifact.signedUrl)");
    expect(runtime).toContain('templateVersion: "professional-estimate-pdf:3"');
    expect(runtime).toContain("Профессиональная смета");
    expect(runtime).toContain('man_hour: "чел.-ч"');
    expect(runtime).not.toContain("?token=local-dev-signed-artifact-r1");
  });
});
