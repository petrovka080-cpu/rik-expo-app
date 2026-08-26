import {
  ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
  evaluateEstimateContentPassportR3,
  type EstimateContentPassportR3,
} from "./estimateContentPassportR3";

function validPassport(): EstimateContentPassportR3 {
  return {
    contract: ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
    catalogId: "concrete:strip-foundation",
    titleRu: "Монолитный ленточный фундамент",
    identityMode: "WORK",
    aliasesRu: ["ленточный фундамент"],
    physicalResultRu: "Готовый монолитный железобетонный ленточный фундамент",
    includedScopeRu: ["бетон, армирование и укладка по выбранному составу"],
    excludedScopeRu: ["земляные работы и проектирование"],
    parameters: [
      {
        parameterId: "volume_m3",
        titleRu: "Объём бетона",
        guideRu: "Укажите проектный объём бетона в конструкции.",
        visibilityRole: "USER_INPUT",
        formulaConsumerIds: ["concrete_quantity"],
        resourceConsumerIds: ["ready_mix"],
      },
      {
        parameterId: "distance_km",
        titleRu: "Расстояние доставки",
        guideRu: "Укажите маршрут от бетонного узла до объекта.",
        visibilityRole: "USER_INPUT",
        formulaConsumerIds: ["delivery_quantity"],
        resourceConsumerIds: ["ready_mix_delivery"],
      },
    ],
    formulas: [
      { formulaId: "concrete_quantity", outputUnitId: "m3", expressionSource: "volume_m3", inputParameterIds: ["volume_m3"] },
      { formulaId: "delivery_quantity", outputUnitId: "m3_km", expressionSource: "volume_m3 * distance_km", inputParameterIds: ["volume_m3", "distance_km"] },
    ],
    resources: [
      {
        rowId: "ready_mix",
        group: "material",
        titleRu: "Бетонная смесь класса по проекту",
        unitId: "m3",
        formulaId: "concrete_quantity",
        semanticOwnerId: "material:ready-mix",
        costOwnerId: "cost:ready-mix",
        resourceIdentity: "ready-mix",
        provenanceKind: "CANONICAL_PHYSICAL_RESOURCE",
        generationAxes: [],
        costingMode: "OWN_COST",
        procurementEligible: true,
        normativeSource: { sourceKey: "project", locator: "класс и объём бетона по проекту" },
      },
      {
        rowId: "place_concrete",
        group: "construction_work",
        titleRu: "Укладка бетонной смеси в опалубку",
        unitId: "m3",
        formulaId: "concrete_quantity",
        semanticOwnerId: "work:place-concrete",
        costOwnerId: "cost:place-concrete",
        resourceIdentity: "place-concrete",
        provenanceKind: "EXPLICIT_CONSTRUCTION_OPERATION",
        generationAxes: [],
        costingMode: "OWN_COST",
        procurementEligible: false,
        normativeSource: { sourceKey: "krer_06", locator: "таблица 06-01-001" },
      },
      {
        rowId: "ready_mix_delivery",
        group: "delivery",
        titleRu: "Доставка бетонной смеси автобетоносмесителем",
        unitId: "m3_km",
        formulaId: "delivery_quantity",
        semanticOwnerId: "delivery:ready-mix",
        costOwnerId: "cost:delivery-ready-mix",
        resourceIdentity: "delivery-ready-mix",
        provenanceKind: "EXPLICIT_CARGO_DELIVERY",
        generationAxes: [],
        costingMode: "OWN_COST",
        procurementEligible: true,
        normativeSource: { sourceKey: "route", locator: "маршрут РБУ — объект" },
        delivery: {
          cargoRu: "бетонная смесь",
          vehicleRu: "автобетоносмеситель",
          physicalQuantityFormulaId: "concrete_quantity",
          distanceParameterId: "distance_km",
        },
      },
    ],
    capabilityMatrix: [
      { group: "material", status: "INCLUDED", reasonRu: "Бетон остаётся в конструкции." },
      { group: "construction_work", status: "INCLUDED", reasonRu: "Смесь необходимо уложить." },
      { group: "machine_equipment", status: "NOT_APPLICABLE", reasonRu: "Способ подачи в этом примере не выбран." },
      { group: "delivery", status: "INCLUDED", reasonRu: "Товарный бетон доставляется с РБУ." },
    ],
  };
}

describe("estimate content passport R3", () => {
  it("accepts a technological estimate without forcing all four groups to be non-empty", () => {
    const decision = evaluateEstimateContentPassportR3(validPassport());
    expect(decision).toMatchObject({
      allowed: true,
      status: "GREEN",
      metrics: { genericCartesianRows: 0, rawInternalUnitRows: 0 },
    });
    expect(decision.metrics.groups.machine_equipment).toBe(0);
  });

  it("rejects alias and QA terms multiplied into visible estimate rows", () => {
    const fixture = validPassport();
    const bad = {
      ...fixture,
      resources: [{
        ...fixture.resources[0],
        rowId: "alias_control",
        titleRu: "Контроль поставки состава",
        unitId: "worker_h",
        provenanceKind: "SEARCH_ALIAS" as const,
        generationAxes: ["alias", "qa_term"],
      }],
    };
    const decision = evaluateEstimateContentPassportR3(bad);
    expect(decision.allowed).toBe(false);
    expect(decision.errors).toEqual(expect.arrayContaining([
      "GENERIC_CARTESIAN_RESOURCE:alias_control",
      "RAW_INTERNAL_RESOURCE_UNIT:alias_control:worker_h",
    ]));
  });

  it("rejects a delivery row without cargo, vehicle and distance", () => {
    const fixture = validPassport();
    const delivery = fixture.resources.find((row) => row.group === "delivery")!;
    const decision = evaluateEstimateContentPassportR3({
      ...fixture,
      resources: fixture.resources.map((row) => row === delivery ? { ...row, delivery: undefined } : row),
    });
    expect(decision.errors).toContain("DELIVERY_FLOW_INCOMPLETE:ready_mix_delivery");
  });

  it("keeps an alias search-only and never gives it BOQ rows", () => {
    const fixture = validPassport();
    const decision = evaluateEstimateContentPassportR3({
      ...fixture,
      identityMode: "ALIAS_ONLY",
      parameters: [],
      formulas: [],
      resources: [],
      capabilityMatrix: fixture.capabilityMatrix.map((capability) => ({
        ...capability,
        status: "NOT_APPLICABLE" as const,
        reasonRu: "Поисковый alias не является отдельной работой.",
      })),
    });
    expect(decision.allowed).toBe(true);
  });
});
