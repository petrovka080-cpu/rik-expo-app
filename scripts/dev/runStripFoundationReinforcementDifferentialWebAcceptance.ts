import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

import {
  stripFoundationReinforcementPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1";
import {
  STRIP_FOUNDATION_REINFORCEMENT_TARGETS,
  stripFoundationReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stripFoundationReinforcementR1";
import {
  SLAB_FOUNDATION_REINFORCEMENT_TARGETS,
  slabFoundationReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/slabFoundationReinforcementR1";
import {
  CONCRETE_SLAB_REINFORCEMENT_TARGETS,
  concreteSlabReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabReinforcementR1";
import {
  PILE_CAP_REINFORCEMENT_TARGETS,
  pileCapReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pileCapReinforcementR1";
import {
  PEDESTAL_REINFORCEMENT_TARGETS,
  pedestalReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pedestalReinforcementR1";
import {
  STAIRS_REINFORCEMENT_TARGETS,
  stairsReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stairsReinforcementR1";
import {
  REINFORCEMENT_FRAME_ASSEMBLY_TARGETS,
  REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS,
  reinforcementFrameAssemblyAcceptanceInputR1,
  reinforcementFrameReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/reinforcementFrameReinforcementR1";
import {
  COLUMN_BASE_REINFORCEMENT_TARGETS,
  columnBaseReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/columnBaseReinforcementR1";
import {
  ANCHOR_GROUP_REINFORCEMENT_TARGETS,
  anchorGroupReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/anchorGroupReinforcementR1";
import {
  BELT_REINFORCEMENT_TARGETS,
  beltReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/beltReinforcementR1";
import {
  JOINT_REINFORCEMENT_TARGETS,
  jointReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/jointReinforcementR1";
import {
  FORMWORK_REINFORCEMENT_TARGETS,
  formworkReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/formworkReinforcementR1";
import {
  anchorGroupInstallationPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/anchorGroupInstallationProductionBindingR1";
import {
  ANCHOR_GROUP_INSTALLATION_TARGETS,
  ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
  anchorGroupInstallationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/anchorGroupInstallationR1";
import {
  CONCRETE_SLAB_VIBRATION_NORM_ID,
  CONCRETE_SLAB_VIBRATION_SOURCE_ID,
  CONCRETE_SLAB_VIBRATION_TARGETS,
  concreteSlabVibrationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabVibrationR1";
import {
  CONCRETE_SLAB_CURING_NORM_ID,
  CONCRETE_SLAB_CURING_SOURCE_ID,
  CONCRETE_SLAB_CURING_TARGETS,
  concreteSlabCuringAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabCuringR1";
import {
  CONCRETE_SLAB_LEVELING_NORM_ID,
  CONCRETE_SLAB_LEVELING_SOURCE_ID,
  CONCRETE_SLAB_LEVELING_TARGETS,
  concreteSlabLevelingAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabLevelingR1";
import {
  CONCRETE_SLAB_REPAIR_NORM_ID,
  CONCRETE_SLAB_REPAIR_SOURCE_ID,
  CONCRETE_SLAB_REPAIR_TARGETS,
  concreteSlabRepairAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabRepairR1";
import {
  CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID,
  CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID,
  CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS,
  concreteSlabEmbeddedItemsAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1";
import {
  concreteSlabCuringPromptDetailsR1,
  concreteSlabEmbeddedItemsPromptDetailsR1,
  concreteSlabLevelingPromptDetailsR1,
  concreteSlabRepairPromptDetailsR1,
  concreteSlabVibrationPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";

type Json = Record<string, any>;

const IS_ANCHOR = process.env.R4A13_ACCEPTANCE_FAMILY === "anchor-group";
const IS_SLAB_FOUNDATION = process.env.R4A13_ACCEPTANCE_FAMILY === "slab-foundation-reinforcement";
const IS_CONCRETE_SLAB = process.env.R4A13_ACCEPTANCE_FAMILY === "concrete-slab-reinforcement";
const IS_PILE_CAP = process.env.R4A13_ACCEPTANCE_FAMILY === "pile-cap-reinforcement";
const IS_PEDESTAL = process.env.R4A13_ACCEPTANCE_FAMILY === "pedestal-reinforcement";
const IS_STAIRS = process.env.R4A13_ACCEPTANCE_FAMILY === "stairs-reinforcement";
const IS_REINFORCEMENT_FRAME = process.env.R4A13_ACCEPTANCE_FAMILY === "reinforcement-frame-reinforcement";
const IS_REINFORCEMENT_FRAME_ASSEMBLY = process.env.R4A13_ACCEPTANCE_FAMILY === "reinforcement-frame-assembly";
const IS_COLUMN_BASE = process.env.R4A13_ACCEPTANCE_FAMILY === "column-base-reinforcement";
const IS_ANCHOR_GROUP_REINFORCEMENT = process.env.R4A13_ACCEPTANCE_FAMILY === "anchor-group-reinforcement";
const IS_BELT_REINFORCEMENT = process.env.R4A13_ACCEPTANCE_FAMILY === "belt-reinforcement";
const IS_JOINT_REINFORCEMENT = process.env.R4A13_ACCEPTANCE_FAMILY === "joint-reinforcement";
const IS_FORMWORK_REINFORCEMENT = process.env.R4A13_ACCEPTANCE_FAMILY === "formwork-reinforcement";
const IS_CONCRETE_SLAB_VIBRATION = process.env.R4A13_ACCEPTANCE_FAMILY === "concrete-slab-vibration";
const IS_CONCRETE_SLAB_CURING = process.env.R4A13_ACCEPTANCE_FAMILY === "concrete-slab-curing";
const IS_CONCRETE_SLAB_LEVELING = process.env.R4A13_ACCEPTANCE_FAMILY === "concrete-slab-leveling";
const IS_CONCRETE_SLAB_REPAIR = process.env.R4A13_ACCEPTANCE_FAMILY === "concrete-slab-repair";
const IS_CONCRETE_SLAB_EMBEDDED_ITEMS =
  process.env.R4A13_ACCEPTANCE_FAMILY === "concrete-slab-embedded-items";
const IS_CONCRETE_SLAB_OPERATION = IS_CONCRETE_SLAB_VIBRATION
  || IS_CONCRETE_SLAB_CURING
  || IS_CONCRETE_SLAB_LEVELING
  || IS_CONCRETE_SLAB_REPAIR
  || IS_CONCRETE_SLAB_EMBEDDED_ITEMS;
const CONTRACT = IS_CONCRETE_SLAB_VIBRATION
  ? "rik-expo-app.r4-a13-6.concrete-slab-vibration.differential-web.v1"
  : IS_CONCRETE_SLAB_CURING
  ? "rik-expo-app.r4-a13-6.concrete-slab-curing.differential-web.v1"
  : IS_CONCRETE_SLAB_LEVELING
  ? "rik-expo-app.r4-a13-6.concrete-slab-leveling.differential-web.v1"
  : IS_CONCRETE_SLAB_REPAIR
  ? "rik-expo-app.r4-a13-6.concrete-slab-repair.differential-web.v1"
  : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
  ? "rik-expo-app.r4-a13-6.concrete-slab-embedded-items.differential-web.v1"
  : IS_ANCHOR
  ? "rik-expo-app.r4-a13-6.anchor-group-installation.differential-web.v1"
  : IS_FORMWORK_REINFORCEMENT
    ? "rik-expo-app.r4-a13-6.formwork-reinforcement.differential-web.v1"
  : IS_JOINT_REINFORCEMENT
    ? "rik-expo-app.r4-a13-6.joint-reinforcement.differential-web.v1"
  : IS_BELT_REINFORCEMENT
    ? "rik-expo-app.r4-a13-6.belt-reinforcement.differential-web.v1"
  : IS_ANCHOR_GROUP_REINFORCEMENT
    ? "rik-expo-app.r4-a13-6.anchor-group-reinforcement.differential-web.v1"
  : IS_COLUMN_BASE
    ? "rik-expo-app.r4-a13-6.column-base-reinforcement.differential-web.v1"
  : IS_REINFORCEMENT_FRAME_ASSEMBLY
    ? "rik-expo-app.r4-a13-6.reinforcement-frame-assembly.differential-web.v1"
  : IS_REINFORCEMENT_FRAME
    ? "rik-expo-app.r4-a13-6.reinforcement-frame-reinforcement.differential-web.v1"
  : IS_STAIRS
    ? "rik-expo-app.r4-a13-6.stairs-reinforcement.differential-web.v1"
  : IS_PEDESTAL
    ? "rik-expo-app.r4-a13-6.pedestal-reinforcement.differential-web.v1"
  : IS_PILE_CAP
    ? "rik-expo-app.r4-a13-6.pile-cap-reinforcement.differential-web.v1"
  : IS_CONCRETE_SLAB
    ? "rik-expo-app.r4-a13-6.concrete-slab-reinforcement.differential-web.v1"
  : IS_SLAB_FOUNDATION
    ? "rik-expo-app.r4-a13-6.slab-foundation-reinforcement.differential-web.v1"
    : "rik-expo-app.r4-a13-6.strip-foundation-reinforcement.differential-web.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT_ROOT = resolve(
  IS_CONCRETE_SLAB_VIBRATION
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-vibration-family-differential-web"
    : IS_CONCRETE_SLAB_CURING
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-curing-family-differential-web"
    : IS_CONCRETE_SLAB_LEVELING
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-leveling-family-differential-web"
    : IS_CONCRETE_SLAB_REPAIR
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-repair-family-differential-web"
    : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-embedded-items-family-differential-web"
    : IS_ANCHOR
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-installation-family-web"
    : IS_FORMWORK_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-reinforcement-family-differential-web"
    : IS_JOINT_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/joint-reinforcement-family-differential-web"
    : IS_BELT_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-reinforcement-family-differential-web"
    : IS_ANCHOR_GROUP_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-reinforcement-family-differential-web"
    : IS_COLUMN_BASE
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-reinforcement-family-differential-web"
    : IS_REINFORCEMENT_FRAME_ASSEMBLY
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-assembly-family-differential-web"
    : IS_REINFORCEMENT_FRAME
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-reinforcement-family-differential-web"
    : IS_STAIRS
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/stairs-reinforcement-family-differential-web"
    : IS_PEDESTAL
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-reinforcement-family-differential-web"
    : IS_PILE_CAP
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-reinforcement-family-differential-web"
    : IS_CONCRETE_SLAB
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-reinforcement-family-differential-web"
    : IS_SLAB_FOUNDATION
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/slab-foundation-reinforcement-family-differential-web"
      : ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-differential-web",
);
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const RED_DIAGNOSTICS_OUTPUT = resolve(OUTPUT_ROOT, "diagnostics-red.json");
const RELEASE_ID = IS_CONCRETE_SLAB_VIBRATION
  ? "37491173-bdce-5137-bc55-6cba4ce15768"
  : IS_CONCRETE_SLAB_CURING
  ? "f185fb75-7334-5d7d-a9b6-793d34e8cc24"
  : IS_CONCRETE_SLAB_LEVELING
  ? "e7f064fb-f5b5-5972-b64c-845183b69a29"
  : IS_CONCRETE_SLAB_REPAIR
  ? "3ad40dd2-36b5-5427-92d2-52a805a272b3"
  : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
  ? "7bcb6a0c-9b9b-58ee-92f5-fb41e6ac8abf"
  : IS_ANCHOR
  ? "80c3ba4b-3d04-5947-b17d-5fb05bcf2bae"
  : IS_FORMWORK_REINFORCEMENT
    ? "e30a5747-fbf9-5f0d-b5b8-f4eedb2a0772"
  : IS_JOINT_REINFORCEMENT
    ? "80fc4afc-6531-583b-966b-7828d4e10ae5"
  : IS_BELT_REINFORCEMENT
    ? "8fa98f07-3831-57d6-b37a-9cbc7442fff6"
  : IS_ANCHOR_GROUP_REINFORCEMENT
    ? "ec015415-7504-5cc1-853a-cfd38cf09e2f"
  : IS_COLUMN_BASE
    ? "2768e0a1-ab48-5c34-8b4c-f6c19e3c28e5"
  : IS_REINFORCEMENT_FRAME_ASSEMBLY
    ? "d6c8a091-3a3e-5757-89eb-390886e9b33a"
  : IS_REINFORCEMENT_FRAME
    ? "e1dcd42e-0187-5a04-8bac-16a0d3e2468c"
  : IS_STAIRS
    ? "e2755c0e-af34-5c91-a370-474cc1beba87"
  : IS_PEDESTAL
    ? "880ca23a-39c0-5bd4-a75d-d0edbd5bf128"
  : IS_PILE_CAP
    ? "4f52b35a-0f1c-5541-b2d9-a651b2dd3a57"
  : IS_CONCRETE_SLAB
    ? "52f6eb87-1960-5c20-b2a1-3d92180bd009"
  : IS_SLAB_FOUNDATION
    ? "b5fdbd4a-a863-5823-83a6-3432108fd743"
    : "831a5ba4-af0f-561c-8766-09a960cf2c74";
const SEARCH_RELEASE_ID = IS_CONCRETE_SLAB_VIBRATION
  ? "c8c18ba6-1aa1-5581-99ee-871e3037c6ce"
  : IS_CONCRETE_SLAB_CURING
  ? "be08859c-3c3c-53b9-b0fa-6ac1a1226659"
  : IS_CONCRETE_SLAB_LEVELING
  ? "2d77bca9-0272-5b16-aa85-2b553e365c4c"
  : IS_CONCRETE_SLAB_REPAIR
  ? "a0d581eb-9bd1-50f3-a366-495846f468f5"
  : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
  ? "492f2c38-6b0f-55cd-b2d4-067a99ff57d0"
  : IS_ANCHOR
  ? "132eb3c0-0a52-5257-8420-cf2f8de425b9"
  : IS_FORMWORK_REINFORCEMENT
    ? "a02f3a88-0551-53b1-bec9-19cec2d9a399"
  : IS_JOINT_REINFORCEMENT
    ? "1fc20d92-2bf1-5c0f-bd30-ca99d1c76fe5"
  : IS_BELT_REINFORCEMENT
    ? "7e5d3320-eb80-5a67-abcf-c6369bcb0b89"
  : IS_ANCHOR_GROUP_REINFORCEMENT
    ? "a1c7e025-3b03-5862-9f94-59123d82abc9"
  : IS_COLUMN_BASE
    ? "67bfd575-8f7c-57ef-9e1f-336c5014659f"
  : IS_REINFORCEMENT_FRAME_ASSEMBLY
    ? "77159a8c-8f13-5bfa-a31b-9e39a322013d"
  : IS_REINFORCEMENT_FRAME
    ? "b8dff955-a85f-54b9-ae75-4fd9e89e5034"
  : IS_STAIRS
    ? "1d2bf788-a50f-597e-8e00-4bfadc04de00"
  : IS_PEDESTAL
    ? "b9f48d80-2593-5bd9-ad40-c652e0ed7e4f"
  : IS_PILE_CAP
    ? "890c0b03-40cf-592f-b777-01da66a02e50"
  : IS_CONCRETE_SLAB
    ? "81a70e74-e1bb-5043-88db-5b93910f5b16"
  : IS_SLAB_FOUNDATION
    ? "f86a4f0a-0ca5-58c8-bf87-dab4a9c5607c"
    : "2a89ec21-c69a-50f2-9c84-9810a9c276e1";
const API_RECEIPT = resolve(
  IS_CONCRETE_SLAB_VIBRATION
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-vibration-family-api/acceptance.json"
    : IS_CONCRETE_SLAB_CURING
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-curing-family-api/acceptance.json"
    : IS_CONCRETE_SLAB_LEVELING
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-leveling-family-api/acceptance.json"
    : IS_CONCRETE_SLAB_REPAIR
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-repair-family-api/acceptance.json"
    : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-embedded-items-family-api/acceptance.json"
    : IS_ANCHOR
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-installation-family-api/acceptance.json"
    : IS_FORMWORK_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-reinforcement-family-api/acceptance.json"
    : IS_JOINT_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/joint-reinforcement-family-api/acceptance.json"
    : IS_BELT_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-reinforcement-family-api/acceptance.json"
    : IS_ANCHOR_GROUP_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-reinforcement-family-api/acceptance.json"
    : IS_COLUMN_BASE
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-reinforcement-family-api/acceptance.json"
    : IS_REINFORCEMENT_FRAME_ASSEMBLY
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-assembly-family-api/acceptance.json"
    : IS_REINFORCEMENT_FRAME
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-reinforcement-family-api/acceptance.json"
    : IS_STAIRS
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/stairs-reinforcement-family-api/acceptance.json"
    : IS_PEDESTAL
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-reinforcement-family-api/acceptance.json"
    : IS_PILE_CAP
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-reinforcement-family-api/acceptance.json"
    : IS_CONCRETE_SLAB
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-reinforcement-family-api/acceptance.json"
    : IS_SLAB_FOUNDATION
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/slab-foundation-reinforcement-family-api/acceptance.json"
      : ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-api/acceptance.json",
);
const TARGET_CONTEXTS = ["standard", "high_load"] as const;
const TARGETS = IS_CONCRETE_SLAB_VIBRATION
  ? CONCRETE_SLAB_VIBRATION_TARGETS
  : IS_CONCRETE_SLAB_CURING
  ? CONCRETE_SLAB_CURING_TARGETS
  : IS_CONCRETE_SLAB_LEVELING
  ? CONCRETE_SLAB_LEVELING_TARGETS
  : IS_CONCRETE_SLAB_REPAIR
  ? CONCRETE_SLAB_REPAIR_TARGETS
  : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
  ? CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS
  : IS_ANCHOR
  ? ANCHOR_GROUP_INSTALLATION_TARGETS
  : IS_FORMWORK_REINFORCEMENT
    ? FORMWORK_REINFORCEMENT_TARGETS
  : IS_JOINT_REINFORCEMENT
    ? JOINT_REINFORCEMENT_TARGETS
  : IS_BELT_REINFORCEMENT
    ? BELT_REINFORCEMENT_TARGETS
  : IS_ANCHOR_GROUP_REINFORCEMENT
    ? ANCHOR_GROUP_REINFORCEMENT_TARGETS
  : IS_COLUMN_BASE
    ? COLUMN_BASE_REINFORCEMENT_TARGETS
  : IS_REINFORCEMENT_FRAME_ASSEMBLY
    ? REINFORCEMENT_FRAME_ASSEMBLY_TARGETS
  : IS_REINFORCEMENT_FRAME
    ? REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS
  : IS_STAIRS
    ? STAIRS_REINFORCEMENT_TARGETS
  : IS_PEDESTAL
    ? PEDESTAL_REINFORCEMENT_TARGETS
  : IS_PILE_CAP
    ? PILE_CAP_REINFORCEMENT_TARGETS
  : IS_CONCRETE_SLAB
    ? CONCRETE_SLAB_REINFORCEMENT_TARGETS
  : IS_SLAB_FOUNDATION
    ? SLAB_FOUNDATION_REINFORCEMENT_TARGETS
    : STRIP_FOUNDATION_REINFORCEMENT_TARGETS;
const PRIMARY_PARAMETER_ID = IS_CONCRETE_SLAB_VIBRATION
  ? "vibration_worker_h"
  : IS_CONCRETE_SLAB_CURING
  ? "curing_worker_h"
  : IS_CONCRETE_SLAB_LEVELING
  ? "leveling_worker_h"
  : IS_CONCRETE_SLAB_REPAIR
  ? "repair_material_placement_worker_h"
  : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
  ? "positioning_worker_h"
  : IS_ANCHOR
  ? "anchor_bolt_quantity_piece"
  : "approved_reinforcement_schedule_weight_kg";
const PRIMARY_ROW_ID = IS_CONCRETE_SLAB_VIBRATION
  ? "work:concrete:slab-vibration"
  : IS_CONCRETE_SLAB_CURING
  ? "work:concrete:slab-curing"
  : IS_CONCRETE_SLAB_LEVELING
  ? "work:concrete:slab-leveling"
  : IS_CONCRETE_SLAB_REPAIR
  ? "work:concrete:slab-repair-placement"
  : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
  ? "work:concrete:slab-embedded-items-positioning"
  : IS_ANCHOR
  ? "material:anchor-group:anchor-bolts"
  : "material:reinforcement:steel-approved-schedule";
const DELIVERY_ROW_ID = IS_CONCRETE_SLAB_VIBRATION
  ? "delivery:concrete:internal-vibrator-mobilization"
  : IS_CONCRETE_SLAB_CURING
  ? "delivery:concrete:curing-equipment-mobilization"
  : IS_CONCRETE_SLAB_LEVELING
  ? "delivery:concrete:slab-leveling-equipment-mobilization"
  : IS_CONCRETE_SLAB_REPAIR
  ? "delivery:concrete:slab-repair-material"
  : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
  ? "delivery:concrete:slab-embedded-items"
  : IS_ANCHOR
  ? "delivery:anchor-group:supply"
  : "delivery:reinforcement:steel";
const SOURCE_ID = IS_CONCRETE_SLAB_VIBRATION
  ? CONCRETE_SLAB_VIBRATION_SOURCE_ID
  : IS_CONCRETE_SLAB_CURING
  ? CONCRETE_SLAB_CURING_SOURCE_ID
  : IS_CONCRETE_SLAB_LEVELING
  ? CONCRETE_SLAB_LEVELING_SOURCE_ID
  : IS_CONCRETE_SLAB_REPAIR
  ? CONCRETE_SLAB_REPAIR_SOURCE_ID
  : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
  ? CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID
  : IS_ANCHOR
  ? ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID
  : "src_professional_norm_pack_reinforcement_project_bar_schedule_weight_same_unit_routing_v1";
const NORM_ID = IS_CONCRETE_SLAB_VIBRATION
  ? CONCRETE_SLAB_VIBRATION_NORM_ID
  : IS_CONCRETE_SLAB_CURING
  ? CONCRETE_SLAB_CURING_NORM_ID
  : IS_CONCRETE_SLAB_LEVELING
  ? CONCRETE_SLAB_LEVELING_NORM_ID
  : IS_CONCRETE_SLAB_REPAIR
  ? CONCRETE_SLAB_REPAIR_NORM_ID
  : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
  ? CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID
  : IS_ANCHOR
  ? ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID
  : "reinforcement_project_bar_schedule_weight_same_unit_routing_v1";
const WEB_PROGRESS = IS_CONCRETE_SLAB_VIBRATION
  ? "CONCRETE_SLAB_VIBRATION_DIFFERENTIAL_WEB"
  : IS_CONCRETE_SLAB_CURING
  ? "CONCRETE_SLAB_CURING_DIFFERENTIAL_WEB"
  : IS_CONCRETE_SLAB_LEVELING
  ? "CONCRETE_SLAB_LEVELING_DIFFERENTIAL_WEB"
  : IS_CONCRETE_SLAB_REPAIR
  ? "CONCRETE_SLAB_REPAIR_DIFFERENTIAL_WEB"
  : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
  ? "CONCRETE_SLAB_EMBEDDED_ITEMS_DIFFERENTIAL_WEB"
  : IS_ANCHOR
  ? "ANCHOR_GROUP_WEB"
  : IS_FORMWORK_REINFORCEMENT
    ? "FORMWORK_REINFORCEMENT_DIFFERENTIAL_WEB"
  : IS_JOINT_REINFORCEMENT
    ? "JOINT_REINFORCEMENT_DIFFERENTIAL_WEB"
  : IS_BELT_REINFORCEMENT
    ? "BELT_REINFORCEMENT_DIFFERENTIAL_WEB"
  : IS_ANCHOR_GROUP_REINFORCEMENT
    ? "ANCHOR_GROUP_REINFORCEMENT_DIFFERENTIAL_WEB"
  : IS_COLUMN_BASE
    ? "COLUMN_BASE_REINFORCEMENT_DIFFERENTIAL_WEB"
  : IS_REINFORCEMENT_FRAME_ASSEMBLY
    ? "REINFORCEMENT_FRAME_ASSEMBLY_DIFFERENTIAL_WEB"
  : IS_REINFORCEMENT_FRAME
    ? "REINFORCEMENT_FRAME_REINFORCEMENT_DIFFERENTIAL_WEB"
  : IS_STAIRS
    ? "STAIRS_REINFORCEMENT_DIFFERENTIAL_WEB"
  : IS_PEDESTAL
    ? "PEDESTAL_REINFORCEMENT_DIFFERENTIAL_WEB"
  : IS_PILE_CAP
    ? "PILE_CAP_REINFORCEMENT_DIFFERENTIAL_WEB"
  : IS_CONCRETE_SLAB
    ? "CONCRETE_SLAB_REINFORCEMENT_DIFFERENTIAL_WEB"
  : IS_SLAB_FOUNDATION
    ? "SLAB_FOUNDATION_REINFORCEMENT_DIFFERENTIAL_WEB"
    : "STRIP_REINFORCEMENT_DIFFERENTIAL_WEB";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`${WEB_PROGRESS}:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function resources(): Json {
  const disk = statfsSync(resolve("."));
  return {
    capturedAt: new Date().toISOString(),
    availableMemoryBytes: freemem(),
    availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
  };
}

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({
    progress: WEB_PROGRESS,
    stage,
    ...details,
  })}\n`);
}

function attachPageDiagnostics(input: {
  page: Page;
  contextKey: string;
  surface: "primary" | "cold";
  phase: () => string;
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
  diagnostics: Json[];
}): void {
  input.page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text().slice(0, 4_000);
    const location = message.location();
    input.consoleErrors.push(`${input.contextKey}:${input.surface}:${text}`);
    input.diagnostics.push({
      at: new Date().toISOString(),
      kind: "console_error",
      contextKey: input.contextKey,
      surface: input.surface,
      phase: input.phase(),
      text,
      location,
    });
  });
  input.page.on("pageerror", (error) => {
    input.pageErrors.push(`${input.contextKey}:${input.surface}:${error.message}`);
    input.diagnostics.push({
      at: new Date().toISOString(),
      kind: "page_error",
      contextKey: input.contextKey,
      surface: input.surface,
      phase: input.phase(),
      name: error.name,
      message: error.message.slice(0, 4_000),
      stack: error.stack?.slice(0, 8_000) ?? null,
    });
  });
  input.page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const failure = request.failure()?.errorText ?? "";
    input.requestFailures.push(
      `${input.contextKey}:${input.surface}:${request.method()} ${url.pathname} ${failure}`,
    );
    input.diagnostics.push({
      at: new Date().toISOString(),
      kind: "request_failed",
      contextKey: input.contextKey,
      surface: input.surface,
      phase: input.phase(),
      method: request.method(),
      origin: url.origin,
      pathname: url.pathname,
      failure,
    });
  });
}

async function settleBeforeControlledClose(page: Page): Promise<Json> {
  const startedAt = Date.now();
  const networkIdle = await page.waitForLoadState("networkidle", { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  // Give promise continuations from the final response a browser turn before
  // the controlled close. Any real console/request failure remains blocking.
  await page.waitForTimeout(250);
  return {
    networkIdle,
    elapsedMs: Date.now() - startedAt,
  };
}

async function json(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function loginLocalDeveloperConsumer(): Promise<string> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[] | undefined)?.find(
    (entry) => entry.role === "consumer",
  );
  invariant(consumer?.email && consumer.password && consumer.user_id
    && credentials.publishable_key,
  "LOCAL_DEVELOPER_CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token && body.user?.id === consumer.user_id,
    `LOCAL_DEVELOPER_CONSUMER_LOGIN_HTTP_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function api(
  authorization: string,
  path: string,
  init?: RequestInit,
): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}:${JSON.stringify(body).slice(0, 1_000)}`);
  return body;
}

async function waitForJob(authorization: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${BACKEND}/jobs/${jobId}`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(120_000),
    });
    const job = await response.json().catch(() => ({})) as Json;
    if (response.status === 404) {
      await new Promise((accept) => setTimeout(accept, 100));
      continue;
    }
    invariant(response.ok, `JOB_HTTP_${response.status}:${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`STRIP_REINFORCEMENT_DIFFERENTIAL_WEB:JOB_TIMEOUT:${jobId}`);
}

async function waitForSuccessfulRevision(authorization: string, accepted: Json): Promise<Json> {
  const job = await waitForJob(authorization, String(accepted.jobId ?? ""));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `JOB_${job.status}:${job.errorCode ?? "UNKNOWN"}`);
  return api(authorization, `revisions/${job.resultRevisionId}`);
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function enterConsumer(page: Page, returnTo: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  let routeRecoveryCount = 0;
  while (Date.now() < deadline) {
    if (routeRecoveryCount < 3 && new URL(page.url()).pathname !== new URL(returnTo).pathname) {
      routeRecoveryCount += 1;
      await page.goto(returnTo, { waitUntil: "commit", timeout: 180_000 });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      continue;
    }
    const input = page.getByTestId("consumer-repair-problem-input");
    if (await input.isVisible().catch(() => false)) return;
    const login = page.getByTestId("auth.login.local-consumer")
      .or(page.getByTestId("protected-identity-local-consumer-login")).first();
    if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
      await login.click({ timeout: 2_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`STRIP_REINFORCEMENT_DIFFERENTIAL_WEB:CONSUMER_ROUTE_NOT_READY:${page.url()}`);
}

async function browserAuthorization(page: Page): Promise<string> {
  const accessToken = await page.evaluate(() => {
    const queue: unknown[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const value = window.localStorage.getItem(window.localStorage.key(index) ?? "");
      if (!value) continue;
      try { queue.push(JSON.parse(value)); } catch { /* not an auth JSON value */ }
    }
    const visited = new Set<unknown>();
    while (queue.length > 0) {
      const value = queue.shift();
      if (!value || typeof value !== "object" || visited.has(value)) continue;
      visited.add(value);
      const record = value as Record<string, unknown>;
      if (typeof record.access_token === "string" && record.access_token.length > 20) {
        return record.access_token;
      }
      queue.push(...Object.values(record));
    }
    return null;
  });
  invariant(accessToken, "BROWSER_AUTHORIZATION_MISSING");
  return `Bearer ${accessToken}`;
}

async function expandPositions(page: Page): Promise<void> {
  const panel = page.getByTestId("request-estimate-positions-panel");
  const toggle = page.getByTestId("request-estimate-positions-toggle");
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await panel.isVisible().catch(() => false)) return;
    if (await toggle.isVisible().catch(() => false)
      && await toggle.isEnabled().catch(() => false)) {
      await toggle.click();
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`${WEB_PROGRESS}:POSITIONS_PANEL_NOT_READY:${page.url()}`);
}

async function openRevision(page: Page, revisionId: string): Promise<void> {
  const url = `${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}`;
  await page.goto(url, { waitUntil: "commit", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await enterConsumer(page, url);
  await page.getByTestId("request-estimate-items-total-count").waitFor({
    state: "visible",
    timeout: 90_000,
  });
  await page.getByTestId("estimate-revision-timeline").waitFor({ state: "visible", timeout: 60_000 });
  await expandPositions(page);
}

async function assertVisibleRows(page: Page, rows: Json[], code: string): Promise<Json> {
  await expandPositions(page);
  const expected = rows.filter((row) => row.includedInEstimate === true);
  const allCategories = page.getByTestId("request-estimate-category-filter-all");
  if (await allCategories.isVisible().catch(() => false)) {
    const selected = await allCategories.getAttribute("aria-selected");
    if (selected === "false") await allCategories.click();
  }
  const expectedTitles = expected.map((row) => String(row.titleRu));
  const deadline = Date.now() + 90_000;
  let visibleTitles: string[] = [];
  let totalLabel = "";
  while (Date.now() < deadline) {
    visibleTitles = await page.locator('[data-testid^="consumer-repair-item-title-"]')
      .allInnerTexts();
    totalLabel = await page.getByTestId("request-estimate-items-total-count").innerText();
    if (visibleTitles.length === expected.length
      && expectedTitles.every((title) => visibleTitles.some((visible) => visible.includes(title)))
      && totalLabel.includes(String(expected.length))) break;
    await page.waitForTimeout(250);
  }
  const missingTitles = expectedTitles.filter(
    (title) => !visibleTitles.some((visible) => visible.includes(title)),
  );
  invariant(visibleTitles.length === expected.length && missingTitles.length === 0,
    `${code}:VISIBLE_ROWS:${visibleTitles.length}:${expected.length}:${missingTitles.join("|")}`);
  invariant(totalLabel.includes(String(expected.length)), `${code}:TOTAL_LABEL:${totalLabel}`);
  return { visibleTitles, totalLabel, bodyTextSha256: sha256(await page.locator("body").innerText()) };
}

async function editPrimaryMeasure(
  page: Page,
  authorization: string,
  value: number,
): Promise<Json> {
  const chip = page.getByTestId(`editable-param-chip-${PRIMARY_PARAMETER_ID}`);
  if (!await chip.isVisible().catch(() => false)) {
    const toggle = page.getByTestId("request-estimate-parameters-toggle");
    if (await toggle.isVisible().catch(() => false)) await toggle.click();
    const showMore = page.getByTestId("request-estimate-show-more-parameters");
    if (await showMore.isVisible().catch(() => false)) await showMore.click();
  }
  await chip.waitFor({ state: "visible", timeout: 60_000 });
  await chip.getByTestId("editable-param-popover-input").fill(String(value));
  await page.getByTestId("editable-param-batch-bar").waitFor({ state: "visible", timeout: 30_000 });
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
  { timeout: 60_000 });
  const [response] = await Promise.all([
    responsePromise,
    page.getByTestId("editable-param-batch-apply").click(),
  ]);
  const accepted = await json(response);
  invariant(response.status() === 202, `RECALCULATE_HTTP_${response.status()}`);
  return waitForSuccessfulRevision(authorization, accepted);
}

function assertRevisionRows(
  contextKey: string,
  revision: Json,
  rows: Json[],
  fixture: Json,
): Json {
  const parameterMismatches = Object.entries(fixture)
    .filter(([parameterId, value]) => typeof value === "number"
      ? Number(revision.parameters?.[parameterId]) !== value
      : revision.parameters?.[parameterId] !== value)
    .map(([parameterId]) => parameterId);
  invariant(parameterMismatches.length === 0,
    `PARAMETER_DRIFT:${contextKey}:${parameterMismatches.join(",")}`);
  const expectedRowCount = IS_CONCRETE_SLAB_VIBRATION
    ? 4
    : IS_CONCRETE_SLAB_CURING
    ? (contextKey === "high_load" ? 5 : 6)
    : IS_CONCRETE_SLAB_LEVELING
    ? (contextKey === "high_load" ? 5 : 3)
    : IS_CONCRETE_SLAB_REPAIR
    ? (contextKey === "high_load" ? 16 : 15)
    : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
    ? (contextKey === "high_load" ? 14 : 11)
    : IS_ANCHOR
    ? (contextKey === "high_load" ? 21 : 16)
    : IS_JOINT_REINFORCEMENT
      ? (contextKey === "high_load" ? 15 : 9)
      : (contextKey === "high_load" ? 16 : 9);
  const expectedProcurementCount = IS_CONCRETE_SLAB_VIBRATION
    ? 3
    : IS_CONCRETE_SLAB_CURING
    ? (contextKey === "high_load" ? 4 : 5)
    : IS_CONCRETE_SLAB_LEVELING
    ? (contextKey === "high_load" ? 4 : 2)
    : IS_CONCRETE_SLAB_REPAIR
    ? (contextKey === "high_load" ? 12 : 11)
    : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
    ? (contextKey === "high_load" ? 9 : 7)
    : IS_ANCHOR
    ? (contextKey === "high_load" ? 16 : 11)
    : IS_JOINT_REINFORCEMENT
      ? (contextKey === "high_load" ? 9 : 6)
      : (contextKey === "high_load" ? 10 : 6);
  invariant(rows.length === expectedRowCount && Number(revision.rowCount) === expectedRowCount,
    `ROW_COUNT:${contextKey}:${rows.length}`);
  invariant(rows.every((row) => row.includedInEstimate === true
      && row.unitPrice == null && row.amount == null)
    && rows.filter((row) => row.includedInProcurement === true).length === expectedProcurementCount
    && Number(revision.totals?.includedRowCount) === expectedRowCount
    && Number(revision.totals?.unpricedRowCount) === expectedRowCount,
  `ROW_SCOPE_OR_PRICE:${contextKey}`);
  const primary = rows.find((row) => row.rowId === PRIMARY_ROW_ID);
  const delivery = rows.find((row) => row.rowId === DELIVERY_ROW_ID);
  invariant(primary && (IS_CONCRETE_SLAB_LEVELING || delivery),
    `REFERENCE_ROWS_MISSING:${contextKey}`);
  const expectedPrimary = Number(fixture[PRIMARY_PARAMETER_ID]);
  const expectedDelivery = IS_CONCRETE_SLAB_VIBRATION
    ? Number(fixture.equipment_mobilization_trip_count)
    : IS_CONCRETE_SLAB_CURING
    ? Number(fixture.equipment_mobilization_trip_count)
    : IS_CONCRETE_SLAB_LEVELING
    ? Number(fixture.equipment_mobilization_trip_count ?? 0)
    : IS_CONCRETE_SLAB_REPAIR
    ? Number(fixture.material_delivery_trip_count)
    : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
    ? Number(fixture.embedded_items_delivery_trip_count)
    : IS_ANCHOR
    ? Number(fixture.delivered_anchor_group_mass_kg) / 1_000
      * Number(fixture.delivery_distance_km)
    : expectedPrimary / 1_000 * Number(fixture.reinforcement_delivery_distance_km);
  invariant(Number(primary.quantity) === expectedPrimary
    && Math.abs(Number(delivery?.quantity ?? 0) - expectedDelivery) < 1e-8,
  `PROJECT_SCHEDULE_QUANTITY:${contextKey}`);
  const traces = Array.isArray(primary.normativeTrace) ? primary.normativeTrace as Json[] : [];
  invariant(traces.some((trace) => (trace.sourceId ?? trace.source_id) === SOURCE_ID
      && (trace.normId ?? trace.norm_id) === NORM_ID)
    && (IS_CONCRETE_SLAB_OPERATION
      || !traces.some((trace) => String(trace.sourceId ?? trace.source_id).includes("kg_m3"))),
  `NORMATIVE_SOURCE_TRUTH:${contextKey}`);
  return {
    rowCount: rows.length,
    includedRowCount: rows.filter((row) => row.includedInEstimate === true).length,
    procurementRowCount: rows.filter((row) => row.includedInProcurement === true).length,
    primaryQuantity: Number(primary.quantity),
    deliveryQuantity: Number(delivery?.quantity ?? 0),
    unknownPriceRows: rows.filter((row) => row.unitPrice == null && row.amount == null).length,
  };
}

async function buildArtifact(
  authorization: string,
  revision: Json,
  rows: Json[],
  kind: "pdf" | "procurement",
): Promise<Json> {
  const documentProfile = kind === "pdf" ? "professional_v1" : null;
  const accepted = await api(authorization, `revisions/${revision.revisionId}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${kind}:${revision.revisionId}`,
      ...(documentProfile ? { documentProfile } : {}),
    }),
  });
  if (accepted.jobId) {
    const job = await waitForJob(authorization, String(accepted.jobId));
    invariant(job.status === "succeeded", `ARTIFACT_${kind}_JOB_${job.status}`);
  } else {
    invariant(accepted.created === false && accepted.artifactId,
      `ARTIFACT_${kind}_IDEMPOTENT_REPLAY_RED`);
  }
  const suffix = documentProfile ? `?documentProfile=${documentProfile}` : "";
  const artifact = await api(authorization,
    `revisions/${revision.revisionId}/artifacts/${kind}${suffix}`);
  invariant(artifact.status === "ready" && artifact.revisionId === revision.revisionId
    && artifact.releaseId === RELEASE_ID && artifact.signedUrl
    && Number(artifact.byteSize) > 0 && /^[0-9a-f]{64}$/u.test(artifact.sha256),
  `ARTIFACT_${kind}_IDENTITY_RED`);
  const response = await fetch(artifact.signedUrl, { signal: AbortSignal.timeout(120_000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  invariant(response.ok && bytes.byteLength === Number(artifact.byteSize)
    && sha256(bytes) === artifact.sha256,
  `ARTIFACT_${kind}_DOWNLOAD_PARITY_RED`);
  if (kind === "pdf") {
    invariant(bytes.subarray(0, 4).toString("ascii") === "%PDF"
      && Number(artifact.metadata?.sourceRowCount) === rows.length
      && Number(artifact.metadata?.projectedRowCount) === rows.length
      && artifact.metadata?.grandTotalStatus === "PARTIAL_NEEDS_PRICE",
    "PDF_SEMANTIC_TRUTH_RED");
    return { ...artifact, downloadedByteSize: bytes.length, downloadedSha256: sha256(bytes) };
  }
  const projection = JSON.parse(bytes.toString("utf8")) as Json;
  const projectionRows = Array.isArray(projection.rows) ? projection.rows as Json[] : [];
  const expectedRows = rows.filter((row) => row.includedInProcurement === true);
  const expectedIds = expectedRows.map((row) => row.rowId).sort();
  const projectedIds = projectionRows.map((row) => row.rowId).sort();
  invariant(Number(artifact.metadata?.sourceRowCount) === rows.length
    && Number(artifact.metadata?.selectedProcurementRowCount) === expectedRows.length
    && Number(artifact.metadata?.projectedRowCount) === expectedRows.length
    && projection.revisionId === revision.revisionId
    && projection.releaseId === RELEASE_ID
    && JSON.stringify(projectedIds) === JSON.stringify(expectedIds)
    && projectionRows.every((row) => row.unitPrice == null && row.amount == null),
  "PROCUREMENT_SEMANTIC_TRUTH_RED");
  return { ...artifact, downloadedByteSize: bytes.length, downloadedSha256: sha256(bytes), projection };
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const before = resources();
  invariant(before.availableMemoryBytes >= 2 * 1024 ** 3, "AVAILABLE_MEMORY_BELOW_2_GIB");
  const apiReceiptBytes = readFileSync(API_RECEIPT);
  const apiReceipt = JSON.parse(apiReceiptBytes.toString("utf8")) as Json;
  invariant(apiReceipt.status === (IS_CONCRETE_SLAB_VIBRATION
    ? "GREEN_CONCRETE_SLAB_VIBRATION_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_CONCRETE_SLAB_CURING
    ? "GREEN_CONCRETE_SLAB_CURING_6_OF_6_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_CONCRETE_SLAB_LEVELING
    ? "GREEN_CONCRETE_SLAB_LEVELING_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_CONCRETE_SLAB_REPAIR
    ? "GREEN_CONCRETE_SLAB_REPAIR_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
    ? "GREEN_CONCRETE_SLAB_EMBEDDED_ITEMS_6_OF_6_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_ANCHOR
    ? "GREEN_ANCHOR_GROUP_INSTALLATION_6_OF_6_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_FORMWORK_REINFORCEMENT
      ? "GREEN_FORMWORK_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_JOINT_REINFORCEMENT
      ? "GREEN_JOINT_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_BELT_REINFORCEMENT
      ? "GREEN_BELT_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_ANCHOR_GROUP_REINFORCEMENT
      ? "GREEN_ANCHOR_GROUP_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_COLUMN_BASE
      ? "GREEN_COLUMN_BASE_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_REINFORCEMENT_FRAME_ASSEMBLY
      ? "GREEN_REINFORCEMENT_FRAME_ASSEMBLY_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_REINFORCEMENT_FRAME
      ? "GREEN_REINFORCEMENT_FRAME_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_STAIRS
      ? "GREEN_STAIRS_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_PEDESTAL
      ? "GREEN_PEDESTAL_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_PILE_CAP
      ? "GREEN_PILE_CAP_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_CONCRETE_SLAB
      ? "GREEN_CONCRETE_SLAB_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : IS_SLAB_FOUNDATION
      ? "GREEN_SLAB_FOUNDATION_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
      : "GREEN_STRIP_FOUNDATION_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE")
    && apiReceipt.denominator?.acceptedTargetCount === (
      IS_ANCHOR || IS_CONCRETE_SLAB_CURING || IS_CONCRETE_SLAB_EMBEDDED_ITEMS ? 6 : 7
    ),
  "API_FAMILY_RECEIPT_RED");
  const definitionIds = new Map<string, string>((apiReceipt.targetResults as Json[])
    .map((result) => [String(result.contextKey), String(result.definitionVersionId)]));
  const authorization = await loginLocalDeveloperConsumer();
  const manifest = await api(authorization, "runtime-manifest");
  invariant(manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
    && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
    && manifest.definitionRelease?.status === "prepared"
    && manifest.searchRelease?.status === "draft"
    && Number(manifest.activeCompileJobCount) === 0,
  "RUNTIME_TUPLE_RED");

  const resumeFromDiagnostics = process.argv.includes("--resume-from-diagnostics");
  const priorDiagnostics = resumeFromDiagnostics
    ? JSON.parse(readFileSync(RED_DIAGNOSTICS_OUTPUT, "utf8")) as Json
    : null;
  if (priorDiagnostics) {
    invariant(priorDiagnostics.schemaVersion === `${CONTRACT}.diagnostics-red.v1`
      && priorDiagnostics.releaseId === RELEASE_ID
      && priorDiagnostics.searchReleaseId === SEARCH_RELEASE_ID
      && Array.isArray(priorDiagnostics.results)
      && priorDiagnostics.results.length === TARGET_CONTEXTS.length,
    "RESUME_DIAGNOSTICS_IDENTITY_RED");
  }
  const browser = resumeFromDiagnostics ? null : await chromium.launch({ headless: true });
  const context = browser
    ? await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    : null;
  const consoleErrors: string[] = priorDiagnostics?.consoleErrors ?? [];
  const pageErrors: string[] = priorDiagnostics?.pageErrors ?? [];
  const requestFailures: string[] = priorDiagnostics?.requestFailures ?? [];
  const detailedDiagnostics: Json[] = priorDiagnostics?.detailedDiagnostics ?? [];
  const controlledCloseProofs: Json[] = priorDiagnostics?.controlledCloseProofs ?? [];
  const results: Json[] = priorDiagnostics?.results ?? [];
  if (!resumeFromDiagnostics) try {
    invariant(browser && context, "WEB_RUNTIME_MISSING");
    for (const contextKey of TARGET_CONTEXTS) {
      const target = TARGETS.find(
        (candidate) => candidate.contextKey === contextKey,
      );
      invariant(target, `TARGET_MISSING:${contextKey}`);
      const definitionVersionId = definitionIds.get(contextKey);
      invariant(definitionVersionId, `DEFINITION_ID_MISSING:${contextKey}`);
      const fixture = (IS_CONCRETE_SLAB_VIBRATION
        ? { ...concreteSlabVibrationAcceptanceInputR1(contextKey) }
        : IS_CONCRETE_SLAB_CURING
        ? { ...concreteSlabCuringAcceptanceInputR1(contextKey) }
        : IS_CONCRETE_SLAB_LEVELING
        ? { ...concreteSlabLevelingAcceptanceInputR1(contextKey) }
        : IS_CONCRETE_SLAB_REPAIR
        ? { ...concreteSlabRepairAcceptanceInputR1(contextKey) }
        : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
        ? { ...concreteSlabEmbeddedItemsAcceptanceInputR1(contextKey) }
        : IS_ANCHOR
        ? { ...anchorGroupInstallationAcceptanceInputR1(contextKey) }
        : IS_FORMWORK_REINFORCEMENT
          ? { ...formworkReinforcementAcceptanceInputR1(contextKey) }
        : IS_JOINT_REINFORCEMENT
          ? { ...jointReinforcementAcceptanceInputR1(contextKey) }
        : IS_BELT_REINFORCEMENT
          ? { ...beltReinforcementAcceptanceInputR1(contextKey) }
        : IS_ANCHOR_GROUP_REINFORCEMENT
          ? { ...anchorGroupReinforcementAcceptanceInputR1(contextKey) }
        : IS_COLUMN_BASE
          ? { ...columnBaseReinforcementAcceptanceInputR1(contextKey) }
        : IS_REINFORCEMENT_FRAME_ASSEMBLY
          ? { ...reinforcementFrameAssemblyAcceptanceInputR1(contextKey) }
        : IS_REINFORCEMENT_FRAME
          ? { ...reinforcementFrameReinforcementAcceptanceInputR1(contextKey) }
        : IS_STAIRS
          ? { ...stairsReinforcementAcceptanceInputR1(contextKey) }
        : IS_PEDESTAL
          ? { ...pedestalReinforcementAcceptanceInputR1(contextKey) }
        : IS_PILE_CAP
          ? { ...pileCapReinforcementAcceptanceInputR1(contextKey) }
        : IS_CONCRETE_SLAB
          ? { ...concreteSlabReinforcementAcceptanceInputR1(contextKey) }
        : IS_SLAB_FOUNDATION
          ? { ...slabFoundationReinforcementAcceptanceInputR1(contextKey) }
          : { ...stripFoundationReinforcementAcceptanceInputR1(contextKey) }) as Json;
      const promptDetails = IS_CONCRETE_SLAB_VIBRATION
        ? concreteSlabVibrationPromptDetailsR1(fixture)
        : IS_CONCRETE_SLAB_CURING
        ? concreteSlabCuringPromptDetailsR1(fixture)
        : IS_CONCRETE_SLAB_LEVELING
        ? concreteSlabLevelingPromptDetailsR1(fixture)
        : IS_CONCRETE_SLAB_REPAIR
        ? concreteSlabRepairPromptDetailsR1(fixture)
        : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
        ? concreteSlabEmbeddedItemsPromptDetailsR1(fixture)
        : IS_ANCHOR
        ? anchorGroupInstallationPromptDetailsR1(fixture)
        : stripFoundationReinforcementPromptDetailsR1(fixture);
      invariant(promptDetails.length === (IS_CONCRETE_SLAB_CURING || IS_CONCRETE_SLAB_LEVELING
        || IS_CONCRETE_SLAB_REPAIR || IS_CONCRETE_SLAB_EMBEDDED_ITEMS
        ? Object.keys(fixture).length
        : IS_CONCRETE_SLAB_VIBRATION ? 13 : IS_ANCHOR ? 39 : 37),
        `PROMPT_PARAMETER_COUNT:${contextKey}`);
      const prompt = [target.titleRu, ...promptDetails].join("\n");
      const route = `${ORIGIN}/request?context=${encodeURIComponent(
        `acceptance:${IS_CONCRETE_SLAB_VIBRATION ? "concrete-slab-vibration" : IS_CONCRETE_SLAB_CURING ? "concrete-slab-curing" : IS_CONCRETE_SLAB_LEVELING ? "concrete-slab-leveling" : IS_CONCRETE_SLAB_REPAIR ? "concrete-slab-repair" : IS_CONCRETE_SLAB_EMBEDDED_ITEMS ? "concrete-slab-embedded-items" : IS_FORMWORK_REINFORCEMENT ? "formwork" : IS_JOINT_REINFORCEMENT ? "joint" : IS_BELT_REINFORCEMENT ? "belt" : IS_ANCHOR_GROUP_REINFORCEMENT ? "anchor-group" : IS_COLUMN_BASE ? "column-base" : IS_REINFORCEMENT_FRAME_ASSEMBLY ? "reinforcement-frame-assembly" : IS_REINFORCEMENT_FRAME ? "reinforcement-frame" : IS_STAIRS ? "stairs" : IS_PEDESTAL ? "pedestal" : IS_PILE_CAP ? "pile-cap" : IS_CONCRETE_SLAB ? "concrete-slab" : IS_SLAB_FOUNDATION ? "slab" : "strip"}-reinforcement-differential-web:${contextKey}:${Date.now()}`,
      )}`;
      const page = await context.newPage();
      let primaryPhase = "primary_created";
      attachPageDiagnostics({
        page,
        contextKey,
        surface: "primary",
        phase: () => primaryPhase,
        consoleErrors,
        pageErrors,
        requestFailures,
        diagnostics: detailedDiagnostics,
      });

      primaryPhase = "primary_navigation";
      await page.goto(route, { waitUntil: "commit", timeout: 180_000 });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(page, route);
      primaryPhase = "search";
      const contextAuthorization = await browserAuthorization(page);
      const historyBefore = await api(contextAuthorization,
        `revisions?catalogId=${encodeURIComponent(target.catalogId)}&limit=100`);
      const beforeIds = (historyBefore.revisions as Json[]).map((revision) => revision.revisionId);
      const input = page.getByTestId("consumer-repair-problem-input");
      await input.waitFor({ state: "visible", timeout: 60_000 });
      const searchPromise = page.waitForResponse((response) =>
        response.url().includes("/search/catalog") && response.request().method() === "GET",
      { timeout: 120_000 });
      await input.fill("");
      await input.fill(target.titleRu);
      const searchResponse = await searchPromise;
      const searchBody = await json(searchResponse);
      invariant(searchResponse.ok() && searchBody.searchIndexReleaseId === SEARCH_RELEASE_ID,
        `SEARCH_HTTP_OR_RELEASE:${contextKey}:${searchResponse.status()}`);
      const searchItems = Array.isArray(searchBody.items) ? searchBody.items as Json[] : [];
      const selectedIndex = searchItems.findIndex((item) => item.catalogId === target.catalogId);
      invariant(selectedIndex >= 0, `SEARCH_EXACT_TARGET_MISSING:${contextKey}`);
      const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`);
      await suggestion.waitFor({ state: "visible", timeout: 120_000 });
      const selectedWorkText = (await suggestion.innerText()).trim();
      await suggestion.click();
      primaryPhase = "selected_work_prompt";
      const selectedPrefix = await input.inputValue();
      invariant(selectedPrefix.includes(target.titleRu), `SEARCH_SELECTION_PREFIX:${contextKey}`);
      await input.fill(`${selectedPrefix}\n${promptDetails.join("\n")}`);
      const prepareButton = page.getByTestId("consumer-repair-prepare-draft");
      await prepareButton.waitFor({ state: "visible", timeout: 60_000 });
      invariant(await prepareButton.isEnabled(), `PREPARE_DISABLED:${contextKey}`);
      const compilePromise = page.waitForResponse((response) =>
        response.url().endsWith("/jobs/compile") && response.request().method() === "POST",
      { timeout: 180_000 });
      const [compileResponse] = await Promise.all([compilePromise, prepareButton.click()]);
      primaryPhase = "compile_poll";
      const accepted = await json(compileResponse);
      invariant(compileResponse.status() === 202,
        `COMPILE_HTTP_${contextKey}_${compileResponse.status()}:${JSON.stringify(accepted).slice(0, 1_000)}`);
      const createdRevision = await waitForSuccessfulRevision(contextAuthorization, accepted);
      invariant(createdRevision.catalogId === target.catalogId
        && createdRevision.definitionVersionId === definitionVersionId
        && createdRevision.releaseId === RELEASE_ID,
      `CREATE_IDENTITY:${contextKey}`);
      const createdRows = await allRows(contextAuthorization, createdRevision.revisionId);
      const createdTruth = assertRevisionRows(contextKey, createdRevision, createdRows, fixture);
      primaryPhase = "created_revision_open";
      await openRevision(page, createdRevision.revisionId);
      const createdVisible = await assertVisibleRows(page, createdRows, `CREATE:${contextKey}`);
      const createScreenshot = resolve(OUTPUT_ROOT, `01_${contextKey}_created.png`);
      await page.screenshot({ path: createScreenshot, fullPage: true });

      const originalPrimary = Number(fixture[PRIMARY_PARAMETER_ID]);
      const editedPrimary = originalPrimary + (IS_CONCRETE_SLAB_OPERATION ? 2 : IS_ANCHOR ? 4 : 100);
      primaryPhase = "edit_primary_measure";
      const editedRevision = await editPrimaryMeasure(page, contextAuthorization, editedPrimary);
      invariant(editedRevision.parentRevisionId === createdRevision.revisionId
        && editedRevision.catalogId === target.catalogId,
      `EDIT_LINEAGE:${contextKey}`);
      const editedRows = await allRows(contextAuthorization, editedRevision.revisionId);
      const editedFixture = { ...fixture, [PRIMARY_PARAMETER_ID]: editedPrimary };
      const editedTruth = assertRevisionRows(contextKey, editedRevision, editedRows, editedFixture);
      const createdById = new Map(createdRows.map((row) => [row.rowId, Number(row.quantity)]));
      const changedRowIds = editedRows
        .filter((row) => Number(row.quantity) !== createdById.get(row.rowId))
        .map((row) => row.rowId).sort();
      const expectedChangedRowIds = IS_CONCRETE_SLAB_VIBRATION
        ? [PRIMARY_ROW_ID]
        : IS_CONCRETE_SLAB_CURING
        ? [PRIMARY_ROW_ID]
        : IS_CONCRETE_SLAB_LEVELING
        ? [PRIMARY_ROW_ID]
        : IS_CONCRETE_SLAB_REPAIR
        ? [PRIMARY_ROW_ID]
        : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
        ? [PRIMARY_ROW_ID]
        : IS_ANCHOR
        ? [PRIMARY_ROW_ID]
        : [DELIVERY_ROW_ID, PRIMARY_ROW_ID].sort();
      invariant(JSON.stringify(changedRowIds) === JSON.stringify(expectedChangedRowIds),
        `EDIT_SCOPE:${contextKey}:${changedRowIds.join(",")}`);
      primaryPhase = "edited_revision_open";
      await openRevision(page, editedRevision.revisionId);
      const editedVisible = await assertVisibleRows(page, editedRows, `EDIT:${contextKey}`);
      const editScreenshot = resolve(OUTPUT_ROOT, `02_${contextKey}_edited.png`);
      await page.screenshot({ path: editScreenshot, fullPage: true });

      primaryPhase = "artifact_build";
      const [pdf, procurement] = await Promise.all([
        buildArtifact(contextAuthorization, editedRevision, editedRows, "pdf"),
        buildArtifact(contextAuthorization, editedRevision, editedRows, "procurement"),
      ]);

      const coldPage = await context.newPage();
      let coldPhase = "cold_created";
      attachPageDiagnostics({
        page: coldPage,
        contextKey,
        surface: "cold",
        phase: () => coldPhase,
        consoleErrors,
        pageErrors,
        requestFailures,
        diagnostics: detailedDiagnostics,
      });
      const coldUrl = `${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(editedRevision.revisionId)}`;
      primaryPhase = "cold_open_parallel";
      coldPhase = "cold_navigation";
      await coldPage.goto(coldUrl, { waitUntil: "commit", timeout: 180_000 });
      await coldPage.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(coldPage, coldUrl);
      await expandPositions(coldPage);
      await coldPage.getByTestId("request-estimate-items-total-count").waitFor({
        state: "visible",
        timeout: 90_000,
      });
      await coldPage.getByTestId("estimate-revision-timeline")
        .waitFor({ state: "visible", timeout: 60_000 });
      coldPhase = "cold_assert_visible";
      const coldVisible = await assertVisibleRows(coldPage, editedRows, `COLD:${contextKey}`);
      await coldPage.locator(`[data-testid*="revision-${editedRevision.revisionId}"]`)
        .waitFor({ state: "visible", timeout: 60_000 });
      const coldScreenshot = resolve(OUTPUT_ROOT, `03_${contextKey}_cold.png`);
      await coldPage.screenshot({ path: coldScreenshot, fullPage: true });
      coldPhase = "cold_settle_before_close";
      const coldCloseProof = await settleBeforeControlledClose(coldPage);
      controlledCloseProofs.push({ contextKey, surface: "cold", ...coldCloseProof });
      coldPhase = "cold_controlled_close";
      await coldPage.close();

      primaryPhase = "history_after";
      const historyAfter = await api(contextAuthorization,
        `revisions?catalogId=${encodeURIComponent(target.catalogId)}&limit=100`);
      const afterIds = (historyAfter.revisions as Json[]).map((revision) => revision.revisionId);
      invariant(afterIds.length === beforeIds.length + 2
        && afterIds.includes(createdRevision.revisionId)
        && afterIds.includes(editedRevision.revisionId)
        && afterIds.indexOf(editedRevision.revisionId) < afterIds.indexOf(createdRevision.revisionId),
      `HISTORY:${contextKey}:${beforeIds.length}:${afterIds.length}`);

      const platformObservabilityTail = await page.evaluate(() => {
        const root = globalThis as typeof globalThis & {
          __RIK_PLATFORM_OBSERVABILITY__?: { events?: Json[] };
        };
        const events = Array.isArray(root.__RIK_PLATFORM_OBSERVABILITY__?.events)
          ? root.__RIK_PLATFORM_OBSERVABILITY__?.events ?? []
          : [];
        return events.filter((event) => event.result !== "success").slice(-30);
      });
      results.push({
        contextKey,
        catalogId: target.catalogId,
        definitionVersionId,
        branch: IS_CONCRETE_SLAB_VIBRATION
          ? "PROJECT_SCHEDULE_INTERNAL_VIBRATION_WITH_SEPARATE_MOBILIZATION"
          : IS_CONCRETE_SLAB_CURING
          ? `PROJECT_SPECIFIED_${String(fixture.approved_external_curing_method)}_WITH_DIRECT_SCHEDULE`
          : IS_CONCRETE_SLAB_LEVELING
          ? `PROJECT_SPECIFIED_${String(fixture.approved_leveling_method_designation)}_WITH_DIRECT_SCHEDULE`
          : IS_CONCRETE_SLAB_REPAIR
          ? `ASSESSMENT_LED_${String(fixture.approved_repair_method_designation)}_WITH_DIRECT_SCHEDULE`
          : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
          ? "PROJECT_SPECIFIED_EMBEDDED_ITEMS_WITH_DIRECT_SCHEDULE"
          : contextKey === "high_load"
            ? "SITE_FABRICATED_COUPLERS_LIFTING_FULL"
            : "READY_CAGES_NO_COUPLERS_NO_LIFTING_MINIMAL",
        promptParameterCount: promptDetails.length,
        promptSha256: sha256(prompt),
        search: { selectedIndex, selectedWorkText, searchReleaseId: searchBody.searchIndexReleaseId },
        create: {
          jobId: accepted.jobId,
          revisionId: createdRevision.revisionId,
          revisionNumber: createdRevision.revisionNumber,
          ...createdTruth,
          visibleRowCount: createdVisible.visibleTitles.length,
          screenshot: { path: createScreenshot, sha256: sha256(readFileSync(createScreenshot)) },
        },
        edit: {
          parentRevisionId: createdRevision.revisionId,
          revisionId: editedRevision.revisionId,
          revisionNumber: editedRevision.revisionNumber,
          originalPrimaryQuantity: originalPrimary,
          editedPrimaryQuantity: editedPrimary,
          changedRowIds,
          singleBatchApply: true,
          ...editedTruth,
          visibleRowCount: editedVisible.visibleTitles.length,
          screenshot: { path: editScreenshot, sha256: sha256(readFileSync(editScreenshot)) },
        },
        artifacts: {
          pdf: {
            artifactId: pdf.artifactId,
            revisionId: pdf.revisionId,
            byteSize: pdf.byteSize,
            sha256: pdf.sha256,
            pageCount: pdf.metadata?.pageCount,
            grandTotalStatus: pdf.metadata?.grandTotalStatus,
            downloadParity: true,
          },
          procurement: {
            artifactId: procurement.artifactId,
            revisionId: procurement.revisionId,
            byteSize: procurement.byteSize,
            sha256: procurement.sha256,
            selectedProcurementRowCount: procurement.metadata?.selectedProcurementRowCount,
            downloadParity: true,
          },
        },
        history: { before: beforeIds.length, after: afterIds.length, delta: 2, immutableParentLineage: true },
        coldOpen: {
          revisionId: editedRevision.revisionId,
          rowCount: editedRows.length,
          visibleRowCount: coldVisible.visibleTitles.length,
          screenshot: { path: coldScreenshot, sha256: sha256(readFileSync(coldScreenshot)) },
        },
        platformObservabilityTail,
      });
      progress("TARGET_GREEN", {
        contextKey,
        createdRevisionId: createdRevision.revisionId,
        editedRevisionId: editedRevision.revisionId,
        rows: editedRows.length,
        procurementRows: procurement.metadata?.selectedProcurementRowCount,
      });
      primaryPhase = "primary_settle_before_close";
      const primaryCloseProof = await settleBeforeControlledClose(page);
      controlledCloseProofs.push({ contextKey, surface: "primary", ...primaryCloseProof });
      primaryPhase = "primary_controlled_close";
      await page.close();
    }
  } finally {
    await context!.close();
    await browser!.close();
  }

  const controlledAuthNavigationAbort = (value: string): boolean => {
    const match = value.match(/^([^:]+):(primary|cold):TypeError: Failed to fetch/u);
    if (!match) return false;
    const [, contextKey, surface] = match;
    const matchingConsole = detailedDiagnostics.find((event) =>
      event.kind === "console_error"
        && event.contextKey === contextKey
        && event.surface === surface
        && event.phase === "primary_navigation"
        && String(event.text ?? "").startsWith("TypeError: Failed to fetch"));
    const matchingAbort = detailedDiagnostics.find((event) =>
      event.kind === "request_failed"
        && event.contextKey === contextKey
        && event.surface === surface
        && event.phase === "primary_navigation"
        && event.method === "GET"
        && event.origin === PROVIDER
        && event.pathname === "/auth/v1/user"
        && event.failure === "net::ERR_ABORTED");
    if (!matchingConsole || !matchingAbort) return false;
    return Math.abs(
      new Date(String(matchingConsole.at)).getTime() - new Date(String(matchingAbort.at)).getTime(),
    ) <= 1_000;
  };
  const unexpectedConsoleErrors = consoleErrors.filter((value) =>
    !value.includes("404 (Not Found)")
      && !value.includes("favicon")
      && !controlledAuthNavigationAbort(value));
  const unexpectedRequestFailures = requestFailures.filter((value) =>
    !value.includes("net::ERR_ABORTED"));
  invariant(results.length === 2
    && results.some((result) => result.contextKey === "standard"
      && result.edit.rowCount === (IS_CONCRETE_SLAB_VIBRATION
        ? 4
        : IS_CONCRETE_SLAB_CURING
        ? 6
        : IS_CONCRETE_SLAB_LEVELING
        ? 3
        : IS_CONCRETE_SLAB_REPAIR
        ? 15
        : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
        ? 11
        : IS_ANCHOR ? 16 : 9))
    && results.some((result) => result.contextKey === "high_load"
      && result.edit.rowCount === (IS_CONCRETE_SLAB_VIBRATION
        ? 4
        : IS_CONCRETE_SLAB_CURING
        ? 5
        : IS_CONCRETE_SLAB_LEVELING
        ? 5
        : IS_CONCRETE_SLAB_REPAIR
        ? 16
        : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
        ? 14
        : IS_ANCHOR ? 21 : IS_JOINT_REINFORCEMENT ? 15 : 16)),
  "RESULT_DENOMINATOR_RED");
  if (pageErrors.length > 0 || unexpectedConsoleErrors.length > 0
    || unexpectedRequestFailures.length > 0) {
    atomicJson(RED_DIAGNOSTICS_OUTPUT, {
      schemaVersion: `${CONTRACT}.diagnostics-red.v1`,
      capturedAt: new Date().toISOString(),
      status: "RED_WEB_DIAGNOSTICS",
      globalStatus: GLOBAL_STATUS,
      releaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      results,
      consoleErrors,
      pageErrors,
      requestFailures,
      unexpectedConsoleErrors,
      unexpectedRequestFailures,
      detailedDiagnostics,
      controlledCloseProofs,
      productionRequests: 0,
      deployPerformed: false,
      activationPerformed: false,
      releasePerformed: false,
      otaPerformed: false,
    });
  }
  invariant(pageErrors.length === 0 && unexpectedConsoleErrors.length === 0
    && unexpectedRequestFailures.length === 0,
  `DIAGNOSTICS_RED:${JSON.stringify({
    output: RED_DIAGNOSTICS_OUTPUT,
    pageErrors,
    unexpectedConsoleErrors,
    unexpectedRequestFailures,
  })}`);
  const manifestAfter = await api(authorization, "runtime-manifest");
  invariant(manifestAfter.definitionRelease?.status === "prepared"
    && manifestAfter.searchRelease?.status === "draft"
    && Number(manifestAfter.activeCompileJobCount) === 0,
  "RUNTIME_AFTER_RED");
  const after = resources();

  const evidence = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
      status: IS_CONCRETE_SLAB_VIBRATION
        ? "GREEN_CONCRETE_SLAB_VIBRATION_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
        : IS_CONCRETE_SLAB_CURING
        ? "GREEN_CONCRETE_SLAB_CURING_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
        : IS_CONCRETE_SLAB_LEVELING
        ? "GREEN_CONCRETE_SLAB_LEVELING_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
        : IS_CONCRETE_SLAB_REPAIR
        ? "GREEN_CONCRETE_SLAB_REPAIR_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
        : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
        ? "GREEN_CONCRETE_SLAB_EMBEDDED_ITEMS_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
        : IS_ANCHOR
        ? "GREEN_ANCHOR_GROUP_INSTALLATION_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_FORMWORK_REINFORCEMENT
        ? "GREEN_FORMWORK_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_JOINT_REINFORCEMENT
        ? "GREEN_JOINT_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_BELT_REINFORCEMENT
        ? "GREEN_BELT_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_ANCHOR_GROUP_REINFORCEMENT
        ? "GREEN_ANCHOR_GROUP_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_COLUMN_BASE
        ? "GREEN_COLUMN_BASE_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_REINFORCEMENT_FRAME_ASSEMBLY
        ? "GREEN_REINFORCEMENT_FRAME_ASSEMBLY_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_REINFORCEMENT_FRAME
        ? "GREEN_REINFORCEMENT_FRAME_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_STAIRS
        ? "GREEN_STAIRS_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_PEDESTAL
        ? "GREEN_PEDESTAL_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_PILE_CAP
        ? "GREEN_PILE_CAP_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_CONCRETE_SLAB
        ? "GREEN_CONCRETE_SLAB_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : IS_SLAB_FOUNDATION
        ? "GREEN_SLAB_FOUNDATION_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
        : "GREEN_STRIP_FOUNDATION_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE",
    globalStatus: GLOBAL_STATUS,
    apiFamilyReceipt: {
      path: API_RECEIPT,
      fileSha256: sha256(apiReceiptBytes),
      receiptSha256: apiReceipt.receiptSha256,
      acceptedTargetCount: apiReceipt.denominator.acceptedTargetCount,
    },
    runtime: {
      definitionReleaseId: RELEASE_ID,
      definitionReleaseStatus: manifest.definitionRelease.status,
      searchReleaseId: SEARCH_RELEASE_ID,
      searchReleaseStatus: manifest.searchRelease.status,
      sourceHead: manifest.sourceHead,
      sourceTree: manifest.sourceTree,
      frontendBuildIdentity: manifest.frontendBuildIdentity,
    },
    selectionRationale: {
      selectedDifferentialContexts: [
        {
          contextKey: "standard",
          reason: IS_CONCRETE_SLAB_VIBRATION
            ? "standard project schedule with four explicit rows and separate equipment mobilization"
            : IS_CONCRETE_SLAB_CURING
            ? "wet-covering branch with water, covering, equipment, control and separate mobilization"
            : IS_CONCRETE_SLAB_LEVELING
            ? "manual screed branch with project guides and no separate equipment or mobilization"
            : IS_CONCRETE_SLAB_REPAIR
            ? "standard assessment-led repair with bonding, curing, equipment, inspection, testing and waste logistics"
            : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
            ? "standard embedded-item branch with welding, supports, survey, coating and direct project logistics"
            : IS_ANCHOR
            ? "minimal no-weld/no-lift anchor branch with 16 rows"
            : "minimal ready-cage branch with 9 rows",
        },
        {
          contextKey: "high_load",
          reason: IS_CONCRETE_SLAB_VIBRATION
            ? "high-load project schedule with different labor, equipment and quality-control quantities"
            : IS_CONCRETE_SLAB_CURING
            ? "water-curing branch without unrelated covering, sheet or membrane-compound rows"
            : IS_CONCRETE_SLAB_LEVELING
            ? "power-screed branch with project guides, separate equipment, control and mobilization"
            : IS_CONCRETE_SLAB_REPAIR
            ? "high-load assessment-led repair including exposed-reinforcement treatment and the full direct project schedule"
            : IS_CONCRETE_SLAB_EMBEDDED_ITEMS
            ? "high-load embedded-item branch with the complete direct project installation schedule"
            : IS_ANCHOR
            ? "maximal protected/welded/lifting/torque anchor branch with 21 rows"
            : "maximal onsite/couplers/lifting branch with 16 rows",
        },
      ],
      backendAcceptedEquivalentOrIntermediateContexts: IS_ANCHOR || IS_CONCRETE_SLAB_CURING
        || IS_CONCRETE_SLAB_EMBEDDED_ITEMS
        ? ["large_area", "small_area", "technical_room", "wet_zone"]
        : ["large_area", "repair", "small_area", "technical_room", "wet_zone"],
    },
    results,
    diagnostics: {
      consoleErrors,
      pageErrors,
      requestFailures,
      unexpectedConsoleErrors,
      unexpectedRequestFailures,
      detailedDiagnostics,
      controlledCloseProofs,
    },
    resourceControl: {
      before,
      after,
      availableMemoryDeltaBytes: after.availableMemoryBytes - before.availableMemoryBytes,
      availableDiskDeltaBytes: after.availableDiskBytes - before.availableDiskBytes,
      heavyProcessStarted: false,
      existingBackendAndMetroReused: true,
      databasePreserved: true,
      historyPreserved: true,
    },
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...evidence, receiptSha256: sha256(JSON.stringify(evidence)) };
  atomicJson(OUTPUT, sealed);
  progress("GREEN", { output: OUTPUT, receiptSha256: sealed.receiptSha256 });
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
