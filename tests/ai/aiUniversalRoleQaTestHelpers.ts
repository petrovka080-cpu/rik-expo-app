import {
  buildAiAppContextGraph,
  type AiContextGraphBuildResult,
} from "../../src/lib/ai/appContextGraph";
import {
  answerUniversalRoleQa,
  validateUniversalRoleQaAnswer,
  type UniversalExternalWebResult,
  type UniversalRoleQaAnswer,
} from "../../src/lib/ai/universalRoleQa";
import { createAiAppContextGraphFixtureInput } from "./aiAppContextGraphTestHelpers";

export const universalExternalWebResults: UniversalExternalWebResult[] = [
  {
    id: "web-asphalt-kg-1",
    titleRu: "Технология укладки асфальта и подготовка основания",
    snippetRu: "Асфальт требует подготовки основания, доставки смеси, укладки и уплотнения катком.",
    url: "https://example.org/asphalt-reference",
    domain: "example.org",
    checkedAt: "2026-05-20T00:00:00.000Z",
    sourceType: "trusted_article",
    topic: "construction",
    confidence: "medium",
    canBePresentedAsFact: true,
    requiresReview: true,
  },
  {
    id: "web-gkl-supplier-1",
    titleRu: "Внешний поставщик ГКЛ 12.5 мм",
    snippetRu: "Рыночное предложение ГКЛ как внешний вариант, не факт закупки.",
    url: "https://example.org/gkl-supplier",
    domain: "example.org",
    checkedAt: "2026-05-20T00:00:00.000Z",
    sourceType: "external_marketplace",
    topic: "supplier",
    confidence: "medium",
    canBePresentedAsFact: true,
    requiresReview: true,
  },
  {
    id: "web-accounting-kg-1",
    titleRu: "Справка по учету аванса",
    snippetRu: "Бухгалтерская рекомендация требует проверки специалистом.",
    url: "https://example.org/accounting-reference",
    domain: "example.org",
    checkedAt: "2026-05-20T00:00:00.000Z",
    sourceType: "accounting_reference",
    topic: "accounting",
    confidence: "medium",
    canBePresentedAsFact: true,
    requiresReview: true,
  },
];

export function createUniversalRoleQaFixtureGraph(role = "director"): AiContextGraphBuildResult {
  const input = createAiAppContextGraphFixtureInput(role);
  input.entities = [
    ...(input.entities ?? []),
    {
      entityType: "procurement_request",
      entityId: "req-124",
      labelRu: "Заявка №124",
      facts: [
        { key: "createdAt", valueRu: "2026-05-05" },
        { key: "status", valueRu: "approved" },
      ],
    },
    {
      entityType: "procurement_request",
      entityId: "req-130",
      labelRu: "Заявка №130",
      facts: [
        { key: "createdAt", valueRu: "2026-05-14" },
        { key: "status", valueRu: "pending" },
      ],
    },
    {
      entityType: "procurement_request",
      entityId: "req-no-floor",
      labelRu: "Заявка без этажа",
      facts: [
        { key: "createdAt", valueRu: "2026-05-18" },
        { key: "status", valueRu: "missing_docs" },
      ],
    },
  ];
  return buildAiAppContextGraph(input);
}

export function answerUniversalRoleQaFixture(
  questionRu: string,
  role = "director",
  screenId = role,
  options: {
    web?: boolean;
    graph?: AiContextGraphBuildResult;
  } = {},
): UniversalRoleQaAnswer {
  return answerUniversalRoleQa({
    questionRu,
    role,
    screenId,
    graph: options.graph ?? createUniversalRoleQaFixtureGraph(role),
    externalWebConnected: options.web === true,
    externalWebResults: options.web ? universalExternalWebResults : [],
    countryCode: "KG",
    referenceDate: "2026-05-20",
  });
}

export function expectUniversalGuardPass(answer: UniversalRoleQaAnswer): void {
  const guard = validateUniversalRoleQaAnswer(answer);
  expect(guard.passed).toBe(true);
}
