import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_FORMULAS,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_NORM_ID,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PARAMETERS,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_RESOURCES,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SHORT_INPUT,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA,
  type WoodenWindowWithoutSillBoardFillDemolitionKrer46VariantKey,
  compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1,
  resolveWoodenWindowWithoutSillBoardFillDemolitionKrer46Variant,
} from "../../../src/lib/estimate/v4/woodenWindowWithoutSillBoardOpeningFillDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const replaceExisting = process.argv.includes("--replace-existing");
if (replaceExisting && (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID)) {
  throw new Error("STOP_S273_F09_WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_02_CORRECTION_PARENT_REQUIRED");
}
const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_02_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as WoodenWindowWithoutSillBoardFillDemolitionKrer46VariantKey;
const variant = resolveWoodenWindowWithoutSillBoardFillDemolitionKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  wet_zone: "влажная зона",
}[variantKey];
const groupId = "wg:master:demolition_wooden_window_without_sill_board_opening_fill";
const groupNameRu = "Разборка деревянного оконного заполнения без подоконной доски";
const rowPrefix = "f09:wooden_window_without_sill_board_fill_demolition";
const profileParameterId =
  "existing_opening_fill_profile";
const confirmedParameterId =
  "existing_wooden_window_without_sill_board_confirmed";
const publicationMode = replaceExisting ? "correction" : "append";

async function verifyCore(): Promise<Json> {
  const short = await compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1(
    { ...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1(
    { ...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1(
    { opening_fill_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  const expectedShort = ["100", "172.76", "7.74", "7.74"];
  const expectedAcceptance = ["35.5", "61.3298", "2.7477", "2.7477"];
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0
    && JSON.stringify(shortQuantities) === JSON.stringify(expectedShort))) {
    throw new Error(`STOP_S273_F09_WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_02_${variantToken}_SHORT_FIXTURE`);
  }
  if (!(acceptance.preliminaryNeeds.length === 0
    && JSON.stringify(acceptanceQuantities) === JSON.stringify(expectedAcceptance))) {
    throw new Error(`STOP_S273_F09_WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_02_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 4)) {
    throw new Error(`STOP_S273_F09_WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_02_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_02_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-04-012-02",
    short: { rowCount: short.rows.length, quantities: shortQuantities },
    acceptance: { areaM2: "35.5", quantities: acceptanceQuantities },
    incomplete: { rowCount: 0, preliminaryNeedCount: 4 },
    machineResourcesIncluded: true,
    machinistLaborPricedSeparately: false,
    sillBoardIncluded: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, acceptance, incomplete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-wooden-window-without-sill-board-fill-demolition-krer46-${variantKey}-${publicationMode}-successor.v1`,
  stopCode: `S273_F09_WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_02_${variantToken}`,
  applicationName: `s27-3-f09-wooden-window-without-sill-board-fill-demolition-krer46-02-${variantKey}-${publicationMode}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "f1fe413f-7ec2-5d49-b5e8-d5199c88919c",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "9d8f0786-2ac7-54fe-a5f1-708ae5bb2484",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/wooden-window-without-sill-board-fill-demolition-krer46-02-${variantKey}-${publicationMode}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/woodenWindowWithoutSillBoardOpeningFillDemolitionKrer46R1.ts",
    "tests/estimateNorms/woodenWindowWithoutSillBoardOpeningFillDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareWoodenWindowWithoutSillBoardOpeningFillDemolitionKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID,
  normId: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_RESOURCES,
  shortInput: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: replaceExisting ? [3, 4, 4] : [0, 0, 0],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_02_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `wooden_window_without_sill_board_opening_fill_demolition_krer_46_04_012_02_${variantKey}`,
    physicalResultRu: `Подтверждённая площадь существующего деревянного оконного заполнения проёма без подоконной доски (${variantContextRu}) разобрана по КРЕР 46-04-012-02`,
    includedScopeRu: [
      "снятие существующих деревянных оконных створок и выемка коробок без подоконных досок",
      "снятие наличников, отбивка штукатурки откосов и четвертей в границах разборки",
      "труд рабочих среднего разряда 2,4 по норме 172,76 чел.-ч на 100 м²",
      "одномачтовый подъёмник до 500 кг, высота подъёма 45 м, 7,74 маш.-ч на 100 м²",
      "справочный труд машинистов 7,74 чел.-ч на 100 м² без повторной оплаты",
      "уборка и перемещение отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "подоконная доска и норма 46-04-012-01 для окна с подоконной доской",
      "новый оконный блок, створки, коробка, наличники и фурнитура",
      "восстановление кладки, откосов, четвертей и отделки проёма",
      "двери, металлические и иные заполнения проёмов",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент площади и неподтверждённые цены",
    ],
    independentCompletenessMap: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_WOODEN_WINDOW_OPENING_FILL_WITHOUT_SILL_BOARD",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "opening_fill_area_m2",
    geometryParameters: ["opening_fill_area_m2"],
    existingOpeningFillMaterial: "WOOD",
    existingOpeningFillKind: "WINDOW",
    existingWindowSillBoard: "ABSENT",
    officialUnitRateSource: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-012-02",
    machineResourcesIncluded: true,
    machinistLaborPricedSeparately: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: `${rowPrefix}:labor`,
    applicability: {
      technology_class: "WOODEN_WINDOW_WITHOUT_SILL_BOARD_OPENING_FILL_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_OPENING_FILL",
      catalog_variant: variant.catalogVariant,
      existing_opening_fill_material: "WOOD",
      existing_opening_fill_kind: "WINDOW",
      existing_window_sill_board: "ABSENT",
      source_id: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_NORM_ID,
      exact_locator: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_46_04_012_02_RATES_PER_100_M2",
      machine_resources_included: true,
      machinist_labor_priced_separately: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-012-02-wooden-window-without-sill-board-opening-fill-demolition-${variantKey}-${replaceExisting ? "correction-v1" : "v1"}`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-012",
      rate: "46-04-012-02",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPages: [59, 60],
      resourceRatePrintedAndPdfPage: 60,
      exactLocator: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["opening_fill_area_m2", profileParameterId, confirmedParameterId],
      resourceRatesPer100M2: {
        constructionLaborGrade2_4ManHours: 172.76,
        machinistLaborManHours: 7.74,
        liftMachineHours: 7.74,
      },
      existingWindowSillBoard: "ABSENT",
      machineResourcesIncluded: true,
      machinistLaborPricedSeparately: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `демонтаж деревянного окна без подоконной доски — ${variantContextRu}`,
      `разборка деревянного оконного блока без подоконника — ${variantContextRu}`,
      `КРЕР 46-04-012-02 — ${variantContextRu}`,
      `${variantKey} wooden window without sill board opening fill demolition`,
    ],
    shortScopeRu: `Разборка подтверждённого существующего деревянного оконного заполнения без подоконной доски (${variantContextRu}) по точным ресурсам КРЕР 46-04-012-02.`,
    keyDistinguishingParameters: ["opening_fill_area_m2", profileParameterId, confirmedParameterId],
    clarificationFields: [profileParameterId, confirmedParameterId],
    includedBoundaries: [
      "разборка деревянных оконных створок и коробок без подоконной доски",
      "точный труд рабочих разряда 2,4 и подъёмник по КРЕР 46-04-012-02",
      "справочный труд машинистов без повторной оплаты",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "окно с подоконной доской и соседняя колонка 46-04-012-01",
      "новое заполнение и восстановление проёма",
      "двери, металлические окна и другой материал заполнения",
      "внеобъектовый вывоз и полигон",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: `разборка демонтаж деревянное окно оконный блок створка коробка без подоконной доски без подоконника ${variantContextRu} КРЕР 46 реконструкция`,
    sourceProvenance: {
      officialKrer462015Rate460401202: true,
      exactOfficialArtifactSha256: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborAndLiftRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      sillBoardAndAdjacentColumn01Rejected: true,
      adjacentOpeningRestorationRejected: true,
      classificationFactorRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  ...(replaceExisting ? {} : { catalogAppend: {
    identity: {
      namespace: "global",
      domain: "demolition",
      sourceIdentity: variant.sourceIdentity,
      workKey: `wooden_window_without_sill_board_opening_fill_demolition_krer_46_04_012_02_${variantKey}`,
      titleRu: variant.canonicalNameRu,
      denominatorEligible: true,
    },
    searchPlacement: {
      groupMode: variantKey === "standard" ? "create" : "join",
      groupId,
      groupNameRu,
      domainId: "demolition",
      systemId: "demolition",
      subsystemId: groupId,
      assemblyId: groupId,
      workFamilyId: "demolition",
      breadcrumb: [groupNameRu],
      groupOracleDisposition: {
        contract: "rik-expo-app.s27-3.catalog-append.v1",
        disposition: "EXACT_PHYSICAL_WORK_GROUP",
        exactRateFamily: "KRER_46_04_012_02",
      },
      membershipOrdinal: variantOrdinal,
      independentDisposition: {
        contract: "rik-expo-app.s27-3.catalog-append.v1",
        classification: "CANONICAL_VISIBLE",
        exactPhysicalIdentity: true,
        appendedWithoutReplacingExistingIdentity: true,
      },
      elementType: "WORK",
      operationKind: "DEMOLITION",
      technologyVariant: "КРЕР 46-04-012-02; деревянное оконное заполнение; без подоконной доски",
      constructionState: "EXISTING",
      normativeClassifiers: ["КРЕР 46-04-012-02"],
      applicabilityTags: ["WOODEN_WINDOW", "WITHOUT_SILL_BOARD", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND",
      catalogOrigin: "GLOBAL",
      adjudicationClass: "EFFECTIVE_WORK",
      selectable: true,
    },
  } }),
  forbiddenAdjacentMatchers: [
    /new_window|window_install|нов.*окон|установ.*окон/iu,
    /with_sill_board|46_04_012_01|с подоконн/iu,
    /door|metal_window|двер|металлическ.*окон/iu,
    /masonry_repair|slope_restoration|восстанов.*откос|ремонт.*проём/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_02_${variantToken}_${publicationMode.toUpperCase()}_SUCCESSOR`,
  receiptFileStem: `S273_F09_WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_02_${variantToken}_${publicationMode.toUpperCase()}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
