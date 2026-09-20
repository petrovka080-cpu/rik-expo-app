import { CANONICAL_PARAMETER_CORE_SCHEMA_VERSION } from "../estimate/canonicalParameters/canonicalParameterCore";
import type {
  CanonicalParameter,
  CanonicalParameterSession,
} from "../estimate/canonicalParameters/canonicalParameterCore";
import type { EstimateDraftRevision } from "../estimate/estimateDraftRevisionContract";
import {
  buildCanonicalParameterCards,
  buildRevisionParameterCards,
} from "./buildCanonicalParameterCards";

function parameter(
  parameterId: string,
  overrides: Partial<CanonicalParameter> = {},
): CanonicalParameter {
  return {
    parameterId,
    label: parameterId,
    description: `Описание ${parameterId}`,
    value: null,
    valueType: "number",
    unit: null,
    requiredLevel: "CONTRACT_REQUIRED",
    visibilityCondition: { kind: "ALWAYS" },
    validation: {},
    allowedValues: [],
    source: "MISSING",
    state: "BLOCKING_REQUIRED",
    confidence: 0,
    assumption: null,
    affectsRows: [],
    affectsFormula: [`formula:${parameterId}`],
    normativeSource: null,
    displayOrder: 1,
    sourceText: null,
    valid: true,
    validationIssues: [],
    ...overrides,
  };
}

function session(parameters: readonly CanonicalParameter[]): CanonicalParameterSession {
  return {
    coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
    sessionId: "session-r3",
    draftId: "draft-r3",
    revisionId: "revision-r3",
    schemaId: "asphalt-r3",
    schemaVersion: "r3",
    workPassportId: "asphalt_concrete_pavement",
    canonicalWorkKey: "asphalt_concrete_pavement",
    calculationVersion: "immutable-asphalt-control",
    status: "BLOCKING_REQUIRED",
    parameters,
    blockingMissingParameterIds: [],
    contractMissingParameterIds: [],
    assumptionParameterIds: [],
    invalidParameterIds: [],
    fingerprint: "fingerprint-r3",
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
  };
}

describe("buildCanonicalParameterCards R3 truth presenter", () => {
  it("keeps a historical revision readable from persisted DTO data only", () => {
    const revision = {
      params: {
        area_m2: {
          value: 42,
          canonicalUnit: "m2",
          source: "edited_by_user",
          sourceText: "Подтверждено обмером",
          lastChangedAt: "revision-history-1",
        },
      },
      missingInputs: [{
        key: "height_m",
        label: "Высота",
        blocksPreliminaryEstimate: false,
        requiredFor: "better_accuracy",
      }],
      boq: { rows: [{ rowId: "row-1", titleRu: "Монтаж покрытия" }] },
      trace: {
        params: [{ key: "area_m2", affectsRowIds: ["row-1"] }],
        rows: [{ rowId: "row-1", formulaId: "quantity-by-area" }],
      },
    } as unknown as EstimateDraftRevision;

    const cards = buildRevisionParameterCards(revision);

    expect(cards.map((card) => card.key).sort()).toEqual(["area_m2", "height_m"]);
    expect(cards.find((card) => card.key === "area_m2")).toMatchObject({
      value: 42,
      displayValueRu: "42 м²",
      source: "manual_override",
      affectsRowIds: ["row-1"],
      affectsRowTitlesRu: ["Монтаж покрытия"],
      formulaRefs: ["quantity-by-area"],
      missing: false,
    });
    expect(cards.find((card) => card.key === "height_m")).toMatchObject({
      labelRu: "Высота",
      value: null,
      missing: true,
    });
  });

  it("скрывает внутренний scope и заменяет count + free-text одним typed-редактором", () => {
    const cards = buildCanonicalParameterCards({
      session: session([
        parameter("scope_profile", { valueType: "string" }),
        parameter("crushed_layer_count", { validation: { min: 1, max: 6, integer: true } }),
        parameter("crushed_layers", { valueType: "string" }),
      ]),
      revision: null,
    });

    expect(cards.map((card) => card.key)).toEqual(["crushed_layers"]);
    expect(cards[0]).toMatchObject({
      derivedCountParameterKey: "crushed_layer_count",
      guideKind: "DERIVED_VALUE_RULE",
    });
    expect(cards[0]?.structuredGroup?.fields.length).toBeGreaterThan(1);
  });

  it("показывает точный нормативный диапазон только вместе с нормативным источником", () => {
    const withoutSource = buildCanonicalParameterCards({
      session: session([parameter("depth_mm", {
        unit: "mm",
        validation: { min: 20, max: 40 },
      })]),
      revision: null,
    })[0];
    const withSource = buildCanonicalParameterCards({
      session: session([parameter("depth_mm", {
        unit: "mm",
        validation: { min: 20, max: 40 },
        normativeSource: {
          profile: "KG_PROFILE",
          sourceId: "source-r3",
          document: "Точный документ",
          revision: "2026",
          locator: "п. 4.2",
          checkedAt: "2026-08-17",
          sourceHash: "a".repeat(64),
        },
      })]),
      revision: null,
    })[0];

    expect(withoutSource?.guideKind).toBe("MEASUREMENT_RULE");
    expect(withoutSource?.guideShortRu).not.toContain("20–40");
    expect(withSource?.guideKind).toBe("NORMATIVE_RANGE");
    expect(withSource?.guideShortRu).toContain("20–40");
    expect(withSource?.guideDetailsRu?.join(" ")).toContain("Точный документ");
    expect(withSource?.guideDetailsRu?.join(" ")).toContain("п. 4.2");
  });

  it("не показывает документальное поле без потребителя расчёта", () => {
    const cards = buildCanonicalParameterCards({
      session: session([
        parameter("structural_drawing_reference", {
          valueType: "string",
          affectsFormula: [],
          affectsRows: [],
        }),
        parameter("strip_width_m", {
          unit: "m",
          affectsFormula: ["formula:concrete_volume"],
        }),
      ]),
      revision: null,
    });

    expect(cards.map((card) => card.key)).toEqual(["strip_width_m"]);
  });

  it("не возвращает сохранённый необязательный документальный профиль на первый экран", () => {
    const cards = buildCanonicalParameterCards({
      session: session([
        parameter("product_profile_id", {
          valueType: "string",
          requiredLevel: "OPTIONAL",
          value: "advanced_document_profile",
          source: "USER_EXPLICIT",
          state: "PROVIDED",
          allowedValues: [{ value: "advanced_document_profile", label: "Расширенная проверка" }],
          affectsFormula: [],
          affectsRows: ["main_concrete"],
        }),
        parameter("strip_width_m", {
          unit: "m",
          affectsFormula: ["formula:concrete_volume"],
        }),
      ]),
      revision: null,
    });

    expect(cards.map((card) => card.key)).toEqual(["strip_width_m"]);
  });
});
