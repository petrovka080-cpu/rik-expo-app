export type IndependentIdentity = Readonly<{
  catalog_id: string;
  source_domain_id: string;
  title_ru?: string;
}>;

export type IndependentTargetRow = Readonly<{
  row_id?: string;
  semantic_owner: string;
  category?: string;
  unit_id?: string;
  title_ru?: string;
}>;

export type IndependentObligation = Readonly<{
  id: string;
  expectedStage: string;
  expectedResourceCategory: string;
  expectedSemanticSignature: string;
  basis: string;
  matches: (row: IndependentTargetRow) => boolean;
}>;

export type IndependentIdentityFacts = Readonly<{
  catalogId: string;
  sourceFamily: string;
  titleRu: string;
  operation: string;
  systemType: string;
  complexityClass: string;
}>;

const EXPANDED_KIND: Readonly<Record<string, string>> = Object.freeze({
  aeration_tanks: "TREATMENT",
  booster_pumping_station: "PUMP",
  borehole_water_supply: "STORAGE",
  chlorination_station: "TREATMENT",
  distribution_pipeline: "EXTERNAL_PRESSURE",
  drainage_channel: "DRAINAGE",
  drainage_prism: "DRAINAGE",
  filtration_station: "TREATMENT",
  flushing_disinfection: "TESTING",
  gravity_sewer_collector: "EXTERNAL_GRAVITY",
  house_connection_water: "EXTERNAL_PRESSURE",
  inspection_chambers: "CHAMBER",
  inspection_wells: "CHAMBER",
  manholes: "CHAMBER",
  outfall_structure: "EXTERNAL_GRAVITY",
  pressure_pipeline: "EXTERNAL_PRESSURE",
  pressure_sewer_pipeline: "EXTERNAL_PRESSURE",
  pressure_testing_disinfection: "TESTING",
  pumping_station: "PUMP",
  rainwater_inlets: "CHAMBER",
  reservoir_clean_water: "STORAGE",
  septic_treatment_facility: "TREATMENT",
  settlement_water_network: "EXTERNAL_PRESSURE",
  sewage_treatment_tanks: "TREATMENT",
  sewer_pumping_station: "PUMP",
  site_sewer_connection: "EXTERNAL_GRAVITY",
  site_water_connection: "EXTERNAL_PRESSURE",
  sludge_dewatering: "TREATMENT",
  stormwater_drainage: "EXTERNAL_GRAVITY",
  valves_chambers: "CHAMBER",
  village_sewer_network: "EXTERNAL_GRAVITY",
  village_water_supply: "EXTERNAL_PRESSURE",
  wastewater_treatment_plant: "TREATMENT",
  water_intake: "STORAGE",
  water_meter_chambers: "CHAMBER",
  water_reservoir: "STORAGE",
  water_tower: "STORAGE",
  water_treatment_plant: "TREATMENT",
  well_construction: "STORAGE",
});

const FIXTURE_WORDS = /_(bath|bidet|basin|faucet|fixture|mixer|shower|sink|toilet|urinal|washbasin|wc)_/;

export function operationFromIdentity(catalogId: string): string {
  const expanded = ["as_built_estimate", "detailed_boq_from_drawings", "preliminary_boq", "rom_concept", "tender_boq"]
    .find((value) => catalogId.includes(`_${value}_expanded_complex_v1`));
  if (expanded) return expanded.toUpperCase();
  return ["pressure_test", "connect", "install", "prepare", "repair", "replace", "route", "seal"]
    .find((value) => catalogId.includes(`_${value}_`))?.toUpperCase() ?? "UNRESOLVED";
}

export function systemTypeFromIdentity(identity: IndependentIdentity): string {
  const source = String(identity.source_domain_id);
  if (source.startsWith("expanded:")) {
    const family = source.slice("expanded:".length);
    const kind = EXPANDED_KIND[family];
    if (!kind) throw new Error(`INDEPENDENT_KIND_UNRESOLVED:${identity.catalog_id}:${family}`);
    return kind;
  }
  const id = `_${String(identity.catalog_id).toLowerCase()}_`;
  if (/_sewer_|_drain_|_wastewater_/.test(id)) return "INTERNAL_GRAVITY";
  if (/_pipe_|_pipeline_|_riser_|_water_line_/.test(id)) return "INTERNAL_PRESSURE";
  if (FIXTURE_WORDS.test(id)) return "FIXTURE";
  // PUMP is the frozen backend superclass for internal packaged equipment.
  // Physical commissioning applicability is decided below by operation, not by
  // treating every member of this superclass as a literal pump.
  return "PUMP";
}

export function complexityFromIdentity(catalogId: string, systemType: string): string {
  const operation = operationFromIdentity(catalogId);
  if (catalogId.startsWith("expanded-template:")) {
    if (systemType === "TREATMENT") return operation === "ROM_CONCEPT" ? "L4" : "L5";
    if (["PUMP", "STORAGE"].includes(systemType)) return ["DETAILED_BOQ_FROM_DRAWINGS", "AS_BUILT_ESTIMATE"].includes(operation) ? "L5" : "L4";
    return ["DETAILED_BOQ_FROM_DRAWINGS", "AS_BUILT_ESTIMATE"].includes(operation) ? "L4" : "L3";
  }
  if (["CONNECT", "PREPARE", "PRESSURE_TEST", "SEAL"].includes(operation)) return "L1";
  if (/(?:_boiler_|_collector_|_filter_|_installation_|_meter_|_pump_)/.test(catalogId)
    && ["INSTALL", "REPAIR", "REPLACE"].includes(operation)) return "L3";
  return "L2";
}

export function identityFacts(identity: IndependentIdentity): IndependentIdentityFacts {
  const systemType = systemTypeFromIdentity(identity);
  return {
    catalogId: identity.catalog_id,
    sourceFamily: identity.source_domain_id,
    titleRu: String(identity.title_ru ?? ""),
    operation: operationFromIdentity(identity.catalog_id),
    systemType,
    complexityClass: complexityFromIdentity(identity.catalog_id, systemType),
  };
}

function waterOwner(row: IndependentTargetRow): boolean {
  return row.semantic_owner.startsWith("water:");
}

function documentSignature(row: IndependentTargetRow): boolean {
  if (!waterOwner(row)) return false;
  const owner = row.semantic_owner;
  const category = String(row.category ?? "");
  const unit = String(row.unit_id ?? "");
  const title = String(row.title_ru ?? "");
  const protocol = /:(?:protocol|test_protocol|process_protocol|interface_protocol)$/.test(owner)
    && category === "protocol" && unit === "set" && /^Протокол(?:\b|:)/u.test(title);
  const passport = /:passport$/.test(owner) && category === "passport" && unit === "set";
  const record = /:(?:record|joint_record|interface_record|demolition_record)$/.test(owner)
    && category === "record" && unit === "set";
  const document = /:document$/.test(owner) && category === "document" && unit === "set";
  const asBuilt = /:as_built_trace$/.test(owner) && category === "as_built_trace" && unit === "set";
  return protocol || passport || record || document || asBuilt;
}

function standaloneEquipmentIndividualTest(row: IndependentTargetRow): boolean {
  return row.semantic_owner === "water:equipment_individual_test:test_service"
    && row.category === "testing"
    && row.unit_id === "test"
    && /^Выполнение: Индивидуальное испытание/u.test(String(row.title_ru ?? ""));
}

function componentEquipmentIndividualTest(row: IndependentTargetRow): boolean {
  return waterOwner(row)
    && /:[^:]+:individual_test$/.test(row.semantic_owner)
    && row.category === "individual_test"
    && row.unit_id === "test"
    && /^Индивидуальное испытание/u.test(String(row.title_ru ?? ""));
}

function obligation(
  id: string,
  expectedStage: string,
  expectedResourceCategory: string,
  expectedSemanticSignature: string,
  basis: string,
  matches: (row: IndependentTargetRow) => boolean,
): IndependentObligation {
  return { id, expectedStage, expectedResourceCategory, expectedSemanticSignature, basis, matches };
}

const COMMON: readonly IndependentObligation[] = Object.freeze([
  obligation("water-owner", "ALL", "backend-owner", "semantic_owner starts water:", "backend Water semantic owner", waterOwner),
  obligation("physical-material", "SUPPLY_OR_PROCESS", "material-or-equipment", "supply/process_material/test_consumable", "physical material or equipment obligation", (row) => /:supply(?:_|$)|:process_material$|:test_consumable$/.test(row.semantic_owner)),
  obligation("direct-labor", "EXECUTION", "labour", "install/joint/process/test/dismantling labour", "direct labor obligation", (row) => /:(?:install_labor|joint_labor|process_labor|test_labor|dismantling_labor|logistics_handling)$/.test(row.semantic_owner)),
  obligation("construction-equipment", "EXECUTION", "plant-machines-tools", "installation/joint/lifting/process/test machine", "machine or test-equipment obligation", (row) => /:(?:installation_machine|joint_tool|lifting|process_equipment|test_equipment|dismantling_machine)$/.test(row.semantic_owner)),
  obligation("logistics", "LOGISTICS", "logistics", "delivery/handling/logistics/waste haul", "delivery and handling obligation", (row) => /:(?:delivery|handling|logistics_service|waste_haul)$/.test(row.semantic_owner)),
  obligation("documentation", "DOCUMENTATION", "documents-as-built", "typed Water document action + matching category/unit/title", "passport, protocol or exact execution record", documentSignature),
]);

const TYPED_CHILD = obligation("typed-child-boundary", "OWNER_INTERFACE", "owner-interface", "semantic_owner starts typed-child:", "civil/earthworks owner boundary", (row) => row.semantic_owner.startsWith("typed-child:"));

export function obligationsForIdentity(identity: IndependentIdentity): readonly IndependentObligation[] {
  const facts = identityFacts(identity);
  const result: IndependentObligation[] = [...COMMON];
  if (["EXTERNAL_PRESSURE", "EXTERNAL_GRAVITY", "DRAINAGE", "CHAMBER", "STORAGE"].includes(facts.systemType)) result.push(TYPED_CHILD);
  if (facts.systemType === "TREATMENT") {
    result.push(obligation("process-operation", "PROCESS", "process", "process scope/material/labour/control/equipment/protocol/waste", "treatment process obligation", (row) => /:process_(?:scope|material|labor|control|equipment|protocol|waste)$/.test(row.semantic_owner)));
  }
  if (facts.systemType === "TESTING") {
    result.push(obligation("test-service", "TESTING", "tests-commissioning", "test_service", "testing identity", (row) => /:test_service$/.test(row.semantic_owner)));
  }
  if (facts.systemType === "PUMP" && !["PREPARE", "SEAL"].includes(facts.operation)) {
    const standalone = ["CONNECT", "ROUTE"].includes(facts.operation);
    result.push(obligation(
      "individual-equipment-test",
      "TESTING_COMMISSIONING",
      "tests-commissioning",
      standalone
        ? "water:equipment_individual_test:test_service + category=testing + unit=test"
        : "water:<equipment-component>:individual_test + category=individual_test + unit=test",
      standalone
        ? `${facts.operation} closes the routed/connected packaged-equipment boundary with an individually recorded test package`
        : `${facts.operation} installs, repairs or replaces packaged equipment and therefore requires its individual test`,
      standalone ? standaloneEquipmentIndividualTest : componentEquipmentIndividualTest,
    ));
  }
  if (facts.complexityClass !== "L1" && facts.operation !== "ROM_CONCEPT") {
    result.push(obligation("actual-waste-route", "WASTE", "waste-disposal", "explicit non-percentage waste row", "physical installation/detail maturity produces explicit non-percentage waste route", (row) => /:.*waste$/.test(row.semantic_owner)));
  }
  if (!(facts.systemType === "DRAINAGE" && facts.operation === "ROM_CONCEPT")) {
    result.push(obligation("quality-test", "QUALITY", "tests-commissioning", "inspection/test/alignment/process control", "quality-control or testing obligation", (row) => /:(?:.*inspection|.*test|alignment|process_control)$/.test(row.semantic_owner)));
  }
  return result;
}

export function a1NegativeFixtures(): readonly Readonly<{
  fixtureId: string;
  matcher: "DOCUMENTATION" | "STANDALONE_INDIVIDUAL_TEST" | "COMPONENT_INDIVIDUAL_TEST";
  row: IndependentTargetRow;
  expected: boolean;
  reason: string;
}>[] {
  return Object.freeze([
    { fixtureId: "DOC_POSITIVE_TEST_PROTOCOL", matcher: "DOCUMENTATION", row: { semantic_owner: "water:connection_integrity_test:test_protocol", category: "protocol", unit_id: "set", title_ru: "Протокол: Проверка герметичности" }, expected: true, reason: "exact Water test protocol" },
    { fixtureId: "DOC_REJECT_WRONG_OWNER", matcher: "DOCUMENTATION", row: { semantic_owner: "electrical:connection_integrity_test:test_protocol", category: "protocol", unit_id: "set", title_ru: "Протокол: Проверка" }, expected: false, reason: "foreign semantic owner" },
    { fixtureId: "DOC_REJECT_SUFFIX_LOOKALIKE", matcher: "DOCUMENTATION", row: { semantic_owner: "water:connection_integrity_test:test_protocol_template", category: "protocol", unit_id: "set", title_ru: "Протокол: шаблон" }, expected: false, reason: "lookalike suffix is not an execution protocol" },
    { fixtureId: "DOC_REJECT_WRONG_CATEGORY", matcher: "DOCUMENTATION", row: { semantic_owner: "water:connection_integrity_test:test_protocol", category: "testing", unit_id: "set", title_ru: "Протокол: Проверка" }, expected: false, reason: "semantic action/category mismatch" },
    { fixtureId: "DOC_REJECT_WRONG_UNIT", matcher: "DOCUMENTATION", row: { semantic_owner: "water:connection_integrity_test:test_protocol", category: "protocol", unit_id: "test", title_ru: "Протокол: Проверка" }, expected: false, reason: "protocol is a set, not a test quantity" },
    { fixtureId: "INDIVIDUAL_POSITIVE_STANDALONE", matcher: "STANDALONE_INDIVIDUAL_TEST", row: { semantic_owner: "water:equipment_individual_test:test_service", category: "testing", unit_id: "test", title_ru: "Выполнение: Индивидуальное испытание агрегата" }, expected: true, reason: "exact standalone test service" },
    { fixtureId: "INDIVIDUAL_REJECT_INTEGRATED", matcher: "STANDALONE_INDIVIDUAL_TEST", row: { semantic_owner: "water:equipment_integrated_test:test_service", category: "testing", unit_id: "test", title_ru: "Выполнение: Комплексное испытание" }, expected: false, reason: "integrated test cannot satisfy individual test" },
    { fixtureId: "INDIVIDUAL_REJECT_PROTOCOL_CHILD", matcher: "STANDALONE_INDIVIDUAL_TEST", row: { semantic_owner: "water:equipment_individual_test:test_protocol", category: "protocol", unit_id: "set", title_ru: "Протокол: Индивидуальное испытание" }, expected: false, reason: "protocol alone cannot satisfy execution" },
    { fixtureId: "INDIVIDUAL_REJECT_WRONG_CATEGORY", matcher: "STANDALONE_INDIVIDUAL_TEST", row: { semantic_owner: "water:equipment_individual_test:test_service", category: "protocol", unit_id: "test", title_ru: "Выполнение: Индивидуальное испытание агрегата" }, expected: false, reason: "wrong structured category" },
    { fixtureId: "COMPONENT_REJECT_FUNCTIONAL_TEST", matcher: "COMPONENT_INDIVIDUAL_TEST", row: { semantic_owner: "water:duty_unit:functional_test", category: "individual_test", unit_id: "test", title_ru: "Индивидуальное испытание агрегата" }, expected: false, reason: "functional test action is not individual_test" },
  ]);
}

export function evaluateA1NegativeFixture(fixture: ReturnType<typeof a1NegativeFixtures>[number]): boolean {
  const actual = fixture.matcher === "DOCUMENTATION"
    ? documentSignature(fixture.row)
    : fixture.matcher === "STANDALONE_INDIVIDUAL_TEST"
      ? standaloneEquipmentIndividualTest(fixture.row)
      : componentEquipmentIndividualTest(fixture.row);
  return actual === fixture.expected;
}
