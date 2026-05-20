import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type {
  WarehouseDataProviderResult,
  WarehouseProviderDescriptor,
  WarehouseProviderKey,
  WarehouseStockContext,
} from "./warehouseStockTypes";

export const REQUIRED_WAREHOUSE_PROVIDER_KEYS: readonly WarehouseProviderKey[] = [
  "aiWarehouseScreenContextProvider",
  "aiWarehouseStockProvider",
  "aiWarehouseStockDetailProvider",
  "aiWarehouseIncomingProvider",
  "aiWarehouseIssueProvider",
  "aiWarehouseReservationProvider",
  "aiWarehouseTransferProvider",
  "aiWarehouseInventoryProvider",
  "aiWarehouseDiscrepancyProvider",
  "aiWarehouseLocationProvider",
  "aiMaterialIdentityProvider",
  "aiMaterialSpecificationProvider",
  "aiUnitConversionProvider",
  "aiPackageConversionProvider",
  "aiQuantityNormalizationProvider",
  "aiProcurementLinkedRequestProvider",
  "aiSupplierLinkedOfferProvider",
  "aiMarketplaceLinkedOfferProvider",
  "aiDocumentsProvider",
  "aiPdfAggregatorProvider",
  "aiWaybillProvider",
  "aiInvoiceLinkedProvider",
  "aiWorkObjectLinkedProvider",
  "aiEstimateLinkedLineProvider",
  "aiProjectSpecificationProvider",
  "aiApprovalProvider",
  "aiCountryProfileProvider",
  "aiWarehouseAnswerComposer",
  "aiWarehouseSourceSanitizer",
] as const;

function descriptor(key: WarehouseProviderKey): WarehouseProviderDescriptor {
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

export const WAREHOUSE_PROVIDER_REGISTRY: readonly WarehouseProviderDescriptor[] =
  REQUIRED_WAREHOUSE_PROVIDER_KEYS.map(descriptor);

export function listWarehouseDataProviders(): WarehouseProviderDescriptor[] {
  return WAREHOUSE_PROVIDER_REGISTRY.map((item) => ({ ...item }));
}

function fact(id: string, textRu: string, sourceRefs: string[] = []): WarehouseDataProviderResult["facts"][number] {
  return {
    id,
    textRu,
    sourceRefs,
    confidence: sourceRefs.length > 0 ? "high" : "medium",
  };
}

function providerResult(params: Partial<WarehouseDataProviderResult>): WarehouseDataProviderResult {
  return {
    facts: params.facts ?? [],
    sources: params.sources ?? [],
    missingData: params.missingData ?? [],
    permissionLimited: params.permissionLimited ?? [],
    exactNoDataReasonRu: params.exactNoDataReasonRu,
  };
}

function sourceFilter(
  context: WarehouseStockContext,
  types: ConstructionKnowledgeSource["type"][],
): ConstructionKnowledgeSource[] {
  return context.sources.filter((source) => types.includes(source.type));
}

function stockAvailable(context: WarehouseStockContext, materialId: string): number {
  const stock = context.stockItems.find((item) => item.materialId === materialId);
  if (!stock) return 0;
  const inStock = stock.inStockQty ?? stock.availableQty + stock.reservedQty;
  return Math.max(0, inStock - stock.reservedQty);
}

export function aiWarehouseScreenContextProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    facts: [
      fact(
        "warehouse:screen",
        `Экран ${context.screenId}: остатки ${context.stockItems.length}, приходы ${context.incoming.length}, выдачи ${context.issues.length}, резервы ${(context.reservations ?? []).length}.`,
      ),
    ],
  });
}

export function aiWarehouseStockProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    sources: sourceFilter(context, ["warehouse_stock", "material"]),
    facts: context.stockItems.map((item) =>
      fact(
        `stock:${item.id}`,
        `Остаток ${item.materialNameRu}: всего ${item.inStockQty ?? item.availableQty + item.reservedQty} ${item.unit}, доступно ${stockAvailable(context, item.materialId)}, резерв ${item.reservedQty}, ожидается ${item.incomingQty}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.stockItems.flatMap((item) => [
      ...(item.sourceRefs.length ? [] : [`Материал ${item.materialNameRu} не имеет источника остатка.`]),
      ...(item.location || item.objectId ? [] : [`Материал ${item.materialNameRu} не имеет складской локации или объекта.`]),
    ]),
    exactNoDataReasonRu: context.stockItems.length === 0 ? "По экрану не найдены подтвержденные строки склада." : undefined,
  });
}

export function aiWarehouseStockDetailProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const selected = context.selectedMaterialId
    ? context.stockItems.filter((item) => item.materialId === context.selectedMaterialId)
    : context.stockItems;
  return providerResult({
    facts: selected.map((item) =>
      fact(
        `stock-detail:${item.id}`,
        `Карточка материала ${item.materialNameRu}: единица ${item.unit}, склад ${item.warehouseNameRu}, работа ${item.workNameRu ?? "не связана"}.`,
        item.sourceRefs,
      ),
    ),
    missingData: selected.flatMap((item) => [
      ...(item.specificationText || item.specification?.specificationText ? [] : [`Материал ${item.materialNameRu} не имеет спецификации.`]),
      ...(item.requestId ? [] : [`Материал ${item.materialNameRu} не связан с заявкой.`]),
    ]),
  });
}

export function aiWarehouseIncomingProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    sources: sourceFilter(context, ["warehouse_stock", "material", "supplier_offer", "procurement_request"]),
    facts: context.incoming.map((item) =>
      fact(
        `incoming:${item.id}`,
        `Приход ${item.materialNameRu}: ожидалось ${item.expectedQty ?? item.quantity} ${item.unit}, факт ${item.actualQty ?? item.quantity}, статус ${item.status}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.incoming.flatMap((item) => [
      ...(item.documentRefs.length === 0 || item.status === "needs_documents"
        ? [`Приход ${item.id} без накладной/сертификата/документа-источника.`]
        : []),
      ...(item.waybillId ? [] : [`Приход ${item.id} не связан с накладной.`]),
      ...(item.requestId ? [] : [`Приход ${item.id} не связан с заявкой.`]),
    ]),
  });
}

export function aiWarehouseIssueProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    sources: sourceFilter(context, ["warehouse_stock", "work", "object", "procurement_request", "approval"]),
    facts: context.issues.map((item) =>
      fact(
        `issue:${item.id}`,
        `Выдача ${item.materialNameRu}: нужно ${item.requestedQty} ${item.unit}, выдано ${item.issuedQty}, доступно ${stockAvailable(context, item.materialId)}, статус ${item.status}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.issues.flatMap((item) => [
      ...(item.objectId ? [] : [`Выдача ${item.id} без объекта.`]),
      ...(item.workId ? [] : [`Выдача ${item.id} без работы.`]),
      ...(item.requestId ? [] : [`Выдача ${item.id} без заявки-основания.`]),
      ...(item.status === "needs_approval" || item.approvalId ? [] : [`Выдача ${item.id} не имеет approval route, если требуется.`]),
    ]),
  });
}

export function aiWarehouseReservationProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const reservations = context.reservations ?? [];
  return providerResult({
    facts: reservations.map((item) =>
      fact(
        `reservation:${item.id}`,
        `Резерв ${item.materialNameRu}: ${item.quantity} ${item.unit}, статус ${item.status}, работа ${item.workNameRu ?? "не связана"}.`,
        item.sourceRefs,
      ),
    ),
    missingData: reservations.flatMap((item) => [
      ...(item.objectId ? [] : [`Резерв ${item.id} не связан с объектом.`]),
      ...(item.workId ? [] : [`Резерв ${item.id} не связан с работой.`]),
    ]),
  });
}

export function aiWarehouseTransferProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const transfers = context.transfers ?? [];
  return providerResult({
    facts: transfers.map((item) =>
      fact(
        `transfer:${item.id}`,
        `Перемещение ${item.materialNameRu}: ${item.quantity} ${item.unit}, статус ${item.status}.`,
        item.sourceRefs,
      ),
    ),
    missingData: transfers.flatMap((item) => [
      ...(item.fromLocation ? [] : [`Перемещение ${item.id} без исходной локации.`]),
      ...(item.toLocation ? [] : [`Перемещение ${item.id} без целевой локации.`]),
      ...(item.status === "pending_approval" || item.approvalId ? [] : [`Перемещение ${item.id} не имеет approval route, если требуется.`]),
    ]),
  });
}

export function aiWarehouseInventoryProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const counts = context.inventoryCounts ?? [];
  return providerResult({
    facts: counts.map((item) =>
      fact(
        `inventory:${item.id}`,
        `Инвентаризация ${item.materialNameRu}: учет ${item.bookQty} ${item.unit}, факт ${item.countedQty ?? "не указан"}, статус ${item.status}.`,
        item.sourceRefs,
      ),
    ),
    missingData: counts.flatMap((item) => [
      ...(typeof item.countedQty === "number" ? [] : [`Инвентаризация ${item.id} без фактического пересчета.`]),
      ...(item.location ? [] : [`Инвентаризация ${item.id} без локации.`]),
    ]),
  });
}

export function aiWarehouseDiscrepancyProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const issueFacts = context.issues.flatMap((issue) => {
    const available = stockAvailable(context, issue.materialId);
    const deficit = Math.max(0, issue.requestedQty - issue.issuedQty - available);
    return deficit > 0
      ? [fact(`discrepancy:issue:${issue.id}`, `По выдаче ${issue.id} дефицит ${deficit} ${issue.unit}.`, issue.sourceRefs)]
      : [];
  });
  const incomingFacts = context.incoming.flatMap((item) => {
    const expected = item.expectedQty ?? item.waybillQty ?? item.quantity;
    const actual = item.actualQty ?? item.quantity;
    return expected !== actual || item.status === "disputed"
      ? [fact(`discrepancy:incoming:${item.id}`, `По приходу ${item.id} расхождение: ожидалось ${expected}, факт ${actual} ${item.unit}.`, item.sourceRefs)]
      : [];
  });
  const inventoryFacts = (context.inventoryCounts ?? []).flatMap((item) =>
    typeof item.countedQty === "number" && item.countedQty !== item.bookQty
      ? [fact(`discrepancy:inventory:${item.id}`, `Инвентаризация ${item.id}: учет ${item.bookQty}, факт ${item.countedQty} ${item.unit}.`, item.sourceRefs)]
      : [],
  );
  return providerResult({
    facts: [...issueFacts, ...incomingFacts, ...inventoryFacts],
    missingData: issueFacts.length || incomingFacts.length || inventoryFacts.length
      ? ["Расхождение требует проверки человеком до складской мутации."]
      : [],
  });
}

export function aiWarehouseLocationProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const locations = [
    ...(context.locations ?? []),
    ...context.stockItems.flatMap((item) => item.location ? [item.location] : []),
  ];
  return providerResult({
    facts: locations.map((item, index) =>
      fact(
        `location:${item.warehouseId ?? index}`,
        `Локация: ${item.warehouseNameRu ?? "склад не указан"}${item.zone ? `, зона ${item.zone}` : ""}${item.shelf ? `, полка ${item.shelf}` : ""}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.stockItems.filter((item) => !item.location).map((item) => `Материал ${item.materialNameRu} без точной складской локации.`),
  });
}

export function aiMaterialIdentityProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    sources: sourceFilter(context, ["material"]),
    facts: context.stockItems.map((item) =>
      fact(`material:${item.materialId}`, `Материал идентифицирован: ${item.materialNameRu}, единица ${item.unit}.`, item.sourceRefs),
    ),
  });
}

export function aiMaterialSpecificationProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["specification", "boq", "project_pdf", "engineering_pdf", "estimate_pdf", "material"]);
  const itemsWithoutSpec = context.stockItems.filter((item) => !item.specificationText && !item.specification?.specificationText);
  return providerResult({
    sources,
    facts: [
      ...sources.map((source) =>
        fact(`spec:${source.id}`, `Источник спецификации: ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}.`, [source.id]),
      ),
      ...context.stockItems
        .filter((item) => item.specificationText || item.specification?.specificationText)
        .map((item) =>
          fact(
            `spec:item:${item.id}`,
            `Спецификация ${item.materialNameRu}: ${item.specification?.specificationText ?? item.specificationText}.`,
            item.specification?.sourceRefs ?? item.sourceRefs,
          ),
        ),
    ],
    missingData: [
      ...(sources.length === 0 ? ["Не найден PDF/документ спецификации по материалу."] : []),
      ...itemsWithoutSpec.map((item) => `Материал ${item.materialNameRu} без текста спецификации.`),
    ],
  });
}

export function aiUnitConversionProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    facts: [
      fact(
        "unit-conversion",
        context.unitConversionConfigured
          ? "Источник нормализации единиц подключен; сравнение количества выполняется только после trace."
          : "Источник нормализации единиц не подключен; разные единицы нельзя сравнивать как факт.",
      ),
    ],
    missingData: context.unitConversionConfigured ? [] : ["Unit conversion factor/source is missing."],
  });
}

export function aiPackageConversionProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    facts: [
      fact(
        "package-conversion",
        context.packageConversionConfigured ?? context.unitConversionConfigured
          ? "Правило пересчета упаковок подключено источником."
          : "Правило пересчета упаковок не подключено; упаковки не превращаются в штуки без источника.",
      ),
    ],
    missingData: context.packageConversionConfigured ?? context.unitConversionConfigured ? [] : ["Package conversion rule/source is missing."],
  });
}

export function aiQuantityNormalizationProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  return providerResult({
    facts: [
      fact(
        "quantity-normalization",
        context.quantityNormalizationConfigured ?? context.unitConversionConfigured
          ? "Количество нормализуется по источнику единиц; резерв вычитается из доступного остатка."
          : "Нормализация количества не настроена; сравнение выполняется только в одинаковых единицах.",
      ),
    ],
    missingData: context.quantityNormalizationConfigured ?? context.unitConversionConfigured ? [] : ["Quantity normalization source is missing."],
  });
}

export function aiProcurementLinkedRequestProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["procurement_request"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`procurement:${source.id}`, `Связанная заявка: ${source.labelRu}.`, [source.id])),
    missingData: sources.length === 0 ? ["Связанная заявка не найдена для дефицита/прихода/выдачи."] : [],
  });
}

export function aiSupplierLinkedOfferProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["supplier_offer"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`supplier-offer:${source.id}`, `Предложение поставщика: ${source.labelRu}.`, [source.id])),
    missingData: sources.length === 0 ? ["Предложение поставщика не подключено к складскому событию."] : [],
  });
}

export function aiMarketplaceLinkedOfferProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["supplier_offer"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`marketplace-offer:${source.id}`, `Marketplace source для материала: ${source.labelRu}.`, [source.id])),
    missingData: sources.length === 0 ? ["Marketplace offer не связан с материалом склада."] : [],
  });
}

export function aiDocumentsProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["act", "report", "photo", "specification", "project_pdf", "engineering_pdf", "estimate_pdf", "boq"]);
  return providerResult({
    sources,
    facts: sources.map((source) =>
      fact(`document:${source.id}`, `Документ склада: ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}.`, [source.id]),
    ),
    missingData: context.documentsProviderConnected ? [] : ["Warehouse documents/PDF provider is not connected."],
  });
}

export const aiPdfAggregatorProvider = aiDocumentsProvider;

export function aiWaybillProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const facts = context.incoming.flatMap((item) =>
    item.waybillId
      ? [fact(`waybill:${item.waybillId}`, `Накладная ${item.waybillId} связана с приходом ${item.id}.`, [...item.documentRefs, ...item.sourceRefs])]
      : [],
  );
  return providerResult({
    facts,
    missingData: context.incoming.flatMap((item) => item.waybillId ? [] : [`Накладная по приходу ${item.id} не найдена.`]),
  });
}

export function aiInvoiceLinkedProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const facts = context.incoming.flatMap((item) =>
    item.invoiceId
      ? [fact(`invoice:${item.invoiceId}`, `Счет ${item.invoiceId} связан с приходом ${item.id} только как документальный контекст.`, item.sourceRefs)]
      : [],
  );
  return providerResult({
    facts,
    permissionLimited: ["Складу скрыт полный cashflow; доступны только связанные счет/накладная по приходу."],
  });
}

export function aiWorkObjectLinkedProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["work", "object", "zone"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`work-object:${source.id}`, `Связь работа/объект: ${source.labelRu}.`, [source.id])),
    missingData: sources.length === 0 ? ["Работа/объект не связаны со складским событием."] : [],
  });
}

export function aiEstimateLinkedLineProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["estimate_pdf", "boq"]);
  return providerResult({
    sources,
    facts: [
      ...sources.map((source) => fact(`estimate:${source.id}`, `Сметный источник: ${source.labelRu}.`, [source.id])),
      ...context.stockItems.flatMap((item) =>
        item.estimateLineId
          ? [fact(`estimate-line:${item.estimateLineId}`, `Материал ${item.materialNameRu} связан со сметной строкой ${item.estimateLineId}.`, item.sourceRefs)]
          : [],
      ),
    ],
    missingData: context.stockItems.some((item) => item.estimateLineId) || sources.length ? [] : ["Сметная строка не связана с материалом склада."],
  });
}

export function aiProjectSpecificationProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["project_pdf", "architecture_pdf", "engineering_pdf", "specification"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`project-spec:${source.id}`, `Проектная спецификация: ${source.labelRu}.`, [source.id])),
    missingData: sources.length === 0 ? ["Проектная спецификация/PDF не найдена по материалу."] : [],
  });
}

export function aiApprovalProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["approval"]);
  return providerResult({
    sources,
    facts: [
      fact(
        "approval:warehouse",
        "Approval готовится только как маршрут для человека; AI не принимает, не выдает, не списывает и не перемещает материалы.",
        sources.map((source) => source.id),
      ),
    ],
    missingData: sources.length === 0 ? ["Approval route не связан со спорным складским событием."] : [],
  });
}

export function aiCountryProfileProvider(context: WarehouseStockContext): WarehouseDataProviderResult {
  const sources = sourceFilter(context, ["country_profile", "company_standard"]);
  return providerResult({
    sources,
    facts: [
      fact(
        "country-profile:warehouse",
        context.countryCode
          ? `Country profile context: ${context.countryCode}, currency ${context.currency ?? "not configured"}.`
          : "Country profile не настроен; нельзя утверждать локальные складские нормы.",
        sources.map((source) => source.id),
      ),
    ],
    missingData: context.countryCode ? [] : ["Country profile is not configured for warehouse stock rules."],
  });
}

export const WAREHOUSE_DATA_PROVIDER_FUNCTIONS: Record<WarehouseProviderKey, (context: WarehouseStockContext) => WarehouseDataProviderResult> = {
  aiWarehouseScreenContextProvider,
  aiWarehouseStockProvider,
  aiWarehouseStockDetailProvider,
  aiWarehouseIncomingProvider,
  aiWarehouseIssueProvider,
  aiWarehouseReservationProvider,
  aiWarehouseTransferProvider,
  aiWarehouseInventoryProvider,
  aiWarehouseDiscrepancyProvider,
  aiWarehouseLocationProvider,
  aiMaterialIdentityProvider,
  aiMaterialSpecificationProvider,
  aiUnitConversionProvider,
  aiPackageConversionProvider,
  aiQuantityNormalizationProvider,
  aiProcurementLinkedRequestProvider,
  aiSupplierLinkedOfferProvider,
  aiMarketplaceLinkedOfferProvider,
  aiDocumentsProvider,
  aiPdfAggregatorProvider,
  aiWaybillProvider,
  aiInvoiceLinkedProvider,
  aiWorkObjectLinkedProvider,
  aiEstimateLinkedLineProvider,
  aiProjectSpecificationProvider,
  aiApprovalProvider,
  aiCountryProfileProvider,
  aiWarehouseAnswerComposer: () => providerResult({ facts: [fact("composer:warehouse", "Ответ собирается общим warehouse stock funnel composer.")] }),
  aiWarehouseSourceSanitizer: () => providerResult({ facts: [fact("sanitizer:warehouse", "Источники очищаются от finance, security, runtime и raw provider payload.")] }),
};

export function warehouseProviderTraceForAll(): string[] {
  return ["warehouseStockPipeline", ...REQUIRED_WAREHOUSE_PROVIDER_KEYS];
}
