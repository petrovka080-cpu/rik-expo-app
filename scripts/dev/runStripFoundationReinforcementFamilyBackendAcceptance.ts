import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  STRIP_FOUNDATION_REINFORCEMENT_TARGETS,
  compileStripFoundationReinforcementR1,
  stripFoundationReinforcementAcceptanceInputR1,
  type StripFoundationReinforcementContextKey,
} from "../../src/lib/estimate/v4/stripFoundationReinforcementR1";
import {
  SLAB_FOUNDATION_REINFORCEMENT_TARGETS,
  compileSlabFoundationReinforcementR1,
  slabFoundationReinforcementAcceptanceInputR1,
  type SlabFoundationReinforcementContextKey,
} from "../../src/lib/estimate/v4/slabFoundationReinforcementR1";
import {
  CONCRETE_SLAB_REINFORCEMENT_TARGETS,
  compileConcreteSlabReinforcementR1,
  concreteSlabReinforcementAcceptanceInputR1,
  type ConcreteSlabReinforcementContextKey,
} from "../../src/lib/estimate/v4/concreteSlabReinforcementR1";
import {
  PILE_CAP_REINFORCEMENT_TARGETS,
  compilePileCapReinforcementR1,
  pileCapReinforcementAcceptanceInputR1,
  type PileCapReinforcementContextKey,
} from "../../src/lib/estimate/v4/pileCapReinforcementR1";
import {
  PEDESTAL_REINFORCEMENT_TARGETS,
  compilePedestalReinforcementR1,
  pedestalReinforcementAcceptanceInputR1,
  type PedestalReinforcementContextKey,
} from "../../src/lib/estimate/v4/pedestalReinforcementR1";
import {
  STAIRS_REINFORCEMENT_TARGETS,
  compileStairsReinforcementR1,
  stairsReinforcementAcceptanceInputR1,
  type StairsReinforcementContextKey,
} from "../../src/lib/estimate/v4/stairsReinforcementR1";
import {
  REINFORCEMENT_FRAME_ASSEMBLY_TARGETS,
  REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS,
  compileReinforcementFrameAssemblyR1,
  compileReinforcementFrameReinforcementR1,
  reinforcementFrameAssemblyAcceptanceInputR1,
  reinforcementFrameReinforcementAcceptanceInputR1,
  type ReinforcementFrameAssemblyContextKey,
  type ReinforcementFrameReinforcementContextKey,
} from "../../src/lib/estimate/v4/reinforcementFrameReinforcementR1";
import {
  COLUMN_BASE_REINFORCEMENT_TARGETS,
  columnBaseReinforcementAcceptanceInputR1,
  compileColumnBaseReinforcementR1,
  type ColumnBaseReinforcementContextKey,
} from "../../src/lib/estimate/v4/columnBaseReinforcementR1";
import {
  ANCHOR_GROUP_REINFORCEMENT_TARGETS,
  anchorGroupReinforcementAcceptanceInputR1,
  compileAnchorGroupReinforcementR1,
  type AnchorGroupReinforcementContextKey,
} from "../../src/lib/estimate/v4/anchorGroupReinforcementR1";
import {
  BELT_REINFORCEMENT_TARGETS,
  beltReinforcementAcceptanceInputR1,
  compileBeltReinforcementR1,
  type BeltReinforcementContextKey,
} from "../../src/lib/estimate/v4/beltReinforcementR1";
import {
  JOINT_REINFORCEMENT_TARGETS,
  compileJointReinforcementR1,
  jointReinforcementAcceptanceInputR1,
  type JointReinforcementContextKey,
} from "../../src/lib/estimate/v4/jointReinforcementR1";
import {
  FORMWORK_REINFORCEMENT_TARGETS,
  compileFormworkReinforcementR1,
  formworkReinforcementAcceptanceInputR1,
  type FormworkReinforcementContextKey,
} from "../../src/lib/estimate/v4/formworkReinforcementR1";
import {
  ANCHOR_GROUP_INSTALLATION_TARGETS,
  ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA,
  anchorGroupInstallationAcceptanceInputR1,
  compileAnchorGroupInstallationR1,
  type AnchorGroupInstallationContextKey,
} from "../../src/lib/estimate/v4/anchorGroupInstallationR1";

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
const CONTRACT = IS_ANCHOR
  ? "rik-expo-app.r4-a13-6.anchor-group-installation.backend-acceptance.v1"
  : IS_FORMWORK_REINFORCEMENT
    ? "rik-expo-app.r4-a13-6.formwork-reinforcement-family.backend-acceptance.v1"
  : IS_JOINT_REINFORCEMENT
    ? "rik-expo-app.r4-a13-6.joint-reinforcement-family.backend-acceptance.v1"
  : IS_BELT_REINFORCEMENT
    ? "rik-expo-app.r4-a13-6.belt-reinforcement-family.backend-acceptance.v1"
  : IS_ANCHOR_GROUP_REINFORCEMENT
    ? "rik-expo-app.r4-a13-6.anchor-group-reinforcement-family.backend-acceptance.v1"
  : IS_COLUMN_BASE
    ? "rik-expo-app.r4-a13-6.column-base-reinforcement-family.backend-acceptance.v1"
  : IS_REINFORCEMENT_FRAME_ASSEMBLY
    ? "rik-expo-app.r4-a13-6.reinforcement-frame-assembly-family.backend-acceptance.v1"
  : IS_REINFORCEMENT_FRAME
    ? "rik-expo-app.r4-a13-6.reinforcement-frame-reinforcement-family.backend-acceptance.v1"
  : IS_STAIRS
    ? "rik-expo-app.r4-a13-6.stairs-reinforcement-family.backend-acceptance.v1"
  : IS_PEDESTAL
    ? "rik-expo-app.r4-a13-6.pedestal-reinforcement-family.backend-acceptance.v1"
  : IS_PILE_CAP
    ? "rik-expo-app.r4-a13-6.pile-cap-reinforcement-family.backend-acceptance.v1"
  : IS_CONCRETE_SLAB
    ? "rik-expo-app.r4-a13-6.concrete-slab-reinforcement-family.backend-acceptance.v1"
  : IS_SLAB_FOUNDATION
    ? "rik-expo-app.r4-a13-6.slab-foundation-reinforcement-family.backend-acceptance.v1"
    : "rik-expo-app.r4-a13-6.strip-foundation-reinforcement-family.backend-acceptance.v1";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = IS_ANCHOR
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
const SEARCH_RELEASE_ID = IS_ANCHOR
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
const ORGANIZATION_ID = "55555555-5555-4555-8555-555555555551";
const PRIMARY_PARAMETER_ID = IS_ANCHOR
  ? "anchor_bolt_quantity_piece"
  : "approved_reinforcement_schedule_weight_kg";
const PRIMARY_ROW_ID = IS_ANCHOR
  ? "material:anchor-group:anchor-bolts"
  : "material:reinforcement:steel-approved-schedule";
const DELIVERY_ROW_ID = IS_ANCHOR
  ? "delivery:anchor-group:supply"
  : "delivery:reinforcement:steel";
const TARGETS = IS_ANCHOR
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
const SOURCE_ID = IS_ANCHOR
  ? ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID
  : REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID;
const NORM_ID = IS_ANCHOR
  ? ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID
  : REINFORCEMENT_BAR_SCHEDULE_NORM_ID;
const SOURCE_METADATA = IS_ANCHOR
  ? ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA
  : REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA;
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const FAMILY_RECEIPT = resolve(
  IS_ANCHOR
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-installation-family-source-role-r2/acceptance.json"
    : IS_FORMWORK_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-reinforcement-family/acceptance.json"
    : IS_JOINT_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/joint-reinforcement-family/acceptance.json"
    : IS_BELT_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-reinforcement-family/acceptance.json"
    : IS_ANCHOR_GROUP_REINFORCEMENT
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-reinforcement-family/acceptance.json"
    : IS_COLUMN_BASE
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-reinforcement-family/acceptance.json"
    : IS_REINFORCEMENT_FRAME_ASSEMBLY
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-assembly-family/acceptance.json"
    : IS_REINFORCEMENT_FRAME
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-reinforcement-family/acceptance.json"
    : IS_STAIRS
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/stairs-reinforcement-family/acceptance.json"
    : IS_PEDESTAL
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-reinforcement-family/acceptance.json"
    : IS_PILE_CAP
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-reinforcement-family/acceptance.json"
    : IS_CONCRETE_SLAB
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-reinforcement-family/acceptance.json"
    : IS_SLAB_FOUNDATION
      ? ".release-runtime/r4a13-6/exact-physical-norm-successors/slab-foundation-reinforcement-family/acceptance.json"
      : ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family/acceptance.json",
);
const MASTER = resolve(
  IS_ANCHOR
    ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (10).md"
    : IS_FORMWORK_REINFORCEMENT
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (14).md"
    : IS_JOINT_REINFORCEMENT
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (14).md"
    : IS_BELT_REINFORCEMENT
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
    : IS_ANCHOR_GROUP_REINFORCEMENT
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
    : IS_COLUMN_BASE
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
    : IS_REINFORCEMENT_FRAME_ASSEMBLY
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (16).md"
    : IS_REINFORCEMENT_FRAME
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
    : IS_STAIRS
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
    : IS_PEDESTAL
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
    : IS_PILE_CAP
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
    : IS_CONCRETE_SLAB
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
    : IS_SLAB_FOUNDATION
      ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
      : "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md",
);
const OUTPUT = resolve(
  IS_ANCHOR
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

const API_PROGRESS = IS_ANCHOR
  ? "ANCHOR_GROUP_API"
  : IS_FORMWORK_REINFORCEMENT
    ? "FORMWORK_REINFORCEMENT_API"
  : IS_JOINT_REINFORCEMENT
    ? "JOINT_REINFORCEMENT_API"
  : IS_BELT_REINFORCEMENT
    ? "BELT_REINFORCEMENT_API"
  : IS_ANCHOR_GROUP_REINFORCEMENT
    ? "ANCHOR_GROUP_REINFORCEMENT_API"
  : IS_COLUMN_BASE
    ? "COLUMN_BASE_REINFORCEMENT_API"
  : IS_REINFORCEMENT_FRAME_ASSEMBLY
    ? "REINFORCEMENT_FRAME_ASSEMBLY_API"
  : IS_REINFORCEMENT_FRAME
    ? "REINFORCEMENT_FRAME_REINFORCEMENT_API"
  : IS_STAIRS
    ? "STAIRS_REINFORCEMENT_API"
  : IS_PEDESTAL
    ? "PEDESTAL_REINFORCEMENT_API"
  : IS_PILE_CAP
    ? "PILE_CAP_REINFORCEMENT_API"
  : IS_CONCRETE_SLAB
    ? "CONCRETE_SLAB_REINFORCEMENT_API"
  : IS_SLAB_FOUNDATION
    ? "SLAB_FOUNDATION_REINFORCEMENT_API"
    : "STRIP_REINFORCEMENT_E5_API";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`${API_PROGRESS}:${code}`);
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

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({
    progress: API_PROGRESS,
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
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)
    && parsed.port === "55432"
    && parsed.pathname === "/rik_r4_runtime_b5_v2", "DATABASE_IDENTITY_RED");
  invariant(new URL(BACKEND).hostname === "127.0.0.1"
    && new URL(PROVIDER).hostname === "127.0.0.1", "NON_LOCAL_RUNTIME_RED");
}

async function loginConsumer(): Promise<string> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key,
    "CONSUMER_CREDENTIALS_RED");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token, `LOGIN_HTTP_${response.status}`);
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
    `HTTP_${path}_${result.status}:${JSON.stringify(result.body).slice(0, 2_000)}`);
  return result.body;
}

async function waitForJob(authorization: string, jobId: string): Promise<Json> {
  invariant(/^[0-9a-f-]{36}$/iu.test(jobId), `JOB_ID_RED:${jobId}`);
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`STRIP_REINFORCEMENT_API:JOB_TIMEOUT:${jobId}`);
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

async function successfulRevision(
  authorization: string,
  queued: Json,
  code: string,
): Promise<{ job: Json; revision: Json; rows: Json[] }> {
  const job = await waitForJob(authorization, String(queued.jobId ?? ""));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `${code}:${JSON.stringify(job).slice(0, 2_000)}`);
  return {
    job,
    revision: await api(authorization, `revisions/${job.resultRevisionId}`),
    rows: await allRows(authorization, String(job.resultRevisionId)),
  };
}

async function expectedRows(
  catalogId: string,
  parameters: Json,
): Promise<{ rows: Json[]; procurementRows: number }> {
  const compiled = IS_ANCHOR
    ? await compileAnchorGroupInstallationR1(parameters, { catalogId })
    : IS_FORMWORK_REINFORCEMENT
      ? await compileFormworkReinforcementR1(parameters, { catalogId })
    : IS_JOINT_REINFORCEMENT
      ? await compileJointReinforcementR1(parameters, { catalogId })
    : IS_BELT_REINFORCEMENT
      ? await compileBeltReinforcementR1(parameters, { catalogId })
    : IS_ANCHOR_GROUP_REINFORCEMENT
      ? await compileAnchorGroupReinforcementR1(parameters, { catalogId })
    : IS_COLUMN_BASE
      ? await compileColumnBaseReinforcementR1(parameters, { catalogId })
    : IS_REINFORCEMENT_FRAME_ASSEMBLY
      ? await compileReinforcementFrameAssemblyR1(parameters, { catalogId })
    : IS_REINFORCEMENT_FRAME
      ? await compileReinforcementFrameReinforcementR1(parameters, { catalogId })
    : IS_STAIRS
      ? await compileStairsReinforcementR1(parameters, { catalogId })
    : IS_PEDESTAL
      ? await compilePedestalReinforcementR1(parameters, { catalogId })
    : IS_PILE_CAP
      ? await compilePileCapReinforcementR1(parameters, { catalogId })
    : IS_CONCRETE_SLAB
      ? await compileConcreteSlabReinforcementR1(parameters, { catalogId })
    : IS_SLAB_FOUNDATION
      ? await compileSlabFoundationReinforcementR1(parameters, { catalogId })
      : await compileStripFoundationReinforcementR1(parameters, { catalogId });
  invariant(compiled.preliminaryNeeds.length === 0, `LOCAL_CORE_PRELIMINARY:${catalogId}`);
  return {
    rows: compiled.rows as unknown as Json[],
    procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
  };
}

function closeTo(actual: unknown, expected: unknown, code: string): void {
  const actualNumber = Number(actual);
  const expectedNumber = Number(expected);
  invariant(Number.isFinite(actualNumber)
    && Number.isFinite(expectedNumber)
    && Math.abs(actualNumber - expectedNumber) < 1e-8,
  `${code}:${actualNumber}:${expectedNumber}`);
}

function assertRows(input: {
  contextKey: StripFoundationReinforcementContextKey | string;
  catalogId: string;
  definitionVersionId: string;
  revision: Json;
  rows: Json[];
  expected: { rows: Json[]; procurementRows: number };
  expectedPrimaryQuantity: number;
}): Json {
  invariant(input.revision.releaseId === RELEASE_ID
    && input.revision.definitionVersionId === input.definitionVersionId
    && input.revision.catalogId === input.catalogId
    && Number(input.revision.parameters?.[PRIMARY_PARAMETER_ID])
      === input.expectedPrimaryQuantity,
  `REVISION_IDENTITY:${input.contextKey}`);
  invariant(Array.isArray(input.revision.preliminaryNeeds)
    && input.revision.preliminaryNeeds.length === 0, `PRELIMINARY_RED:${input.contextKey}`);
  invariant(input.rows.length === input.expected.rows.length
    && input.rows.length === Number(input.revision.rowCount),
  `ROW_DENOMINATOR:${input.contextKey}:${input.rows.length}:${input.expected.rows.length}`);
  const expectedById = new Map(input.expected.rows.map((row) => [String(row.row_id), row]));
  invariant(new Set(input.rows.map((row) => row.rowId)).size === input.rows.length,
    `ROW_DUPLICATE:${input.contextKey}`);
  for (const row of input.rows) {
    const expected = expectedById.get(String(row.rowId));
    invariant(expected, `ROW_UNEXPECTED:${input.contextKey}:${row.rowId}`);
    closeTo(row.quantity, expected.quantity, `ROW_QUANTITY:${input.contextKey}:${row.rowId}`);
    invariant(row.unitId === expected.unit_id
      && row.includedInEstimate === true
      && row.unitPrice == null
      && row.amount == null,
    `ROW_STATE:${input.contextKey}:${row.rowId}`);
  }
  const primary = input.rows.find((row) => row.rowId === PRIMARY_ROW_ID);
  invariant(primary?.procurementEligible === true
    && primary.includedInProcurement === true
    && primary.unitId === (IS_ANCHOR ? "piece" : "kg"), `PRIMARY_FLAGS:${input.contextKey}`);
  const exactTrace = (primary.normativeTrace as Json[] | undefined)?.find((trace) =>
    trace.source_id === SOURCE_ID && trace.norm_id === NORM_ID,
  );
  const binding = primary.calculationTrace?.resourceGraph?.professionalPhysicalNormBindingV1;
  invariant(exactTrace?.source_definition_hash === SOURCE_METADATA.definition_hash
    && exactTrace?.exact_locator === SOURCE_METADATA.exact_locator
    && (IS_ANCHOR || binding?.product_profile_id != null),
  `NORMATIVE_TRACE:${input.contextKey}`);
  invariant(Number(input.revision.totals?.includedRowCount) === input.rows.length
    && Number(input.revision.totals?.unpricedRowCount) === input.rows.length
    && Number(input.revision.totals?.pricedRowCount) === 0
    && Number(input.revision.totals?.amount) === 0,
  `TOTALS:${input.contextKey}`);
  return {
    rowIds: input.rows.map((row) => row.rowId),
    rowCount: input.rows.length,
    procurementRowCount: input.rows.filter((row) => row.includedInProcurement === true).length,
    primaryQuantity: Number(primary.quantity),
    deliveryTKm: Number(input.rows.find((row) => row.rowId === DELIVERY_ROW_ID)?.quantity ?? 0),
    normativeSourceId: exactTrace?.source_id,
    normativeNormId: exactTrace?.norm_id,
    inventedPriceCount: input.rows.filter((row) => row.unitPrice != null || row.amount != null).length,
  };
}

async function databaseProof(
  client: Client,
  definitionIds: readonly string[],
  revisionIds: readonly string[],
  failedJobIds: readonly string[],
): Promise<Json> {
  const release = (await client.query(`select id::text,status,activated_at,source_commit,source_tree
    from public.estimate_definition_release where id=$1`, [RELEASE_ID])).rows[0] as Json;
  const search = (await client.query(`select id::text,status,activated_at
    from public.estimate_search_index_release where id=$1`, [SEARCH_RELEASE_ID])).rows[0] as Json;
  invariant(release?.status === "prepared" && release.activated_at == null, "RELEASE_LIFECYCLE_RED");
  invariant(search?.status === "draft" && search.activated_at == null, "SEARCH_LIFECYCLE_RED");
  const definitions = (await client.query(`select catalog_id,definition_version_id::text
    from public.estimate_cumulative_manifest_entry
    where release_id=$1 and catalog_id=any($2::text[]) order by catalog_id`, [
    RELEASE_ID, TARGETS.map((target) => target.catalogId),
  ])).rows as Json[];
  const revisions = (await client.query(`select id::text,parent_revision_id::text,release_id::text,
      definition_version_id::text,catalog_id,revision_number,row_count,checksum_sha256
    from public.estimate_revision where id=any($1::uuid[]) order by catalog_id,revision_number`, [
    revisionIds,
  ])).rows as Json[];
  const failedJobs = (await client.query(`select id::text,status,error_code,result_revision_id::text
    from public.estimate_compile_job where id=any($1::uuid[]) order by created_at`, [failedJobIds])).rows as Json[];
  invariant(definitions.length === TARGETS.length
    && definitions.every((row) => definitionIds.includes(String(row.definition_version_id))),
  "DATABASE_DEFINITION_DENOMINATOR_RED");
  invariant(revisions.length === revisionIds.length
    && revisions.every((row) => row.release_id === RELEASE_ID), "DATABASE_REVISION_PARITY_RED");
  invariant(failedJobs.length === failedJobIds.length
    && failedJobs.every((row) => row.status === "failed"
      && row.error_code === "PARAMETER_VALIDATION_FAILED"
      && row.result_revision_id == null), "DATABASE_FAIL_CLOSED_PARITY_RED");
  return { release, search, definitions, revisions, failedJobs };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  const before = resourceSnapshot();
  invariant(before.availableMemoryBytes >= 2 * 1024 ** 3, "AVAILABLE_MEMORY_BELOW_2_GIB");
  invariant(before.availableDiskBytes >= 10 * 1024 ** 3, "AVAILABLE_DISK_BELOW_10_GIB");
  const sourceReceipt = JSON.parse(readFileSync(FAMILY_RECEIPT, "utf8")) as Json;
  invariant(sourceReceipt.status === (IS_ANCHOR
    ? "GREEN_ANCHOR_GROUP_INSTALLATION_PREPARED_NOT_ACTIVE"
    : IS_FORMWORK_REINFORCEMENT
      ? "GREEN_FORMWORK_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    : IS_JOINT_REINFORCEMENT
      ? "GREEN_JOINT_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    : IS_BELT_REINFORCEMENT
      ? "GREEN_BELT_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    : IS_ANCHOR_GROUP_REINFORCEMENT
      ? "GREEN_ANCHOR_GROUP_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    : IS_COLUMN_BASE
      ? "GREEN_COLUMN_BASE_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    : IS_REINFORCEMENT_FRAME_ASSEMBLY
      ? "GREEN_REINFORCEMENT_FRAME_ASSEMBLY_PREPARED_NOT_ACTIVE"
    : IS_REINFORCEMENT_FRAME
      ? "GREEN_REINFORCEMENT_FRAME_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    : IS_STAIRS
      ? "GREEN_STAIRS_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    : IS_PEDESTAL
      ? "GREEN_PEDESTAL_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    : IS_PILE_CAP
      ? "GREEN_PILE_CAP_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    : IS_CONCRETE_SLAB
      ? "GREEN_CONCRETE_SLAB_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    : IS_SLAB_FOUNDATION
      ? "GREEN_SLAB_FOUNDATION_REINFORCEMENT_PREPARED_NOT_ACTIVE"
      : "GREEN_STRIP_FOUNDATION_REINFORCEMENT_PREPARED_NOT_ACTIVE")
    && sourceReceipt.successor?.releaseId === RELEASE_ID
    && sourceReceipt.successor?.searchReleaseId === SEARCH_RELEASE_ID,
  "FAMILY_RECEIPT_RED");
  const targetReceiptByContext = new Map<string, Json>(
    (sourceReceipt.successor.targets as Json[]).map((target) => [String(target.contextKey), target]),
  );
  invariant(targetReceiptByContext.size === TARGETS.length, "FAMILY_RECEIPT_DENOMINATOR_RED");

  const authorization = await loginConsumer();
  const runId = randomUUID();
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: IS_ANCHOR
      ? "anchor-group-installation-backend-acceptance"
      : IS_FORMWORK_REINFORCEMENT
        ? "formwork-reinforcement-backend-acceptance"
      : IS_JOINT_REINFORCEMENT
        ? "joint-reinforcement-backend-acceptance"
      : IS_BELT_REINFORCEMENT
        ? "belt-reinforcement-backend-acceptance"
      : IS_ANCHOR_GROUP_REINFORCEMENT
        ? "anchor-group-reinforcement-backend-acceptance"
      : IS_COLUMN_BASE
        ? "column-base-reinforcement-backend-acceptance"
      : IS_REINFORCEMENT_FRAME_ASSEMBLY
        ? "reinforcement-frame-assembly-backend-acceptance"
      : IS_REINFORCEMENT_FRAME
        ? "reinforcement-frame-reinforcement-backend-acceptance"
      : IS_STAIRS
        ? "stairs-reinforcement-backend-acceptance"
      : IS_PEDESTAL
        ? "pedestal-reinforcement-backend-acceptance"
      : IS_PILE_CAP
        ? "pile-cap-reinforcement-backend-acceptance"
      : IS_CONCRETE_SLAB
        ? "concrete-slab-reinforcement-backend-acceptance"
      : IS_SLAB_FOUNDATION
        ? "slab-foundation-reinforcement-backend-acceptance"
        : "strip-reinforcement-family-e5-backend-acceptance",
  });
  await client.connect();
  try {
    const manifest = await api(authorization, "runtime-manifest");
    invariant(manifest.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND"
      && manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifest.definitionRelease?.status === "prepared"
      && manifest.searchRelease?.status === "draft"
      && Number(manifest.activeCompileJobCount) === 0, "RUNTIME_TUPLE_RED");
    progress("RUNTIME_GREEN", { releaseId: RELEASE_ID, searchReleaseId: SEARCH_RELEASE_ID });

    const targetResults: Json[] = [];
    const revisionIds: string[] = [];
    const failedJobIds: string[] = [];
    const definitionIds: string[] = [];
    for (const target of TARGETS) {
      const fixture = (IS_ANCHOR
        ? { ...anchorGroupInstallationAcceptanceInputR1(
          target.contextKey as AnchorGroupInstallationContextKey,
        ) }
        : IS_FORMWORK_REINFORCEMENT
          ? { ...formworkReinforcementAcceptanceInputR1(
            target.contextKey as FormworkReinforcementContextKey,
          ) }
        : IS_JOINT_REINFORCEMENT
          ? { ...jointReinforcementAcceptanceInputR1(
            target.contextKey as JointReinforcementContextKey,
          ) }
        : IS_BELT_REINFORCEMENT
          ? { ...beltReinforcementAcceptanceInputR1(
            target.contextKey as BeltReinforcementContextKey,
          ) }
        : IS_ANCHOR_GROUP_REINFORCEMENT
          ? { ...anchorGroupReinforcementAcceptanceInputR1(
            target.contextKey as AnchorGroupReinforcementContextKey,
          ) }
        : IS_COLUMN_BASE
          ? { ...columnBaseReinforcementAcceptanceInputR1(
            target.contextKey as ColumnBaseReinforcementContextKey,
          ) }
        : IS_REINFORCEMENT_FRAME_ASSEMBLY
          ? { ...reinforcementFrameAssemblyAcceptanceInputR1(
            target.contextKey as ReinforcementFrameAssemblyContextKey,
          ) }
        : IS_REINFORCEMENT_FRAME
          ? { ...reinforcementFrameReinforcementAcceptanceInputR1(
            target.contextKey as ReinforcementFrameReinforcementContextKey,
          ) }
        : IS_STAIRS
          ? { ...stairsReinforcementAcceptanceInputR1(
            target.contextKey as StairsReinforcementContextKey,
          ) }
        : IS_PEDESTAL
          ? { ...pedestalReinforcementAcceptanceInputR1(
            target.contextKey as PedestalReinforcementContextKey,
          ) }
        : IS_PILE_CAP
          ? { ...pileCapReinforcementAcceptanceInputR1(
            target.contextKey as PileCapReinforcementContextKey,
          ) }
        : IS_CONCRETE_SLAB
          ? { ...concreteSlabReinforcementAcceptanceInputR1(
            target.contextKey as ConcreteSlabReinforcementContextKey,
          ) }
        : IS_SLAB_FOUNDATION
          ? { ...slabFoundationReinforcementAcceptanceInputR1(
            target.contextKey as SlabFoundationReinforcementContextKey,
          ) }
          : { ...stripFoundationReinforcementAcceptanceInputR1(
            target.contextKey as StripFoundationReinforcementContextKey,
          ) }) as Json;
      const sourceTarget = targetReceiptByContext.get(target.contextKey);
      const definitionVersionId = String(sourceTarget?.definitionId ?? "");
      invariant(/^[0-9a-f-]{36}$/iu.test(definitionVersionId),
        `DEFINITION_ID_RED:${target.contextKey}`);
      definitionIds.push(definitionVersionId);

      const search = await api(authorization,
        `search/catalog?query=${encodeURIComponent(target.titleRu)}`);
      const exactSearchItems = (search.items as Json[]).filter((item) => item.catalogId === target.catalogId);
      invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID && exactSearchItems.length === 1,
        `SEARCH_IDENTITY:${target.contextKey}`);
      const searchItem = exactSearchItems[0];
      invariant(searchItem.definitionVersionId === definitionVersionId
        && searchItem.definitionReleaseId === RELEASE_ID
        && searchItem.canonicalNameRu === target.titleRu
        && searchItem.estimateReady === true
        && searchItem.contentAdmission?.allowed === true,
      `SEARCH_CLAIMS:${target.contextKey}`);

      const catalog = await api(authorization, `catalog/${encodeURIComponent(target.catalogId)}`);
      const item = catalog.item as Json;
      invariant(item.catalogId === target.catalogId
        && item.releaseId === RELEASE_ID
        && item.applicability?.contextKey === target.contextKey
        && item.applicability?.conditionalScopeFailClosed === true
        && item.professionalMetadata?.fullApplicableScope === true
        && item.professionalMetadata?.priceState === "PARTIAL_NEEDS_PRICE"
        && item.contentAdmission?.definitionVersionId === definitionVersionId
        && item.contentAdmission?.allowed === true
        && Array.isArray(item.parameterSchema)
        && item.parameterSchema.length === (IS_ANCHOR ? 39 : 37),
      `CATALOG_CLAIMS:${target.contextKey}`);

      const compilePayload = {
        idempotencyKey: `${CONTRACT}:${runId}:${target.contextKey}:compile`,
        catalogId: target.catalogId,
        parameters: fixture,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        sourceRequestText: target.titleRu,
        primaryMeasureParameterId: PRIMARY_PARAMETER_ID,
        organizationId: ORGANIZATION_ID,
      };
      const queued = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify(compilePayload),
      });
      const initial = await successfulRevision(
        authorization, queued, `COMPILE:${target.contextKey}`,
      );
      const initialExpected = await expectedRows(target.catalogId, fixture);
      const initialPrimaryQuantity = Number(fixture[PRIMARY_PARAMETER_ID]);
      const original = assertRows({
        contextKey: target.contextKey,
        catalogId: target.catalogId,
        definitionVersionId,
        revision: initial.revision,
        rows: initial.rows,
        expected: initialExpected,
        expectedPrimaryQuantity: initialPrimaryQuantity,
      });

      const replay = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify(compilePayload),
      });
      invariant(replay.jobId === queued.jobId && replay.created === false,
        `IDEMPOTENCY:${target.contextKey}`);

      const editedPrimaryQuantity = initialPrimaryQuantity + (IS_ANCHOR ? 4 : 100);
      const editedFixture = {
        ...fixture,
        [PRIMARY_PARAMETER_ID]: editedPrimaryQuantity,
      };
      const recalculatedQueued = await api(authorization, "jobs/recalculate", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `${CONTRACT}:${runId}:${target.contextKey}:recalculate`,
          catalogId: target.catalogId,
          parentRevisionId: initial.revision.revisionId,
          parameters: { [PRIMARY_PARAMETER_ID]: editedPrimaryQuantity },
          currencyCode: "KGS",
          priceSnapshotIds: [],
          rowOverrides: {},
          customRows: [],
          organizationId: ORGANIZATION_ID,
        }),
      });
      const editedRevision = await successfulRevision(
        authorization, recalculatedQueued, `RECALCULATE:${target.contextKey}`,
      );
      invariant(editedRevision.revision.parentRevisionId === initial.revision.revisionId,
        `PARENT_LINEAGE:${target.contextKey}`);
      const editedExpected = await expectedRows(target.catalogId, editedFixture);
      const edited = assertRows({
        contextKey: target.contextKey,
        catalogId: target.catalogId,
        definitionVersionId,
        revision: editedRevision.revision,
        rows: editedRevision.rows,
        expected: editedExpected,
        expectedPrimaryQuantity: editedPrimaryQuantity,
      });
      const originalById = new Map(initial.rows.map((row) => [row.rowId, Number(row.quantity)]));
      const changedRows = editedRevision.rows
        .filter((row) => Number(row.quantity) !== originalById.get(row.rowId))
        .map((row) => String(row.rowId)).sort();
      const originalExpectedById = new Map(
        initialExpected.rows.map((row) => [String(row.row_id), Number(row.quantity)]),
      );
      const expectedChangedRows = editedExpected.rows
        .filter((row) => Number(row.quantity) !== originalExpectedById.get(String(row.row_id)))
        .map((row) => String(row.row_id)).sort();
      invariant(JSON.stringify(changedRows) === JSON.stringify(expectedChangedRows),
        `EDIT_SCOPE:${target.contextKey}:${changedRows.join(",")}`);

      const invalidQueued = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify({
          ...compilePayload,
          idempotencyKey: `${CONTRACT}:${runId}:${target.contextKey}:invalid-zero-primary`,
          parameters: { ...fixture, [PRIMARY_PARAMETER_ID]: 0 },
        }),
      });
      const invalidJob = await waitForJob(authorization, String(invalidQueued.jobId));
      invariant(invalidJob.status === "failed"
        && invalidJob.errorCode === "PARAMETER_VALIDATION_FAILED"
        && invalidJob.resultRevisionId == null,
      `FAIL_CLOSED:${target.contextKey}:${JSON.stringify(invalidJob).slice(0, 2_000)}`);

      const history = await api(authorization,
        `revisions?catalogId=${encodeURIComponent(target.catalogId)}&limit=100`);
      const historyIds = (history.revisions as Json[]).map((revision) => String(revision.revisionId));
      invariant(historyIds.includes(String(initial.revision.revisionId))
        && historyIds.includes(String(editedRevision.revision.revisionId))
        && historyIds.indexOf(String(editedRevision.revision.revisionId))
          < historyIds.indexOf(String(initial.revision.revisionId)),
      `HISTORY:${target.contextKey}`);

      revisionIds.push(
        String(initial.revision.revisionId),
        String(editedRevision.revision.revisionId),
      );
      failedJobIds.push(String(invalidJob.jobId));
      targetResults.push({
        contextKey: target.contextKey,
        catalogId: target.catalogId,
        definitionVersionId,
        search: { exactMatchCount: 1, matchTier: searchItem.matchTier },
        catalog: { parameterCount: IS_ANCHOR ? 39 : 37, priceState: "PARTIAL_NEEDS_PRICE" },
        compile: {
          jobId: queued.jobId,
          revisionId: initial.revision.revisionId,
          revisionNumber: initial.revision.revisionNumber,
          ...original,
        },
        idempotencyReplay: { sameJobId: true, created: false },
        edit: {
          jobId: recalculatedQueued.jobId,
          parentRevisionId: initial.revision.revisionId,
          revisionId: editedRevision.revision.revisionId,
          revisionNumber: editedRevision.revision.revisionNumber,
          changedRowIds: changedRows,
          ...edited,
        },
        failClosed: {
          case: `${PRIMARY_PARAMETER_ID}_zero`,
          jobId: invalidJob.jobId,
          status: invalidJob.status,
          errorCode: invalidJob.errorCode,
          resultRevisionId: null,
        },
        history: { containsExactImmutableLineage: true },
      });
      progress("TARGET_GREEN", {
        contextKey: target.contextKey,
        rows: original.rowCount,
        procurementRows: original.procurementRowCount,
        primaryQuantity: original.primaryQuantity,
      });
    }

    invariant(targetResults.length === TARGETS.length
      && new Set(targetResults.map((target) => target.catalogId)).size === TARGETS.length
      && new Set(definitionIds).size === TARGETS.length, "TARGET_DENOMINATOR_RED");
    const database = await databaseProof(client, definitionIds, revisionIds, failedJobIds);
    const manifestAfter = await api(authorization, "runtime-manifest");
    invariant(manifestAfter.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && manifestAfter.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifestAfter.definitionRelease?.status === "prepared"
      && manifestAfter.searchRelease?.status === "draft"
      && Number(manifestAfter.activeCompileJobCount) === 0, "RUNTIME_AFTER_RED");

    const after = resourceSnapshot();
    const evidence = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      status: IS_ANCHOR
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
          : "GREEN_STRIP_FOUNDATION_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE",
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      runId,
      master: { path: MASTER, sha256: sha256(readFileSync(MASTER)) },
      source: {
        branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
        head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        productSha256: sha256(readFileSync(resolve(IS_ANCHOR
          ? "src/lib/estimate/v4/anchorGroupInstallationR1.ts"
          : IS_FORMWORK_REINFORCEMENT
            ? "src/lib/estimate/v4/formworkReinforcementR1.ts"
          : IS_JOINT_REINFORCEMENT
            ? "src/lib/estimate/v4/jointReinforcementR1.ts"
          : IS_BELT_REINFORCEMENT
            ? "src/lib/estimate/v4/beltReinforcementR1.ts"
          : IS_ANCHOR_GROUP_REINFORCEMENT
            ? "src/lib/estimate/v4/anchorGroupReinforcementR1.ts"
          : IS_COLUMN_BASE
            ? "src/lib/estimate/v4/columnBaseReinforcementR1.ts"
          : IS_REINFORCEMENT_FRAME_ASSEMBLY
            ? "src/lib/estimate/v4/reinforcementFrameReinforcementR1.ts"
          : IS_REINFORCEMENT_FRAME
            ? "src/lib/estimate/v4/reinforcementFrameReinforcementR1.ts"
          : IS_STAIRS
            ? "src/lib/estimate/v4/stairsReinforcementR1.ts"
          : IS_PEDESTAL
            ? "src/lib/estimate/v4/pedestalReinforcementR1.ts"
          : IS_PILE_CAP
            ? "src/lib/estimate/v4/pileCapReinforcementR1.ts"
          : IS_CONCRETE_SLAB
            ? "src/lib/estimate/v4/concreteSlabReinforcementR1.ts"
          : IS_SLAB_FOUNDATION
            ? "src/lib/estimate/v4/slabFoundationReinforcementR1.ts"
            : "src/lib/estimate/v4/stripFoundationReinforcementR1.ts"))),
        bindingSha256: sha256(readFileSync(resolve(
          IS_ANCHOR
            ? "src/lib/estimate/ownedDomain/anchorGroupInstallationProductionBindingR1.ts"
            : "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
        ))),
        runtimeSourceHead: manifest.sourceHead,
        runtimeSourceTree: manifest.sourceTree,
        backendRuntimeSourceSha256: manifest.runtimeSourceSha256,
      },
      runtime: {
        definitionReleaseId: RELEASE_ID,
        definitionReleaseStatus: database.release.status,
        definitionActivatedAt: database.release.activated_at ?? null,
        searchReleaseId: SEARCH_RELEASE_ID,
        searchReleaseStatus: database.search.status,
        searchActivatedAt: database.search.activated_at ?? null,
        providerMode: "local-only",
        backendOrigin: BACKEND,
      },
      denominator: {
        originalTargetCount: TARGETS.length,
        acceptedTargetCount: targetResults.length,
        blockedTargetCount: 0,
        compileRevisionCount: TARGETS.length,
        editRevisionCount: TARGETS.length,
        failClosedNegativeCount: TARGETS.length,
      },
      normativeSource: {
        sourceId: SOURCE_ID,
        normId: NORM_ID,
        sourceMetadata: SOURCE_METADATA,
        sourceRole: IS_ANCHOR ? "PROJECT_OR_ENGINEERING_INPUT" : "NORMATIVE_SOURCE",
        sameUnitRoutingOnly: !IS_ANCHOR,
        automaticKgPerM3Allowance: false,
      },
      targetResults,
      database: {
        persistedRevisionCount: database.revisions.length,
        failedJobCount: database.failedJobs.length,
        definitionCount: database.definitions.length,
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
