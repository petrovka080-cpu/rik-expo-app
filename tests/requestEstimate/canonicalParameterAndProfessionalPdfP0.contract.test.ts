import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildConsumerCanonicalParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { requestEstimatePublicItemTitle } from "../../src/features/consumerRepair/requestEstimateViewModel";
import type { ConsumerRepairRequestItem } from "../../src/lib/consumerRequests/consumerRequestTypes";
import { assertCanonicalEstimateArtifactIdentity } from "../../src/lib/estimate/backendPlatform/canonicalEstimateClient";
import {
  isCanonicalEstimateConsumerSuppliedParameter,
  isCanonicalEstimateParameterRequiredForValues,
  isCanonicalEstimateUserEditableParameter,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";
import { buildCanonicalParameterCards } from "../../src/lib/estimatePresentation/buildCanonicalParameterCards";
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
  preliminaryNeeds?: CanonicalEstimateRevisionView["preliminaryNeeds"];
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
    preliminaryNeeds: input.preliminaryNeeds,
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
  it("keeps generated per-output and per-unit formula inputs out of the consumer form", () => {
    const visibleArea = asphaltCatalog.parameterSchema[0];
    expect(isCanonicalEstimateUserEditableParameter(visibleArea)).toBe(true);

    for (const parameterId of [
      "qty_suction_collector_per_output",
      "labor_suction_collector_per_unit",
      "machine_suction_collector_per_unit",
      "mass_suction_collector_per_unit",
      "handling_suction_collector_per_unit",
      "inspection_suction_collector_per_unit",
      "waste_suction_collector_per_unit",
    ]) {
      expect(isCanonicalEstimateUserEditableParameter({
        ...visibleArea,
        parameterId,
        titleRu: `Technical derived input: ${parameterId}`,
        unitId: "machine_hour/item",
      })).toBe(false);
    }
  });

  it("admits explicitly user-owned waste and productivity source parameters", () => {
    const visibleArea = asphaltCatalog.parameterSchema[0];

    expect(isCanonicalEstimateUserEditableParameter({
      ...visibleArea,
      parameterId: "waste_factor",
      titleRu: "Коэффициент технологических потерь",
      unitId: "ratio",
      formulaConsumers: ["formula:mix_t"],
    })).toBe(true);
    expect(isCanonicalEstimateUserEditableParameter({
      ...visibleArea,
      parameterId: "labor_productivity_m2_per_man_hour",
      titleRu: "Нормативная производительность труда рабочих",
      unitId: "m2_man_hour",
      formulaConsumers: ["formula:crew_labor"],
    })).toBe(true);
    expect(isCanonicalEstimateUserEditableParameter({
      ...visibleArea,
      parameterId: "truck_turnaround_machine_hours",
      titleRu: "Время погрузки, ожидания и разгрузки одного рейса",
      unitId: "machine_hour",
      formulaConsumers: ["formula:mix_truck_hours"],
    })).toBe(true);
    expect(isCanonicalEstimateUserEditableParameter({
      ...visibleArea,
      parameterId: "quantity_factor",
      titleRu: "Расчётный коэффициент количества",
      unitId: "ratio",
      formulaConsumers: ["formula:quantity"],
    })).toBe(false);
    for (const [parameterId, unitId, titleRu] of [
      ["incoming_control_interval_m2_per_test", "m2/test", "Площадь на одно испытание входного контроля"],
      ["execution_documentation_count", "document", "Число комплектов исполнительной документации"],
      ["lighting_test_count", "test", "Число испытаний наружного освещения"],
    ] as const) {
      expect(isCanonicalEstimateUserEditableParameter({
        ...visibleArea,
        parameterId,
        titleRu,
        unitId,
        formulaConsumers: [`formula:${parameterId}`],
      })).toBe(true);
    }
  });

  it("does not ask a consumer to invent a source-confirmed productivity norm", () => {
    const visibleArea = asphaltCatalog.parameterSchema[0];
    expect(isCanonicalEstimateConsumerSuppliedParameter({
      ...visibleArea,
      parameterId: "machine_roller_productivity_m2_per_machine_hour",
      titleRu: "Производительность катка по технологической карте",
      valueSourceRole: "NORM_REQUIRED_BUT_PROJECT_SELECTED",
      formulaConsumers: ["formula:roller_hours"],
    })).toBe(false);
    expect(isCanonicalEstimateConsumerSuppliedParameter({
      ...visibleArea,
      parameterId: "excavator_productivity_m3_h",
      titleRu: "Производительность экскаватора",
      valueSourceRole: "SELECTED_EQUIPMENT_PASSPORT",
      formulaConsumers: ["formula:excavator_hours"],
    })).toBe(false);
    expect(isCanonicalEstimateConsumerSuppliedParameter({
      ...visibleArea,
      parameterId: "area_m2",
      titleRu: "Площадь работ",
      valueSourceRole: "USER_MEASURED",
      formulaConsumers: ["formula:area"],
    })).toBe(true);
  });

  it("activates source-managed requirements only for the selected technology branch", () => {
    const visibleArea = asphaltCatalog.parameterSchema[0];
    const trayPassport = {
      ...visibleArea,
      parameterId: "tray_module_length_m",
      titleRu: "Длина модуля лотка",
      required: false,
      requiredWhen: { kind: "equals", parameterId: "system_type", value: "linear_tray" },
      valueSourceRole: "MANUFACTURER_CONFIRMED" as const,
      formulaConsumers: ["formula:tray_count"],
    };
    expect(isCanonicalEstimateParameterRequiredForValues(trayPassport, {})).toBe(false);
    expect(isCanonicalEstimateParameterRequiredForValues(trayPassport, { system_type: "storm_sewer" })).toBe(false);
    expect(isCanonicalEstimateParameterRequiredForValues(trayPassport, { system_type: "linear_tray" })).toBe(true);
  });

  it("promotes active backend needs without exposing unrelated optional inputs", () => {
    const optional = (parameterId: string, ordinal: number, titleRu: string) => ({
      ...asphaltCatalog.parameterSchema[0],
      parameterId,
      ordinal,
      titleRu,
      required: false,
      defaultValue: null,
      formulaConsumers: [`formula:${parameterId}`],
    });
    const catalog: CanonicalEstimateCatalogItem = {
      ...asphaltCatalog,
      parameterSchema: [
        optional("incoming_control_interval_m2_per_test", 20, "Площадь на одно испытание входного контроля"),
        optional("unrelated_optional_input", 21, "Дополнительное проектное значение"),
      ],
    };
    const current = revision({
      revisionId: ASPHALT_REVISION_ID,
      catalogId: ASPHALT_CATALOG_ID,
      parameters: {},
      preliminaryNeeds: [{
        rowId: "incoming-control-row",
        ordinal: 0,
        section: "Услуги",
        category: "quality_control",
        titleRu: "Входной контроль",
        unitId: "test",
        quantity: null,
        unitPrice: null,
        needState: "QUANTITY_REQUIRED",
        missingParameterIds: ["incoming_control_interval_m2_per_test"],
        selected: true,
        procurementEligible: false,
        formulaId: "formula:incoming_control",
        calculationTrace: {},
        normativeTrace: [],
        needSha256: "b".repeat(64),
      }],
    });

    const session = buildConsumerCanonicalParameterSession({ catalog, revision: current, draftId: "active-needs" });
    expect(session.parameters.map((parameter) => parameter.parameterId))
      .toEqual(["incoming_control_interval_m2_per_test", "unrelated_optional_input"]);
    expect(session.parameters[0]).toMatchObject({
      requiredLevel: "BLOCKING_REQUIRED",
      state: "BLOCKING_REQUIRED",
      valid: false,
      validationIssues: ["VALUE_REQUIRED"],
    });
    expect(session.parameters[1]).toMatchObject({ state: "NOT_APPLICABLE", valid: true });
    expect(session.blockingMissingParameterIds).toEqual(["incoming_control_interval_m2_per_test"]);
    expect(session.contractMissingParameterIds).toEqual([]);
    expect(session.status).toBe("BLOCKING_REQUIRED");
  });

  it("does not let the legacy asphalt passport hide active canonical transport inputs", () => {
    const visibleArea = asphaltCatalog.parameterSchema[0];
    const catalog: CanonicalEstimateCatalogItem = {
      ...asphaltCatalog,
      parameterSchema: [
        ...asphaltCatalog.parameterSchema,
        {
          ...visibleArea,
          parameterId: "truck_average_speed_km_per_machine_hour",
          ordinal: 20,
          titleRu: "Средняя скорость транспорта по транспортной схеме",
          unitId: "km_machine_hour",
          defaultValue: null,
          formulaConsumers: ["formula:mix_truck_hours"],
        },
        {
          ...visibleArea,
          parameterId: "truck_turnaround_machine_hours",
          ordinal: 21,
          titleRu: "Время погрузки, ожидания и разгрузки одного рейса",
          unitId: "machine_hour",
          defaultValue: null,
          formulaConsumers: ["formula:mix_truck_hours"],
        },
      ],
    };
    const root = revision({
      revisionId: ASPHALT_REVISION_ID,
      catalogId: ASPHALT_CATALOG_ID,
      parameters: Object.fromEntries(asphaltCatalog.parameterSchema.map((schema) => [schema.parameterId, schema.defaultValue])),
    });
    const session = buildConsumerCanonicalParameterSession({ catalog, revision: root, draftId: "transport-inputs" });
    const cardKeys = buildCanonicalParameterCards({ session, revision: null }).map((card) => card.key);

    expect(cardKeys).toEqual(expect.arrayContaining([
      "truck_average_speed_km_per_machine_hour",
      "truck_turnaround_machine_hours",
    ]));
  });

  it("preserves the complete public position name and technical designation around a colon", () => {
    const item = (titleRu: string, sourceParameters: Record<string, unknown> = {}) => ({
      id: titleRu,
      titleRu,
      sourceParameters,
    }) as unknown as ConsumerRepairRequestItem;

    expect(requestEstimatePublicItemTitle(item("Учёт технологических обрезков: Опора напорного трубопровода")))
      .toBe("Учёт технологических обрезков: Опора напорного трубопровода");
    expect(requestEstimatePublicItemTitle(item("Механизированное выполнение: Всасывающий коллектор")))
      .toBe("Механизированное выполнение: Всасывающий коллектор");
    expect(requestEstimatePublicItemTitle(item("Рабочий насосный агрегат")))
      .toBe("Рабочий насосный агрегат");

    const technicalNames = [
      "Трубопровод: труба ПЭ100 SDR 11 PN16 DN110×10 мм",
      "Металлоконструкция: сталь С345, лист 12×1500×6000 мм",
      "Монолитная конструкция: бетон класса B25 W6 F200",
      "Электроснабжение: кабель ВВГнг-LS 5×6 мм²",
      "Перегородка: профиль CW 100, толщина 0,6 мм",
    ];
    const visibleNames = technicalNames.map((titleRu) =>
      requestEstimatePublicItemTitle(item(titleRu, {
        rowCode: `internal_row_${technicalNames.indexOf(titleRu)}`,
        specification: "Отдельная спецификация не заменяет публичное название",
      }))
    );

    expect(visibleNames).toEqual(technicalNames);
    expect(new Set(visibleNames).size).toBe(technicalNames.length);
    expect(visibleNames.join(" ")).not.toMatch(/internal_row_|template_id|rowCode/iu);
  });

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

    expect(session.parameters.find((parameter) => parameter.parameterId === "drainage_length_m")).toBeUndefined();
    const retainedDrainageLength = session.inactiveConditionalParameters
      ?.find((parameter) => parameter.parameterId === "drainage_length_m");
    expect(retainedDrainageLength?.visibilityCondition)
      .toEqual({
        kind: "ANY_OF",
        conditions: [
          { parameterId: "drainage_required", value: true },
          { parameterId: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" },
        ],
      });
    expect(retainedDrainageLength?.value).toBe(80);
    expect(session.blockingMissingParameterIds).not.toContain("drainage_length_m");
    expect(session.contractMissingParameterIds).not.toContain("drainage_length_m");
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
    const r4A6Revision = { ...pipeline, definitionVersionId: "definition-version-r4-a6" };
    const r4A6Artifact: CanonicalEstimateArtifactView = {
      ...artifact,
      metadata: {
        ...artifact.metadata,
        templateVersion: "professional-estimate-pdf:5",
        artifactKind: "professional_pdf",
        revisionId: PIPELINE_REVISION_ID,
        definitionVersionId: "definition-version-r4-a6",
        pageCount: 8,
        grandTotalStatus: "PARTIAL_NEEDS_PRICE",
      },
    };
    expect(() => assertCanonicalEstimateArtifactIdentity({
      artifact: r4A6Artifact,
      revision: r4A6Revision,
      expectedKind: "pdf",
      expectedDocumentProfile: "professional_v1",
    })).not.toThrow();
    expect(() => assertCanonicalEstimateArtifactIdentity({
      artifact: { ...r4A6Artifact, metadata: { ...r4A6Artifact.metadata, pageCount: null } },
      revision: r4A6Revision,
      expectedKind: "pdf",
      expectedDocumentProfile: "professional_v1",
    })).toThrow("документ не принадлежит выбранной версии");
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
    const api = readFileSync(resolve(process.cwd(), "supabase/functions/canonical-estimate/index.ts"), "utf8");
    const worker = readFileSync(resolve(process.cwd(), "supabase/functions/canonical-estimate-worker/index.ts"), "utf8");
    const professionalProjection = readFileSync(resolve(process.cwd(), "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts"), "utf8");
    const artifactContract = readFileSync(resolve(process.cwd(), "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts"), "utf8");
    const pdfFlow = screen.slice(screen.indexOf("private completePdfOpen"), screen.indexOf("private openDraftFromHistory"));

    expect(pdfFlow).toContain('kind: "pdf"');
    expect(pdfFlow).toContain('documentProfile: "professional_v1"');
    expect(pdfFlow).toContain("previewPdfDocument(createPdfDocumentDescriptor");
    expect(pdfFlow).not.toContain("Linking.openURL(artifact.signedUrl)");
    expect(screen).toContain("context?.definitionId ?? revision.catalogId");
    expect(screen).toContain("historyRecord?.title");
    expect(screen).not.toContain("локальный контекст исторической версии отсутствует");
    expect(runtime).toContain("buildCanonicalArtifactMetadata");
    expect(artifactContract).toContain('CANONICAL_PROFESSIONAL_PDF_TEMPLATE_VERSION = "professional-estimate-pdf:5"');
    expect(runtime).toContain("buildCanonicalProfessionalPdfProjection");
    expect(worker).toContain("buildCanonicalProfessionalPdfProjection");
    expect(runtime).toContain("CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION");
    expect(worker).toContain("CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION");
    expect(runtime).not.toContain("canonical-professional-pdf-local.r3");
    expect(runtime).toContain("canonicalProfessionalArtifactMetadataIdentityMatches");
    expect(api).toContain("canonicalProfessionalArtifactMetadataIdentityMatches");
    expect(professionalProjection).toContain("Профессиональная смета");
    expect(professionalProjection).toContain("Техническое приложение");
    expect(professionalProjection).toContain('CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER');
    expect(artifactContract).toContain('man_hour: "чел.-ч"');
    expect(runtime).not.toContain("?token=local-dev-signed-artifact-r1");
  });

  it("loads parameter schema from the exact historical revision release", () => {
    const editor = readFileSync(resolve(process.cwd(), "src/features/consumerRepair/consumerCanonicalParameterEditor.ts"), "utf8");
    const client = readFileSync(resolve(process.cwd(), "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts"), "utf8");
    const runtime = readFileSync(resolve(process.cwd(), "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"), "utf8");

    expect(editor).toContain("getCanonicalEstimateCatalogItem(revision.catalogId, null, revision.releaseId)");
    expect(editor).toContain("getCanonicalEstimateParameterSessionSnapshot(input.revisionId)");
    expect(client).toContain("?releaseId=${encodeURIComponent(releaseId.trim())}");
    expect(client).toContain("/parameter-session`");
    expect(runtime).toContain('url.searchParams.get("releaseId") ?? TARGET_RELEASE_ID');
    expect(runtime).toContain("requestedReleaseId || null");
    expect(runtime).toContain('path[2] === "parameter-session"');
  });
});
