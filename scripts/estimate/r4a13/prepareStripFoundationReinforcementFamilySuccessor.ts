import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA,
} from "../../../src/lib/estimate/v4/domainFactory";
import {
  STRIP_FOUNDATION_REINFORCEMENT_FORMULAS,
  STRIP_FOUNDATION_REINFORCEMENT_NORMATIVE_PARAMETER_IDS,
  STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS,
  STRIP_FOUNDATION_REINFORCEMENT_RESOURCES,
  STRIP_FOUNDATION_REINFORCEMENT_TARGETS,
  compileStripFoundationReinforcementR1,
  stripFoundationReinforcementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/stripFoundationReinforcementR1";
import {
  SLAB_FOUNDATION_REINFORCEMENT_PARAMETERS,
  SLAB_FOUNDATION_REINFORCEMENT_RESOURCES,
  SLAB_FOUNDATION_REINFORCEMENT_TARGETS,
  compileSlabFoundationReinforcementR1,
  slabFoundationReinforcementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/slabFoundationReinforcementR1";
import {
  CONCRETE_SLAB_REINFORCEMENT_PARAMETERS,
  CONCRETE_SLAB_REINFORCEMENT_RESOURCES,
  CONCRETE_SLAB_REINFORCEMENT_TARGETS,
  compileConcreteSlabReinforcementR1,
  concreteSlabReinforcementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/concreteSlabReinforcementR1";
import {
  PILE_CAP_REINFORCEMENT_PARAMETERS,
  PILE_CAP_REINFORCEMENT_RESOURCES,
  PILE_CAP_REINFORCEMENT_TARGETS,
  compilePileCapReinforcementR1,
  pileCapReinforcementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/pileCapReinforcementR1";
import {
  PEDESTAL_REINFORCEMENT_PARAMETERS,
  PEDESTAL_REINFORCEMENT_RESOURCES,
  PEDESTAL_REINFORCEMENT_TARGETS,
  compilePedestalReinforcementR1,
  pedestalReinforcementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/pedestalReinforcementR1";
import {
  STAIRS_REINFORCEMENT_PARAMETERS,
  STAIRS_REINFORCEMENT_RESOURCES,
  STAIRS_REINFORCEMENT_TARGETS,
  compileStairsReinforcementR1,
  stairsReinforcementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/stairsReinforcementR1";
import {
  REINFORCEMENT_FRAME_ASSEMBLY_TARGETS,
  REINFORCEMENT_FRAME_REINFORCEMENT_PARAMETERS,
  REINFORCEMENT_FRAME_REINFORCEMENT_RESOURCES,
  REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS,
  compileReinforcementFrameAssemblyR1,
  compileReinforcementFrameReinforcementR1,
  reinforcementFrameAssemblyAcceptanceInputR1,
  reinforcementFrameReinforcementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/reinforcementFrameReinforcementR1";
import {
  COLUMN_BASE_REINFORCEMENT_PARAMETERS,
  COLUMN_BASE_REINFORCEMENT_RESOURCES,
  COLUMN_BASE_REINFORCEMENT_TARGETS,
  columnBaseReinforcementAcceptanceInputR1,
  compileColumnBaseReinforcementR1,
} from "../../../src/lib/estimate/v4/columnBaseReinforcementR1";
import {
  ANCHOR_GROUP_REINFORCEMENT_PARAMETERS,
  ANCHOR_GROUP_REINFORCEMENT_RESOURCES,
  ANCHOR_GROUP_REINFORCEMENT_TARGETS,
  anchorGroupReinforcementAcceptanceInputR1,
  compileAnchorGroupReinforcementR1,
} from "../../../src/lib/estimate/v4/anchorGroupReinforcementR1";
import {
  BELT_REINFORCEMENT_PARAMETERS,
  BELT_REINFORCEMENT_RESOURCES,
  BELT_REINFORCEMENT_TARGETS,
  beltReinforcementAcceptanceInputR1,
  compileBeltReinforcementR1,
} from "../../../src/lib/estimate/v4/beltReinforcementR1";
import {
  JOINT_REINFORCEMENT_PARAMETERS,
  JOINT_REINFORCEMENT_RESOURCES,
  JOINT_REINFORCEMENT_TARGETS,
  compileJointReinforcementR1,
  jointReinforcementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/jointReinforcementR1";
import {
  FORMWORK_REINFORCEMENT_PARAMETERS,
  FORMWORK_REINFORCEMENT_RESOURCES,
  FORMWORK_REINFORCEMENT_TARGETS,
  compileFormworkReinforcementR1,
  formworkReinforcementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/formworkReinforcementR1";
import {
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
  resolveCanonicalApprovedBaselineLeaf,
} from "./canonicalDefinitionPublisherR1";

type Json = Record<string, any>;

const SLAB_FOUNDATION_MODE = process.argv.includes("--slab-foundation");
const CONCRETE_SLAB_MODE = process.argv.includes("--concrete-slab");
const PILE_CAP_MODE = process.argv.includes("--pile-cap");
const PEDESTAL_MODE = process.argv.includes("--pedestal");
const STAIRS_MODE = process.argv.includes("--stairs");
const REINFORCEMENT_FRAME_MODE = process.argv.includes("--reinforcement-frame");
const REINFORCEMENT_FRAME_ASSEMBLY_MODE = process.argv.includes("--reinforcement-frame-assembly");
const COLUMN_BASE_MODE = process.argv.includes("--column-base");
const ANCHOR_GROUP_REINFORCEMENT_MODE = process.argv.includes("--anchor-group-reinforcement");
const BELT_REINFORCEMENT_MODE = process.argv.includes("--belt-reinforcement");
const JOINT_REINFORCEMENT_MODE = process.argv.includes("--joint-reinforcement");
const FORMWORK_REINFORCEMENT_MODE = process.argv.includes("--formwork-reinforcement");
const CONTRACT = FORMWORK_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.formwork-reinforcement-family.v1"
  : JOINT_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.joint-reinforcement-family.v1"
  : BELT_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.belt-reinforcement-family.v1"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.anchor-group-reinforcement-family.v1"
  : COLUMN_BASE_MODE
  ? "rik-expo-app.r4-a13-6.column-base-reinforcement-family.v1"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "rik-expo-app.r4-a13-6.reinforcement-frame-assembly-family.v1"
  : REINFORCEMENT_FRAME_MODE
  ? "rik-expo-app.r4-a13-6.reinforcement-frame-reinforcement-family.v1"
  : STAIRS_MODE
  ? "rik-expo-app.r4-a13-6.stairs-reinforcement-family.v1"
  : PEDESTAL_MODE
  ? "rik-expo-app.r4-a13-6.pedestal-reinforcement-family.v1"
  : PILE_CAP_MODE
  ? "rik-expo-app.r4-a13-6.pile-cap-reinforcement-family.v1"
  : CONCRETE_SLAB_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-reinforcement-family.v1"
  : SLAB_FOUNDATION_MODE
  ? "rik-expo-app.r4-a13-6.slab-foundation-reinforcement-family.v1"
  : "rik-expo-app.r4-a13-6.strip-foundation-reinforcement-family.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(
  REINFORCEMENT_FRAME_ASSEMBLY_MODE
    ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (16).md"
    : "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (14).md",
);
const MASTER_SHA256 = REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "9bc2a957ce80d9b0086fa98523b692325d100367761e4d9cbac786d4ebd1e4ea"
  : "33902b73c91b1c937a316089deff1d215a8fbc6c3d4c970c2ea53b4a37de8dc8";
const PARENT_RELEASE_ID = FORMWORK_REINFORCEMENT_MODE
  ? "80fc4afc-6531-583b-966b-7828d4e10ae5"
  : JOINT_REINFORCEMENT_MODE
  ? "8fa98f07-3831-57d6-b37a-9cbc7442fff6"
  : BELT_REINFORCEMENT_MODE
  ? "ec015415-7504-5cc1-853a-cfd38cf09e2f"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "2768e0a1-ab48-5c34-8b4c-f6c19e3c28e5"
  : COLUMN_BASE_MODE
  ? "e1dcd42e-0187-5a04-8bac-16a0d3e2468c"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "e681be2c-a28f-5c72-b6ce-aeb166b96633"
  : REINFORCEMENT_FRAME_MODE
  ? "e2755c0e-af34-5c91-a370-474cc1beba87"
  : STAIRS_MODE
  ? "880ca23a-39c0-5bd4-a75d-d0edbd5bf128"
  : PEDESTAL_MODE
  ? "4f52b35a-0f1c-5541-b2d9-a651b2dd3a57"
  : PILE_CAP_MODE
  ? "52f6eb87-1960-5c20-b2a1-3d92180bd009"
  : CONCRETE_SLAB_MODE
  ? "b5fdbd4a-a863-5823-83a6-3432108fd743"
  : "05fd8444-dd4e-5f22-8c80-a83c92758466";
const PARENT_SEARCH_RELEASE_ID = FORMWORK_REINFORCEMENT_MODE
  ? "1fc20d92-2bf1-5c0f-bd30-ca99d1c76fe5"
  : JOINT_REINFORCEMENT_MODE
  ? "7e5d3320-eb80-5a67-abcf-c6369bcb0b89"
  : BELT_REINFORCEMENT_MODE
  ? "a1c7e025-3b03-5862-9f94-59123d82abc9"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "67bfd575-8f7c-57ef-9e1f-336c5014659f"
  : COLUMN_BASE_MODE
  ? "b8dff955-a85f-54b9-ae75-4fd9e89e5034"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "d20b84f4-a4d2-59fc-947a-57895d1f2e1d"
  : REINFORCEMENT_FRAME_MODE
  ? "1d2bf788-a50f-597e-8e00-4bfadc04de00"
  : STAIRS_MODE
  ? "b9f48d80-2593-5bd9-ad40-c652e0ed7e4f"
  : PEDESTAL_MODE
  ? "890c0b03-40cf-592f-b777-01da66a02e50"
  : PILE_CAP_MODE
  ? "81a70e74-e1bb-5043-88db-5b93910f5b16"
  : CONCRETE_SLAB_MODE
  ? "f86a4f0a-0ca5-58c8-bf87-dab4a9c5607c"
  : "37d17699-fd8d-50a4-a555-e1df9857de14";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(
  FORMWORK_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-reinforcement-family"
    : JOINT_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/joint-reinforcement-family"
    : BELT_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-reinforcement-family"
    : ANCHOR_GROUP_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-reinforcement-family"
    : COLUMN_BASE_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-reinforcement-family"
    : REINFORCEMENT_FRAME_ASSEMBLY_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-assembly-family"
    : REINFORCEMENT_FRAME_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-reinforcement-family"
    : STAIRS_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/stairs-reinforcement-family"
    : PEDESTAL_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-reinforcement-family"
    : PILE_CAP_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-reinforcement-family"
    : CONCRETE_SLAB_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-reinforcement-family"
    : SLAB_FOUNDATION_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/slab-foundation-reinforcement-family"
    : ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family",
);
const RESIDUAL_SUMMARY_PATH = resolve(
  FORMWORK_REINFORCEMENT_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-18T03-01-55-254Z/candidate-summary.json"
    : JOINT_REINFORCEMENT_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-18T02-18-09-793Z/candidate-summary.json"
    : BELT_REINFORCEMENT_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-17T18-04-43-747Z/candidate-summary.json"
    : ANCHOR_GROUP_REINFORCEMENT_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-17T17-43-43-927Z/candidate-summary.json"
    : COLUMN_BASE_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-17T17-24-34-021Z/candidate-summary.json"
    : REINFORCEMENT_FRAME_ASSEMBLY_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-18T06-51-55-677Z/candidate-summary.json"
    : REINFORCEMENT_FRAME_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-17T16-59-12-372Z/candidate-summary.json"
    : STAIRS_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-17T16-35-02-953Z/candidate-summary.json"
    : PEDESTAL_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-17T16-14-14-989Z/candidate-summary.json"
    : PILE_CAP_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-17T15-54-55-678Z/candidate-summary.json"
    : CONCRETE_SLAB_MODE
    ? ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-17T15-23-36-906Z/candidate-summary.json"
    : ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-17T14-44-22-897Z/candidate-summary.json",
);
const RESIDUAL_RECEIPT_SHA256 = FORMWORK_REINFORCEMENT_MODE
  ? "96455c8bf4deb80eab17710f5a014c52cd0f54b402573ec44577a2f8a1e2ce2f"
  : JOINT_REINFORCEMENT_MODE
  ? "f035a555182ebc4afe1ec112fed7a8811811e6304cd2ec433e007c45d0f31def"
  : BELT_REINFORCEMENT_MODE
  ? "074a8444b6187785ee3d95cd8eeaa71febd526fb72303d98af5832694bb6a817"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "3b6e43451e71e4ff478e60a196f79c0f97712117749e09b7190f92a48e52a81c"
  : COLUMN_BASE_MODE
  ? "01654b4abdce2b5cec7fb1dbed18358464bcf73121221a24313849f3ac43f64e"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "49e936e97730e3ea1c210c52a204fa66ea4daae547354b7b79689102c1031c79"
  : REINFORCEMENT_FRAME_MODE
  ? "edceb7bbaf7dcd24d709b85b05b3a188231a91f3e8cffc8a774b2f5abfa45d55"
  : STAIRS_MODE
  ? "d7bf47863a19756b4c58b0ae39adbf9bc31b862e273644719377ae535672ae3b"
  : PEDESTAL_MODE
  ? "a4e38c7d29db720186f903dbab9b7cf1d2daa035709c9c859dcfc45c3f98405b"
  : PILE_CAP_MODE
  ? "1fc41f50dd863d41d173ec2d89bbb83d6ab7496f28b753fd60d060753622ea10"
  : CONCRETE_SLAB_MODE
  ? "9566ae1ffd3678629f2c5be23f86aad0100a43e291cd48bf587b3ae4092cb5c3"
  : "e03a50f5bc4b1fde71d96bbcb9de98cfa922052a202204035c5e5f5953be8150";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const CONTENT_PASSPORT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const BASELINE_CONTRACT = "APPROVED_TEMPLATE_BASELINE_R54_V1";
const TARGETS = FORMWORK_REINFORCEMENT_MODE
  ? FORMWORK_REINFORCEMENT_TARGETS
  : JOINT_REINFORCEMENT_MODE
  ? JOINT_REINFORCEMENT_TARGETS
  : BELT_REINFORCEMENT_MODE
  ? BELT_REINFORCEMENT_TARGETS
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? ANCHOR_GROUP_REINFORCEMENT_TARGETS
  : COLUMN_BASE_MODE
  ? COLUMN_BASE_REINFORCEMENT_TARGETS
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? REINFORCEMENT_FRAME_ASSEMBLY_TARGETS
  : REINFORCEMENT_FRAME_MODE
  ? REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS
  : STAIRS_MODE
  ? STAIRS_REINFORCEMENT_TARGETS
  : PEDESTAL_MODE
  ? PEDESTAL_REINFORCEMENT_TARGETS
  : PILE_CAP_MODE
  ? PILE_CAP_REINFORCEMENT_TARGETS
  : CONCRETE_SLAB_MODE
  ? CONCRETE_SLAB_REINFORCEMENT_TARGETS
  : SLAB_FOUNDATION_MODE
  ? SLAB_FOUNDATION_REINFORCEMENT_TARGETS
  : STRIP_FOUNDATION_REINFORCEMENT_TARGETS;
const PARAMETERS = FORMWORK_REINFORCEMENT_MODE
  ? FORMWORK_REINFORCEMENT_PARAMETERS
  : JOINT_REINFORCEMENT_MODE
  ? JOINT_REINFORCEMENT_PARAMETERS
  : BELT_REINFORCEMENT_MODE
  ? BELT_REINFORCEMENT_PARAMETERS
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? ANCHOR_GROUP_REINFORCEMENT_PARAMETERS
  : COLUMN_BASE_MODE
  ? COLUMN_BASE_REINFORCEMENT_PARAMETERS
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? REINFORCEMENT_FRAME_REINFORCEMENT_PARAMETERS
  : REINFORCEMENT_FRAME_MODE
  ? REINFORCEMENT_FRAME_REINFORCEMENT_PARAMETERS
  : STAIRS_MODE
  ? STAIRS_REINFORCEMENT_PARAMETERS
  : PEDESTAL_MODE
  ? PEDESTAL_REINFORCEMENT_PARAMETERS
  : PILE_CAP_MODE
  ? PILE_CAP_REINFORCEMENT_PARAMETERS
  : CONCRETE_SLAB_MODE
  ? CONCRETE_SLAB_REINFORCEMENT_PARAMETERS
  : SLAB_FOUNDATION_MODE
  ? SLAB_FOUNDATION_REINFORCEMENT_PARAMETERS
  : STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS;
const FORMULAS = STRIP_FOUNDATION_REINFORCEMENT_FORMULAS;
const RESOURCES = FORMWORK_REINFORCEMENT_MODE
  ? FORMWORK_REINFORCEMENT_RESOURCES
  : JOINT_REINFORCEMENT_MODE
  ? JOINT_REINFORCEMENT_RESOURCES
  : BELT_REINFORCEMENT_MODE
  ? BELT_REINFORCEMENT_RESOURCES
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? ANCHOR_GROUP_REINFORCEMENT_RESOURCES
  : COLUMN_BASE_MODE
  ? COLUMN_BASE_REINFORCEMENT_RESOURCES
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? REINFORCEMENT_FRAME_REINFORCEMENT_RESOURCES
  : REINFORCEMENT_FRAME_MODE
  ? REINFORCEMENT_FRAME_REINFORCEMENT_RESOURCES
  : STAIRS_MODE
  ? STAIRS_REINFORCEMENT_RESOURCES
  : PEDESTAL_MODE
  ? PEDESTAL_REINFORCEMENT_RESOURCES
  : PILE_CAP_MODE
  ? PILE_CAP_REINFORCEMENT_RESOURCES
  : CONCRETE_SLAB_MODE
  ? CONCRETE_SLAB_REINFORCEMENT_RESOURCES
  : SLAB_FOUNDATION_MODE
  ? SLAB_FOUNDATION_REINFORCEMENT_RESOURCES
  : STRIP_FOUNDATION_REINFORCEMENT_RESOURCES;
const FAMILY_SUBJECT_RU = FORMWORK_REINFORCEMENT_MODE
  ? "монолитной конструкции в опалубке"
  : JOINT_REINFORCEMENT_MODE
  ? "краёв деформационного шва"
  : BELT_REINFORCEMENT_MODE
  ? "монолитного пояса"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "анкерной группы"
  : COLUMN_BASE_MODE
  ? "столбчатого основания"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "армокаркаса"
  : REINFORCEMENT_FRAME_MODE
  ? "армокаркаса"
  : STAIRS_MODE
  ? "бетонной лестницы"
  : PEDESTAL_MODE
  ? "бетонного пьедестала"
  : PILE_CAP_MODE
  ? "ростверка"
  : CONCRETE_SLAB_MODE
  ? "бетонной плиты"
  : SLAB_FOUNDATION_MODE
  ? "плитного фундамента"
  : "ленточного фундамента";
const FAMILY_STATUS = FORMWORK_REINFORCEMENT_MODE
  ? "FORMWORK_REINFORCEMENT"
  : JOINT_REINFORCEMENT_MODE
  ? "JOINT_REINFORCEMENT"
  : BELT_REINFORCEMENT_MODE
  ? "BELT_REINFORCEMENT"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "ANCHOR_GROUP_REINFORCEMENT"
  : COLUMN_BASE_MODE
  ? "COLUMN_BASE_REINFORCEMENT"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "REINFORCEMENT_FRAME_ASSEMBLY"
  : REINFORCEMENT_FRAME_MODE
  ? "REINFORCEMENT_FRAME_REINFORCEMENT"
  : STAIRS_MODE
  ? "STAIRS_REINFORCEMENT"
  : PEDESTAL_MODE
  ? "PEDESTAL_REINFORCEMENT"
  : PILE_CAP_MODE
  ? "PILE_CAP_REINFORCEMENT"
  : CONCRETE_SLAB_MODE
  ? "CONCRETE_SLAB_REINFORCEMENT"
  : SLAB_FOUNDATION_MODE
  ? "SLAB_FOUNDATION_REINFORCEMENT"
  : "STRIP_FOUNDATION_REINFORCEMENT";
const ACCEPTANCE_INPUT = FORMWORK_REINFORCEMENT_MODE
  ? formworkReinforcementAcceptanceInputR1
  : JOINT_REINFORCEMENT_MODE
  ? jointReinforcementAcceptanceInputR1
  : BELT_REINFORCEMENT_MODE
  ? beltReinforcementAcceptanceInputR1
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? anchorGroupReinforcementAcceptanceInputR1
  : COLUMN_BASE_MODE
  ? columnBaseReinforcementAcceptanceInputR1
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? reinforcementFrameAssemblyAcceptanceInputR1
  : REINFORCEMENT_FRAME_MODE
  ? reinforcementFrameReinforcementAcceptanceInputR1
  : STAIRS_MODE
  ? stairsReinforcementAcceptanceInputR1
  : PEDESTAL_MODE
  ? pedestalReinforcementAcceptanceInputR1
  : PILE_CAP_MODE
  ? pileCapReinforcementAcceptanceInputR1
  : CONCRETE_SLAB_MODE
  ? concreteSlabReinforcementAcceptanceInputR1
  : SLAB_FOUNDATION_MODE
  ? slabFoundationReinforcementAcceptanceInputR1
  : stripFoundationReinforcementAcceptanceInputR1;
const COMPILE_FAMILY = FORMWORK_REINFORCEMENT_MODE
  ? compileFormworkReinforcementR1
  : JOINT_REINFORCEMENT_MODE
  ? compileJointReinforcementR1
  : BELT_REINFORCEMENT_MODE
  ? compileBeltReinforcementR1
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? compileAnchorGroupReinforcementR1
  : COLUMN_BASE_MODE
  ? compileColumnBaseReinforcementR1
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? compileReinforcementFrameAssemblyR1
  : REINFORCEMENT_FRAME_MODE
  ? compileReinforcementFrameReinforcementR1
  : STAIRS_MODE
  ? compileStairsReinforcementR1
  : PEDESTAL_MODE
  ? compilePedestalReinforcementR1
  : PILE_CAP_MODE
  ? compilePileCapReinforcementR1
  : CONCRETE_SLAB_MODE
  ? compileConcreteSlabReinforcementR1
  : SLAB_FOUNDATION_MODE
  ? compileSlabFoundationReinforcementR1
  : compileStripFoundationReinforcementR1;
const NORMATIVE_PARAMETER_IDS = new Set<string>(
  STRIP_FOUNDATION_REINFORCEMENT_NORMATIVE_PARAMETER_IDS,
);
const SOURCE_PATHS = FORMWORK_REINFORCEMENT_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/formworkReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/formworkReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : JOINT_REINFORCEMENT_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/jointReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/jointReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : BELT_REINFORCEMENT_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/beltReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/beltReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/anchorGroupReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/anchorGroupReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : COLUMN_BASE_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/columnBaseReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/columnBaseReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : REINFORCEMENT_FRAME_MODE || REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/reinforcementFrameReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/reinforcementFrameReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : STAIRS_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/stairsReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/stairsReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : PEDESTAL_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/pedestalReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/pedestalReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : PILE_CAP_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/pileCapReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/pileCapReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : CONCRETE_SLAB_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/concreteSlabReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/concreteSlabReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : SLAB_FOUNDATION_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "src/lib/estimate/v4/slabFoundationReinforcementR1.ts",
      "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
      "tests/estimateNorms/slabFoundationReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const
  : [
      "src/lib/estimate/v4/stripFoundationReinforcementR1.ts",
      "tests/estimateNorms/stripFoundationReinforcementR1.contract.test.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationReinforcementFamilySuccessor.ts",
    ] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value)))
    .digest("hex");
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/gu, "е")
    .replace(/[^0-9a-zа-я]+/gu, " ").trim();
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function resourceRowType(category: string): string {
  if (category === "construction_work") return "labor";
  if (category === "delivery") return "service";
  return category;
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_STRIP_REINFORCEMENT_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_STRIP_REINFORCEMENT_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function verifyThroughExistingCore(): Promise<Json> {
  const targetResults: Json[] = [];
  for (const target of TARGETS) {
    const fixture = ACCEPTANCE_INPUT(target.contextKey);
    const compiled = await COMPILE_FAMILY(
      { ...fixture },
      { catalogId: target.catalogId },
    );
    const steel = compiled.rows.find(
      (row) => row.row_id === "material:reinforcement:steel-approved-schedule",
    );
    invariant(compiled.preliminaryNeeds.length === 0,
      `STOP_STRIP_REINFORCEMENT_CORE_PRELIMINARY:${target.contextKey}`);
    invariant(Number(steel?.quantity) === Number(fixture.approved_reinforcement_schedule_weight_kg),
      `STOP_STRIP_REINFORCEMENT_CORE_WEIGHT:${target.contextKey}`);
    invariant(compiled.totals.unpricedRowCount === compiled.totals.includedRowCount,
      `STOP_STRIP_REINFORCEMENT_CORE_PRICE_STATE:${target.contextKey}`);
    invariant(compiled.rows.some((row) => row.row_id === "work:reinforcement:install-fix")
      && compiled.rows.some((row) => row.row_id === "work:reinforcement:cover-control")
      && compiled.rows.some((row) => row.row_id === "service:reinforcement:inspection")
      && compiled.rows.some((row) => row.row_id === "delivery:reinforcement:steel"),
    `STOP_STRIP_REINFORCEMENT_CORE_SCOPE:${target.contextKey}`);
    targetResults.push({
      contextKey: target.contextKey,
      catalogId: target.catalogId,
      includedRows: compiled.rows.length,
      procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
      approvedScheduleWeightKg: steel?.quantity,
      inputSha256: sha256(fixture),
      compiledSha256: sha256(compiled),
    });
  }
  invariant(new Set(targetResults.map((result) => result.includedRows)).size >= 3,
    "STOP_STRIP_REINFORCEMENT_CONTEXTS_CLONED_BLINDLY");
  const serialized = JSON.stringify({
    resources: RESOURCES,
    formulas: FORMULAS,
  });
  invariant(!serialized.includes(
    "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1",
  ), "STOP_STRIP_REINFORCEMENT_LEGACY_SOURCE");
  invariant(!serialized.includes("q * 95 * 1.05"), "STOP_STRIP_REINFORCEMENT_LEGACY_FORMULA");
  return {
    compilerOwner: "compileCanonicalEstimateCore",
    targetCount: targetResults.length,
    parameterCount: PARAMETERS.length,
    formulaCount: FORMULAS.length,
    resourceDefinitionCount: RESOURCES.length,
    targetResults,
    deterministicSha256: sha256(targetResults),
  };
}

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
  definitionIds: ReadonlyMap<string, string>;
}): Promise<Json> {
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false,
        'stripReinforcementTargetCount',$10::int)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, PARENT_SEARCH_RELEASE_ID,
    input.releaseId, input.fingerprint, TARGETS.length,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
      primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
      catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
      required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
      replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
      normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
      adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
    select $1,source.catalog_id,source.domain_id,source.system_id,source.subsystem_id,source.assembly_id,
      source.work_family_id,source.group_id,source.subgroup_id,source.element_type,source.operation_kind,
      source.technology_variant,source.construction_state,source.primary_uom,source.canonical_name_ru,
      source.aliases,source.normative_classifiers,source.applicability_tags,source.publication_state,
      source.catalog_origin,$2::uuid,source.short_scope_ru,source.key_distinguishing_parameters,
      source.required_inputs_count,source.clarification_fields,source.included_boundaries,
      source.excluded_boundaries,source.replacement_catalog_id,source.normalized_catalog_id,
      source.normalized_canonical_name,source.normalized_aliases,source.normalized_search_terms,
      source.normalized_search_blob,source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,'UTF8'),'sha256'),'hex'),
      source.adjudication_class,source.selectable,source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId, input.releaseId, CONTRACT, PARENT_SEARCH_RELEASE_ID, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);

  const clarificationFields = PARAMETERS.map((parameter) => ({
    parameterId: parameter.parameter_id,
    titleRu: parameter.title_ru,
    unitId: parameter.unit_id,
  }));
  for (const target of TARGETS) {
    const aliases = [
      `армирование ${FAMILY_SUBJECT_RU} ${target.contextRu}`,
      `арматурный каркас ${FAMILY_SUBJECT_RU} ${target.contextRu}`,
      `ведомость стержней FHWA RICS ${target.contextRu}`,
    ];
    const normalizedCanonicalName = normalizeSearchText(target.titleRu);
    const normalizedAliases = aliases.map(normalizeSearchText);
    const normalizedSearchTerms = unique([
      normalizeSearchText(target.catalogId),
      normalizedCanonicalName,
      ...normalizedCanonicalName.split(" "),
      ...normalizedAliases,
      ...normalizedAliases.flatMap((alias) => alias.split(" ")),
    ]);
    const updated = await client.query(`update public.estimate_search_document set
        canonical_name_ru=$3,primary_uom='kg',short_scope_ru=$4,
        included_boundaries=$5::jsonb,excluded_boundaries=$6::jsonb,
        required_inputs_count=$7,clarification_fields=$8::jsonb,
        normative_classifiers=array_append(array_remove(coalesce(normative_classifiers,'{}'::text[]),$9),$9),
        applicability_tags=array_append(array_remove(coalesce(applicability_tags,'{}'::text[]),
          'FULL_QUANTITY_SCOPE_PRICE_PARTIAL'),'FULL_APPLICABLE_SCOPE_PRICE_PARTIAL'),
        source_provenance=source_provenance||jsonb_build_object('productProfileId',$10::text,
          'contextKey',$11::text,'fullApplicableScope',true,'projectScheduleRequired',true),
        aliases=$12::text[],normalized_canonical_name=$13,normalized_aliases=$14::text[],
        normalized_search_terms=$15::text[],normalized_search_blob=$16,
        definition_version_id=$17::uuid,
        document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$3||':'||$17::uuid::text,'UTF8'),'sha256'),'hex')
      where search_release_id=$1 and catalog_id=$2`, [
      input.searchReleaseId,
      target.catalogId,
      target.titleRu,
      `Полная применимая смета армирования ${FAMILY_SUBJECT_RU}: материалы, работы, оборудование, контроль и доставка; ${target.contextRu}.`,
      JSON.stringify([
        "арматурная сталь по утверждённой ведомости стержней без пересчёта из объёма бетона",
        "вязальная проволока, фиксаторы и явно применимые соединительные муфты",
        "изготовление, сборка и монтаж по производственной ведомости",
        "применимое оборудование, инженерный контроль, сертификаты и отдельная доставка",
      ]),
      JSON.stringify([
        "бетон и опалубка как отдельные технологические семейства",
        "автоматическая норма 95 кг/м³, формула d²/162 и скрытый процент отхода",
        "автоматические нормы производительности труда и оборудования",
        "скрытое расстояние доставки и неподтверждённые цены",
      ]),
      clarificationFields.length,
      JSON.stringify(clarificationFields),
      REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
      REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
      target.contextKey,
      aliases,
      normalizedCanonicalName,
      normalizedAliases,
      normalizedSearchTerms,
      normalizedSearchTerms.join("\u001f"),
      input.definitionIds.get(target.catalogId),
    ]);
    invariant(updated.rowCount === 1,
      `STOP_STRIP_REINFORCEMENT_SEARCH_TARGET_MISSING:${target.catalogId}`);
  }
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({
      documentCount: snapshot.documents,
      visibleCount: snapshot.visible,
      reinforcementTargetCount: TARGETS.length,
      parameterCountPerTarget: PARAMETERS.length,
      formulaCountPerTarget: FORMULAS.length,
      resourceDefinitionCountPerTarget: RESOURCES.length,
    }),
  ]);
  return snapshot;
}

async function auditState(
  client: Client,
  releaseId: string,
  searchReleaseId: string,
  definitionIds: ReadonlyMap<string, string>,
): Promise<Json> {
  const ids = [...definitionIds.values()];
  const catalogIds = TARGETS.map((target) => target.catalogId);
  const release = (await client.query(`select id,status,activated_at,definition_count,parameter_count,
      formula_count,resource_row_count,source_manifest_sha256,parent_release_id
    from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json;
  const manifest = (await client.query(`select count(*)::int identities,
      count(*) filter(where catalog_id=any($2::text[]) and definition_version_id=any($3::uuid[]))::int replaced,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [
    releaseId, catalogIds, ids,
  ])).rows[0] as Json;
  const targets = (await client.query(`select definition.id definition_id,definition.catalog_id,
      definition.content_status,definition.content_gate_status,passport.decision,
      (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameters,
      (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formulas,
      (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resources,
      (select count(*)::int from public.estimate_work_normative_binding b where b.definition_version_id=definition.id) bindings,
      (select count(*)::int from public.estimate_resource_spec r
        where r.definition_version_id=definition.id and r.procurement_eligible) procurement_rows,
      (select count(*)::int from public.estimate_resource_spec r
        where r.definition_version_id=definition.id and r.source_metadata::text like
          '%src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1%') forbidden_legacy_rows
    from public.estimate_definition_version definition
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    where definition.id=any($1::uuid[]) order by definition.catalog_id`, [ids])).rows as Json[];
  const search = (await client.query(`select count(*)::int targets,
      count(*) filter(where required_inputs_count=$4 and selectable
        and definition_version_id=any($3::uuid[]))::int valid,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1) documents,
      (select count(*)::int from public.estimate_search_document
        where search_release_id=$1 and selectable and adjudication_class='EFFECTIVE_WORK') visible,
      (select snapshot_sha256 from public.estimate_search_index_release where id=$1) snapshot_sha256
    from public.estimate_search_document
    where search_release_id=$1 and catalog_id=any($2::text[])`, [
    searchReleaseId, catalogIds, ids, PARAMETERS.length,
  ])).rows[0] as Json;
  return { release, manifest, targets, search };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_STRIP_REINFORCEMENT_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_STRIP_REINFORCEMENT_MASTER_SHA256_DRIFT");
  invariant(existsSync(RESIDUAL_SUMMARY_PATH), "STOP_STRIP_REINFORCEMENT_RESIDUAL_MISSING");
  const residual = JSON.parse(readFileSync(RESIDUAL_SUMMARY_PATH, "utf8")) as Json;
  invariant(residual.receipt_sha256 === RESIDUAL_RECEIPT_SHA256
    && residual.candidate?.definition_release_id === PARENT_RELEASE_ID
    && residual.candidate?.search_release_id === PARENT_SEARCH_RELEASE_ID
    && residual.current_residual?.legacy_pack_source_id_count === 8,
  "STOP_STRIP_REINFORCEMENT_RESIDUAL_DRIFT");
  invariant(TARGETS.length === 7 && new Set(TARGETS.map((target) => target.catalogId)).size === 7,
    "STOP_STRIP_REINFORCEMENT_TARGET_SET");
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_STRIP_REINFORCEMENT_SOURCE_MISSING:${path}`);
    if (!SLAB_FOUNDATION_MODE && !CONCRETE_SLAB_MODE && !PILE_CAP_MODE && !PEDESTAL_MODE && !STAIRS_MODE && !REINFORCEMENT_FRAME_MODE && !REINFORCEMENT_FRAME_ASSEMBLY_MODE && !COLUMN_BASE_MODE && !ANCHOR_GROUP_REINFORCEMENT_MODE && !BELT_REINFORCEMENT_MODE && !JOINT_REINFORCEMENT_MODE && !FORMWORK_REINFORCEMENT_MODE) {
      invariant(git("diff", "--name-only", "HEAD", "--", path) === "",
        `STOP_STRIP_REINFORCEMENT_SOURCE_UNCOMMITTED:${path}`);
    }
  }

  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const dirtyOverlaySha256 = sha256({ head, sourceHashes });
  const coreAcceptance = await verifyThroughExistingCore();
  const parameterSchemaSha256 = sha256(PARAMETERS.map((parameter) => ({
    id: parameter.parameter_id,
    type: parameter.value_type,
    unit: parameter.unit_id,
    required: parameter.required,
    constraints: parameter.constraints_json,
  })));
  const definitionSchemaSha256 = sha256({
    parameters: PARAMETERS,
    formulas: FORMULAS,
    resources: RESOURCES,
  });
  const fingerprint = sha256({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
    head,
    tree,
    parentReleaseId: PARENT_RELEASE_ID,
    parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
    sourceHashes,
    dirtyOverlaySha256,
    parameterSchemaSha256,
    definitionSchemaSha256,
    coreAcceptance,
    targets: TARGETS,
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const releaseKey = `r4-a13-6-${FORMWORK_REINFORCEMENT_MODE ? "formwork" : JOINT_REINFORCEMENT_MODE ? "joint" : BELT_REINFORCEMENT_MODE ? "belt" : ANCHOR_GROUP_REINFORCEMENT_MODE ? "anchor-group" : COLUMN_BASE_MODE ? "column-base" : REINFORCEMENT_FRAME_ASSEMBLY_MODE ? "reinforcement-frame-assembly" : REINFORCEMENT_FRAME_MODE ? "reinforcement-frame" : STAIRS_MODE ? "stairs" : PEDESTAL_MODE ? "pedestal" : PILE_CAP_MODE ? "pile-cap" : CONCRETE_SLAB_MODE ? "concrete-slab" : SLAB_FOUNDATION_MODE ? "slab" : "strip"}-reinforcement-${fingerprint.slice(0, 16)}`;
  const definitionIds = new Map(TARGETS.map((target) => [
    target.catalogId,
    uuid(`${CONTRACT}:${fingerprint}:${target.catalogId}:definition`),
  ]));
  const baselineIds = new Map(TARGETS.map((target) => [
    target.catalogId,
    uuid(`${CONTRACT}:${fingerprint}:${target.catalogId}:baseline`),
  ]));
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false,
    "STOP_STRIP_REINFORCEMENT_CURRENT_PRODUCTION_ACCESS_FLAG");
  invariant(
    (current.definitionReleaseId === PARENT_RELEASE_ID
      && current.searchReleaseId === PARENT_SEARCH_RELEASE_ID)
      || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    `STOP_STRIP_REINFORCEMENT_CURRENT_RELEASE_DRIFT:${current.definitionReleaseId}:${current.searchReleaseId}`,
  );

  const formulaConsumers = Object.fromEntries(PARAMETERS.map((parameter) => [
    parameter.parameter_id,
    FORMULAS
      .filter((formula) => formula.input_parameter_ids.includes(parameter.parameter_id))
      .map((formula) => formula.formula_id),
  ]));
  const resourceConsumers = Object.fromEntries(PARAMETERS.map((parameter) => [
    parameter.parameter_id,
    RESOURCES
      .filter((resource) => formulaConsumers[parameter.parameter_id].includes(resource.formula_id)
        || JSON.stringify(resource.resource_graph).includes(`\"${parameter.parameter_id}\"`)
        || JSON.stringify(resource.inclusion_ast).includes(`\"${parameter.parameter_id}\"`)
        || (NORMATIVE_PARAMETER_IDS.has(parameter.parameter_id)
          && resource.row_id === "material:reinforcement:steel-approved-schedule"))
      .map((resource) => resource.row_id),
  ]));
  const passportRepresentative = {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      "арматурная сталь по утверждённой ведомости стержней FHWA/RICS",
      "вязальная проволока, фиксаторы и явно применимые механические соединения",
      "изготовление, сборка, монтаж и контроль по проектной производственной ведомости",
      "применимое оборудование, сертификаты и отдельная доставка",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  };

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: `r4-a13-6-${FORMWORK_REINFORCEMENT_MODE ? "formwork" : JOINT_REINFORCEMENT_MODE ? "joint" : BELT_REINFORCEMENT_MODE ? "belt" : ANCHOR_GROUP_REINFORCEMENT_MODE ? "anchor-group" : COLUMN_BASE_MODE ? "column-base" : REINFORCEMENT_FRAME_ASSEMBLY_MODE ? "reinforcement-frame-assembly" : REINFORCEMENT_FRAME_MODE ? "reinforcement-frame" : STAIRS_MODE ? "stairs" : PEDESTAL_MODE ? "pedestal" : PILE_CAP_MODE ? "pile-cap" : CONCRETE_SLAB_MODE ? "concrete-slab" : SLAB_FOUNDATION_MODE ? "slab-foundation" : "strip-foundation"}-reinforcement-family-successor`,
  });
  await client.connect();
  let receipt: Json;
  try {
    const parent = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [PARENT_RELEASE_ID],
    )).rows[0] as Json;
    const parentSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [PARENT_SEARCH_RELEASE_ID],
    )).rows[0] as Json;
    invariant(parent?.status === "prepared" && Number(parent.definition_count) === 10_331,
      "STOP_STRIP_REINFORCEMENT_PARENT_RELEASE_DRIFT");
    invariant(parentSearch?.status === "draft", "STOP_STRIP_REINFORCEMENT_PARENT_SEARCH_DRIFT");
    const existing = (await client.query(
      "select id,status,activated_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared" && existing.activated_at == null,
        "STOP_STRIP_REINFORCEMENT_EXISTING_SUCCESSOR_STATE_DRIFT");
      const audit = await auditState(client, releaseId, searchReleaseId, definitionIds);
      receipt = {
        status: `GREEN_${FAMILY_STATUS}_ALREADY_PREPARED_NOT_ACTIVE`,
        idempotent: true,
        mutationPerformed: false,
        successor: { releaseId, searchReleaseId, releaseKey },
        coreAcceptance,
        audit,
      };
    } else {
      const parentTargets = (await client.query(`select manifest.*,
          definition.definition_version,definition.passport,definition.applicability,definition.source_metadata,
          (select count(*)::int from public.estimate_parameter_definition p
            where p.definition_version_id=manifest.definition_version_id) parameters,
          (select count(*)::int from public.estimate_formula_graph f
            where f.definition_version_id=manifest.definition_version_id) formulas,
          (select count(*)::int from public.estimate_resource_spec r
            where r.definition_version_id=manifest.definition_version_id) resources
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
        where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
        order by manifest.catalog_id`, [
        PARENT_RELEASE_ID, TARGETS.map((target) => target.catalogId),
      ])).rows as Json[];
      invariant(parentTargets.length === TARGETS.length,
        `STOP_STRIP_REINFORCEMENT_PARENT_TARGETS:${parentTargets.length}`);
      const parentByCatalog = new Map(parentTargets.map((target) => [String(target.catalog_id), target]));
      const lineageByCatalog = new Map<string, Awaited<ReturnType<typeof resolveCanonicalApprovedBaselineLeaf>>>();
      for (const target of TARGETS) {
        const old = parentByCatalog.get(target.catalogId);
        invariant(old, `STOP_STRIP_REINFORCEMENT_PARENT_TARGET_MISSING:${target.catalogId}`);
        lineageByCatalog.set(target.catalogId, await resolveCanonicalApprovedBaselineLeaf(
          client,
          String(old.approved_template_baseline_id),
          target.catalogId,
        ));
      }
      const locator = (await client.query(`select locator.id::text locator_id,locator.locator,source.source_key
        from public.estimate_normative_locator locator
        join public.estimate_normative_source source on source.id=locator.source_id
        where source.source_key=$1 order by locator.id`, [REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID])).rows[0] as Json;
      invariant(locator?.locator_id, "STOP_STRIP_REINFORCEMENT_NORMATIVE_LOCATOR_MISSING");

      const nextCounts = {
        definitions: Number(parent.definition_count),
        parameters: Number(parent.parameter_count) + TARGETS.reduce((sum, target) =>
          sum + PARAMETERS.length
            - Number(parentByCatalog.get(target.catalogId)?.parameters), 0),
        formulas: Number(parent.formula_count) + TARGETS.reduce((sum, target) =>
          sum + FORMULAS.length
            - Number(parentByCatalog.get(target.catalogId)?.formulas), 0),
        resources: Number(parent.resource_row_count) + TARGETS.reduce((sum, target) =>
          sum + RESOURCES.length
            - Number(parentByCatalog.get(target.catalogId)?.resources), 0),
      };
      const parameterRows = PARAMETERS.map((parameter) => ({ ...parameter }));
      const formulaRows = FORMULAS.map((formula) => ({
        ...formula,
        ast_sha256: sha256(formula.ast),
      }));
      const resourceRows = RESOURCES.map((resource) => ({
        ...resource,
        row_type: resourceRowType(resource.category),
      }));
      const steelOwner = resourceRows.find(
        (resource) => resource.row_id === "material:reinforcement:steel-approved-schedule",
      );
      invariant(steelOwner, "STOP_STRIP_REINFORCEMENT_NORMATIVE_OWNER_MISSING");
      const bindingRows = [{
        row_id: steelOwner.row_id,
        locator_id: locator.locator_id,
        applicability: {
          ...((steelOwner.resource_graph as Json).professionalPhysicalNormBindingV1 as Json),
          norm_id: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
          source_document_version: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_document_version,
          source_definition_hash: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.definition_hash,
          exact_locator: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.exact_locator,
        },
      }];

      const plannedTargets = [];
      for (const target of TARGETS) {
        const old = parentByCatalog.get(target.catalogId)!;
        const lineage = lineageByCatalog.get(target.catalogId)!;
        const fixture = ACCEPTANCE_INPUT(target.contextKey);
        const definitionId = definitionIds.get(target.catalogId)!;
        const baselineId = baselineIds.get(target.catalogId)!;
        const nextDefinitionVersion = Number((await client.query(
          "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
          [target.catalogId],
        )).rows[0].value);
        const targetCoreAcceptance = coreAcceptance.targetResults.find(
          (result: Json) => result.catalogId === target.catalogId,
        );
        const acceptanceEvidenceSha256 = sha256({
          contract: CONTRACT,
          residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
          target,
          fixture,
          targetCoreAcceptance,
          parameterSchemaSha256,
          definitionSchemaSha256,
          lineage,
        });
        const targetDefinitionSha256 = sha256({
          contract: CONTRACT,
          target,
          parameterSchemaSha256,
          definitionSchemaSha256,
        });
        const baselineRepresentative = {
          parameter_schema_sha256: parameterSchemaSha256,
          input_values: fixture,
          input_classification: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id,
            NORMATIVE_PARAMETER_IDS.has(parameter.parameter_id) ? "NORMATIVE" : "VALIDATION_FIXTURE",
          ])),
          uom_by_parameter: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id, parameter.unit_id,
          ])),
          formula_consumer_ids: formulaConsumers,
          resource_consumer_row_ids: resourceConsumers,
          normative_source_ids: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id,
            NORMATIVE_PARAMETER_IDS.has(parameter.parameter_id)
              ? [REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID]
              : [],
          ])),
          guide_provenance_ru: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id,
            String((parameter.truth_metadata.guide as Json).guide_short_ru),
          ])),
          proposal_source_refs: [{
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
            sourceUrl: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_url,
            exactLocator: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.exact_locator,
          }],
          contract_version: BASELINE_CONTRACT,
        };
        const plan = createCanonicalDefinitionClonePlan({
          contract: CONTRACT,
          definition: {
            id: definitionId,
            releaseId,
            catalogId: target.catalogId,
            definitionVersion: nextDefinitionVersion,
            passport: {
              catalogId: target.catalogId,
              canonicalRuName: target.titleRu,
              workKey: target.catalogId.split(":").at(-1),
              physicalResultRu: `Полная применимая смета армирования ${FAMILY_SUBJECT_RU}: ${target.contextRu}`,
              exactNormId: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
            },
            applicability: {
              country: "KG",
              operationClass: "REINFORCEMENT_FULL_APPLICABLE_SCOPE",
              materialSystem: "APPROVED_REINFORCEMENT_BAR_SCHEDULE",
              productProfileId: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              projectScheduleRequired: true,
              conditionalScopeFailClosed: true,
            },
            definitionSha256: targetDefinitionSha256,
            sourceMetadata: {
              contract: CONTRACT,
              predecessorDefinitionId: old.definition_version_id,
              predecessorBaselineLeafId: lineage.baselineId,
              parameterSchemaSha256,
              definitionSchemaSha256,
              acceptanceEvidenceSha256,
              residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
              normativeSourceIds: [REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID],
              synthetic: false,
              fullApplicableScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
            },
          },
          representative: {
            parameters: parameterRows,
            formulas: formulaRows,
            resources: resourceRows,
            bindings: bindingRows,
            baseline: baselineRepresentative,
            passport: passportRepresentative,
          },
          parameterTruthMetadata: (parameter) => ({
            ...parameter.truth_metadata,
            contract: CONTRACT,
            semantic_parameter_key: `${target.catalogId}:${parameter.parameter_id}`,
            formula_consumers: formulaConsumers[parameter.parameter_id],
            resource_branch_consumers: resourceConsumers[parameter.parameter_id],
          }),
          resourceId: (resource) => uuid(
            `${CONTRACT}:${fingerprint}:${target.catalogId}:resource:${resource.row_id}`,
          ),
          resourceSemanticOwner: (resource) => `${target.catalogId}:${resource.row_id}`,
          resourceSha256: (resource) => sha256({ contract: CONTRACT, targetCatalogId: target.catalogId, resource }),
          baseline: {
            id: baselineId,
            key: `${CONTRACT}:${fingerprint.slice(0, 16)}:${target.catalogId}`,
            sourceDefinitionVersionId: lineage.definitionVersionId,
            validationScenarioRefs: [{
              scenario: `${FAMILY_STATUS}_${target.contextKey.toUpperCase()}`,
              fixture,
              acceptanceEvidenceSha256,
              targetCoreAcceptance,
            }],
            acceptanceEvidenceSha256,
            acceptedReleaseId: releaseId,
            supersedesBaselineId: lineage.baselineId,
          },
          passport: {
            physicalResultRu: target.titleRu,
            excludedScopeRu: [
              "бетон и опалубка, принадлежащие отдельным технологическим семействам",
              "универсальная норма 95 кг/м³ и автоматическая формула массы d²/162",
              "автоматически выдуманная производительность труда или оборудования",
              "цены без коммерческого снимка и скрытое расстояние доставки",
            ],
            decision: {
              contract: CONTENT_PASSPORT_CONTRACT,
              status: "GREEN",
              allowed: true,
              waveContract: CONTRACT,
              quantityScope: "FULL",
              priceState: "PARTIAL_NEEDS_PRICE",
              activationAllowed: false,
              productionEligible: false,
            },
            payloadSha256: sha256({ targetDefinitionSha256, acceptanceEvidenceSha256 }),
            sourceHead: head,
            sourceTree: tree,
          },
          bindingApplicability: (binding) => ({
            ...binding.applicability,
            context_key: target.contextKey,
          }),
          expectedNormativeBindingCount: 1,
        });
        plannedTargets.push({
          target,
          old,
          lineage,
          definitionId,
          baselineId,
          nextDefinitionVersion,
          targetDefinitionSha256,
          acceptanceEvidenceSha256,
          plan,
        });
      }
      const publisherPreflight = await preflightCanonicalDefinitionPublishPlans(
        client,
        plannedTargets.map((target) => target.plan),
      );

      if (!APPLY) {
        receipt = {
          status: `DRY_RUN_${FAMILY_STATUS}_VALIDATED`,
          idempotent: false,
          mutationPerformed: false,
          residual: {
            path: RESIDUAL_SUMMARY_PATH,
            receiptSha256: RESIDUAL_RECEIPT_SHA256,
            unresolvedSourceIdsBefore: residual.current_residual.unresolved_normative_source_id_count,
            legacyPackSourceIdsBefore: residual.current_residual.legacy_pack_source_id_count,
          },
          predecessor: {
            releaseId: PARENT_RELEASE_ID,
            searchReleaseId: PARENT_SEARCH_RELEASE_ID,
            targets: parentTargets.map((target) => ({
              catalogId: target.catalog_id,
              definitionId: target.definition_version_id,
              shape: [Number(target.parameters), Number(target.formulas), Number(target.resources)],
            })),
          },
          successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
          coreAcceptance,
          publisherPreflight,
        };
      } else {
        await client.query("begin");
        await client.query("set local lock_timeout='5s'");
        await client.query("set local statement_timeout='600s'");
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
        try {
          await client.query(`insert into public.estimate_definition_release(
              id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
              definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
              parameter_count,formula_count)
            select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,metadata||$8::jsonb,$9,$10,$11,$12
            from public.estimate_definition_release where id=$9`, [
            releaseId,
            releaseKey,
            head,
            tree,
            sha256(`${CONTRACT}:${fingerprint}:draft`),
            nextCounts.definitions,
            nextCounts.resources,
            JSON.stringify({
              contract: CONTRACT,
              masterSha256: MASTER_SHA256,
              residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
              lifecycle: "DRAFT_FORWARD_ONLY",
              replacedDefinitionCount: TARGETS.length,
              activationAllowed: false,
              productionEligible: false,
              fullApplicableScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
            }),
            PARENT_RELEASE_ID,
            sha256({ contract: CONTRACT, fingerprint, definitionSchemaSha256 }),
            nextCounts.parameters,
            nextCounts.formulas,
          ]);
          await client.query(`insert into public.estimate_cumulative_manifest_entry(
              release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
              publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
              definition_hash,entry_sha256,runtime_publication_state)
            select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
              publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
              encode(extensions.digest(convert_to($2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),
              runtime_publication_state
            from public.estimate_cumulative_manifest_entry where release_id=$3`, [
            releaseId, CONTRACT, PARENT_RELEASE_ID,
          ]);
          const perTargetAudit: Json[] = [];
          for (const planned of plannedTargets) {
            const persisted = await publishCanonicalDefinitionDraft(client, planned.plan);
            await client.query(`update public.estimate_cumulative_manifest_entry set
                definition_version_id=$3,source_batch=$4,source_release_id=$1,
                publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$5,
                baseline_ready=true,scenario_ready=true,definition_hash=$6,entry_sha256=$7,
                runtime_publication_state='CANDIDATE'
              where release_id=$1 and catalog_id=$2`, [
              releaseId,
              planned.target.catalogId,
              planned.definitionId,
              CONTRACT,
              planned.baselineId,
              planned.targetDefinitionSha256,
              sha256({
                contract: CONTRACT,
                releaseId,
                catalogId: planned.target.catalogId,
                definitionId: planned.definitionId,
                baselineId: planned.baselineId,
                targetDefinitionSha256: planned.targetDefinitionSha256,
              }),
            ]);
            perTargetAudit.push({
              catalogId: planned.target.catalogId,
              contextKey: planned.target.contextKey,
              predecessorDefinitionId: planned.old.definition_version_id,
              predecessorBaselineLeafId: planned.lineage.baselineId,
              definitionId: planned.definitionId,
              baselineId: planned.baselineId,
              definitionVersion: planned.nextDefinitionVersion,
              acceptanceEvidenceSha256: planned.acceptanceEvidenceSha256,
              publisherPersistedSelfAudit: persisted,
            });
          }
          const searchSnapshot = await cloneSearch(client, {
            releaseId, searchReleaseId, releaseKey, head, tree, fingerprint, definitionIds,
          });
          const audit = await auditState(client, releaseId, searchReleaseId, definitionIds);
          invariant(Number(audit.manifest.identities) === nextCounts.definitions
            && Number(audit.manifest.replaced) === TARGETS.length,
          `STOP_STRIP_REINFORCEMENT_MANIFEST_AUDIT:${JSON.stringify(audit.manifest)}`);
          invariant(audit.targets.length === TARGETS.length && audit.targets.every((target: Json) =>
            target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN"
            && target.decision?.quantityScope === "FULL" && target.decision?.priceState === "PARTIAL_NEEDS_PRICE"
            && Number(target.parameters) === PARAMETERS.length
            && Number(target.formulas) === FORMULAS.length
            && Number(target.resources) === RESOURCES.length
            && Number(target.bindings) === 1 && Number(target.procurement_rows) === 10
            && Number(target.forbidden_legacy_rows) === 0),
          `STOP_STRIP_REINFORCEMENT_TARGET_AUDIT:${JSON.stringify(audit.targets)}`);
          invariant(Number(audit.search.targets) === TARGETS.length
            && Number(audit.search.valid) === TARGETS.length
            && Number(audit.search.documents) === 10_322
            && Number(audit.search.visible) === 10_322,
          `STOP_STRIP_REINFORCEMENT_SEARCH_AUDIT:${JSON.stringify(audit.search)}`);
          const unrelated = (await client.query(`select count(*)::int changed
            from public.estimate_cumulative_manifest_entry parent
            join public.estimate_cumulative_manifest_entry successor using(catalog_id)
            where parent.release_id=$1 and successor.release_id=$2
              and parent.catalog_id<>all($3::text[])
              and (parent.definition_version_id<>successor.definition_version_id
                or parent.source_batch<>successor.source_batch
                or parent.source_release_id<>successor.source_release_id
                or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
                or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
            PARENT_RELEASE_ID, releaseId, TARGETS.map((target) => target.catalogId),
          ])).rows[0] as Json;
          invariant(Number(unrelated.changed) === 0,
            `STOP_STRIP_REINFORCEMENT_UNRELATED_MANIFEST_DRIFT:${unrelated.changed}`);
          await client.query(`update public.estimate_definition_release
            set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
              metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
            releaseId,
            audit.manifest.snapshot,
            JSON.stringify({
              lifecycle: "PREPARED_NOT_ACTIVE",
              searchReleaseId,
              searchSnapshotSha256: searchSnapshot.snapshot_sha256,
              reinforcementTargetCount: TARGETS.length,
              sourceCoreAcceptanceSha256: coreAcceptance.deterministicSha256,
              residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
              parameterCountPerTarget: PARAMETERS.length,
              formulaCountPerTarget: FORMULAS.length,
              resourceDefinitionCountPerTarget: RESOURCES.length,
              priceState: "PARTIAL_NEEDS_PRICE",
            }),
          ]);
          const preparedAudit = await auditState(client, releaseId, searchReleaseId, definitionIds);
          invariant(preparedAudit.release?.status === "prepared"
            && preparedAudit.release?.activated_at == null,
          `STOP_STRIP_REINFORCEMENT_FINAL_RELEASE_LIFECYCLE:${JSON.stringify(preparedAudit.release)}`);
          await client.query("commit");
          receipt = {
            status: `GREEN_${FAMILY_STATUS}_PREPARED_NOT_ACTIVE`,
            idempotent: false,
            mutationPerformed: true,
            residual: {
              path: RESIDUAL_SUMMARY_PATH,
              receiptSha256: RESIDUAL_RECEIPT_SHA256,
              unresolvedSourceIdsBefore: residual.current_residual.unresolved_normative_source_id_count,
              legacyPackSourceIdsBefore: residual.current_residual.legacy_pack_source_id_count,
            },
            predecessor: { releaseId: PARENT_RELEASE_ID, searchReleaseId: PARENT_SEARCH_RELEASE_ID },
            successor: {
              releaseId,
              searchReleaseId,
              releaseKey,
              nextCounts,
              targets: perTargetAudit,
            },
            coreAcceptance,
            publisherPreflight,
            audit: { ...preparedAudit, unrelatedManifestChanges: Number(unrelated.changed) },
          };
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      }
    }
  } finally {
    await client.end();
  }

  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: { branch: EXPECTED_BRANCH, head, tree, fingerprint, sourceHashes },
    masterSha256: MASTER_SHA256,
    targetCatalogIds: TARGETS.map((target) => target.catalogId),
    canonicalCompilerOwner: "compileCanonicalEstimateCore",
    canonicalPublisherOwner: "canonicalDefinitionPublisherR1",
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && receipt!.mutationPerformed === true) {
    atomicJson(resolve(OUTPUT_ROOT, `01_${FAMILY_STATUS}_${head}.json`), sealed);
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      currentRuntimeDefinitions: 10_331,
      owner: `EXACT_${FAMILY_STATUS}_FAMILY_SUCCESSOR`,
      productionAccessed: false,
      fakeGreenClaimed: false,
    });
  }
  process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
