import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
  stripFoundationConcretePlacementAcceptanceInputR1,
  type StripFoundationConcretePlacementContextKey,
} from "../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";
import {
  ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS,
  anchorGroupConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/anchorGroupConcretePlacementR1";
import {
  COLUMN_BASE_CONCRETE_PLACEMENT_SOURCE_METADATA,
  COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS,
  columnBaseConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/columnBaseConcretePlacementR1";
import {
  BELT_CONCRETE_PLACEMENT_SOURCE_METADATA,
  BELT_CONCRETE_PLACEMENT_TARGETS,
  beltConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/beltConcretePlacementR1";
import {
  CONCRETE_SLAB_CONCRETE_PLACEMENT_SOURCE_METADATA,
  CONCRETE_SLAB_CONCRETE_PLACEMENT_TARGETS,
  concreteSlabConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabConcretePlacementR1";
import {
  PILE_CAP_CONCRETE_PLACEMENT_SOURCE_METADATA,
  PILE_CAP_CONCRETE_PLACEMENT_TARGETS,
  pileCapConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pileCapConcretePlacementR1";
import {
  PEDESTAL_CONCRETE_PLACEMENT_SOURCE_METADATA,
  PEDESTAL_CONCRETE_PLACEMENT_TARGETS,
  pedestalConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pedestalConcretePlacementR1";
import {
  SLAB_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA,
  SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
  slabFoundationConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/slabFoundationConcretePlacementR1";
import {
  STAIRS_CONCRETE_PLACEMENT_SOURCE_METADATA,
  STAIRS_CONCRETE_PLACEMENT_TARGETS,
  stairsConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stairsConcretePlacementR1";
import {
  REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_SOURCE_METADATA,
  REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS,
  reinforcementFrameConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/reinforcementFrameConcretePlacementR1";
import {
  CONCRETE_SLAB_VIBRATION_SOURCE_METADATA,
  CONCRETE_SLAB_VIBRATION_TARGETS,
  concreteSlabVibrationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabVibrationR1";
import {
  CONCRETE_SLAB_CURING_SOURCE_METADATA,
  CONCRETE_SLAB_CURING_TARGETS,
  concreteSlabCuringAcceptanceInputR1,
  type ConcreteSlabCuringContextKey,
} from "../../src/lib/estimate/v4/concreteSlabCuringR1";
import {
  CONCRETE_SLAB_LEVELING_SOURCE_METADATA,
  CONCRETE_SLAB_LEVELING_TARGETS,
  concreteSlabLevelingAcceptanceInputR1,
  type ConcreteSlabLevelingContextKey,
} from "../../src/lib/estimate/v4/concreteSlabLevelingR1";
import {
  CONCRETE_SLAB_REPAIR_NORM_ID,
  CONCRETE_SLAB_REPAIR_SOURCE_METADATA,
  CONCRETE_SLAB_REPAIR_TARGETS,
  concreteSlabRepairAcceptanceInputR1,
  type ConcreteSlabRepairContextKey,
} from "../../src/lib/estimate/v4/concreteSlabRepairR1";
import {
  CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID,
  CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA,
  CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS,
  concreteSlabEmbeddedItemsAcceptanceInputR1,
  type ConcreteSlabEmbeddedItemsContextKey,
} from "../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1";

type Json = Record<string, any>;
type ConcreteSlabOperationKey = "vibration" | "curing" | "leveling" | "repair" | "embedded_items";

const ANCHOR_GROUP_MODE = process.argv.includes("--anchor-group");
const COLUMN_BASE_MODE = process.argv.includes("--column-base");
const BELT_MODE = process.argv.includes("--belt");
const CONCRETE_SLAB_MODE = process.argv.includes("--concrete-slab");
const PILE_CAP_MODE = process.argv.includes("--pile-cap");
const PEDESTAL_MODE = process.argv.includes("--pedestal");
const SLAB_FOUNDATION_MODE = process.argv.includes("--slab-foundation");
const STAIRS_MODE = process.argv.includes("--stairs");
const REINFORCEMENT_FRAME_MODE = process.argv.includes("--reinforcement-frame");
const explicitConcreteSlabOperation = process.argv
  .find((argument) => argument.startsWith("--concrete-slab-operation="))
  ?.split("=", 2)[1] as ConcreteSlabOperationKey | undefined;
const requestedConcreteSlabOperations = [
  ...(process.argv.includes("--concrete-slab-vibration") ? ["vibration" as const] : []),
  ...(process.argv.includes("--concrete-slab-curing") ? ["curing" as const] : []),
  ...(process.argv.includes("--concrete-slab-leveling") ? ["leveling" as const] : []),
  ...(explicitConcreteSlabOperation ? [explicitConcreteSlabOperation] : []),
];
if (requestedConcreteSlabOperations.length > 1) {
  throw new Error("STOP_CONCRETE_SLAB_BACKEND_OPERATION_MODE_AMBIGUOUS");
}
const CONCRETE_SLAB_OPERATION_KEY = requestedConcreteSlabOperations[0] ?? null;
if (CONCRETE_SLAB_OPERATION_KEY
  && !(["vibration", "curing", "leveling", "repair", "embedded_items"] as const)
    .includes(CONCRETE_SLAB_OPERATION_KEY)) {
  throw new Error(`STOP_CONCRETE_SLAB_BACKEND_OPERATION_UNSUPPORTED:${CONCRETE_SLAB_OPERATION_KEY}`);
}
const CONCRETE_SLAB_VIBRATION_MODE = CONCRETE_SLAB_OPERATION_KEY === "vibration";
const CONCRETE_SLAB_CURING_MODE = CONCRETE_SLAB_OPERATION_KEY === "curing";
const CONCRETE_SLAB_LEVELING_MODE = CONCRETE_SLAB_OPERATION_KEY === "leveling";
const CONCRETE_SLAB_EMBEDDED_ITEMS_MODE = CONCRETE_SLAB_OPERATION_KEY === "embedded_items";
const CONCRETE_SLAB_OPERATION_MODE = CONCRETE_SLAB_OPERATION_KEY != null;
if ([ANCHOR_GROUP_MODE, COLUMN_BASE_MODE, BELT_MODE, CONCRETE_SLAB_MODE, PILE_CAP_MODE, PEDESTAL_MODE, SLAB_FOUNDATION_MODE, STAIRS_MODE, REINFORCEMENT_FRAME_MODE, CONCRETE_SLAB_OPERATION_MODE].filter(Boolean).length > 1) {
  throw new Error("STOP_CONCRETE_PLACEMENT_BACKEND_FAMILY_MODE_AMBIGUOUS");
}
const CONTRACT = CONCRETE_SLAB_VIBRATION_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-vibration-family.backend-acceptance.v1"
  : CONCRETE_SLAB_CURING_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-curing-family.backend-acceptance.v1"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-leveling-family.backend-acceptance.v1"
  : CONCRETE_SLAB_OPERATION_KEY === "repair"
  ? "rik-expo-app.r4-a13-6.concrete-slab-repair-family.backend-acceptance.v1"
  : CONCRETE_SLAB_OPERATION_KEY === "embedded_items"
  ? "rik-expo-app.r4-a13-6.concrete-slab-embedded-items-family.backend-acceptance.v1"
  : REINFORCEMENT_FRAME_MODE
  ? "rik-expo-app.r4-a13-6.reinforcement-frame-concrete-placement-family.backend-acceptance.v1"
  : STAIRS_MODE
  ? "rik-expo-app.r4-a13-6.stairs-concrete-placement-family.backend-acceptance.v1"
  : SLAB_FOUNDATION_MODE
  ? "rik-expo-app.r4-a13-6.slab-foundation-concrete-placement-family.backend-acceptance.v1"
  : PEDESTAL_MODE
  ? "rik-expo-app.r4-a13-6.pedestal-concrete-placement-family.backend-acceptance.v1"
  : PILE_CAP_MODE
  ? "rik-expo-app.r4-a13-6.pile-cap-concrete-placement-family.backend-acceptance.v1"
  : CONCRETE_SLAB_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-concrete-placement-family.backend-acceptance.v1"
  : BELT_MODE
  ? "rik-expo-app.r4-a13-6.belt-concrete-placement-family.backend-acceptance.v1"
  : COLUMN_BASE_MODE
  ? "rik-expo-app.r4-a13-6.column-base-concrete-placement-family.backend-acceptance.v1"
  : ANCHOR_GROUP_MODE
  ? "rik-expo-app.r4-a13-6.anchor-group-concrete-placement-family.backend-acceptance.v1"
  : "rik-expo-app.r4-a13-6.strip-foundation-concrete-placement-family.backend-acceptance.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const MASTER = resolve(CONCRETE_SLAB_OPERATION_KEY === "repair"
  || CONCRETE_SLAB_OPERATION_KEY === "embedded_items"
  ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (17).md"
  : CONCRETE_SLAB_OPERATION_MODE
  ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (16).md"
  : REINFORCEMENT_FRAME_MODE || STAIRS_MODE || SLAB_FOUNDATION_MODE || PEDESTAL_MODE || PILE_CAP_MODE || CONCRETE_SLAB_MODE
  ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
  : ANCHOR_GROUP_MODE || COLUMN_BASE_MODE || BELT_MODE
  ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (12).md"
  : "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md");
const OUTPUT = resolve(
  CONCRETE_SLAB_VIBRATION_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-vibration-family-api/acceptance.json"
    : CONCRETE_SLAB_CURING_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-curing-family-api/acceptance.json"
    : CONCRETE_SLAB_LEVELING_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-leveling-family-api/acceptance.json"
    : CONCRETE_SLAB_OPERATION_KEY === "repair"
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-repair-family-api/acceptance.json"
    : CONCRETE_SLAB_OPERATION_KEY === "embedded_items"
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-embedded-items-family-api/acceptance.json"
    : REINFORCEMENT_FRAME_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-concrete-placement-family-api/acceptance.json"
    : STAIRS_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/stairs-concrete-placement-family-api/acceptance.json"
    : SLAB_FOUNDATION_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/slab-foundation-concrete-placement-family-api/acceptance.json"
    : PEDESTAL_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-concrete-placement-family-api/acceptance.json"
    : PILE_CAP_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-concrete-placement-family-api/acceptance.json"
    : CONCRETE_SLAB_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-concrete-placement-family-api/acceptance.json"
    : BELT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-concrete-placement-family-api/acceptance.json"
    : COLUMN_BASE_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-concrete-placement-family-api/acceptance.json"
    : ANCHOR_GROUP_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-concrete-placement-family-api/acceptance.json"
    : ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-api/acceptance.json",
);
const RELEASE_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "37491173-bdce-5137-bc55-6cba4ce15768"
  : CONCRETE_SLAB_CURING_MODE
  ? "f185fb75-7334-5d7d-a9b6-793d34e8cc24"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "e7f064fb-f5b5-5972-b64c-845183b69a29"
  : CONCRETE_SLAB_OPERATION_KEY === "repair"
  ? "3ad40dd2-36b5-5427-92d2-52a805a272b3"
  : CONCRETE_SLAB_OPERATION_KEY === "embedded_items"
  ? "7bcb6a0c-9b9b-58ee-92f5-fb41e6ac8abf"
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
  : COLUMN_BASE_MODE
  ? "7289c7d3-2577-5e52-a2f5-be3af06dec5d"
  : ANCHOR_GROUP_MODE
  ? "0a70a3db-9648-5341-8bd0-ef9ae3017427"
  : "ffce7418-e0b2-54df-94b9-45ec442eb651";
const SEARCH_RELEASE_ID = CONCRETE_SLAB_VIBRATION_MODE
  ? "c8c18ba6-1aa1-5581-99ee-871e3037c6ce"
  : CONCRETE_SLAB_CURING_MODE
  ? "be08859c-3c3c-53b9-b0fa-6ac1a1226659"
  : CONCRETE_SLAB_LEVELING_MODE
  ? "2d77bca9-0272-5b16-aa85-2b553e365c4c"
  : CONCRETE_SLAB_OPERATION_KEY === "repair"
  ? "a0d581eb-9bd1-50f3-a366-495846f468f5"
  : CONCRETE_SLAB_OPERATION_KEY === "embedded_items"
  ? "492f2c38-6b0f-55cd-b2d4-067a99ff57d0"
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
  : COLUMN_BASE_MODE
  ? "cc38bb7a-aa48-5fa6-8f63-a8df4327d15f"
  : ANCHOR_GROUP_MODE
  ? "8a235704-43f3-564f-a3b8-70777db354fb"
  : "84ccfb2b-1c44-550f-9393-409c5a8d3ed1";
const ORGANIZATION_ID = "55555555-5555-4555-8555-555555555551";
const READY_MIX_ROW_ID = "material:concrete:ready-mix";
const DELIVERY_ROW_ID = "delivery:concrete:ready-mix";
const VIBRATION_WORK_ROW_ID = "work:concrete:slab-vibration";
const VIBRATION_MOBILIZATION_ROW_ID = "delivery:concrete:internal-vibrator-mobilization";
const CURING_WORK_ROW_ID = "work:concrete:slab-curing";
const CURING_MOBILIZATION_ROW_ID = "delivery:concrete:curing-equipment-mobilization";
const LEVELING_WORK_ROW_ID = "work:concrete:slab-leveling";
const LEVELING_MOBILIZATION_ROW_ID = "delivery:concrete:slab-leveling-equipment-mobilization";
const REPAIR_PLACEMENT_WORK_ROW_ID = "work:concrete:slab-repair-placement";
const REPAIR_MATERIAL_DELIVERY_ROW_ID = "delivery:concrete:slab-repair-material";
const EMBEDDED_ITEMS_POSITIONING_WORK_ROW_ID = "work:concrete:slab-embedded-items-positioning";
const EMBEDDED_ITEMS_DELIVERY_ROW_ID = "delivery:concrete:slab-embedded-items";

const EXPECTED_DEFINITION_IDS: Readonly<Record<string, string | undefined>> =
  Object.freeze(CONCRETE_SLAB_VIBRATION_MODE ? {
    standard: "6643144b-e8fc-56cd-899f-01248c39c8cf",
    high_load: "d599f978-5813-5573-bac4-ed9c22404dfe",
    large_area: "aea4a9ec-6984-5afa-b522-1b3697e4015d",
    repair: "3a2d3e22-d6c7-5d89-8679-4e78bfabfcda",
    small_area: "46b4c804-f507-5913-aa35-239b3a726f64",
    technical_room: "63d888f6-b7ee-5b72-882d-831d3f2a7801",
    wet_zone: "0407fd36-0eee-5a46-bd95-5897d5ee2546",
  } : CONCRETE_SLAB_CURING_MODE ? {
    standard: "e9f436c2-89c9-5991-9c99-c75203cab81e",
    high_load: "6e5ec6a0-64bf-5e0b-a856-2a22d892eb7d",
    large_area: "86ea38bb-6cd2-53ea-863f-6db6f31e7630",
    small_area: "5e08586e-1130-550f-b2b3-8d6d65e0bd5b",
    technical_room: "5bd8a22c-6635-5e7d-a662-5b6e2d1a87fb",
    wet_zone: "ea9e82e8-e169-5a1c-851d-d5020ce1c419",
  } : CONCRETE_SLAB_LEVELING_MODE ? {
    standard: "f13c8371-56c5-5652-b30a-6b178792fe34",
    high_load: "6ea387b9-4129-5d3b-b064-69108b56a4e6",
    large_area: "92d2945b-f3ce-5d97-bed1-5044516f9ea4",
    repair: "3aed4042-3054-5833-8c44-0d6883e99662",
    small_area: "8b5944d9-e5ae-58a0-a3d4-0d5dc20ccaaf",
    technical_room: "3f589031-ecc8-5c52-bc7f-8865ee62f589",
    wet_zone: "e2844993-67e4-5da6-b162-45b79b4dfb87",
  } : CONCRETE_SLAB_OPERATION_KEY === "repair" ? {
    standard: "e8fd1aa0-595c-5da2-9741-31d5c2e44865",
    high_load: "d9f35d2c-47d4-5339-be53-ebd725003f91",
    large_area: "748d4866-59e1-5e18-a794-c1dba5949e4a",
    repair: "f25ba531-3f6f-556e-9a75-c6779d3b09bf",
    small_area: "67f34c48-7781-578a-8e01-2a913358b539",
    technical_room: "23be35f6-73c6-5c7e-86a7-224863013d05",
    wet_zone: "a1065240-5941-5d13-b0e1-31d28e24a3d6",
  } : CONCRETE_SLAB_OPERATION_KEY === "embedded_items" ? {
    standard: "949dfdcc-9baa-53a2-837e-bf63a57d4f0f",
    high_load: "72b4dd35-1d53-54c4-8253-bb1bcd857d49",
    large_area: "c1a4daa1-062a-5721-b493-95ed6c225241",
    small_area: "9057a3c9-ec9d-5fb7-9984-5e7c368894e4",
    technical_room: "11971dab-8ed6-5d7b-b0bc-dee782d59dc2",
    wet_zone: "29f4abd9-8a43-5a76-ac12-3ab99461bb7f",
  } : REINFORCEMENT_FRAME_MODE ? {
    standard: "04c7a270-3465-5541-9275-c80a322fbdb5",
    high_load: "3c6a4d50-191d-577c-9ff8-ab4519ff2341",
    large_area: "1edda5d1-0d6f-54b4-9597-b564ecc81196",
    repair: "e0b14e86-88b6-53e5-b548-4892ed27920f",
    small_area: "4d7cd0a2-07aa-5277-9cd7-26e894b62a27",
    technical_room: "6a0ffae4-80e9-5af6-ae05-082eb3a122a6",
    wet_zone: "f66d4a50-b744-5089-864f-49a6c58b8231",
  } : STAIRS_MODE ? {
    standard: "bbdaae6b-ccee-5860-9a01-fa1b53f13b3b",
    high_load: "cadf507d-1cf8-5d60-bbab-27d335998fd9",
    large_area: "1c84eaf2-d8da-5854-ad24-628b78969f4a",
    repair: "684f58a0-9794-5104-a1ef-14ca28a18b83",
    small_area: "760faa36-43f9-58a3-8e87-2bf360f24b52",
    technical_room: "2b317e38-8254-56b1-9fc0-dff391659a77",
    wet_zone: "91402ca4-84ed-5347-9af6-0c121303f859",
  } : SLAB_FOUNDATION_MODE ? {
    standard: "3687cca0-c322-5e91-ba16-a98bdf1729cd",
    high_load: "1b6062a1-0d09-5008-8937-d92d04bc1b95",
    large_area: "d43a3d8a-4cc1-5500-a6b6-4ec317ed762b",
    repair: "008bb51a-21cd-5880-b107-678e14f90e8b",
    small_area: "b7563eab-b8bb-5cdd-9752-788866406dfb",
    technical_room: "7b004eee-6fcd-51de-867d-394863c25fe7",
    wet_zone: "e9ebe02f-29fa-5d19-9551-efa9b8c9a228",
  } : PEDESTAL_MODE ? {
    standard: "54c845e9-3978-543a-bfd7-9d3583d83eed",
    high_load: "af1c819c-cea5-5993-9f76-171a69f35ab8",
    large_area: "91ada7f0-7fd5-5ea7-807b-ed5b2868ea86",
    repair: "e02b2413-1d36-5b11-9539-3eab00307443",
    small_area: "af0caf00-ac17-57d6-b265-89ca2bb4e1f9",
    technical_room: "e5d2a707-cdfb-57d2-9d41-cd3bef232c23",
    wet_zone: "53c15584-29ac-52b3-ab7b-1845de2a00b4",
  } : PILE_CAP_MODE ? {
    standard: "56efe197-b086-5111-aff6-f8545d597be9",
    high_load: "ad2218c5-b606-594b-a614-90b1c871e590",
    large_area: "5bc3de34-8157-5dc1-9528-1121a59ebc9d",
    repair: "b40a664c-5f65-583c-9707-f820a341a53b",
    small_area: "021964bc-676d-51ca-954b-e22a4aaa51c9",
    technical_room: "87e679b5-e6eb-5c6e-9494-c77b1d1d1d07",
    wet_zone: "db8c75c0-d0a0-52ad-a4e5-3f1f08406a77",
  } : CONCRETE_SLAB_MODE ? {
    standard: "36ac7c88-5b83-5d38-b629-0948f0fbe393",
    high_load: "4e4cbbb5-aae0-557b-a673-f280f7cf8c5a",
    large_area: "48732aa5-87c5-5ae0-ba82-0a9f1ba2118f",
    repair: "baa597c7-c4b1-5f0b-ace7-c936b4a475cc",
    small_area: "7e94272f-cb63-53a8-8c9b-5b9375934341",
    technical_room: "b8612eae-276b-54a2-9a2e-0ae68bfe80bd",
    wet_zone: "35092da8-de26-53f5-a1a7-a37d3988cd81",
  } : BELT_MODE ? {
    standard: "a5c0d5f3-e330-5337-a20e-633c97eec6b1",
    high_load: "63a2e733-3620-5ca3-9316-191fe52e705a",
    large_area: "32c29673-c712-53a8-8481-f0c27f72d6c9",
    repair: "f7554c17-7f63-5db1-982d-309895e7d334",
    small_area: "b643b315-0178-5619-b895-3f66dfe22ca3",
    technical_room: "6115dcd4-cbe7-590a-9a4d-f57d8b24f0c3",
    wet_zone: "57755a76-68a6-59ad-a360-051db8df5ebb",
  } : COLUMN_BASE_MODE ? {
    standard: "32141b6b-710b-59b7-bd67-74ccb2adc2e7",
    high_load: "972f7692-6e10-5137-b3a7-1f9d759d45cc",
    large_area: "0109f4f0-bc6a-5ed4-9768-1aaee6dcb6b7",
    repair: "027d7fa9-478c-5b38-b05c-74572099108e",
    small_area: "86e1b02d-27e5-59f2-9138-8ce437a97578",
    technical_room: "927f47b4-0d22-5636-bd65-99ff9b68e46e",
    wet_zone: "d22f0841-831c-54f0-bc30-910faf7b96a8",
  } : ANCHOR_GROUP_MODE ? {
    standard: "ac3e5a6a-714d-52c6-840c-270d3098cf68",
    high_load: "24b92bce-c235-5b7d-a706-3f3bc4cf73c4",
    large_area: "e4a9bb49-b9c5-5388-9b22-88c80d1d081e",
    repair: "5b4dfadf-e8bf-5b0c-8ce2-ea221f8b1083",
    small_area: "6ce8ec75-a2cc-527e-bcdd-1b626386765b",
    technical_room: "69d29380-fc34-5ec1-862a-d4908a805d26",
    wet_zone: "9f08483c-8ef3-5a16-8bc0-00b4be9d473a",
  } : {
    standard: "ce31e029-235c-508c-8d6a-294222273c75",
    high_load: "9cd8563b-bd33-529d-a614-4153c9384b09",
    large_area: "12fe35f3-e8bf-5521-8d84-19f9d48dd366",
    repair: "b32913a8-ad01-593b-96c8-90cd4370224e",
    small_area: "a6ffeaa7-df26-5a23-abc5-a32854df2bf5",
    technical_room: "7a1fb3e0-aded-57b3-90ff-0a53b3ef5880",
    wet_zone: "0e89ee0d-2132-5f1c-a881-eedc2bb994b8",
  });
const TARGETS = CONCRETE_SLAB_VIBRATION_MODE
  ? CONCRETE_SLAB_VIBRATION_TARGETS
  : CONCRETE_SLAB_CURING_MODE
  ? CONCRETE_SLAB_CURING_TARGETS
  : CONCRETE_SLAB_LEVELING_MODE
  ? CONCRETE_SLAB_LEVELING_TARGETS
  : CONCRETE_SLAB_OPERATION_KEY === "repair"
  ? CONCRETE_SLAB_REPAIR_TARGETS
  : CONCRETE_SLAB_OPERATION_KEY === "embedded_items"
  ? CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS
  : REINFORCEMENT_FRAME_MODE
  ? REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS
  : STAIRS_MODE
  ? STAIRS_CONCRETE_PLACEMENT_TARGETS
  : SLAB_FOUNDATION_MODE
  ? SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS
  : PEDESTAL_MODE
  ? PEDESTAL_CONCRETE_PLACEMENT_TARGETS
  : PILE_CAP_MODE
  ? PILE_CAP_CONCRETE_PLACEMENT_TARGETS
  : CONCRETE_SLAB_MODE
  ? CONCRETE_SLAB_CONCRETE_PLACEMENT_TARGETS
  : BELT_MODE
  ? BELT_CONCRETE_PLACEMENT_TARGETS
  : COLUMN_BASE_MODE
  ? COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS
  : ANCHOR_GROUP_MODE
  ? ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS
  : STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS;
const SOURCE_METADATA = CONCRETE_SLAB_VIBRATION_MODE
  ? CONCRETE_SLAB_VIBRATION_SOURCE_METADATA
  : CONCRETE_SLAB_CURING_MODE
  ? CONCRETE_SLAB_CURING_SOURCE_METADATA
  : CONCRETE_SLAB_LEVELING_MODE
  ? CONCRETE_SLAB_LEVELING_SOURCE_METADATA
  : CONCRETE_SLAB_OPERATION_KEY === "repair"
  ? CONCRETE_SLAB_REPAIR_SOURCE_METADATA
  : CONCRETE_SLAB_OPERATION_KEY === "embedded_items"
  ? CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA
  : REINFORCEMENT_FRAME_MODE
  ? REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_SOURCE_METADATA
  : STAIRS_MODE
  ? STAIRS_CONCRETE_PLACEMENT_SOURCE_METADATA
  : SLAB_FOUNDATION_MODE
  ? SLAB_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA
  : PEDESTAL_MODE
  ? PEDESTAL_CONCRETE_PLACEMENT_SOURCE_METADATA
  : PILE_CAP_MODE
  ? PILE_CAP_CONCRETE_PLACEMENT_SOURCE_METADATA
  : CONCRETE_SLAB_MODE
  ? CONCRETE_SLAB_CONCRETE_PLACEMENT_SOURCE_METADATA
  : BELT_MODE
  ? BELT_CONCRETE_PLACEMENT_SOURCE_METADATA
  : COLUMN_BASE_MODE
  ? COLUMN_BASE_CONCRETE_PLACEMENT_SOURCE_METADATA
  : ANCHOR_GROUP_MODE
  ? ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA
  : STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA;
const SOURCE_ASSERTION = CONCRETE_SLAB_VIBRATION_MODE
  ? {
      sourceId: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.source_id,
      normId: "concrete_aci_309_project_consolidation_schedule_v1",
      sourceDefinitionHash: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.definition_hash,
      sourceUrl: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.source_url,
      productProfileId: null,
    }
  : CONCRETE_SLAB_CURING_MODE
  ? {
      sourceId: CONCRETE_SLAB_CURING_SOURCE_METADATA.source_id,
      normId: "concrete_aci_spec_308_1_23_project_curing_schedule_v1",
      sourceDefinitionHash: CONCRETE_SLAB_CURING_SOURCE_METADATA.definition_hash,
      sourceUrl: CONCRETE_SLAB_CURING_SOURCE_METADATA.source_url,
      productProfileId: null,
    }
  : CONCRETE_SLAB_LEVELING_MODE
  ? {
      sourceId: CONCRETE_SLAB_LEVELING_SOURCE_METADATA.source_id,
      normId: "concrete_aci_302_1_15_project_leveling_schedule_v1",
      sourceDefinitionHash: CONCRETE_SLAB_LEVELING_SOURCE_METADATA.definition_hash,
      sourceUrl: CONCRETE_SLAB_LEVELING_SOURCE_METADATA.source_url,
      productProfileId: null,
    }
  : CONCRETE_SLAB_OPERATION_KEY === "repair"
  ? {
      sourceId: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.source_id,
      normId: CONCRETE_SLAB_REPAIR_NORM_ID,
      sourceDefinitionHash: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.definition_hash,
      sourceUrl: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.source_url,
      productProfileId: null,
    }
  : CONCRETE_SLAB_OPERATION_KEY === "embedded_items"
  ? {
      sourceId: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.source_id,
      normId: CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID,
      sourceDefinitionHash: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.definition_hash,
      sourceUrl: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.source_url,
      productProfileId: null,
    }
  : {
      sourceId: (SOURCE_METADATA as typeof STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA).sourceId,
      normId: (SOURCE_METADATA as typeof STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA).normId,
      sourceDefinitionHash: (SOURCE_METADATA as typeof STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA).sourceDefinitionHash,
      sourceUrl: "https://www.nrmca.org/wp-content/uploads/2021/01/31pr.pdf",
      productProfileId: (SOURCE_METADATA as typeof STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA).productProfileId,
    };

function acceptanceInput(
  contextKey: StripFoundationConcretePlacementContextKey,
): Readonly<Record<string, string | number | boolean>> {
  return CONCRETE_SLAB_VIBRATION_MODE
    ? concreteSlabVibrationAcceptanceInputR1(contextKey)
    : CONCRETE_SLAB_CURING_MODE
    ? concreteSlabCuringAcceptanceInputR1(contextKey as ConcreteSlabCuringContextKey)
    : CONCRETE_SLAB_LEVELING_MODE
    ? concreteSlabLevelingAcceptanceInputR1(contextKey as ConcreteSlabLevelingContextKey)
    : CONCRETE_SLAB_OPERATION_KEY === "repair"
    ? concreteSlabRepairAcceptanceInputR1(contextKey as ConcreteSlabRepairContextKey)
    : CONCRETE_SLAB_OPERATION_KEY === "embedded_items"
    ? concreteSlabEmbeddedItemsAcceptanceInputR1(
        contextKey as ConcreteSlabEmbeddedItemsContextKey,
      )
    : REINFORCEMENT_FRAME_MODE
    ? reinforcementFrameConcretePlacementAcceptanceInputR1(contextKey)
    : STAIRS_MODE
    ? stairsConcretePlacementAcceptanceInputR1(contextKey)
    : SLAB_FOUNDATION_MODE
    ? slabFoundationConcretePlacementAcceptanceInputR1(contextKey)
    : PEDESTAL_MODE
    ? pedestalConcretePlacementAcceptanceInputR1(contextKey)
    : PILE_CAP_MODE
    ? pileCapConcretePlacementAcceptanceInputR1(contextKey)
    : CONCRETE_SLAB_MODE
    ? concreteSlabConcretePlacementAcceptanceInputR1(contextKey)
    : BELT_MODE
    ? beltConcretePlacementAcceptanceInputR1(contextKey)
    : COLUMN_BASE_MODE
    ? columnBaseConcretePlacementAcceptanceInputR1(contextKey)
    : ANCHOR_GROUP_MODE
    ? anchorGroupConcretePlacementAcceptanceInputR1(contextKey)
    : stripFoundationConcretePlacementAcceptanceInputR1(contextKey);
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
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

function closeTo(actual: unknown, expected: number, code: string): void {
  const numeric = Number(actual);
  invariant(Number.isFinite(numeric) && Math.abs(numeric - expected) < 1e-8,
    `${code}:${String(actual)}:${expected}`);
}

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({
    progress: CONCRETE_SLAB_VIBRATION_MODE
      ? "CONCRETE_SLAB_VIBRATION"
      : CONCRETE_SLAB_CURING_MODE
      ? "CONCRETE_SLAB_CURING"
      : CONCRETE_SLAB_LEVELING_MODE
      ? "CONCRETE_SLAB_LEVELING"
      : CONCRETE_SLAB_OPERATION_KEY === "repair"
      ? "CONCRETE_SLAB_REPAIR"
      : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
      ? "CONCRETE_SLAB_EMBEDDED_ITEMS"
      : REINFORCEMENT_FRAME_MODE
      ? "REINFORCEMENT_FRAME_CONCRETE_PLACEMENT"
      : STAIRS_MODE
      ? "STAIRS_CONCRETE_PLACEMENT"
      : SLAB_FOUNDATION_MODE
      ? "SLAB_FOUNDATION_CONCRETE_PLACEMENT"
      : PEDESTAL_MODE
      ? "PEDESTAL_CONCRETE_PLACEMENT"
      : PILE_CAP_MODE
      ? "PILE_CAP_CONCRETE_PLACEMENT"
      : CONCRETE_SLAB_MODE
      ? "CONCRETE_SLAB_CONCRETE_PLACEMENT"
      : BELT_MODE
      ? "BELT_CONCRETE_PLACEMENT"
      : COLUMN_BASE_MODE
      ? "COLUMN_BASE_CONCRETE_PLACEMENT"
      : ANCHOR_GROUP_MODE
        ? "ANCHOR_GROUP_CONCRETE_PLACEMENT"
        : "STRIP_CONCRETE_FAMILY_E4",
    stage,
    ...details,
  })}\n`);
}

function resourceSnapshot(): Json {
  const disk = statfsSync(resolve("."));
  return {
    capturedAt: new Date().toISOString(),
    availableMemoryBytes: freemem(),
    availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
  };
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_CONCRETE_E4_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_CONCRETE_E4_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
  invariant(new URL(BACKEND).hostname === "127.0.0.1" && new URL(PROVIDER).hostname === "127.0.0.1",
    "STOP_CONCRETE_E4_NON_LOCAL_RUNTIME");
}

async function loginConsumer(): Promise<string> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "CONCRETE_E4_PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key,
    "CONCRETE_E4_CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token, `CONCRETE_E4_LOGIN_HTTP_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function response(
  authorization: string,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: Json }> {
  const result = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(120_000),
  });
  return { status: result.status, body: await result.json().catch(() => ({})) as Json };
}

async function api(authorization: string, path: string, init?: RequestInit): Promise<Json> {
  const result = await response(authorization, path, init);
  invariant(result.status >= 200 && result.status < 300,
    `CONCRETE_E4_HTTP:${path}:${result.status}:${JSON.stringify(result.body).slice(0, 2_000)}`);
  return result.body;
}

async function waitForJob(authorization: string, jobId: string): Promise<Json> {
  invariant(/^[0-9a-f-]{36}$/iu.test(jobId), `CONCRETE_E4_JOB_ID_INVALID:${jobId}`);
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`CONCRETE_E4_JOB_TIMEOUT:${jobId}`);
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

async function successfulJobRevision(
  authorization: string,
  queued: Json,
  code: string,
): Promise<{ job: Json; revision: Json; rows: Json[] }> {
  const job = await waitForJob(authorization, String(queued.jobId ?? ""));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `${code}:${JSON.stringify(job).slice(0, 2_000)}`);
  const revision = await api(authorization, `revisions/${job.resultRevisionId}`);
  const rows = await allRows(authorization, String(job.resultRevisionId));
  return { job, revision, rows };
}

function expectedRows(parameters: Json, volume: number): ReadonlyMap<string, number> {
  if (CONCRETE_SLAB_VIBRATION_MODE) {
    const rows = new Map<string, number>([
      [VIBRATION_WORK_ROW_ID, Number(parameters.vibration_worker_h)],
      ["equipment:concrete:internal-vibrator", Number(parameters.internal_vibrator_machine_h)],
      ["service:concrete:slab-vibration-quality-control", Number(parameters.quality_control_document_count)],
    ]);
    if (parameters.equipment_mobilization_pricing_mode === "SEPARATE"
      && Number(parameters.equipment_mobilization_trip_count) > 0) {
      rows.set(VIBRATION_MOBILIZATION_ROW_ID, Number(parameters.equipment_mobilization_trip_count));
    }
    return rows;
  }
  if (CONCRETE_SLAB_CURING_MODE) {
    const rows = new Map<string, number>([
      [CURING_WORK_ROW_ID, Number(parameters.curing_worker_h)],
      ["service:concrete:slab-curing-quality-control", Number(parameters.quality_control_document_count)],
    ]);
    if (["WATER_CURING", "WET_COVERING"].includes(
      String(parameters.approved_external_curing_method),
    )) {
      rows.set("material:concrete:curing-water", Number(parameters.curing_water_m3));
    }
    if (parameters.approved_external_curing_method === "WET_COVERING") {
      rows.set("material:concrete:wet-curing-covering", Number(parameters.wet_covering_area_m2));
    }
    if (parameters.approved_external_curing_method === "IMPERVIOUS_SHEET") {
      rows.set("material:concrete:impervious-curing-sheet", Number(parameters.impervious_sheet_area_m2));
    }
    if (parameters.approved_external_curing_method === "MEMBRANE_CURING_COMPOUND") {
      rows.set("material:concrete:membrane-curing-compound", Number(parameters.curing_compound_quantity_l));
    }
    if (parameters.application_equipment_required === true) {
      rows.set("equipment:concrete:curing-application", Number(parameters.application_equipment_machine_h));
    }
    if (parameters.application_equipment_required === true
      && parameters.equipment_mobilization_pricing_mode === "SEPARATE"
      && Number(parameters.equipment_mobilization_trip_count) > 0) {
      rows.set(CURING_MOBILIZATION_ROW_ID, Number(parameters.equipment_mobilization_trip_count));
    }
    return rows;
  }
  if (CONCRETE_SLAB_LEVELING_MODE) {
    const rows = new Map<string, number>([
      [LEVELING_WORK_ROW_ID, Number(parameters.leveling_worker_h)],
      ["service:concrete:slab-leveling-surface-control", Number(parameters.surface_measurement_report_count)],
    ]);
    if (parameters.screed_guides_required === true) {
      rows.set("material:concrete:screed-guides", Number(parameters.screed_guide_length_m));
    }
    if (parameters.separate_leveling_equipment_required === true) {
      rows.set("equipment:concrete:slab-leveling", Number(parameters.leveling_equipment_machine_h));
    }
    if (parameters.separate_leveling_equipment_required === true
      && parameters.equipment_mobilization_pricing_mode === "SEPARATE"
      && Number(parameters.equipment_mobilization_trip_count) > 0) {
      rows.set(LEVELING_MOBILIZATION_ROW_ID, Number(parameters.equipment_mobilization_trip_count));
    }
    return rows;
  }
  if (CONCRETE_SLAB_OPERATION_KEY === "repair") {
    const rows = new Map<string, number>([
      ["work:concrete:slab-repair-removal", Number(parameters.damaged_concrete_removal_worker_h)],
      ["work:concrete:slab-repair-substrate", Number(parameters.substrate_preparation_worker_h)],
      [REPAIR_PLACEMENT_WORK_ROW_ID, Number(parameters.repair_material_placement_worker_h)],
      ["work:concrete:slab-repair-curing", Number(parameters.repair_curing_worker_h)],
      ["material:concrete:slab-repair-material", Number(parameters.repair_material_quantity_kg)],
      ["service:concrete:slab-repair-inspection", Number(parameters.inspection_report_count)],
      [REPAIR_MATERIAL_DELIVERY_ROW_ID, Number(parameters.material_delivery_trip_count)],
    ]);
    if (parameters.bonding_agent_required === true) {
      rows.set("material:concrete:slab-repair-bonding-agent", Number(parameters.bonding_agent_quantity_kg));
    }
    if (parameters.reinforcement_treatment_required === true) {
      rows.set("material:concrete:slab-repair-rebar-treatment", Number(parameters.reinforcement_treatment_quantity_kg));
    }
    if (parameters.curing_material_required === true) {
      rows.set("material:concrete:slab-repair-curing", Number(parameters.curing_material_quantity_kg));
    }
    if (parameters.removal_equipment_required === true) {
      rows.set("equipment:concrete:slab-repair-removal", Number(parameters.removal_equipment_machine_h));
    }
    if (parameters.mixing_equipment_required === true) {
      rows.set("equipment:concrete:slab-repair-mixing", Number(parameters.mixing_equipment_machine_h));
    }
    if (parameters.dust_control_equipment_required === true) {
      rows.set("equipment:concrete:slab-repair-dust-control", Number(parameters.dust_control_equipment_machine_h));
    }
    if (parameters.material_testing_required === true) {
      rows.set("service:concrete:slab-repair-testing", Number(parameters.material_test_report_count));
    }
    if (parameters.waste_disposal_required === true) {
      rows.set("service:concrete:slab-repair-waste-disposal", Number(parameters.waste_disposal_volume_m3));
      rows.set("delivery:concrete:slab-repair-waste", Number(parameters.waste_transport_trip_count));
    }
    return rows;
  }
  if (CONCRETE_SLAB_EMBEDDED_ITEMS_MODE) {
    const rows = new Map<string, number>([
      ["material:concrete:slab-embedded-items", Number(parameters.embedded_item_total_mass_kg)],
      ["work:concrete:slab-embedded-items-layout", Number(parameters.layout_worker_h)],
      [EMBEDDED_ITEMS_POSITIONING_WORK_ROW_ID, Number(parameters.positioning_worker_h)],
      ["work:concrete:slab-embedded-items-fixing", Number(parameters.fixing_worker_h)],
      ["service:concrete:slab-embedded-items-inspection", Number(parameters.inspection_record_count)],
      [EMBEDDED_ITEMS_DELIVERY_ROW_ID, Number(parameters.embedded_items_delivery_trip_count)],
    ]);
    if (parameters.field_welding_required === true) {
      rows.set("work:concrete:slab-embedded-items-welding", Number(parameters.welding_worker_h));
      rows.set(
        "material:concrete:slab-embedded-items-welding-consumables",
        Number(parameters.welding_consumable_quantity_kg),
      );
    }
    if (parameters.temporary_support_required === true) {
      rows.set(
        "material:concrete:slab-embedded-items-temporary-support",
        Number(parameters.temporary_support_quantity_kg),
      );
    }
    if (parameters.lifting_equipment_required === true) {
      rows.set(
        "equipment:concrete:slab-embedded-items-lifting",
        Number(parameters.lifting_equipment_machine_h),
      );
    }
    if (parameters.survey_control_required === true) {
      rows.set("service:concrete:slab-embedded-items-survey", Number(parameters.survey_report_count));
    }
    if (parameters.coating_touchup_required === true) {
      rows.set("work:concrete:slab-embedded-items-coating", Number(parameters.coating_touchup_worker_h));
      rows.set(
        "material:concrete:slab-embedded-items-coating",
        Number(parameters.coating_touchup_quantity_kg),
      );
    }
    if (parameters.lifting_equipment_required === true
      && parameters.equipment_mobilization_pricing_mode === "SEPARATE"
      && Number(parameters.equipment_mobilization_trip_count) > 0) {
      rows.set(
        "delivery:concrete:slab-embedded-items-equipment-mobilization",
        Number(parameters.equipment_mobilization_trip_count),
      );
    }
    return rows;
  }
  const contingency = Number(parameters.selected_contingency_percent);
  const readyMix = volume * (1 + contingency / 100);
  const rows = new Map<string, number>([
    [READY_MIX_ROW_ID, readyMix],
    ["work:concrete:place-and-compact", Number(parameters.placement_worker_h)],
    ["work:concrete:finish-surface", Number(parameters.finishing_worker_h)],
    ["work:concrete:cure", Number(parameters.curing_worker_h)],
    ["equipment:concrete:deep-vibrator", Number(parameters.deep_vibrator_machine_h)],
    ["service:concrete:acceptance-control", Number(parameters.quality_control_document_count)],
  ]);
  if (parameters.curing_method === "membrane") {
    rows.set("material:concrete:curing-membrane", Number(parameters.curing_membrane_area_m2));
  }
  if (parameters.winter_mode === true) {
    rows.set("material:concrete:winter-heating-cable", Number(parameters.winter_heating_cable_m));
    rows.set("work:concrete:winter-heating", Number(parameters.winter_heating_worker_h));
    rows.set("equipment:concrete:heating-transformer", Number(parameters.heating_transformer_machine_h));
  }
  if (parameters.placement_method === "pump") {
    rows.set("equipment:concrete:pump", Number(parameters.pump_machine_h));
  }
  if (parameters.placement_method === "crane_bucket") {
    rows.set("equipment:concrete:crane-bucket", Number(parameters.crane_bucket_machine_h));
  }
  if (parameters.delivery_pricing_mode === "SEPARATE"
    && Number(parameters.concrete_delivery_distance_km) > 0) {
    rows.set(DELIVERY_ROW_ID, readyMix * Number(parameters.concrete_delivery_distance_km));
  }
  return rows;
}

function assertRows(
  contextKey: StripFoundationConcretePlacementContextKey,
  revision: Json,
  rows: Json[],
  parameters: Json,
  volume: number,
): Json {
  const expected = expectedRows(parameters, volume);
  const primaryMeasureParameterId = CONCRETE_SLAB_VIBRATION_MODE
    ? "consolidated_concrete_volume_m3"
    : CONCRETE_SLAB_CURING_MODE
    ? "cured_concrete_volume_m3"
    : CONCRETE_SLAB_LEVELING_MODE
    ? "leveled_concrete_volume_m3"
    : CONCRETE_SLAB_OPERATION_KEY === "repair"
    ? "repair_scope_volume_m3"
    : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
    ? "embedded_item_count_piece"
    : "plan_dimension_concrete_volume_m3";
  invariant(revision.releaseId === RELEASE_ID
    && revision.definitionVersionId === EXPECTED_DEFINITION_IDS[contextKey]
    && Number(revision.parameters?.[primaryMeasureParameterId]) === volume,
  `CONCRETE_E4_REVISION_IDENTITY:${contextKey}`);
  invariant(Array.isArray(revision.preliminaryNeeds) && revision.preliminaryNeeds.length === 0,
    `CONCRETE_E4_UNEXPECTED_PRELIMINARY:${contextKey}`);
  invariant(rows.length === expected.size && rows.length === Number(revision.rowCount),
    `CONCRETE_E4_ROW_DENOMINATOR:${contextKey}:${rows.length}:${expected.size}`);
  invariant(new Set(rows.map((row) => row.rowId)).size === rows.length,
    `CONCRETE_E4_DUPLICATE_ROW:${contextKey}`);
  for (const [rowId, quantity] of expected) {
    const row = rows.find((candidate) => candidate.rowId === rowId);
    invariant(row, `CONCRETE_E4_ROW_MISSING:${contextKey}:${rowId}`);
    closeTo(row.quantity, quantity, `CONCRETE_E4_QUANTITY:${contextKey}:${rowId}`);
    invariant(row.includedInEstimate === true && row.unitPrice == null && row.amount == null,
      `CONCRETE_E4_PRICE_OR_INCLUSION:${contextKey}:${rowId}`);
  }
  invariant(!rows.some((row) => !expected.has(String(row.rowId))),
    `CONCRETE_E4_UNEXPECTED_ROW:${contextKey}`);
  const normativeOwner = rows.find((row) => row.rowId === (CONCRETE_SLAB_VIBRATION_MODE
    ? VIBRATION_WORK_ROW_ID
    : CONCRETE_SLAB_CURING_MODE
    ? CURING_WORK_ROW_ID
    : CONCRETE_SLAB_LEVELING_MODE
    ? LEVELING_WORK_ROW_ID
    : CONCRETE_SLAB_OPERATION_KEY === "repair"
    ? REPAIR_PLACEMENT_WORK_ROW_ID
    : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
    ? EMBEDDED_ITEMS_POSITIONING_WORK_ROW_ID
    : READY_MIX_ROW_ID));
  invariant(normativeOwner, `CONCRETE_E4_NORMATIVE_OWNER_MISSING:${contextKey}`);
  if (CONCRETE_SLAB_VIBRATION_MODE) {
    invariant(normativeOwner.unitId === "man_hour"
      && normativeOwner.procurementEligible === false
      && normativeOwner.includedInProcurement === false
      && rows.find((row) => row.rowId === "equipment:concrete:internal-vibrator")?.includedInProcurement === true
      && rows.find((row) => row.rowId === "service:concrete:slab-vibration-quality-control")?.includedInProcurement === true,
    `CONCRETE_E4_VIBRATION_FLAGS:${contextKey}`);
  } else if (CONCRETE_SLAB_CURING_MODE) {
    invariant(normativeOwner.unitId === "man_hour"
      && normativeOwner.procurementEligible === false
      && normativeOwner.includedInProcurement === false
      && rows.find((row) => row.rowId === "service:concrete:slab-curing-quality-control")?.includedInProcurement === true
      && rows.filter((row) => String(row.rowId).startsWith("material:concrete:"))
        .every((row) => row.includedInProcurement === true),
    `CONCRETE_E4_CURING_FLAGS:${contextKey}`);
  } else if (CONCRETE_SLAB_LEVELING_MODE) {
    invariant(normativeOwner.unitId === "man_hour"
      && normativeOwner.procurementEligible === false
      && normativeOwner.includedInProcurement === false
      && rows.find((row) => row.rowId === "service:concrete:slab-leveling-surface-control")?.includedInProcurement === true
      && rows.filter((row) => row.rowId === "material:concrete:screed-guides")
        .every((row) => row.includedInProcurement === true),
    `CONCRETE_E4_LEVELING_FLAGS:${contextKey}`);
  } else if (CONCRETE_SLAB_OPERATION_KEY === "repair") {
    invariant(normativeOwner.unitId === "man_hour"
      && normativeOwner.procurementEligible === false
      && normativeOwner.includedInProcurement === false
      && rows.find((row) => row.rowId === "material:concrete:slab-repair-material")
        ?.includedInProcurement === true
      && rows.find((row) => row.rowId === "service:concrete:slab-repair-inspection")
        ?.includedInProcurement === true
      && rows.find((row) => row.rowId === REPAIR_MATERIAL_DELIVERY_ROW_ID)
        ?.includedInProcurement === true,
    `CONCRETE_E4_REPAIR_FLAGS:${contextKey}`);
  } else if (CONCRETE_SLAB_EMBEDDED_ITEMS_MODE) {
    invariant(normativeOwner.unitId === "man_hour"
      && normativeOwner.procurementEligible === false
      && normativeOwner.includedInProcurement === false
      && rows.find((row) => row.rowId === "material:concrete:slab-embedded-items")
        ?.includedInProcurement === true
      && rows.find((row) => row.rowId === "service:concrete:slab-embedded-items-inspection")
        ?.includedInProcurement === true
      && rows.find((row) => row.rowId === EMBEDDED_ITEMS_DELIVERY_ROW_ID)
        ?.includedInProcurement === true,
    `CONCRETE_E4_EMBEDDED_ITEMS_FLAGS:${contextKey}`);
  } else {
    invariant(normativeOwner.unitId === "m3"
      && normativeOwner.procurementEligible === true
      && normativeOwner.includedInProcurement === true,
    `CONCRETE_E4_READY_MIX_FLAGS:${contextKey}`);
  }
  const exactTrace = (normativeOwner.normativeTrace as Json[] | undefined)?.find((trace) =>
    trace.source_id === SOURCE_ASSERTION.sourceId
      && trace.norm_id === SOURCE_ASSERTION.normId,
  );
  const resourceGraph = normativeOwner.calculationTrace?.resourceGraph;
  const binding = resourceGraph?.professionalPhysicalNormBindingV1;
  invariant(exactTrace?.source_definition_hash
    === SOURCE_ASSERTION.sourceDefinitionHash
    && exactTrace?.exact_locator
    && exactTrace?.source_url === SOURCE_ASSERTION.sourceUrl
    && (CONCRETE_SLAB_VIBRATION_MODE
      ? resourceGraph?.normativeMethodGuidanceV1?.universal_productivity_claimed === false
        && resourceGraph?.normativeMethodGuidanceV1?.operation_class === "CONSOLIDATE_FRESH_CONCRETE"
      : CONCRETE_SLAB_CURING_MODE
      ? resourceGraph?.normativeMethodGuidanceV1?.universal_productivity_claimed === false
        && resourceGraph?.normativeMethodGuidanceV1?.universal_consumption_claimed === false
        && resourceGraph?.normativeMethodGuidanceV1?.operation_class
          === "EXTERNAL_CURING_OF_CAST_IN_PLACE_CONCRETE"
      : CONCRETE_SLAB_LEVELING_MODE
      ? resourceGraph?.normativeMethodGuidanceV1?.universal_productivity_claimed === false
        && resourceGraph?.normativeMethodGuidanceV1?.universal_consumption_claimed === false
        && resourceGraph?.normativeMethodGuidanceV1?.operation_class
          === "LEVEL_AND_STRIKE_OFF_FRESH_CONCRETE_SLAB"
      : CONCRETE_SLAB_OPERATION_KEY === "repair"
      ? resourceGraph?.normativeMethodGuidanceV1?.universal_productivity_claimed === false
        && resourceGraph?.normativeMethodGuidanceV1?.universal_consumption_claimed === false
        && resourceGraph?.normativeMethodGuidanceV1?.operation_class
          === "REPAIR_EXISTING_CONCRETE_SLAB"
      : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
      ? resourceGraph?.normativeMethodGuidanceV1?.universal_productivity_claimed === false
        && resourceGraph?.normativeMethodGuidanceV1?.universal_consumption_claimed === false
        && resourceGraph?.normativeMethodGuidanceV1?.operation_class
          === "PLACE_AND_FIX_PROJECT_SPECIFIED_EMBEDDED_ITEMS_BEFORE_CONCRETING"
      : binding?.product_profile_id === SOURCE_ASSERTION.productProfileId),
  `CONCRETE_E4_NORMATIVE_TRACE:${contextKey}`);
  const procurementRows = rows.filter((row) => row.includedInProcurement === true).length;
  invariant(Number(revision.totals?.includedRowCount) === rows.length
    && Number(revision.totals?.unpricedRowCount) === rows.length
    && Number(revision.totals?.pricedRowCount) === 0
    && Number(revision.totals?.amount) === 0,
  `CONCRETE_E4_TOTALS:${contextKey}`);
  return {
    expectedRowIds: [...expected.keys()],
    rowCount: rows.length,
    procurementRowCount: procurementRows,
    primaryMeasureValue: volume,
    primaryMeasureUnit: CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? "piece" : "m3",
    primaryMeasureM3: CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? null : volume,
    readyMixM3: CONCRETE_SLAB_OPERATION_MODE ? null : Number(normativeOwner.quantity),
    deliveryQuantity: Number(rows.find((row) => row.rowId === (CONCRETE_SLAB_VIBRATION_MODE
      ? VIBRATION_MOBILIZATION_ROW_ID
      : CONCRETE_SLAB_CURING_MODE
      ? CURING_MOBILIZATION_ROW_ID
      : CONCRETE_SLAB_LEVELING_MODE
      ? LEVELING_MOBILIZATION_ROW_ID
      : CONCRETE_SLAB_OPERATION_KEY === "repair"
      ? REPAIR_MATERIAL_DELIVERY_ROW_ID
      : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
      ? EMBEDDED_ITEMS_DELIVERY_ROW_ID
      : DELIVERY_ROW_ID))?.quantity ?? 0),
    priceState: "PARTIAL_NEEDS_PRICE",
    inventedPriceCount: rows.filter((row) => row.unitPrice != null || row.amount != null).length,
    normativeSourceId: exactTrace.source_id,
    normativeNormId: exactTrace.norm_id,
    normativeSourceDefinitionHash: exactTrace.source_definition_hash,
  };
}

async function databaseProof(
  client: Client,
  revisionIds: string[],
  failedJobIds: string[],
): Promise<Json> {
  const release = (await client.query(`select id::text,status,activated_at,source_commit,source_tree
    from public.estimate_definition_release where id=$1`, [RELEASE_ID])).rows[0] as Json;
  const search = (await client.query(`select id::text,status,activated_at
    from public.estimate_search_index_release where id=$1`, [SEARCH_RELEASE_ID])).rows[0] as Json;
  invariant(release?.status === "prepared" && release.activated_at == null,
    "CONCRETE_E4_RELEASE_LIFECYCLE_DRIFT");
  invariant(search?.status === "draft" && search.activated_at == null,
    "CONCRETE_E4_SEARCH_LIFECYCLE_DRIFT");
  const definitions = (await client.query(`select catalog_id,definition_version_id::text
    from public.estimate_cumulative_manifest_entry
    where release_id=$1 and catalog_id=any($2::text[]) order by catalog_id`, [
    RELEASE_ID,
    TARGETS.map((target) => target.catalogId),
  ])).rows as Json[];
  const revisions = (await client.query(`select id::text,parent_revision_id::text,release_id::text,
      definition_version_id::text,catalog_id,revision_number,row_count,checksum_sha256
    from public.estimate_revision where id=any($1::uuid[]) order by catalog_id,revision_number`, [revisionIds])).rows as Json[];
  const failedJobs = (await client.query(`select id::text,status,error_code,result_revision_id::text
    from public.estimate_compile_job where id=any($1::uuid[]) order by created_at`, [failedJobIds])).rows as Json[];
  const expectedTargetCount = CONCRETE_SLAB_CURING_MODE || CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 6 : 7;
  invariant(definitions.length === expectedTargetCount
    && definitions.every((row) => Object.values(EXPECTED_DEFINITION_IDS).includes(row.definition_version_id)),
  "CONCRETE_E4_DATABASE_DEFINITION_DENOMINATOR");
  invariant(revisions.length === revisionIds.length && revisions.every((row) => row.release_id === RELEASE_ID),
    "CONCRETE_E4_DATABASE_REVISION_PARITY");
  invariant(failedJobs.length === failedJobIds.length
    && failedJobs.every((row) => row.status === "failed"
      && row.error_code === "PARAMETER_VALIDATION_FAILED" && row.result_revision_id == null),
  "CONCRETE_E4_DATABASE_FAIL_CLOSED_PARITY");
  return { release, search, definitions, revisions, failedJobs };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  const before = resourceSnapshot();
  const runId = randomUUID();
  const authorization = await loginConsumer();
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: CONCRETE_SLAB_VIBRATION_MODE
      ? "concrete-slab-vibration-backend-acceptance"
      : CONCRETE_SLAB_CURING_MODE
      ? "concrete-slab-curing-backend-acceptance"
      : CONCRETE_SLAB_LEVELING_MODE
      ? "concrete-slab-leveling-backend-acceptance"
      : CONCRETE_SLAB_OPERATION_KEY === "repair"
      ? "concrete-slab-repair-backend-acceptance"
      : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
      ? "concrete-slab-embedded-items-backend-acceptance"
      : REINFORCEMENT_FRAME_MODE
      ? "reinforcement-frame-concrete-placement-backend-acceptance"
      : STAIRS_MODE
      ? "stairs-concrete-placement-backend-acceptance"
      : SLAB_FOUNDATION_MODE
      ? "slab-foundation-concrete-placement-backend-acceptance"
      : PEDESTAL_MODE
      ? "pedestal-concrete-placement-backend-acceptance"
      : PILE_CAP_MODE
      ? "pile-cap-concrete-placement-backend-acceptance"
      : CONCRETE_SLAB_MODE
      ? "concrete-slab-concrete-placement-backend-acceptance"
      : BELT_MODE
      ? "belt-concrete-placement-backend-acceptance"
      : COLUMN_BASE_MODE
      ? "column-base-concrete-placement-backend-acceptance"
      : ANCHOR_GROUP_MODE
      ? "anchor-group-concrete-placement-backend-acceptance"
      : "strip-concrete-family-e4-backend-acceptance",
  });
  await client.connect();
  try {
    const manifest = await api(authorization, "runtime-manifest");
    invariant(manifest.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND"
      && manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifest.definitionRelease?.status === "prepared"
      && manifest.searchRelease?.status === "draft"
      && Number(manifest.activeCompileJobCount) === 0,
    "CONCRETE_E4_RUNTIME_TUPLE_RED");
    progress("RUNTIME_GREEN", { releaseId: RELEASE_ID, searchReleaseId: SEARCH_RELEASE_ID });

    const targetResults: Json[] = [];
    const revisionIds: string[] = [];
    const failedJobIds: string[] = [];
    for (const target of TARGETS) {
      const contextKey = target.contextKey;
      const fixture = { ...acceptanceInput(contextKey) } as Json;
      const expectedDefinitionId = EXPECTED_DEFINITION_IDS[contextKey];
      const search = await api(authorization,
        `search/catalog?query=${encodeURIComponent(target.titleRu)}`);
      const exactSearchItems = (search.items as Json[]).filter((item) => item.catalogId === target.catalogId);
      invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID && exactSearchItems.length === 1,
        `CONCRETE_E4_SEARCH_IDENTITY:${contextKey}`);
      const searchItem = exactSearchItems[0];
      invariant(searchItem.definitionVersionId === expectedDefinitionId
        && searchItem.definitionReleaseId === RELEASE_ID
        && searchItem.canonicalNameRu === target.titleRu
        && searchItem.estimateReady === true
        && searchItem.contentAdmission?.allowed === true
        && (CONCRETE_SLAB_VIBRATION_MODE
          ? searchItem.shortScopeRu.includes("виброуплотнения бетонной плиты")
          : CONCRETE_SLAB_CURING_MODE
          ? searchItem.shortScopeRu.includes("ухода за бетонной плитой")
          : CONCRETE_SLAB_LEVELING_MODE
          ? searchItem.shortScopeRu.includes("выравнивания бетонной плиты")
          : CONCRETE_SLAB_OPERATION_KEY === "repair"
          ? searchItem.shortScopeRu.includes("ремонта бетонной плиты")
          : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
          ? searchItem.shortScopeRu.includes("монтажа закладных бетонной плиты")
          : searchItem.shortScopeRu.includes("Полная применимая смета"))
        && searchItem.includedBoundaries.length === 4
        && searchItem.excludedBoundaries.length === 4,
      `CONCRETE_E4_SEARCH_CLAIMS:${contextKey}`);

      const catalog = await api(authorization, `catalog/${encodeURIComponent(target.catalogId)}`);
      const item = catalog.item as Json;
      invariant(item.catalogId === target.catalogId
        && item.releaseId === RELEASE_ID
        && item.definitionVersion === 4
        && item.applicability?.contextKey === contextKey
        && item.applicability?.conditionalScopeFailClosed === true
        && (!CONCRETE_SLAB_VIBRATION_MODE
          || (item.applicability?.operationClass === "CONSOLIDATE_FRESH_CONCRETE"
            && item.applicability?.approvedMethod === "INTERNAL_VIBRATION"
            && item.applicability?.universalProductivityClaimed === false))
        && (!CONCRETE_SLAB_CURING_MODE
          || (item.applicability?.operationClass === "EXTERNAL_CURING_OF_CAST_IN_PLACE_CONCRETE"
            && item.applicability?.approvedMethodParameterId === "approved_external_curing_method"
            && item.applicability?.universalProductivityClaimed === false
            && item.applicability?.universalConsumptionClaimed === false))
        && (!CONCRETE_SLAB_LEVELING_MODE
          || (item.applicability?.operationClass === "LEVEL_AND_STRIKE_OFF_FRESH_CONCRETE_SLAB"
            && item.applicability?.approvedMethodParameterId === "approved_leveling_method_designation"
            && item.applicability?.universalProductivityClaimed === false
            && item.applicability?.universalConsumptionClaimed === false))
        && (CONCRETE_SLAB_OPERATION_KEY !== "repair"
          || (item.applicability?.operationClass === "REPAIR_EXISTING_CONCRETE_SLAB"
            && item.applicability?.assessmentParameterId === "condition_assessment_reference"
            && item.applicability?.approvedDesignParameterId === "approved_repair_design_reference"
            && item.applicability?.approvedMethodParameterId === "approved_repair_method_designation"
            && item.applicability?.universalProductivityClaimed === false
            && item.applicability?.universalConsumptionClaimed === false))
        && (!CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
          || (item.applicability?.operationClass === "PLACE_AND_FIX_EMBEDDED_ITEMS_BEFORE_CONCRETING"
            && item.applicability?.approvedDesignParameterId === "approved_embedment_design_reference"
            && item.applicability?.approvedDrawingParameterId === "approved_placement_drawing_reference"
            && item.applicability?.toleranceParameterId === "tolerance_specification_reference"
            && item.applicability?.universalProductivityClaimed === false
            && item.applicability?.universalConsumptionClaimed === false))
        && item.professionalMetadata?.fullApplicableScope === true
        && item.professionalMetadata?.priceState === "PARTIAL_NEEDS_PRICE"
        && item.contentAdmission?.definitionVersionId === expectedDefinitionId
        && item.contentAdmission?.allowed === true
        && Array.isArray(item.parameterSchema)
        && item.parameterSchema.length === (CONCRETE_SLAB_VIBRATION_MODE
          ? 13
          : CONCRETE_SLAB_CURING_MODE
          ? 24
          : CONCRETE_SLAB_LEVELING_MODE
          ? 20
          : CONCRETE_SLAB_OPERATION_KEY === "repair"
          ? 40
          : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
          ? 34
          : 32),
      `CONCRETE_E4_CATALOG_CLAIMS:${contextKey}`);

      const compilePayload = {
        idempotencyKey: `${CONTRACT}:${runId}:${contextKey}:compile`,
        catalogId: target.catalogId,
        parameters: fixture,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        sourceRequestText: target.titleRu,
        primaryMeasureParameterId: CONCRETE_SLAB_VIBRATION_MODE
          ? "consolidated_concrete_volume_m3"
          : CONCRETE_SLAB_CURING_MODE
          ? "cured_concrete_volume_m3"
          : CONCRETE_SLAB_LEVELING_MODE
          ? "leveled_concrete_volume_m3"
          : CONCRETE_SLAB_OPERATION_KEY === "repair"
          ? "repair_scope_volume_m3"
          : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
          ? "embedded_item_count_piece"
          : "plan_dimension_concrete_volume_m3",
        organizationId: ORGANIZATION_ID,
      };
      const queued = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify(compilePayload),
      });
      const initial = await successfulJobRevision(
        authorization,
        queued,
        `CONCRETE_E4_COMPILE:${contextKey}`,
      );
      const originalVolume = Number(fixture[CONCRETE_SLAB_VIBRATION_MODE
        ? "consolidated_concrete_volume_m3"
        : CONCRETE_SLAB_CURING_MODE
        ? "cured_concrete_volume_m3"
        : CONCRETE_SLAB_LEVELING_MODE
        ? "leveled_concrete_volume_m3"
        : CONCRETE_SLAB_OPERATION_KEY === "repair"
        ? "repair_scope_volume_m3"
        : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
        ? "embedded_item_count_piece"
        : "plan_dimension_concrete_volume_m3"]);
      const original = assertRows(contextKey, initial.revision, initial.rows, fixture, originalVolume);
      invariant(initial.revision.catalogId === target.catalogId,
        `CONCRETE_E4_CATALOG_REVISION:${contextKey}`);

      const replay = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify(compilePayload),
      });
      invariant(replay.jobId === queued.jobId && replay.created === false,
        `CONCRETE_E4_IDEMPOTENCY:${contextKey}`);

      const sensitivityVolume = originalVolume + 1;
      const editedParameters = CONCRETE_SLAB_VIBRATION_MODE
        ? {
            consolidated_concrete_volume_m3: sensitivityVolume,
            vibration_worker_h: Number(fixture.vibration_worker_h) + 2,
          }
        : CONCRETE_SLAB_CURING_MODE
        ? {
            cured_concrete_volume_m3: sensitivityVolume,
            curing_worker_h: Number(fixture.curing_worker_h) + 2,
          }
        : CONCRETE_SLAB_LEVELING_MODE
        ? {
            leveled_concrete_volume_m3: sensitivityVolume,
            leveling_worker_h: Number(fixture.leveling_worker_h) + 2,
          }
        : CONCRETE_SLAB_OPERATION_KEY === "repair"
        ? {
            repair_scope_volume_m3: sensitivityVolume,
            repair_material_placement_worker_h:
              Number(fixture.repair_material_placement_worker_h) + 2,
          }
        : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
        ? {
            embedded_item_count_piece: sensitivityVolume,
            positioning_worker_h: Number(fixture.positioning_worker_h) + 2,
          }
        : { plan_dimension_concrete_volume_m3: sensitivityVolume };
      const recalculatedQueued = await api(authorization, "jobs/recalculate", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `${CONTRACT}:${runId}:${contextKey}:recalculate`,
          catalogId: target.catalogId,
          parentRevisionId: initial.revision.revisionId,
          parameters: editedParameters,
          currencyCode: "KGS",
          priceSnapshotIds: [],
          rowOverrides: {},
          customRows: [],
          organizationId: ORGANIZATION_ID,
        }),
      });
      const sensitivity = await successfulJobRevision(
        authorization,
        recalculatedQueued,
        `CONCRETE_E4_RECALCULATE:${contextKey}`,
      );
      invariant(sensitivity.revision.parentRevisionId === initial.revision.revisionId,
        `CONCRETE_E4_PARENT_LINEAGE:${contextKey}`);
      const sensitivityFixture = { ...fixture, ...editedParameters };
      const edited = assertRows(contextKey, sensitivity.revision, sensitivity.rows, sensitivityFixture, sensitivityVolume);
      const originalById = new Map(initial.rows.map((row) => [row.rowId, Number(row.quantity)]));
      const changedRows = sensitivity.rows
        .filter((row) => Number(row.quantity) !== originalById.get(row.rowId))
        .map((row) => row.rowId).sort();
      const expectedChangedRows = CONCRETE_SLAB_VIBRATION_MODE
        ? [VIBRATION_WORK_ROW_ID]
        : CONCRETE_SLAB_CURING_MODE
        ? [CURING_WORK_ROW_ID]
        : CONCRETE_SLAB_LEVELING_MODE
        ? [LEVELING_WORK_ROW_ID]
        : CONCRETE_SLAB_OPERATION_KEY === "repair"
        ? [REPAIR_PLACEMENT_WORK_ROW_ID]
        : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
        ? [EMBEDDED_ITEMS_POSITIONING_WORK_ROW_ID]
        : [DELIVERY_ROW_ID, READY_MIX_ROW_ID].sort();
      invariant(JSON.stringify(changedRows) === JSON.stringify(expectedChangedRows),
        `CONCRETE_E4_SENSITIVITY_SCOPE:${contextKey}:${changedRows.join(",")}`);

      const invalidQueued = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify({
          ...compilePayload,
          idempotencyKey: `${CONTRACT}:${runId}:${contextKey}:invalid-input`,
          parameters: CONCRETE_SLAB_VIBRATION_MODE
            ? { ...fixture, approved_consolidation_method: "SURFACE_VIBRATION" }
            : CONCRETE_SLAB_CURING_MODE
            ? { ...fixture, approved_external_curing_method: "UNSUPPORTED_INTERNAL_CURING" }
            : CONCRETE_SLAB_LEVELING_MODE
            ? { ...fixture, approved_leveling_method_designation: "" }
            : CONCRETE_SLAB_OPERATION_KEY === "repair"
            ? { ...fixture, condition_assessment_reference: "" }
            : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
            ? { ...fixture, approved_placement_drawing_reference: "" }
            : { ...fixture, selected_contingency_percent: 3 },
        }),
      });
      const invalidJob = await waitForJob(authorization, String(invalidQueued.jobId));
      invariant(invalidJob.status === "failed"
        && invalidJob.errorCode === "PARAMETER_VALIDATION_FAILED"
        && invalidJob.resultRevisionId == null,
      `CONCRETE_E4_FAIL_CLOSED:${contextKey}:${JSON.stringify(invalidJob).slice(0, 2_000)}`);

      const history = await api(authorization,
        `revisions?catalogId=${encodeURIComponent(target.catalogId)}&limit=100`);
      const historyIds = (history.revisions as Json[]).map((revision) => String(revision.revisionId));
      invariant(historyIds.includes(String(initial.revision.revisionId))
        && historyIds.includes(String(sensitivity.revision.revisionId))
        && historyIds.indexOf(String(sensitivity.revision.revisionId))
          < historyIds.indexOf(String(initial.revision.revisionId)),
      `CONCRETE_E4_HISTORY:${contextKey}`);

      revisionIds.push(String(initial.revision.revisionId), String(sensitivity.revision.revisionId));
      failedJobIds.push(String(invalidJob.jobId));
      targetResults.push({
        contextKey,
        catalogId: target.catalogId,
        titleRu: target.titleRu,
        definitionVersionId: expectedDefinitionId,
        search: {
          exactMatchCount: exactSearchItems.length,
          matchTier: searchItem.matchTier,
          matchType: searchItem.matchType,
          fullApplicableScopeClaim: true,
          includedBoundaryCount: searchItem.includedBoundaries.length,
          excludedBoundaryCount: searchItem.excludedBoundaries.length,
        },
        catalog: {
          parameterCount: item.parameterSchema.length,
          contextKey: item.applicability.contextKey,
          conditionalScopeFailClosed: item.applicability.conditionalScopeFailClosed,
          priceState: item.professionalMetadata.priceState,
        },
        compile: {
          jobId: queued.jobId,
          revisionId: initial.revision.revisionId,
          revisionNumber: initial.revision.revisionNumber,
          inputPrimaryMeasure: originalVolume,
          inputPrimaryMeasureUnit: CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? "piece" : "m3",
          inputVolumeM3: CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? null : originalVolume,
          ...original,
        },
        idempotencyReplay: { sameJobId: true, created: false },
        edit: {
          jobId: recalculatedQueued.jobId,
          parentRevisionId: initial.revision.revisionId,
          revisionId: sensitivity.revision.revisionId,
          revisionNumber: sensitivity.revision.revisionNumber,
          inputPrimaryMeasure: sensitivityVolume,
          inputPrimaryMeasureUnit: CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? "piece" : "m3",
          inputVolumeM3: CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? null : sensitivityVolume,
          changedRowIds: changedRows,
          ...edited,
        },
        failClosed: {
          case: CONCRETE_SLAB_VIBRATION_MODE
            ? "unsupported_surface_vibration_method"
            : CONCRETE_SLAB_CURING_MODE
            ? "unsupported_external_curing_method"
            : CONCRETE_SLAB_LEVELING_MODE
            ? "blank_approved_leveling_method_designation"
            : CONCRETE_SLAB_OPERATION_KEY === "repair"
            ? "blank_condition_assessment_reference"
            : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
            ? "blank_approved_placement_drawing_reference"
            : "selected_contingency_percent_below_nrmca_range",
          submittedValue: CONCRETE_SLAB_VIBRATION_MODE
            ? "SURFACE_VIBRATION"
            : CONCRETE_SLAB_CURING_MODE
            ? "UNSUPPORTED_INTERNAL_CURING"
            : CONCRETE_SLAB_LEVELING_MODE
            ? ""
            : CONCRETE_SLAB_OPERATION_KEY === "repair"
            ? ""
            : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
            ? ""
            : 3,
          jobId: invalidJob.jobId,
          status: invalidJob.status,
          errorCode: invalidJob.errorCode,
          resultRevisionId: null,
        },
        history: { containsExactImmutableLineage: true, observedRevisionCount: historyIds.length },
      });
      progress("TARGET_GREEN", {
        contextKey,
        rows: original.rowCount,
        procurementRows: original.procurementRowCount,
        primaryMeasure: original.primaryMeasureValue,
        primaryMeasureUnit: original.primaryMeasureUnit,
      });
    }

    const expectedTargetCount = CONCRETE_SLAB_CURING_MODE || CONCRETE_SLAB_EMBEDDED_ITEMS_MODE ? 6 : 7;
    invariant(targetResults.length === expectedTargetCount
      && new Set(targetResults.map((target) => target.catalogId)).size === expectedTargetCount
      && new Set(targetResults.map((target) => target.definitionVersionId)).size === expectedTargetCount,
    "CONCRETE_E4_TARGET_DENOMINATOR");
    const database = await databaseProof(client, revisionIds, failedJobIds);
    const manifestAfter = await api(authorization, "runtime-manifest");
    invariant(manifestAfter.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && manifestAfter.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifestAfter.definitionRelease?.status === "prepared"
      && manifestAfter.searchRelease?.status === "draft"
      && Number(manifestAfter.activeCompileJobCount) === 0,
    "CONCRETE_E4_RUNTIME_AFTER_RED");

    const after = resourceSnapshot();
    const masterBytes = readFileSync(MASTER);
    const sourcePath = resolve(CONCRETE_SLAB_VIBRATION_MODE
      ? "src/lib/estimate/v4/concreteSlabVibrationR1.ts"
      : CONCRETE_SLAB_CURING_MODE
      ? "src/lib/estimate/v4/concreteSlabCuringR1.ts"
      : CONCRETE_SLAB_LEVELING_MODE
      ? "src/lib/estimate/v4/concreteSlabLevelingR1.ts"
      : CONCRETE_SLAB_OPERATION_KEY === "repair"
      ? "src/lib/estimate/v4/concreteSlabRepairR1.ts"
      : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
      ? "src/lib/estimate/v4/concreteSlabEmbeddedItemsR1.ts"
      : REINFORCEMENT_FRAME_MODE
      ? "src/lib/estimate/v4/reinforcementFrameConcretePlacementR1.ts"
      : STAIRS_MODE
      ? "src/lib/estimate/v4/stairsConcretePlacementR1.ts"
      : SLAB_FOUNDATION_MODE
      ? "src/lib/estimate/v4/slabFoundationConcretePlacementR1.ts"
      : PEDESTAL_MODE
      ? "src/lib/estimate/v4/pedestalConcretePlacementR1.ts"
      : PILE_CAP_MODE
      ? "src/lib/estimate/v4/pileCapConcretePlacementR1.ts"
      : CONCRETE_SLAB_MODE
      ? "src/lib/estimate/v4/concreteSlabConcretePlacementR1.ts"
      : BELT_MODE
      ? "src/lib/estimate/v4/beltConcretePlacementR1.ts"
      : COLUMN_BASE_MODE
      ? "src/lib/estimate/v4/columnBaseConcretePlacementR1.ts"
      : ANCHOR_GROUP_MODE
        ? "src/lib/estimate/v4/anchorGroupConcretePlacementR1.ts"
        : "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts");
    const evidence = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      status: CONCRETE_SLAB_VIBRATION_MODE
        ? "GREEN_CONCRETE_SLAB_VIBRATION_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : CONCRETE_SLAB_CURING_MODE
        ? "GREEN_CONCRETE_SLAB_CURING_6_OF_6_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : CONCRETE_SLAB_LEVELING_MODE
        ? "GREEN_CONCRETE_SLAB_LEVELING_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : CONCRETE_SLAB_OPERATION_KEY === "repair"
        ? "GREEN_CONCRETE_SLAB_REPAIR_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
        ? "GREEN_CONCRETE_SLAB_EMBEDDED_ITEMS_6_OF_6_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : REINFORCEMENT_FRAME_MODE
        ? "GREEN_REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : STAIRS_MODE
        ? "GREEN_STAIRS_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : SLAB_FOUNDATION_MODE
        ? "GREEN_SLAB_FOUNDATION_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : PEDESTAL_MODE
        ? "GREEN_PEDESTAL_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : PILE_CAP_MODE
        ? "GREEN_PILE_CAP_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : CONCRETE_SLAB_MODE
        ? "GREEN_CONCRETE_SLAB_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : BELT_MODE
        ? "GREEN_BELT_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : COLUMN_BASE_MODE
        ? "GREEN_COLUMN_BASE_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : ANCHOR_GROUP_MODE
        ? "GREEN_ANCHOR_GROUP_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
        : "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE",
      globalStatus: GLOBAL_STATUS,
      runId,
      master: { path: MASTER, sha256: sha256(masterBytes) },
      source: {
        branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
        head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        workingSourceSha256: sha256(readFileSync(sourcePath)),
        runtimeSourceHead: manifest.sourceHead,
        runtimeSourceTree: manifest.sourceTree,
        backendRuntimeSourceSha256: manifest.runtimeSourceSha256,
      },
      runtime: {
        definitionReleaseId: RELEASE_ID,
        definitionReleaseStatus: manifest.definitionRelease.status,
        definitionActivatedAt: database.release.activated_at ?? null,
        searchReleaseId: SEARCH_RELEASE_ID,
        searchReleaseStatus: manifest.searchRelease.status,
        searchActivatedAt: database.search.activated_at ?? null,
        providerMode: "local-only",
        backendOrigin: BACKEND,
        database: "127.0.0.1:55432/rik_r4_runtime_b5_v2",
      },
      denominator: {
        originalTargetCount: targetResults.length,
        acceptedTargetCount: targetResults.length,
        blockedTargetCount: 0,
        compileRevisionCount: targetResults.length,
        editRevisionCount: targetResults.length,
        failClosedNegativeCount: targetResults.length,
      },
      normativeSource: SOURCE_METADATA,
      targetResults,
      database: {
        persistedRevisionCount: database.revisions.length,
        failedJobCount: database.failedJobs.length,
        definitionCount: database.definitions.length,
        release: database.release,
        search: database.search,
        revisionIds,
        failedJobIds,
      },
      resourceControl: {
        before,
        after,
        availableMemoryDeltaBytes: after.availableMemoryBytes - before.availableMemoryBytes,
        availableDiskDeltaBytes: after.availableDiskBytes - before.availableDiskBytes,
        heavyProcessStarted: false,
        existingBackendPreserved: true,
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
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
