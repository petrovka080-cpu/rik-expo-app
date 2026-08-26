import {
  TECHNOLOGY_PASSPORT_R1_CONTRACT,
  evaluateTechnologyPassportR1,
  evaluateTechnologyPassportRuntimeTruthR1,
  technologyPassportR1Sha256,
  type TechnologyPassportR1,
  type TechnologyPassportRuntimeProjectionR1,
} from "./technologyPassportR1";

const SOURCE_SHA = "1".repeat(64);
const REVIEW_SHA = "2".repeat(64);
const DEFINITION_SHA = "3".repeat(64);
const ROWS_SHA = "4".repeat(64);
const EXCLUSION_SHA = "5".repeat(64);

function passport(): TechnologyPassportR1 {
  return {
    contract: TECHNOLOGY_PASSPORT_R1_CONTRACT,
    catalogId: "concrete:wall",
    technologyVariantId: "cast-in-place-reinforced-concrete",
    publicWorkTitleRu: "Устройство монолитной железобетонной стены",
    resultUnitId: "m3",
    provenance: {
      expectationBasis: "INDEPENDENT_ENGINEERING_EVIDENCE",
      runtimeRowsUsedAsExpectation: false,
      evidence: [{
        evidenceId: "engineering-pack",
        sourceKind: "ENGINEERING_SOURCE_PACK",
        title: "Инженерный состав монолитной стены",
        locator: "раздел 4, таблица 2",
        contentSha256: SOURCE_SHA,
      }],
      authorRole: "ENGINEER",
      review: {
        status: "ENGINEER_ACCEPTED",
        reviewerId: "engineer:test-reviewer",
        reviewedAt: "2026-08-21T10:00:00.000Z",
        reviewEvidenceSha256: REVIEW_SHA,
      },
    },
    applicabilityRu: ["Монолитная стена с проектным армированием и щитовой опалубкой."],
    exclusions: [{
      exclusionId: "exclude-pump",
      expectationId: "expect-pump",
      conditionExpression: "concrete_pump_required == false",
      reasonRu: "Бетононасос исключён при подтверждённой прямой подаче смеси.",
      sourceIds: ["norm"],
    }],
    userInputs: [
      {
        parameterId: "concrete_volume_m3",
        titleRu: "Объём бетона",
        guideRu: "Укажите проектный объём бетона в готовой конструкции.",
        unitId: "m3",
        required: true,
        acceptedDefault: null,
        defaultProvenanceId: null,
        formulaConsumerIds: ["concrete-gross"],
        expectationConsumerIds: ["expect-concrete"],
      },
      {
        parameterId: "delivery_distance_km",
        titleRu: "Расстояние доставки",
        guideRu: "Укажите длину маршрута от бетонного узла до объекта.",
        unitId: "km",
        required: true,
        acceptedDefault: null,
        defaultProvenanceId: null,
        formulaConsumerIds: ["delivery"],
        expectationConsumerIds: ["expect-delivery"],
      },
    ],
    acceptedPreliminaryAssumptions: [],
    stages: [{ stageId: "concrete", sequence: 1, titleRu: "Бетонирование", resultRu: "Уложенная бетонная смесь" }],
    capabilities: [
      { group: "material", status: "REQUIRED", reasonRu: "Бетон остаётся в конструкции.", normSourceIds: ["norm"] },
      { group: "construction_work", status: "REQUIRED", reasonRu: "Смесь требуется уложить.", normSourceIds: ["norm"] },
      { group: "machine_equipment", status: "CONDITIONAL", reasonRu: "Способ подачи зависит от объекта.", normSourceIds: ["norm"] },
      { group: "delivery", status: "REQUIRED", reasonRu: "Смесь доставляется с бетонного узла.", normSourceIds: ["norm"] },
      { group: "waste", status: "NOT_APPLICABLE", reasonRu: "Отдельный вывоз смеси не предусматривается.", normSourceIds: ["norm"] },
    ],
    requiredMaterialFamilies: [{
      expectationId: "expect-concrete",
      familyId: "ready-mix-concrete",
      stageId: "concrete",
      titleRu: "Бетонная смесь проектного класса",
      purposeRu: "Формирование тела монолитной стены.",
      specificationRequirementRu: "Класс прочности, морозостойкость и водонепроницаемость по проекту.",
      formulaId: "concrete-gross",
      normSourceIds: ["norm"],
      inclusionCondition: "always",
      procurementRuleId: "procure-concrete",
    }],
    conditionalMaterialFamilies: [],
    constructionOperations: [{
      expectationId: "expect-place-concrete",
      operationId: "place-concrete",
      stageId: "concrete",
      titleRu: "Укладка и уплотнение бетонной смеси",
      purposeRu: "Получение плотного проектного тела стены.",
      formulaId: "concrete-gross",
      normSourceIds: ["norm"],
      inclusionCondition: "always",
      required: true,
    }],
    equipmentRules: [{
      expectationId: "expect-pump",
      equipmentRuleId: "concrete-pump",
      stageId: "concrete",
      titleRu: "Подача смеси автобетононасосом",
      purposeRu: "Подача смеси к месту укладки при отсутствии прямого подъезда.",
      formulaId: "concrete-gross",
      normSourceIds: ["norm"],
      inclusionCondition: "concrete_pump_required == true",
      equipmentClassRu: "Автобетононасос",
      keyCharacteristicsRu: ["Вылет стрелы 28 м, производительность 36 м³/ч."],
      operationId: "place-concrete",
      mutuallyExclusiveGroupId: "concrete-placement-method",
    }],
    deliveryFlows: [{
      expectationId: "expect-delivery",
      deliveryFlowId: "deliver-ready-mix",
      stageId: "concrete",
      titleRu: "Доставка бетонной смеси автобетоносмесителем",
      purposeRu: "Перевозка готовой смеси от бетонного узла до объекта.",
      formulaId: "delivery",
      normSourceIds: ["norm"],
      inclusionCondition: "always",
      cargoFamilyIds: ["ready-mix-concrete"],
      vehicleTypeRu: "Автобетоносмеситель",
      capacityRequirementRu: "Вместимость барабана по объёму партии.",
      distanceParameterId: "delivery_distance_km",
      deduplicationKey: "ready-mix:batch-plant-to-site",
    }],
    wasteFlows: [],
    quantityFormulas: [
      {
        formulaId: "concrete-gross",
        expressionSource: "concrete_volume_m3 * (1 + loss_percent / 100)",
        inputParameterIds: ["concrete_volume_m3"],
        outputUnitId: "m3",
        roundingRule: "0.01 m3",
        lossRule: "Только принятый технологический запас.",
        normSourceIds: ["norm"],
      },
      {
        formulaId: "delivery",
        expressionSource: "concrete_volume_m3 * delivery_distance_km",
        inputParameterIds: ["concrete_volume_m3", "delivery_distance_km"],
        outputUnitId: "m3_km",
        roundingRule: "0.01 m3·km",
        lossRule: "Потери не применяются к транспортной работе.",
        normSourceIds: ["norm"],
      },
    ],
    normSources: [{
      sourceId: "norm",
      evidenceId: "engineering-pack",
      title: "Инженерный состав монолитной стены",
      editionOrVersion: "R1",
      locator: "раздел 4, таблица 2",
      applicabilityRu: "Монолитные железобетонные стены.",
    }],
    procurementRules: [{
      procurementRuleId: "procure-concrete",
      familyId: "ready-mix-concrete",
      procurementEligible: true,
      packageUnitRu: "партия автобетоносмесителя",
      packageSizeFormula: "по согласованному объёму рейса",
      roundingRule: "Округление до доступного объёма партии без двойного запаса.",
      sourceIds: ["norm"],
    }],
    incompatibleVariants: [{
      variantId: "precast-wall-panel",
      reasonRu: "Сборная панель является другой технологией устройства стены.",
      sourceIds: ["norm"],
    }],
  };
}

function runtime(expected: TechnologyPassportR1): TechnologyPassportRuntimeProjectionR1 {
  return {
    catalogId: expected.catalogId,
    technologyVariantId: expected.technologyVariantId,
    resultUnitId: expected.resultUnitId,
    technologyPassportSha256: technologyPassportR1Sha256(expected),
    runtimeDefinitionSha256: DEFINITION_SHA,
    runtimeRowsSha256: ROWS_SHA,
    sourceIdentity: "test-source/test-tree/test-release",
    parameterIds: ["concrete_volume_m3", "delivery_distance_km"],
    materialRows: [{
      rowId: "ready-mix",
      familyId: "ready-mix-concrete",
      titleRu: "Бетонная смесь класса B25, F150, W6",
      specificationRu: "Класс прочности B25, морозостойкость F150, водонепроницаемость W6.",
      purposeRu: "Формирование тела монолитной железобетонной стены.",
      stageId: "concrete",
      unitId: "m3",
      formulaId: "concrete-gross",
      semanticOwnerId: "material:ready-mix",
      costOwnerId: "cost:ready-mix",
      normSourceIds: ["norm"],
      netQuantity: "10",
      grossQuantity: "10.2",
      lossPercent: "2",
      procurementRuleId: "procure-concrete",
      procurementEligible: true,
      package: {
        titleRu: "партия автобетоносмесителя",
        size: "6",
        unitId: "m3",
        procurementQuantity: "2",
      },
    }],
    constructionOperationRows: [{
      rowId: "place-concrete",
      operationId: "place-concrete",
      titleRu: "Укладка и уплотнение бетонной смеси в опалубке",
      purposeRu: "Получение плотного проектного тела стены.",
      stageId: "concrete",
      unitId: "m3",
      formulaId: "concrete-gross",
      semanticOwnerId: "operation:place-concrete",
      costOwnerId: "cost:place-concrete",
      normSourceIds: ["norm"],
    }],
    equipmentRows: [],
    deliveryRows: [{
      rowId: "deliver-ready-mix",
      deliveryFlowId: "deliver-ready-mix",
      titleRu: "Доставка бетонной смеси автобетоносмесителем 6 м³",
      stageId: "concrete",
      unitId: "m3_km",
      formulaId: "delivery",
      semanticOwnerId: "delivery:ready-mix",
      costOwnerId: "cost:delivery-ready-mix",
      normSourceIds: ["norm"],
      cargoFamilyIds: ["ready-mix-concrete"],
      vehicleTypeRu: "Автобетоносмеситель",
      capacityRequirementRu: "Вместимость барабана 6 м³.",
      distanceParameterId: "delivery_distance_km",
      deduplicationKey: "ready-mix:batch-plant-to-site",
    }],
    wasteRows: [],
    formulaIds: ["concrete-gross", "delivery"],
    procurementRuleIds: ["procure-concrete"],
    includedVariantIds: ["cast-in-place-reinforced-concrete"],
    exclusionProofs: [{
      expectationId: "expect-pump",
      exclusionId: "exclude-pump",
      conditionExpression: "concrete_pump_required == false",
      conditionProven: true,
      evidenceSha256: EXCLUSION_SHA,
    }],
  };
}

describe("TechnologyPassportR1", () => {
  it("accepts an independently reviewed passport bound to a complete runtime projection", () => {
    const expected = passport();
    const decision = evaluateTechnologyPassportRuntimeTruthR1(expected, runtime(expected));
    expect(decision).toMatchObject({ allowed: true, status: "GREEN", errors: [] });
  });

  it("rejects a passport whose expected composition reuses runtime rows", () => {
    const expected = passport();
    const unsafe = {
      ...expected,
      provenance: {
        ...expected.provenance,
        runtimeRowsUsedAsExpectation: true,
        evidence: [{ ...expected.provenance.evidence[0], contentSha256: ROWS_SHA }],
      },
    } as unknown as TechnologyPassportR1;
    const decision = evaluateTechnologyPassportR1(unsafe, [DEFINITION_SHA, ROWS_SHA]);
    expect(decision.allowed).toBe(false);
    expect(decision.errors).toEqual(expect.arrayContaining([
      "RUNTIME_ROWS_USED_AS_EXPECTATION",
      "EVIDENCE_REUSES_RUNTIME_SOURCE:engineering-pack",
    ]));
  });

  it("fails closed when a required material family is absent", () => {
    const expected = passport();
    const actual = { ...runtime(expected), materialRows: [] };
    const decision = evaluateTechnologyPassportRuntimeTruthR1(expected, actual);
    expect(decision.errors).toContain("REQUIRED_MATERIAL_FAMILY_MISSING:ready-mix-concrete");
  });

  it("requires a proven exact condition for a conditional exclusion", () => {
    const expected = passport();
    const actual = runtime(expected);
    const invalid = {
      ...actual,
      exclusionProofs: actual.exclusionProofs.map((proof) => ({ ...proof, conditionProven: false })),
    };
    expect(evaluateTechnologyPassportRuntimeTruthR1(expected, invalid).errors)
      .toContain("EQUIPMENT_RULE_UNRESOLVED:expect-pump");
  });

  it("does not treat a draft review as content GREEN", () => {
    const expected = passport();
    const draft = {
      ...expected,
      provenance: {
        ...expected.provenance,
        review: { ...expected.provenance.review, status: "DRAFT" as const },
      },
    };
    expect(evaluateTechnologyPassportR1(draft, [DEFINITION_SHA, ROWS_SHA]).errors)
      .toContain("ENGINEER_ACCEPTANCE_MISSING");
  });

  it("rejects generic equipment even when its rule identity is correct", () => {
    const expected = passport();
    const actual = runtime(expected);
    const unsafe = {
      ...actual,
      equipmentRows: [{
        rowId: "pump",
        equipmentRuleId: "concrete-pump",
        titleRu: "Оборудование доступа",
        stageId: "concrete",
        unitId: "shift",
        formulaId: "concrete-gross",
        semanticOwnerId: "equipment:pump",
        costOwnerId: "cost:pump",
        normSourceIds: ["norm"],
        equipmentClassRu: "Механизм",
        keyCharacteristicsRu: ["По проектному ППР"],
        operationId: "place-concrete",
        inclusionCondition: "concrete_pump_required == true",
      }],
      exclusionProofs: [],
    };
    const decision = evaluateTechnologyPassportRuntimeTruthR1(expected, unsafe);
    expect(decision.errors).toEqual(expect.arrayContaining([
      "RUNTIME_GENERIC_EQUIPMENT:pump",
      "RUNTIME_EQUIPMENT_NUMERIC_CHARACTERISTIC_MISSING:pump",
    ]));
  });
});
