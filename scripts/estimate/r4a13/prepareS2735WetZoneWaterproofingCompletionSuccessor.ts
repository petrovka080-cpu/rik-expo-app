import { resolve } from "node:path";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { compileWetZoneWaterproofingCompletionS2735 as compile,
  WET_ZONE_COMPLETION_ACCEPTANCE_INPUT_S2735 as fixture,
  WET_ZONE_COMPLETION_DEFINITION_S2735 as definition,
  WET_ZONE_COMPLETION_ROWS_S2735 as ids,
  WET_ZONE_COMPLETION_CATALOG_ID_S2735 as catalogId,
  WET_ZONE_COMPLETION_SOURCE_ID_S2735 as sourceId,
  WET_ZONE_COMPLETION_NORM_ID_S2735 as normId,
  WET_ZONE_COMPLETION_SOURCE_METADATA_S2735 as sourceMetadata } from "../../../src/lib/estimate/v4/wetZoneWaterproofingCompletionS2735";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

async function verifyCore() {
  const first = await compile({ area_m2: 25 }), full = await compile({ ...fixture });
  assert.equal(first.rows.length, 1); assert.equal(first.preliminaryNeeds.length, 21);
  assert.equal(first.rows[0]!.quantity, "25"); assert.equal(full.preliminaryNeeds.length, 0);
  const membrane = full.rows.find(row => row.row_id === ids.membrane)!;
  assert.equal(membrane.quantity, "35");
  assert.deepEqual((membrane.calculation_trace as Record<string, unknown>).purchaseBalance, {
    ownerRowId: ids.membrane, unitId: "kg", consumed: "32.5", stock: "0", reserve: "0", quantum: "5",
    quantityMode: "supply_quantum", effectiveOrder: "35", remaining: "2.5", freeBeyondReserve: "2.5",
    consumptionShortage: "0", reserveDeficit: "0", procurementReady: true,
  });
  const changed = await compile({ ...fixture, area_m2: 50, cl51_stock: 12, cl51_reserve: 3, selected_bucket_size_kg: "15" });
  assert.equal(changed.rows.find(row => row.row_id === ids.membrane)!.quantity, "60");
  for (const id of ["under_ceramic_covering", "wet_zone_type", "substrate_type", "method_reference", "payment_scope_reference", "regional_tds_conditions_confirmed"]) {
    const input: Record<string, unknown> = { ...fixture }; delete input[id];
    assert((await compile(input)).preliminaryNeeds.some(need => need.row_id === ids.membrane && need.missing_parameter_ids.includes(id)));
  }
  return { status: "GREEN_S2735_WET_ZONE_CORE", firstKnownRows: 1, firstNeeds: 21, fixtureRows: full.rows.length,
    fixtureConsumptionKg: "32.5", fixtureOrderKg: "35", fixtureRemainingKg: "2.5", changedOrderKg: "60",
    fixtureIsNotRuntimeProfile: true, ordinaryUiAccepted: false, engineeringAccepted: false,
    reusedRowIds: Object.values(ids).filter(id => id.includes(":ceresit-cl51-v1:")),
    sha256: createHash("sha256").update(JSON.stringify({ first, full, changed })).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-35.wet-zone-waterproofing-completion.v1", stopCode: "S2735_WET_ZONE_COMPLETION",
  applicationName: "s2735-wet-zone-completion", expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (75).md",
  masterSha256: "bd9241644e6fd958e77a775f24ae7043ad33a1e67e72f0b4b0983da0fd57b230",
  parentReleaseId: "8d77a819-3a98-56be-a717-309ab85b3599", parentSearchReleaseId: "ab602ecf-a269-5e7e-987c-cb280041d916",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-35/wet-zone-source-reference-successor"),
  sourcePaths: ["src/lib/estimate/v4/wetZoneWaterproofingCompletionS2735.ts",
    "data/estimate-benchmarks/source-packs/wet-zone-cl51-completion-s27-35.json",
    "tests/estimateNorms/wetZoneWaterproofingCompletionS2735.contract.test.ts",
    "scripts/estimate/r4a13/prepareS2735WetZoneWaterproofingCompletionSuccessor.ts",
    "src/lib/estimate/v4/domains/interiorFinishesComplete/waterproofingCeresitCl51ProfessionalV1.ts",
    "src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1.ts",
    "src/lib/estimate/v4/automaticConstructionOwnerR1.ts", "src/lib/estimate/v4/effectivePurchaseBalanceR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts", "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts"],
  catalogId, sourceId, normId, sourceMetadata,
  parameterDefinitions: definition.parameters, formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources,
  shortInput: { area_m2: 25 }, acceptanceInput: { ...fixture, ...definition.runtimeInput },
  runtimeProfileInput: definition.runtimeInput, runtimeProfileClassification: definition.runtimeClassification,
  runtimeProfileSourceIds: definition.runtimeSourceIds, verifyCore, expectedParentShape: [50, 22, 22],
  benchmarkOrdinal: 120, validationScenario: "S2735_WET_ZONE_CL51_MATERIALS_LABOR_EQUIPMENT",
  passport: { canonicalRuName: "Двухслойная гидроизоляция мокрой зоны CL 51 под плитку", workKey: "tile_stone_interior_ceramic_tile_waterproof_wet_zone",
    physicalResultRu: "Принятое основание загрунтовано по выбранной технологии; примыкания и проходки герметизированы; два слоя CL 51 с контролем сухой толщины переданы под облицовку",
    includedScopeRu: ["подготовка и выбранное грунтование CT 17", "лента с углами и нахлёстами и манжеты по отдельной ведомости",
      "CL 51: общий расход на два слоя и округление закупки по выбранной фасовке", "поштучные расходники, труд, выбранное обеспыливающее оборудование и доставка",
      "контроль и документация включены в труд нанесения"],
    excludedScopeRu: ["укладка плитки, плиточный клей, затирка и герметизация наружных швов облицовки", "выравнивание и ремонт неподготовленного основания",
      "бассейны, постоянная вода, наружные зоны и неподтверждённая применимость", "универсальная выработка, утверждение проекта и цены без источника"] },
  applicability: { country: "KG", primaryMeasureParameterId: "area_m2", knownScopeParameters: ["area_m2"],
    ordinaryUserInputCount: 1, explicitApplicabilityFactsRequired: true, localUnknownFactsRemainPreliminary: true,
    oneTwoCoatMembranePurchaseOwner: true, countedConsumablesInsteadOfGenericKits: true,
    universalProductivityClaimed: false, ordinaryUiAccepted: false, engineeringAccepted: false },
  binding: { rowId: ids.membrane, applicability: { technology_class: "CERESIT_CL51_INDOOR_WET_ZONE_TWO_COATS",
    operation_class: "WATERPROOFING_UNDER_CERAMIC_COVERING", source_id: sourceId, norm_id: normId,
    exact_locator: sourceMetadata.exact_locator, quantity_basis: "CL51_MANUFACTURER_MINIMUM_PLUS_EXPLICIT_PROJECT_FACTS",
    universal_productivity_claimed: false, universal_priming_consumption_claimed: false } },
  locator: { key: "wet-zone-cl51-completion-s27-35-v2-page2", payload: { kind: "MANUFACTURER_TDS_WITH_EXPLICIT_PROJECT_FACTS",
    sourcePackSha256: sourceMetadata.artifact_sha256, exactLocator: sourceMetadata.exact_locator,
    ordinaryKnownInputs: ["area_m2"], visibleProfileInputs: Object.keys(definition.runtimeInput),
    fixtureValuesNeverRuntimeDefaults: true, operationReuse: true } },
  search: { primaryUom: "m2", canonicalNameRu: "Двухслойная гидроизоляция мокрой зоны CL 51 под плитку",
    aliases: ["гидроизоляция санузла CL51", "гидроизоляция ванной под плитку", "обмазочная гидроизоляция мокрой зоны"],
    shortScopeRu: "Подготовка, выбранная грунтовка, лента и манжеты, два слоя CL 51, поштучные расходники, труд и оснащение по явным условиям объекта.",
    keyDistinguishingParameters: ["area_m2", "wet_zone_type", "substrate_type", "primer_mode"],
    clarificationFields: ["wet_zone_type", "substrate_type", "primer_mode", "selected_bucket_size_kg"],
    includedBoundaries: ["подготовка, грунтование, герметизация примыканий и проходок, CL51", "расходники, труд, оснащение, контроль и доставка"],
    excludedBoundaries: ["плитка и затирка", "выравнивание основания", "наружные зоны и бассейны"],
    extraSearchTermsRu: "санузел ванная мокрая зона гидроизоляция CL51 CT17 лента манжета два слоя",
    sourceProvenance: { existingProfessionalOperationReused: true, manufacturerRateOnlyForExactProduct: true,
      projectFactsRemainExplicit: true, controlsNotSeparatelyPaid: true } },
  forbiddenAdjacentMatchers: [/cm17|плиточный клей|затирка|rc09:porcelain/iu],
  owner: "S2735_WET_ZONE_CL51_COMPLETION", receiptFileStem: "wet_zone_cl51_completion",
}).catch(error => { process.stderr.write(String(error.stack ?? error) + "\n"); process.exitCode = 1; });
