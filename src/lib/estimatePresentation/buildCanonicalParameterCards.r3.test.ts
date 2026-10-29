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
  it("keeps required physical numeric resource inputs visible while optional document numbers stay outside the calculation form", () => {
    const cards = buildCanonicalParameterCards({ revision: null, session: session([
      parameter('pvc15_membrane_consumption_m2', { label: 'Расход мембраны', value: 86.25, source: 'ASSUMED', state: 'ASSUMED',
        affectsFormula: [], affectsRows: ['material:membrane'], requiredLevel: 'CONDITIONAL' }),
      parameter('document_number', { label: 'Номер документа', value: 18, source: 'PROJECT_SPECIFIC', state: 'PROVIDED',
        affectsFormula: [], affectsRows: ['handover'], requiredLevel: 'OPTIONAL' }),
    ]) });
    expect(cards.map(card => card.key)).toEqual(['pvc15_membrane_consumption_m2']);
  });
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

  it("показывает допустимый диапазон измеряемого поля с его документом как ограничение ввода", () => {
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
    expect(withSource?.guideKind).toBe("VALIDATION_RANGE");
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

describe("COMMON object guidance retains source ownership",()=>{
 it.each(["fixture-floor","fixture-wall","fixture-network"])("COMMON metadata guidance works without a catalog exception for %s",catalogId=>{
  const numeric=parameter("fixture_input_a",{label:"Фактическая фасовка",description:"Объём упаковки из принятой спецификации.",unit:"l",inputOwnership:"USER_INPUT",consumerInputRole:"OBJECT_FACT"}),
   reference=parameter("fixture_input_b",{label:"Согласованное условие",description:"Условие и документ фактического объёма.",valueType:"string",inputOwnership:"USER_INPUT",consumerInputRole:"OBJECT_FACT"}),
   technical=parameter("fixture_developer_norm",{label:"Техническая норма приложения",inputOwnership:"APPLICATION",consumerInputRole:"APPLICATION_TECHNICAL",
    sourceProvenance:{guideKind:"NO_NUMERIC_NORM",sourceRole:"UNRESOLVED_APPLICATION_NORM"}});
  const input={...session([numeric,reference,technical]),workPassportId:catalogId},before=JSON.stringify(input);
  const cards=buildCanonicalParameterCards({session:input,revision:null});
  expect(cards.find(card=>card.key===numeric.parameterId)).toMatchObject({value:null,unitRu:"л",editable:true,guideKind:"MEASUREMENT_RULE"});
  expect(cards.find(card=>card.key===numeric.parameterId)?.guideShortRu).toContain("фактическое значение");
  expect(cards.find(card=>card.key===reference.parameterId)?.guideShortRu).toContain("согласованное обозначение");
  expect(cards.find(card=>card.key===reference.parameterId)?.unitRu).toBe("");
  expect(cards.find(card=>card.key===reference.parameterId)?.guideKind).toBe("PROJECT_DEFINED");
  expect(cards.some(card=>card.key===technical.parameterId)).toBe(false);
  expect(JSON.stringify(input)).toBe(before);
 });
});