import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_METADATA,
  type AggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46VariantKey,
  compileAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1,
  resolveAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46Variant,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_METADATA,
  type AggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46VariantKey,
  compileAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1,
  resolveAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46Variant,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SOURCE_METADATA,
  type AggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46VariantKey,
  compileAggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46R1,
  resolveAggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46Variant,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SOURCE_METADATA,
  type AggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46VariantKey,
  compileAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1,
  resolveAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46Variant,
} from "../../../src/lib/estimate/v4/aggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const rateArgument = process.argv.find((argument) => argument.startsWith("--rate="))
  ?.slice("--rate=".length) ?? "07";
if (!(["07", "08", "09", "10"] as const).includes(rateArgument as "07" | "08" | "09" | "10")) {
  throw new Error(`STOP_S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_RATE:${rateArgument}`);
}
const rate08 = rateArgument === "08";
const rate09 = rateArgument === "09";
const rate10 = rateArgument === "10";
const replaceExisting = process.argv.includes("--replace-existing");
if (replaceExisting && rateArgument !== "10") {
  throw new Error(`STOP_S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_CORRECTION_RATE:${rateArgument}`);
}
if (replaceExisting && (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID)) {
  throw new Error("STOP_S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_CORRECTION_PARENT_REQUIRED");
}
const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "large_area", "small_area", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as AggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46VariantKey
  | AggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46VariantKey
  | AggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46VariantKey
  | AggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46VariantKey;
const variant = rate10
  ? resolveAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46Variant(
    variantKey as AggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46VariantKey,
  )
  : rate09
  ? resolveAggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46Variant(
    variantKey as AggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46VariantKey,
  )
  : rate08
  ? resolveAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46Variant(
    variantKey as AggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46VariantKey,
  )
  : resolveAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46Variant(
    variantKey as AggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46VariantKey,
  );
const variantOrdinal = { standard: 0, large_area: 1, small_area: 2, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  large_area: "большая площадь",
  small_area: "малая площадь",
  wet_zone: "влажная зона",
}[variantKey];
const rate = rate10 ? {
  token: "10",
  exactRate: "46-04-011-10",
  familySlug: "different-bedding-layers-with-arzamite-or-plastic-putty-joints",
  familySnake: "different_bedding_layers_with_arzamite_or_plastic_putty_joints",
  beddingRu: "разных подстилающих слоях с расшивкой швов арзамит- или пластзамазками",
  beddingCode: "DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS",
  laborGrade: "3,1",
  laborRate: "67,10",
  laborRateNumber: 67.1,
  laborResourceKey: "constructionLaborGrade3_1ManHours",
  expectedShort: ["100", "67.1"],
  expectedAcceptance: ["35.5", "23.8205"],
  expectedPreliminaryNeedCount: 2,
  machineResourcesIncluded: false,
  acceptanceInput: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  artifactSha256: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_ARTIFACT_SHA256,
  formulas: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_FORMULAS,
  completenessMap: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  normId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_NORM_ID,
  parameters: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PARAMETERS,
  resources: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_RESOURCES,
  shortInput: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SHORT_INPUT,
  sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SOURCE_ID,
  sourceMetadata: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SOURCE_METADATA,
  compile: compileAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1,
  testPath: "tests/estimateNorms/aggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1.contract.test.ts",
  defaultParentReleaseId: "d584ffba-44b9-55e5-b70f-97e885cf6706",
  defaultParentSearchReleaseId: "2ea16702-be95-5e51-85fa-6613629f540f",
} : rate09 ? {
  token: "09",
  exactRate: "46-04-011-09",
  familySlug: "sulfur-cement-or-plastic-or-arzamite-putty",
  familySnake: "sulfur_cement_or_plastic_or_arzamite_putty",
  beddingRu: "серном цементе, пластзамазках или арзамитзамазках",
  beddingCode: "SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY",
  laborGrade: "3,1",
  laborRate: "66,10",
  laborRateNumber: 66.1,
  laborResourceKey: "constructionLaborGrade3_1ManHours",
  expectedShort: ["100", "66.1"],
  expectedAcceptance: ["35.5", "23.4655"],
  expectedPreliminaryNeedCount: 2,
  machineResourcesIncluded: false,
  acceptanceInput: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  artifactSha256: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256,
  formulas: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_FORMULAS,
  completenessMap: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  normId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_NORM_ID,
  parameters: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_PARAMETERS,
  resources: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_RESOURCES,
  shortInput: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SHORT_INPUT,
  sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SOURCE_ID,
  sourceMetadata: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SOURCE_METADATA,
  compile: compileAggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46R1,
  testPath: "tests/estimateNorms/aggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46R1.contract.test.ts",
  defaultParentReleaseId: "af6fe766-a70c-5948-987f-b04bb880c038",
  defaultParentSearchReleaseId: "e708ed57-17b6-5cf3-9c05-6166840cb848",
} : rate08 ? {
  token: "08",
  exactRate: "46-04-011-08",
  familySlug: "cement-acid-resistant-mortar-or-acid-resistant-putty",
  familySnake: "cement_acid_resistant_mortar_or_acid_resistant_putty",
  beddingRu: "цементном кислотоупорном растворе или кислотоупорных замазках",
  beddingCode: "CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY",
  laborGrade: "3,6",
  laborRate: "104,52",
  laborRateNumber: 104.52,
  laborResourceKey: "constructionLaborGrade3_6ManHours",
  expectedShort: ["100", "104.52", "1.91", "1.91", "3.82"],
  expectedAcceptance: ["35.5", "37.1046", "0.67805", "0.67805", "1.3561"],
  expectedPreliminaryNeedCount: 5,
  machineResourcesIncluded: true,
  acceptanceInput: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  artifactSha256: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256,
  formulas: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS,
  completenessMap: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  normId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_NORM_ID,
  parameters: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PARAMETERS,
  resources: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES,
  shortInput: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SHORT_INPUT,
  sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_ID,
  sourceMetadata: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_METADATA,
  compile: compileAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1,
  testPath: "tests/estimateNorms/aggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1.contract.test.ts",
  defaultParentReleaseId: "677ba55d-e97b-5a8f-81d9-796f997b056f",
  defaultParentSearchReleaseId: "6a3b0c0c-6a76-5276-a07e-623b8b68a366",
} : {
  token: "07",
  exactRate: "46-04-011-07",
  familySlug: "bituminous-mastic-or-acid-resistant-mortar",
  familySnake: "bituminous_mastic_or_acid_resistant_mortar",
  beddingRu: "битумной мастике или кислотоупорном растворе",
  beddingCode: "BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR",
  laborGrade: "3,8",
  laborRate: "152,89",
  laborRateNumber: 152.89,
  laborResourceKey: "constructionLaborGrade3_8ManHours",
  expectedShort: ["100", "152.89", "1.91", "1.91", "3.82"],
  expectedAcceptance: ["35.5", "54.27595", "0.67805", "0.67805", "1.3561"],
  expectedPreliminaryNeedCount: 5,
  machineResourcesIncluded: true,
  acceptanceInput: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  artifactSha256: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  formulas: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_FORMULAS,
  completenessMap: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  normId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_NORM_ID,
  parameters: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PARAMETERS,
  resources: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_RESOURCES,
  shortInput: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SHORT_INPUT,
  sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID,
  sourceMetadata: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_METADATA,
  compile: compileAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1,
  testPath: "tests/estimateNorms/aggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1.contract.test.ts",
  defaultParentReleaseId: "e093a802-8955-5a10-9a8a-40639cd52c19",
  defaultParentSearchReleaseId: "46e721ea-5a29-5bd6-9169-1b5a5bd8f437",
};
const groupId = `wg:master:demolition_aggressive_environment_brick_floor_${rate.familySnake}`;
const groupNameRu = `Разборка кирпичного покрытия пола в агрессивной среде на ${rate.beddingRu}`;
const rowPrefix = `f09:aggressive_environment_brick_floor_on_${rate.familySnake}_demolition`;
const profileParameterId =
  `existing_aggressive_environment_brick_floor_on_${rate.familySnake}_profile`;
const confirmedParameterId =
  `existing_brick_floor_on_${rate.familySnake}_aggressive_environment_confirmed`;
const publicationMode = replaceExisting ? "correction" : "append";

async function verifyCore(): Promise<Json> {
  const short = await rate.compile(
    { ...rate.shortInput },
    { catalogId: variant.catalogId },
  );
  const acceptance = await rate.compile(
    { ...rate.acceptanceInput },
    { catalogId: variant.catalogId },
  );
  const incomplete = await rate.compile(
    { floor_covering_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0
    && JSON.stringify(shortQuantities) === JSON.stringify(rate.expectedShort))) {
    throw new Error(`STOP_S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_${rate.token}_${variantToken}_SHORT_FIXTURE`);
  }
  if (!(acceptance.preliminaryNeeds.length === 0
    && JSON.stringify(acceptanceQuantities)
      === JSON.stringify(rate.expectedAcceptance))) {
    throw new Error(`STOP_S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_${rate.token}_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0
    && incomplete.preliminaryNeeds.length === rate.expectedPreliminaryNeedCount)) {
    throw new Error(`STOP_S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_${rate.token}_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_${rate.token}_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: rate.exactRate,
    short: { rowCount: short.rows.length, quantities: shortQuantities },
    acceptance: { areaM2: "35.5", quantities: acceptanceQuantities },
    incomplete: { rowCount: 0, preliminaryNeedCount: rate.expectedPreliminaryNeedCount },
    machineResourcesIncluded: rate.machineResourcesIncluded,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, acceptance, incomplete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-aggressive-environment-brick-floor-on-${rate.familySlug}-demolition-krer46-${variantKey}-${publicationMode}-successor.v1`,
  stopCode: `S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_${rate.token}_${variantToken}`,
  applicationName: `s27-3-f09-brick-floor-demolition-krer46-${rate.token}-${variantKey}-${publicationMode}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? rate.defaultParentReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? rate.defaultParentSearchReleaseId,
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/brick-floor-demolition-krer46-${rate.token}-${variantKey}-${publicationMode}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/aggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1.ts",
    rate.testPath,
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: rate.sourceId,
  normId: rate.normId,
  sourceMetadata: rate.sourceMetadata,
  parameterDefinitions: rate.parameters,
  formulaDefinitions: rate.formulas,
  resourceDefinitions: rate.resources,
  shortInput: rate.shortInput,
  acceptanceInput: rate.acceptanceInput,
  verifyCore,
  expectedParentShape: replaceExisting ? [3, 2, 2] : [0, 0, 0],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_DEMOLITION_KRER46_${rate.token}_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `aggressive_environment_brick_floor_demolition_krer_46_04_011_${rate.token}_${variantKey}`,
    physicalResultRu: `Подтверждённая площадь существующего кирпичного покрытия пола на ${rate.beddingRu} в агрессивной среде (${variantContextRu}) разобрана по КРЕР ${rate.exactRate}`,
    includedScopeRu: [
      `разборка существующего кирпичного покрытия пола на ${rate.beddingRu} в агрессивной среде`,
      "очистка годного кирпича от раствора в составе нормы",
      `труд рабочих среднего разряда ${rate.laborGrade} по норме ${rate.laborRate} чел.-ч на 100 м²`,
      ...(rate.machineResourcesIncluded ? [
        "справочный труд машинистов 1,91 чел.-ч на 100 м² без повторной оплаты",
        "компрессор 1,91 маш.-ч и пневматические отбойные молотки 3,82 маш.-ч на 100 м²",
      ] : [
        `труд машинистов и машины отсутствуют в официальной колонке ${rate.exactRate}`,
      ]),
      "уборка, вертикальное перемещение и переноска отходов до 50 м внутри объекта",
    ],
    excludedScopeRu: [
      "основание и новая конструкция пола",
      "новое покрытие, мастика, раствор и отделочные слои",
      "другие покрытия, основания, колонки нормы и обычная среда",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент площади и неподтверждённые цены",
    ],
    independentCompletenessMap: rate.completenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_BRICK_FLOOR_COVERING_IN_AGGRESSIVE_ENVIRONMENT",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "floor_covering_area_m2",
    geometryParameters: ["floor_covering_area_m2"],
    existingCoveringMaterial: "BRICK",
    existingBedding: rate.beddingCode,
    environmentClass: "AGGRESSIVE",
    officialUnitRateSource: rate.sourceId,
    officialArtifactSha256: rate.artifactSha256,
    exactRate: rate.exactRate,
    machineResourcesIncluded: rate.machineResourcesIncluded,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: `${rowPrefix}:labor`,
    applicability: {
      technology_class: "AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_FLOOR_COVERING",
      catalog_variant: variant.catalogVariant,
      existing_covering_material: "BRICK",
      existing_bedding: rate.beddingCode,
      environment_class: "AGGRESSIVE",
      source_id: rate.sourceId,
      norm_id: rate.normId,
      exact_locator: rate.sourceMetadata.exact_locator,
      official_artifact_sha256: rate.artifactSha256,
      quantity_basis: `CONFIRMED_AREA_TIMES_EXACT_KRER_46_04_011_${rate.token}_RATE_PER_100_M2`,
      machine_resources_included: rate.machineResourcesIncluded,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-011-${rate.token}-aggressive-environment-brick-floor-demolition-${variantKey}-${replaceExisting ? "correction-v1" : "v1"}`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-011",
      rate: rate.exactRate,
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPage: 58,
      resourceRatePrintedAndPdfPage: 59,
      exactLocator: rate.sourceMetadata.exact_locator,
      officialArtifactSha256: rate.artifactSha256,
      knownScopeInputs: [
        "floor_covering_area_m2",
        profileParameterId,
        confirmedParameterId,
      ],
      resourceRatesPer100M2: {
        [rate.laborResourceKey]: rate.laborRateNumber,
        ...(rate.machineResourcesIncluded ? {
          machinistLaborManHoursInformational: 1.91,
          compressorMachineHours: 1.91,
          pneumaticBreakerMachineHours: 3.82,
        } : {}),
      },
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `демонтаж кирпичного пола на ${rate.beddingRu} в агрессивной среде — ${variantContextRu}`,
      `разборка кирпичного покрытия на ${rate.beddingRu} — ${variantContextRu}`,
      `КРЕР ${rate.exactRate} — ${variantContextRu}`,
      `${variantKey} aggressive-environment brick floor covering demolition`,
    ],
    shortScopeRu: `Разборка подтверждённого кирпичного покрытия пола на ${rate.beddingRu} в агрессивной среде (${variantContextRu}) по точным ресурсам КРЕР ${rate.exactRate}.`,
    keyDistinguishingParameters: [
      "floor_covering_area_m2",
      profileParameterId,
      confirmedParameterId,
    ],
    clarificationFields: [
      profileParameterId,
      confirmedParameterId,
    ],
    includedBoundaries: [
      `разборка кирпичного покрытия на ${rate.beddingRu}`,
      "очистка годного кирпича от раствора",
      "внутриобъектовое перемещение отходов в границах нормы",
      rate.machineResourcesIncluded
        ? `точные трудовые и машинные ресурсы КРЕР ${rate.exactRate}`
        : `точный трудовой ресурс КРЕР ${rate.exactRate}; машинные ресурсы отсутствуют`,
    ],
    excludedBoundaries: [
      "основание и новая конструкция пола",
      "другие покрытия, подстилающие слои и обычная среда",
      "внеобъектовый вывоз и полигон",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: `разборка демонтаж кирпичное покрытие пол ${rate.beddingRu} агрессивная среда ${variantContextRu} КРЕР 46 реконструкция`,
    sourceProvenance: {
      [`officialKrer462015Rate4604011${rate.token}`]: true,
      exactOfficialArtifactSha256: rate.artifactSha256,
      exactOfficialResourceRatesApplied: true,
      machineResourcesCorrectlyIncludedOrExcluded: true,
      otherCoveringsAndColumnsRejected: true,
      ordinaryEnvironmentRejected: true,
      classificationFactorRejected: true,
      adjacentFloorLayersRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  ...(replaceExisting ? {} : { catalogAppend: {
    identity: {
      namespace: "global",
      domain: "demolition",
      sourceIdentity: variant.sourceIdentity,
      workKey: `aggressive_environment_brick_floor_demolition_krer_46_04_011_${rate.token}_${variantKey}`,
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
        exactRateFamily: `KRER_46_04_011_${rate.token}`,
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
      technologyVariant: `КРЕР ${rate.exactRate}; кирпич; ${rate.beddingRu}; агрессивная среда`,
      constructionState: "EXISTING",
      normativeClassifiers: [`КРЕР ${rate.exactRate}`],
      applicabilityTags: ["AGGRESSIVE_ENVIRONMENT", "BRICK_FLOOR", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND",
      catalogOrigin: "GLOBAL",
      adjudicationClass: "EFFECTIVE_WORK",
      selectable: true,
    },
  } }),
  forbiddenAdjacentMatchers: [
    /new_floor|floor_install|screed_install|нов.*покрыт|устройств.*стяж/iu,
    /ordinary_environment|non_aggressive|обычн.*сред/iu,
    /tile|parquet|asphalt|wood_block|metal_plate|плиточ|паркет|асфальт|деревян|металл/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_${rate.token}_${variantToken}_${publicationMode.toUpperCase()}_SUCCESSOR`,
  receiptFileStem: `S273_F09_BRICK_FLOOR_DEMOLITION_KRER46_${rate.token}_${variantToken}_${publicationMode.toUpperCase()}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
