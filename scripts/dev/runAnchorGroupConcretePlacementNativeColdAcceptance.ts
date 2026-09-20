import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  buildAndroidDeepLinkLaunchArgs,
} from "../e2e/androidDeepLinkLaunchContract";
import {
  API34_DEVICE_READY,
  ensureAndroidApi34DeviceReady,
} from "../e2e/ensureAndroidApi34DeviceReady";
import {
  bounds,
  capture,
  dumpUi,
  nodeHasId,
  scrollToStart,
  seekNode,
  tapById,
  tapNode,
  waitForSnapshot,
  type UiSnapshot,
} from "../e2e/r4A6AndroidAcceptedUiRuntime";
import {
  buildDevClientUri,
  ensureMetro,
  isMetroReachable,
  runAdb,
  setupAndroidRuntime,
  sleep,
} from "../e2e/androidRouteBootstrapHarness";

type Json = Record<string, any>;
type AuditRow = Readonly<{
  at?: string;
  method?: string;
  path?: string;
  status?: number;
  userAgent?: string;
}>;

const COLUMN_BASE_MODE = process.argv.includes("--column-base");
const BELT_MODE = process.argv.includes("--belt");
const CONCRETE_SLAB_MODE = process.argv.includes("--concrete-slab");
const PILE_CAP_MODE = process.argv.includes("--pile-cap");
const PEDESTAL_MODE = process.argv.includes("--pedestal");
const SLAB_FOUNDATION_MODE = process.argv.includes("--slab-foundation");
const STAIRS_MODE = process.argv.includes("--stairs");
const REINFORCEMENT_FRAME_MODE = process.argv.includes("--reinforcement-frame");
const SLAB_REINFORCEMENT_MODE = process.argv.includes("--slab-reinforcement");
const CONCRETE_SLAB_REINFORCEMENT_MODE = process.argv.includes("--concrete-slab-reinforcement");
const PILE_CAP_REINFORCEMENT_MODE = process.argv.includes("--pile-cap-reinforcement");
const PEDESTAL_REINFORCEMENT_MODE = process.argv.includes("--pedestal-reinforcement");
const STAIRS_REINFORCEMENT_MODE = process.argv.includes("--stairs-reinforcement");
const REINFORCEMENT_FRAME_REINFORCEMENT_MODE = process.argv.includes("--reinforcement-frame-reinforcement");
const REINFORCEMENT_FRAME_ASSEMBLY_MODE = process.argv.includes("--reinforcement-frame-assembly");
const COLUMN_BASE_REINFORCEMENT_MODE = process.argv.includes("--column-base-reinforcement");
const ANCHOR_GROUP_REINFORCEMENT_MODE = process.argv.includes("--anchor-group-reinforcement");
const BELT_REINFORCEMENT_MODE = process.argv.includes("--belt-reinforcement");
const JOINT_REINFORCEMENT_MODE = process.argv.includes("--joint-reinforcement");
const FORMWORK_REINFORCEMENT_MODE = process.argv.includes("--formwork-reinforcement");
const ANCHOR_GROUP_FORMWORK_MODE = process.argv.includes("--anchor-group-formwork");
const BELT_FORMWORK_MODE = process.argv.includes("--belt-formwork");
const COLUMN_BASE_FORMWORK_MODE = process.argv.includes("--column-base-formwork");
const PEDESTAL_FORMWORK_MODE = process.argv.includes("--pedestal-formwork");
const CONCRETE_SLAB_VIBRATION_MODE = process.argv.includes("--concrete-slab-vibration");
const CONCRETE_SLAB_CURING_MODE = process.argv.includes("--concrete-slab-curing");
const CONCRETE_SLAB_LEVELING_MODE = process.argv.includes("--concrete-slab-leveling");
const CONCRETE_SLAB_REPAIR_MODE = process.argv.includes("--concrete-slab-repair");
const CONCRETE_SLAB_EMBEDDED_ITEMS_MODE = process.argv.includes("--concrete-slab-embedded-items");
const CONCRETE_SLAB_OPERATION_MODE = CONCRETE_SLAB_VIBRATION_MODE
  || CONCRETE_SLAB_CURING_MODE
  || CONCRETE_SLAB_LEVELING_MODE
  || CONCRETE_SLAB_REPAIR_MODE
  || CONCRETE_SLAB_EMBEDDED_ITEMS_MODE;
const RESUME_AFTER_PDF = process.argv.includes("--resume-after-pdf");
const RESUME_AFTER_HISTORY = process.argv.includes("--resume-after-history");
const FORMWORK_MODE = ANCHOR_GROUP_FORMWORK_MODE || BELT_FORMWORK_MODE
  || COLUMN_BASE_FORMWORK_MODE || PEDESTAL_FORMWORK_MODE;
const REINFORCEMENT_MODE = FORMWORK_REINFORCEMENT_MODE
  || JOINT_REINFORCEMENT_MODE
  || BELT_REINFORCEMENT_MODE
  || ANCHOR_GROUP_REINFORCEMENT_MODE
  || COLUMN_BASE_REINFORCEMENT_MODE
  || REINFORCEMENT_FRAME_ASSEMBLY_MODE
  || REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  || STAIRS_REINFORCEMENT_MODE
  || SLAB_REINFORCEMENT_MODE
  || CONCRETE_SLAB_REINFORCEMENT_MODE
  || PILE_CAP_REINFORCEMENT_MODE
  || PEDESTAL_REINFORCEMENT_MODE;
if ([COLUMN_BASE_MODE, BELT_MODE, CONCRETE_SLAB_MODE, PILE_CAP_MODE, PEDESTAL_MODE, SLAB_FOUNDATION_MODE, STAIRS_MODE, REINFORCEMENT_FRAME_MODE, SLAB_REINFORCEMENT_MODE, CONCRETE_SLAB_REINFORCEMENT_MODE, PILE_CAP_REINFORCEMENT_MODE, PEDESTAL_REINFORCEMENT_MODE, STAIRS_REINFORCEMENT_MODE, REINFORCEMENT_FRAME_ASSEMBLY_MODE, REINFORCEMENT_FRAME_REINFORCEMENT_MODE, COLUMN_BASE_REINFORCEMENT_MODE, ANCHOR_GROUP_REINFORCEMENT_MODE, BELT_REINFORCEMENT_MODE, JOINT_REINFORCEMENT_MODE, FORMWORK_REINFORCEMENT_MODE, ANCHOR_GROUP_FORMWORK_MODE, BELT_FORMWORK_MODE, COLUMN_BASE_FORMWORK_MODE, PEDESTAL_FORMWORK_MODE, CONCRETE_SLAB_VIBRATION_MODE, CONCRETE_SLAB_CURING_MODE, CONCRETE_SLAB_LEVELING_MODE, CONCRETE_SLAB_REPAIR_MODE, CONCRETE_SLAB_EMBEDDED_ITEMS_MODE].filter(Boolean).length > 1) {
  throw new Error("CONCRETE_PLACEMENT_NATIVE:AMBIGUOUS_FAMILY_MODE");
}
const FAMILY_KEY = CONCRETE_SLAB_VIBRATION_MODE
  ? "concrete-slab-vibration"
  : CONCRETE_SLAB_CURING_MODE
  ? "concrete-slab-curing"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "concrete-slab-leveling"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "concrete-slab-repair"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "concrete-slab-embedded-items"
  : PEDESTAL_FORMWORK_MODE
  ? "pedestal-formwork"
  : COLUMN_BASE_FORMWORK_MODE
  ? "column-base-formwork"
  : BELT_FORMWORK_MODE
  ? "belt-formwork"
  : ANCHOR_GROUP_FORMWORK_MODE
  ? "anchor-group-formwork"
  : FORMWORK_REINFORCEMENT_MODE
  ? "formwork-reinforcement"
  : JOINT_REINFORCEMENT_MODE
  ? "joint-reinforcement"
  : BELT_REINFORCEMENT_MODE
  ? "belt-reinforcement"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "anchor-group-reinforcement"
  : COLUMN_BASE_REINFORCEMENT_MODE
  ? "column-base-reinforcement"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "reinforcement-frame-assembly"
  : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  ? "reinforcement-frame-reinforcement"
  : STAIRS_REINFORCEMENT_MODE
  ? "stairs-reinforcement"
  : PEDESTAL_REINFORCEMENT_MODE
  ? "pedestal-reinforcement"
  : PILE_CAP_REINFORCEMENT_MODE
  ? "pile-cap-reinforcement"
  : CONCRETE_SLAB_REINFORCEMENT_MODE
  ? "concrete-slab-reinforcement"
  : SLAB_REINFORCEMENT_MODE
  ? "slab-foundation-reinforcement"
  : REINFORCEMENT_FRAME_MODE
  ? "reinforcement-frame"
  : STAIRS_MODE
  ? "stairs"
  : SLAB_FOUNDATION_MODE
  ? "slab-foundation"
  : PEDESTAL_MODE
  ? "pedestal"
  : PILE_CAP_MODE
  ? "pile-cap"
  : CONCRETE_SLAB_MODE
  ? "concrete-slab"
  : BELT_MODE ? "belt" : COLUMN_BASE_MODE ? "column-base" : "anchor";
const ERROR_PREFIX = CONCRETE_SLAB_VIBRATION_MODE
  ? "CONCRETE_SLAB_VIBRATION_NATIVE"
  : CONCRETE_SLAB_CURING_MODE
  ? "CONCRETE_SLAB_CURING_NATIVE"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "CONCRETE_SLAB_LEVELING_NATIVE"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "CONCRETE_SLAB_REPAIR_NATIVE"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "CONCRETE_SLAB_EMBEDDED_ITEMS_NATIVE"
  : PEDESTAL_FORMWORK_MODE
  ? "PEDESTAL_FORMWORK_NATIVE"
  : COLUMN_BASE_FORMWORK_MODE
  ? "COLUMN_BASE_FORMWORK_NATIVE"
  : BELT_FORMWORK_MODE
  ? "BELT_FORMWORK_NATIVE"
  : ANCHOR_GROUP_FORMWORK_MODE
  ? "ANCHOR_GROUP_FORMWORK_NATIVE"
  : FORMWORK_REINFORCEMENT_MODE
  ? "FORMWORK_REINFORCEMENT_NATIVE"
  : JOINT_REINFORCEMENT_MODE
  ? "JOINT_REINFORCEMENT_NATIVE"
  : BELT_REINFORCEMENT_MODE
  ? "BELT_REINFORCEMENT_NATIVE"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "ANCHOR_GROUP_REINFORCEMENT_NATIVE"
  : COLUMN_BASE_REINFORCEMENT_MODE
  ? "COLUMN_BASE_REINFORCEMENT_NATIVE"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "REINFORCEMENT_FRAME_ASSEMBLY_NATIVE"
  : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  ? "REINFORCEMENT_FRAME_REINFORCEMENT_NATIVE"
  : STAIRS_REINFORCEMENT_MODE
  ? "STAIRS_REINFORCEMENT_NATIVE"
  : PEDESTAL_REINFORCEMENT_MODE
  ? "PEDESTAL_REINFORCEMENT_NATIVE"
  : PILE_CAP_REINFORCEMENT_MODE
  ? "PILE_CAP_REINFORCEMENT_NATIVE"
  : CONCRETE_SLAB_REINFORCEMENT_MODE
  ? "CONCRETE_SLAB_REINFORCEMENT_NATIVE"
  : SLAB_REINFORCEMENT_MODE
  ? "SLAB_FOUNDATION_REINFORCEMENT_NATIVE"
  : REINFORCEMENT_FRAME_MODE
  ? "REINFORCEMENT_FRAME_CONCRETE_NATIVE"
  : STAIRS_MODE
  ? "STAIRS_CONCRETE_NATIVE"
  : SLAB_FOUNDATION_MODE
  ? "SLAB_FOUNDATION_CONCRETE_NATIVE"
  : PEDESTAL_MODE
  ? "PEDESTAL_CONCRETE_NATIVE"
  : PILE_CAP_MODE
  ? "PILE_CAP_CONCRETE_NATIVE"
  : CONCRETE_SLAB_MODE
  ? "CONCRETE_SLAB_CONCRETE_NATIVE"
  : BELT_MODE
  ? "BELT_CONCRETE_NATIVE"
  : COLUMN_BASE_MODE ? "COLUMN_BASE_CONCRETE_NATIVE" : "ANCHOR_GROUP_CONCRETE_NATIVE";
const CONTRACT = CONCRETE_SLAB_VIBRATION_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-vibration.native-cold.v1"
  : CONCRETE_SLAB_CURING_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-curing.native-cold.v1"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-leveling.native-cold.v1"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-repair.native-cold.v1"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-embedded-items.native-cold.v1"
  : PEDESTAL_FORMWORK_MODE
  ? "rik-expo-app.r4-a13-6.pedestal-formwork.native-cold.v1"
  : COLUMN_BASE_FORMWORK_MODE
  ? "rik-expo-app.r4-a13-6.column-base-formwork.native-cold.v1"
  : BELT_FORMWORK_MODE
  ? "rik-expo-app.r4-a13-6.belt-formwork.native-cold.v1"
  : ANCHOR_GROUP_FORMWORK_MODE
  ? "rik-expo-app.r4-a13-6.anchor-group-formwork.native-cold.v1"
  : FORMWORK_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.formwork-reinforcement.native-cold.v1"
  : JOINT_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.joint-reinforcement.native-cold.v1"
  : BELT_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.belt-reinforcement.native-cold.v1"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.anchor-group-reinforcement.native-cold.v1"
  : COLUMN_BASE_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.column-base-reinforcement.native-cold.v1"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "rik-expo-app.r4-a13-6.reinforcement-frame-assembly.native-cold.v1"
  : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.reinforcement-frame-reinforcement.native-cold.v1"
  : STAIRS_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.stairs-reinforcement.native-cold.v1"
  : PEDESTAL_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.pedestal-reinforcement.native-cold.v1"
  : PILE_CAP_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.pile-cap-reinforcement.native-cold.v1"
  : CONCRETE_SLAB_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-reinforcement.native-cold.v1"
  : SLAB_REINFORCEMENT_MODE
  ? "rik-expo-app.r4-a13-6.slab-foundation-reinforcement.native-cold.v1"
  : REINFORCEMENT_FRAME_MODE
  ? "rik-expo-app.r4-a13-6.reinforcement-frame-concrete-placement.native-cold.v1"
  : STAIRS_MODE
  ? "rik-expo-app.r4-a13-6.stairs-concrete-placement.native-cold.v1"
  : SLAB_FOUNDATION_MODE
  ? "rik-expo-app.r4-a13-6.slab-foundation-concrete-placement.native-cold.v1"
  : PEDESTAL_MODE
  ? "rik-expo-app.r4-a13-6.pedestal-concrete-placement.native-cold.v1"
  : PILE_CAP_MODE
  ? "rik-expo-app.r4-a13-6.pile-cap-concrete-placement.native-cold.v1"
  : CONCRETE_SLAB_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-concrete-placement.native-cold.v1"
  : BELT_MODE
  ? "rik-expo-app.r4-a13-6.belt-concrete-placement.native-cold.v1"
  : COLUMN_BASE_MODE
    ? "rik-expo-app.r4-a13-6.column-base-concrete-placement.native-cold.v1"
    : "rik-expo-app.r4-a13-6.anchor-group-concrete-placement.native-cold.v1";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const DEV_PORT = 8_081;
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "37491173-bdce-5137-bc55-6cba4ce15768"
  : CONCRETE_SLAB_CURING_MODE
  ? "f185fb75-7334-5d7d-a9b6-793d34e8cc24"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "e7f064fb-f5b5-5972-b64c-845183b69a29"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "3ad40dd2-36b5-5427-92d2-52a805a272b3"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "7bcb6a0c-9b9b-58ee-92f5-fb41e6ac8abf"
  : PEDESTAL_FORMWORK_MODE
  ? "e681be2c-a28f-5c72-b6ce-aeb166b96633"
  : COLUMN_BASE_FORMWORK_MODE
  ? "7589964d-18df-50fe-adf6-8450556c8c2f"
  : BELT_FORMWORK_MODE
  ? "45207fdf-2b38-55d6-adf8-f90f14b40932"
  : ANCHOR_GROUP_FORMWORK_MODE
  ? "877aa567-1d80-52e4-9d1b-7c5d2e4c5d78"
  : FORMWORK_REINFORCEMENT_MODE
  ? "e30a5747-fbf9-5f0d-b5b8-f4eedb2a0772"
  : JOINT_REINFORCEMENT_MODE
  ? "80fc4afc-6531-583b-966b-7828d4e10ae5"
  : BELT_REINFORCEMENT_MODE
  ? "8fa98f07-3831-57d6-b37a-9cbc7442fff6"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "ec015415-7504-5cc1-853a-cfd38cf09e2f"
  : COLUMN_BASE_REINFORCEMENT_MODE
  ? "2768e0a1-ab48-5c34-8b4c-f6c19e3c28e5"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "d6c8a091-3a3e-5757-89eb-390886e9b33a"
  : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  ? "e1dcd42e-0187-5a04-8bac-16a0d3e2468c"
  : STAIRS_REINFORCEMENT_MODE
  ? "e2755c0e-af34-5c91-a370-474cc1beba87"
  : PEDESTAL_REINFORCEMENT_MODE
  ? "880ca23a-39c0-5bd4-a75d-d0edbd5bf128"
  : PILE_CAP_REINFORCEMENT_MODE
  ? "4f52b35a-0f1c-5541-b2d9-a651b2dd3a57"
  : CONCRETE_SLAB_REINFORCEMENT_MODE
  ? "52f6eb87-1960-5c20-b2a1-3d92180bd009"
  : SLAB_REINFORCEMENT_MODE
  ? "b5fdbd4a-a863-5823-83a6-3432108fd743"
  : REINFORCEMENT_FRAME_MODE
  ? "05fd8444-dd4e-5f22-8c80-a83c92758466"
  : STAIRS_MODE
  ? "b50793f5-d20c-58d7-8ad0-8bd191876c20"
  : SLAB_FOUNDATION_MODE
  ? "03078c79-d77b-5e49-9008-5f4e8cbdb8a4"
  : PEDESTAL_MODE
  ? "714d113e-7146-5bf8-bd82-37a8505ddffd"
  : PILE_CAP_MODE
  ? "1c30bb0c-62b7-503c-9b56-f27117470da3"
  : CONCRETE_SLAB_MODE
  ? "2d2f1f06-fb1a-5fe9-84a6-f2cb805a4df4"
  : BELT_MODE
  ? "99f44305-0d13-50a9-a145-008f82b0293f"
  : COLUMN_BASE_MODE ? "7289c7d3-2577-5e52-a2f5-be3af06dec5d" : "0a70a3db-9648-5341-8bd0-ef9ae3017427";
const SEARCH_RELEASE_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "c8c18ba6-1aa1-5581-99ee-871e3037c6ce"
  : CONCRETE_SLAB_CURING_MODE
  ? "be08859c-3c3c-53b9-b0fa-6ac1a1226659"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "2d77bca9-0272-5b16-aa85-2b553e365c4c"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "a0d581eb-9bd1-50f3-a366-495846f468f5"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "492f2c38-6b0f-55cd-b2d4-067a99ff57d0"
  : PEDESTAL_FORMWORK_MODE
  ? "d20b84f4-a4d2-59fc-947a-57895d1f2e1d"
  : COLUMN_BASE_FORMWORK_MODE
  ? "b035feab-796b-52ee-8a88-2d3283fe80bb"
  : BELT_FORMWORK_MODE
  ? "cd37be15-1b05-50e7-b5a6-c4dfaec6c732"
  : ANCHOR_GROUP_FORMWORK_MODE
  ? "b084e3ec-bd78-5583-823f-a1be122702b0"
  : FORMWORK_REINFORCEMENT_MODE
  ? "a02f3a88-0551-53b1-bec9-19cec2d9a399"
  : JOINT_REINFORCEMENT_MODE
  ? "1fc20d92-2bf1-5c0f-bd30-ca99d1c76fe5"
  : BELT_REINFORCEMENT_MODE
  ? "7e5d3320-eb80-5a67-abcf-c6369bcb0b89"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "a1c7e025-3b03-5862-9f94-59123d82abc9"
  : COLUMN_BASE_REINFORCEMENT_MODE
  ? "67bfd575-8f7c-57ef-9e1f-336c5014659f"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "77159a8c-8f13-5bfa-a31b-9e39a322013d"
  : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  ? "b8dff955-a85f-54b9-ae75-4fd9e89e5034"
  : STAIRS_REINFORCEMENT_MODE
  ? "1d2bf788-a50f-597e-8e00-4bfadc04de00"
  : PEDESTAL_REINFORCEMENT_MODE
  ? "b9f48d80-2593-5bd9-ad40-c652e0ed7e4f"
  : PILE_CAP_REINFORCEMENT_MODE
  ? "890c0b03-40cf-592f-b777-01da66a02e50"
  : CONCRETE_SLAB_REINFORCEMENT_MODE
  ? "81a70e74-e1bb-5043-88db-5b93910f5b16"
  : SLAB_REINFORCEMENT_MODE
  ? "f86a4f0a-0ca5-58c8-bf87-dab4a9c5607c"
  : REINFORCEMENT_FRAME_MODE
  ? "37d17699-fd8d-50a4-a555-e1df9857de14"
  : STAIRS_MODE
  ? "b646530a-4732-56e3-b929-f225d2dc36f1"
  : SLAB_FOUNDATION_MODE
  ? "d366a77b-e26a-5bfe-81d8-b10b17af9567"
  : PEDESTAL_MODE
  ? "75903929-84a5-5bac-92f6-dfea65f3b8f1"
  : PILE_CAP_MODE
  ? "d930b4c0-8a36-5236-89ee-15edba0a266a"
  : CONCRETE_SLAB_MODE
  ? "093c5536-92cf-53cb-bd19-fecefd205db6"
  : BELT_MODE
  ? "4a6e59aa-cc9b-5987-9d57-90a259c90cb6"
  : COLUMN_BASE_MODE ? "cc38bb7a-aa48-5fa6-8f63-a8df4327d15f" : "8a235704-43f3-564f-a3b8-70777db354fb";
const DEFINITION_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "d599f978-5813-5573-bac4-ed9c22404dfe"
  : CONCRETE_SLAB_CURING_MODE
  ? "6e5ec6a0-64bf-5e0b-a856-2a22d892eb7d"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "6ea387b9-4129-5d3b-b064-69108b56a4e6"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "d9f35d2c-47d4-5339-be53-ebd725003f91"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "72b4dd35-1d53-54c4-8253-bb1bcd857d49"
  : PEDESTAL_FORMWORK_MODE
  ? "42c11834-2dea-51de-887b-a0484f152c78"
  : COLUMN_BASE_FORMWORK_MODE
  ? "7d9c70d8-158e-590b-97fc-accb96ece2e8"
  : BELT_FORMWORK_MODE
  ? "54b160bd-e7d2-5038-90d7-e4ec46e79aec"
  : ANCHOR_GROUP_FORMWORK_MODE
  ? "5caa676b-5439-5607-a27d-044e1b41b738"
  : FORMWORK_REINFORCEMENT_MODE
  ? "ace1ffa4-05e7-583d-be4a-6049c9e57e11"
  : JOINT_REINFORCEMENT_MODE
  ? "f467a886-6d23-5d2b-9f84-b8211b692e87"
  : BELT_REINFORCEMENT_MODE
  ? "36220630-ee47-52b0-81f7-76a6dccaf193"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "798d324b-b7d3-5d7e-8afb-c00bea194d46"
  : COLUMN_BASE_REINFORCEMENT_MODE
  ? "a47b6267-a544-5b1d-9f5a-8f5f4eec727c"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "2eceee60-ea0e-538c-b9a6-76b21cbc4ee6"
  : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  ? "8c34096f-1dd2-5b3f-ada7-0b207b4ef174"
  : STAIRS_REINFORCEMENT_MODE
  ? "c6105001-42ee-5e70-a18a-99be389d6279"
  : PEDESTAL_REINFORCEMENT_MODE
  ? "a7e2a899-b18b-5e0e-b506-48786307656d"
  : PILE_CAP_REINFORCEMENT_MODE
  ? "c7e03fe7-df0d-596d-92f5-f8025fe78b3e"
  : CONCRETE_SLAB_REINFORCEMENT_MODE
  ? "24712372-54e0-58a7-8d4d-e4d8f49c49f5"
  : SLAB_REINFORCEMENT_MODE
  ? "53979ff5-b964-54e2-ad5f-a72612625a1f"
  : REINFORCEMENT_FRAME_MODE
  ? "04c7a270-3465-5541-9275-c80a322fbdb5"
  : STAIRS_MODE
  ? "bbdaae6b-ccee-5860-9a01-fa1b53f13b3b"
  : SLAB_FOUNDATION_MODE
  ? "3687cca0-c322-5e91-ba16-a98bdf1729cd"
  : PEDESTAL_MODE
  ? "54c845e9-3978-543a-bfd7-9d3583d83eed"
  : PILE_CAP_MODE
  ? "56efe197-b086-5111-aff6-f8545d597be9"
  : CONCRETE_SLAB_MODE
  ? "36ac7c88-5b83-5d38-b629-0948f0fbe393"
  : BELT_MODE
  ? "a5c0d5f3-e330-5337-a20e-633c97eec6b1"
  : COLUMN_BASE_MODE ? "32141b6b-710b-59b7-bd67-74ccb2adc2e7" : "ac3e5a6a-714d-52c6-840c-270d3098cf68";
const CATALOG_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "canonical-work:base:concrete_foundation_interior_concrete_slab_vibrate_high_load"
  : CONCRETE_SLAB_CURING_MODE
  ? "canonical-work:base:concrete_foundation_interior_concrete_slab_cure_high_load"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "canonical-work:base:concrete_foundation_interior_concrete_slab_level_high_load"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "canonical-work:base:concrete_foundation_interior_concrete_slab_repair_high_load"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "canonical-work:base:concrete_foundation_interior_concrete_slab_anchor_high_load"
  : PEDESTAL_FORMWORK_MODE
  ? "canonical-work:base:concrete_foundation_interior_pedestal_form_standard"
  : COLUMN_BASE_FORMWORK_MODE
  ? "canonical-work:base:concrete_foundation_interior_column_base_form_standard"
  : BELT_FORMWORK_MODE
  ? "canonical-work:base:concrete_foundation_interior_belt_form_standard"
  : ANCHOR_GROUP_FORMWORK_MODE
  ? "canonical-work:base:concrete_foundation_interior_anchor_group_form_standard"
  : FORMWORK_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_formwork_reinforce_high_load"
  : JOINT_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_joint_reinforce_high_load"
  : BELT_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_belt_reinforce_high_load"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_anchor_group_reinforce_high_load"
  : COLUMN_BASE_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_column_base_reinforce_high_load"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "canonical-work:base:concrete_foundation_interior_reinforcement_frame_form_standard"
  : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_reinforcement_frame_reinforce_high_load"
  : STAIRS_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_high_load"
  : PEDESTAL_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_high_load"
  : PILE_CAP_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_high_load"
  : CONCRETE_SLAB_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_high_load"
  : SLAB_REINFORCEMENT_MODE
  ? "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_high_load"
  : REINFORCEMENT_FRAME_MODE
  ? "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_standard"
  : STAIRS_MODE
  ? "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_standard"
  : SLAB_FOUNDATION_MODE
  ? "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard"
  : PEDESTAL_MODE
  ? "canonical-work:base:concrete_foundation_interior_pedestal_pour_standard"
  : PILE_CAP_MODE
  ? "canonical-work:base:concrete_foundation_interior_pile_cap_pour_standard"
  : CONCRETE_SLAB_MODE
  ? "canonical-work:base:concrete_foundation_interior_concrete_slab_pour_standard"
  : BELT_MODE
  ? "canonical-work:base:concrete_foundation_interior_belt_pour_standard"
  : COLUMN_BASE_MODE
    ? "canonical-work:base:concrete_foundation_interior_column_base_pour_standard"
    : "canonical-work:base:concrete_foundation_interior_anchor_group_pour_standard";
const PARENT_REVISION_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "2bf2f981-8359-4a2e-8c6e-23ec3c1a76fe"
  : CONCRETE_SLAB_CURING_MODE
  ? "f72c3476-fb69-4aa0-9171-1811246a0769"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "48f611ee-1880-47e7-9b67-0cbd23fd5199"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "391a395c-d037-44c1-a624-fc40664ed843"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "814a53e7-b6e9-4ff0-b84b-ad0e28e40e32"
  : PEDESTAL_FORMWORK_MODE
  ? "3b8ea94a-8caf-4db7-86bd-d4abd7d73b65"
  : COLUMN_BASE_FORMWORK_MODE
  ? "43e34ad2-2488-484a-9b8c-0dd5af535131"
  : BELT_FORMWORK_MODE
  ? "8b3f5a7f-b4aa-4d6f-ae4b-65923b28b390"
  : ANCHOR_GROUP_FORMWORK_MODE
  ? "0b2a40bb-6419-4016-b40e-fbc2b0f6ea7f"
  : FORMWORK_REINFORCEMENT_MODE
  ? "a8e8f1ed-f7ce-451d-bd68-846105351330"
  : JOINT_REINFORCEMENT_MODE
  ? "7d98b945-a5bc-4ea1-a0d1-85e818a910a7"
  : BELT_REINFORCEMENT_MODE
  ? "4127d162-6d17-4771-8157-ef85995021b4"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "73f283de-661a-41d0-8f0c-b3f4a41aaaa0"
  : COLUMN_BASE_REINFORCEMENT_MODE
  ? "50defa3f-d832-4f5e-9ded-830b1be63eee"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "4872e88b-6104-447e-b825-1c90ac0c23c4"
  : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  ? "796f7735-5002-49c2-8ab8-d3c24bf1018c"
  : STAIRS_REINFORCEMENT_MODE
  ? "ee23810c-9b29-4324-849d-537fc79cc0ea"
  : PEDESTAL_REINFORCEMENT_MODE
  ? "1dd976e0-aec6-494e-bf2d-d67218b22d40"
  : PILE_CAP_REINFORCEMENT_MODE
  ? "398cbd9e-cece-4f20-b0ff-287f591a3530"
  : CONCRETE_SLAB_REINFORCEMENT_MODE
  ? "59797073-9a53-42a3-8133-a70eb6b99f77"
  : SLAB_REINFORCEMENT_MODE
  ? "3e0256e3-0afd-4b22-ab49-4dab504f456a"
  : REINFORCEMENT_FRAME_MODE
  ? "f898d5e0-6b75-4eb0-a9f2-9c2ebd93d99a"
  : STAIRS_MODE
  ? "c71d235d-4d75-4f57-9c18-3771761a8290"
  : SLAB_FOUNDATION_MODE
  ? "22b5866a-7b97-492a-9f85-a7ed0cd5bec7"
  : PEDESTAL_MODE
  ? "5d04cc18-7cc8-4ad9-9c89-3cb977b28ad7"
  : PILE_CAP_MODE
  ? "5d114692-1aa5-414d-ab4f-acc36044f172"
  : CONCRETE_SLAB_MODE
  ? "6b15e08f-e330-4ac4-a08a-aa314dcd5a61"
  : BELT_MODE
  ? "cac9b722-2e4c-456d-b00b-ca618de2c757"
  : COLUMN_BASE_MODE ? "64ff79e2-8840-4c8b-aa67-37a7b86c1681" : "6dab38b7-266d-45ec-91ac-5540e842f9ec";
const REVISION_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "3523cac7-a40f-4efa-997a-f54478b907a9"
  : CONCRETE_SLAB_CURING_MODE
  ? "b3cb6b6b-9a70-47cd-9ec2-0dc8e26dff86"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "8d7255b2-d059-437b-878a-e2f0cafca8f2"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "061c3052-e2fa-43ba-8708-42de9587057a"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "2e7ea62f-11fd-4156-9163-57666cc40e10"
  : PEDESTAL_FORMWORK_MODE
  ? "7fa126fd-6c56-4084-8e9a-9e406beb4e29"
  : COLUMN_BASE_FORMWORK_MODE
  ? "825bdc4e-1f53-4c56-b4c1-fab0ff4c3c8f"
  : BELT_FORMWORK_MODE
  ? "201dcca9-129b-4421-b1e7-24192311188e"
  : ANCHOR_GROUP_FORMWORK_MODE
  ? "2a9332c3-5ac1-4119-b9dc-80a6cb43f1c7"
  : FORMWORK_REINFORCEMENT_MODE
  ? "5f613ffd-7334-4301-befc-d9d247d93ce8"
  : JOINT_REINFORCEMENT_MODE
  ? "26fcdee3-937b-46a6-9b70-3b51e8c2df1a"
  : BELT_REINFORCEMENT_MODE
  ? "a33d5d21-8a74-48d3-af64-d51c94ca8a29"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "95a9cf20-1bf7-4cae-a93f-91006a1e60c6"
  : COLUMN_BASE_REINFORCEMENT_MODE
  ? "5467a00c-9d25-40fb-a373-58ed5cccd861"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "69db7f2b-d130-4399-ac84-108cf83a6732"
  : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  ? "50d7a4bc-d8a0-486c-a63f-581eef46b58a"
  : STAIRS_REINFORCEMENT_MODE
  ? "1bb2462d-f04d-436e-908d-de733c3a87eb"
  : PEDESTAL_REINFORCEMENT_MODE
  ? "b3bec9c1-9ca7-4fce-b5f4-430c2354378b"
  : PILE_CAP_REINFORCEMENT_MODE
  ? "5677a578-2b22-45f2-b717-cf14fff72ff9"
  : CONCRETE_SLAB_REINFORCEMENT_MODE
  ? "8f80c539-743c-4cdc-8027-83673be0bf54"
  : SLAB_REINFORCEMENT_MODE
  ? "92db82c9-b28f-4ee6-b5ab-603cff24ab59"
  : REINFORCEMENT_FRAME_MODE
  ? "afa2d261-6f2d-4ff6-82d8-86ace4a27bc5"
  : STAIRS_MODE
  ? "2816e040-2ae2-4dd3-a349-6aa0e435dc92"
  : SLAB_FOUNDATION_MODE
  ? "20b008d3-0d71-4a15-94d3-1661efb61fca"
  : PEDESTAL_MODE
  ? "35d7f734-678c-4437-afe2-d1215b3819cb"
  : PILE_CAP_MODE
  ? "122fae02-b9c1-41d9-a22b-fc9079bb4a60"
  : CONCRETE_SLAB_MODE
  ? "75be00fe-2401-435a-8463-cb64cc32aae1"
  : BELT_MODE
  ? "f75dc0f6-6446-4d20-befd-d9784949c19a"
  : COLUMN_BASE_MODE ? "c4ebf81d-e16c-48cf-9e59-1e9f102a5bb3" : "e5eb834e-b0a2-4acb-9734-7206bdc34f72";
const ORIGINAL_PRIMARY = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 26 : CONCRETE_SLAB_REPAIR_MODE ? 64 : CONCRETE_SLAB_VIBRATION_MODE ? 32 : CONCRETE_SLAB_CURING_MODE ? 34 : CONCRETE_SLAB_LEVELING_MODE ? 30 : FORMWORK_MODE ? 120 : FORMWORK_REINFORCEMENT_MODE ? 3_200 : JOINT_REINFORCEMENT_MODE ? 1_800 : BELT_REINFORCEMENT_MODE ? 5_600 : ANCHOR_GROUP_REINFORCEMENT_MODE ? 2_500 : COLUMN_BASE_REINFORCEMENT_MODE ? 3_800 : REINFORCEMENT_FRAME_ASSEMBLY_MODE ? 1_500 : REINFORCEMENT_FRAME_REINFORCEMENT_MODE ? 5_200 : STAIRS_REINFORCEMENT_MODE ? 4_200 : PEDESTAL_REINFORCEMENT_MODE ? 3_200 : PILE_CAP_REINFORCEMENT_MODE ? 6_500 : CONCRETE_SLAB_REINFORCEMENT_MODE ? 9_800 : SLAB_REINFORCEMENT_MODE ? 11_200 : REINFORCEMENT_FRAME_MODE ? 12 : STAIRS_MODE ? 10 : SLAB_FOUNDATION_MODE ? 30 : PEDESTAL_MODE ? 8 : PILE_CAP_MODE ? 14 : CONCRETE_SLAB_MODE ? 12 : BELT_MODE ? 6 : COLUMN_BASE_MODE ? 7 : 8;
const CURRENT_PRIMARY = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 28 : CONCRETE_SLAB_REPAIR_MODE ? 66 : CONCRETE_SLAB_VIBRATION_MODE ? 34 : CONCRETE_SLAB_CURING_MODE ? 36 : CONCRETE_SLAB_LEVELING_MODE ? 32 : FORMWORK_MODE ? 150 : FORMWORK_REINFORCEMENT_MODE ? 3_300 : JOINT_REINFORCEMENT_MODE ? 1_900 : BELT_REINFORCEMENT_MODE ? 5_700 : ANCHOR_GROUP_REINFORCEMENT_MODE ? 2_600 : COLUMN_BASE_REINFORCEMENT_MODE ? 3_900 : REINFORCEMENT_FRAME_ASSEMBLY_MODE ? 1_600 : REINFORCEMENT_FRAME_REINFORCEMENT_MODE ? 5_300 : STAIRS_REINFORCEMENT_MODE ? 4_300 : PEDESTAL_REINFORCEMENT_MODE ? 3_300 : PILE_CAP_REINFORCEMENT_MODE ? 6_600 : CONCRETE_SLAB_REINFORCEMENT_MODE ? 9_900 : SLAB_REINFORCEMENT_MODE ? 11_300 : REINFORCEMENT_FRAME_MODE ? 18 : STAIRS_MODE ? 15 : SLAB_FOUNDATION_MODE ? 40 : PEDESTAL_MODE ? 12 : PILE_CAP_MODE ? 20 : CONCRETE_SLAB_MODE ? 18 : BELT_MODE ? 9 : 10;
const ORIGINAL_RESOURCE_QUANTITY = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 26 : CONCRETE_SLAB_REPAIR_MODE ? 64 : CONCRETE_SLAB_VIBRATION_MODE ? 32 : CONCRETE_SLAB_CURING_MODE ? 34 : CONCRETE_SLAB_LEVELING_MODE ? 30 : FORMWORK_MODE ? 576 : REINFORCEMENT_MODE ? ORIGINAL_PRIMARY : REINFORCEMENT_FRAME_MODE ? 12.72 : STAIRS_MODE ? 10.6 : SLAB_FOUNDATION_MODE ? 32.1 : PEDESTAL_MODE ? 8.48 : PILE_CAP_MODE ? 14.84 : CONCRETE_SLAB_MODE ? 12.72 : BELT_MODE ? 6.36 : COLUMN_BASE_MODE ? 7.42 : 8.48;
const CURRENT_RESOURCE_QUANTITY = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 28 : CONCRETE_SLAB_REPAIR_MODE ? 66 : CONCRETE_SLAB_VIBRATION_MODE ? 34 : CONCRETE_SLAB_CURING_MODE ? 36 : CONCRETE_SLAB_LEVELING_MODE ? 32 : FORMWORK_MODE ? 704 : REINFORCEMENT_MODE ? CURRENT_PRIMARY : REINFORCEMENT_FRAME_MODE ? 19.08 : STAIRS_MODE ? 15.9 : SLAB_FOUNDATION_MODE ? 42.8 : PEDESTAL_MODE ? 12.72 : PILE_CAP_MODE ? 21.2 : CONCRETE_SLAB_MODE ? 19.08 : BELT_MODE ? 9.54 : 10.6;
const ORIGINAL_DELIVERY_QUANTITY = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 3 : CONCRETE_SLAB_REPAIR_MODE ? 4 : CONCRETE_SLAB_OPERATION_MODE ? 2 : FORMWORK_MODE ? 90 : FORMWORK_REINFORCEMENT_MODE ? 96 : JOINT_REINFORCEMENT_MODE ? 54 : BELT_REINFORCEMENT_MODE ? 168 : ANCHOR_GROUP_REINFORCEMENT_MODE ? 65 : COLUMN_BASE_REINFORCEMENT_MODE ? 106.4 : REINFORCEMENT_FRAME_ASSEMBLY_MODE ? 28.5 : REINFORCEMENT_FRAME_REINFORCEMENT_MODE ? 150.8 : STAIRS_REINFORCEMENT_MODE ? 113.4 : PEDESTAL_REINFORCEMENT_MODE ? 89.6 : PILE_CAP_REINFORCEMENT_MODE ? 188.5 : CONCRETE_SLAB_REINFORCEMENT_MODE ? 303.8 : SLAB_REINFORCEMENT_MODE ? 380.8 : REINFORCEMENT_FRAME_MODE ? 305.28 : STAIRS_MODE ? 243.8 : SLAB_FOUNDATION_MODE ? 706.2 : PEDESTAL_MODE ? 169.6 : PILE_CAP_MODE ? 356.16 : CONCRETE_SLAB_MODE ? 254.4 : BELT_MODE ? 133.56 : COLUMN_BASE_MODE ? 163.24 : 203.52;
const CURRENT_DELIVERY_QUANTITY = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 3 : CONCRETE_SLAB_REPAIR_MODE ? 4 : CONCRETE_SLAB_OPERATION_MODE ? 2 : FORMWORK_MODE ? 121.6 : FORMWORK_REINFORCEMENT_MODE ? 99 : JOINT_REINFORCEMENT_MODE ? 57 : BELT_REINFORCEMENT_MODE ? 171 : ANCHOR_GROUP_REINFORCEMENT_MODE ? 67.6 : COLUMN_BASE_REINFORCEMENT_MODE ? 109.2 : REINFORCEMENT_FRAME_ASSEMBLY_MODE ? 30.4 : REINFORCEMENT_FRAME_REINFORCEMENT_MODE ? 153.7 : STAIRS_REINFORCEMENT_MODE ? 116.1 : PEDESTAL_REINFORCEMENT_MODE ? 92.4 : PILE_CAP_REINFORCEMENT_MODE ? 191.4 : CONCRETE_SLAB_REINFORCEMENT_MODE ? 306.9 : SLAB_REINFORCEMENT_MODE ? 384.2 : REINFORCEMENT_FRAME_MODE ? 457.92 : STAIRS_MODE ? 365.7 : SLAB_FOUNDATION_MODE ? 941.6 : PEDESTAL_MODE ? 254.4 : PILE_CAP_MODE ? 508.8 : CONCRETE_SLAB_MODE ? 381.6 : BELT_MODE ? 200.34 : COLUMN_BASE_MODE ? 233.2 : 254.4;
const PRIMARY_PARAMETER_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "vibration_worker_h"
  : CONCRETE_SLAB_CURING_MODE
  ? "curing_worker_h"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "leveling_worker_h"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "repair_material_placement_worker_h"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "positioning_worker_h"
  : FORMWORK_MODE
  ? "measured_formwork_contact_area_m2"
  : REINFORCEMENT_MODE
  ? "approved_reinforcement_schedule_weight_kg"
  : "plan_dimension_concrete_volume_m3";
const PRIMARY_UNIT_RU = CONCRETE_SLAB_VIBRATION_MODE
  ? "чел.-ч"
  : CONCRETE_SLAB_CURING_MODE
  ? "чел.-ч"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "чел.-ч"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "чел.-ч"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "чел.-ч"
  : FORMWORK_MODE ? "м²" : REINFORCEMENT_MODE ? "кг" : "м³";
const TITLE_PRIMARY = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 28 : CONCRETE_SLAB_REPAIR_MODE ? 4.2 : CONCRETE_SLAB_OPERATION_MODE ? 26 : CURRENT_PRIMARY;
const TITLE_UNIT_RU = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? "шт" : CONCRETE_SLAB_OPERATION_MODE ? "м³" : PRIMARY_UNIT_RU;
const PRIMARY_RESOURCE_ROW_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "work:concrete:slab-vibration"
  : CONCRETE_SLAB_CURING_MODE
  ? "work:concrete:slab-curing"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "work:concrete:slab-leveling"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "work:concrete:slab-repair-placement"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "work:concrete:slab-embedded-items-positioning"
  : FORMWORK_MODE
  ? "equipment:formwork:frami-xlife-panels-rental"
  : REINFORCEMENT_MODE
  ? "material:reinforcement:steel-approved-schedule"
  : "material:concrete:ready-mix";
const DELIVERY_RESOURCE_ROW_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "delivery:concrete:internal-vibrator-mobilization"
  : CONCRETE_SLAB_CURING_MODE
  ? "delivery:concrete:curing-equipment-mobilization"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "delivery:concrete:slab-leveling-equipment-mobilization"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "delivery:concrete:slab-repair-material"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "delivery:concrete:slab-embedded-items"
  : FORMWORK_MODE
  ? "delivery:formwork:outbound-kit"
  : REINFORCEMENT_MODE
  ? "delivery:reinforcement:steel"
  : "delivery:concrete:ready-mix";
const PRIMARY_RESOURCE_TITLE = CONCRETE_SLAB_VIBRATION_MODE
  ? "Виброуплотнение свежеуложенной бетонной смеси плиты"
  : CONCRETE_SLAB_CURING_MODE
  ? "Уход за поверхностью бетонной плиты по утверждённому способу"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "Выравнивание и срезка поверхности свежеуложенной бетонной плиты"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "Укладка и обработка ремонтного материала бетонной плиты"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "Установка закладных изделий в проектное положение"
  : FORMWORK_MODE
  ? "Щиты рамной опалубки Doka Frami Xlife"
  : REINFORCEMENT_MODE
  ? "Арматурная сталь по утверждённой ведомости стержней"
  : "Товарный бетон B25";
const EXPECTED_ROW_COUNT = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 14 : CONCRETE_SLAB_REPAIR_MODE ? 16 : CONCRETE_SLAB_VIBRATION_MODE ? 4 : CONCRETE_SLAB_CURING_MODE ? 5 : CONCRETE_SLAB_LEVELING_MODE ? 5 : FORMWORK_MODE ? 24 : REINFORCEMENT_FRAME_ASSEMBLY_MODE ? 9 : JOINT_REINFORCEMENT_MODE ? 15 : REINFORCEMENT_MODE ? 16 : 9;
const EXPECTED_PROCUREMENT_COUNT = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 9 : CONCRETE_SLAB_REPAIR_MODE ? 12 : CONCRETE_SLAB_VIBRATION_MODE ? 3 : CONCRETE_SLAB_CURING_MODE ? 4 : CONCRETE_SLAB_LEVELING_MODE ? 4 : FORMWORK_MODE ? 14 : REINFORCEMENT_FRAME_ASSEMBLY_MODE ? 6 : JOINT_REINFORCEMENT_MODE ? 9 : REINFORCEMENT_MODE ? 10 : 6;
const TITLE_NEEDLE = CONCRETE_SLAB_VIBRATION_MODE
  ? "Вибрирование бетонной плиты для высокой нагрузки"
  : CONCRETE_SLAB_CURING_MODE
  ? "Уход за бетонной плитой для высокой нагрузки"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "Выравнивание бетонной плиты для высокой нагрузки"
  : CONCRETE_SLAB_REPAIR_MODE
  ? "Ремонт бетонной плиты для высокой нагрузки"
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? "Монтаж закладных для бетонной плиты для высокой нагрузки"
  : PEDESTAL_FORMWORK_MODE
  ? "Съёмная щитовая опалубка монолитного железобетонного пьедестала"
  : COLUMN_BASE_FORMWORK_MODE
  ? "Съёмная опалубка столбчатого железобетонного основания"
  : BELT_FORMWORK_MODE
  ? "Съёмная опалубка монолитного пояса"
  : ANCHOR_GROUP_FORMWORK_MODE
  ? "Съёмная опалубка основания анкерной группы"
  : FORMWORK_REINFORCEMENT_MODE
  ? "Монтаж арматуры монолитной конструкции в опалубке"
  : JOINT_REINFORCEMENT_MODE
  ? "Армирование краёв деформационного шва"
  : BELT_REINFORCEMENT_MODE
  ? "Армирование монолитного пояса"
  : ANCHOR_GROUP_REINFORCEMENT_MODE
  ? "Армирование анкерной группы"
  : COLUMN_BASE_REINFORCEMENT_MODE
  ? "Армирование столбчатого основания"
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? "Устройство армокаркаса в стандартной зоне"
  : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
  ? "Армирование армокаркаса"
  : STAIRS_REINFORCEMENT_MODE
  ? "Армирование бетонной лестницы"
  : PEDESTAL_REINFORCEMENT_MODE
  ? "Армирование бетонного пьедестала"
  : PILE_CAP_REINFORCEMENT_MODE
  ? "Армирование ростверка"
  : CONCRETE_SLAB_REINFORCEMENT_MODE
  ? "Армирование бетонной плиты"
  : SLAB_REINFORCEMENT_MODE
  ? "Армирование плитного фундамента"
  : REINFORCEMENT_FRAME_MODE
  ? "Бетонирование армокаркаса"
  : STAIRS_MODE
  ? "Бетонирование бетонной лестницы"
  : SLAB_FOUNDATION_MODE
  ? "Бетонирование плитного фундамента"
  : PEDESTAL_MODE
  ? "Бетонирование бетонного пьедестала"
  : PILE_CAP_MODE
  ? "Бетонирование ростверка"
  : CONCRETE_SLAB_MODE
  ? "Бетонирование бетонной плиты"
  : BELT_MODE
  ? "Бетонирование монолитного пояса"
  : COLUMN_BASE_MODE ? "Бетонирование столбчатого основания" : "Бетонирование основания анкерной группы";
const ROOT = resolve(
  CONCRETE_SLAB_VIBRATION_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-vibration-family-android-native"
    : CONCRETE_SLAB_CURING_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-curing-family-android-native"
    : CONCRETE_SLAB_LEVELING_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-leveling-family-android-native"
    : CONCRETE_SLAB_REPAIR_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-repair-family-android-native"
    : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-embedded-items-family-android-native"
    : PEDESTAL_FORMWORK_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-formwork-family-android-native"
    : COLUMN_BASE_FORMWORK_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-formwork-family-android-native"
    : BELT_FORMWORK_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-formwork-family-android-native"
    : ANCHOR_GROUP_FORMWORK_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-formwork-family-android-native"
    : FORMWORK_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-reinforcement-family-android-native"
    : JOINT_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/joint-reinforcement-family-android-native"
    : BELT_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-reinforcement-family-android-native"
    : ANCHOR_GROUP_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-reinforcement-family-android-native"
    : COLUMN_BASE_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-reinforcement-family-android-native"
    : REINFORCEMENT_FRAME_ASSEMBLY_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-assembly-family-android-native"
    : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-reinforcement-family-android-native"
    : STAIRS_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/stairs-reinforcement-family-android-native"
    : PEDESTAL_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-reinforcement-family-android-native"
    : PILE_CAP_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-reinforcement-family-android-native"
    : CONCRETE_SLAB_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-reinforcement-family-android-native"
    : SLAB_REINFORCEMENT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/slab-foundation-reinforcement-family-android-native"
    : REINFORCEMENT_FRAME_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-concrete-placement-family-android-native"
    : STAIRS_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/stairs-concrete-placement-family-android-native"
    : SLAB_FOUNDATION_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/slab-foundation-concrete-placement-family-android-native"
    : PEDESTAL_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-concrete-placement-family-android-native"
    : PILE_CAP_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-concrete-placement-family-android-native"
    : CONCRETE_SLAB_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-concrete-placement-family-android-native"
    : BELT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-concrete-placement-family-android-native"
    : COLUMN_BASE_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-concrete-placement-family-android-native"
    : ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-concrete-placement-family-android-native",
);
const DEVICE_ROOT = resolve(ROOT, "device");
const OUTPUT = resolve(ROOT, "acceptance.json");
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const BACKEND_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/backend.json");
const METRO_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/metro.json");
const MASTER = resolve(
  CONCRETE_SLAB_REPAIR_MODE || CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
    ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (17).md"
    : REINFORCEMENT_FRAME_ASSEMBLY_MODE || CONCRETE_SLAB_OPERATION_MODE
    ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (16).md"
    : "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (15).md",
);
const NATIVE_WRITE_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-installation-family-android-native/acceptance.json",
);
const FAMILY_ACCEPTANCE_REQUIRED = FORMWORK_MODE || REINFORCEMENT_FRAME_ASSEMBLY_MODE
  || CONCRETE_SLAB_OPERATION_MODE;
const FAMILY_BACKEND_RECEIPT = CONCRETE_SLAB_VIBRATION_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-vibration-family-api/acceptance.json")
  : CONCRETE_SLAB_CURING_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-curing-family-api/acceptance.json")
  : CONCRETE_SLAB_LEVELING_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-leveling-family-api/acceptance.json")
  : CONCRETE_SLAB_REPAIR_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-repair-family-api/acceptance.json")
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-embedded-items-family-api/acceptance.json")
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-assembly-family-api/acceptance.json")
  : FORMWORK_MODE
  ? resolve(PEDESTAL_FORMWORK_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-formwork-family-api/acceptance.json"
    : COLUMN_BASE_FORMWORK_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-formwork-family-api/acceptance.json"
    : BELT_FORMWORK_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-formwork-family-api/acceptance.json"
    : ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-formwork-family-api/acceptance.json")
  : null;
const FAMILY_WEB_RECEIPT = CONCRETE_SLAB_VIBRATION_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-vibration-family-differential-web/acceptance.json")
  : CONCRETE_SLAB_CURING_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-curing-family-differential-web/acceptance.json")
  : CONCRETE_SLAB_LEVELING_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-leveling-family-differential-web/acceptance.json")
  : CONCRETE_SLAB_REPAIR_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-repair-family-differential-web/acceptance.json")
  : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-embedded-items-family-differential-web/acceptance.json")
  : REINFORCEMENT_FRAME_ASSEMBLY_MODE
  ? resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-assembly-family-differential-web/acceptance.json")
  : FORMWORK_MODE
  ? resolve(PEDESTAL_FORMWORK_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-formwork-family-web/acceptance.json"
    : COLUMN_BASE_FORMWORK_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-formwork-family-web/acceptance.json"
    : BELT_FORMWORK_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-formwork-family-web/acceptance.json"
    : ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-formwork-family-web/acceptance.json")
  : null;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`${ERROR_PREFIX}:${code}`);
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

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function readAudit(path: string): AuditRow[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRow);
}

function resources(): Json {
  const disk = statfsSync(resolve("."));
  return {
    capturedAt: new Date().toISOString(),
    availableMemoryBytes: freemem(),
    availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
  };
}

async function login(): Promise<string> {
  const credentials = readJson(CREDENTIALS);
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const owner = credentials.owner as Json | undefined;
  invariant(owner?.role === "platform_developer"
    && owner.email
    && owner.password
    && credentials.publishable_key,
  "OWNER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: owner.email, password: owner.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && body.access_token && body.user?.id === owner.user_id,
    `LOGIN_HTTP_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}`);
  return body;
}

async function allRows(authorization: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(authorization, `revisions/${REVISION_ID}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

function captureEvidence(adbPath: string, deviceId: string, name: string): Json[] {
  const result = capture(adbPath, deviceId, ROOT, name);
  return [result.screenshot, result.uiDump]
    .filter((path): path is string => Boolean(path))
    .map((path) => {
      const absolute = resolve(path);
      const bytes = readFileSync(absolute);
      return { path: path.replace(/\\/gu, "/"), bytes: bytes.length, sha256: sha256(bytes) };
    });
}

function containsQuantity(text: string, quantity: number): boolean {
  return text.replace(/[\s\u00a0]/gu, "").replace(/,/gu, ".").includes(String(quantity));
}

function currentTitleVisible(snapshot: UiSnapshot): boolean {
  return snapshot.ok && snapshot.nodes.some((node) =>
    nodeHasId(node, "request-estimate-selected-work-title")
    && node.text.includes(TITLE_NEEDLE)
    && node.text.includes(TITLE_UNIT_RU)
    && containsQuantity(node.text, TITLE_PRIMARY));
}

function primaryResourceVisible(snapshot: UiSnapshot): boolean {
  return snapshot.ok && snapshot.nodes.some((node) =>
    node.text.includes(PRIMARY_RESOURCE_TITLE)
    && containsQuantity(node.text, CURRENT_RESOURCE_QUANTITY));
}

function pdfViewerVisible(snapshot: UiSnapshot): boolean {
  return snapshot.ok && (
    snapshot.nodes.some((node) => nodeHasId(node, "pdf-viewer-back"))
    || snapshot.nodes.some((node) => node.packageName !== PACKAGE_NAME
      && /pdf/iu.test(`${node.text} ${node.contentDesc}`))
  );
}

async function verifyCurrentEstimate(
  adbPath: string,
  deviceId: string,
  evidencePrefix: string,
): Promise<Json[]> {
  await scrollToStart(adbPath, deviceId, 48);
  const title = await seekNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "request-estimate-selected-work-title"),
    24,
  );
  invariant(title.node && currentTitleVisible(title.snapshot), "CURRENT_TITLE_NOT_VISIBLE");
  const evidence = captureEvidence(adbPath, deviceId,
    `${evidencePrefix}_title_${CURRENT_PRIMARY}_${PRIMARY_UNIT_RU}`);
  const primaryResource = primaryResourceVisible(title.snapshot)
    ? { snapshot: title.snapshot, node: title.snapshot.nodes.find((node) =>
      node.text.includes(PRIMARY_RESOURCE_TITLE)
      && containsQuantity(node.text, CURRENT_RESOURCE_QUANTITY)) ?? null }
    : await seekNode(
      adbPath,
      deviceId,
      (node) => node.text.includes(PRIMARY_RESOURCE_TITLE)
        && containsQuantity(node.text, CURRENT_RESOURCE_QUANTITY),
      16,
    );
  invariant(primaryResource.node && primaryResourceVisible(primaryResource.snapshot),
    "PRIMARY_RESOURCE_NOT_VISIBLE");
  evidence.push(...captureEvidence(adbPath, deviceId,
    `${evidencePrefix}_primary_resource_${String(CURRENT_RESOURCE_QUANTITY).replace(".", "_")}`));
  return evidence;
}

async function bootstrap(adbPath: string, deviceId: string): Promise<void> {
  setupAndroidRuntime(DEV_PORT, PACKAGE_NAME, {
    clearAppState: false,
    reversePorts: [54_321, 54_329, 8_765],
  });
  runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, buildDevClientUri(DEV_PORT), PACKAGE_NAME), 45_000);
  const deadline = Date.now() + 180_000;
  let last = dumpUi(adbPath, deviceId);
  while (Date.now() < deadline) {
    last = dumpUi(adbPath, deviceId);
    invariant(!last.nodes.some((node) => nodeHasId(node, "config-recovery-state")),
      "DEV_CLIENT_CONFIG_RECOVERY_RED");
    if (last.text.includes("ROUTE_PROOF_AUTHENTICATED_SESSION_READY")
      || last.nodes.some((node) => nodeHasId(node, "app-bottom-nav"))) return;
    const continueNode = last.nodes.find((node) => node.enabled
      && /^(Continue|Reload)$/iu.test(node.text.trim()));
    if (continueNode) {
      tapNode(adbPath, deviceId, continueNode);
      await sleep(1_000);
      continue;
    }
    const localConsumerLogin = last.nodes.find((node) =>
      nodeHasId(node, "auth.login.local-consumer")
      || nodeHasId(node, "protected-identity-local-consumer-login"));
    if (localConsumerLogin?.enabled) {
      tapNode(adbPath, deviceId, localConsumerLogin);
      await sleep(1_000);
      continue;
    }
    await sleep(500);
  }
  throw new Error(`${ERROR_PREFIX}:DEV_CLIENT_BOOTSTRAP_RED:${last.text.slice(0, 500)}`);
}

async function launchRevision(adbPath: string, deviceId: string, launchId: string): Promise<void> {
  const uri = new URL("rik:///request");
  uri.searchParams.set("canonicalRevisionId", REVISION_ID);
  uri.searchParams.set("launchId", launchId);
  runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, uri.toString(), PACKAGE_NAME), 45_000);
}

async function waitForRevisionAudit(auditPath: string, start: number): Promise<AuditRow[]> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const rows = readAudit(auditPath).slice(start);
    if (rows.some((row) => row.method === "GET"
      && row.status === 200
      && row.path === `/revisions/${REVISION_ID}`)
      && rows.some((row) => row.method === "GET"
        && row.status === 200
        && String(row.path).startsWith(`/revisions/${REVISION_ID}/rows`))) return rows;
    await sleep(250);
  }
  throw new Error(`${ERROR_PREFIX}:REVISION_GETS_NOT_OBSERVED`);
}

async function waitForPdfAudit(auditPath: string, start: number): Promise<AuditRow[]> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const rows = readAudit(auditPath).slice(start);
    if (rows.some((row) => (row.method === "GET" || row.method === "POST")
      && Number(row.status) >= 200
      && Number(row.status) < 300
      && String(row.path).startsWith(`/revisions/${REVISION_ID}/artifacts/pdf`))) return rows;
    await sleep(250);
  }
  throw new Error(`${ERROR_PREFIX}:PDF_REQUEST_NOT_OBSERVED`);
}

async function tapFullyVisibleId(
  adbPath: string,
  deviceId: string,
  id: string,
): Promise<boolean> {
  const found = await seekNode(
    adbPath,
    deviceId,
    (node) => {
      const box = bounds(node);
      return nodeHasId(node, id)
        && node.enabled
        && box != null
        && box.top >= 283
        && box.bottom <= 2_100;
    },
    60,
    "fine",
  );
  return Boolean(found.node && tapNode(adbPath, deviceId, found.node));
}

function assertReusableNativeWriteProof(): Json {
  const receipt = readJson(NATIVE_WRITE_RECEIPT);
  const proof = receipt.reusedProof as Json | undefined;
  const gates = receipt.gates as Json | undefined;
  invariant(receipt.executionMode === "RESUME_ONLY_NO_CREATE_NO_RECALCULATE"
    && proof?.nativeTransport === true
    && proof.parent?.revisionId === "5ecaaef9-c605-483a-8fd1-6c1e44504c75"
    && proof.edited?.revisionId === "a67f674a-270b-4dab-9ade-4b6f3cc216d5"
    && proof.edited?.parentRevisionId === proof.parent?.revisionId
    && gates?.reusedNativeCreate48 === "GREEN"
    && gates?.reusedNativeEdit52 === "GREEN",
  "REUSABLE_NATIVE_WRITE_RECEIPT_RED");
  const auditPath = resolve(String(proof.proofAuditPath));
  invariant(existsSync(auditPath), "REUSABLE_NATIVE_WRITE_AUDIT_MISSING");
  const audit = readAudit(auditPath);
  const compile = audit[Number(proof.compileAuditLine) - 1];
  const recalculate = audit[Number(proof.recalculateAuditLine) - 1];
  invariant(compile?.method === "POST" && compile.path === "/jobs/compile"
    && compile.status === 202 && String(compile.userAgent).startsWith("okhttp/")
    && recalculate?.method === "POST" && recalculate.path === "/jobs/recalculate"
    && recalculate.status === 202 && String(recalculate.userAgent).startsWith("okhttp/"),
  "REUSABLE_NATIVE_WRITE_AUDIT_RED");
  const sharedPathFiles = [
    {
      path: "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx",
      needles: ["compileConsumerCanonicalBaseline", "recalculateConsumerCanonicalEstimate"],
    },
    {
      path: "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      needles: ["compileCanonicalEstimateAndLoad"],
    },
    {
      path: "src/features/consumerRepair/consumerCanonicalParameterEditor.ts",
      needles: ["recalculateCanonicalEstimateAndLoad"],
    },
    {
      path: "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts",
      needles: ["jobs/compile", "jobs/recalculate"],
    },
    {
      path: "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
      needles: ["editable-param-batch-apply"],
    },
  ].map((entry) => {
    const absolute = resolve(entry.path);
    const bytes = readFileSync(absolute);
    const source = bytes.toString("utf8");
    invariant(entry.needles.every((needle) => source.includes(needle)),
      `SHARED_NATIVE_WRITE_PATH_DRIFT:${entry.path}`);
    return { path: entry.path, sha256: sha256(bytes) };
  });
  return {
    reused: true,
    scope: "COMMON_ANDROID_REQUEST_ROUTE_PARAMETER_EDITOR_OKHTTP_COMMAND_PATH_ONLY",
    sourceReceipt: {
      path: NATIVE_WRITE_RECEIPT.replace(/\\/gu, "/"),
      sha256: sha256(readFileSync(NATIVE_WRITE_RECEIPT)),
    },
    sourceRevisions: {
      parentRevisionId: proof.parent.revisionId,
      editedRevisionId: proof.edited.revisionId,
    },
    closedAuditEvents: {
      compile: { line: proof.compileAuditLine, ...compile },
      recalculate: { line: proof.recalculateAuditLine, ...recalculate },
    },
    sharedPathFiles,
    limitation: "This reuse does not claim that the current family revision was created or edited on Android; family arithmetic and lineage are accepted separately by backend and Web, while this run covers Android read/history/documents/cold.",
  };
}

async function main(): Promise<void> {
  mkdirSync(ROOT, { recursive: true });
  const before = resources();
  const androidWasAlreadyOnline = /\tdevice\b/u.test(
    execFileSync("adb", ["devices"], { encoding: "utf8", timeout: 10_000 }),
  );
  invariant(before.availableMemoryBytes >= 1024 ** 3 || androidWasAlreadyOnline,
    `AVAILABLE_MEMORY_RED:${before.availableMemoryBytes}`);
  invariant(existsSync(MASTER) && existsSync(BACKEND_RECEIPT) && existsSync(METRO_RECEIPT)
    && existsSync(NATIVE_WRITE_RECEIPT)
    && (!FAMILY_ACCEPTANCE_REQUIRED || (FAMILY_BACKEND_RECEIPT != null
      && FAMILY_WEB_RECEIPT != null
      && existsSync(FAMILY_BACKEND_RECEIPT)
      && existsSync(FAMILY_WEB_RECEIPT))),
    "REQUIRED_INPUT_MISSING");
  const nativeWriteCoverage = assertReusableNativeWriteProof();
  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  if (FAMILY_ACCEPTANCE_REQUIRED) {
    const familyBackend = readJson(FAMILY_BACKEND_RECEIPT!);
    const familyWeb = readJson(FAMILY_WEB_RECEIPT!);
    const familyWebLineageGreen = CONCRETE_SLAB_OPERATION_MODE
      ? (familyWeb.results as Json[] | undefined)?.some((result) =>
        result.contextKey === "high_load"
          && result.create?.revisionId === PARENT_REVISION_ID
          && result.edit?.revisionId === REVISION_ID)
      : REINFORCEMENT_FRAME_ASSEMBLY_MODE
      ? (familyWeb.results as Json[] | undefined)?.some((result) =>
        result.contextKey === "standard"
          && result.create?.revisionId === PARENT_REVISION_ID
          && result.edit?.revisionId === REVISION_ID)
      : familyWeb.sensitivity?.revisionId === REVISION_ID
        && familyWeb.scenarioOriginal?.revisionId === PARENT_REVISION_ID;
    invariant(
      familyBackend.status === (CONCRETE_SLAB_VIBRATION_MODE
        ? "GREEN_CONCRETE_SLAB_VIBRATION_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : CONCRETE_SLAB_CURING_MODE
        ? "GREEN_CONCRETE_SLAB_CURING_6_OF_6_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : CONCRETE_SLAB_LEVELING_MODE
        ? "GREEN_CONCRETE_SLAB_LEVELING_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : CONCRETE_SLAB_REPAIR_MODE
        ? "GREEN_CONCRETE_SLAB_REPAIR_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
        ? "GREEN_CONCRETE_SLAB_EMBEDDED_ITEMS_6_OF_6_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : REINFORCEMENT_FRAME_ASSEMBLY_MODE
        ? "GREEN_REINFORCEMENT_FRAME_ASSEMBLY_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : PEDESTAL_FORMWORK_MODE
        ? "GREEN_PEDESTAL_FORMWORK_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : COLUMN_BASE_FORMWORK_MODE
        ? "GREEN_COLUMN_BASE_FORMWORK_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : BELT_FORMWORK_MODE
        ? "GREEN_BELT_FORMWORK_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : "GREEN_ANCHOR_GROUP_FORMWORK_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE")
        && familyWeb.status === (CONCRETE_SLAB_VIBRATION_MODE
          ? "GREEN_CONCRETE_SLAB_VIBRATION_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
          : CONCRETE_SLAB_CURING_MODE
          ? "GREEN_CONCRETE_SLAB_CURING_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
          : CONCRETE_SLAB_LEVELING_MODE
          ? "GREEN_CONCRETE_SLAB_LEVELING_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
          : CONCRETE_SLAB_REPAIR_MODE
          ? "GREEN_CONCRETE_SLAB_REPAIR_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
          : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
          ? "GREEN_CONCRETE_SLAB_EMBEDDED_ITEMS_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
          : REINFORCEMENT_FRAME_ASSEMBLY_MODE
          ? "GREEN_REINFORCEMENT_FRAME_ASSEMBLY_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
          : PEDESTAL_FORMWORK_MODE
          ? "GREEN_EXACT_FORMWORK_FRAMI_XLIFE_PEDESTAL_STANDARD_FULL_WEB_BACKEND_PDF_PROCUREMENT_HISTORY_COLD"
          : COLUMN_BASE_FORMWORK_MODE
          ? "GREEN_EXACT_FORMWORK_FRAMI_XLIFE_COLUMN_BASE_STANDARD_FULL_WEB_BACKEND_PDF_PROCUREMENT_HISTORY_COLD"
          : BELT_FORMWORK_MODE
          ? "GREEN_EXACT_FORMWORK_FRAMI_XLIFE_BELT_STANDARD_FULL_WEB_BACKEND_PDF_PROCUREMENT_HISTORY_COLD"
          : "GREEN_EXACT_FORMWORK_FRAMI_XLIFE_ANCHOR_GROUP_STANDARD_FULL_WEB_BACKEND_PDF_PROCUREMENT_HISTORY_COLD")
        && familyWebLineageGreen === true,
      "FAMILY_ACCEPTANCE_RECEIPTS_RED",
    );
  }
  const tuple = backendReceipt.compatibility_tuple as Json;
  invariant(tuple.definitionReleaseId === RELEASE_ID
    && tuple.searchReleaseId === SEARCH_RELEASE_ID
    && metroReceipt.definition_release_id === RELEASE_ID
    && metroReceipt.search_release_id === SEARCH_RELEASE_ID,
  "RUNTIME_TUPLE_RED");
  const authorization = await login();
  const manifest = await api(authorization, "runtime-manifest");
  invariant(manifest.definitionRelease?.status === "prepared"
    && manifest.searchRelease?.status === "draft"
    && manifest.definitionRelease?.activatedAt == null
    && manifest.searchRelease?.activatedAt == null,
  "LIFECYCLE_RED");
  const parent = await api(authorization, `revisions/${PARENT_REVISION_ID}`);
  const revision = await api(authorization, `revisions/${REVISION_ID}`);
  const rows = await allRows(authorization);
  const primaryResource = rows.find((row) => row.rowId === PRIMARY_RESOURCE_ROW_ID);
  invariant(revision.parentRevisionId === PARENT_REVISION_ID
    && revision.releaseId === RELEASE_ID
    && revision.definitionVersionId === DEFINITION_ID
    && revision.catalogId === CATALOG_ID
    && Number(parent.parameters?.[PRIMARY_PARAMETER_ID]) === ORIGINAL_PRIMARY
    && Number(revision.parameters?.[PRIMARY_PARAMETER_ID]) === CURRENT_PRIMARY
    && rows.length === EXPECTED_ROW_COUNT
    && Math.abs(Number(primaryResource?.quantity) - CURRENT_RESOURCE_QUANTITY) < 1e-9,
  "REVISION_TRUTH_RED");

  const metro = await ensureMetro(DEV_PORT);
  invariant(await isMetroReachable(DEV_PORT) && metro.configurationValidated, "METRO_RED");
  const device = await ensureAndroidApi34DeviceReady({
    artifactDir: DEVICE_ROOT,
    bootTimeoutMs: 240_000,
    allowCreateAvd: false,
  });
  invariant(device.final_status === API34_DEVICE_READY
    && device.android_sdk === 34
    && device.single_device_active === true
    && device.device_id
    && device.adb_path,
  `DEVICE_RED:${device.final_status}`);
  const adbPath = String(device.adb_path);
  const deviceId = String(device.device_id);
  const installed = String(runAdb(["-s", deviceId, "shell", "pm", "path", PACKAGE_NAME], 20_000));
  invariant(installed.includes("package:"), "PACKAGE_NOT_INSTALLED");
  await bootstrap(adbPath, deviceId);

  const auditPath = [
    resolve(`.release-runtime/r568/runtime/local-developer-current/runtime/backend-${String(tuple.sourceTree).slice(0, 12)}/request-audit.jsonl`),
    resolve(`.release-runtime/r4a13-6/exact-physical-norm-successors/${FAMILY_KEY}-family-runtime/runtime/backend-${String(tuple.sourceTree).slice(0, 12)}/request-audit.jsonl`),
  ].find((candidate) => existsSync(candidate)) ?? "";
  invariant(existsSync(auditPath), `AUDIT_MISSING:${auditPath}`);
  let evidence: Json[];
  if (RESUME_AFTER_PDF) {
    invariant(PEDESTAL_FORMWORK_MODE, "RESUME_AFTER_PDF_SCOPE_RED");
    const checkpointNames = readdirSync(ROOT).filter((name) =>
      /^(?:01_current|02_history|03_procurement|03b_detailed_history_diff|04_pdf_viewer).*\.(?:png|xml)$/u.test(name));
    invariant(checkpointNames.length === 12
      && checkpointNames.some((name) => name === "04_pdf_viewer.png")
      && checkpointNames.some((name) => name === "04_pdf_viewer.xml"),
    `RESUME_AFTER_PDF_EVIDENCE_RED:${checkpointNames.length}`);
    evidence = checkpointNames.sort().map((name) => {
      const path = resolve(ROOT, name);
      const bytes = readFileSync(path);
      return { path: path.replace(/\\/gu, "/"), bytes: bytes.length, sha256: sha256(bytes) };
    });
    const checkpointAudit = readAudit(auditPath);
    invariant(checkpointAudit.some((row) => row.method === "GET"
      && row.path === `/revisions/${REVISION_ID}`)
      && checkpointAudit.some((row) => (row.method === "GET" || row.method === "POST")
        && Number(row.status) >= 200 && Number(row.status) < 300
        && String(row.path).startsWith(`/revisions/${REVISION_ID}/artifacts/pdf`)),
    "RESUME_AFTER_PDF_AUDIT_RED");
  } else {
    if (RESUME_AFTER_HISTORY) {
      const checkpointNames = readdirSync(ROOT).filter((name) =>
        /^(?:01_current|02_history).+\.(?:png|xml)$/u.test(name));
      invariant(checkpointNames.length === 6, `RESUME_AFTER_HISTORY_EVIDENCE_RED:${checkpointNames.length}`);
      evidence = checkpointNames.sort().map((name) => {
        const path = resolve(ROOT, name);
        const bytes = readFileSync(path);
        return { path: path.replace(/\\/gu, "/"), bytes: bytes.length, sha256: sha256(bytes) };
      });
      const checkpointAudit = readAudit(auditPath);
      invariant(checkpointAudit.some((row) => row.method === "GET"
        && row.path === `/revisions/${REVISION_ID}`),
      "RESUME_AFTER_HISTORY_AUDIT_RED");
      const resumeAuditStart = checkpointAudit.length;
      await launchRevision(adbPath, deviceId,
        `${FAMILY_KEY}-resume-after-history:${Date.now().toString(36)}`);
      await waitForRevisionAudit(auditPath, resumeAuditStart);
    } else {
      const auditStart = readAudit(auditPath).length;
      await launchRevision(adbPath, deviceId,
        `${FAMILY_KEY}-native:${Date.now().toString(36)}`);
      await waitForRevisionAudit(auditPath, auditStart);
      evidence = await verifyCurrentEstimate(adbPath, deviceId, "01_current");

      const timeline = await seekNode(
        adbPath,
        deviceId,
        (node) => nodeHasId(node, "consumer-estimate-edit-history-2-revisions-1-diffs"),
        16,
      );
      invariant(timeline.node
        && timeline.node.text.includes("Версий сметы: 2")
        && timeline.node.text.includes("изменений: 1"),
      "HISTORY_NOT_VISIBLE");
      evidence.push(...captureEvidence(adbPath, deviceId,
        `02_history_${ORIGINAL_PRIMARY}_to_${CURRENT_PRIMARY}`));
    }

    const procurementOpen = await waitForSnapshot(
      adbPath,
      deviceId,
      (snapshot) => snapshot.nodes.some((node) => nodeHasId(node, "consumer-estimate-procurement-list")),
      2_000,
    );
    if (!procurementOpen.nodes.some((node) => nodeHasId(node, "consumer-estimate-procurement-list"))) {
      invariant(await tapFullyVisibleId(adbPath, deviceId, "consumer-estimate-open-procurement"),
        "PROCUREMENT_ACTION_RED");
    }
    const procurementHeader = await seekNode(
      adbPath,
      deviceId,
      (node) => node.text.includes(`${EXPECTED_PROCUREMENT_COUNT} позиц`),
      28,
    );
    invariant(procurementHeader.node, "PROCUREMENT_HEADER_RED");
    const procurementLastRow = await seekNode(
      adbPath,
      deviceId,
      (node) => nodeHasId(node, `consumer-estimate-procurement-row-${DELIVERY_RESOURCE_ROW_ID}`),
      40,
    );
    invariant(procurementLastRow.node
      && procurementLastRow.snapshot.text.includes("Цена не заполнена")
      && procurementLastRow.snapshot.text.includes(String(CURRENT_DELIVERY_QUANTITY).replace(".", ",")),
    "PROCUREMENT_PANEL_RED");
    evidence.push(...captureEvidence(adbPath, deviceId,
      `03_procurement_${EXPECTED_PROCUREMENT_COUNT}_unpriced`));

    const detailedTimeline = await seekNode(
      adbPath,
      deviceId,
      (node) => nodeHasId(node, "estimate-revision-timeline")
        && node.contentDesc.includes("2-revisions--1-diffs"),
      40,
      "fine",
    );
    const familySpecificDiff = await seekNode(
      adbPath,
      deviceId,
      (node) => FORMWORK_MODE
        ? nodeHasId(node, "estimate-revision-diff-param-assembly_alignment_worker_h")
          && containsQuantity(node.text, 90)
          && containsQuantity(node.text, 112)
        : nodeHasId(node, `estimate-revision-diff-row-${PRIMARY_RESOURCE_ROW_ID}`)
          && containsQuantity(node.text, ORIGINAL_RESOURCE_QUANTITY)
          && containsQuantity(node.text, CURRENT_RESOURCE_QUANTITY),
      40,
      "fine",
    );
    const deliveryDiff = CONCRETE_SLAB_OPERATION_MODE ? null : await seekNode(
      adbPath,
      deviceId,
      (node) => nodeHasId(node, `estimate-revision-diff-row-${DELIVERY_RESOURCE_ROW_ID}`)
        && containsQuantity(node.text, ORIGINAL_DELIVERY_QUANTITY)
        && containsQuantity(node.text, CURRENT_DELIVERY_QUANTITY),
      40,
      "fine",
    );
    invariant(detailedTimeline.node && familySpecificDiff.node
      && (CONCRETE_SLAB_OPERATION_MODE || deliveryDiff?.node),
    "DETAILED_HISTORY_DIFF_RED");
    evidence.push(...captureEvidence(adbPath, deviceId, "03b_detailed_history_diff"));

    const pdfAuditStart = readAudit(auditPath).length;
    invariant(await tapFullyVisibleId(adbPath, deviceId, "consumer-estimate-make-pdf"), "PDF_ACTION_RED");
    await waitForPdfAudit(auditPath, pdfAuditStart);
    const pdfViewer = await waitForSnapshot(adbPath, deviceId, pdfViewerVisible, 60_000);
    invariant(pdfViewerVisible(pdfViewer), "PDF_VIEWER_RED");
    evidence.push(...captureEvidence(adbPath, deviceId, "04_pdf_viewer"));
    const inAppBack = pdfViewer.nodes.some((node) => nodeHasId(node, "pdf-viewer-back"));
    const inAppBackTapped = inAppBack
      ? await tapById(adbPath, deviceId, "pdf-viewer-back", 3)
      : false;
    if (!inAppBackTapped) {
      runAdb(["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_BACK"], 10_000);
    }
  }

  const coldStart = readAudit(auditPath).length;
  runAdb(["-s", deviceId, "shell", "am", "force-stop", PACKAGE_NAME], 20_000);
  await sleep(750);
  await bootstrap(adbPath, deviceId);
  await launchRevision(adbPath, deviceId,
    `${FAMILY_KEY}-cold:${Date.now().toString(36)}`);
  await waitForRevisionAudit(auditPath, coldStart);
  evidence.push(...await verifyCurrentEstimate(adbPath, deviceId, "05_cold_current"));
  const coldAudit = readAudit(auditPath).slice(coldStart);
  invariant(coldAudit.length > 0
    && coldAudit.every((row) => String(row.userAgent ?? "").startsWith("okhttp/"))
    && !coldAudit.some((row) => row.method === "POST")
    && coldAudit.some((row) => row.method === "GET"
      && String(row.path).startsWith(`/revisions/${REVISION_ID}/artifacts/pdf`))
    && coldAudit.some((row) => row.method === "GET"
      && row.path === `/revisions/${REVISION_ID}/artifacts/procurement`),
  "COLD_AUDIT_RED");

  const pdf = await api(authorization, `revisions/${REVISION_ID}/artifacts/pdf?documentProfile=professional_v1`);
  const procurementArtifact = await api(authorization, `revisions/${REVISION_ID}/artifacts/procurement`);
  invariant(pdf.status === "ready" && pdf.releaseId === RELEASE_ID
    && Number(pdf.metadata?.projectedRowCount) === EXPECTED_ROW_COUNT
    && procurementArtifact.status === "ready"
    && Number(procurementArtifact.metadata?.selectedProcurementRowCount) === EXPECTED_PROCUREMENT_COUNT,
  "ARTIFACT_IDENTITY_RED");
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const release = (await client.query(
    "select status,activated_at from public.estimate_definition_release where id=$1",
    [RELEASE_ID],
  )).rows[0] as Json;
  const search = (await client.query(
    "select status,activated_at from public.estimate_search_index_release where id=$1",
    [SEARCH_RELEASE_ID],
  )).rows[0] as Json;
  await client.end();
  invariant(release.status === "prepared" && release.activated_at == null
    && search.status === "draft" && search.activated_at == null,
  "PERSISTED_LIFECYCLE_RED");

  const after = resources();
  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: CONCRETE_SLAB_VIBRATION_MODE
      ? "GREEN_CONCRETE_SLAB_VIBRATION_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : CONCRETE_SLAB_CURING_MODE
      ? "GREEN_CONCRETE_SLAB_CURING_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : CONCRETE_SLAB_LEVELING_MODE
      ? "GREEN_CONCRETE_SLAB_LEVELING_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : CONCRETE_SLAB_REPAIR_MODE
      ? "GREEN_CONCRETE_SLAB_REPAIR_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
      ? "GREEN_CONCRETE_SLAB_EMBEDDED_ITEMS_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : PEDESTAL_FORMWORK_MODE
      ? "GREEN_PEDESTAL_FORMWORK_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : COLUMN_BASE_FORMWORK_MODE
      ? "GREEN_COLUMN_BASE_FORMWORK_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : BELT_FORMWORK_MODE
      ? "GREEN_BELT_FORMWORK_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : ANCHOR_GROUP_FORMWORK_MODE
      ? "GREEN_ANCHOR_GROUP_FORMWORK_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : FORMWORK_REINFORCEMENT_MODE
      ? "GREEN_FORMWORK_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : JOINT_REINFORCEMENT_MODE
      ? "GREEN_JOINT_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : BELT_REINFORCEMENT_MODE
      ? "GREEN_BELT_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : ANCHOR_GROUP_REINFORCEMENT_MODE
      ? "GREEN_ANCHOR_GROUP_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : COLUMN_BASE_REINFORCEMENT_MODE
      ? "GREEN_COLUMN_BASE_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : REINFORCEMENT_FRAME_ASSEMBLY_MODE
      ? "GREEN_REINFORCEMENT_FRAME_ASSEMBLY_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : REINFORCEMENT_FRAME_REINFORCEMENT_MODE
      ? "GREEN_REINFORCEMENT_FRAME_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : STAIRS_REINFORCEMENT_MODE
      ? "GREEN_STAIRS_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : PEDESTAL_REINFORCEMENT_MODE
      ? "GREEN_PEDESTAL_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : PILE_CAP_REINFORCEMENT_MODE
      ? "GREEN_PILE_CAP_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : CONCRETE_SLAB_REINFORCEMENT_MODE
      ? "GREEN_CONCRETE_SLAB_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : SLAB_REINFORCEMENT_MODE
      ? "GREEN_SLAB_FOUNDATION_REINFORCEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : REINFORCEMENT_FRAME_MODE
      ? "GREEN_REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : STAIRS_MODE
      ? "GREEN_STAIRS_CONCRETE_PLACEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : SLAB_FOUNDATION_MODE
      ? "GREEN_SLAB_FOUNDATION_CONCRETE_PLACEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : PEDESTAL_MODE
      ? "GREEN_PEDESTAL_CONCRETE_PLACEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : PILE_CAP_MODE
      ? "GREEN_PILE_CAP_CONCRETE_PLACEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : CONCRETE_SLAB_MODE
      ? "GREEN_CONCRETE_SLAB_CONCRETE_PLACEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : BELT_MODE
      ? "GREEN_BELT_CONCRETE_PLACEMENT_NATIVE_ANDROID_READ_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
      : COLUMN_BASE_MODE
        ? "GREEN_COLUMN_BASE_CONCRETE_PLACEMENT_NATIVE_ANDROID_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE"
        : "GREEN_ANCHOR_GROUP_CONCRETE_PLACEMENT_NATIVE_ANDROID_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE",
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    masterSha256: sha256(readFileSync(MASTER)),
    source: {
      branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      runtimeSourceTree: tuple.sourceTree,
      frontendJsBundleFingerprint: tuple.frontendJsBundleFingerprint,
    },
    runtime: {
      platform: "android",
      apiLevel: device.android_sdk,
      deviceId,
      avd: device.avd_name,
      package: PACKAGE_NAME,
      releaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      definitionId: DEFINITION_ID,
      catalogId: CATALOG_ID,
      metroStartedForAcceptance: metro.started,
      metroConfigurationValidated: metro.configurationValidated,
      androidWasAlreadyOnline,
    },
    nativeScope: {
      createPerformed: false,
      editPerformed: false,
      readPerformed: true,
      historyPerformed: true,
      documentsPerformed: true,
      coldPerformed: true,
    },
    webCreateEdit: {
      platform: "web",
      parentRevisionId: PARENT_REVISION_ID,
      revisionId: REVISION_ID,
      primaryChange: `${ORIGINAL_PRIMARY} -> ${CURRENT_PRIMARY} ${PRIMARY_UNIT_RU}`,
      scope: "FAMILY_SPECIFIC_CREATE_EDIT_ARITHMETIC_LINEAGE",
    },
    nativeWriteCoverage,
    currentUi: {
      primaryParameterId: PRIMARY_PARAMETER_ID,
      primaryValue: CURRENT_PRIMARY,
      primaryUnitRu: PRIMARY_UNIT_RU,
      primaryResourceRowId: PRIMARY_RESOURCE_ROW_ID,
      primaryResourceQuantity: CURRENT_RESOURCE_QUANTITY,
      rowCount: EXPECTED_ROW_COUNT,
      visible: true,
    },
    history: { parentRevisionId: PARENT_REVISION_ID, revisionId: REVISION_ID, exactDiffVisible: true },
    documents: {
      procurement: { artifactId: procurementArtifact.artifactId, rowCount: EXPECTED_PROCUREMENT_COUNT, unpriced: true, panelVisible: true },
      pdf: { artifactId: pdf.artifactId, pageCount: pdf.metadata?.pageCount, viewerVisible: true },
    },
    coldOpen: { currentRevisionVisible: true, pdfHydrated: true, procurementHydrated: true },
    requestAudit: {
      requestCount: coldAudit.length,
      postCount: coldAudit.filter((row) => row.method === "POST").length,
      transport: "okhttp",
    },
    evidence,
    resourceControl: {
      before,
      after,
      availableMemoryDeltaBytes: after.availableMemoryBytes - before.availableMemoryBytes,
      availableDiskDeltaBytes: after.availableDiskBytes - before.availableDiskBytes,
      oneHeavyProcessAtATime: true,
    },
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  atomicJson(OUTPUT, { ...body, receiptSha256: sha256(JSON.stringify(body)) });
  process.stdout.write(`${JSON.stringify({
    status: body.status,
    revisionId: REVISION_ID,
    output: OUTPUT,
    coldPosts: body.requestAudit.postCount,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
