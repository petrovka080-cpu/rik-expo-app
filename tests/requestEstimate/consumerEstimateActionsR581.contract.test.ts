import fs from "node:fs";
import path from "node:path";

import {
  buildConsumerEstimateActionContext,
  ConsumerEstimateActionContextError,
} from "../../src/features/consumerRepair/consumerEstimateActionRouter";
import {
  buildCanonicalBaselineInputs,
  extractUserQuantity,
  parseR4A10StripFoundationPrompt,
} from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import {
  buildConsumerCanonicalParameterSession,
  isConsumerMeaningfulCanonicalParameter,
  normalizedCanonicalNumericValidation,
} from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { canonicalConsumerParameterPlaceholder } from "../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel";
import {
  buildMultiDomainReferenceSelectedWorkBinding,
  canonicalBaselineContractMissingStatusMessage,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";

const root = path.resolve(__dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

function canonicalBundle(): ConsumerRepairDraftBundle {
  return {
    draft: {
      id: "consumer_draft_msy7qou1_douawj",
      consumerUserId: "consumer-1",
      orgId: "company-1",
      repairType: "parking",
      selectedCatalogWorkId: "built-in-ai-1000:0702",
      status: "draft",
      missingData: [],
      createdAt: "2026-08-18T00:00:00.000Z",
    },
    items: [{
      id: "request-item-50",
      requestDraftId: "consumer_draft_msy7qou1_douawj",
      itemType: "material",
      titleRu: "Щебень 20–40 мм",
      quantity: 500,
      unit: "m3",
      currency: "KGS",
      source: "ai_suggested",
      sourceParameters: {
        rowCode: "base_crushed_stone_20_40",
        canonicalBackendRevisionId: "23590f0c-9a5d-4481-b8ed-1019772ff1cb",
        canonicalBackendReleaseId: "94443669-8f5b-5cc7-b364-2f8e9f9e3506",
      },
      editableByConsumer: true,
      createdAt: "2026-08-18T00:00:00.000Z",
    }],
    media: [],
    pdfs: [],
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: "market-1",
      requestDraftId: "consumer_draft_msy7qou1_douawj",
      status: "not_sent",
      createdAt: "2026-08-18T00:00:00.000Z",
    },
    events: [],
  } as ConsumerRepairDraftBundle;
}

describe("ONE MONOLITH R5.8.1 consumer estimate actions", () => {
  it("recognizes ordinary strip-foundation construction text without requiring an exact catalog title", () => {
    expect(buildMultiDomainReferenceSelectedWorkBinding(
      "устройство ленточного фундамента 100 метров длина и 20 метров ширина",
    )).toMatchObject({
      selectedWorkKey: "canonical-work:expanded:strip_foundation",
      selectedCategoryKey: "concrete",
      resolverReGuessed: false,
    });
    expect(buildMultiDomainReferenceSelectedWorkBinding("ремонт фасада здания")).toBeNull();
  });

  it("routes asphalt drainage as its own canonical owner without widening it to full road infrastructure", () => {
    const fragment = "водоотвод для асфальтового покрытия на большой площади";
    expect(buildMultiDomainReferenceSelectedWorkBinding(fragment)).toMatchObject({
      selectedWorkKey: "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area",
      selectedTitleRu: "Устройство системы водоотвода асфальтированного покрытия",
      selectedCategoryKey: "roadworks",
      rawInput: fragment,
      resolverReGuessed: false,
    });
    expect(buildMultiDomainReferenceSelectedWorkBinding(
      `${fragment}; тип системы: линейный лоток; проектная длина трассы 180 м`,
    )?.selectedWorkKey).toBe(
      "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area",
    );
    expect(buildMultiDomainReferenceSelectedWorkBinding(
      "полное строительство дороги с водоотводом, освещением, знаками и разметкой",
    )).toBeNull();
    expect(buildMultiDomainReferenceSelectedWorkBinding("водоотвод с кровли здания")).toBeNull();
  });

  it("turns backend parameter identifiers into actionable Russian P0 questions", () => {
    expect(canonicalBaselineContractMissingStatusMessage(
      "CANONICAL_BASELINE_CONTRACT_MISSING:total_axis_length_m,strip_width_m,strip_height_m,groundworks_included",
    )).toContain("общая длина ленты по оси; ширина ленты; высота бетонной ленты; входит ли разработка грунта");
  });

  it("shows no more than five P0 questions in one clarification step", () => {
    const message = canonicalBaselineContractMissingStatusMessage(
      "CANONICAL_BASELINE_CONTRACT_MISSING:system_type,route_length_m,design_slope_percent,trench_width_m,trench_depth_m,bedding_material,bedding_thickness_m",
    );
    expect(message).toContain("тип системы");
    expect(message).toContain("средняя глубина траншеи");
    expect(message).toContain("останется уточнить ещё 2");
    expect(message).not.toContain("материал подготовки");
    expect(message).not.toContain("толщина подготовки");
  });

  it("does not reinterpret generic building dimensions as strip-foundation geometry", () => {
    expect(parseR4A10StripFoundationPrompt(
      "устройство ленточного фундамента 100 метров длина и 20 метров ширина",
    )).toEqual({});
  });

  it("extracts only explicitly named strip-foundation parameters for canonical backend handoff", () => {
    const prompt = [
      "устройство ленточного фундамента",
      "суммарная длина ленты 40 м; ширина ленты 0,5 м; высота ленты 1,5 м; бетонная подготовка входит; толщина бетонной подготовки 0,1 м",
      "класс бетона B25; водонепроницаемость W6; морозостойкость F150; подвижность смеси P4; запас бетонной смеси 2%",
      "масса арматуры 2,4 т; масса вязальной проволоки 28,8 кг; транспортная масса опалубки 12 т",
      "доставка бетонной смеси 18 км; доставка арматуры 18 км; доставка опалубки 18 км",
      "земляные работы входят; объём разработки грунта 54 м3",
      "подушка основания входит; материал подушки песок; объём материала подушки 4 м3; доставка материала подушки 12 км",
      "гидроизоляция входит; система гидроизоляции обмазочная; площадь гидроизоляции 120 м2",
      "обратная засыпка входит; объём обратной засыпки 20 м3",
      "вывоз грунта входит; плотность грунта 1,8 т/м3; расстояние вывоза грунта 15 км",
    ].join(". ");
    expect(parseR4A10StripFoundationPrompt(prompt)).toMatchObject({
      total_axis_length_m: "40",
      strip_width_m: "0.5",
      strip_height_m: "1.5",
      preparation_thickness_m: "0.1",
      concrete_class: "B25",
      watertightness: "W6",
      frost_resistance: "F150",
      mobility: "P4",
      concrete_order_allowance_percent: "2",
      reinforcement_mass_t: "2.4",
      binding_wire_mass_kg: "28.8",
      formwork_transport_mass_t: "12",
      concrete_delivery_distance_km: "18",
      reinforcement_delivery_distance_km: "18",
      formwork_delivery_distance_km: "18",
      groundworks_included: true,
      excavation_volume_m3: "54",
      foundation_bedding_included: true,
      foundation_bedding_type: "sand",
      foundation_bedding_volume_m3: "4",
      bedding_delivery_distance_km: "12",
      waterproofing_included: true,
      waterproofing_system: "bituminous_coating",
      waterproofing_area_m2: "120",
      backfill_included: true,
      backfill_volume_m3: "20",
      soil_disposal_included: true,
      excavated_soil_density_t_m3: "1.8",
      soil_disposal_distance_km: "15",
    });
  });

  it("recognizes the exact typoed 500 square metre request", () => {
    expect(extractUserQuantity("Асфальтирование парковки 500 кв метрово")).toEqual({
      value: "500",
      unit: "m2",
    });
    for (const prompt of ["500 м²", "500 м2", "500 кв. м", "500 квадратных метров", "500 кв метров"]) {
      expect(extractUserQuantity(prompt)).toEqual({ value: "500", unit: "m2" });
    }
  });

  it("maps a Cyrillic square-metre unit only to the direct measured source", () => {
    const parameter = (
      parameterId: string,
      unitId: string | null,
      derived = false,
    ): CanonicalEstimateCatalogItem["parameterSchema"][number] => ({
      parameterId,
      ordinal: parameterId === "area_m2" ? 0 : 1,
      valueType: "decimal",
      unitId,
      titleRu: parameterId,
      required: !derived,
      defaultValue: null,
      constraints: { min: Number.EPSILON },
      semanticParameterKey: parameterId,
      visibilityRole: derived ? "USER_DERIVED_READONLY" : "USER_INPUT",
      valueSourceRole: derived ? "BACKEND_DERIVED" : "USER_MEASURED",
      normativeLinks: [],
      formulaConsumers: derived ? [] : ["row:asphalt_paving"],
      resourceBranchConsumers: [],
      validationRules: [],
      provenance: {},
    });
    const catalog = {
      parameterSchema: [
        parameter("area_m2", "\u043c\u00b2"),
        parameter("asphalt_paver_layer_1_coverage_area_m2", null, true),
      ],
    } as unknown as CanonicalEstimateCatalogItem;

    const inputs = buildCanonicalBaselineInputs({
      catalog,
      prompt: "\u0410\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 5000 \u043a\u0432 \u043c\u0435\u0442\u0440\u043e\u0432",
    });
    expect(inputs).toEqual({ area_m2: "5000" });
    expect(inputs).not.toHaveProperty("asphalt_paver_layer_1_coverage_area_m2");
  });

  it.each([
    ["area_m2", "m2", "Кровля 200 квадратных метров", "200"],
    ["length_m", "m", "Трубопровод 37 м", "37"],
    ["count", "pcs", "Монтаж 12 шт.", "12"],
  ] as const)(
    "lets explicit user input replace a visible baseline for %s",
    (parameterId, unitId, prompt, expected) => {
      const catalog = {
        parameterSchema: [{
          parameterId,
          ordinal: 0,
          valueType: "decimal",
          unitId,
          titleRu: parameterId,
          required: true,
          defaultValue: 100,
          constraints: { min: Number.EPSILON },
          semanticParameterKey: parameterId,
          visibilityRole: "USER_INPUT",
          valueSourceRole: "VISIBLE_BASELINE_ASSUMPTION",
          formulaConsumers: ["formula:primary-measure"],
          resourceBranchConsumers: ["row:primary-resource"],
        }],
      } as unknown as CanonicalEstimateCatalogItem;

      expect(buildCanonicalBaselineInputs({ catalog, prompt })).toEqual({
        [parameterId]: expected,
      });
    },
  );

  it("fails closed when a frozen definition exposes derived coverage as required user input", () => {
    const catalog = {
      parameterSchema: [{
        parameterId: "area_m2",
        ordinal: 0,
        valueType: "decimal",
        unitId: "m2",
        titleRu: "Площадь",
        required: true,
        defaultValue: null,
        constraints: { min: Number.EPSILON },
        semanticParameterKey: "area_m2",
        visibilityRole: "USER_INPUT",
        valueSourceRole: "USER_MEASURED",
      }, {
        parameterId: "asphalt_paver_layer_1_coverage_area_m2",
        ordinal: 1,
        valueType: "decimal",
        unitId: "m2",
        titleRu: "Производная площадь покрытия",
        required: true,
        defaultValue: null,
        constraints: { min: Number.EPSILON },
        semanticParameterKey: "asphalt_paver_layer_1_coverage_area_m2",
        visibilityRole: "USER_INPUT",
        valueSourceRole: "USER_MEASURED",
      }],
    } as unknown as CanonicalEstimateCatalogItem;

    expect(() => buildCanonicalBaselineInputs({
      catalog,
      prompt: "Асфальтирование 5000 кв метров",
    })).toThrow("CANONICAL_BASELINE_CONTRACT_MISSING:asphalt_paver_layer_1_coverage_area_m2");
  });

  it("routes a line action only with exact immutable identity and return position", () => {
    const context = buildConsumerEstimateActionContext({
      action: "openLinePhoto",
      bundle: canonicalBundle(),
      ownerId: "consumer-1",
      requestItemId: "request-item-50",
      returnScrollPosition: 812,
    });
    expect(context).toMatchObject({
      revisionId: "23590f0c-9a5d-4481-b8ed-1019772ff1cb",
      releaseId: "94443669-8f5b-5cc7-b364-2f8e9f9e3506",
      definitionId: "built-in-ai-1000:0702",
      lineId: "base_crushed_stone_20_40",
      requestItemId: "request-item-50",
      ownerId: "consumer-1",
      companyId: "company-1",
      returnScrollPosition: 812,
    });
    expect(() => buildConsumerEstimateActionContext({
      action: "openLineCatalog",
      bundle: canonicalBundle(),
      ownerId: "another-user",
      requestItemId: "request-item-50",
    })).toThrow(ConsumerEstimateActionContextError);
  });

  it("hides formula internals and rejects corrupted numeric ranges", () => {
    const internal = {
      parameterId: "sand_compacted_volume_m3",
      titleRu: "sand_compacted_volume_m3",
      visibilityRole: "USER_INPUT",
      required: false,
      formulaConsumers: ["f1"],
      resourceBranchConsumers: [],
    } as never;
    const area = {
      parameterId: "area_m2",
      titleRu: "Площадь покрытия",
      visibilityRole: "USER_INPUT",
      required: true,
      formulaConsumers: ["area"],
      resourceBranchConsumers: ["asphalt"],
    } as never;
    const derivedBoqQuantity = {
      parameterId: "quantity_delivery_to_site",
      titleRu: "Количество: Доставка материалов на объект",
      unitId: "t_km",
      visibilityRole: "USER_INPUT",
      required: true,
      formulaConsumers: ["delivery"],
      resourceBranchConsumers: ["delivery-row"],
    } as never;
    const internalProductivity = {
      parameterId: "paver_productivity_m2_per_machine_hour",
      titleRu: "Производительность асфальтоукладчика",
      unitId: "m2_machine_hour",
      visibilityRole: "USER_INPUT",
      required: true,
      formulaConsumers: ["paver-hours"],
      resourceBranchConsumers: ["paver-row"],
    } as never;
    const undeclaredOwner = {
      ...(area as unknown as Record<string, unknown>),
      visibilityRole: undefined,
    } as never;
    expect(isConsumerMeaningfulCanonicalParameter(internal)).toBe(false);
    expect(isConsumerMeaningfulCanonicalParameter(derivedBoqQuantity)).toBe(false);
    expect(isConsumerMeaningfulCanonicalParameter(internalProductivity)).toBe(false);
    expect(isConsumerMeaningfulCanonicalParameter(undeclaredOwner)).toBe(false);
    expect(isConsumerMeaningfulCanonicalParameter(area)).toBe(true);
    expect(normalizedCanonicalNumericValidation({ minimum: Number.EPSILON, maximum: 0, integer: false })).toEqual({});
    expect(normalizedCanonicalNumericValidation({ minimum: 1, maximum: 0, integer: false })).toEqual({});
    expect(normalizedCanonicalNumericValidation({ minimum: 40, maximum: 60, integer: false })).toEqual({ min: 40, max: 60 });
  });

  it("presents scope choices as product language instead of backend enums", () => {
    const scopeSchema = {
      parameterId: "estimate_scope_mode",
      ordinal: 0,
      valueType: "enum",
      unitId: null,
      titleRu: "Состав сметы",
      descriptionRu: "Выберите применимый состав работ",
      required: true,
      defaultValue: "MINIMAL_EXPLICIT_SCOPE",
      constraints: { values: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] },
      semanticParameterKey: "estimate_scope_mode",
      visibilityRole: "USER_INPUT",
      valueSourceRole: "USER_MEASURED",
      normativeLinks: [],
      formulaConsumers: ["scope"],
      resourceBranchConsumers: ["scope"],
      validationRules: [],
      provenance: {},
    } as never;
    const session = buildConsumerCanonicalParameterSession({
      catalog: {
        catalogId: "scope-catalog",
        workKey: "scope-work",
        definitionVersion: 1,
        parameterSchema: [scopeSchema],
      } as never,
      revision: {
        revisionId: "scope-revision",
        checksumSha256: "scope-checksum",
        parameterSchemaHash: "scope-schema",
        compilerVersion: "scope-compiler",
        createdAt: "2026-08-18T00:00:00.000Z",
        parameters: { estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE" },
      } as never,
      draftId: "scope-draft",
    });
    expect(session.parameters[0]?.allowedValues).toEqual([
      { value: "MINIMAL_EXPLICIT_SCOPE", label: "Базовый состав" },
      { value: "FULL_APPLICABLE_SCOPE", label: "Полный применимый состав" },
    ]);
  });

  it("uses a compact accepted-baseline placeholder without scientific notation", () => {
    const placeholder = canonicalConsumerParameterPlaceholder({
      parameter: {
        source: "ASSUMED",
        validation: { min: 40, max: 60 },
        normativeSource: { document: "СП", locator: "п. 4", sourceId: "n1" },
      } as never,
      baselineDisplay: "50 мм",
      guideShortRu: "По проекту",
    });
    expect(placeholder).toBe("Предварительно принято: 50 мм · норма: 40–60");
    expect(placeholder).not.toMatch(/e-\d|2\.220446|Нормативный диапазон: числовое значение/u);
  });

  it("keeps approval on the compatible archival contract and removes technical routing from line actions", () => {
    const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const container = read("src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx");
    const client = read("src/lib/estimate/backendPlatform/canonicalEstimateClient.ts");
    const localBackend = read("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
    const edgeWorker = read("supabase/functions/canonical-estimate-worker/index.ts");
    const artifactContract = read("src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts");
    expect(screen).toContain('kind: "pdf"');
    expect(screen).toContain('documentProfile: "professional_v1"');
    expect(screen).not.toContain('kind: "professional_pdf"');
    expect(client).not.toContain('kind: "pdf" | "professional_pdf" | "procurement"');
    expect(localBackend).toContain("buildCanonicalProfessionalPdfProjection");
    expect(edgeWorker).toContain("buildCanonicalProfessionalPdfProjection");
    expect(localBackend).toContain("CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION");
    expect(edgeWorker).toContain("CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION");
    expect(artifactContract).toContain('service: "услуга"');
    expect(screen).toContain('idempotencyKey: `consumer-approve-archival-pdf-v2-${canonical.revisionId}`');
    expect(screen).not.toContain('idempotencyKey: `consumer-approve-pdf-${canonical.revisionId}`');
    expect(screen).not.toContain("consumer-approve-professional-pdf");
    const photoOwner = screen.slice(screen.indexOf("private openPhotoRecognition"), screen.indexOf("private addPhotoMaterialRecognition"));
    const catalogOwner = screen.slice(screen.indexOf("private openCatalogForEstimateItem"), screen.indexOf("private createNew"));
    expect(photoOwner).not.toContain("openCanonicalBackendEditor");
    expect(catalogOwner).not.toContain("openCanonicalBackendEditor");
    expect(photoOwner).toContain('this.actionContext("openLinePhoto"');
    expect(catalogOwner).toContain('this.actionContext("openLineCatalog"');
    expect(container).toContain("recalculateConsumerCanonicalCatalogSelection");
  });

  it("publishes a successfully recovered backend revision into the active screen bundle", () => {
    const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const prepareFlow = screen.slice(
      screen.indexOf("private prepareDraft = async"),
      screen.indexOf("private selectRoadScope"),
    );
    expect(prepareFlow).toContain("this.updateCurrentBundle(");
    expect(prepareFlow).toContain("result.bundle");
    expect(prepareFlow).toContain("Смета рассчитана. Проверьте позиции и параметры.");
  });

  it("recovers a quarantined revision through the current release and reads an existing legacy PDF without creating a new artifact", () => {
    const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const ensureFlow = screen.slice(
      screen.indexOf("private ensureInitialCanonicalRevision = async"),
      screen.indexOf("private prepareDraft = async"),
    );
    expect(ensureFlow).toContain("getCanonicalEstimateRevision(existingBinding.revisionId)");
    expect(ensureFlow).toContain("getCanonicalEstimateCatalogItem(existingRevision.catalogId)");
    expect(ensureFlow).toContain("currentCatalog.releaseId === existingBinding.releaseId");
    expect(ensureFlow).toContain("requiresCanonicalSuccessor = true");

    const pdfFlow = screen.slice(
      screen.indexOf("private completePdfOpen = async"),
      screen.indexOf("private makePdf ="),
    );
    expect(pdfFlow.indexOf("getCanonicalEstimateArtifact({"))
      .toBeLessThan(pdfFlow.indexOf("buildCanonicalEstimateArtifact({"));
    expect(pdfFlow).toContain('error.code !== "NOT_FOUND"');
  });

  it("opens history editing on /request with the exact inline parameter session", () => {
    const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const container = read("src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx");
    const editFlow = screen.slice(
      screen.indexOf("private editHistoryDraft = async"),
      screen.indexOf("private sendHistoryToMarket"),
    );
    expect(editFlow).toContain("openExactCanonicalRevisionInConsumerEditor");
    expect(editFlow).toContain("expectedReleaseId: binding.releaseId");
    expect(editFlow).not.toContain("onOpenCanonicalEstimate");
    expect(screen).toContain("onLoadCanonicalParameterSession(");
    expect(screen).toContain('router.setParams({ canonicalRevisionId: "", draftId: bundle.draft.id })');
    expect(container).not.toContain("ProfessionalEstimateComposer");
  });

  it("preserves every persisted backend row instead of filtering the DTO", () => {
    const container = read("src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx");
    expect(container).toContain("buildStructuredEstimateRequestDraft(mapping.payload)");
    expect(container).not.toContain("mapping.payload.rows.filter((row) => row.includedInEstimate !== false)");
  });
});
