import type {
  ConsumerRepairAiDraft,
  ConsumerRepairDraftBundle,
  ConsumerRepairSelectedWork,
} from "../../src/lib/consumerRequests/consumerRequestTypes";

export const CANONICAL_CONSUMER_TEST_RELEASE_ID =
  "c2222222-3333-4444-8555-666666666666";

let canonicalRevisionSequence = 0;

type CanonicalConsumerRepairRevisionFixtureOptions = {
  countryCode?: string | null;
  city?: string | null;
  region?: string | null;
  userLocale?: string | null;
  currency?: string | null;
  selectedWorkKey?: string | null;
  selectedWork?: ConsumerRepairSelectedWork | null;
  summaryRu?: string;
  missingData?: string[];
  dangerousDiyBlocked?: boolean;
  safetyMessageRu?: string;
};

function scenarioForHistoryFixture(problemText: string): {
  titleRu: string;
  repairType: string;
  materialTitleRu: string;
  workTitleRu: string;
  unit: string;
} {
  const normalized = problemText.toLocaleLowerCase("ru");
  if (/ламинат|floor|Р»Р°РјРёРЅР°С‚/iu.test(normalized)) {
    return {
      titleRu: "Укладка ламината",
      repairType: "flooring",
      materialTitleRu: "Ламинат, 33 класс",
      workTitleRu: "Укладка ламината",
      unit: "м²",
    };
  }
  if (/фундамент|армир|Р°СЂРјРёСЂ/iu.test(normalized)) {
    return {
      titleRu: "Армирование фундамента",
      repairType: "foundation",
      materialTitleRu: "Арматура А500С, 12 мм",
      workTitleRu: "Монтаж арматурного каркаса",
      unit: "т",
    };
  }
  if (/electrical|электр|кабел|РєР°Р±РµР»/iu.test(normalized)) {
    return {
      titleRu: "Электромонтажные работы",
      repairType: "electrical",
      materialTitleRu: "Кабель ВВГнг-LS 3×2,5 мм²",
      workTitleRu: "Монтаж кабельной линии",
      unit: "м",
    };
  }
  if (/road|дорог|асфальт|РґРѕСЂРѕРі/iu.test(normalized)) {
    return {
      titleRu: "Устройство дорожного основания",
      repairType: "road",
      materialTitleRu: "Щебень фракции 20–40 мм",
      workTitleRu: "Устройство щебёночного основания",
      unit: "м³",
    };
  }
  return {
    titleRu: "Каноническая смета",
    repairType: "repair",
    materialTitleRu: "Материал по канонической ревизии",
    workTitleRu: "Работа по канонической ревизии",
    unit: "шт.",
  };
}

/**
 * Persistence/history fixture only. It represents rows already projected by the
 * canonical backend and deliberately performs no prompt compilation or pricing.
 */
export function buildCanonicalConsumerRepairRevisionFixture(
  problemText: string,
  options: CanonicalConsumerRepairRevisionFixtureOptions = {},
): ConsumerRepairAiDraft {
  canonicalRevisionSequence += 1;
  const revisionId = `c1111111-2222-4333-8444-${String(canonicalRevisionSequence).padStart(12, "0")}`;
  const scenario = scenarioForHistoryFixture(problemText);
  const currency = options.currency ?? "KGS";
  const rowSource = (rowId: string) => ({
    canonicalBackendRevisionId: revisionId,
    canonicalBackendReleaseId: CANONICAL_CONSUMER_TEST_RELEASE_ID,
    canonicalBackendRowId: rowId,
    compilerOwner: "backend",
    fixtureKind: "already_compiled_canonical_revision",
  });
  return {
    titleRu: scenario.titleRu,
    summaryRu: options.summaryRu ?? `Проекция уже рассчитанной канонической backend-ревизии: ${scenario.titleRu}.`,
    repairType: options.selectedWorkKey ?? scenario.repairType,
    ...(options.selectedWork ? { selectedWork: options.selectedWork } : {}),
    items: [
      {
        itemType: "material",
        titleRu: scenario.materialTitleRu,
        quantity: 1,
        unit: scenario.unit,
        unitPrice: null,
        currency,
        source: "reference_price_book",
        category: "material",
        sourceParameters: rowSource("canonical-history-material-001"),
      },
      {
        itemType: "work",
        titleRu: scenario.workTitleRu,
        quantity: 1,
        unit: scenario.unit,
        unitPrice: null,
        currency,
        source: "reference_price_book",
        category: "work",
        sourceParameters: rowSource("canonical-history-work-001"),
      },
      {
        itemType: "material",
        titleRu: "Крепёж по канонической спецификации",
        quantity: 1,
        unit: "компл.",
        unitPrice: null,
        currency,
        source: "reference_price_book",
        category: "material",
        sourceParameters: rowSource("canonical-history-material-002"),
      },
      {
        itemType: "work",
        titleRu: "Подготовительные работы по канонической спецификации",
        quantity: 1,
        unit: "компл.",
        unitPrice: null,
        currency,
        source: "reference_price_book",
        category: "work",
        sourceParameters: rowSource("canonical-history-work-002"),
      },
    ],
    missingData: options.missingData ?? [],
    ...(options.safetyMessageRu ? { safetyMessageRu: options.safetyMessageRu } : {}),
    dangerousDiyBlocked: options.dangerousDiyBlocked ?? false,
  };
}

export function canonicalArtifactForConsumerRepairRevisionFixture(
  bundle: ConsumerRepairDraftBundle,
): {
  artifactId: string;
  revisionId: string;
  releaseId: string;
  status: "ready";
  sha256: string;
} {
  const artifactId = String(bundle.pdfs[0]?.id ?? "").trim();
  const revisionId = String(bundle.items[0]?.sourceParameters?.canonicalBackendRevisionId ?? "").trim();
  const releaseId = String(bundle.items[0]?.sourceParameters?.canonicalBackendReleaseId ?? "").trim();
  if (!artifactId || !revisionId || !releaseId) {
    throw new Error("CANONICAL_CONSUMER_REPAIR_REVISION_FIXTURE_ARTIFACT_IDENTITY_MISSING");
  }
  return {
    artifactId,
    revisionId,
    releaseId,
    status: "ready",
    sha256: "c".repeat(64),
  };
}
