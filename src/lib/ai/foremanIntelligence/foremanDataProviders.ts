import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type {
  AiDataProviderResult,
  AiFact,
  ForemanProviderDescriptor,
  ForemanProviderKey,
  ForemanWorkdayContext,
} from "./foremanTypes";

export const REQUIRED_FOREMAN_PROVIDER_KEYS: readonly ForemanProviderKey[] = [
  "aiForemanScreenContextProvider",
  "aiForemanWorksProvider",
  "aiObjectsZonesProvider",
  "aiWorkStatusProvider",
  "aiWorkEvidenceProvider",
  "aiPhotosProvider",
  "aiActsProvider",
  "aiReportsProvider",
  "aiSubcontractorProvider",
  "aiDocumentsProvider",
  "aiPdfAggregatorProvider",
  "aiEstimateProvider",
  "aiArchitectureProjectProvider",
  "aiConstructionNormsProvider",
  "aiCountryProfileProvider",
  "aiMaterialBlockerProvider",
  "aiWarehouseLinkedStockProvider",
  "aiProcurementLinkedRequestProvider",
  "aiApprovalStatusProvider",
  "aiChatLinkedContextProvider",
] as const;

function descriptor(key: ForemanProviderKey): ForemanProviderDescriptor {
  return {
    key,
    pure: true,
    usesHooks: false,
    usesUseEffectHack: false,
    dbWrites: false,
    directMutation: false,
    createsFakeData: false,
    ready: true,
  };
}

export const FOREMAN_PROVIDER_REGISTRY: readonly ForemanProviderDescriptor[] =
  REQUIRED_FOREMAN_PROVIDER_KEYS.map(descriptor);

export function listForemanDataProviders(): ForemanProviderDescriptor[] {
  return FOREMAN_PROVIDER_REGISTRY.map((item) => ({ ...item }));
}

function fact(id: string, textRu: string, sourceRefs: string[] = []): AiFact {
  return {
    id,
    textRu,
    sourceRefs,
    confidence: sourceRefs.length > 0 ? "high" : "medium",
  };
}

function sourceFilter(
  context: ForemanWorkdayContext,
  types: ConstructionKnowledgeSource["type"][],
): ConstructionKnowledgeSource[] {
  return context.sources.filter((source) => types.includes(source.type));
}

function providerResult(params: {
  facts?: AiFact[];
  sources?: ConstructionKnowledgeSource[];
  missingData?: string[];
  exactNoDataReasonRu?: string;
}): AiDataProviderResult {
  return {
    facts: params.facts ?? [],
    sources: params.sources ?? [],
    missingData: params.missingData ?? [],
    permissionLimited: [],
    exactNoDataReasonRu: params.exactNoDataReasonRu,
  };
}

export function aiForemanScreenContextProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const selected = context.works.find((work) => work.id === context.selectedWorkId);
  return providerResult({
    facts: [
      fact(
        "foreman:screen",
        selected
          ? `Экран ${context.screenId}: выбрана работа ${selected.nameRu}.`
          : `Экран ${context.screenId}: выбранной работы нет, поэтому ответ собирается по дню, объектам и доступным источникам.`,
        selected?.sourceRefs ?? [],
      ),
    ],
  });
}

export function aiForemanWorksProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  if (context.works.length === 0) {
    return providerResult({
      missingData: ["В системе нет работ, доступных прорабу за выбранный период."],
      exactNoDataReasonRu: "Работы за период не найдены.",
    });
  }
  const sources = sourceFilter(context, ["work"]);
  return providerResult({
    sources,
    facts: context.works.map((work) =>
      fact(
        `work:${work.id}`,
        `Работа ${work.nameRu}: ${work.status}, объект ${work.objectNameRu}, дата ${work.date}.`,
        work.sourceRefs,
      ),
    ),
  });
}

export function aiObjectsZonesProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["object", "zone"]);
  const objects = [...new Map(context.works.map((work) => [work.objectId, work.objectNameRu])).entries()];
  return providerResult({
    sources,
    facts: objects.map(([objectId, objectNameRu]) =>
      fact(`object:${objectId}`, `Объект в работе прораба: ${objectNameRu}.`, sources.map((source) => source.id)),
    ),
    missingData: objects.length === 0 ? ["Не найден объект, привязанный к работам прораба."] : [],
  });
}

export function aiWorkStatusProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const done = context.works.filter((work) => work.status === "done" || work.status === "ready_for_act").length;
  const notClosed = context.works.length - done;
  return providerResult({
    facts: [fact("work:status:summary", `Статусы работ: выполнено или готово к акту ${done}, не закрыто ${notClosed}.`)],
  });
}

export function aiWorkEvidenceProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["photo", "act", "report"]);
  const missing = context.works.flatMap((work) =>
    work.blockers
      .filter((blocker) => ["photo_missing", "document_missing", "signature_missing", "act_missing"].includes(blocker.kind))
      .map((blocker) => `${work.nameRu}: ${blocker.textRu}`),
  );
  return providerResult({
    sources,
    facts: sources.length > 0 ? [fact("evidence:sources", `Найдены evidence-источники: ${sources.length}.`, sources.map((source) => source.id))] : [],
    missingData: missing,
    exactNoDataReasonRu: sources.length === 0 ? "Фото, акты или отчёты не найдены среди доступных источников." : undefined,
  });
}

export function aiPhotosProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["photo"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`photo:${source.id}`, `Фото-источник: ${source.labelRu}.`, [source.id])),
    missingData: context.works.flatMap((work) =>
      work.blockers.filter((blocker) => blocker.kind === "photo_missing").map((blocker) => `${work.nameRu}: ${blocker.textRu}`),
    ),
    exactNoDataReasonRu: sources.length === 0 ? "Фото по работам не найдены." : undefined,
  });
}

export function aiActsProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["act"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`act:${source.id}`, `Акт или черновик акта найден: ${source.labelRu}.`, [source.id])),
    missingData: context.works.flatMap((work) =>
      work.blockers.filter((blocker) => blocker.kind === "act_missing").map((blocker) => `${work.nameRu}: ${blocker.textRu}`),
    ),
    exactNoDataReasonRu: sources.length === 0 ? "Привязанный акт по работам не найден." : undefined,
  });
}

export function aiReportsProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["report"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`report:${source.id}`, `Отчёт найден: ${source.labelRu}.`, [source.id])),
    exactNoDataReasonRu: sources.length === 0 ? "Ежедневный отчёт по периоду не найден." : undefined,
  });
}

export function aiSubcontractorProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const contractorWorks = context.works.filter((work) => work.contractorId || work.contractorNameRu);
  return providerResult({
    facts: contractorWorks.map((work) =>
      fact(
        `subcontractor:${work.id}`,
        `${work.contractorNameRu ?? "Подрядчик"} связан с работой ${work.nameRu}; открытых blockers: ${work.blockers.length}.`,
        work.sourceRefs,
      ),
    ),
    missingData: contractorWorks.length === 0 ? ["Не найден подрядчик, привязанный к работам на экране."] : [],
  });
}

export function aiDocumentsProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, [
    "project_pdf",
    "architecture_pdf",
    "engineering_pdf",
    "estimate_pdf",
    "boq",
    "specification",
    "act",
    "report",
    "normative_pdf",
    "company_standard",
  ]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`document:${source.id}`, `Документ доступен: ${source.labelRu}.`, [source.id])),
    exactNoDataReasonRu: sources.length === 0 ? "Документы или PDF по объекту/работе не найдены." : undefined,
  });
}

export function aiPdfAggregatorProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, [
    "project_pdf",
    "architecture_pdf",
    "engineering_pdf",
    "estimate_pdf",
    "boq",
    "specification",
    "normative_pdf",
    "company_standard",
  ]);
  return providerResult({
    sources,
    facts: sources.map((source) =>
      fact(
        `pdf:${source.id}`,
        `PDF/source trace: ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}.`,
        [source.id],
      ),
    ),
    missingData: sources.length === 0
      ? ["Загрузите PDF проекта, сметы, акта или выберите документ из уже загруженных и привяжите к объекту/работе."]
      : [],
    exactNoDataReasonRu: sources.length === 0 ? "PDF chunks не найдены." : undefined,
  });
}

export function aiEstimateProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["estimate_pdf", "boq"]);
  const estimateWorks = context.works.filter((work) => work.estimateLineId);
  return providerResult({
    sources,
    facts: estimateWorks.map((work) =>
      fact(
        `estimate:${work.estimateLineId}`,
        `Сметная связь ${work.estimateLineId}: план ${work.plannedQty ?? "не указан"} ${work.unit ?? ""}, факт ${work.actualQty ?? "не указан"} ${work.unit ?? ""}.`,
        [...work.sourceRefs, ...sources.map((source) => source.id)],
      ),
    ),
    missingData: sources.length === 0 ? ["Смета или строка BOQ не привязана к работе/объекту."] : [],
    exactNoDataReasonRu: sources.length === 0 ? "Сметный источник не найден." : undefined,
  });
}

export function aiArchitectureProjectProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["project_pdf", "architecture_pdf", "engineering_pdf", "specification"]);
  return providerResult({
    sources,
    facts: sources.map((source) =>
      fact(
        `architecture:${source.id}`,
        `Проектный источник найден: ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}.`,
        [source.id],
      ),
    ),
    missingData: sources.length === 0
      ? ["Точный проектный источник не найден: загрузите PDF проекта, выберите документ или привяжите его к объекту."]
      : [],
    exactNoDataReasonRu: sources.length === 0 ? "Проектный или архитектурный PDF не найден." : undefined,
  });
}

export function aiConstructionNormsProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["normative_pdf", "company_standard", "country_profile"]);
  return providerResult({
    sources,
    facts: sources.length > 0
      ? sources.map((source) => fact(`norm:${source.id}`, `Нормативный или company source найден: ${source.labelRu}.`, [source.id]))
      : [
        fact(
          "norm:general",
          "Общий строительный чек-лист можно использовать только как общую рекомендацию, не как норму страны или требование проекта.",
        ),
      ],
    missingData: sources.length === 0
      ? ["В проекте не найден привязанный нормативный документ, country profile или стандарт компании."]
      : [],
    exactNoDataReasonRu: sources.length === 0 ? "Нормативный source trace не настроен." : undefined,
  });
}

export function aiCountryProfileProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["country_profile"]);
  return providerResult({
    sources,
    facts: context.countryProfile
      ? [
        fact(
          "country:profile",
          `Country profile: ${context.countryProfile.countryNameRu}, валюта ${context.countryProfile.currency}, единицы ${context.countryProfile.unitSystem}.`,
          [context.countryProfile.sourceRef],
        ),
      ]
      : sources.map((source) => fact(`country:${source.id}`, `Country profile source доступен: ${source.labelRu}.`, [source.id])),
    missingData: !context.countryProfile && sources.length === 0 ? ["Country profile по проекту не настроен."] : [],
    exactNoDataReasonRu: !context.countryProfile && sources.length === 0 ? "Country profile отсутствует." : undefined,
  });
}

export function aiMaterialBlockerProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["material"]);
  const materialBlockers = context.works.flatMap((work) =>
    work.blockers.filter((blocker) => blocker.kind === "material_missing").map((blocker) => `${work.nameRu}: ${blocker.textRu}`),
  );
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`material:${source.id}`, `Материал связан с работой: ${source.labelRu}.`, [source.id])),
    missingData: materialBlockers,
    exactNoDataReasonRu: sources.length === 0 && materialBlockers.length === 0 ? "Материальные blockers не найдены." : undefined,
  });
}

export function aiWarehouseLinkedStockProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["warehouse_stock"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`warehouse:${source.id}`, `Складской статус по связанному материалу: ${source.labelRu}.`, [source.id])),
    exactNoDataReasonRu: sources.length === 0 ? "Связанный складской остаток не найден." : undefined,
  });
}

export function aiProcurementLinkedRequestProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["procurement_request"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`procurement:${source.id}`, `Связанная заявка снабжения: ${source.labelRu}.`, [source.id])),
    exactNoDataReasonRu: sources.length === 0 ? "Связанная заявка снабжения не найдена." : undefined,
  });
}

export function aiApprovalStatusProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["approval"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`approval:${source.id}`, `Статус согласования доступен: ${source.labelRu}.`, [source.id])),
    missingData: context.works.flatMap((work) =>
      work.blockers.filter((blocker) => blocker.kind === "approval_missing").map((blocker) => `${work.nameRu}: ${blocker.textRu}`),
    ),
    exactNoDataReasonRu: sources.length === 0 ? "Approval status по работам не найден." : undefined,
  });
}

export function aiChatLinkedContextProvider(context: ForemanWorkdayContext): AiDataProviderResult {
  const sources = sourceFilter(context, ["chat_message"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`chat:${source.id}`, `Связанный чат-контекст: ${source.labelRu}.`, [source.id])),
    exactNoDataReasonRu: sources.length === 0 ? "Связанный чат-контекст не найден." : undefined,
  });
}

export const FOREMAN_DATA_PROVIDER_FUNCTIONS: Record<
  ForemanProviderKey,
  (context: ForemanWorkdayContext) => AiDataProviderResult
> = {
  aiForemanScreenContextProvider,
  aiForemanWorksProvider,
  aiObjectsZonesProvider,
  aiWorkStatusProvider,
  aiWorkEvidenceProvider,
  aiPhotosProvider,
  aiActsProvider,
  aiReportsProvider,
  aiSubcontractorProvider,
  aiDocumentsProvider,
  aiPdfAggregatorProvider,
  aiEstimateProvider,
  aiArchitectureProjectProvider,
  aiConstructionNormsProvider,
  aiCountryProfileProvider,
  aiMaterialBlockerProvider,
  aiWarehouseLinkedStockProvider,
  aiProcurementLinkedRequestProvider,
  aiApprovalStatusProvider,
  aiChatLinkedContextProvider,
};
