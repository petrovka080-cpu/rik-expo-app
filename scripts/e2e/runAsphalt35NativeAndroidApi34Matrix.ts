import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildAndroidDeepLinkLaunchArgs } from "./androidDeepLinkLaunchContract";
import {
  STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
  assessNoRevisionTransition,
  classifyGovernedMissingParameterKeys,
  findCompiledRevisionMarkerAcrossViewport,
  visibleCompiledRevisionIds,
  type CompiledRevisionExpectedIdentity,
  type CompiledRevisionIdentityEvidence,
  type CompiledRevisionViewportSearchResult,
  type CompiledRevisionViewportSnapshot,
} from "./asphaltCompiledRevisionViewport";
import {
  parseNativeEstimateBuildTimingEvidence,
  type NativeEstimateBuildTimingEvidence,
} from "./nativeEstimateBuildTimingEvidence";
import {
  findNativeNodeOwnedByExactWrapper,
  nativeBoundsAreContainedBy,
  nativeNodeSafeViewportAdjustment,
  nativeOptionalControlledInputIsEmpty,
} from "./nativeExactWrapperNodeSelection";
import { isAndroidRequestRouteSurfaceXml } from "../_shared/androidHarness";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  ROADWORKS_WAVE_A_PARAMETER_PRESENTATION,
  RoadworksWaveAProductionRegistry,
  compileRoadworksWaveAWork,
  type RoadworksWaveAParameterKey,
} from "../../src/lib/estimate/v4/roadworks";
import {
  ASPHALT_RELATED_PARAMETER_METADATA_V4,
  compileAsphaltRelatedProfessionalEstimateV4,
} from "../../src/lib/estimate/v4/asphalt/compileAsphaltRelatedProfessionalEstimateV4";
import { getAsphaltRelatedBaselineAssumptionV4 } from "../../src/lib/estimate/v4/asphalt/asphaltRelatedBaselineAssumptionsV4";
import { ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltRelatedThroughCoreV4";
import {
  ASPHALT_RELATED_EXTRA_PROFILES_V4,
  type AsphaltRelatedProfileV4,
} from "../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";
import {
  ASPHALT_WORK_SPECIFIC_PARAMETERS_V4,
  getAsphaltParameterV4,
} from "../../src/lib/estimate/v4/asphalt/asphaltWorkSpecificParameterSchemaV4";
import {
  ASPHALT_SURFACE_DRAINAGE_INPUTS,
  ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT,
  compileAsphaltSurfaceDrainageEstimate,
} from "../estimate/drainageBackendR4/asphaltSurfaceDrainageR1";

const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
const API_LEVEL = "34";
const UI_DUMP_DEVICE_PATH_PREFIX = "/sdcard/asphalt-native-api34";
let uiDumpSequence = 0;
const WAIT_POLL_MS = 1_200;
const DEFAULT_TIMEOUT_MS = 90_000;
const LOCAL_DEVELOPER_SUPABASE_PORT = 54_321;
const LOCAL_DEVELOPER_AUTH_BROKER_PORT = 54_329;
const LOCAL_DEVELOPER_CANONICAL_BACKEND_PORT = 8_765;
const LOCAL_DEVELOPER_WEB_ORIGIN = "http://localhost:8081";
const LOCAL_DEVELOPER_CANONICAL_BACKEND =
  `http://127.0.0.1:${LOCAL_DEVELOPER_CANONICAL_BACKEND_PORT}`;
const STOP_R9_EVIDENCE_COMPILED_REVISION_PNG_XML_PAIR_MISSING =
  "STOP_R9_EVIDENCE_COMPILED_REVISION_PNG_XML_PAIR_MISSING";
const STOP_R9_HARNESS_COMPILED_VIEWPORT_IME_NOT_DISMISSED =
  "STOP_R9_HARNESS_COMPILED_VIEWPORT_IME_NOT_DISMISSED";
const ASPHALT_DRAIN_LARGE_AREA_WORK_ID =
  "paving_roads_landscape_interior_asphalt_drain_large_area";

const ACTIVE_LINEAR_DRAINAGE_PARAMETERS = Object.freeze(
  ASPHALT_SURFACE_DRAINAGE_INPUTS.filter((parameter) =>
    Object.prototype.hasOwnProperty.call(
      ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT,
      parameter.parameterId,
    )
  ),
);

const DEFINED_DEFAULT_ROADWORKS_WAVE_A_INPUTS: Readonly<Record<string, string | number | boolean>> =
  (() => {
    const result: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(DEFAULT_ROADWORKS_WAVE_A_INPUTS)) {
      if (value !== undefined) result[key] = value;
    }
    return Object.freeze(result);
  })();

type CommandResult = {
  ok: boolean;
  output: string;
  status: number | null;
};

type Json = Record<string, any>;

type UiNode = {
  attrs: string;
  resourceId: string;
  contentDesc: string;
  text: string;
  bounds: string;
  packageName: string;
};

type NativeCaseResult = {
  terminal_status: "PASS" | "FAIL" | "BLOCKED";
  blocker_kind: "EXTERNAL_SOURCE_GAP" | null;
  blocked_source_parameter_keys: string[];
  preliminary_projection_visible: boolean;
  boq_name_assertion_status: "PASS" | "FAIL" | "NOT_RUN_SOURCE_BLOCKED";
  work_key: string;
  evidence_case_id: string;
  title: string;
  scope_profile: string;
  expected_p0: string[];
  observed_p0: string[];
  expected_boq_rows: number;
  observed_boq_rows: number | null;
  create: boolean;
  edit: boolean;
  cold_replay_pdf: boolean;
  exact_owner_visible: boolean;
  full_boq_visible: boolean;
  pdf_projection_visible: boolean;
  pdf_projection_mode: "native_webview" | "android_external_viewer" | null;
  pdf_exact_owner_visible: boolean;
  pdf_full_status_visible: boolean;
  pdf_full_boq_visible: boolean;
  missing_pdf_boq_row_names: string[];
  immutable_revision_visible: boolean;
  build_identity_evidence_ready: boolean;
  revision_before_edit: string | null;
  revision_after_edit: string | null;
  precreate_compiled_revision: NativeCompiledRevisionObservation | null;
  intermediate_compiled_revision: NativeCompiledRevisionObservation | null;
  create_compiled_revision: NativeCompiledRevisionObservation | null;
  edit_compiled_revision: NativeCompiledRevisionObservation | null;
  missing_boq_row_names: string[];
  screenshots: string[];
  ui_dumps: string[];
  failures: string[];
  duration_ms: number;
  phase_durations_ms: Record<string, number>;
  runtime_build_timing: NativeEstimateBuildTimingEvidence;
  case_start_isolation: NativeCaseIsolationEvidence;
  case_end_isolation: NativeCaseIsolationEvidence | null;
  phase_reached: "launch" | "p0" | "create" | "edit" | "cold_replay" | "pdf";
  row_delete_restore?: {
    row_id: string;
    before_revision_id: string;
    deleted_revision_id: string;
    restored_revision_id: string;
    row_counts: [number, number, number];
    delete_capture: { screenshot: string | null; uiDump: string | null };
    restore_capture: { screenshot: string | null; uiDump: string | null };
  };
  continuous_price_input?: {
    test_id: string;
    steps: { digit: string; value: string; focused: boolean; exact_test_id: boolean }[];
    committed_revision_id: string;
    capture: { screenshot: string | null; uiDump: string | null };
  };
  priced_revision_id?: string;
};

type NativeCompiledRevisionObservation = CompiledRevisionIdentityEvidence & {
  marker_recovery_swipes: number;
  viewport_fingerprints: string[];
  before_xml: string;
  final_xml: string;
  viewport_artifacts: NativeCompiledViewportArtifact[];
};

type NativeCompiledViewportArtifact = {
  boundary: "before" | "pending_poll" | "anchor_recovery" | "after_scroll" | "final";
  step: number;
  xml: string;
  png: string | null;
};

type NativeCaseIsolationEvidence = {
  phase: "before_case" | "after_pdf";
  pdf_viewer_returned: boolean;
  internal_pdf_route_was_open: boolean;
  internal_pdf_route_closed: boolean;
  history_modal_was_open: boolean;
  history_modal_closed: boolean;
  neutral_route_visible: boolean;
  blocking_modal_present: boolean;
  data_wipes: 0;
  failures: string[];
};

type CliOptions = {
  runId: string;
  diagnosticWorkKey: string | null;
  diagnosticWorkCount: number | null;
  diagnosticStartIndex: number;
  expectedCommit: string;
  expectedTree: string;
  devServerPort: number | null;
  allowDirtyDiagnostic: boolean;
  clearAppData: boolean;
  forceDevReload: boolean;
  matrixScope: "old35" | "extra9" | "all44";
  r9Diagnostic: boolean;
  activeOwnerPath: string | null;
};

type NativeMatrixRegistration = {
  workId: string;
  professionalNameRu: string;
  scopeProfile: string;
  parameterDefinitions: readonly {
    key: string;
    tier: string;
    sourceRole?: string;
    sourceFixedBinding?: unknown;
  }[];
  requestedCatalogRecordId: string | null;
  extraProfile: AsphaltRelatedProfileV4 | null;
  inputValues: Readonly<Record<string, string | number | boolean>>;
  editParameterKey: string;
  editParameterValue: string;
  scopeOptionTestId: string | null;
  dependentParameterKeys: readonly string[];
  evidenceCaseId: string;
};

const ASPHALT_RELATED_NATIVE_INPUTS: Readonly<Record<string, string | number | boolean>> = Object.freeze({
  area_m2: 120,
  geometry_method: "direct_area",
  length_m: 12,
  width_m: 10,
  exclusions_m2: 0,
  purpose: "public_road",
  traffic_load_category: "medium",
  construction_mode: "new_construction",
  removal_area_m2: 120,
  removal_depth_mm: 50,
  removal_method: "MECHANICAL_BREAKOUT",
  removal_extent: "FULL",
  existing_asphalt_density_t_m3: 2.35,
  haul_required: false,
  material_destination: "RECYCLING",
  wearing_layer_thickness_mm: 50,
  binder_layer_thickness_mm: 60,
  asphalt_density_t_m3: 2.35,
  prepared_base_confirmed: true,
  bridge_deck_system_confirmed: true,
  traffic_class_confirmed: true,
});

const BRIDGE_ASPHALT_NATIVE_INPUTS: Readonly<Record<string, string | number | boolean>> = Object.freeze({
  area_m2: 6_400,
  geometry_method: "rectangle",
  length_m: 200,
  width_m: 32,
  // Keep the real Android edit walk in the published parameter-schema order.
  // Object key order is the deterministic UI sequence below; bouncing between
  // distant cards adds minutes of UiAutomator scrolling without testing a new
  // product invariant.
  bridge_deck_system_confirmed: true,
  waterproofing_condition: "ACCEPTED",
  wearing_layer_thickness_mm: 50,
  asphalt_density_t_m3: 2.35,
  binder_layer_thickness_mm: 60,
  asphalt_waste_percent: 3,
  base_emulsion_rate_l_m2: 0.3,
  emulsion_rate_l_m2: 0.3,
  surface_cleaner_productivity_m2_per_machine_hour: 500,
  bitumen_distributor_productivity_m2_per_machine_hour: 800,
  paver_productivity_m2_per_machine_hour: 300,
  roller_productivity_m2_per_machine_hour: 250,
  pneumatic_roller_productivity_m2_per_machine_hour: 250,
  road_worker_productivity_m2_per_man_hour: 25,
  asphalt_plant_distance_km: 10,
  truck_payload_t: 20,
  truck_average_speed_km_per_machine_hour: 40,
  truck_turnaround_machine_hours: 0.5,
  incoming_control_interval_m2_per_test: 1_000,
  compaction_control_interval_m2_per_test: 1_000,
  core_sampling_interval_m2_per_test: 1_000,
  laboratory_test_interval_m2_per_test: 1_000,
  temperature_control_trips_per_test: 5,
  smoothness_control_interval_m2_per_test: 1_000,
  thickness_control_interval_m2_per_test: 1_000,
  laboratory_protocol_count: 1,
  executive_survey_service_count: 1,
  execution_documentation_count: 1,
});

function roadworksNativeRegistration(
  registration: typeof RoadworksWaveAProductionRegistry[number],
): NativeMatrixRegistration {
  const currentDrainageOwner = registration.workId === ASPHALT_DRAIN_LARGE_AREA_WORK_ID;
  return {
    ...registration,
    // The owner matrix validates an already-known published catalog identity.
    // Pass that identity through the public request-route contract just as the
    // extra nine registrations do; prompt-only auto-resolution is intentionally
    // fail-closed and belongs to the separate native search golden path.
    requestedCatalogRecordId: `canonical-work:base:${registration.workId}`,
    extraProfile: null,
    parameterDefinitions: currentDrainageOwner
      ? ACTIVE_LINEAR_DRAINAGE_PARAMETERS.map((parameter) => ({
        key: parameter.parameterId,
        tier: "P0",
        sourceRole: parameter.sourceRole === "PROJECT_DOCUMENTATION"
          ? "USER_PROJECT_INPUT"
          : "TECHNICAL_SOURCE_INPUT",
      }))
      : registration.parameterDefinitions,
    inputValues: currentDrainageOwner
      ? ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT
      : DEFINED_DEFAULT_ROADWORKS_WAVE_A_INPUTS,
    editParameterKey: "area_m2",
    editParameterValue: "137",
    scopeOptionTestId: null,
    dependentParameterKeys: currentDrainageOwner
      ? ACTIVE_LINEAR_DRAINAGE_PARAMETERS
        .filter((parameter) =>
          parameter.sourceRole === "PROJECT_DOCUMENTATION"
          && parameter.requiredWhen != null
        )
        .map((parameter) => parameter.parameterId)
      : [],
    evidenceCaseId: registration.workId,
  };
}

function extraNativeRegistration(
  profile: AsphaltRelatedProfileV4,
  overrides: Partial<Pick<NativeMatrixRegistration,
    "scopeOptionTestId" | "dependentParameterKeys" | "evidenceCaseId" | "inputValues"
      | "editParameterKey" | "editParameterValue"
  >> = {},
): NativeMatrixRegistration {
  const removalArea = profile.requiredParameters.includes("removal_area_m2");
  return {
    workId: profile.canonicalWorkKey,
    professionalNameRu: profile.professionalNameRu,
    scopeProfile: profile.operationClass,
    parameterDefinitions: profile.requiredParameters
      .filter((key) => key !== (removalArea ? "removal_area_m2" : "area_m2"))
      .map((key) => ({ key, tier: "P0" })),
    // The V4 profile keeps the source template identity for oracle ownership,
    // while the backend catalog endpoint is keyed by the published envelope.
    // Preserve the public identity through the native request route.
    requestedCatalogRecordId: `canonical-work:expanded:${profile.canonicalWorkKey}`,
    extraProfile: profile,
    inputValues: overrides.inputValues ?? (
      profile.canonicalWorkKey === "bridge_asphalt"
        ? BRIDGE_ASPHALT_NATIVE_INPUTS
        : ASPHALT_RELATED_NATIVE_INPUTS
    ),
    editParameterKey: overrides.editParameterKey ?? (
      profile.canonicalWorkKey === "bridge_asphalt"
        ? "wearing_layer_thickness_mm"
        : removalArea ? "removal_area_m2" : "area_m2"
    ),
    editParameterValue: overrides.editParameterValue ?? (
      profile.canonicalWorkKey === "bridge_asphalt" ? "55" : "137"
    ),
    scopeOptionTestId: overrides.scopeOptionTestId ?? (
      profile.canonicalWorkKey === "asphalt_concrete_pavement"
        ? "road-scope-option-full_pavement_structure"
        : null
    ),
    dependentParameterKeys: overrides.dependentParameterKeys ?? [],
    evidenceCaseId: overrides.evidenceCaseId ?? profile.canonicalWorkKey,
  };
}

const ROADWORKS_NATIVE_REGISTRY = Object.freeze(
  RoadworksWaveAProductionRegistry.map(roadworksNativeRegistration),
);
const ASPHALT_RELATED_EXTRA_NATIVE_REGISTRY = Object.freeze(
  ASPHALT_RELATED_EXTRA_PROFILES_V4.map((profile) => extraNativeRegistration(profile)),
);

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  }).trim();
}

function adbPath(): string {
  const sdkRoot = process.env.ANDROID_SDK_ROOT
    ?? process.env.ANDROID_HOME
    ?? path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
  return path.join(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
}

function run(command: string, args: string[], timeoutMs = 20_000): CommandResult {
  try {
    const output = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });
    return { ok: true, output, status: 0 };
  } catch (error) {
    const record = error as {
      status?: number;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      message?: string;
    };
    return {
      ok: false,
      output: `${String(record.stdout ?? "")}${String(record.stderr ?? "")}${record.message ?? ""}`.trim(),
      status: typeof record.status === "number" ? record.status : null,
    };
  }
}

function adb(args: string[], timeoutMs = 20_000): CommandResult {
  return run(adbPath(), ["-s", DEVICE_ID, ...args], timeoutMs);
}

function adbBuffer(args: string[], timeoutMs = 30_000): Buffer | null {
  try {
    return execFileSync(adbPath(), ["-s", DEVICE_ID, ...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function replaceEvidenceFileAtomically(temporaryPath: string, targetPath: string): void {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      fs.renameSync(temporaryPath, targetPath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!code || !["EPERM", "EACCES", "EBUSY"].includes(code) || attempt === 39) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function attr(attrs: string, name: string): string {
  const match = attrs.match(new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`));
  return decodeXml(match?.[2] ?? "");
}

function parseNodes(xml: string): UiNode[] {
  return Array.from(xml.matchAll(/<node\b([^>]*?)\/?>(?:<\/node>)?/g)).map((match) => {
    const attrs = match[1] ?? "";
    return {
      attrs,
      resourceId: attr(attrs, "resource-id"),
      contentDesc: attr(attrs, "content-desc"),
      text: attr(attrs, "text"),
      bounds: attr(attrs, "bounds"),
      packageName: attr(attrs, "package"),
    };
  });
}

type PdfProjectionProbe = {
  snapshot: ReturnType<typeof dumpUi>;
  mode: NativeCaseResult["pdf_projection_mode"];
  fileName: string | null;
};

async function waitForPdfProjection(timeoutMs = 90_000): Promise<PdfProjectionProbe> {
  const deadline = Date.now() + timeoutMs;
  let last = dumpUi();
  while (Date.now() <= deadline) {
    last = dumpUi();
    if (findNodeById(last, "native-pdf-webview")) {
      return { snapshot: last, mode: "native_webview", fileName: null };
    }
    const externalPdfNode = last.nodes.find((node) =>
      node.packageName !== PACKAGE_NAME && /\.pdf$/i.test(node.text.trim())
    );
    if (externalPdfNode) {
      return {
        snapshot: last,
        mode: "android_external_viewer",
        fileName: path.posix.basename(externalPdfNode.text.trim()),
      };
    }
    await wait(WAIT_POLL_MS);
  }
  return { snapshot: last, mode: null, fileName: null };
}

function latestGeneratedPdfFileName(): string | null {
  const listed = adb([
    "shell",
    "run-as",
    PACKAGE_NAME,
    "sh",
    "-c",
    "ls -t cache/generated-pdfs/*.pdf 2>/dev/null | head -n 1",
  ], 20_000);
  const file = listed.ok ? listed.output.trim().split(/\r?\n/)[0] : "";
  return file ? path.posix.basename(file) : null;
}

async function extractGeneratedPdfText(fileName: string | null): Promise<string | null> {
  const safeFileName = path.posix.basename(fileName ?? latestGeneratedPdfFileName() ?? "");
  if (!safeFileName || !safeFileName.toLocaleLowerCase("en-US").endsWith(".pdf")) return null;
  // A PDF handed to Android's external viewer is materialized directly under
  // `cache/` (`pdf_instant_*`); generated internal-viewer assets live under
  // `cache/generated-pdfs/`. Reading the external file from the latter path
  // returns the shell error text, which pdf.js correctly rejects as invalid.
  const candidatePaths = [
    `cache/${safeFileName}`,
    `cache/generated-pdfs/${safeFileName}`,
  ];
  let pdfBytes: Buffer | null = null;
  for (const candidatePath of candidatePaths) {
    const candidateBytes = adbBuffer([
      "exec-out",
      "run-as",
      PACKAGE_NAME,
      "cat",
      candidatePath,
    ]);
    if (
      candidateBytes
      && candidateBytes.subarray(0, 5).toString("ascii") === "%PDF-"
      && candidateBytes.subarray(Math.max(0, candidateBytes.length - 2_048)).includes(Buffer.from("%%EOF"))
    ) {
      pdfBytes = candidateBytes;
      break;
    }
  }
  if (!pdfBytes) return null;
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  let document: Awaited<ReturnType<typeof getDocument>["promise"]> | null = null;
  const pages: string[] = [];
  try {
    document = await getDocument({
      data: new Uint8Array(pdfBytes),
    }).promise;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
  } catch {
    return null;
  } finally {
    if (document) await document.destroy();
  }
  return pages.join("\n").replace(/\s+/g, " ").trim();
}

function dumpUi(): { ok: boolean; xml: string; nodes: UiNode[]; text: string; error: string | null } {
  let lastError = "";
  for (let dumpAttempt = 0; dumpAttempt < 2; dumpAttempt += 1) {
    uiDumpSequence += 1;
    const uiDumpDevicePath = `${UI_DUMP_DEVICE_PATH_PREFIX}-${process.pid}-${uiDumpSequence}.xml`;
    const dumped = adb(["shell", "timeout", "12", "uiautomator", "dump", "--compressed", uiDumpDevicePath], 16_000);
    let read = dumped.ok ? adb(["exec-out", "cat", uiDumpDevicePath], 20_000) : null;
    for (
      let readAttempt = 0;
      dumped.ok && (!read?.ok || !read.output.includes("<hierarchy")) && readAttempt < 20;
      readAttempt += 1
    ) {
      // A successful UiAutomator command can return before its device-side XML
      // becomes readable. Keep the exact snapshot boundary for five bounded
      // seconds and never fingerprint transient `cat` error text.
      adb(["shell", "sleep", "0.25"], 5_000);
      read = adb(["exec-out", "cat", uiDumpDevicePath], 20_000);
    }
    adb(["shell", "rm", "-f", uiDumpDevicePath], 5_000);
    if (read?.ok && read.output.includes("<hierarchy")) {
      const nodes = parseNodes(read.output);
      const text = nodes.flatMap((node) => [node.resourceId, node.contentDesc, node.text]).filter(Boolean).join("\n");
      return { ok: true, xml: read.output, nodes, text, error: null };
    }
    lastError = read?.output || dumped.output;
  }
  return { ok: false, xml: "", nodes: [], text: "", error: lastError };
}

function nodeHasId(node: UiNode, testId: string): boolean {
  return node.resourceId === testId
    || node.resourceId.endsWith(`:id/${testId}`)
    || node.resourceId.endsWith(`/${testId}`)
    || node.contentDesc === testId;
}

function findNodeById(snapshot: ReturnType<typeof dumpUi>, testId: string): UiNode | null {
  return snapshot.nodes.find((node) => nodeHasId(node, testId)) ?? null;
}

function center(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  return {
    x: Math.round((Number(match[1]) + Number(match[3])) / 2),
    y: Math.round((Number(match[2]) + Number(match[4])) / 2),
  };
}

function boundsRect(bounds: string): { left: number; top: number; right: number; bottom: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  return {
    left: Number(match[1]),
    top: Number(match[2]),
    right: Number(match[3]),
    bottom: Number(match[4]),
  };
}

function findInputOwnedByEditor(
  snapshot: ReturnType<typeof dumpUi>,
  editor: UiNode,
): UiNode | null {
  return findNativeNodeOwnedByExactWrapper(
    snapshot.nodes,
    editor,
    (node) => nodeHasId(node, "editable-param-popover-input"),
  );
}

async function findSafeInputOwnedByExactEditor(
  editorId: string,
): Promise<{ snapshot: ReturnType<typeof dumpUi>; editor: UiNode; input: UiNode } | null> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const lookup = await scrollToId(editorId, 20);
    if (!lookup.node) continue;
    const input = findInputOwnedByEditor(lookup.snapshot, lookup.node);
    if (!input) {
      // React Native may expose the exact editor wrapper before mounting its
      // clipped native TextInput below the sticky action bar. Move the exact
      // wrapper into the safe viewport, then reacquire its owned child; never
      // fall back to a generic EditText from another parameter or BOQ row.
      const editorAdjustment = nativeNodeSafeViewportAdjustment(
        lookup.node.bounds,
        viewport().height,
      );
      if (editorAdjustment === "invalid") return null;
      if (editorAdjustment !== "none") swipe(editorAdjustment);
      await wait(600);
      continue;
    }
    const adjustment = nativeNodeSafeViewportAdjustment(
      input.bounds,
      viewport().height,
    );
    if (adjustment === "none") {
      return { snapshot: lookup.snapshot, editor: lookup.node, input };
    }
    if (adjustment === "invalid") return null;
    swipe(adjustment);
    await wait(600);
  }
  return null;
}

function findOptionOwnedByEditor(
  snapshot: ReturnType<typeof dumpUi>,
  editor: UiNode,
  optionId: string,
): UiNode | null {
  return findNativeNodeOwnedByExactWrapper(
    snapshot.nodes,
    editor,
    (node) => nodeHasId(node, optionId),
  );
}

async function findSafeOptionOwnedByExactEditor(
  editorId: string,
  optionId: string,
): Promise<{ snapshot: ReturnType<typeof dumpUi>; editor: UiNode; option: UiNode } | null> {
  let snapshot = dumpUi();
  let direction: "up" | "down" = "up";
  let previousFingerprint = "";
  let stableBoundaryCount = 0;
  let swipesInDirection = 0;
  for (let step = 0; step < 72; step += 1) {
    const editor = findNodeById(snapshot, editorId);
    const option = editor ? findOptionOwnedByEditor(snapshot, editor, optionId) : null;
    if (editor && option) {
      const adjustment = nativeNodeSafeViewportAdjustment(option.bounds, viewport().height);
      if (adjustment === "none") return { snapshot, editor, option };
      if (adjustment === "invalid") return null;
      if (!await swipeFine(snapshot, adjustment)) return null;
      await wait(450);
      snapshot = dumpUi();
      continue;
    }

    // Enum editors are short enough that the regular 30%/50% viewport swipe
    // can jump over the entire exact wrapper between two UiAutomator dumps.
    // Search in fine increments, reverse only at a proven boundary and still
    // require the option to be contained by the exact parameter editor.
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint
      ? stableBoundaryCount + 1
      : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2 || swipesInDirection >= 36) {
      direction = direction === "up" ? "down" : "up";
      stableBoundaryCount = 0;
      swipesInDirection = 0;
    }
    if (!await swipeFine(snapshot, direction)) return null;
    swipesInDirection += 1;
    await wait(450);
    snapshot = dumpUi();
  }
  return null;
}

async function focusInputOwnedByExactEditor(editorId: string): Promise<boolean> {
  const owned = await findSafeInputOwnedByExactEditor(editorId);
  if (!owned) return false;
  // The long parameter panel can rerender between safe-bounds recovery and
  // the tap. Settle, reacquire the same exact wrapper and only then focus its
  // contained TextInput; never type into a previously focused delivery field.
  await wait(500);
  const stableSnapshot = dumpUi();
  const stableEditor = findNodeById(stableSnapshot, editorId);
  const stableInput = stableEditor
    ? findInputOwnedByEditor(stableSnapshot, stableEditor)
    : null;
  if (
    !stableInput
    || nativeNodeSafeViewportAdjustment(stableInput.bounds, viewport().height) !== "none"
    || !tapNode(stableInput)
  ) return false;
  await wait(300);
  const focusedSnapshot = dumpUi();
  const focusedEditor = findNodeById(focusedSnapshot, editorId);
  const focusedInput = focusedEditor
    ? findInputOwnedByEditor(focusedSnapshot, focusedEditor)
    : null;
  return Boolean(focusedInput?.attrs.includes('focused="true"'));
}

function tapNode(node: UiNode): boolean {
  const point = center(node.bounds);
  return Boolean(point && adb(["shell", "input", "tap", String(point.x), String(point.y)], 10_000).ok);
}

function viewport(): { width: number; height: number } {
  const size = adb(["shell", "wm", "size"], 10_000);
  const match = size.output.match(/Override size:\s*(\d+)x(\d+)/i)
    ?? size.output.match(/Physical size:\s*(\d+)x(\d+)/i);
  return { width: Number(match?.[1] ?? 1080), height: Number(match?.[2] ?? 2400) };
}

function swipe(direction: "up" | "down", long = false): void {
  const { width, height } = viewport();
  const x = Math.round(width * 0.5);
  const top = Math.round(height * (long ? 0.22 : 0.32));
  const bottom = Math.round(height * (long ? 0.72 : 0.62));
  const [startY, endY] = direction === "up" ? [bottom, top] : [top, bottom];
  adb(["shell", "input", "swipe", String(x), String(startY), String(x), String(endY), "420"], 10_000);
}

function swipeFine(
  snapshot: ReturnType<typeof dumpUi>,
  direction: "up" | "down",
): Promise<boolean> {
  return scrollKnownRequestContainer(snapshot, direction, true);
}

async function scrollToId(testId: string, maxSwipes = 18): Promise<{ snapshot: ReturnType<typeof dumpUi>; node: UiNode | null }> {
  let snapshot = dumpUi();
  let node = findNodeById(snapshot, testId);
  if (node) return { snapshot, node };
  let previousFingerprint = sha256(snapshot.xml);
  let stableBoundaryCount = 0;
  for (let index = 0; index < maxSwipes; index += 1) {
    swipe("up", index % 4 === 3);
    await wait(450);
    snapshot = dumpUi();
    node = findNodeById(snapshot, testId);
    if (node) return { snapshot, node };
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint ? stableBoundaryCount + 1 : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2) break;
  }
  previousFingerprint = sha256(snapshot.xml);
  stableBoundaryCount = 0;
  for (let index = 0; index < maxSwipes; index += 1) {
    swipe("down", index % 4 === 3);
    await wait(450);
    snapshot = dumpUi();
    node = findNodeById(snapshot, testId);
    if (node) return { snapshot, node };
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint ? stableBoundaryCount + 1 : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2) break;
  }
  return { snapshot, node: null };
}

function findApprovedHistoryEntryByExactTitle(
  snapshot: ReturnType<typeof dumpUi>,
  expectedTitle: string,
  expectedRevisionId?: string | null,
): { row: UiNode; main: UiNode } | null {
  for (const row of snapshot.nodes.filter((node) => nodeHasId(node, "consumer-repair-history-row"))) {
    const owned = snapshot.nodes.filter((node) => nativeBoundsAreContainedBy(node.bounds, row.bounds));
    const exactTitle = owned.find((node) => node.text === expectedTitle);
    const approvedStatus = owned.find((node) => /^Статус:\s*утверждена(?:\s|·|$)/u.test(node.text));
    const exactRevision = !expectedRevisionId || owned.some((node) =>
      nodeHasId(node, `consumer-repair-history-revision-${expectedRevisionId}`)
    );
    const main = owned.find((node) => nodeHasId(node, "consumer-repair-history-main"));
    if (
      exactTitle
      && approvedStatus
      && exactRevision
      && main
      && nativeBoundsAreContainedBy(exactTitle.bounds, main.bounds)
    ) return { row, main };
  }
  return null;
}

async function tapApprovedHistoryEntryByExactTitle(
  expectedTitle: string,
  expectedRevisionId?: string | null,
  maxSwipes = 20,
  timeoutMs = 180_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let direction: "up" | "down" = "up";
  let swipesInDirection = 0;
  let previousFingerprint = "";
  let stableBoundaryCount = 0;
  while (Date.now() < deadline) {
    const snapshot = dumpUi();
    const exactHistoryMain = findApprovedHistoryEntryByExactTitle(snapshot, expectedTitle, expectedRevisionId)?.main ?? null;
    if (exactHistoryMain) {
      const adjustment = nativeNodeSafeViewportAdjustment(
        exactHistoryMain.bounds,
        viewport().height,
        0.2,
        0.82,
      );
      if (adjustment === "none") return tapNode(exactHistoryMain);
      if (adjustment === "invalid") return false;
      swipe(adjustment);
      await wait(600);
      continue;
    }

    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint
      ? stableBoundaryCount + 1
      : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2 || swipesInDirection >= maxSwipes) {
      direction = direction === "up" ? "down" : "up";
      swipesInDirection = 0;
      stableBoundaryCount = 0;
      await wait(1_500);
      continue;
    }
    swipe(direction, swipesInDirection % 4 === 3);
    swipesInDirection += 1;
    await wait(600);
  }
  return false;
}

async function findSelectedHistoryInlinePdfAction(
  expectedTitle: string,
  expectedRevisionId?: string | null,
  maxSwipes = 72,
): Promise<UiNode | null> {
  let previousFingerprint = "";
  let stableBoundaryCount = 0;
  for (let step = 0; step <= maxSwipes; step += 1) {
    const snapshot = dumpUi();
    const readonlySnapshot = findNodeById(snapshot, "consumer-repair-history-readonly-snapshot");
    const approvedEntry = readonlySnapshot
      ? findApprovedHistoryEntryByExactTitle(snapshot, expectedTitle, expectedRevisionId)
      : null;
    const exactHistoryRow = approvedEntry?.row ?? null;
    const node = exactHistoryRow
      ? findNativeNodeOwnedByExactWrapper(
        snapshot.nodes,
        exactHistoryRow,
        (candidate) => nodeHasId(candidate, "consumer-repair-history-pdf"),
      )
      : null;
    if (node) {
      const adjustment = nativeNodeSafeViewportAdjustment(
        node.bounds,
        viewport().height,
        0.2,
        0.82,
      );
      if (adjustment === "none") return node;
      if (adjustment === "invalid") return null;
      swipe(adjustment);
      await wait(600);
      continue;
    }

    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint
      ? stableBoundaryCount + 1
      : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2) return null;
    swipe("down", step % 4 === 3);
    await wait(450);
  }
  return null;
}

async function returnToTop(swipes = 16): Promise<void> {
  for (let index = 0; index < swipes; index += 1) {
    swipe("down", index % 4 === 3);
    await wait(180);
  }
}

function pdfProjectionVisibleIn(snapshot: ReturnType<typeof dumpUi>): boolean {
  return Boolean(
    findNodeById(snapshot, "native-pdf-webview")
    || findNodeById(snapshot, "native-pdf-handoff-shell")
    || snapshot.nodes.some((node) => node.packageName !== PACKAGE_NAME && /\.pdf$/i.test(node.text.trim())),
  );
}

function neutralConsumerRepairRouteVisibleIn(snapshot: ReturnType<typeof dumpUi>): boolean {
  return Boolean(findNodeById(snapshot, "consumer-repair-screen"))
    || isAndroidRequestRouteSurfaceXml(snapshot.xml);
}

function externalViewerAnrCloseNode(snapshot: ReturnType<typeof dumpUi>): UiNode | null {
  const externalAnrTitle = snapshot.nodes.find((node) =>
    nodeHasId(node, "android:id/alertTitle")
    && /isn't responding$/i.test(node.text.trim())
  );
  if (!externalAnrTitle) return null;
  return snapshot.nodes.find((node) =>
    node.packageName === "android"
    && nodeHasId(node, "android:id/aerr_close")
    && /^Close app$/i.test(node.text.trim())
  ) ?? null;
}

async function waitForKnownCaseBoundarySurface(timeoutMs = 30_000): Promise<ReturnType<typeof dumpUi>> {
  const deadline = Date.now() + timeoutMs;
  let snapshot = dumpUi();
  while (Date.now() < deadline) {
    if (
      neutralConsumerRepairRouteVisibleIn(snapshot)
      || findNodeById(snapshot, "consumer-repair-history-modal")
      || findNodeById(snapshot, "native-pdf-handoff-shell")
      || externalViewerAnrCloseNode(snapshot)
    ) {
      return snapshot;
    }
    await wait(WAIT_POLL_MS);
    snapshot = dumpUi();
  }
  return snapshot;
}

async function pressSystemBackAndWaitForIdAbsent(
  testId: string,
  timeoutMs = 20_000,
): Promise<{ sent: boolean; closed: boolean; snapshot: ReturnType<typeof dumpUi> }> {
  const sent = adb(["shell", "input", "keyevent", "4"], 10_000).ok;
  let snapshot = dumpUi();
  if (!sent) return { sent, closed: false, snapshot };
  const deadline = Date.now() + timeoutMs;
  do {
    await wait(500);
    snapshot = dumpUi();
    if (snapshot.ok !== false && !findNodeById(snapshot, testId)) {
      return { sent, closed: true, snapshot };
    }
  } while (Date.now() < deadline);
  return { sent, closed: false, snapshot };
}

async function restoreNativeCaseIsolation(
  phase: NativeCaseIsolationEvidence["phase"],
  expectedPdfProjection: NativeCaseResult["pdf_projection_mode"] = null,
): Promise<NativeCaseIsolationEvidence> {
  const failures: string[] = [];
  let snapshot = dumpUi();
  const pdfViewerWasOpen = expectedPdfProjection != null || pdfProjectionVisibleIn(snapshot);
  let pdfViewerReturned = false;
  if (pdfViewerWasOpen) {
    const returned = adb(["shell", "input", "keyevent", "4"], 10_000);
    pdfViewerReturned = returned.ok;
    if (!returned.ok) failures.push(`${phase}_pdf_viewer_return_failed`);
    await wait(800);
    snapshot = await waitForKnownCaseBoundarySurface();
  }

  const externalViewerAnrClose = expectedPdfProjection === "android_external_viewer"
    ? externalViewerAnrCloseNode(snapshot)
    : null;
  if (externalViewerAnrClose) {
    if (!tapNode(externalViewerAnrClose)) {
      failures.push(`${phase}_external_viewer_anr_close_failed`);
    } else {
      await wait(1_500);
      snapshot = await waitForKnownCaseBoundarySurface();
    }
  }

  const internalPdfRouteWasOpen = Boolean(findNodeById(snapshot, "native-pdf-handoff-shell"));
  let internalPdfRouteClosed = !internalPdfRouteWasOpen;
  if (internalPdfRouteWasOpen) {
    if (expectedPdfProjection === "android_external_viewer") {
      const closed = await pressSystemBackAndWaitForIdAbsent("native-pdf-handoff-shell");
      snapshot = closed.snapshot;
      internalPdfRouteClosed = closed.closed;
      if (!closed.sent) failures.push(`${phase}_internal_pdf_route_close_failed`);
      else if (!closed.closed) failures.push(`${phase}_internal_pdf_route_remained_open`);
    } else {
      const backNode = findNodeById(snapshot, "pdf-viewer-back");
      if (!backNode || !tapNode(backNode)) {
        failures.push(`${phase}_internal_pdf_route_close_failed`);
      } else {
        snapshot = await waitForKnownCaseBoundarySurface();
        internalPdfRouteClosed = !findNodeById(snapshot, "native-pdf-handoff-shell");
        if (!internalPdfRouteClosed) failures.push(`${phase}_internal_pdf_route_remained_open`);
      }
    }
  }

  const historyModalWasOpen = Boolean(findNodeById(snapshot, "consumer-repair-history-modal"));
  let historyModalClosed = !historyModalWasOpen;
  if (historyModalWasOpen) {
    if (expectedPdfProjection === "android_external_viewer") {
      const closed = await pressSystemBackAndWaitForIdAbsent("consumer-repair-history-modal");
      snapshot = closed.snapshot;
      historyModalClosed = closed.closed;
      if (!closed.sent) failures.push(`${phase}_history_modal_close_failed`);
      else if (!closed.closed) failures.push(`${phase}_history_modal_remained_open`);
    } else {
      const closeNode = findNodeById(snapshot, "consumer-repair-history-close");
      if (!closeNode || !tapNode(closeNode)) {
        failures.push(`${phase}_history_modal_close_failed`);
      } else {
        const deadline = Date.now() + 20_000;
        do {
          await wait(500);
          snapshot = dumpUi();
          historyModalClosed = !findNodeById(snapshot, "consumer-repair-history-modal");
        } while (!historyModalClosed && Date.now() < deadline);
        if (!historyModalClosed) failures.push(`${phase}_history_modal_remained_open`);
      }
    }
  }

  snapshot = dumpUi();
  const blockingModalPresent = Boolean(findNodeById(snapshot, "consumer-repair-history-modal"))
    || pdfProjectionVisibleIn(snapshot);
  const neutralRouteVisible = neutralConsumerRepairRouteVisibleIn(snapshot);
  if (blockingModalPresent) failures.push(`${phase}_blocking_modal_present`);
  if (!neutralRouteVisible) failures.push(`${phase}_neutral_consumer_repair_route_missing`);

  return {
    phase,
    pdf_viewer_returned: pdfViewerReturned,
    internal_pdf_route_was_open: internalPdfRouteWasOpen,
    internal_pdf_route_closed: internalPdfRouteClosed,
    history_modal_was_open: historyModalWasOpen,
    history_modal_closed: historyModalClosed,
    neutral_route_visible: neutralRouteVisible,
    blocking_modal_present: blockingModalPresent,
    data_wipes: 0,
    failures,
  };
}

async function discardIncompleteDiagnosticDraftIfPresent(): Promise<boolean> {
  let snapshot = dumpUi();
  if (!findNodeById(snapshot, "consumer-estimate-initial-revision-recovery")) return true;
  const deleteDraft = findNodeById(snapshot, "consumer-repair-delete-draft");
  if (!deleteDraft || !tapNode(deleteDraft)) return false;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await wait(750);
    snapshot = dumpUi();
    if (
      findNodeById(snapshot, "consumer-repair-screen")
      && !findNodeById(snapshot, "consumer-estimate-initial-revision-recovery")
    ) return true;
  }
  return false;
}

async function findSafeNodeById(
  testId: string,
  maxSwipes = 18,
  safeTopFraction = 0.2,
  safeBottomFraction = 0.62,
): Promise<UiNode | null> {
  let found = await scrollToId(testId, maxSwipes);
  let node = found.node;
  if (!node) return null;
  const { height } = viewport();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const adjustment = nativeNodeSafeViewportAdjustment(
      node.bounds,
      height,
      safeTopFraction,
      safeBottomFraction,
    );
    if (adjustment === "none") return node;
    if (adjustment === "invalid") return null;
    swipe(adjustment);
    await wait(600);
    const snapshot = dumpUi();
    const moved = findNodeById(snapshot, testId);
    if (!moved) {
      const reacquired = await scrollToId(testId, 4);
      if (!reacquired.node) return null;
      found = reacquired;
      node = reacquired.node;
      continue;
    }
    found = { snapshot, node: moved };
    node = moved;
  }
  return null;
}

async function tapById(
  testId: string,
  maxSwipes = 18,
  safeTopFraction = 0.2,
  safeBottomFraction = 0.62,
): Promise<boolean> {
  const node = await findSafeNodeById(testId, maxSwipes, safeTopFraction, safeBottomFraction);
  return Boolean(node && tapNode(node));
}

async function waitForId(testId: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ReturnType<typeof dumpUi>> {
  const deadline = Date.now() + timeoutMs;
  let last = dumpUi();
  while (Date.now() < deadline) {
    if (findNodeById(last, testId)) return last;
    if (/isn't responding|is not responding|Application Not Responding/i.test(last.text)) {
      const waitNode = last.nodes.find((node) => /\bWait\b/i.test(node.text) || node.resourceId.endsWith("aerr_wait"));
      if (waitNode) tapNode(waitNode);
    }
    await wait(WAIT_POLL_MS);
    last = dumpUi();
  }
  return last;
}

async function waitForIdSparse(
  testId: string,
  timeoutMs: number,
  quietSettleMs = 20_000,
  pollMs = 8_000,
): Promise<ReturnType<typeof dumpUi>> {
  await wait(quietSettleMs);
  const deadline = Date.now() + Math.max(0, timeoutMs - quietSettleMs);
  let last = dumpUi();
  while (Date.now() < deadline) {
    if (findNodeById(last, testId)) return last;
    await wait(pollMs);
    last = dumpUi();
  }
  return last;
}

async function waitForRuntimeBuildDelta(
  readRuntimeBuildTiming: () => NativeEstimateBuildTimingEvidence,
  baselineBuildCount: number,
  expectedDelta: 0 | 1,
  timeoutMs = 55_000,
): Promise<NativeEstimateBuildTimingEvidence> {
  const deadline = Date.now() + timeoutMs;
  let last = readRuntimeBuildTiming();
  while (
    Date.now() < deadline
    && last.runtime_build_count - baselineBuildCount < expectedDelta
  ) {
    await wait(WAIT_POLL_MS);
    last = readRuntimeBuildTiming();
  }
  return last;
}

async function scrollKnownRequestContainer(
  snapshot: CompiledRevisionViewportSnapshot,
  direction: "up" | "down",
  fine = false,
): Promise<boolean> {
  const container = snapshot.nodes.find((node) => nodeHasId(node as UiNode, "consumer-repair-screen"));
  const rect = container ? boundsRect(container.bounds) : null;
  if (!rect || rect.bottom - rect.top < 200) return false;
  // Stay inside the exact ScrollView and left of the first card input (x=81 on
  // the governed API34 viewport). x=50 leaves 31 px beyond Android touch slop;
  // x=76 could focus a delivery field while the vertical motion crossed it.
  const x = Math.round(rect.left + Math.min(50, (rect.right - rect.left) * 0.046));
  const upperY = Math.round(rect.top + (rect.bottom - rect.top) * (fine ? 0.44 : 0.28));
  const lowerY = Math.round(rect.top + (rect.bottom - rect.top) * (fine ? 0.56 : 0.72));
  const [startY, endY] = direction === "up" ? [lowerY, upperY] : [upperY, lowerY];
  // UiAutomator toggles its Accessibility service for every dump. Give that
  // service a bounded teardown window before injecting the next exact gutter
  // gesture. Emit the touch lifecycle explicitly: Android can acknowledge a
  // monolithic `input swipe` while dropping it during this transition.
  if (!await dismissSoftKeyboard()) return false;
  await wait(200);
  const yAt = (fraction: number): number => Math.round(startY + (endY - startY) * fraction);
  const motionEvents: readonly ["DOWN" | "MOVE" | "UP", number][] = [
    ["DOWN", startY],
    ["MOVE", yAt(0.25)],
    ["MOVE", yAt(0.5)],
    ["MOVE", yAt(0.75)],
    ["MOVE", endY],
    ["UP", endY],
  ];
  let gestureOk = true;
  for (const [index, [event, y]] of motionEvents.entries()) {
    if (index > 0) await wait(80);
    const injected = adb([
      "shell",
      "input",
      "motionevent",
      event,
      String(x),
      String(y),
    ], 10_000);
    gestureOk = gestureOk && injected.ok;
  }
  if (!gestureOk) return false;
  await wait(300);
  return dismissSoftKeyboard();
}

function scrollKnownRequestContainerUp(snapshot: CompiledRevisionViewportSnapshot): Promise<boolean> {
  return scrollKnownRequestContainer(snapshot, "up");
}

function requestSummaryCardAnchoredInSafeViewport(
  snapshot: ReturnType<typeof dumpUi>,
): boolean {
  const summary = findNodeById(snapshot, "request-estimate-summary-card");
  return Boolean(
    summary
    && nativeNodeSafeViewportAdjustment(summary.bounds, viewport().height) === "none"
  );
}

async function returnKnownRequestContainerToTop(maxSwipes = 24): Promise<boolean> {
  let snapshot = dumpUi();
  if (requestSummaryCardAnchoredInSafeViewport(snapshot)) return true;
  const scanForAnchor = async (direction: "up" | "down"): Promise<boolean> => {
    let previousFingerprint = sha256(snapshot.xml);
    let stableBoundaryCount = 0;
    for (let step = 0; step < maxSwipes; step += 1) {
      if (!await scrollKnownRequestContainer(snapshot, direction)) return false;
      await wait(500);
      snapshot = dumpUi();
      if (requestSummaryCardAnchoredInSafeViewport(snapshot)) return true;
      const fingerprint = sha256(snapshot.xml);
      stableBoundaryCount = fingerprint === previousFingerprint ? stableBoundaryCount + 1 : 0;
      previousFingerprint = fingerprint;
      if (stableBoundaryCount >= 2) break;
    }
    return false;
  };
  // Most callers begin below the request summary, so recover upward first.
  // A legacy generic `returnToTop` can, however, overshoot into the prompt and
  // delivery region above the draft. From that boundary the opposite gesture
  // is required to reach the same exact summary anchor.
  if (await scanForAnchor("down")) return true;
  return scanForAnchor("up");
}

async function findSafeRequestNodeByIdFromTop(
  testId: string,
  maxSwipes = 18,
): Promise<UiNode | null> {
  if (!await returnKnownRequestContainerToTop()) return null;
  let snapshot = dumpUi();
  let previousFingerprint = "";
  let stableBoundaryCount = 0;
  for (let step = 0; step <= maxSwipes; step += 1) {
    const node = findNodeById(snapshot, testId);
    if (node) {
      const adjustment = nativeNodeSafeViewportAdjustment(node.bounds, viewport().height);
      if (adjustment === "none") return node;
      if (adjustment === "invalid") return null;
      if (!await scrollKnownRequestContainer(snapshot, adjustment)) return null;
    } else if (!await scrollKnownRequestContainer(snapshot, "up")) {
      return null;
    }
    await wait(500);
    snapshot = dumpUi();
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint ? stableBoundaryCount + 1 : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2) return null;
  }
  return null;
}

async function findSafeRequestNodeByIdPrefixFromTop(
  testIdPrefix: string,
  maxSwipes = 18,
): Promise<UiNode | null> {
  if (!await returnKnownRequestContainerToTop()) return null;
  let snapshot = dumpUi();
  let previousFingerprint = "";
  let stableBoundaryCount = 0;
  for (let step = 0; step <= maxSwipes; step += 1) {
    const node = snapshot.nodes.find((candidate) =>
      candidate.resourceId.startsWith(testIdPrefix)
      || candidate.contentDesc.startsWith(testIdPrefix)
    );
    if (node) {
      const adjustment = nativeNodeSafeViewportAdjustment(node.bounds, viewport().height);
      if (adjustment === "none") return node;
      if (adjustment === "invalid") return null;
      if (!await scrollKnownRequestContainer(snapshot, adjustment)) return null;
    } else if (!await scrollKnownRequestContainer(snapshot, "up")) {
      return null;
    }
    await wait(500);
    snapshot = dumpUi();
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint ? stableBoundaryCount + 1 : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2) return null;
  }
  return null;
}

async function findSafeRequestNodeByIdFine(
  testId: string,
  maxSwipes = 48,
): Promise<UiNode | null> {
  let snapshot = dumpUi();
  let direction: "up" | "down" = "up";
  let previousFingerprint = "";
  let stableBoundaryCount = 0;
  let swipesInDirection = 0;
  for (let step = 0; step <= maxSwipes; step += 1) {
    const node = findNodeById(snapshot, testId);
    if (node) {
      const adjustment = nativeNodeSafeViewportAdjustment(node.bounds, viewport().height);
      if (adjustment === "none") return node;
      if (adjustment === "invalid") return null;
      if (!await swipeFine(snapshot, adjustment)) return null;
      await wait(450);
      snapshot = dumpUi();
      continue;
    }
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint
      ? stableBoundaryCount + 1
      : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2 || swipesInDirection >= Math.ceil(maxSwipes / 2)) {
      direction = direction === "up" ? "down" : "up";
      stableBoundaryCount = 0;
      swipesInDirection = 0;
    }
    if (!await swipeFine(snapshot, direction)) return null;
    swipesInDirection += 1;
    await wait(450);
    snapshot = dumpUi();
  }
  return null;
}

async function revealAllMissingParametersIfPresent(): Promise<boolean> {
  const testId = "request-estimate-show-more-parameters";
  const node = await findSafeRequestNodeByIdFine(testId, 32);
  if (!node) return true;
  await wait(600);
  const stableSnapshot = dumpUi();
  const stableNode = findNodeById(stableSnapshot, testId);
  if (
    !stableNode
    || nativeNodeSafeViewportAdjustment(stableNode.bounds, viewport().height) !== "none"
    || !tapNode(stableNode)
  ) return false;
  await wait(1_000);
  return !findNodeById(dumpUi(), testId);
}

async function findRequestNodeByIdFromTop(
  testId: string,
  maxSwipes = 18,
): Promise<{ snapshot: ReturnType<typeof dumpUi>; node: UiNode | null }> {
  if (!await returnKnownRequestContainerToTop()) {
    const snapshot = dumpUi();
    return { snapshot, node: null };
  }
  let snapshot = dumpUi();
  let previousFingerprint = "";
  let stableBoundaryCount = 0;
  for (let step = 0; step <= maxSwipes; step += 1) {
    const node = findNodeById(snapshot, testId);
    if (node) return { snapshot, node };
    if (!await scrollKnownRequestContainer(snapshot, "up")) break;
    await wait(500);
    snapshot = dumpUi();
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint ? stableBoundaryCount + 1 : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2) break;
  }
  return { snapshot, node: null };
}

async function findExactBatchApplyBeforeEditedParameter(
  maxSwipes = 20,
): Promise<UiNode | null> {
  let snapshot = dumpUi();
  let previousFingerprint = "";
  let stableBoundaryCount = 0;
  for (let step = 0; step <= maxSwipes; step += 1) {
    const node = findNodeById(snapshot, "editable-param-batch-apply");
    if (node) {
      const adjustment = nativeNodeSafeViewportAdjustment(node.bounds, viewport().height);
      if (adjustment === "none") return node;
      if (adjustment === "invalid") return null;
      if (!await scrollKnownRequestContainer(snapshot, adjustment)) return null;
    } else if (!await scrollKnownRequestContainer(snapshot, "down")) {
      return null;
    }
    await wait(500);
    snapshot = dumpUi();
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint ? stableBoundaryCount + 1 : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2) return null;
  }
  return null;
}

async function readSettledViewport(previousFingerprint: string): Promise<ReturnType<typeof dumpUi>> {
  const deadline = Date.now() + 8_000;
  let last = dumpUi();
  let lastChangedFingerprint = "";
  let stableChangedSnapshots = 0;
  while (Date.now() < deadline) {
    const currentFingerprint = sha256(last.xml);
    if (currentFingerprint !== previousFingerprint) {
      stableChangedSnapshots = currentFingerprint === lastChangedFingerprint
        ? stableChangedSnapshots + 1
        : 0;
      lastChangedFingerprint = currentFingerprint;
      if (stableChangedSnapshots >= 1) return last;
    }
    await wait(150);
    last = dumpUi();
  }
  return last;
}

function writeCompiledViewportEvidence(
  caseDir: string,
  phase: "precreate" | "create-first-batch" | "create" | "edit"
    | "row-delete" | "row-restore" | "price-first" | "price-bulk",
  boundary: NativeCompiledViewportArtifact["boundary"],
  step: number,
  name: string,
  snapshot: CompiledRevisionViewportSnapshot,
): NativeCompiledViewportArtifact {
  fs.mkdirSync(caseDir, { recursive: true });
  const xml = path.join(caseDir, `${phase}-compiled-marker-${name}.xml`);
  const png = path.join(caseDir, `${phase}-compiled-marker-${name}.png`);
  fs.writeFileSync(xml, snapshot.xml, "utf8");
  const screenshot = adbBuffer(["exec-out", "screencap", "-p"], 20_000);
  if (screenshot && screenshot.length > 0) fs.writeFileSync(png, screenshot);
  return {
    boundary,
    step,
    xml,
    png: screenshot && screenshot.length > 0 ? png : null,
  };
}

async function observeCompiledRevisionAcrossViewport(input: {
  caseDir: string;
  phase: "precreate" | "create-first-batch" | "create" | "edit"
    | "row-delete" | "row-restore" | "price-first" | "price-bulk";
  expected: CompiledRevisionExpectedIdentity;
  readRuntimeBuildTiming: () => NativeEstimateBuildTimingEvidence;
  allowMissingBuildTimingForBlockedSource?: boolean;
}): Promise<{
  snapshot: ReturnType<typeof dumpUi>;
  observation: NativeCompiledRevisionObservation | null;
  failureToken: string | null;
}> {
  const timing = await waitForRuntimeBuildDelta(
    input.readRuntimeBuildTiming,
    input.expected.baselineBuildCount,
    input.expected.expectedBuildDelta,
  );
  const buildDelta = timing.runtime_build_count - input.expected.baselineBuildCount;
  const missingBuildTimingAccepted = input.allowMissingBuildTimingForBlockedSource === true
    && input.expected.expectedBuildDelta === 1
    && buildDelta === 0
    && timing.runtime_draft_ready_ms == null;
  if (buildDelta !== input.expected.expectedBuildDelta && !missingBuildTimingAccepted) {
    return {
      snapshot: dumpUi(),
      observation: null,
      failureToken: `${STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH}:build_count_delta_expected_${input.expected.expectedBuildDelta}_received_${buildDelta}`,
    };
  }

  const keyboardDismissed = await dismissSoftKeyboard();
  await wait(300);
  const keyboardRemainedDismissed = keyboardDismissed && await dismissSoftKeyboard();
  if (!keyboardDismissed || !keyboardRemainedDismissed) {
    return {
      snapshot: dumpUi(),
      observation: null,
      failureToken: STOP_R9_HARNESS_COMPILED_VIEWPORT_IME_NOT_DISMISSED,
    };
  }

  let beforeXml = "";
  let finalXml = "";
  const viewportArtifacts: NativeCompiledViewportArtifact[] = [];
  const effectiveExpected = missingBuildTimingAccepted
    ? {
      ...input.expected,
      baselineBuildCount: timing.runtime_build_count,
      expectedBuildDelta: 0 as const,
    }
    : input.expected;
  const search: CompiledRevisionViewportSearchResult = await findCompiledRevisionMarkerAcrossViewport({
    expected: effectiveExpected,
    currentBuildCount: timing.runtime_build_count,
    readViewport: async () => dumpUi(),
    scrollKnownContainerUp: scrollKnownRequestContainerUp,
    readSettledViewport,
    recoverKnownAnchor: async () => {
      if (!await returnKnownRequestContainerToTop()) return null;
      return dumpUi();
    },
    fingerprint: (snapshot) => sha256(snapshot.xml),
    maxSwipes: 12,
    onViewport: (boundary, step, snapshot) => {
      if (boundary === "before") {
        const artifact = writeCompiledViewportEvidence(
          input.caseDir,
          input.phase,
          boundary,
          step,
          "before",
          snapshot,
        );
        viewportArtifacts.push(artifact);
        beforeXml = artifact.xml;
      } else if (boundary === "pending_poll") {
        viewportArtifacts.push(writeCompiledViewportEvidence(
          input.caseDir,
          input.phase,
          boundary,
          step,
          `pending-poll-${step}`,
          snapshot,
        ));
      } else if (boundary === "anchor_recovery") {
        viewportArtifacts.push(writeCompiledViewportEvidence(
          input.caseDir,
          input.phase,
          boundary,
          step,
          `anchor-recovery-${step}`,
          snapshot,
        ));
      } else if (boundary === "after_scroll") {
        viewportArtifacts.push(writeCompiledViewportEvidence(
          input.caseDir,
          input.phase,
          boundary,
          step,
          `after-scroll-${step}`,
          snapshot,
        ));
      } else {
        const artifact = writeCompiledViewportEvidence(
          input.caseDir,
          input.phase,
          boundary,
          step,
          "final",
          snapshot,
        );
        viewportArtifacts.push(artifact);
        finalXml = artifact.xml;
      }
    },
  });
  const captureIncomplete = viewportArtifacts.some((artifact) => artifact.png == null);
  return {
    snapshot: search.snapshot as ReturnType<typeof dumpUi>,
    observation: search.evidence && !captureIncomplete ? {
      ...search.evidence,
      marker_recovery_swipes: search.swipes,
      viewport_fingerprints: search.viewportFingerprints,
      before_xml: beforeXml,
      final_xml: finalXml,
      viewport_artifacts: viewportArtifacts,
    } : null,
    failureToken: search.failureToken
      ?? (captureIncomplete ? STOP_R9_EVIDENCE_COMPILED_REVISION_PNG_XML_PAIR_MISSING : null),
  };
}

function inputText(value: string): boolean {
  const chunks = value.match(/[\s\S]{1,8}/g) ?? [];
  for (const chunk of chunks) {
    const escaped = chunk
      .replace(/ /g, "%s")
      .replace(/&/g, "\\&")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\|/g, "\\|")
      .replace(/</g, "\\<")
      .replace(/>/g, "\\>")
      .replace(/;/g, "\\;")
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'");
    if (!adb(["shell", "input", "text", escaped], 20_000).ok) return false;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 180);
  }
  return true;
}

async function replaceFocusedInput(value: string): Promise<boolean> {
  const before = dumpUi();
  const focusedInput = before.nodes.find((node) =>
    node.attrs.includes('class="android.widget.EditText"')
    && node.attrs.includes('focused="true"')
  );
  if (!focusedInput) return false;
  // Android's atomic Ctrl+A selection is reliable for both numeric and text
  // React Native inputs. A long multi-DEL command can time out after ADB has
  // acknowledged only part of the edit, so never use it as replacement proof.
  await wait(250);
  const selectedAll = adb(["shell", "input", "keycombination", "113", "29"], 10_000);
  if (!selectedAll.ok) return false;
  await wait(200);
  const typed = inputText(value);
  if (!typed) return false;
  // `adb input text` returning zero only proves that Android accepted the
  // command. React Native can still be delivering the resulting onChange;
  // hiding or submitting the IME immediately can blur the controlled input
  // before that value is committed and restore its old text. Require the new
  // value to be observable on the same focused native input first.
  // Give Android's queued key events the same settled boundary proven by the
  // direct device diagnostic before starting the comparatively heavy
  // UiAutomator dump. Dumping immediately can monopolize accessibility while
  // the final input event is still being delivered.
  await wait(800);
  const visibleDeadline = Date.now() + 5_000;
  let typedValueVisible = false;
  while (Date.now() < visibleDeadline) {
    const snapshot = dumpUi();
    const currentFocusedInput = snapshot.nodes.find((node) =>
      node.attrs.includes('class="android.widget.EditText"')
      && node.attrs.includes('focused="true"')
    );
    const secureValueVisible = Boolean(
      currentFocusedInput?.attrs.includes('password="true"')
      && currentFocusedInput.text.length === value.length
      && /^[\u2022\u25cf*]+$/u.test(currentFocusedInput.text),
    );
    if (currentFocusedInput?.text === value || secureValueVisible) {
      typedValueVisible = true;
      break;
    }
    await wait(250);
  }
  if (!typedValueVisible) return false;
  await wait(600);
  const dismissed = await dismissSoftKeyboard();
  await wait(250);
  return dismissed;
}

async function dismissSoftKeyboard(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const state = adb(["shell", "dumpsys", "input_method"], 15_000);
    if (!/mInputShown=true/i.test(state.output)) return true;
    adb(["shell", "input", "keyevent", "4"], 5_000);
    await wait(750);
  }
  // Pixel devices using gesture navigation expose a dedicated IME-collapse
  // affordance in the lower-left navigation inset. Some Gboard builds keep
  // reporting mInputShown=true after KEYCODE_BACK, so use that real system
  // control as the bounded fallback instead of treating a committed value as
  // an input failure.
  const displaySize = adb(["shell", "wm", "size"], 5_000).output.match(/(\d+)x(\d+)/u);
  if (displaySize) {
    const width = Number(displaySize[1]);
    const height = Number(displaySize[2]);
    adb([
      "shell",
      "input",
      "tap",
      String(Math.round(width * 0.15)),
      String(Math.max(0, height - Math.round(height * 0.033))),
    ], 5_000);
    await wait(750);
  }
  return !/mInputShown=true/i.test(adb(["shell", "dumpsys", "input_method"], 15_000).output);
}

async function setTextInput(testId: string, value: string, maxSwipes = 18): Promise<boolean> {
  const found = await scrollToId(testId, maxSwipes);
  if (!found.node || !tapNode(found.node)) return false;
  await wait(250);
  return replaceFocusedInput(value);
}

async function waitForEnabledId(testId: string, timeoutMs = 60_000): Promise<UiNode | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const lookup = await scrollToId(testId, 8);
    if (lookup.node?.attrs.includes('enabled="true"')) return lookup.node;
    await wait(2_000);
  }
  return null;
}

async function collapseDisclosureIfOpen(testId: string): Promise<boolean> {
  const exactToggle = await findSafeRequestNodeByIdFromTop(testId, 24);
  if (!exactToggle) return false;
  const label = `${exactToggle.text} ${exactToggle.contentDesc}`;
  if (!/\u0421\u043a\u0440\u044b\u0442\u044c/u.test(label)) return true;
  if (!tapNode(exactToggle)) return false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await wait(attempt === 0 ? 750 : 1_500);
    const settledToggle = await findSafeRequestNodeByIdFromTop(testId, 24);
    if (!settledToggle) continue;
    const settledLabel = `${settledToggle.text} ${settledToggle.contentDesc}`;
    if (!/\u0421\u043a\u0440\u044b\u0442\u044c/u.test(settledLabel)) return true;
    // A lazy exact-draft remount can consume the first tap while preserving
    // the open disclosure. Reacquire and close that same exact toggle only.
    if (!tapNode(settledToggle)) return false;
  }
  return false;
}

async function waitForExactDraftHydrationToSettle(
  timeoutMs = 120_000,
): Promise<ReturnType<typeof dumpUi> | null> {
  const deadline = Date.now() + timeoutMs;
  let snapshot = dumpUi();
  while (Date.now() < deadline) {
    const hydrationPending = Boolean(
      findNodeById(snapshot, "consumer-repair-exact-draft-hydration-gate")
      || findNodeById(snapshot, "consumer-repair-storage-hydrating"),
    );
    if (!hydrationPending) return snapshot;
    await wait(1_500);
    snapshot = dumpUi();
  }
  return null;
}

async function openDisclosureAndFind(
  toggleId: string,
  contentId: string,
  maxSwipes = 16,
): Promise<{ snapshot: ReturnType<typeof dumpUi>; node: UiNode | null }> {
  const hydrated = await waitForExactDraftHydrationToSettle();
  if (!hydrated) return { snapshot: dumpUi(), node: null };
  let content = await findRequestNodeByIdFromTop(contentId, maxSwipes);
  const initiallyVisible = findNodeById(content.snapshot, contentId);
  if (initiallyVisible) return { snapshot: content.snapshot, node: initiallyVisible };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const exactToggle = await findSafeRequestNodeByIdFromTop(toggleId, maxSwipes);
    if (!exactToggle) return content;
    const open = /\u0421\u043a\u0440\u044b\u0442\u044c/u.test(`${exactToggle.text} ${exactToggle.contentDesc}`);
    if (!open && !tapNode(exactToggle)) return content;
    await wait(attempt < 2 ? 1_500 : 3_000);
    content = await findRequestNodeByIdFromTop(contentId, maxSwipes);
    if (content.node) return content;
  }
  return content;
}

async function confirmExactSourceManagedGate(
  sourceManagedKeys: readonly string[],
): Promise<boolean> {
  if (sourceManagedKeys.length === 0) return false;
  let toggle = await findSafeRequestNodeByIdFromTop("request-estimate-parameters-toggle", 24);
  if (!toggle) return false;
  let toggleLabel = `${toggle.text} ${toggle.contentDesc}`;
  const countSnapshot = dumpUi();
  let countEvidence = `${toggleLabel} ${countSnapshot.text}`;
  let exactCountVisible = countEvidence.includes(`Источники норм (${sourceManagedKeys.length})`)
    || new RegExp(
      `Данные заказчика заполнены; для ${sourceManagedKeys.length} (?:нормы|норм) нужен подтверждённый источник\\.`,
      "u",
    ).test(countEvidence);
  if (!exactCountVisible && /Скрыть параметры/u.test(toggleLabel)) {
    // A long P0 discovery can leave the open-panel summary outside the native
    // viewport. Close the exact panel, read the source count from its collapsed
    // button, then let openDisclosureAndFind reopen it for the exact gate proof.
    if (!tapNode(toggle)) return false;
    await wait(1_000);
    toggle = await findSafeRequestNodeByIdFromTop("request-estimate-parameters-toggle", 24);
    if (!toggle) return false;
    toggleLabel = `${toggle.text} ${toggle.contentDesc}`;
    countEvidence = toggleLabel;
    exactCountVisible = countEvidence.includes(`Источники норм (${sourceManagedKeys.length})`);
  }
  if (!exactCountVisible) return false;
  const firstGateId = `request-estimate-source-gate-${sourceManagedKeys[0]}`;
  const firstGate = await openDisclosureAndFind(
    "request-estimate-parameters-toggle",
    firstGateId,
    24,
  );
  return Boolean(firstGate.node);
}

async function findOptionalApprovalContactInputs(): Promise<{
  snapshot: ReturnType<typeof dumpUi>;
  address: UiNode | null;
  phone: UiNode | null;
}> {
  await returnToTop(20);
  let snapshot = dumpUi();
  for (let index = 0; index < 24; index += 1) {
    const address = findNodeById(snapshot, "consumer-repair-address-input");
    const phone = findNodeById(snapshot, "consumer-repair-phone-input");
    if (address && phone) return { snapshot, address, phone };
    // A collapsed summary proves that delivery data is populated. Keep the
    // empty optional-contact assertion fail-closed instead of expanding or
    // accepting that state. Otherwise scan forward without the generic
    // fingerprint boundary, which can settle early on the long estimate page.
    if (findNodeById(snapshot, "consumer-repair-delivery-summary")) {
      return { snapshot, address: null, phone: null };
    }
    swipe("up", index % 4 === 3);
    await wait(450);
    snapshot = dumpUi();
  }
  return { snapshot, address: null, phone: null };
}

async function readApprovedHistoryCount(): Promise<number | null> {
  const lookup = await scrollToId("consumer-repair-history-loaded-count", 20);
  const numbers = (lookup.node?.text ?? "").match(/\d+/g)?.map(Number) ?? [];
  return numbers.length >= 2 ? numbers[1] : null;
}

async function waitForApprovalDurableCommitStatus(
  timeoutMs = 180_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const snapshot = dumpUi();
    const status = findNodeById(snapshot, "consumer-repair-status");
    // This message is assigned only after the approved bundle's transactional
    // write has completed. The following force-stop/reopen still proves that
    // the commit survives a new process; a capped 20/20 history page cannot
    // prove approval by increasing its visible count.
    if (status?.text.includes("Заявка утверждена. PDF сохранён в истории")) {
      return true;
    }
    await wait(5_000);
  }
  return false;
}

async function waitForInitialRuntimePersistWithoutUiDumpContention(input: {
  baselinePersistCount: number;
  readRuntimeBuildTiming: () => NativeEstimateBuildTimingEvidence;
  timeoutMs?: number;
}): Promise<NativeEstimateBuildTimingEvidence | null> {
  const deadline = Date.now() + (input.timeoutMs ?? 45_000);
  while (Date.now() < deadline) {
    const timing = input.readRuntimeBuildTiming();
    if (timing.persist_count > input.baselinePersistCount) return timing;
    // UiAutomator hierarchy dumps can suspend Android accessibility/rendering
    // on this large page. Poll only the production log marker until the native
    // durable write completes, then resume exact viewport assertions.
    await wait(500);
  }
  return null;
}

function p0Keys(registration: NativeMatrixRegistration): string[] {
  return registration.parameterDefinitions
    .filter((definition) => definition.tier === "P0")
    .map((definition) => definition.key);
}

function unresolvedSourceManagedKeys(registration: NativeMatrixRegistration): string[] {
  return registration.parameterDefinitions
    .filter((definition) =>
      (definition.sourceRole === "TECHNICAL_SOURCE_INPUT"
        || definition.sourceRole === "MATERIAL_PASSPORT_INPUT")
      && definition.sourceFixedBinding == null
    )
    .map((definition) => definition.key);
}

function sourceBlockedWithNoAdditionalUserInput(registration: NativeMatrixRegistration): boolean {
  const sourceManaged = new Set(unresolvedSourceManagedKeys(registration));
  if (sourceManaged.size === 0) return false;
  return registration.parameterDefinitions.every((definition) =>
    sourceManaged.has(definition.key)
    || definition.sourceFixedBinding != null
    || definition.key === registration.editParameterKey
  );
}

const OWNER_SUPPLIED_PARAMETER_ROLES = new Set([
  "USER_PROJECT_INPUT",
  "PROJECT_DESIGN_INPUT",
  "LOGISTICS_INPUT",
]);

function deterministicOwnerSuppliedProjectKeys(
  registration: NativeMatrixRegistration,
): string[] | null {
  // The published Roadworks owner registry is the authoritative contract for
  // which missing values belong to the customer/project and which belong to a
  // technical source. Reading only the currently visible native cards is not
  // sufficient: a long source-gate section can precede and hide later project
  // cards from a bounded viewport walk.
  if (registration.workId === "bridge_asphalt") {
    // R9 bridge acceptance uses the complete approved project baseline. The
    // route already supplies geometry; every other named value is entered in
    // the shared native parameter editor before the one immutable batch apply.
    return Object.keys(registration.inputValues).filter((key) =>
      !["area_m2", "geometry_method", "length_m", "width_m"].includes(key)
    );
  }
  if (registration.extraProfile != null) return null;
  return registration.parameterDefinitions
    .filter((definition) =>
      definition.tier === "P0"
      && definition.key !== registration.editParameterKey
      && definition.sourceFixedBinding == null
      && definition.sourceRole != null
      && OWNER_SUPPLIED_PARAMETER_ROLES.has(definition.sourceRole)
    )
    .map((definition) => definition.key);
}

function rawParameterValue(registration: NativeMatrixRegistration, key: string): string {
  return String(registration.inputValues[key]);
}

function parameterChoices(key: string): readonly { value: string | boolean }[] {
  const drainage = ASPHALT_SURFACE_DRAINAGE_INPUTS.find((parameter) => parameter.parameterId === key);
  if (drainage?.choices?.length) return drainage.choices.map((value) => ({ value }));
  if (drainage?.valueType === "boolean") return [{ value: true }, { value: false }];
  const roadworks = ROADWORKS_WAVE_A_PARAMETER_PRESENTATION[key as RoadworksWaveAParameterKey];
  if (roadworks) return roadworks.choices;
  const relatedChoices = ASPHALT_RELATED_PARAMETER_METADATA_V4[key]?.allowedValues ?? [];
  if (relatedChoices.length > 0) return relatedChoices
    .map((value) => ({ value }));
  return (getAsphaltParameterV4(key)?.choices ?? []).map((choice) => ({ value: choice.value }));
}

const ASPHALT_SCOPE_PARAMETER_DEFINITIONS = Object.freeze(
  ASPHALT_WORK_SPECIFIC_PARAMETERS_V4.map((parameter) => ({
    canonicalKey: parameter.canonical_key,
    critical: parameter.necessity === "critical",
    internal: parameter.internal_only === true,
  })),
);

async function discoverGovernedScopeCriticalMissingKeys(
  initialSnapshot: ReturnType<typeof dumpUi>,
  definitions = ASPHALT_SCOPE_PARAMETER_DEFINITIONS,
  onProgress?: (step: number, criticalCount: number) => void,
): Promise<{ criticalKeys: string[]; unknownKeys: string[] }> {
  const criticalKeys = new Set<string>();
  const unknownKeys = new Set<string>();
  let snapshot = initialSnapshot;
  let previousFingerprint = "";
  let stableBoundaryCount = 0;
  let noNewCriticalCount = 0;
  let sawNonCritical = false;
  const expectedCriticalKeys = definitions
    .filter((definition) => definition.critical && !definition.internal)
    .map((definition) => definition.canonicalKey);
  for (let step = 0; step <= 18; step += 1) {
    const beforeCount = criticalKeys.size;
    const classified = classifyGovernedMissingParameterKeys(
      snapshot.nodes,
      definitions,
    );
    classified.criticalKeys.forEach((key) => criticalKeys.add(key));
    classified.unknownKeys.forEach((key) => unknownKeys.add(key));
    sawNonCritical = sawNonCritical || classified.nonCriticalKeys.length > 0;
    noNewCriticalCount = criticalKeys.size === beforeCount ? noNewCriticalCount + 1 : 0;
    onProgress?.(step, criticalKeys.size);
    if (unknownKeys.size > 0) break;
    if (
      expectedCriticalKeys.length > 0
      && expectedCriticalKeys.every((key) => criticalKeys.has(key))
    ) break;
    if (sawNonCritical && criticalKeys.size > 0 && noNewCriticalCount >= 2) break;
    if (criticalKeys.size > 0 && noNewCriticalCount >= 6) break;
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint ? stableBoundaryCount + 1 : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2 || step === 18) break;
    if (!await scrollKnownRequestContainerUp(snapshot)) break;
    await wait(500);
    snapshot = dumpUi();
  }
  const governedOrder = definitions.map((definition) => definition.canonicalKey);
  return {
    criticalKeys: governedOrder.filter((key) => criticalKeys.has(key)),
    unknownKeys: [...unknownKeys].sort(),
  };
}

async function setInlineParameter(
  key: string,
  value: string,
  caseDir: string,
): Promise<boolean> {
  const presentation = { choices: parameterChoices(key) };
  const reacquireExactEnumEditorAfterRerender = async () => {
    const editorId = `editable-param-inline-editor-${key}`;
    const initial = await scrollToId(editorId, 8);
    if (initial.node) return initial;
    let snapshot = initial.snapshot;
    for (let reverseStep = 0; reverseStep < 4; reverseStep += 1) {
      // Selecting an enum can rerender the dirty bar while the bidirectional
      // lookup is already returning from the lower boundary. Continue only in
      // that exact reverse direction and still require the same editor ID.
      swipe("down", reverseStep === 3);
      await wait(450);
      snapshot = dumpUi();
      const node = findNodeById(snapshot, editorId);
      if (node) return { snapshot, node };
    }
    return { snapshot, node: null };
  };
  const waitForCommittedValue = async (): Promise<boolean> => {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const exactEditor = await reacquireExactEnumEditorAfterRerender();
      const snapshot = exactEditor.snapshot;
      const dirty = findNodeById(snapshot, `editable-param-dirty-${key}`);
      const editor = exactEditor.node;
      const input = editor ? findInputOwnedByEditor(snapshot, editor) : null;
      if (presentation.choices.length > 0 && dirty) return true;
      if (dirty && input?.text === value) return true;
      await wait(750);
    }
    return false;
  };
  const tapExactEnumOptionAndWaitForCommit = async (choiceValue: string): Promise<boolean> => {
    const editorId = `editable-param-inline-editor-${key}`;
    const optionId = `editable-param-option-${key}-${choiceValue}`;
    const visibleSnapshot = dumpUi();
    const visibleEditor = findNodeById(visibleSnapshot, editorId);
    const visibleOption = visibleEditor
      ? findOptionOwnedByEditor(visibleSnapshot, visibleEditor, optionId)
      : null;
    const exactOwned = visibleEditor
      && visibleOption
      && nativeNodeSafeViewportAdjustment(visibleOption.bounds, viewport().height) === "none"
      ? { snapshot: visibleSnapshot, editor: visibleEditor, option: visibleOption }
      : await findSafeOptionOwnedByExactEditor(editorId, optionId);
    // The tap is accepted only when the exact option is a native descendant of
    // the exact parameter editor. This prevents both skipping a short enum card
    // on a long ScrollView and selecting an identically labelled adjacent field.
    if (!exactOwned) return false;
    // The exact node can still move briefly after ScrollView momentum ends.
    // Settle first, then reacquire the same exact editor and its owned option;
    // never reuse coordinates from the pre-settle snapshot.
    await wait(800);
    const stableSnapshot = dumpUi();
    const stableEditor = findNodeById(stableSnapshot, editorId);
    const stableOption = stableEditor
      ? findOptionOwnedByEditor(stableSnapshot, stableEditor, optionId)
      : null;
    if (!stableOption) return false;
    if (nativeNodeSafeViewportAdjustment(stableOption.bounds, viewport().height) !== "none") return false;
    if (!tapNode(stableOption)) return false;
    // Let React Native Pressability and the controlled-state onChange commit
    // before any follow-up swipe can compete with the accepted exact tap.
    await wait(800);
    return waitForCommittedValue();
  };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (presentation.choices.length > 0) {
      if (await tapExactEnumOptionAndWaitForCommit(value)) return true;
      capture(caseDir, `p0-${key}-attempt-${attempt + 1}-primary-not-dirty`);
      const alternate = presentation.choices.find((choice) => String(choice.value) !== value);
      if (
        alternate
        && await tapExactEnumOptionAndWaitForCommit(String(alternate.value))
        && await tapExactEnumOptionAndWaitForCommit(value)
      ) return true;
      capture(caseDir, `p0-${key}-attempt-${attempt + 1}-alternate-not-dirty`);
      continue;
    }
    const editorId = `editable-param-inline-editor-${key}`;
    if (!await focusInputOwnedByExactEditor(editorId)) {
      capture(caseDir, `p0-${key}-attempt-${attempt + 1}-exact-focus-missing`);
      continue;
    }
    if (await replaceFocusedInput(value) && await waitForCommittedValue()) return true;
    capture(caseDir, `p0-${key}-attempt-${attempt + 1}-input-not-committed`);
  }
  return false;
}

async function applyEditAndWaitForChangedRevision(
  input: {
    caseDir: string;
    previous: NativeCompiledRevisionObservation;
    selectedCatalogId: string;
    selectedWorkKey: string;
    canonicalOwner: string;
    expectedCalculationStatus: NativeCompiledRevisionObservation["calculation_status"];
    readRuntimeBuildTiming: () => NativeEstimateBuildTimingEvidence;
  },
): Promise<{
  snapshot: ReturnType<typeof dumpUi>;
  label: string | null;
  applyTapped: boolean;
  observation: NativeCompiledRevisionObservation | null;
  failureToken: string | null;
}> {
  const baselineBuildCount = input.readRuntimeBuildTiming().runtime_build_count;
  // One exact tap may create at most one immutable revision. Retrying an
  // accepted coordinate would hide a duplicate product transition, so a
  // missing acknowledgement fails closed instead of tapping Apply again.
  const exactApplyNode = await findExactBatchApplyBeforeEditedParameter();
  if (!exactApplyNode || !tapNode(exactApplyNode)) {
    capture(input.caseDir, "edit-apply-action-missing");
    return {
      snapshot: dumpUi(),
      label: null,
      applyTapped: false,
      observation: null,
      failureToken: "edit_apply_failed",
    };
  }
  await wait(800);
  if (!await returnKnownRequestContainerToTop()) {
    return {
      snapshot: dumpUi(),
      label: null,
      applyTapped: true,
      observation: null,
      failureToken: "edit_post_apply_top_reanchor_failed",
    };
  }
  const observed = await observeCompiledRevisionAcrossViewport({
    caseDir: input.caseDir,
    phase: "edit",
    expected: {
      selectedCatalogId: input.selectedCatalogId,
      selectedWorkKey: input.selectedWorkKey,
      canonicalOwner: input.canonicalOwner,
      previousRevisionId: input.previous.current_revision_id,
      baselineRevisionOrdinal: input.previous.revision_ordinal,
      baselineBuildCount,
      expectedBuildDelta: 0,
      expectedRowCount: input.previous.compiled_row_count,
      expectedCalculationStatus: input.expectedCalculationStatus,
    },
    readRuntimeBuildTiming: input.readRuntimeBuildTiming,
  });
  return {
    snapshot: observed.snapshot,
    label: observed.observation?.current_revision_id ?? null,
    applyTapped: true,
    observation: observed.observation,
    failureToken: observed.failureToken,
  };
}

async function observeNativeAmendmentRevision(input: {
  caseDir: string;
  phase: "row-delete" | "row-restore" | "price-first" | "price-bulk";
  previous: NativeCompiledRevisionObservation;
  selectedCatalogId: string;
  selectedWorkKey: string;
  canonicalOwner: string;
  expectedRowCount: number;
  baselineBuildCount: number;
  readRuntimeBuildTiming: () => NativeEstimateBuildTimingEvidence;
}): Promise<NativeCompiledRevisionObservation | null> {
  await wait(800);
  // The restore action is rendered after the full virtualized BOQ. A 44-row
  // bridge estimate can leave the native request viewport farther than forty
  // fine gestures from its summary after that action remounts the list.
  if (!await returnKnownRequestContainerToTop(96)) return null;
  const observed = await observeCompiledRevisionAcrossViewport({
    caseDir: input.caseDir,
    phase: input.phase,
    expected: {
      selectedCatalogId: input.selectedCatalogId,
      selectedWorkKey: input.selectedWorkKey,
      canonicalOwner: input.canonicalOwner,
      previousRevisionId: input.previous.current_revision_id,
      baselineRevisionOrdinal: input.previous.revision_ordinal,
      baselineBuildCount: input.baselineBuildCount,
      expectedBuildDelta: 0,
      expectedRowCount: input.expectedRowCount,
      expectedCalculationStatus: "draft_ready",
    },
    readRuntimeBuildTiming: input.readRuntimeBuildTiming,
  });
  return observed.observation;
}

type BridgeNativeAmendmentAcceptance = {
  observation: NativeCompiledRevisionObservation | null;
  rowDeleteRestore: NativeCaseResult["row_delete_restore"];
  continuousPriceInput: NativeCaseResult["continuous_price_input"];
  pricedRevisionId: string | null;
  historyDisplayTitleRu: string | null;
  failures: string[];
};

function canonicalBackendRowIsPayable(row: Json): boolean {
  if (row.includedInEstimate === false) return false;
  const costTreatment = String(
    row.calculationTrace?.resourceGraph?.costTreatment ?? "",
  );
  return ![
    "INCLUDED_IN_RESOURCE_ROWS",
    "INFORMATIONAL_SCOPE",
    "CONTROL_OR_DOCUMENT",
  ].includes(costTreatment);
}

async function runBridgeNativeAmendmentAcceptance(input: {
  caseDir: string;
  registration: NativeMatrixRegistration;
  initialObservation: NativeCompiledRevisionObservation;
  readRuntimeBuildTiming: () => NativeEstimateBuildTimingEvidence;
}): Promise<BridgeNativeAmendmentAcceptance> {
  const failures: string[] = [];
  const selectedCatalogId = input.registration.requestedCatalogRecordId
    ?? input.registration.workId;
  const expectedItems = compileExpectedExtraProfile(input.registration).draft.items
    .filter((item) => item.sourceParameters?.includedInEstimate !== false);
  const expectedCompleteCount = expectedItems.length;
  let targetRowId = "";
  let current = input.initialObservation;
  let rowDeleteRestore: NativeCaseResult["row_delete_restore"];
  let continuousPriceInput: NativeCaseResult["continuous_price_input"];
  let pricedRevisionId: string | null = null;
  let historyDisplayTitleRu: string | null = null;

  if (expectedCompleteCount !== 44) {
    return {
      observation: null,
      rowDeleteRestore,
      continuousPriceInput,
      pricedRevisionId,
      historyDisplayTitleRu,
      failures: [`bridge_expected_active_rows_invalid:${expectedCompleteCount}`],
    };
  }

  try {
    const authorization = await localConsumerAuthorization();
    const initialRows = await allCanonicalRows(
      authorization,
      current.current_revision_id,
    );
    const initialActiveRows = initialRows.filter((row) => row.includedInEstimate !== false);
    targetRowId = String(initialActiveRows[0]?.rowId ?? "");
    if (!targetRowId || initialActiveRows.length !== expectedCompleteCount) {
      throw new Error(`bridge_initial_active_rows_invalid:${initialActiveRows.length}`);
    }
    const removePrefix = "consumer-repair-item-remove-";
    // Consumer request items have a durable UI item identity distinct from the
    // canonical backend rowCode. The ordered first visible item maps to the
    // ordered first active canonical row; never fabricate a testID from rowId.
    const removeNode = await findSafeRequestNodeByIdPrefixFromTop(removePrefix, 64);
    if (!removeNode) throw new Error("bridge_row_delete_action_missing");
    const deleteBaselineBuildCount = input.readRuntimeBuildTiming().runtime_build_count;
    if (!tapNode(removeNode)) throw new Error("bridge_row_delete_tap_failed");
    const deleted = await observeNativeAmendmentRevision({
      caseDir: input.caseDir,
      phase: "row-delete",
      previous: current,
      selectedCatalogId,
      selectedWorkKey: input.registration.workId,
      canonicalOwner: input.registration.workId,
      expectedRowCount: expectedCompleteCount - 1,
      baselineBuildCount: deleteBaselineBuildCount,
      readRuntimeBuildTiming: input.readRuntimeBuildTiming,
    });
    if (!deleted) throw new Error("bridge_row_delete_revision_missing");
    const deletedRevision = await canonicalApi(
      authorization,
      `revisions/${deleted.current_revision_id}`,
    );
    const deletedRows = await allCanonicalRows(authorization, deleted.current_revision_id);
    const deletedActiveRows = deletedRows.filter((row) => row.includedInEstimate !== false);
    if (deletedRevision.parentRevisionId !== current.current_revision_id) {
      throw new Error("bridge_row_delete_parent_mismatch");
    }
    if (
      deletedActiveRows.length !== expectedCompleteCount - 1
      || deletedActiveRows.some((row) => String(row.rowId) === targetRowId)
    ) {
      throw new Error("bridge_row_delete_not_persisted");
    }
    const deleteCapture = capture(input.caseDir, "row-deleted-44-to-43");

    const restoreNode = await findSafeRequestNodeByIdFromTop(
      "consumer-repair-restore-item",
      64,
    );
    if (!restoreNode) throw new Error("bridge_row_restore_action_missing");
    const restoreBaselineBuildCount = input.readRuntimeBuildTiming().runtime_build_count;
    if (!tapNode(restoreNode)) throw new Error("bridge_row_restore_tap_failed");
    const restored = await observeNativeAmendmentRevision({
      caseDir: input.caseDir,
      phase: "row-restore",
      previous: deleted,
      selectedCatalogId,
      selectedWorkKey: input.registration.workId,
      canonicalOwner: input.registration.workId,
      expectedRowCount: expectedCompleteCount,
      baselineBuildCount: restoreBaselineBuildCount,
      readRuntimeBuildTiming: input.readRuntimeBuildTiming,
    });
    if (!restored) throw new Error("bridge_row_restore_revision_missing");
    const restoredRevision = await canonicalApi(
      authorization,
      `revisions/${restored.current_revision_id}`,
    );
    const restoredRows = await allCanonicalRows(authorization, restored.current_revision_id);
    const restoredActiveRows = restoredRows.filter((row) => row.includedInEstimate !== false);
    if (
      restoredRevision.parentRevisionId !== deleted.current_revision_id
      || !restoredActiveRows.some((row) => String(row.rowId) === targetRowId)
      || restoredActiveRows.length !== expectedCompleteCount
    ) {
      throw new Error("bridge_row_restore_not_persisted");
    }
    const restoreCapture = capture(input.caseDir, "row-restored-43-to-44");
    rowDeleteRestore = {
      row_id: targetRowId,
      before_revision_id: current.current_revision_id,
      deleted_revision_id: deleted.current_revision_id,
      restored_revision_id: restored.current_revision_id,
      row_counts: [expectedCompleteCount, expectedCompleteCount - 1, expectedCompleteCount],
      delete_capture: deleteCapture,
      restore_capture: restoreCapture,
    };
    current = restored;

    const payableRowIds = restoredActiveRows
      .filter(canonicalBackendRowIsPayable)
      .map((row) => String(row.rowId));
    const priceRowId = payableRowIds[0] ?? "";
    const priceInputPrefix = "consumer-repair-item-unit-price-input-";
    const priceInput = priceRowId
      ? await findSafeRequestNodeByIdPrefixFromTop(priceInputPrefix, 64)
      : null;
    if (!priceInput || !tapNode(priceInput)) {
      throw new Error("bridge_continuous_price_input_missing");
    }
    const priceInputTestId = priceInput.resourceId.startsWith(priceInputPrefix)
      ? priceInput.resourceId
      : priceInput.contentDesc.startsWith(priceInputPrefix)
        ? priceInput.contentDesc
        : "";
    if (!priceInputTestId) throw new Error("bridge_continuous_price_input_identity_missing");
    await wait(350);
    const focusedBefore = dumpUi();
    const focusedPriceInput = findNodeById(focusedBefore, priceInputTestId);
    if (!focusedPriceInput?.attrs.includes('focused="true"')) {
      throw new Error("bridge_continuous_price_focus_missing");
    }
    if (!adb(["shell", "input", "keycombination", "113", "29"], 10_000).ok) {
      throw new Error("bridge_continuous_price_select_all_failed");
    }
    await wait(250);
    const steps: NonNullable<NativeCaseResult["continuous_price_input"]>["steps"] = [];
    for (const digit of ["1", "5", "0"]) {
      if (!inputText(digit)) throw new Error(`bridge_continuous_price_digit_failed:${digit}`);
      await wait(800);
      const snapshot = dumpUi();
      const exactInput = findNodeById(snapshot, priceInputTestId);
      steps.push({
        digit,
        value: exactInput?.text ?? "",
        focused: Boolean(exactInput?.attrs.includes('focused="true"')),
        exact_test_id: Boolean(exactInput),
      });
    }
    if (
      steps.map((step) => step.value).join("|") !== "1|15|150"
      || steps.some((step) => !step.focused || !step.exact_test_id)
    ) {
      throw new Error(`bridge_continuous_price_sequence_invalid:${JSON.stringify(steps)}`);
    }
    const continuousCapture = capture(input.caseDir, "continuous-price-1-15-150");
    const priceBaselineBuildCount = input.readRuntimeBuildTiming().runtime_build_count;
    if (!adb(["shell", "input", "keyevent", "66"], 10_000).ok) {
      throw new Error("bridge_continuous_price_submit_failed");
    }
    const firstPriced = await observeNativeAmendmentRevision({
      caseDir: input.caseDir,
      phase: "price-first",
      previous: current,
      selectedCatalogId,
      selectedWorkKey: input.registration.workId,
      canonicalOwner: input.registration.workId,
      expectedRowCount: expectedCompleteCount,
      baselineBuildCount: priceBaselineBuildCount,
      readRuntimeBuildTiming: input.readRuntimeBuildTiming,
    });
    if (!firstPriced) throw new Error("bridge_first_price_revision_missing");
    const firstPriceRows = await allCanonicalRows(authorization, firstPriced.current_revision_id);
    if (Number(firstPriceRows.find((row) => String(row.rowId) === priceRowId)?.unitPrice) !== 150) {
      throw new Error("bridge_first_price_not_persisted");
    }
    continuousPriceInput = {
      test_id: priceInputTestId,
      steps,
      committed_revision_id: firstPriced.current_revision_id,
      capture: continuousCapture,
    };
    current = firstPriced;

    const firstPriceRevision = await canonicalApi(
      authorization,
      `revisions/${current.current_revision_id}`,
    );
    const rowOverrides: Json = {
      ...(firstPriceRevision.amendmentContract?.rowOverrides ?? {}),
    };
    for (const rowId of payableRowIds) {
      rowOverrides[rowId] = {
        ...(rowOverrides[rowId] ?? {}),
        unitPrice: 150,
        provenance: {
          kind: "manual",
          reason: "r9_bridge_android_acceptance_price",
        },
      };
    }
    const accepted = await canonicalApi(authorization, "jobs/recalculate", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `r9-bridge-android-price-${sha256(JSON.stringify({
          parentRevisionId: current.current_revision_id,
          rowOverrides,
        })).slice(0, 32)}`,
        catalogId: selectedCatalogId,
        parentRevisionId: current.current_revision_id,
        sourceRequestText: firstPriceRevision.sourceRequestText
          || nativeRawPrompt(input.registration),
        primaryMeasureParameterId: firstPriceRevision.primaryMeasureParameterId
          || "area_m2",
        parameters: firstPriceRevision.parameters,
        currencyCode: firstPriceRevision.currencyCode || "KGS",
        priceSnapshotIds: firstPriceRevision.priceSnapshotIds ?? [],
        rowOverrides,
        customRows: firstPriceRevision.amendmentContract?.customRows ?? [],
      }),
    });
    const job = await waitForCanonicalJob(authorization, String(accepted.jobId ?? ""));
    pricedRevisionId = String(job.resultRevisionId ?? "");
    if (!/^[0-9a-f-]{36}$/iu.test(pricedRevisionId)) {
      throw new Error("bridge_bulk_price_revision_missing");
    }
    const pricedRevision = await canonicalApi(
      authorization,
      `revisions/${pricedRevisionId}`,
    );
    historyDisplayTitleRu = String(pricedRevision.displayTitleRu ?? "").trim() || null;
    const pricedRows = await allCanonicalRows(authorization, pricedRevisionId);
    const pricedActiveRows = pricedRows.filter((row) => row.includedInEstimate !== false);
    if (
      pricedRevision.parentRevisionId !== current.current_revision_id
      || pricedActiveRows.length !== expectedCompleteCount
      || pricedActiveRows.filter((row) => payableRowIds.includes(String(row.rowId))).some((row) =>
        Number(row.unitPrice) !== 150
        || Math.abs(Number(row.amount) - Math.round(Number(row.quantity) * 150 * 100) / 100) > 1e-8
      )
    ) {
      throw new Error("bridge_bulk_prices_not_persisted");
    }
    const bulkBaselineBuildCount = input.readRuntimeBuildTiming().runtime_build_count;
    const launched = launchUri(canonicalRevisionUri(
      pricedRevisionId,
      `native-bridge-priced:${Date.now()}`,
    ));
    if (!launched.ok) throw new Error("bridge_bulk_price_revision_launch_failed");
    const pricedObservation = await observeNativeAmendmentRevision({
      caseDir: input.caseDir,
      phase: "price-bulk",
      previous: current,
      selectedCatalogId,
      selectedWorkKey: input.registration.workId,
      canonicalOwner: input.registration.workId,
      expectedRowCount: expectedCompleteCount,
      baselineBuildCount: bulkBaselineBuildCount,
      readRuntimeBuildTiming: input.readRuntimeBuildTiming,
    });
    if (!pricedObservation || pricedObservation.current_revision_id !== pricedRevisionId) {
      throw new Error("bridge_bulk_price_ui_identity_missing");
    }
    capture(input.caseDir, "all-payable-rows-priced-150");
    current = pricedObservation;
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  return {
    observation: failures.length === 0 ? current : null,
    rowDeleteRestore,
    continuousPriceInput,
    pricedRevisionId,
    historyDisplayTitleRu,
    failures,
  };
}

function buildIdentityEvidenceLog(): string | null {
  const log = adb([
    "logcat",
    "-d",
    "-v",
    "brief",
    "ReactNativeJS:I",
    "*:S",
  ], 30_000);
  if (!log.ok) return null;
  const evidence = log.output
    .split(/\r?\n/u)
    .filter((line) => line.includes("[BuildIdentityEvidence]"));
  return evidence.at(-1) ?? null;
}

function capture(caseDir: string, name: string): { screenshot: string | null; uiDump: string | null } {
  fs.mkdirSync(caseDir, { recursive: true });
  const screenshot = path.join(caseDir, `${name}.png`);
  const uiDump = path.join(caseDir, `${name}.xml`);
  const shot = adb(["exec-out", "screencap", "-p"], 20_000);
  if (shot.ok) {
    const binary = execFileSync(adbPath(), ["-s", DEVICE_ID, "exec-out", "screencap", "-p"], {
      cwd: process.cwd(),
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 20_000,
    });
    fs.writeFileSync(screenshot, binary);
  }
  let dumped = dumpUi();
  for (let retry = 0; !dumped.ok && retry < 2; retry += 1) {
    dumped = dumpUi();
  }
  if (dumped.ok) fs.writeFileSync(uiDump, dumped.xml, "utf8");
  return { screenshot: shot.ok ? screenshot : null, uiDump: dumped.ok ? uiDump : null };
}

function requestUri(
  prompt?: string,
  autoPrepare = false,
  catalogWorkId?: string | null,
  launchNonce?: string,
): string {
  const url = new URL("rik:///request");
  if (prompt) url.searchParams.set("prompt", prompt);
  if (autoPrepare) url.searchParams.set("autoPrepare", "1");
  if (catalogWorkId) url.searchParams.set("catalogWorkId", catalogWorkId);
  if (launchNonce) url.searchParams.set("launchNonce", launchNonce);
  return url.toString();
}

function canonicalRevisionUri(revisionId: string, launchNonce: string): string {
  const url = new URL("rik:///request");
  url.searchParams.set("canonicalRevisionId", revisionId);
  url.searchParams.set("launchNonce", launchNonce);
  return url.toString();
}

async function localConsumerAuthorization(): Promise<string> {
  const response = await fetch(
    `http://127.0.0.1:${LOCAL_DEVELOPER_AUTH_BROKER_PORT}/session`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Origin: LOCAL_DEVELOPER_WEB_ORIGIN,
      },
      body: JSON.stringify({ role: "consumer" }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  const body = await response.json().catch(() => ({})) as Json;
  const accessToken = typeof body.access_token === "string" ? body.access_token : "";
  if (!response.ok || body.role !== "consumer" || !accessToken) {
    throw new Error(`NATIVE_LOCAL_CONSUMER_AUTHORIZATION_MISSING:${response.status}`);
  }
  return `Bearer ${accessToken}`;
}

async function canonicalApi(
  authorization: string,
  endpoint: string,
  init?: RequestInit,
): Promise<Json> {
  const response = await fetch(
    `${LOCAL_DEVELOPER_CANONICAL_BACKEND}/${endpoint.replace(/^\/+/, "")}`,
    {
      ...init,
      headers: {
        accept: "application/json",
        authorization,
        ...(init?.body == null ? {} : { "content-type": "application/json" }),
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(180_000),
    },
  );
  const body = await response.json().catch(() => ({})) as Json;
  if (!response.ok) {
    throw new Error(
      `NATIVE_CANONICAL_API_${response.status}:${endpoint}:${JSON.stringify(body).slice(0, 1_000)}`,
    );
  }
  return body;
}

async function waitForCanonicalJob(
  authorization: string,
  jobId: string,
): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await canonicalApi(authorization, `jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    if (["failed", "cancelled"].includes(String(job.status))) {
      throw new Error(`NATIVE_CANONICAL_JOB_${String(job.status)}:${jobId}`);
    }
    await wait(250);
  }
  throw new Error(`NATIVE_CANONICAL_JOB_TIMEOUT:${jobId}`);
}

async function allCanonicalRows(
  authorization: string,
  revisionId: string,
): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await canonicalApi(
      authorization,
      `revisions/${revisionId}/rows?${query.toString()}`,
    );
    rows.push(...(Array.isArray(page.rows) ? page.rows as Json[] : []));
    cursor = typeof page.nextCursor === "string" ? page.nextCursor : "";
  } while (cursor);
  return rows;
}

function nativeRawPrompt(registration: NativeMatrixRegistration): string {
  return registration.workId === "bridge_asphalt"
    ? `${registration.professionalNameRu}, мост 200 × 32 м (6400 м²). Подробное описание работ для исполнителя.`
    : `${registration.professionalNameRu}, площадь 120 м². Подробное описание работ для исполнителя.`;
}

async function signOutCurrentNativeSession(): Promise<boolean> {
  let snapshot = dumpUi();
  const profileTab = findNodeById(snapshot, "bottom-tab-profile");
  if (!profileTab || !tapNode(profileTab)) return false;
  await wait(1_000);
  let logoutNode: UiNode | null = null;
  for (let step = 0; step < 24; step += 1) {
    snapshot = dumpUi();
    const candidate = findNodeById(snapshot, "profile.logout.button");
    if (candidate) {
      const adjustment = nativeNodeSafeViewportAdjustment(
        candidate.bounds,
        viewport().height,
        0.18,
        0.82,
      );
      if (adjustment === "none") {
        logoutNode = candidate;
        break;
      }
      if (adjustment === "invalid") return false;
      const { width, height } = viewport();
      const x = Math.round(width * 0.9);
      const top = Math.round(height * 0.3);
      const bottom = Math.round(height * 0.7);
      const [startY, endY] = adjustment === "up" ? [bottom, top] : [top, bottom];
      adb(["shell", "input", "swipe", String(x), String(startY), String(x), String(endY), "360"], 10_000);
    } else {
      // Keep the gesture out of the nested OTA diagnostics content. A centre
      // swipe can be consumed by that child while the profile ScrollView does
      // not move, leaving the exact logout action unreachable.
      const { width, height } = viewport();
      const x = Math.round(width * 0.9);
      adb([
        "shell",
        "input",
        "swipe",
        String(x),
        String(Math.round(height * 0.72)),
        String(x),
        String(Math.round(height * 0.24)),
        "420",
      ], 10_000);
    }
    await wait(600);
  }
  if (!logoutNode || !tapNode(logoutNode)) return false;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await wait(500);
    snapshot = dumpUi();
    if (findNodeById(snapshot, "auth.login.screen")) return true;
    const confirm = snapshot.nodes.find((node) =>
      nodeHasId(node, "android:id/button1")
      && node.attrs.includes('clickable="true"')
    );
    if (confirm) tapNode(confirm);
  }
  return false;
}

function launchUri(uri: string): CommandResult {
  return run(adbPath(), buildAndroidDeepLinkLaunchArgs(DEVICE_ID, uri, PACKAGE_NAME), 25_000);
}

async function openCurrentDevBundle(port: number, forceReload = false): Promise<boolean> {
  for (const [devicePort, hostPort] of new Map<number, number>([
    [port, port],
    [8_081, port],
    [LOCAL_DEVELOPER_SUPABASE_PORT, LOCAL_DEVELOPER_SUPABASE_PORT],
    [LOCAL_DEVELOPER_AUTH_BROKER_PORT, LOCAL_DEVELOPER_AUTH_BROKER_PORT],
    [LOCAL_DEVELOPER_CANONICAL_BACKEND_PORT, LOCAL_DEVELOPER_CANONICAL_BACKEND_PORT],
  ])) {
    if (!adb(["reverse", `tcp:${devicePort}`, `tcp:${hostPort}`], 10_000).ok) return false;
  }
  // The product intentionally addresses local-only services through
  // loopback. Android's loopback belongs to the emulator, so expose the same
  // guarded provider, broker and backend used by Web before native login.
  const alreadyCurrent = dumpUi();
  if (
    !forceReload &&
    (findNodeById(alreadyCurrent, "consumer-repair-screen") || findNodeById(alreadyCurrent, "auth.login.screen"))
    && buildIdentityEvidenceLog() != null
  ) {
    return true;
  }
  adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  await wait(800);
  const uri = `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`;
  if (!launchUri(uri).ok) return false;
  const deadline = Date.now() + 180_000;
  let requestLaunched = false;
  while (Date.now() < deadline) {
    const snapshot = dumpUi();
    if (findNodeById(snapshot, "consumer-repair-screen")) return true;
    if (findNodeById(snapshot, "auth.login.screen")) return true;
    const continueNode = snapshot.nodes.find((node) => /^Continue$/i.test(node.text));
    if (continueNode) {
      tapNode(continueNode);
      await wait(2_000);
      continue;
    }
    if (snapshot.text.includes("Reload") && snapshot.text.includes("Go home") && snapshot.text.includes("TOOLS")) {
      adb(["shell", "input", "keyevent", "4"], 10_000);
      await wait(1_500);
      continue;
    }
    const server = snapshot.nodes.find((node) =>
      node.text.includes(`127.0.0.1:${port}`)
      || node.text.includes(`10.0.2.2:${port}`)
      || node.contentDesc.includes(`127.0.0.1:${port}`)
      || node.contentDesc.includes(`10.0.2.2:${port}`)
    );
    if (server) {
      tapNode(server);
      await wait(2_000);
      continue;
    }
    if (!requestLaunched && buildIdentityEvidenceLog() != null) {
      requestLaunched = launchUri(requestUri()).ok;
      await wait(2_000);
      continue;
    }
    await wait(WAIT_POLL_MS);
  }
  return false;
}

async function ensureAuthenticatedRequestRoute(_devServerPort: number): Promise<{ ok: boolean; attempted: boolean; reason: string | null }> {
  let snapshot = dumpUi();
  if (!findNodeById(snapshot, "auth.login.screen")) {
    // A visually restored session can carry an expired provider token. Every
    // acceptance run therefore signs out through the real profile action and
    // obtains a fresh consumer session through the guarded broker UI.
    if (!await signOutCurrentNativeSession()) {
      return { ok: false, attempted: false, reason: "native_existing_session_sign_out_failed" };
    }
    snapshot = await waitForId("auth.login.screen", 60_000);
  }
  const authVisible = Boolean(findNodeById(snapshot, "auth.login.screen"));
  if (!authVisible) {
    return { ok: false, attempted: false, reason: "native_local_consumer_login_screen_missing" };
  }
  if (authVisible) {
    const localConsumer = findNodeById(snapshot, "auth.login.local-consumer")
      ?? findNodeById(snapshot, "protected-identity-local-consumer-login");
    if (localConsumer) {
      if (!tapNode(localConsumer)) {
        return { ok: false, attempted: true, reason: "native_local_consumer_login_tap_failed" };
      }
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        await wait(1_500);
        snapshot = dumpUi();
        if (findNodeById(snapshot, "auth.login.error")) {
          return { ok: false, attempted: true, reason: "native_local_consumer_login_rejected" };
        }
        if (!findNodeById(snapshot, "auth.login.screen")) break;
      }
      if (findNodeById(snapshot, "auth.login.screen")) {
        return { ok: false, attempted: true, reason: "native_local_consumer_login_timeout" };
      }
    } else {
      const email = String(process.env.E2E_AUTH_EMAIL ?? process.env.E2E_CONSUMER_EMAIL ?? process.env.E2E_DIRECTOR_EMAIL ?? "").trim();
      const password = String(process.env.E2E_AUTH_PASSWORD ?? process.env.E2E_CONSUMER_PASSWORD ?? process.env.E2E_DIRECTOR_PASSWORD ?? "").trim();
      if (!email || !password) return { ok: false, attempted: false, reason: "native_auth_credentials_missing" };
      if (!await setTextInput("auth.login.email", email, 2)) return { ok: false, attempted: true, reason: "native_auth_email_fill_failed" };
      snapshot = dumpUi();
      const emailNode = findNodeById(snapshot, "auth.login.email");
      if ((emailNode?.text ?? "") !== email) return { ok: false, attempted: true, reason: "native_auth_email_exact_verification_failed" };
      if (!await setTextInput("auth.login.password", password, 2)) return { ok: false, attempted: true, reason: "native_auth_password_fill_failed" };
      let passwordSecureAndPopulated = false;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        snapshot = dumpUi();
        const passwordNode = findNodeById(snapshot, "auth.login.password");
        passwordSecureAndPopulated = Boolean(
          passwordNode?.attrs.includes('password="true"')
          && /[\u2022\u25cf*]/u.test(`${passwordNode.text}${passwordNode.contentDesc}`),
        );
        if (passwordSecureAndPopulated) break;
        await wait(750);
      }
      if (!passwordSecureAndPopulated) {
        return { ok: false, attempted: true, reason: "native_auth_secure_password_verification_failed" };
      }
      const submit = await waitForId("auth.login.submit", 30_000);
      const submitNode = findNodeById(submit, "auth.login.submit");
      if (!submitNode || !tapNode(submitNode)) return { ok: false, attempted: true, reason: "native_auth_submit_missing" };
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        await wait(1_500);
        snapshot = dumpUi();
        if (findNodeById(snapshot, "auth.login.error")) return { ok: false, attempted: true, reason: "native_auth_login_rejected" };
        if (!findNodeById(snapshot, "auth.login.screen")) break;
      }
      if (findNodeById(snapshot, "auth.login.screen")) return { ok: false, attempted: true, reason: "native_auth_login_timeout" };
    }
  }
  const launched = launchUri(requestUri());
  if (!launched.ok) return { ok: false, attempted: authVisible, reason: "native_request_route_launch_failed" };
  const request = await waitForId("consumer-repair-screen", 120_000);
  return findNodeById(request, "consumer-repair-screen")
    ? { ok: true, attempted: authVisible, reason: null }
    : { ok: false, attempted: authVisible, reason: "native_authenticated_request_route_missing" };
}

async function collectVisibleRowNames(expectedNames: string[], maxSwipes = 24): Promise<{ found: Set<string>; text: string }> {
  const found = new Set<string>();
  const snapshots: string[] = [];
  for (let index = 0; index <= maxSwipes; index += 1) {
    const snapshot = dumpUi();
    snapshots.push(snapshot.text);
    const normalized = snapshot.text.toLocaleLowerCase("ru-RU");
    for (const name of expectedNames) {
      if (normalized.includes(name.toLocaleLowerCase("ru-RU"))) found.add(name);
    }
    if (found.size === expectedNames.length) break;
    swipe("up", index % 4 === 3);
    await wait(350);
  }
  return { found, text: snapshots.join("\n") };
}

function compileExpectedExtraProfile(
  registration: NativeMatrixRegistration,
): NonNullable<ReturnType<typeof compileAsphaltRelatedProfessionalEstimateV4>> {
  if (!registration.extraProfile) {
    throw new Error(`NATIVE_EXPECTED_EXTRA_PROFILE_MISSING:${registration.workId}`);
  }
  const oracleValues: Readonly<Record<string, string | number | boolean>> =
    registration.workId === "bridge_asphalt" && registration.extraProfile
      ? (() => {
        const values: Record<string, string | number | boolean> = {
          ...registration.inputValues,
        };
        for (const key of new Set([
          "estimate_scope_mode",
          ...registration.extraProfile!.requiredParameters,
          ...ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4,
        ])) {
          const baseline = getAsphaltRelatedBaselineAssumptionV4(registration.extraProfile!, key);
          if (baseline && values[key] === undefined) values[key] = baseline.value;
        }
        // The shared surfacing owner exposes one value to both the base and
        // interlayer emulsion rows in the R9 release. Keep the native oracle on
        // that same named baseline instead of introducing an Android rate.
        values.emulsion_rate_l_m2 = values.base_emulsion_rate_l_m2;
        return values;
      })()
      : registration.inputValues;
  const compiled = compileAsphaltRelatedProfessionalEstimateV4({
    rawInput: nativeRawPrompt(registration),
    // The in-process oracle compiles the source template identity. Runtime
    // navigation separately exercises the published catalog envelope.
    selectedWorkKey: registration.extraProfile.canonicalCatalogRecordId,
    selectedTemplateId: registration.extraProfile.canonicalCatalogRecordId,
    paramOverrides: Object.fromEntries(Object.entries(oracleValues).map(([key, value]) => [
      key,
      {
        value,
        source: "user_input" as const,
        sourceText: registration.inputValues[key] === undefined
          ? getAsphaltRelatedBaselineAssumptionV4(registration.extraProfile!, key)?.sourceId
          : undefined,
      },
    ])),
  });
  if (!compiled || compiled.readiness !== "CALCULATION_READY") {
    throw new Error(
      `NATIVE_EXPECTED_EXACT_COMPILATION_NOT_READY:${registration.workId}:${JSON.stringify({
        readiness: compiled?.readiness ?? null,
        missingData: compiled?.draft.missingData ?? [],
      })}`,
    );
  }
  if (
    registration.workId === "bridge_asphalt"
    && compiled.draft.items.filter(
      (item) => item.sourceParameters?.includedInEstimate !== false,
    ).length !== 44
  ) {
    throw new Error(
      `NATIVE_EXPECTED_BRIDGE_ACTIVE_ROW_COUNT_INVALID:${compiled.draft.items.filter(
        (item) => item.sourceParameters?.includedInEstimate !== false,
      ).length}`,
    );
  }
  return compiled;
}

function expectedRowsFor(registration: NativeMatrixRegistration): { nameRu: string }[] {
  if (registration.workId === ASPHALT_DRAIN_LARGE_AREA_WORK_ID) {
    return compileAsphaltSurfaceDrainageEstimate(ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT)
      .map((row) => ({ nameRu: row.canonicalRuName }));
  }
  if (!registration.extraProfile) {
    return compileRoadworksWaveAWork(
      registration.workId,
      DEFAULT_ROADWORKS_WAVE_A_INPUTS,
      { scopeProfile: registration.scopeProfile as never },
    ).rows;
  }
  if (registration.scopeOptionTestId) return [];
  return compileExpectedExtraProfile(registration).draft.items
    .filter((item) => item.sourceParameters?.includedInEstimate !== false)
    .map((item) => ({ nameRu: item.titleRu }));
}

async function runCase(
  registration: NativeMatrixRegistration,
  artifactDir: string,
  buildIdentityEvidenceReady: boolean,
  devServerPort: number | null,
): Promise<NativeCaseResult> {
  const startedAt = Date.now();
  const caseDir = path.join(artifactDir, "cases", registration.evidenceCaseId);
  const phaseDurationsMs: Record<string, number> = {};
  const markPhase = (phase: string): void => {
    phaseDurationsMs[phase] = Date.now() - startedAt;
    fs.mkdirSync(caseDir, { recursive: true });
    const progressPath = path.join(caseDir, "progress.json");
    const temporary = `${progressPath}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify({
      schema: "asphalt-native-case-progress/v1",
      terminal: false,
      work_key: registration.workId,
      evidence_case_id: registration.evidenceCaseId,
      current_phase: phase,
      elapsed_ms: Date.now() - startedAt,
      phase_durations_ms: phaseDurationsMs,
      updated_at: new Date().toISOString(),
    }, null, 2)}\n`, "utf8");
    replaceEvidenceFileAtomically(temporary, progressPath);
  };
  const failures: string[] = [];
  const screenshots: string[] = [];
  const uiDumps: string[] = [];
  let expectedP0 = p0Keys(registration);
  const expectedRows = expectedRowsFor(registration);
  const expectedRowNames = expectedRows.map((row) => row.nameRu);
  let caseStartIsolation: NativeCaseIsolationEvidence = {
    phase: "before_case",
    pdf_viewer_returned: false,
    internal_pdf_route_was_open: false,
    internal_pdf_route_closed: true,
    history_modal_was_open: false,
    history_modal_closed: true,
    neutral_route_visible: false,
    blocking_modal_present: false,
    data_wipes: 0,
    failures: [],
  };
  let caseEndIsolation: NativeCaseIsolationEvidence | null = null;
  let precreateCompiledRevision: NativeCompiledRevisionObservation | null = null;
  let intermediateCompiledRevision: NativeCompiledRevisionObservation | null = null;
  let createCompiledRevision: NativeCompiledRevisionObservation | null = null;
  let editCompiledRevision: NativeCompiledRevisionObservation | null = null;
  let rowDeleteRestoreEvidence: NativeCaseResult["row_delete_restore"];
  let continuousPriceInputEvidence: NativeCaseResult["continuous_price_input"];
  let pricedRevisionId: string | null = null;
  let expectedApprovedHistoryTitle = registration.professionalNameRu;
  const sourceManagedBlockers = unresolvedSourceManagedKeys(registration);
  let retainedRuntimeBuildTiming = parseNativeEstimateBuildTimingEvidence("");
  const readRuntimeBuildTiming = (): NativeEstimateBuildTimingEvidence => {
    const observed = parseNativeEstimateBuildTimingEvidence(
      adb([
        "logcat",
        "-d",
        "-v",
        "brief",
        "ReactNativeJS:I",
        "*:S",
      ], 30_000).output,
    );
    if (
      observed.runtime_build_count > 0
      && observed.runtime_build_count >= retainedRuntimeBuildTiming.runtime_build_count
    ) {
      retainedRuntimeBuildTiming = observed;
    }
    return retainedRuntimeBuildTiming;
  };
  const finishAtRootFailure = (
    phaseReached: NativeCaseResult["phase_reached"],
    rootFailures: string[],
    observedP0: string[] = [],
    revisionBeforeEdit: string | null = null,
  ): NativeCaseResult => ({
    terminal_status: "FAIL",
    blocker_kind: null,
    blocked_source_parameter_keys: [],
    preliminary_projection_visible: false,
    boq_name_assertion_status: "FAIL",
    work_key: registration.workId,
    evidence_case_id: registration.evidenceCaseId,
    title: registration.professionalNameRu,
    scope_profile: registration.scopeProfile,
    expected_p0: expectedP0,
    observed_p0: observedP0,
    expected_boq_rows: expectedRows.length,
    observed_boq_rows: null,
    create: false,
    edit: false,
    cold_replay_pdf: false,
    exact_owner_visible: false,
    full_boq_visible: false,
    pdf_projection_visible: false,
    pdf_projection_mode: null,
    pdf_exact_owner_visible: false,
    pdf_full_status_visible: false,
    pdf_full_boq_visible: false,
    missing_pdf_boq_row_names: [],
    immutable_revision_visible: false,
    build_identity_evidence_ready: buildIdentityEvidenceReady,
    revision_before_edit: revisionBeforeEdit,
    revision_after_edit: null,
    precreate_compiled_revision: precreateCompiledRevision,
    intermediate_compiled_revision: intermediateCompiledRevision,
    create_compiled_revision: createCompiledRevision,
    edit_compiled_revision: editCompiledRevision,
    missing_boq_row_names: [],
    screenshots,
    ui_dumps: uiDumps,
    failures: rootFailures,
    duration_ms: Date.now() - startedAt,
    phase_durations_ms: phaseDurationsMs,
    runtime_build_timing: readRuntimeBuildTiming(),
    case_start_isolation: caseStartIsolation,
    case_end_isolation: caseEndIsolation,
    phase_reached: phaseReached,
    row_delete_restore: rowDeleteRestoreEvidence,
    continuous_price_input: continuousPriceInputEvidence,
    priced_revision_id: pricedRevisionId ?? undefined,
  });
  const finishAtSourceBlocker = (input: {
    observedP0: string[];
    observation: NativeCompiledRevisionObservation;
    fullBoqVisible: boolean;
    missingBoqRowNames: string[];
  }): NativeCaseResult => ({
    terminal_status: "BLOCKED",
    blocker_kind: "EXTERNAL_SOURCE_GAP",
    blocked_source_parameter_keys: sourceManagedBlockers,
    preliminary_projection_visible: true,
    boq_name_assertion_status: input.fullBoqVisible
      ? "PASS"
      : "NOT_RUN_SOURCE_BLOCKED",
    work_key: registration.workId,
    evidence_case_id: registration.evidenceCaseId,
    title: registration.professionalNameRu,
    scope_profile: registration.scopeProfile,
    expected_p0: expectedP0,
    observed_p0: input.observedP0,
    expected_boq_rows: expectedRows.length,
    observed_boq_rows: input.observation.compiled_row_count,
    create: false,
    edit: false,
    cold_replay_pdf: false,
    exact_owner_visible: input.observation.canonical_owner === registration.workId,
    full_boq_visible: input.fullBoqVisible,
    pdf_projection_visible: false,
    pdf_projection_mode: null,
    pdf_exact_owner_visible: false,
    pdf_full_status_visible: false,
    pdf_full_boq_visible: false,
    missing_pdf_boq_row_names: expectedRowNames,
    immutable_revision_visible: false,
    build_identity_evidence_ready: buildIdentityEvidenceReady,
    revision_before_edit: input.observation.current_revision_id,
    revision_after_edit: null,
    precreate_compiled_revision: precreateCompiledRevision,
    intermediate_compiled_revision: intermediateCompiledRevision,
    create_compiled_revision: input.observation,
    edit_compiled_revision: editCompiledRevision,
    missing_boq_row_names: input.missingBoqRowNames,
    screenshots,
    ui_dumps: uiDumps,
    failures: [],
    duration_ms: Date.now() - startedAt,
    phase_durations_ms: phaseDurationsMs,
    runtime_build_timing: readRuntimeBuildTiming(),
    case_start_isolation: caseStartIsolation,
    case_end_isolation: caseEndIsolation,
    phase_reached: "create",
  });

  markPhase("case_started");
  caseStartIsolation = await restoreNativeCaseIsolation("before_case");
  if (caseStartIsolation.failures.length > 0) {
    return finishAtRootFailure("launch", caseStartIsolation.failures);
  }
  markPhase("case_start_isolation_complete");
  if (!await discardIncompleteDiagnosticDraftIfPresent()) {
    return finishAtRootFailure("launch", ["stale_incomplete_diagnostic_draft_discard_failed"]);
  }
  markPhase("stale_incomplete_diagnostic_draft_absent");
  await returnToTop(12);
  adb(["logcat", "-c"], 15_000);
  const launchPrompt = nativeRawPrompt(registration);
  const launchBaselinePersistCount = readRuntimeBuildTiming().persist_count;
  const launch = launchUri(requestUri(
    launchPrompt,
    true,
    registration.requestedCatalogRecordId,
    `native-owner-matrix:${registration.evidenceCaseId}:${startedAt}`,
  ));
  if (!launch.ok) return finishAtRootFailure("launch", [`create_launch_failed:${launch.output.slice(0, 240)}`]);
  if (!registration.scopeOptionTestId) {
    const settledTiming = await waitForInitialRuntimePersistWithoutUiDumpContention({
      baselinePersistCount: launchBaselinePersistCount,
      readRuntimeBuildTiming,
    });
    if (!settledTiming) {
      return finishAtRootFailure("launch", [
        "first_persist_marker_missing_within_45s",
      ]);
    }
  }
  let observedP0: string[] = [];
  const transitionBaselineBuildCount = 0;
  let createPreviousRevisionId: string | null = null;
  let createBaselineRevisionOrdinal = 0;
  let createBaselineBuildCount = transitionBaselineBuildCount;
  let createExpectedBuildDelta: 0 | 1 = 1;
  if (registration.scopeOptionTestId) {
    const scope = await waitForIdSparse(registration.scopeOptionTestId, 420_000, 35_000, 10_000);
    if (!findNodeById(scope, registration.scopeOptionTestId)) {
      return finishAtRootFailure("launch", ["road_scope_option_missing_after_exact_intent"]);
    }
    const d0Timing = readRuntimeBuildTiming();
    const d0 = assessNoRevisionTransition({
      baselineBuildCount: transitionBaselineBuildCount,
      currentBuildCount: d0Timing.runtime_build_count,
      maximumBuildDelta: 1,
      visibleRevisionIds: visibleCompiledRevisionIds(scope.nodes),
    });
    if (!d0.ok) {
      return finishAtRootFailure("p0", [
        `${STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH}:d0_revision_expected_0_build_delta_expected_0_or_1`,
      ]);
    }
    const safeScopeNode = await findSafeNodeById(registration.scopeOptionTestId, 6);
    if (!safeScopeNode) {
      return finishAtRootFailure("p0", ["road_scope_option_tap_failed"]);
    }
    await wait(800);
    const settledScopeSnapshot = dumpUi();
    const settledScopeNode = findNodeById(settledScopeSnapshot, registration.scopeOptionTestId);
    if (
      !settledScopeNode
      || nativeNodeSafeViewportAdjustment(settledScopeNode.bounds, viewport().height) !== "none"
      || !tapNode(settledScopeNode)
    ) {
      return finishAtRootFailure("p0", ["road_scope_option_exact_settled_tap_failed"]);
    }
    const selectedScope = await waitForIdSparse(
      "request-estimate-selected-scope",
      180_000,
      2_000,
      2_000,
    );
    if (!findNodeById(selectedScope, "request-estimate-selected-scope")) {
      return finishAtRootFailure("p0", ["road_scope_selection_transition_missing"]);
    }
    const observedPrecreate = await observeCompiledRevisionAcrossViewport({
      caseDir,
      phase: "precreate",
      expected: {
        selectedCatalogId: registration.requestedCatalogRecordId ?? registration.workId,
        selectedWorkKey: registration.workId,
        canonicalOwner: registration.workId,
        previousRevisionId: null,
        baselineRevisionOrdinal: 0,
        expectedRevisionOrdinal: null,
        baselineBuildCount: transitionBaselineBuildCount,
        expectedBuildDelta: 1,
        expectedRowCount: null,
        expectedCalculationStatus: "needs_more_params_but_preliminary_available",
      },
      readRuntimeBuildTiming,
      allowMissingBuildTimingForBlockedSource: sourceManagedBlockers.length > 0,
    });
    if (!observedPrecreate.observation) {
      return finishAtRootFailure("p0", [
        observedPrecreate.failureToken ?? "preliminary_compiled_revision_observation_missing_after_scope",
      ]);
    }
    precreateCompiledRevision = observedPrecreate.observation;
    createPreviousRevisionId = precreateCompiledRevision.current_revision_id;
    createBaselineRevisionOrdinal = precreateCompiledRevision.revision_ordinal;

    // This collapse is only a viewport optimization. A lazy React Native
    // remount can leave the BOQ toggle reporting its previous label even when
    // the parameter panel is already safely mounted. The exact panel lookup
    // below remains the authoritative gate.
    await collapseDisclosureIfOpen("request-estimate-items-editor");
    markPhase("exact_intent_p0_disclosure_ready");
    const openedParameters = await openDisclosureAndFind(
      "request-estimate-parameters-toggle",
      "request-estimate-parameter-panel",
      24,
    );
    let initial = openedParameters.snapshot;
    if (!findNodeById(initial, "request-estimate-parameter-panel")) {
      return finishAtRootFailure("p0", ["p0_parameter_panel_missing_after_scope_selection"]);
    }
    const governedScopeMissing = await discoverGovernedScopeCriticalMissingKeys(initial);
    if (governedScopeMissing.unknownKeys.length > 0) {
      return finishAtRootFailure("p0", [
        `p0_governance_unknown_parameter:${governedScopeMissing.unknownKeys.join(",")}`,
      ]);
    }
    expectedP0 = governedScopeMissing.criticalKeys;
    observedP0 = [...expectedP0];
    if (expectedP0.length === 0 && sourceManagedBlockers.length === 0) {
      return finishAtRootFailure("p0", ["p0_governed_critical_schema_empty_after_scope_selection"]);
    }
    const missingHarnessValues = expectedP0.filter((key) =>
      !Object.prototype.hasOwnProperty.call(registration.inputValues, key)
    );
    if (missingHarnessValues.length > 0) {
      return finishAtRootFailure("p0", [
        `p0_governed_input_value_missing:${missingHarnessValues.join(",")}`,
      ], observedP0);
    }
    for (const key of expectedP0) {
      markPhase(`p0_fill_${key}_started`);
      if (!await setInlineParameter(key, rawParameterValue(registration, key), caseDir)) {
        return finishAtRootFailure("p0", [`p0_fill_failed:${key}`], observedP0);
      }
      markPhase(`p0_fill_${key}_committed`);
    }
    if (expectedP0.length > 0) {
      markPhase("p0_batch_apply_started");
      await returnToTop(20);
      if (!await tapById("editable-param-batch-apply", 16)) {
        return finishAtRootFailure("p0", ["p0_apply_failed_after_scope_selection"], observedP0);
      }
      markPhase("p0_batch_apply_tapped");
    }
    await returnToTop(20);
  } else {
    const disclosureDeadline = Date.now() + 420_000;
    let toggleLookup = await scrollToId("request-estimate-parameters-toggle", 24);
    while (!toggleLookup.node && Date.now() < disclosureDeadline) {
      await wait(5_000);
      toggleLookup = await scrollToId("request-estimate-parameters-toggle", 24);
    }
    let initial = toggleLookup.snapshot;
    const sourceGateAdvertisedBeforeOpen = initial.text.includes(
      `Источники норм (${sourceManagedBlockers.length})`,
    );
    markPhase("exact_intent_p0_disclosure_ready");
    if (!toggleLookup.node) {
      const failedCapture = capture(caseDir, "p0-root-failure");
      if (failedCapture.screenshot) screenshots.push(failedCapture.screenshot);
      if (failedCapture.uiDump) uiDumps.push(failedCapture.uiDump);
      return finishAtRootFailure("launch", ["p0_disclosure_toggle_missing_after_exact_intent"]);
    }
    const observedPrecreate = await observeCompiledRevisionAcrossViewport({
      caseDir,
      phase: "precreate",
      expected: {
        selectedCatalogId: registration.requestedCatalogRecordId ?? registration.workId,
        selectedWorkKey: registration.workId,
        canonicalOwner: registration.workId,
        previousRevisionId: null,
        baselineRevisionOrdinal: 0,
        expectedRevisionOrdinal: null,
        baselineBuildCount: transitionBaselineBuildCount,
        expectedBuildDelta: 1,
        expectedRowCount: null,
        expectedCalculationStatus: "needs_more_params_but_preliminary_available",
      },
      readRuntimeBuildTiming,
      allowMissingBuildTimingForBlockedSource: sourceManagedBlockers.length > 0,
    });
    if (!observedPrecreate.observation) {
      return finishAtRootFailure("p0", [
        observedPrecreate.failureToken ?? "preliminary_compiled_revision_observation_missing_after_exact_intent",
      ]);
    }
    precreateCompiledRevision = observedPrecreate.observation;
    createPreviousRevisionId = precreateCompiledRevision.current_revision_id;
    createBaselineRevisionOrdinal = precreateCompiledRevision.revision_ordinal;
    // Best-effort viewport normalization only; openDisclosureAndFind below
    // fails closed on the exact parameter-panel identity.
    await collapseDisclosureIfOpen("request-estimate-items-editor");
    const openedParameters = await openDisclosureAndFind(
      "request-estimate-parameters-toggle",
      "request-estimate-parameter-panel",
      24,
    );
    initial = openedParameters.snapshot;
    if (!findNodeById(initial, "request-estimate-parameter-panel")) {
      // A native deep link may dispatch twice while the first lazy runtime build is
      // still settling. The second immutable draft projection legitimately
      // remounts the screen. Reacquire the exact disclosure and accept either an
      // already-open panel or a closed toggle that can be opened now.
      await wait(45_000);
      initial = (await openDisclosureAndFind(
        "request-estimate-parameters-toggle",
        "request-estimate-parameter-panel",
        24,
      )).snapshot;
    }
    if (!findNodeById(initial, "request-estimate-parameter-panel")) {
      return finishAtRootFailure("p0", ["p0_parameter_panel_missing_after_disclosure"]);
    }
    if (sourceBlockedWithNoAdditionalUserInput(registration)) {
      expectedP0 = [];
      observedP0 = [];
      createCompiledRevision = precreateCompiledRevision;
      const visibleSourceGate = sourceGateAdvertisedBeforeOpen || initial.nodes.some((node) =>
        node.resourceId.includes("request-estimate-source-gate-")
        || node.contentDesc.includes("request-estimate-source-gate-")
      ) || initial.text.includes(`Источники норм (${sourceManagedBlockers.length})`);
      if (!visibleSourceGate || !createCompiledRevision) {
        return finishAtRootFailure("p0", ["source_managed_gate_not_visible_after_exact_intent"]);
      }
      if (!await confirmExactSourceManagedGate(sourceManagedBlockers)) {
        return finishAtRootFailure("p0", ["source_managed_gate_count_or_identity_mismatch_after_exact_intent"]);
      }
      const sourceBlockedCapture = capture(caseDir, "source-blocked");
      if (sourceBlockedCapture.screenshot) screenshots.push(sourceBlockedCapture.screenshot);
      if (sourceBlockedCapture.uiDump) uiDumps.push(sourceBlockedCapture.uiDump);
      markPhase("external_source_gate_confirmed");
      caseEndIsolation = await restoreNativeCaseIsolation("after_pdf");
      markPhase("case_end_isolation_complete");
      return finishAtSourceBlocker({
        observedP0,
        observation: createCompiledRevision,
        fullBoqVisible: false,
        missingBoqRowNames: [],
      });
    }
    const deterministicProjectKeys = deterministicOwnerSuppliedProjectKeys(registration);
    let initialP0ToFill: string[];
    if (deterministicProjectKeys) {
      expectedP0 = deterministicProjectKeys;
      const dependentKeys = new Set(registration.dependentParameterKeys);
      initialP0ToFill = expectedP0.filter((key) => !dependentKeys.has(key));
      markPhase(`p0_deterministic_current_schema_keys_${expectedP0.length}`);
      if (!await revealAllMissingParametersIfPresent()) {
        return finishAtRootFailure("p0", ["p0_show_all_missing_parameters_failed"]);
      }
      if (!await returnKnownRequestContainerToTop()) {
        return finishAtRootFailure("p0", ["p0_reanchor_after_show_all_missing_failed"]);
      }
      markPhase("p0_all_missing_parameters_revealed");
    } else {
      markPhase("p0_discovery_started");
      const governedMissing = await discoverGovernedScopeCriticalMissingKeys(
        initial,
        registration.parameterDefinitions.map((definition) => ({
          canonicalKey: definition.key,
          critical: definition.tier === "P0",
          internal: definition.key === registration.editParameterKey
            || (definition.sourceRole != null && definition.sourceRole !== "USER_PROJECT_INPUT"),
        })),
        (step, criticalCount) => markPhase(`p0_discovery_step_${step}_keys_${criticalCount}`),
      );
      markPhase("p0_discovery_complete");
      if (governedMissing.unknownKeys.length > 0) {
        return finishAtRootFailure("p0", [
          `p0_governance_unknown_parameter:${governedMissing.unknownKeys.join(",")}`,
        ]);
      }
      expectedP0 = governedMissing.criticalKeys;
      initialP0ToFill = expectedP0;
    }
    observedP0 = [];
    if (expectedP0.length === 0 && sourceManagedBlockers.length === 0) {
      return finishAtRootFailure("p0", ["p0_governed_critical_schema_empty_after_exact_intent"]);
    }
    const missingHarnessValues = expectedP0.filter((key) =>
      !Object.prototype.hasOwnProperty.call(registration.inputValues, key)
    );
    if (missingHarnessValues.length > 0) {
      return finishAtRootFailure("p0", [
        `p0_governed_input_value_missing:${missingHarnessValues.join(",")}`,
      ], observedP0);
    }
    for (const key of initialP0ToFill) {
      markPhase(`p0_fill_${key}_started`);
      if (!await setInlineParameter(key, rawParameterValue(registration, key), caseDir)) {
        return finishAtRootFailure("p0", [`p0_fill_failed:${key}`], observedP0);
      }
      observedP0.push(key);
      markPhase(`p0_fill_${key}_committed`);
    }
    if (initialP0ToFill.length > 0) {
      const d0Timing = readRuntimeBuildTiming();
      const d0Snapshot = dumpUi();
      const d0 = assessNoRevisionTransition({
        baselineBuildCount: transitionBaselineBuildCount,
        currentBuildCount: d0Timing.runtime_build_count,
        maximumBuildDelta: 1,
        visibleRevisionIds: visibleCompiledRevisionIds(d0Snapshot.nodes),
      });
      if (!d0.ok) {
        return finishAtRootFailure("p0", [
          `${STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH}:d0_revision_expected_0_build_delta_expected_0_or_1`,
        ], observedP0);
      }
      // Enum dirty-state verification finishes beside the last edited card. Start
      // the batch action lookup from the deterministic screen origin so a prior
      // retry cannot send the bidirectional search to the delivery/history tail.
      markPhase("p0_batch_apply_started");
      await returnToTop(20);
      if (!await tapById("editable-param-batch-apply", 16)) {
        return finishAtRootFailure("p0", ["p0_apply_failed"], observedP0);
      }
      markPhase("p0_batch_apply_tapped");
    }
    if (registration.dependentParameterKeys.length > 0) {
      if (!await returnKnownRequestContainerToTop(40)) {
        return finishAtRootFailure("p0", ["intermediate_post_apply_top_reanchor_failed"], observedP0);
      }
      const observedIntermediate = await observeCompiledRevisionAcrossViewport({
        caseDir,
        phase: "create-first-batch",
        expected: {
          selectedCatalogId: registration.requestedCatalogRecordId ?? registration.workId,
          selectedWorkKey: registration.workId,
          canonicalOwner: registration.workId,
          previousRevisionId: createPreviousRevisionId,
          baselineRevisionOrdinal: createBaselineRevisionOrdinal,
          baselineBuildCount: createBaselineBuildCount,
          expectedBuildDelta: createExpectedBuildDelta,
          // The first batch can legitimately retain a provisional branch until
          // dependent project choices (for example the exact backfill material)
          // are supplied. Record its exact row count, but apply the final BOQ
          // cardinality only to the child revision after those choices commit.
          expectedRowCount: null,
          expectedCalculationStatus: "needs_more_params_but_preliminary_available",
        },
        readRuntimeBuildTiming,
        allowMissingBuildTimingForBlockedSource: sourceManagedBlockers.length > 0,
      });
      if (!observedIntermediate.observation) {
        return finishAtRootFailure("p0", [
          observedIntermediate.failureToken ?? "intermediate_compiled_revision_observation_missing_after_first_batch",
        ], observedP0);
      }
      intermediateCompiledRevision = observedIntermediate.observation;
      createPreviousRevisionId = intermediateCompiledRevision.current_revision_id;
      createBaselineRevisionOrdinal = intermediateCompiledRevision.revision_ordinal;
      createBaselineBuildCount = readRuntimeBuildTiming().runtime_build_count;
      createExpectedBuildDelta = 0;
      markPhase("intermediate_compiled_revision_acknowledged");
    }
    let lastDependentSnapshot = initial;
    for (const key of registration.dependentParameterKeys) {
      const dependent = await scrollToId(`request-estimate-missing-param-${key}`, 16);
      lastDependentSnapshot = dependent.snapshot;
      if (!dependent.node) {
        return finishAtRootFailure("p0", [`dependent_p0_missing_after_first_apply:${key}`], observedP0);
      }
      if (!await setInlineParameter(key, rawParameterValue(registration, key), caseDir)) {
        return finishAtRootFailure("p0", [`dependent_p0_fill_failed:${key}`], observedP0);
      }
      observedP0.push(key);
      markPhase(`dependent_p0_fill_${key}_committed`);
    }
    if (registration.dependentParameterKeys.length > 0) {
      const firstApplyTiming = readRuntimeBuildTiming();
      const firstApply = assessNoRevisionTransition({
        baselineBuildCount: createBaselineBuildCount,
        currentBuildCount: firstApplyTiming.runtime_build_count,
        maximumBuildDelta: 0,
        visibleRevisionIds: visibleCompiledRevisionIds(lastDependentSnapshot.nodes),
      });
      if (!firstApply.ok) {
        return finishAtRootFailure("p0", [
          `${STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH}:dependent_first_apply_revision_delta_expected_0`,
        ], observedP0);
      }
      await returnToTop(20);
      if (!await tapById("editable-param-batch-apply", 16)) {
        return finishAtRootFailure("p0", ["dependent_p0_second_apply_failed"], observedP0);
      }
    }
    if (!await returnKnownRequestContainerToTop(40)) {
      return finishAtRootFailure("p0", ["create_post_apply_top_reanchor_failed"], observedP0);
    }
  }
  if (expectedP0.length === 0 && sourceManagedBlockers.length > 0) {
    createCompiledRevision = precreateCompiledRevision;
  } else {
    const observedCreate = await observeCompiledRevisionAcrossViewport({
      caseDir,
      phase: "create",
      expected: {
        selectedCatalogId: registration.requestedCatalogRecordId ?? registration.workId,
        selectedWorkKey: registration.workId,
        canonicalOwner: registration.workId,
        previousRevisionId: createPreviousRevisionId,
        baselineRevisionOrdinal: createBaselineRevisionOrdinal,
        baselineBuildCount: createBaselineBuildCount,
        expectedBuildDelta: createExpectedBuildDelta,
        expectedRowCount: expectedRows.length > 0 ? expectedRows.length : null,
        expectedCalculationStatus: registration.scopeOptionTestId || sourceManagedBlockers.length > 0
          ? "needs_more_params_but_preliminary_available"
          : "draft_ready",
      },
      readRuntimeBuildTiming,
      allowMissingBuildTimingForBlockedSource: sourceManagedBlockers.length > 0,
    });
    if (!observedCreate.observation) {
      return finishAtRootFailure("p0", [
        observedCreate.failureToken ?? "compiled_revision_observation_missing_after_p0_apply",
      ], observedP0);
    }
    createCompiledRevision = observedCreate.observation;
  }
  if (!createCompiledRevision) {
    return finishAtRootFailure("p0", ["preliminary_compiled_revision_missing_for_source_blocker"], observedP0);
  }
  markPhase("p0_compiled_projection_ready");
  if (sourceManagedBlockers.length > 0) {
    if (!await confirmExactSourceManagedGate(sourceManagedBlockers)) {
      return finishAtRootFailure("p0", ["source_managed_gate_count_or_identity_mismatch_after_user_input"], observedP0);
    }
    const sourceBlockedCapture = capture(caseDir, "source-blocked-after-user-input");
    if (sourceBlockedCapture.screenshot) screenshots.push(sourceBlockedCapture.screenshot);
    if (sourceBlockedCapture.uiDump) uiDumps.push(sourceBlockedCapture.uiDump);
    markPhase("external_source_gate_confirmed");
    caseEndIsolation = await restoreNativeCaseIsolation("after_pdf");
    markPhase("case_end_isolation_complete");
    return finishAtSourceBlocker({
      observedP0,
      observation: createCompiledRevision,
      fullBoqVisible: false,
      missingBoqRowNames: [],
    });
  }
  const appliedRowCount = createCompiledRevision.compiled_row_count;
  if (!await collapseDisclosureIfOpen("request-estimate-parameters-toggle")) {
    return finishAtRootFailure("create", ["parameter_disclosure_collapse_failed_after_p0_apply"], observedP0);
  }
  const compiledLookup = await openDisclosureAndFind(
    "request-estimate-items-editor",
    "request-estimate-items-editor-content",
    16,
  );
  const revisionBeforeEdit = createCompiledRevision.current_revision_id;
  const exactOwnerVisible = createCompiledRevision.canonical_owner === registration.workId;
  if (!compiledLookup.node) {
    return finishAtRootFailure("p0", ["compiled_boq_missing_after_p0_apply"], observedP0);
  }
  if (!exactOwnerVisible) return finishAtRootFailure("create", ["exact_owner_title_missing_after_create"], observedP0, revisionBeforeEdit);
  if (!revisionBeforeEdit) return finishAtRootFailure("create", ["create_revision_missing"], observedP0);
  const createCapture = capture(caseDir, "create");
  if (createCapture.screenshot) screenshots.push(createCapture.screenshot);
  if (createCapture.uiDump) uiDumps.push(createCapture.uiDump);
  const create = true;
  markPhase("create_complete");

  if (!await collapseDisclosureIfOpen("request-estimate-items-editor")) {
    failures.push("boq_disclosure_collapse_failed_before_edit");
  }
  const editPanel = await openDisclosureAndFind(
    "request-estimate-parameters-toggle",
    "request-estimate-parameter-panel",
    16,
  );
  if (!editPanel.node) failures.push("parameter_disclosure_open_failed_before_edit");
  if (
    editPanel.node
    && !await setInlineParameter(
      registration.editParameterKey,
      registration.editParameterValue,
      caseDir,
    )
  ) failures.push(`edit_area_failed:${registration.editParameterKey}`);
  if (failures.length > 0) {
    const failedEditCapture = capture(caseDir, "edit-area-failure");
    if (failedEditCapture.screenshot) screenshots.push(failedEditCapture.screenshot);
    if (failedEditCapture.uiDump) uiDumps.push(failedEditCapture.uiDump);
    markPhase("edit_complete");
    return {
      ...finishAtRootFailure("edit", failures, observedP0, revisionBeforeEdit),
      create,
      edit: false,
      immutable_revision_visible: false,
      revision_after_edit: null,
    };
  }
  const changedRevision = await applyEditAndWaitForChangedRevision({
    caseDir,
    previous: createCompiledRevision,
    selectedCatalogId: registration.requestedCatalogRecordId ?? registration.workId,
    selectedWorkKey: registration.workId,
    canonicalOwner: registration.workId,
    expectedCalculationStatus: createCompiledRevision.calculation_status,
    readRuntimeBuildTiming,
  });
  if (!changedRevision.applyTapped) failures.push("edit_apply_failed");
  if (changedRevision.failureToken && changedRevision.failureToken !== "edit_apply_failed") {
    failures.push(changedRevision.failureToken);
  }
  editCompiledRevision = changedRevision.observation;
  const editedDiff = await scrollToId(
    `estimate-revision-diff-param-${registration.editParameterKey}`,
    24,
  );
  const revisionAfterEdit = changedRevision.label;
  const immutableRevisionVisible = Boolean(
    revisionBeforeEdit
    && revisionAfterEdit
    && revisionBeforeEdit !== revisionAfterEdit
    && editedDiff.node,
  );
  if (!immutableRevisionVisible) failures.push("immutable_revision_edit_proof_missing");
  const editCapture = capture(caseDir, "edit");
  if (editCapture.screenshot) screenshots.push(editCapture.screenshot);
  if (editCapture.uiDump) uiDumps.push(editCapture.uiDump);
  const edit = failures.filter((failure) => failure.startsWith("edit_") || failure.includes("revision")).length === 0;
  markPhase("edit_complete");
  const finishAfterEditFailure = (rootFailures: string[]): NativeCaseResult => ({
    ...finishAtRootFailure("edit", rootFailures, observedP0, revisionBeforeEdit),
    create,
    edit,
    immutable_revision_visible: immutableRevisionVisible,
    revision_after_edit: revisionAfterEdit,
  });
  if (!edit) return finishAfterEditFailure(failures);

  if (registration.workId === "bridge_asphalt" && editCompiledRevision) {
    if (!await collapseDisclosureIfOpen("request-estimate-parameters-toggle")) {
      return finishAfterEditFailure(["bridge_parameter_disclosure_collapse_failed_before_row_acceptance"]);
    }
    const bridgeItems = await openDisclosureAndFind(
      "request-estimate-items-editor",
      "request-estimate-items-editor-content",
      24,
    );
    if (!bridgeItems.node) {
      return finishAfterEditFailure(["bridge_items_editor_missing_before_row_acceptance"]);
    }
    markPhase("bridge_row_and_price_acceptance_started");
    const bridgeAcceptance = await runBridgeNativeAmendmentAcceptance({
      caseDir,
      registration,
      initialObservation: editCompiledRevision,
      readRuntimeBuildTiming,
    });
    rowDeleteRestoreEvidence = bridgeAcceptance.rowDeleteRestore;
    continuousPriceInputEvidence = bridgeAcceptance.continuousPriceInput;
    pricedRevisionId = bridgeAcceptance.pricedRevisionId;
    expectedApprovedHistoryTitle = bridgeAcceptance.historyDisplayTitleRu
      ?? expectedApprovedHistoryTitle;
    if (!bridgeAcceptance.observation || bridgeAcceptance.failures.length > 0) {
      return finishAfterEditFailure(bridgeAcceptance.failures.length > 0
        ? bridgeAcceptance.failures
        : ["bridge_row_and_price_acceptance_missing"]);
    }
    markPhase("bridge_row_and_price_acceptance_complete");
  }

  await returnToTop(24);
  if (!await collapseDisclosureIfOpen("request-estimate-parameters-toggle")) {
    return finishAfterEditFailure(["parameter_disclosure_collapse_failed_before_history_baseline"]);
  }
  if (!await collapseDisclosureIfOpen("request-estimate-items-editor")) {
    return finishAfterEditFailure(["boq_disclosure_collapse_failed_before_history_baseline"]);
  }
  const approvedHistoryCountBefore = await readApprovedHistoryCount();
  if (approvedHistoryCountBefore == null) {
    return finishAfterEditFailure(["approved_history_baseline_missing"]);
  }
  // Approval freezes the estimate/PDF revision and intentionally does not send
  // to marketplace. Delivery contact is optional here and becomes mandatory
  // only in validateConsumerRepairRequestForMarketplace.
  const optionalContacts = await findOptionalApprovalContactInputs();
  // Android UiAutomator exposes a React Native TextInput placeholder through
  // the node's `text` attribute when its controlled value is still empty.
  // Accept only that exact native projection (or an actual empty string); any
  // user/contact value remains a contract failure.
  const optionalAddressIsEmpty = nativeOptionalControlledInputIsEmpty(optionalContacts.address, "Адрес");
  const optionalPhoneIsEmpty = nativeOptionalControlledInputIsEmpty(optionalContacts.phone, "Телефон");
  if (!optionalAddressIsEmpty || !optionalPhoneIsEmpty) {
    return finishAfterEditFailure(["approval_optional_contact_state_contract_failed"]);
  }
  if (!await dismissSoftKeyboard()) return finishAfterEditFailure(["soft_keyboard_dismiss_failed"]);
  const approveNode = await waitForEnabledId("consumer-repair-approve", 90_000);
  if (!approveNode || !tapNode(approveNode)) {
    return finishAfterEditFailure(["approve_not_enabled_or_tap_failed"]);
  }
  if (!await waitForApprovalDurableCommitStatus()) {
    return finishAfterEditFailure(["approval_durable_commit_status_missing"]);
  }
  markPhase("approval_durable_commit_complete");

  adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  await wait(1_000);
  const coldDevBundleInitiallyReady = devServerPort
    ? await openCurrentDevBundle(devServerPort, true)
    : true;
  const coldLaunch = launchUri(requestUri());
  if (!coldLaunch.ok) failures.push(`cold_launch_failed:${coldLaunch.output.slice(0, 240)}`);
  // The history action is below the initial Android viewport. Waiting for that
  // off-screen node burns the full cold-start timeout even though the exact
  // request route is already interactive; tapById performs the bounded search.
  const coldRequest = await waitForIdSparse("consumer-repair-screen", 240_000, 15_000, 6_000);
  const coldRequestReady = Boolean(findNodeById(coldRequest, "consumer-repair-screen"));
  if (!await tapById("consumer-repair-history-button", 16, 0.2, 0.66)) {
    if (!coldDevBundleInitiallyReady && !coldRequestReady) {
      failures.push("cold_dev_bundle_reconnect_failed");
    }
    failures.push("history_open_failed");
  } else {
    const modal = await waitForId("consumer-repair-history-modal", 30_000);
    if (!findNodeById(modal, "consumer-repair-history-modal")) failures.push("history_modal_missing");
  }
  const expectedApprovedRevisionId = pricedRevisionId ?? revisionAfterEdit;
  if (!await tapApprovedHistoryEntryByExactTitle(expectedApprovedHistoryTitle, expectedApprovedRevisionId)) {
    failures.push("history_exact_title_open_failed");
  } else {
    markPhase("history_exact_title_open_complete");
  }
  const history = await waitForId("consumer-repair-history-readonly-snapshot", 90_000);
  const historyExactRevisionVisible = !expectedApprovedRevisionId || Boolean(
    findNodeById(history, `consumer-repair-history-revision-${expectedApprovedRevisionId}`),
  );
  const historyExactOwner = history.text.includes(expectedApprovedHistoryTitle) && historyExactRevisionVisible;
  if (!historyExactOwner) failures.push("history_exact_owner_title_missing");
  const rowEvidence = await collectVisibleRowNames(expectedRowNames, Math.max(24, expectedRowNames.length));
  const missingBoqRowNames = expectedRowNames.filter((name) => !rowEvidence.found.has(name));
  const fullBoqVisible = missingBoqRowNames.length === 0;
  if (!fullBoqVisible) failures.push(`history_full_boq_missing:${missingBoqRowNames.length}/${expectedRowNames.length}`);
  const replayCapture = capture(caseDir, "cold-replay");
  if (replayCapture.screenshot) screenshots.push(replayCapture.screenshot);
  if (replayCapture.uiDump) uiDumps.push(replayCapture.uiDump);
  markPhase("cold_replay_complete");

  const exactHistoryPdfNode = await findSelectedHistoryInlinePdfAction(
    expectedApprovedHistoryTitle,
    expectedApprovedRevisionId,
  );
  const pdfTapped = Boolean(exactHistoryPdfNode && tapNode(exactHistoryPdfNode));
  if (!pdfTapped) failures.push("history_pdf_action_missing");
  const pdfProbe = await waitForPdfProjection(90_000);
  const pdfProjectionVisible = pdfProbe.mode != null;
  if (!pdfProjectionVisible) failures.push("native_pdf_viewer_missing");
  const pdfText = pdfProjectionVisible ? await extractGeneratedPdfText(pdfProbe.fileName) : null;
  if (!pdfText) failures.push("native_pdf_bytes_or_text_missing");
  const normalizedPdfText = pdfText?.toLocaleLowerCase("ru-RU") ?? "";
  const pdfExactOwnerVisible = normalizedPdfText.includes(expectedApprovedHistoryTitle.toLocaleLowerCase("ru-RU"));
  if (!pdfExactOwnerVisible) failures.push("native_pdf_exact_owner_missing");
  const pdfFullStatusVisible = normalizedPdfText.includes("статус: полная");
  if (!pdfFullStatusVisible) failures.push("native_pdf_full_status_missing");
  const missingPdfBoqRowNames = expectedRowNames.filter((name) =>
    !normalizedPdfText.includes(name.toLocaleLowerCase("ru-RU"))
  );
  const pdfFullBoqVisible = missingPdfBoqRowNames.length === 0;
  if (!pdfFullBoqVisible) {
    failures.push(`native_pdf_full_boq_missing:${missingPdfBoqRowNames.length}/${expectedRowNames.length}`);
  }
  const pdfCapture = capture(caseDir, "pdf");
  if (pdfCapture.screenshot) screenshots.push(pdfCapture.screenshot);
  if (pdfCapture.uiDump) uiDumps.push(pdfCapture.uiDump);
  caseEndIsolation = await restoreNativeCaseIsolation("after_pdf", pdfProbe.mode);
  failures.push(...caseEndIsolation.failures);
  markPhase("case_end_isolation_complete");

  const coldReplayPdf = historyExactOwner
    && fullBoqVisible
    && pdfProjectionVisible
    && pdfExactOwnerVisible
    && pdfFullStatusVisible
    && pdfFullBoqVisible;
  const runtimeBuildTiming = readRuntimeBuildTiming();
  failures.push(...runtimeBuildTiming.failures);
  if (screenshots.length !== 4) {
    failures.push(`mandatory_png_count_expected_4_received_${screenshots.length}`);
  }
  if (uiDumps.length !== 4) {
    failures.push(`mandatory_xml_count_expected_4_received_${uiDumps.length}`);
  }
  markPhase("pdf_projection_complete");
  return {
    terminal_status: failures.length === 0 ? "PASS" : "FAIL",
    blocker_kind: null,
    blocked_source_parameter_keys: [],
    preliminary_projection_visible: false,
    boq_name_assertion_status: fullBoqVisible ? "PASS" : "FAIL",
    work_key: registration.workId,
    evidence_case_id: registration.evidenceCaseId,
    title: registration.professionalNameRu,
    scope_profile: registration.scopeProfile,
    expected_p0: expectedP0,
    observed_p0: observedP0,
    expected_boq_rows: expectedRows.length,
    observed_boq_rows: appliedRowCount,
    create,
    edit,
    cold_replay_pdf: coldReplayPdf,
    exact_owner_visible: exactOwnerVisible && historyExactOwner,
    full_boq_visible: fullBoqVisible,
    pdf_projection_visible: pdfProjectionVisible,
    pdf_projection_mode: pdfProbe.mode,
    pdf_exact_owner_visible: pdfExactOwnerVisible,
    pdf_full_status_visible: pdfFullStatusVisible,
    pdf_full_boq_visible: pdfFullBoqVisible,
    missing_pdf_boq_row_names: missingPdfBoqRowNames,
    immutable_revision_visible: immutableRevisionVisible,
    build_identity_evidence_ready: buildIdentityEvidenceReady,
    revision_before_edit: revisionBeforeEdit,
    revision_after_edit: revisionAfterEdit,
    precreate_compiled_revision: precreateCompiledRevision,
    intermediate_compiled_revision: intermediateCompiledRevision,
    create_compiled_revision: createCompiledRevision,
    edit_compiled_revision: editCompiledRevision,
    missing_boq_row_names: missingBoqRowNames,
    screenshots,
    ui_dumps: uiDumps,
    failures,
    duration_ms: Date.now() - startedAt,
    phase_durations_ms: phaseDurationsMs,
    runtime_build_timing: runtimeBuildTiming,
    case_start_isolation: caseStartIsolation,
    case_end_isolation: caseEndIsolation,
    phase_reached: pdfProjectionVisible ? "pdf" : "cold_replay",
    row_delete_restore: rowDeleteRestoreEvidence,
    continuous_price_input: continuousPriceInputEvidence,
    priced_revision_id: pricedRevisionId ?? undefined,
  };
}

function parseOptions(): CliOptions {
  const args = process.argv.slice(2);
  const value = (prefix: string): string | null => args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
  const devServerPortRaw = value("--dev-server-port=");
  const diagnosticWorkCountRaw = value("--diagnostic-work-count=");
  const diagnosticWorkCount = diagnosticWorkCountRaw == null ? null : Number(diagnosticWorkCountRaw);
  const diagnosticStartIndexRaw = value("--diagnostic-start-index=");
  const matrixScopeRaw = value("--matrix-scope=") ?? "old35";
  if (matrixScopeRaw !== "old35" && matrixScopeRaw !== "extra9" && matrixScopeRaw !== "all44") {
    throw new Error(`NATIVE_MATRIX_SCOPE_INVALID:${matrixScopeRaw}`);
  }
  return {
    runId: value("--run-id=") ?? "",
    diagnosticWorkKey: value("--diagnostic-work-key="),
    diagnosticWorkCount,
    diagnosticStartIndex: diagnosticStartIndexRaw == null ? 0 : Number(diagnosticStartIndexRaw),
    expectedCommit: value("--expected-commit=") ?? "",
    expectedTree: value("--expected-tree=") ?? "",
    devServerPort: devServerPortRaw ? Number(devServerPortRaw) : null,
    allowDirtyDiagnostic: args.includes("--allow-dirty-diagnostic"),
    clearAppData: args.includes("--clear-app-data"),
    forceDevReload: args.includes("--force-dev-reload"),
    matrixScope: matrixScopeRaw,
    r9Diagnostic: args.includes("--r9-diagnostic"),
    activeOwnerPath: value("--active-owner-path="),
  };
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

type TerminalEvidenceProvenance = {
  candidate_sha: string;
  tree_hash: string;
  run_id: string;
  evidence_kind: "diagnostic" | "full";
};

function collectArtifactHashes(artifactDir: string): { path: string; bytes: number; sha256: string }[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (!/^artifact-manifest\.json(?:\.sha256)?$/.test(entry.name)) files.push(entryPath);
    }
  };
  visit(artifactDir);
  return files.sort().map((filePath) => ({
    path: path.relative(artifactDir, filePath).split(path.sep).join("/"),
    bytes: fs.statSync(filePath).size,
    sha256: sha256(fs.readFileSync(filePath)),
  }));
}

function persistTerminalCaseEvidence(
  artifactDir: string,
  caseNumber: number,
  result: NativeCaseResult,
  provenance: TerminalEvidenceProvenance,
): void {
  const caseDir = path.join(artifactDir, "cases", result.evidence_case_id);
  fs.mkdirSync(caseDir, { recursive: true });
  if (result.failures.length > 0 && result.screenshots.length === 0 && result.ui_dumps.length === 0) {
    const failureCapture = capture(caseDir, `terminal-${result.phase_reached}-failure`);
    if (failureCapture.screenshot) result.screenshots.push(failureCapture.screenshot);
    if (failureCapture.uiDump) result.ui_dumps.push(failureCapture.uiDump);
  }
  const ledgerPath = path.join(caseDir, "terminal-case-result.json");
  const ledger = {
    schema: "asphalt-native-terminal-case-result/v1",
    ...provenance,
    case_number: caseNumber,
    terminal: true,
    result,
  };
  fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    `${ledgerPath}.sha256`,
    `${sha256(fs.readFileSync(ledgerPath))}  ${path.basename(ledgerPath)}\n`,
    "utf8",
  );
  const progressPath = path.join(caseDir, "progress.json");
  const progressTemporary = `${progressPath}.${process.pid}.tmp`;
  fs.writeFileSync(progressTemporary, `${JSON.stringify({
    schema: "asphalt-native-case-progress/v1",
    terminal: true,
    terminal_status: result.terminal_status,
    work_key: result.work_key,
    evidence_case_id: result.evidence_case_id,
    current_phase: result.phase_reached,
    elapsed_ms: result.duration_ms,
    phase_durations_ms: result.phase_durations_ms,
    updated_at: new Date().toISOString(),
  }, null, 2)}\n`, "utf8");
  replaceEvidenceFileAtomically(progressTemporary, progressPath);
}

async function main(): Promise<void> {
  const options = parseOptions();
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const status = git(["status", "--porcelain=v1"]);
  const dirty = Boolean(status.trim());
  const subjectPatchHash = sha256(git(["diff", "--binary", "HEAD"]));
  const expectedIdentityToken = options.expectedCommit;
  const evidenceKind: "diagnostic" | "full" = options.r9Diagnostic || options.diagnosticWorkKey || options.diagnosticWorkCount != null
    ? "diagnostic"
    : "full";
  const runIdValid = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(options.runId);
  const safeRunId = runIdValid ? options.runId : `invalid-run-id-${process.pid}`;
  const evidenceRoot = options.matrixScope === "old35" && !options.r9Diagnostic
    ? "asphalt-v3-final-r6"
    : "asphalt-related-r9";
  const artifactDir = path.join(
    process.cwd(),
    ".release-runtime",
    evidenceRoot,
    head,
    safeRunId,
    evidenceKind,
  );
  const artifactDirWasNonEmpty = fs.existsSync(artifactDir) && fs.readdirSync(artifactDir).length > 0;
  fs.mkdirSync(artifactDir, { recursive: true });
  const activeOwnerPath = options.activeOwnerPath
    ? path.resolve(process.cwd(), options.activeOwnerPath)
    : path.join(
      process.cwd(),
      ".release-runtime",
      evidenceRoot,
      "ACTIVE_CANDIDATE_OWNER.json",
    );
  let activeOwner: Record<string, unknown> | null = null;
  try {
    activeOwner = JSON.parse(fs.readFileSync(activeOwnerPath, "utf8")) as Record<string, unknown>;
  } catch {
    activeOwner = null;
  }
  const activeOwnerMatches = activeOwner?.["candidate_sha"] === head
    && activeOwner?.["tree_hash"] === tree;

  const device = adb(["shell", "getprop", "ro.build.version.sdk"], 10_000);
  const packageProbe = adb(["shell", "pm", "path", PACKAGE_NAME], 10_000);
  const failures: string[] = [];
  if (!runIdValid) failures.push("run_id_invalid_or_missing");
  if (artifactDirWasNonEmpty) failures.push("run_output_root_not_empty");
  if (!device.ok || device.output.trim() !== API_LEVEL) failures.push(`api_level_expected_34_received_${device.output.trim() || "missing"}`);
  if (!packageProbe.ok || !packageProbe.output.includes("package:")) failures.push("native_package_not_installed");
  if (head !== options.expectedCommit) {
    failures.push(`ACTIVE_GOAL_IDENTITY_MISMATCH:commit_expected_${options.expectedCommit || "missing"}_received_${head}`);
  }
  if (tree !== options.expectedTree) {
    failures.push(`ACTIVE_GOAL_IDENTITY_MISMATCH:tree_expected_${options.expectedTree || "missing"}_received_${tree}`);
  }
  if (!activeOwnerMatches) failures.push("ACTIVE_GOAL_IDENTITY_MISMATCH:owner_commit_tree");
  if (dirty && !options.allowDirtyDiagnostic) failures.push("worktree_not_clean_for_native_acceptance");
  if (options.diagnosticWorkKey && options.diagnosticWorkCount != null) {
    failures.push("diagnostic_work_key_and_count_are_mutually_exclusive");
  }
  if (options.r9Diagnostic && (options.diagnosticWorkKey || options.diagnosticWorkCount != null)) {
    failures.push("r9_diagnostic_and_legacy_diagnostic_are_mutually_exclusive");
  }
  if (
    options.diagnosticWorkCount != null
    && (
      !Number.isInteger(options.diagnosticWorkCount)
      || options.diagnosticWorkCount < 2
      || options.diagnosticWorkCount > 5
    )
  ) {
    failures.push(`diagnostic_work_count_expected_2_to_5_received_${options.diagnosticWorkCount}`);
  }
  if (
    !Number.isInteger(options.diagnosticStartIndex)
    || options.diagnosticStartIndex < 0
    || options.diagnosticStartIndex >= (
      options.matrixScope === "old35"
        ? RoadworksWaveAProductionRegistry.length
        : options.matrixScope === "extra9"
          ? ASPHALT_RELATED_EXTRA_NATIVE_REGISTRY.length
          : RoadworksWaveAProductionRegistry.length + ASPHALT_RELATED_EXTRA_NATIVE_REGISTRY.length
    )
    || (options.diagnosticWorkCount == null && options.diagnosticStartIndex !== 0)
  ) {
    failures.push(`diagnostic_start_index_invalid:${options.diagnosticStartIndex}`);
  }

  if (options.clearAppData) {
    const clear = adb(["shell", "pm", "clear", PACKAGE_NAME], 20_000);
    if (!clear.ok || !clear.output.includes("Success")) failures.push(`app_data_clear_failed:${clear.output.slice(0, 200)}`);
  }
  if (failures.length === 0) adb(["logcat", "-c"], 20_000);
  if (options.devServerPort && failures.length === 0) {
    if (!await openCurrentDevBundle(options.devServerPort, options.forceDevReload)) {
      failures.push("current_dev_bundle_not_ready");
    }
  } else if (failures.length === 0) {
    adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
    launchUri(requestUri());
    await waitForId("consumer-repair-screen", 120_000);
  }
  let authResult = { ok: false, attempted: false, reason: "native_bootstrap_not_run" as string | null };
  let appBuildIdentityMatches = false;
  if (failures.length === 0) {
    authResult = await ensureAuthenticatedRequestRoute(options.devServerPort ?? 8081);
    if (!authResult.ok) failures.push(authResult.reason ?? "native_authenticated_request_route_missing");
    if (authResult.ok) {
      const identityDeadline = Date.now() + 30_000;
      while (Date.now() < identityDeadline && !appBuildIdentityMatches) {
        appBuildIdentityMatches = buildIdentityEvidenceLog()?.includes(expectedIdentityToken) === true;
        if (!appBuildIdentityMatches) await wait(WAIT_POLL_MS);
      }
      if (!appBuildIdentityMatches) failures.push("native_build_identity_evidence_expected_commit_missing");
    }
  }

  const baseRegistry = options.matrixScope === "old35"
    ? ROADWORKS_NATIVE_REGISTRY
    : options.matrixScope === "extra9"
      ? ASPHALT_RELATED_EXTRA_NATIVE_REGISTRY
      : Object.freeze([...ROADWORKS_NATIVE_REGISTRY, ...ASPHALT_RELATED_EXTRA_NATIVE_REGISTRY]);
  const asphaltConcreteProfile = ASPHALT_RELATED_EXTRA_PROFILES_V4.find(
    (profile) => profile.canonicalWorkKey === "asphalt_concrete_pavement",
  );
  const demolitionProfile = ASPHALT_RELATED_EXTRA_PROFILES_V4.find(
    (profile) => profile.canonicalWorkKey === "asphalt_demolition",
  );
  const r9DiagnosticRegistry = asphaltConcreteProfile && demolitionProfile
    ? [
      extraNativeRegistration(asphaltConcreteProfile, {
        scopeOptionTestId: "road-scope-option-full_road_infrastructure",
        evidenceCaseId: "diagnostic-full-road-infrastructure",
      }),
      extraNativeRegistration(demolitionProfile, {
        evidenceCaseId: "diagnostic-demolition-no-haul",
      }),
      extraNativeRegistration(demolitionProfile, {
        evidenceCaseId: "diagnostic-demolition-with-haul",
        dependentParameterKeys: ["haul_distance_km", "truck_payload_t"],
        inputValues: {
          ...ASPHALT_RELATED_NATIVE_INPUTS,
          haul_required: true,
          haul_distance_km: 20,
          truck_payload_t: 20,
        },
      }),
    ]
    : [];
  const selected = options.r9Diagnostic
    ? r9DiagnosticRegistry
    : options.diagnosticWorkKey
      ? baseRegistry.filter((item) => item.workId === options.diagnosticWorkKey)
      : options.diagnosticWorkCount != null
        ? Array.from(
          { length: options.diagnosticWorkCount },
          (_, offset) => options.matrixScope === "old35"
            ? ROADWORKS_NATIVE_REGISTRY[
              (options.diagnosticStartIndex + offset) % RoadworksWaveAProductionRegistry.length
            ]
            : baseRegistry[(options.diagnosticStartIndex + offset) % baseRegistry.length],
        )
        : [...baseRegistry];
  if (options.r9Diagnostic && selected.length !== 3) failures.push("r9_diagnostic_registry_expected_3");
  if (selected.length === 0) failures.push(`unknown_diagnostic_work_key:${options.diagnosticWorkKey}`);
  const results: NativeCaseResult[] = [];
  if (failures.length === 0) {
    for (const [caseIndex, registration] of selected.entries()) {
      const result = await runCase(registration, artifactDir, appBuildIdentityMatches, options.devServerPort);
      persistTerminalCaseEvidence(artifactDir, caseIndex + 1, result, {
        candidate_sha: head,
        tree_hash: tree,
        run_id: options.runId,
        evidence_kind: evidenceKind,
      });
      results.push(result);
      console.info(`NATIVE_ANDROID_API34 ${registration.workId} create=${result.create} edit=${result.edit} replay_pdf=${result.cold_replay_pdf} failures=${result.failures.length}`);
      if (result.failures.length > 0) break;
    }
  }

  const createCount = results.filter((result) => result.create).length;
  const editCount = results.filter((result) => result.edit).length;
  const replayCount = results.filter((result) => result.cold_replay_pdf).length;
  const runtimeBudgetCount = results.filter((result) => result.runtime_build_timing.performance_budget_green).length;
  const duplicateBuildCount = results.reduce((sum, result) => sum + result.runtime_build_timing.duplicate_build_count, 0);
  const blockedCount = results.filter((result) => result.terminal_status === "BLOCKED").length;
  const allFailures = [
    ...failures,
    ...results.flatMap((result) => result.failures.map((failure) => `${result.work_key}:${failure}`)),
  ];
  const fullAcceptance = selected.length === 35;
  const extraAcceptance = options.matrixScope === "extra9" && !options.r9Diagnostic && selected.length === 9;
  const r9FullAcceptance = options.matrixScope === "all44" && !options.r9Diagnostic && selected.length === 44;
  const green = allFailures.length === 0
    && blockedCount === 0
    && createCount === selected.length
    && editCount === selected.length
    && replayCount === selected.length
    && (!(fullAcceptance || extraAcceptance || r9FullAcceptance) || (!dirty && head === options.expectedCommit));
  const artifact = {
    schema: extraAcceptance || r9FullAcceptance || options.r9Diagnostic
      ? "asphalt-r9-native-expo-react-native-api34-matrix:v1"
      : "asphalt-35-native-expo-react-native-api34-matrix:v1",
    final_status: green
      ? r9FullAcceptance
        ? "GREEN_NATIVE_ANDROID_API34_ASPHALT_R9_M44X3"
        : extraAcceptance
        ? "GREEN_NATIVE_ANDROID_API34_ASPHALT_R9_EXTRA_9X3"
        : fullAcceptance
          ? "GREEN_NATIVE_ANDROID_API34_ASPHALT_35X3"
          : options.r9Diagnostic
            ? "GREEN_NATIVE_ANDROID_API34_ASPHALT_R9_DIAGNOSTIC_3X3"
            : "GREEN_NATIVE_ANDROID_API34_DIAGNOSTIC"
      : allFailures.length === 0 && blockedCount > 0 && results.length === selected.length
        ? "BLOCKED_NATIVE_ANDROID_API34_EXTERNAL_SOURCE_GAPS"
      : options.diagnosticWorkKey || options.diagnosticWorkCount != null
        ? "RED_NATIVE_ANDROID_API34_DIAGNOSTIC"
      : extraAcceptance || r9FullAcceptance || options.r9Diagnostic
        ? "RED_NATIVE_ANDROID_API34_ASPHALT_R9"
        : "RED_NATIVE_ANDROID_API34_ASPHALT_35X3",
    target: "native_expo_react_native",
    automation: "adb_uiautomator",
    package_name: PACKAGE_NAME,
    device_id: DEVICE_ID,
    api_level: device.output.trim(),
    android_chrome_results_not_counted_as_native: true,
    connect_over_cdp_used: false,
    native_expo_react_native_runtime_executed: results.length > 0,
    native_auth_boundary_bypassed: false,
    native_auth_login_attempted: authResult.attempted,
    native_auth_login_completed: authResult.ok,
    native_build_identity_matches_expected_commit: appBuildIdentityMatches,
    run_id: options.runId,
    evidence_kind: evidenceKind,
    active_candidate_owner_path: activeOwnerPath,
    active_candidate_owner_matches: activeOwnerMatches,
    source_head: head,
    expected_commit: options.expectedCommit,
    expected_tree: options.expectedTree,
    committed_tree_hash: tree,
    subject_patch_sha256: subjectPatchHash,
    worktree_clean: !dirty,
    dirty_diagnostic_allowed: options.allowDirtyDiagnostic,
    diagnostic_work_key: options.diagnosticWorkKey,
    diagnostic_work_count: options.diagnosticWorkCount,
    matrix_scope: options.matrixScope,
    r9_diagnostic: options.r9Diagnostic,
    exact_bridge_geometry: selected.some((item) => item.workId === "bridge_asphalt")
      ? {
        work_key: "bridge_asphalt",
        length_m: 200,
        width_m: 32,
        expected_area_m2: 6_400,
        prompt: nativeRawPrompt(selected.find((item) => item.workId === "bridge_asphalt")!),
      }
      : null,
    source_status: status.split(/\r?\n/).filter(Boolean),
    package_probe: packageProbe.output.trim(),
    native_android_api34_create: `${createCount}/${selected.length}`,
    native_android_api34_edit: `${editCount}/${selected.length}`,
    native_android_api34_cold_replay_pdf: `${replayCount}/${selected.length}`,
    native_android_api34: `${createCount + editCount + replayCount}/${selected.length * 3}`,
    terminal_pass: `${results.filter((result) => result.terminal_status === "PASS").length}/${selected.length}`,
    terminal_blocked: `${blockedCount}/${selected.length}`,
    terminal_fail: `${results.filter((result) => result.terminal_status === "FAIL").length}/${selected.length}`,
    terminal_not_run: `${selected.length - results.length}/${selected.length}`,
    old_35_subset: r9FullAcceptance ? {
      create: `${results.slice(0, 35).filter((result) => result.create).length}/35`,
      edit: `${results.slice(0, 35).filter((result) => result.edit).length}/35`,
      cold_replay_pdf: `${results.slice(0, 35).filter((result) => result.cold_replay_pdf).length}/35`,
      total: `${results.slice(0, 35).reduce((sum, result) => sum + Number(result.create) + Number(result.edit) + Number(result.cold_replay_pdf), 0)}/105`,
    } : null,
    extra_9_subset: r9FullAcceptance ? {
      create: `${results.slice(35).filter((result) => result.create).length}/9`,
      edit: `${results.slice(35).filter((result) => result.edit).length}/9`,
      cold_replay_pdf: `${results.slice(35).filter((result) => result.cold_replay_pdf).length}/9`,
      total: `${results.slice(35).reduce((sum, result) => sum + Number(result.create) + Number(result.edit) + Number(result.cold_replay_pdf), 0)}/27`,
    } : null,
    runtime_draft_ready_within_30s: `${runtimeBudgetCount}/${selected.length}`,
    first_persist_within_45s: `${runtimeBudgetCount}/${selected.length}`,
    duplicate_build_count: duplicateBuildCount,
    required_full_counts: r9FullAcceptance
      ? { create: "44/44", edit: "44/44", cold_replay_pdf: "44/44", total: "132/132" }
      : extraAcceptance
      ? { create: "9/9", edit: "9/9", cold_replay_pdf: "9/9", total: "27/27" }
      : {
        create: "35/35",
        edit: "35/35",
        cold_replay_pdf: "35/35",
        total: "105/105",
      },
    results,
    failures: allFailures,
    generated_at: new Date().toISOString(),
    fake_green_claimed: false,
  };
  const artifactPath = path.join(
    artifactDir,
    options.r9Diagnostic
      ? "r9-diagnostic-3-result.json"
      : options.diagnosticWorkKey
      ? "diagnostic-result.json"
      : options.diagnosticWorkCount != null
        ? `diagnostic-${options.diagnosticWorkCount}-result.json`
        : r9FullAcceptance
          ? "ASPHALT_R9_ANDROID_M44X3_RESULT.json"
          : extraAcceptance
          ? "asphalt-r9-extra-9-native-api34-27-result.json"
          : "asphalt-35-native-api34-105-result.json",
  );
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  fs.writeFileSync(`${artifactPath}.sha256`, `${sha256(fs.readFileSync(artifactPath))}  ${path.basename(artifactPath)}\n`, "utf8");
  const manifestPath = path.join(artifactDir, "artifact-manifest.json");
  const manifest = {
    schema: "asphalt-native-run-artifact-manifest/v1",
    candidate_sha: head,
    tree_hash: tree,
    run_id: options.runId,
    evidence_kind: evidenceKind,
    files: collectArtifactHashes(artifactDir),
    generated_at: new Date().toISOString(),
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.writeFileSync(`${manifestPath}.sha256`, `${sha256(fs.readFileSync(manifestPath))}  ${path.basename(manifestPath)}\n`, "utf8");
  console.info(JSON.stringify({
    final_status: artifact.final_status,
    artifact_path: artifactPath,
    native_android_api34_create: artifact.native_android_api34_create,
    native_android_api34_edit: artifact.native_android_api34_edit,
    native_android_api34_cold_replay_pdf: artifact.native_android_api34_cold_replay_pdf,
    native_android_api34: artifact.native_android_api34,
    failures: allFailures,
  }, null, 2));
  if (!green) process.exitCode = 1;
}

void main();
