import fs from "node:fs";
import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Browser, type BrowserContext, type Locator, type Page, type Route } from "playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

const projectRoot = process.cwd();
dotenv.config({ path: path.join(projectRoot, ".env.staging.local"), override: false });
dotenv.config({ path: path.join(projectRoot, ".env.office-e2e.local"), override: false });

type SmokeTarget = "web" | "android-chrome";
type SmokeFilePayload = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};
type BrowserFilePayload = {
  name: string;
  mimeType: string;
  base64: string;
};
const smokeTarget: SmokeTarget = process.env.MARKET_ADD_SMOKE_TARGET === "android-chrome"
  ? "android-chrome"
  : "web";
const liveE2E = String(process.env.LIVE_E2E || "") === "1";
const fakeSupabaseUrl = "http://127.0.0.1:54321";
const artifactBaseName = liveE2E
  ? "market-add-live-staging-media-publish-smoke"
  : smokeTarget === "android-chrome"
  ? "market-add-android-chrome-media-publish-smoke"
  : "market-add-web-media-publish-smoke";
const artifactJsonPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.json`);
const artifactMdPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.md`);
const screenshotPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.png`);
const serverStdoutPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.stdout.log`);
const serverStderrPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.stderr.log`);

const USER_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const PHOTO_LIMIT = 7;
const VIDEO_LIMIT = 1;
const MARKET_FEED_FIRST_CONTENT_BUDGET_MS = 1_000;
const MARKET_FEED_FULL_ROUTE_BUDGET_MS = 1_500;
const ANDROID_CHROME_MARKET_FEED_FULL_ROUTE_BUDGET_MS = 2_500;
const ANDROID_MARKET_OPEN_BUDGET_MS = 900;
const ANDROID_PRODUCT_DETAIL_OPEN_BUDGET_MS = 500;
const ANDROID_CREATE_LISTING_OPEN_BUDGET_MS = 1_000;
const ANDROID_THUMBNAIL_RENDER_AFTER_PICK_BUDGET_MS = 500;
const ANDROID_PUBLISH_WITH_MEDIA_BUDGET_MS = 5_000;
const MY_LISTINGS_FIRST_CONTENT_BUDGET_MS = 1_000;
const PRODUCT_INSTANT_OPEN_BUDGET_MS = 300;
const WEBM_TIMECODE_SCALE_DEFAULT_NS = 1_000_000;
const EXPECTED_STAGING_PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const LIVE_RUNTIME_ROOT = path.join(projectRoot, ".release-runtime", "market-create-media-publish-hard-closeout");
const SUPABASE_AUTH_STORAGE_KEYS = [
  "sb-nxrnjywzxxfdpqmzjorh-auth-token",
  "sb-127-auth-token",
  "sb-127.0.0.1-auth-token",
] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

type FakeSupabaseCapture = {
  currentScenarioKind: ListingKind;
  scenarios: Record<ListingKind, FakeSupabaseScenarioCapture>;
  unhandledRequests: { method: string; url: string }[];
};

type ListingKind = "material" | "work" | "service" | "delivery" | "rent";

type SmokeScenario = {
  kind: ListingKind;
  photoCount: number;
  videoCount: number;
  listingId: string;
  title: string;
  description: string;
  price: string;
  unit: string;
};

type FakeSupabaseScenarioCapture = {
  uploadSessionRequests: unknown[];
  uploadedStoragePaths: string[];
  completedUploadRequests: unknown[];
  listingInsertPayloads: unknown[];
  mediaConfirmRequests: unknown[];
};

type ScenarioSmokeResult = {
  kind: ListingKind;
  photoCount: number;
  videoCount: number;
  listingId: string;
  selectedPhotoCount: number;
  selectedVideoCount: number;
  selectedPhotoDisplayed: boolean;
  selectedVideoDisplayed: boolean;
  previewModalDisplayed: boolean;
  listingInserted: boolean;
  mediaLinkConfirmed: boolean;
  productImageDisplayed: boolean;
  productGalleryThumbCount: number;
  productVideoThumbDisplayed: boolean;
  marketCardImageDisplayed: boolean;
  myListingVisible: boolean;
  myListingMediaVisible: boolean;
  myListingAfterRefreshVisible: boolean;
  myListingAfterReloginVisible: boolean;
  marketFirstContentMs: number | null;
  marketOpenMs: number | null;
  myListingsFirstContentMs: number | null;
  productOpenMs: number | null;
  createListingOpenMs: number | null;
  thumbnailRenderAfterPickMs: number | null;
  publishWithMediaMs: number | null;
  insertedMediaAssetIds: string[];
  insertedMediaAssets: { mediaAssetId: string; mediaKind: string }[];
  confirmPurposes: string[];
  fieldValuesBeforePublish: string[];
  publishButtonDisabled: boolean | null;
  publishStateText: string | null;
  errorSummaryText: string | null;
  uploadSessionCount: number;
  storageUploadCount: number;
  completedUploadCount: number;
};

type MarketScrollTopProof = {
  visibleAfterScroll: boolean;
  scrollsToAbsoluteTop: boolean;
  doesNotStepOneCard: boolean;
  doesNotRequireMultipleClicks: boolean;
  positionBeforeClickPx: number | null;
  positionAfterClickPx: number | null;
  maxScrollTopPx: number | null;
  firstListingVisibleAfterScrollTop: boolean;
  filterHeaderVisibleAfterScrollTop: boolean;
};

type MarketScrollState = {
  scrollTop: number;
  maxScrollTop: number;
  filterHeaderVisible: boolean;
  firstListingVisible: boolean;
};

type SmokeResult = {
  checkedAt: string;
  status: "GREEN" | "NOT_GREEN";
  target: SmokeTarget;
  baseUrl: string;
  currentUrl: string | null;
  openStep: string | null;
  webServerStartedByVerifier: boolean;
  photoLimit: typeof PHOTO_LIMIT;
  videoLimit: typeof VIDEO_LIMIT;
  selectedPhotoCount: number;
  selectedVideoDisplayed: boolean;
  selectedPhotoDisplayed: boolean;
  previewModalDisplayed: boolean;
  scenarioResults: ScenarioSmokeResult[];
  slowestMarketFirstContentMs: number | null;
  slowestMarketOpenMs: number | null;
  slowestMyListingsFirstContentMs: number | null;
  slowestProductOpenMs: number | null;
  slowestCreateListingOpenMs: number | null;
  slowestThumbnailRenderAfterPickMs: number | null;
  slowestPublishWithMediaMs: number | null;
  androidMarketOpenMs: number | null;
  androidProductDetailOpenMs: number | null;
  androidCreateListingOpenMs: number | null;
  androidThumbnailRenderAfterPickMs: number | null;
  androidPublishWith7Photos1VideoMs: number | null;
  androidMarketOpenBudgetPassed: boolean | null;
  androidProductDetailOpenBudgetPassed: boolean | null;
  androidCreateListingOpenBudgetPassed: boolean | null;
  androidThumbnailRenderBudgetPassed: boolean | null;
  androidPublishBudgetPassed: boolean | null;
  androidFullRouteBudgetMs: number | null;
  marketScrollTopButtonWorks: boolean;
  marketScrollTopButtonAbsoluteTop: boolean;
  marketScrollTopButtonSingleClick: boolean;
  marketScrollTopProof: MarketScrollTopProof;
  myListingsPassed: boolean;
  myListingsMediaVisible: boolean;
  myListingsAfterRefreshVisible: boolean;
  myListingsAfterReloginVisible: boolean;
  listingInserted: boolean;
  mediaLinkConfirmed: boolean;
  productImageDisplayed: boolean;
  productGalleryThumbCount: number;
  productVideoThumbDisplayed: boolean;
  listingId: string | null;
  mediaAssetId: string | null;
  insertedMediaAssetIds: string[];
  insertedMediaAssets: { mediaAssetId: string; mediaKind: string }[];
  confirmPurposes: string[];
  dialogMessages: string[];
  consoleWarnMessages: string[];
  consoleErrorMessages: string[];
  pageErrorMessages: string[];
  pageErrorClassifications: string[];
  pageErrorUnclassifiedMessages: string[];
  consoleWarnClassifications: string[];
  consoleWarnUnclassifiedMessages: string[];
  uploadSessionCount: number;
  storageUploadCount: number;
  completedUploadCount: number;
  fieldValuesBeforePublish: string[];
  publishButtonDisabled: boolean | null;
  publishStateText: string | null;
  errorSummaryText: string | null;
  pageErrorCount: number;
  consoleErrorCount: number;
  consoleWarnCount: number;
  screenshot: string | null;
  unhandledFakeSupabaseRequests: FakeSupabaseCapture["unhandledRequests"];
  error?: string;
};

type LiveMarketMediaAcceptanceStatus =
  | "GREEN_LIVE_MARKET_MEDIA_ACCEPTANCE"
  | "STOP_LIVE_STAGING_ENV_NOT_CONFIGURED_FOR_MARKET_PRODUCTION_PROOF"
  | "STOP_LIVE_STAGING_CLEANUP_NOT_PROVED"
  | "STOP_LIVE_MARKET_MEDIA_ACCEPTANCE_FAILED";

type LiveRoleSession = {
  client: SupabaseClient;
  userId: string;
  accessToken: string;
  role: string;
  companyId: string;
};

type LiveMediaAssetRow = {
  id: string;
  org_id: string;
  owner_user_id: string;
  media_kind: string;
  storage_bucket: string;
  storage_key: string;
  mime_type: string;
  public_marketplace_visible: boolean;
  requires_signed_url: boolean;
};

type LiveMediaLinkRow = {
  id: string;
  media_asset_id: string;
  purpose: string;
  target_type: string;
  target_id: string;
  marketplace_visible: boolean;
  final_linked_by_human: boolean;
};

type LiveMarketMediaAcceptanceSummary = {
  final_status: LiveMarketMediaAcceptanceStatus;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  target_environment: string;
  project_ref: string;
  run_started_at: string;
  artifact_dir: string;
  listing_id: string | null;
  media_asset_count: number;
  media_link_count: number;
  photo_asset_count: number;
  video_asset_count: number;
  error_step: string | null;
  error_message: string | null;

  live_market_media_acceptance_passed: boolean;
  live_real_storage_upload: boolean;
  live_media_asset_rows_created: boolean;
  live_listing_created: boolean;
  live_listing_media_links_created: boolean;
  live_public_image_fetch_ok: boolean;
  live_public_video_fetch_ok: boolean;
  live_card_uploaded_media_visible: boolean;
  live_detail_uploaded_media_visible: boolean;
  live_detail_8_media_visible: boolean;
  live_media_after_refresh_visible: boolean;
  live_media_after_relogin_visible: boolean;
  live_no_blob_data_file_final_url: boolean;
  live_no_fake_media: boolean;
  live_no_category_fallback_used_as_media_proof: boolean;
  live_cleanup_scope_bounded: boolean;
  live_cleanup_idempotent: boolean;

  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  fake_green_claimed: false;
};

function buildFailedMarketScrollTopProof(): MarketScrollTopProof {
  return {
    visibleAfterScroll: false,
    scrollsToAbsoluteTop: false,
    doesNotStepOneCard: false,
    doesNotRequireMultipleClicks: false,
    positionBeforeClickPx: null,
    positionAfterClickPx: null,
    maxScrollTopPx: null,
    firstListingVisibleAfterScrollTop: false,
    filterHeaderVisibleAfterScrollTop: false,
  };
}

const SMOKE_SCENARIOS: readonly SmokeScenario[] = [
  {
    kind: "material",
    photoCount: PHOTO_LIMIT,
    videoCount: 1,
    listingId: "55555555-5555-4555-8555-555555555551",
    title: "Web smoke material 7 photos",
    description: "Material smoke keeps all selected photos through publish and marketplace render.",
    price: "1200",
    unit: "шт",
  },
  {
    kind: "work",
    photoCount: PHOTO_LIMIT,
    videoCount: 1,
    listingId: "55555555-5555-4555-8555-555555555554",
    title: "Web smoke work 7 photos",
    description: "Work smoke keeps selected work photos through publish and marketplace render.",
    price: "4500",
    unit: "час",
  },
  {
    kind: "service",
    photoCount: PHOTO_LIMIT,
    videoCount: 1,
    listingId: "55555555-5555-4555-8555-555555555552",
    title: "Web smoke service 7 photos",
    description: "Service smoke keeps selected work photos through publish and marketplace render.",
    price: "1",
    unit: "усл",
  },
  {
    kind: "delivery",
    photoCount: PHOTO_LIMIT,
    videoCount: 1,
    listingId: "55555555-5555-4555-8555-555555555555",
    title: "Web smoke delivery 7 photos",
    description: "Delivery smoke keeps transport photos through publish and marketplace render.",
    price: "900",
    unit: "рейс",
  },
  {
    kind: "rent",
    photoCount: PHOTO_LIMIT,
    videoCount: 1,
    listingId: "55555555-5555-4555-8555-555555555553",
    title: "Web smoke rent 7 photos",
    description: "Rent smoke keeps selected rental photos through publish and marketplace render.",
    price: "3200",
    unit: "сут",
  },
];

const SCENARIO_INDEX: Record<ListingKind, number> = {
  material: 1,
  work: 2,
  service: 3,
  delivery: 4,
  rent: 5,
};

function buildFakeAuthUser() {
  return {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "market-add-web-smoke@example.test",
    phone: "+996700111222",
    app_metadata: { role: "seller" },
    user_metadata: {
      full_name: "Market Add Web Smoke",
      role: "seller",
    },
  };
}

function buildFakeAuthSession() {
  return {
    access_token: "market-add-web-smoke-access-token",
    refresh_token: "market-add-web-smoke-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    user: buildFakeAuthUser(),
  };
}

function buildScenarioCapture(): FakeSupabaseScenarioCapture {
  return {
    uploadSessionRequests: [],
    uploadedStoragePaths: [],
    completedUploadRequests: [],
    listingInsertPayloads: [],
    mediaConfirmRequests: [],
  };
}

function scenarioUploadSessionId(kind: ListingKind, index: number): string {
  return `33333333-3333-4333-8333-3333333333${SCENARIO_INDEX[kind]}${index + 1}`;
}

function scenarioMediaAssetId(kind: ListingKind, index: number): string {
  return `44444444-4444-4444-8444-4444444444${SCENARIO_INDEX[kind]}${index + 1}`;
}

function scenarioMediaLinkId(kind: ListingKind, index: number): string {
  return `66666666-6666-4666-8666-6666666666${SCENARIO_INDEX[kind]}${index + 1}`;
}

function expectedMediaCount(scenario: SmokeScenario) {
  return scenario.photoCount + scenario.videoCount;
}

function readEbmlVint(input: Buffer, offset: number, keepMarker: boolean) {
  const first = input[offset];
  if (first == null) return null;
  let length = 1;
  let marker = 0x80;
  while (length <= 8 && (first & marker) === 0) {
    length += 1;
    marker >>= 1;
  }
  if (length > 8 || offset + length > input.length) return null;
  let value = keepMarker ? first : first & (marker - 1);
  for (let index = 1; index < length; index += 1) {
    value = value * 256 + input[offset + index];
  }
  const unknown = !keepMarker && value === (2 ** (7 * length)) - 1;
  return { length, value, unknown };
}

function encodeEbmlSize(value: number, length: number): Buffer {
  const max = (2 ** (7 * length)) - 2;
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new Error(`Cannot encode EBML size ${value} in ${length} byte(s)`);
  }
  const bytes = Buffer.alloc(length);
  let remaining = value;
  for (let index = length - 1; index >= 0; index -= 1) {
    bytes[index] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }
  bytes[0] |= 0x80 >> (length - 1);
  return bytes;
}

function elementIdHex(input: Buffer, offset: number, idLength: number): string {
  return input.subarray(offset, offset + idLength).toString("hex");
}

function readEbmlFloat(input: Buffer, start: number, end: number): number | null {
  if (start < 0 || end > input.length || end <= start) return null;
  const length = end - start;
  if (length === 4) return input.readFloatBE(start);
  if (length === 8) return input.readDoubleBE(start);
  return null;
}

function readEbmlUnsignedInteger(input: Buffer, start: number, end: number): number | null {
  if (start < 0 || end > input.length || end <= start || end - start > 8) return null;
  let value = 0;
  for (let index = start; index < end; index += 1) {
    const byte = input[index];
    if (byte == null) return null;
    value = value * 256 + byte;
    if (!Number.isSafeInteger(value)) return null;
  }
  return value;
}

function findEbmlElement(input: Buffer, start: number, end: number, targetIdHex: string) {
  let offset = start;
  while (offset < end) {
    const id = readEbmlVint(input, offset, true);
    if (!id) return null;
    const sizeOffset = offset + id.length;
    const size = readEbmlVint(input, sizeOffset, false);
    if (!size) return null;
    const contentStart = sizeOffset + size.length;
    const contentEnd = size.unknown ? end : contentStart + size.value;
    if (contentEnd > end || contentEnd > input.length) return null;
    if (elementIdHex(input, offset, id.length) === targetIdHex) {
      return {
        offset,
        sizeOffset,
        contentStart,
        contentEnd,
        sizeLength: size.length,
        sizeValue: size.value,
        sizeUnknown: size.unknown,
      };
    }
    offset = contentEnd;
  }
  return null;
}

function readWebmDurationMsFromBuffer(input: Buffer): number | null {
  const segment = findEbmlElement(input, 0, input.length, "18538067");
  if (!segment) return null;
  const info = findEbmlElement(input, segment.contentStart, segment.contentEnd, "1549a966");
  if (!info) return null;
  const timecodeScaleElement = findEbmlElement(input, info.contentStart, info.contentEnd, "2ad7b1");
  const timecodeScale = timecodeScaleElement
    ? readEbmlUnsignedInteger(input, timecodeScaleElement.contentStart, timecodeScaleElement.contentEnd)
    : WEBM_TIMECODE_SCALE_DEFAULT_NS;
  if (timecodeScale == null) return null;
  const durationElement = findEbmlElement(input, info.contentStart, info.contentEnd, "4489");
  if (!durationElement) return null;
  const duration = readEbmlFloat(input, durationElement.contentStart, durationElement.contentEnd);
  if (duration == null || !Number.isFinite(duration) || duration <= 0) return null;
  const durationMs = duration * timecodeScale / 1_000_000;
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 15_000) return null;
  return Math.max(1, Math.round(durationMs));
}

function createWebmDurationElement(durationMs: number): Buffer {
  const duration = Buffer.alloc(11);
  duration[0] = 0x44;
  duration[1] = 0x89;
  duration[2] = 0x88;
  duration.writeDoubleBE(durationMs, 3);
  return duration;
}

function addWebmDurationMetadata(input: Buffer, durationMs: number): Buffer {
  const segment = findEbmlElement(input, 0, input.length, "18538067");
  if (!segment) return input;
  const info = findEbmlElement(input, segment.contentStart, segment.contentEnd, "1549a966");
  if (!info || info.sizeUnknown) return input;
  const existingDuration = findEbmlElement(input, info.contentStart, info.contentEnd, "4489");
  const duration = createWebmDurationElement(durationMs);

  if (existingDuration && readWebmDurationMsFromBuffer(input) != null) return input;
  const replacedLength = existingDuration ? existingDuration.contentEnd - existingDuration.offset : 0;
  const insertedLength = duration.length - replacedLength;
  const nextInfoSize = info.sizeValue + insertedLength;
  const nextInfoSizeBytes = encodeEbmlSize(nextInfoSize, info.sizeLength);
  const nextSegmentSizeBytes = segment.sizeUnknown
    ? null
    : encodeEbmlSize(segment.sizeValue + insertedLength, segment.sizeLength);
  const insertStart = existingDuration?.offset ?? info.contentEnd;
  const insertEnd = existingDuration?.contentEnd ?? info.contentEnd;

  return Buffer.concat([
    input.subarray(0, segment.sizeOffset),
    nextSegmentSizeBytes ?? input.subarray(segment.sizeOffset, segment.sizeOffset + segment.sizeLength),
    input.subarray(segment.sizeOffset + segment.sizeLength, info.sizeOffset),
    nextInfoSizeBytes,
    input.subarray(info.sizeOffset + info.sizeLength, insertStart),
    duration,
    input.subarray(insertEnd),
  ]);
}

let cachedTinyWebmVideoBuffer: Buffer | null = null;
let cachedTinyLiveVideoFile: SmokeFilePayload | null = null;

type TinyRecordedVideo = {
  buffer: Buffer;
  mimeType: string;
};

async function recordTinyWebmVideoBufferFromPage(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(
    `(async () => {
      if (typeof MediaRecorder === "undefined") {
        throw new Error("MediaRecorder is not available for smoke video generation");
      }
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas 2D context is not available for smoke video generation");
      }
      const stream = canvas.captureStream(5);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      const stopped = new Promise((resolve, reject) => {
        recorder.onerror = () => reject(new Error("Smoke video recorder failed"));
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });
      let frame = 0;
      const paint = () => {
        context.fillStyle = frame % 2 === 0 ? "#0f172a" : "#16a34a";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff";
        context.fillRect(8, 8, 16, 16);
        frame += 1;
      };
      paint();
      const timer = window.setInterval(paint, 100);
      recorder.start(100);
      window.setTimeout(() => recorder.stop(), 1200);
      const blob = await stopped;
      window.clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      return window.btoa(binary);
    })()`,
  ) as string;
  return addWebmDurationMetadata(Buffer.from(base64, "base64"), 1200);
}

async function recordTinyBrowserVideoBufferFromPage(
  page: Page,
  candidateMimeTypes: readonly string[],
): Promise<TinyRecordedVideo> {
  const payload = await page.evaluate(
    `(async () => {
      const candidateMimeTypes = ${JSON.stringify([...candidateMimeTypes])};
      if (typeof MediaRecorder === "undefined") {
        throw new Error("MediaRecorder is not available for live video generation");
      }
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas 2D context is not available for live video generation");
      }
      const mimeType = candidateMimeTypes.find((candidate) => MediaRecorder.isTypeSupported(candidate));
      if (!mimeType) {
        throw new Error("No supported MediaRecorder mime type for live video generation");
      }
      const stream = canvas.captureStream(5);
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      const stopped = new Promise((resolve, reject) => {
        recorder.onerror = () => reject(new Error("Live video recorder failed"));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      let frame = 0;
      const paint = () => {
        context.fillStyle = frame % 2 === 0 ? "#111827" : "#0ea5e9";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff";
        context.fillRect(6, 6, 20, 20);
        frame += 1;
      };
      paint();
      const timer = window.setInterval(paint, 100);
      recorder.start(100);
      window.setTimeout(() => recorder.stop(), 1200);
      const blob = await stopped;
      window.clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      return { base64: window.btoa(binary), mimeType };
    })()`,
  ) as { base64: string; mimeType: string };
  return {
    buffer: Buffer.from(payload.base64, "base64"),
    mimeType: payload.mimeType,
  };
}

async function recordTinyWebmVideoBuffer(page: Page): Promise<Buffer> {
  const recorderPage = smokeTarget === "android-chrome"
    ? await page.context().newPage()
    : page;
  try {
    if (recorderPage !== page) {
      await recorderPage.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await recorderPage.bringToFront();
    }
    return await recordTinyWebmVideoBufferFromPage(recorderPage);
  } finally {
    if (recorderPage !== page) {
      await recorderPage.close().catch(() => undefined);
      await page.bringToFront().catch(() => undefined);
    }
  }
}

async function recordTinyWebmVideoBufferInDesktopChromium(): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30_000 });
    return await recordTinyWebmVideoBufferFromPage(page);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

function validateTinyWebmVideoBuffer(buffer: Buffer): boolean {
  return readWebmDurationMsFromBuffer(buffer) != null;
}

async function createTinyWebmVideoBuffer(page: Page): Promise<Buffer> {
  if (cachedTinyWebmVideoBuffer) return cachedTinyWebmVideoBuffer;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = await recordTinyWebmVideoBuffer(page);
    if (validateTinyWebmVideoBuffer(candidate)) {
      cachedTinyWebmVideoBuffer = candidate;
      return candidate;
    }
  }
  const desktopCandidate = await recordTinyWebmVideoBufferInDesktopChromium();
  if (validateTinyWebmVideoBuffer(desktopCandidate)) {
    cachedTinyWebmVideoBuffer = desktopCandidate;
    return desktopCandidate;
  }
  throw new Error("STOP_ANDROID_CHROME_VIDEO_FIXTURE_INVALID: Smoke video fixture metadata could not be validated");
}

async function createTinyLiveStagingVideoFile(page: Page): Promise<SmokeFilePayload> {
  if (cachedTinyLiveVideoFile) return cachedTinyLiveVideoFile;
  const recorded = await recordTinyBrowserVideoBufferFromPage(page, [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp8",
    "video/webm",
  ]);
  const isMp4 = recorded.mimeType.toLowerCase().includes("mp4");
  const mimeType = isMp4 ? "video/mp4" : "video/webm";
  const buffer = isMp4 ? recorded.buffer : addWebmDurationMetadata(recorded.buffer, 1200);
  if (!isMp4 && !validateTinyWebmVideoBuffer(buffer)) {
    throw new Error("STOP_LIVE_STAGING_VIDEO_FIXTURE_INVALID: live video fixture metadata could not be validated");
  }
  cachedTinyLiveVideoFile = {
    name: `market-live-video.${isMp4 ? "mp4" : "webm"}`,
    mimeType,
    buffer,
  };
  return cachedTinyLiveVideoFile;
}

type WebServerHandle = {
  baseUrl: string;
  started: boolean;
  stop: () => void;
};

const waitForNextProbe = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function writeText(fullPath: string, value: string) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, "utf8");
}

function classifyKnownBootConsoleWarning(message: string): string | null {
  if (message.includes('"shadow*" style props are deprecated. Use "boxShadow".')) {
    return "react-native-web-shadow-style-deprecation";
  }
  if (message === "props.pointerEvents is deprecated. Use style.pointerEvents") {
    return "react-native-web-pointer-events-deprecation";
  }
  if (
    message.includes("[supabaseClient] SUPABASE_URL host") &&
    message.includes("127.0.0.1:54321")
  ) {
    return "local-fake-supabase-host-warning";
  }
  if (
    message.includes("[expo-av]: Expo AV has been deprecated") &&
    message.includes("expo-audio") &&
    message.includes("expo-video")
  ) {
    return "expo-av-sdk-deprecation-warning";
  }
  if (
    message.startsWith("Require cycle: src/lib/estimateStructuredPipeline/") ||
    message.startsWith("Require cycle: src/lib/ai/constructionFormulas/resolveConstructionQuantityFormula.ts") ||
    message.startsWith("Require cycle: src/lib/ai/globalEstimate/globalEstimateCalculator.ts")
  ) {
    return "existing-ai-module-require-cycle-warning";
  }
  return null;
}

function classifyKnownPageError(message: string): string | null {
  if (
    smokeTarget === "android-chrome" &&
    message.includes("Failed to execute 'importScripts' on 'WorkerGlobalScope'") &&
    message.includes("cdn.jsdelivr.net/npm/jsqr@1.2.0/dist/jsQR.min.js")
  ) {
    return "android-chrome-jsqr-worker-cdn-pageerror";
  }
  return null;
}

function writeJson(fullPath: string, value: unknown) {
  writeText(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function runGit(args: string[]): string {
  const result = spawnSync("git", args, { cwd: projectRoot, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return "";
  return String(result.stdout || "").trim();
}

function redactMessage(value: unknown): string {
  const raw = (() => {
    if (value instanceof Error) return value.message;
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      return JSON.stringify({
        name: record.name,
        code: record.code,
        message: record.message,
        details: record.details,
        hint: record.hint,
        status: record.status,
      });
    }
    return String(value ?? "");
  })();
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer <redacted>")
    .replace(/([?&](?:apikey|access_token|refresh_token|refreshToken|token|password)=)[^&\s]+/gi, "$1<redacted>")
    .slice(0, 1000);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function stablePublicMediaUrl(value: unknown, supabaseUrl: string): string | null {
  const url = normalizeString(value);
  if (!url) return null;
  if (/^(blob|data|file):/i.test(url)) return null;
  if (/media-local-(?:photo|video)-\d+/i.test(url)) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/storage/v1/object/public/")) {
    return new URL(url, supabaseUrl).toString();
  }
  return null;
}

function commandBin(command: string): string {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

function spawnCli(command: string, args: string[], input?: string): ReturnType<typeof spawnSync> {
  const resolvedCommand = process.platform === "win32" && /\.cmd$/i.test(command) ? "cmd.exe" : command;
  const resolvedArgs = process.platform === "win32" && /\.cmd$/i.test(command)
    ? ["/c", command.replace(/\.cmd$/i, ""), ...args]
    : args;
  const env = { ...process.env };
  const defaultGoBinary = "C:\\Users\\User\\.local\\share\\supabase\\v2.105.0\\supabase-go.exe";
  if (!env.SUPABASE_GO_BINARY && fs.existsSync(defaultGoBinary)) {
    env.SUPABASE_GO_BINARY = defaultGoBinary;
  }
  return spawnSync(resolvedCommand, resolvedArgs, {
    cwd: projectRoot,
    encoding: "utf8",
    env,
    input,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function buildLiveArtifactContext() {
  const runStartedAt = new Date().toISOString();
  const runId = runStartedAt.replace(/[:.]/g, "-");
  const artifactDir = path.join(LIVE_RUNTIME_ROOT, runId);
  const summaryPath = path.join(artifactDir, "summary.json");
  return { runStartedAt, runId, artifactDir, summaryPath };
}

function writeLiveSummary(summaryPath: string, summary: LiveMarketMediaAcceptanceSummary): void {
  writeJson(summaryPath, summary);
}

function buildInitialLiveSummary(context: ReturnType<typeof buildLiveArtifactContext>): LiveMarketMediaAcceptanceSummary {
  return {
    final_status: "STOP_LIVE_MARKET_MEDIA_ACCEPTANCE_FAILED",
    source_sha: runGit(["rev-parse", "HEAD"]),
    branch: runGit(["branch", "--show-current"]),
    upstream_sync: runGit(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    target_environment: normalizeString(process.env.OFFICE_E2E_TARGET_ENV || process.env.APP_ENV || "staging").toLowerCase(),
    project_ref: EXPECTED_STAGING_PROJECT_REF,
    run_started_at: context.runStartedAt,
    artifact_dir: path.relative(projectRoot, context.artifactDir).replace(/\\/g, "/"),
    listing_id: null,
    media_asset_count: 0,
    media_link_count: 0,
    photo_asset_count: 0,
    video_asset_count: 0,
    error_step: null,
    error_message: null,

    live_market_media_acceptance_passed: false,
    live_real_storage_upload: false,
    live_media_asset_rows_created: false,
    live_listing_created: false,
    live_listing_media_links_created: false,
    live_public_image_fetch_ok: false,
    live_public_video_fetch_ok: false,
    live_card_uploaded_media_visible: false,
    live_detail_uploaded_media_visible: false,
    live_detail_8_media_visible: false,
    live_media_after_refresh_visible: false,
    live_media_after_relogin_visible: false,
    live_no_blob_data_file_final_url: false,
    live_no_fake_media: false,
    live_no_category_fallback_used_as_media_proof: false,
    live_cleanup_scope_bounded: false,
    live_cleanup_idempotent: false,

    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };
}

function stopProcessTree(child: {
  pid?: number;
  exitCode: number | null;
  kill: (signal?: NodeJS.Signals) => boolean;
}) {
  if (child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

function adbArgs(args: string[]): string[] {
  const serial = String(process.env.ADB_SERIAL ?? "").trim();
  return serial ? ["-s", serial, ...args] : args;
}

function runAdb(args: string[]) {
  return spawnSync("adb", adbArgs(args), {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

function ensureAdbOk(args: string[], errorMessage: string) {
  const result = runAdb(args);
  if (result.status !== 0) {
    throw new Error(`${errorMessage}: ${result.stderr || result.stdout || `adb ${args.join(" ")}`}`);
  }
  return result.stdout;
}

async function ensureAndroidChromeDevToolsReady() {
  const devices = ensureAdbOk(["devices"], "adb devices failed");
  if (!/\bdevice\b/.test(devices.split(/\r?\n/).slice(1).join("\n"))) {
    throw new Error("No online Android emulator/device for android-chrome smoke");
  }

  runAdb(["forward", "--remove", "tcp:9222"]);
  ensureAdbOk(["shell", "am", "force-stop", "com.android.chrome"], "Failed to reset Android Chrome");
  ensureAdbOk(
    ["shell", "am", "start", "-n", "com.android.chrome/com.google.android.apps.chrome.Main", "-d", "about:blank"],
    "Failed to launch Android Chrome",
  );
  ensureAdbOk(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"], "Failed to forward Chrome DevTools");

  await poll(
    "market-add-android-chrome-smoke:cdp-ready",
    async () => {
      try {
        const response = await fetch("http://127.0.0.1:9222/json/version");
        return response.ok ? true : null;
      } catch {
        return null;
      }
    },
    20_000,
    500,
  );
}

async function findFreePort(startAt = 18097): Promise<number> {
  for (let port = startAt; port < startAt + 40; port += 1) {
    const free = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "0.0.0.0");
    });
    if (free) return port;
  }
  throw new Error("No free local port for market add web smoke");
}

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 30_000,
  delayMs = 500,
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await waitForNextProbe(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

async function ensureLocalWebServer(): Promise<WebServerHandle> {
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  writeText(serverStdoutPath, "");
  writeText(serverStderrPath, "");

  const expoArgs = smokeTarget === "android-chrome"
    ? ["expo", "start", "--web", "--port", String(port)]
    : ["expo", "start", "--web", "-c", "--port", String(port)];
  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", ...expoArgs]
      : expoArgs,
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: {
        ...process.env,
        CI: process.env.CI ?? "1",
        BROWSER: "none",
        EXPO_NO_DOTENV: "1",
        EXPO_PUBLIC_SUPABASE_URL: fakeSupabaseUrl,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "market-add-web-smoke-anon-key",
        EXPO_PUBLIC_OFFICE_LOCAL_DEVELOPER_FULL_ACCESS: "0",
        EXPO_PUBLIC_RELEASE_CHANNEL: "local",
        EXPO_PUBLIC_APP_ENV: "local",
        EXPO_PUBLIC_JOB_QUEUE_ENABLED: "0",
        JOB_QUEUE_ENABLED: "0",
      },
    },
  );

  child.stdout.on("data", (chunk) => fs.appendFileSync(serverStdoutPath, String(chunk)));
  child.stderr.on("data", (chunk) => fs.appendFileSync(serverStderrPath, String(chunk)));

  await poll(
    "market-add-web-smoke:web-server-ready",
    async () => {
      if (child.exitCode != null) {
        const stderr = fs.existsSync(serverStderrPath)
          ? fs.readFileSync(serverStderrPath, "utf8").slice(-3000)
          : "";
        throw new Error(`expo web server exited early (${child.exitCode}): ${stderr}`);
      }
      const stdout = fs.existsSync(serverStdoutPath)
        ? fs.readFileSync(serverStdoutPath, "utf8").slice(-3000)
        : "";
      const stderr = fs.existsSync(serverStderrPath)
        ? fs.readFileSync(serverStderrPath, "utf8").slice(-3000)
        : "";
      if (/Port \d+ is being used|Skipping dev server|Use port \d+ instead/i.test(`${stdout}\n${stderr}`)) {
        throw new Error(`expo web server did not bind requested smoke port: ${stdout}\n${stderr}`);
      }
      try {
        const response = await fetch(`${baseUrl}/market`);
        return response.ok ? true : null;
      } catch {
        return null;
      }
    },
    240_000,
    1_000,
  );

  if (smokeTarget === "android-chrome") {
    ensureAdbOk(["reverse", `tcp:${port}`, `tcp:${port}`], "Failed to reverse Expo web port to Android emulator");
  }

  return {
    baseUrl,
    started: true,
    stop: () => {
      if (smokeTarget === "android-chrome") {
        runAdb(["reverse", "--remove", `tcp:${port}`]);
      }
      stopProcessTree(child);
    },
  };
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "*",
};

function buildPublishedListingImageUrls(scenario: SmokeScenario) {
  return Array.from({ length: scenario.photoCount }, (_, index) =>
    `${fakeSupabaseUrl}/storage/v1/object/public/public-marketplace-media/${COMPANY_ID}/${scenarioUploadSessionId(scenario.kind, index)}/original`
  );
}

function buildPublishedListingVideoUrls(scenario: SmokeScenario) {
  return Array.from({ length: scenario.videoCount }, (_, index) =>
    `${fakeSupabaseUrl}/storage/v1/object/public/public-marketplace-media/${COMPANY_ID}/${scenarioUploadSessionId(scenario.kind, scenario.photoCount + index)}/original`
  );
}

function buildPublishedListingMediaLinkRows(scenario: SmokeScenario) {
  const photoRows = Array.from({ length: scenario.photoCount }, (_, index) => ({
    created_at: new Date(Date.now() + index).toISOString(),
    media_assets: {
      storage_bucket: "public-marketplace-media",
      storage_key: `${COMPANY_ID}/${scenarioUploadSessionId(scenario.kind, index)}/original`,
      media_kind: "photo",
      public_marketplace_visible: true,
    },
  }));
  const videoRows = Array.from({ length: scenario.videoCount }, (_, index) => {
    const uploadIndex = scenario.photoCount + index;
    return {
      created_at: new Date(Date.now() + uploadIndex).toISOString(),
      media_assets: {
        storage_bucket: "public-marketplace-media",
        storage_key: `${COMPANY_ID}/${scenarioUploadSessionId(scenario.kind, uploadIndex)}/original`,
        media_kind: "video",
        public_marketplace_visible: true,
      },
    };
  });
  return [...photoRows, ...videoRows];
}

function buildPublishedListingScopeRow(scenario: SmokeScenario) {
  const imageUrls = buildPublishedListingImageUrls(scenario);
  const videoUrls = buildPublishedListingVideoUrls(scenario);
  return {
    id: scenario.listingId,
    name: scenario.title,
    title: scenario.title,
    category: scenario.kind,
    price: Number(scenario.price),
    supplier_id: COMPANY_ID,
    supplier_name: "Smoke Supplier LLC",
    in_stock: scenario.kind === "material",
    unit: "шт",
    image_url: imageUrls[0],
    image_urls: imageUrls,
    video_url: videoUrls[0] ?? null,
    video_urls: videoUrls,
    user_id: USER_ID,
    company_id: COMPANY_ID,
    seller_display_name: "Smoke Supplier LLC",
    city: "Бишкек",
    kind: scenario.kind,
    side: "offer",
    description: "Фото реально выбрано, отображено и отправлено в публикацию.",
    contacts_phone: "+996700111222",
    contacts_whatsapp: "+996700111222",
    contacts_email: "seller@example.test",
    items_json: [],
    erp_items_json: [],
    uom: "шт",
    uom_code: "шт",
    rik_code: null,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primary_rik_code: null,
    stock_qty_available: scenario.kind === "material" ? 1 : null,
    stock_uom: "шт",
    total_available_count: scenario.kind === "material" ? 1 : null,
    stock_match_count: scenario.kind === "material" ? 1 : 0,
    erp_item_count: 0,
    total_count: SMOKE_SCENARIOS.length,
    active_demand_count: 0,
  };
}

function scenarioByListingId(listingId: string | null | undefined): SmokeScenario | null {
  const normalized = String(listingId ?? "").trim();
  return SMOKE_SCENARIOS.find((scenario) => scenario.listingId === normalized) ?? null;
}

function publishedScenarios(capture: FakeSupabaseCapture): SmokeScenario[] {
  return SMOKE_SCENARIOS.filter((scenario) =>
    capture.scenarios[scenario.kind].mediaConfirmRequests.length >= expectedMediaCount(scenario)
  );
}

function currentScenarioCapture(capture: FakeSupabaseCapture): FakeSupabaseScenarioCapture {
  return capture.scenarios[capture.currentScenarioKind];
}

async function routeJson(route: Route, value: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify(value),
  });
}

async function readRequestJson(route: Route): Promise<unknown> {
  const body = route.request().postData();
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function readRequestStringField(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function installFakeSupabase(context: BrowserContext, capture: FakeSupabaseCapture) {
  await context.route(`${fakeSupabaseUrl}/**`, async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const pathName = url.pathname;

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }

    if (method === "GET" && pathName === "/auth/v1/user") {
      await routeJson(route, buildFakeAuthUser());
      return;
    }

    if (
      method === "POST" &&
      pathName === "/auth/v1/token" &&
      url.searchParams.get("grant_type") === "refresh_token"
    ) {
      await routeJson(route, buildFakeAuthSession());
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/user_profiles") {
      await routeJson(route, {
        id: "profile-web-smoke",
        user_id: USER_ID,
        full_name: "Market Add Web Smoke",
        phone: "+996700111222",
        city: "Бишкек",
        usage_market: true,
        usage_build: false,
        bio: null,
        telegram: null,
        whatsapp: "+996700111222",
        position: null,
      });
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/companies") {
      await routeJson(route, {
        id: COMPANY_ID,
        owner_user_id: USER_ID,
        name: "Smoke Supplier LLC",
        city: "Бишкек",
        phone_main: "+996700111222",
        phone_whatsapp: "+996700111222",
        email: "seller@example.test",
      });
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/company_members") {
      await routeJson(route, []);
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/tenders") {
      await routeJson(route, []);
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/auctions") {
      await routeJson(route, []);
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/catalog_items") {
      await routeJson(route, []);
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/market_listings") {
      await routeJson(route, []);
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/media_links") {
      const targetId = String(url.searchParams.get("target_id") ?? "").replace(/^eq\./, "");
      const scenario = scenarioByListingId(targetId);
      const rows = scenario && capture.scenarios[scenario.kind].mediaConfirmRequests.length >= expectedMediaCount(scenario)
        ? buildPublishedListingMediaLinkRows(scenario)
        : [];
      await routeJson(route, rows);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/get_my_role") {
      await routeJson(route, "supplier");
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/ensure_my_profile") {
      await routeJson(route, null);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/marketplace_items_scope_page_v1") {
      await routeJson(route, publishedScenarios(capture).map((scenario) => buildPublishedListingScopeRow(scenario)));
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/marketplace_my_listings_scope_page_v1") {
      await routeJson(route, publishedScenarios(capture).map((scenario) => buildPublishedListingScopeRow(scenario)));
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/marketplace_item_scope_detail_v1") {
      const body = await readRequestJson(route);
      const scenario = scenarioByListingId(readRequestStringField(body, "p_listing_id"));
      const published = scenario && capture.scenarios[scenario.kind].mediaConfirmRequests.length >= expectedMediaCount(scenario);
      await routeJson(route, published && scenario ? buildPublishedListingScopeRow(scenario) : null);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/marketplace_listing_public_image_urls_v1") {
      const body = await readRequestJson(route);
      const scenario = scenarioByListingId(readRequestStringField(body, "p_listing_id"));
      const published = scenario && capture.scenarios[scenario.kind].mediaConfirmRequests.length >= expectedMediaCount(scenario);
      await routeJson(route, published && scenario ? buildPublishedListingImageUrls(scenario) : []);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/submit_jobs_claim") {
      await routeJson(route, []);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/submit_jobs_recover_stuck") {
      await routeJson(route, 0);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/media_backend_create_upload_session") {
      const scenarioCapture = currentScenarioCapture(capture);
      scenarioCapture.uploadSessionRequests.push(await readRequestJson(route));
      const uploadIndex = scenarioCapture.uploadSessionRequests.length - 1;
      await routeJson(route, scenarioUploadSessionId(capture.currentScenarioKind, uploadIndex));
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/media_backend_complete_upload_session") {
      const scenarioCapture = currentScenarioCapture(capture);
      scenarioCapture.completedUploadRequests.push(await readRequestJson(route));
      const uploadIndex = scenarioCapture.completedUploadRequests.length - 1;
      await routeJson(route, scenarioMediaAssetId(capture.currentScenarioKind, uploadIndex));
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/media_backend_confirm_link") {
      const scenarioCapture = currentScenarioCapture(capture);
      scenarioCapture.mediaConfirmRequests.push(await readRequestJson(route));
      const linkIndex = scenarioCapture.mediaConfirmRequests.length - 1;
      await routeJson(route, scenarioMediaLinkId(capture.currentScenarioKind, linkIndex));
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/market_listings") {
      const scenarioCapture = currentScenarioCapture(capture);
      scenarioCapture.listingInsertPayloads.push(await readRequestJson(route));
      const scenario = SMOKE_SCENARIOS.find((entry) => entry.kind === capture.currentScenarioKind);
      await routeJson(route, { id: scenario?.listingId ?? SMOKE_SCENARIOS[0].listingId }, 201);
      return;
    }

    if ((method === "POST" || method === "PUT") && pathName.startsWith("/storage/v1/object/public-marketplace-media/")) {
      currentScenarioCapture(capture).uploadedStoragePaths.push(pathName);
      await routeJson(route, { Key: pathName.replace("/storage/v1/object/", "") });
      return;
    }

    if (method === "GET" && pathName.startsWith("/storage/v1/object/public/public-marketplace-media/")) {
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          "content-type": "image/png",
          "cache-control": "public, max-age=31536000, immutable",
        },
        body: onePixelPng,
      });
      return;
    }

    capture.unhandledRequests.push({ method, url: request.url() });
    await route.fulfill({
      status: 404,
      headers: {
        ...corsHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: `Unhandled fake Supabase request: ${method} ${pathName}` }),
    });
  });
}

async function fillNthField(page: Page, index: number, value: string) {
  const fields = page
    .locator('[data-testid="add-listing-owner-shell"]')
    .locator('input:not([type="file"]), textarea');
  await fields.nth(index).waitFor({ state: "visible", timeout: 30_000 });
  await fields.nth(index).fill(value);
}

async function readFieldValues(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid="add-listing-owner-shell"]')
    .locator('input:not([type="file"]), textarea')
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
          return node.value;
        }
        return "";
      }),
    );
}

async function measureVisibleAfterClick(params: {
  page: Page;
  triggerTestId: string;
  readyTestId: string;
  timeoutMs: number;
}): Promise<number> {
  const { page, triggerTestId, readyTestId, timeoutMs } = params;
  const trigger = page.locator(`[data-testid="${triggerTestId}"]`);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await trigger.waitFor({ state: "visible", timeout: timeoutMs });
    try {
      await trigger.scrollIntoViewIfNeeded({ timeout: timeoutMs });
      break;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  const measurement = page.evaluate(
    `((params) => new Promise((resolve, reject) => {
      const { triggerTestId, readyTestId, timeoutMs } = params;
      const findByTestId = (testId) =>
        Array.from(document.querySelectorAll("[data-testid]"))
          .find((node) => node.getAttribute("data-testid") === testId);
      const isVisible = (node) => {
        if (!node) return false;
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      };
      const triggerNode = findByTestId(triggerTestId);
      if (!triggerNode) {
        reject(new Error("measurement trigger not found: " + triggerTestId));
        return;
      }
      const armedAt = performance.now();
      let startedAt = null;
      let frameId = 0;
      const check = () => {
        if (startedAt == null) {
          if (performance.now() - armedAt > timeoutMs) {
            window.cancelAnimationFrame(frameId);
            reject(new Error("measurement trigger click timeout: " + triggerTestId));
            return;
          }
          frameId = window.requestAnimationFrame(check);
          return;
        }
        if (isVisible(findByTestId(readyTestId))) {
          window.cancelAnimationFrame(frameId);
          resolve(Math.round(performance.now() - startedAt));
          return;
        }
        if (performance.now() - startedAt > timeoutMs) {
          window.cancelAnimationFrame(frameId);
          reject(new Error("measurement ready target timeout: " + readyTestId));
          return;
        }
        frameId = window.requestAnimationFrame(check);
      };
      triggerNode.addEventListener("click", () => {
        startedAt = performance.now();
      }, { once: true });
      frameId = window.requestAnimationFrame(check);
    }))(${JSON.stringify({ triggerTestId, readyTestId, timeoutMs })})`,
  ) as Promise<number>;
  await trigger.evaluate((node) => {
    if (node instanceof HTMLElement) {
      node.click();
      return;
    }
    node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
  return measurement;
}

async function readMarketScrollState(page: Page, firstListingTestId: string): Promise<MarketScrollState> {
  return await page.evaluate(`(() => {
    const testId = ${JSON.stringify(firstListingTestId)};
    const byTestId = (value) =>
      Array.from(document.querySelectorAll("[data-testid]"))
        .find((node) => node.getAttribute("data-testid") === value) || null;
    const isVisible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const title = byTestId("market-home-title");
    const filter = byTestId("market_top_filter_button");
    const firstListing = byTestId(testId);
    const elementCandidates = Array.from(document.querySelectorAll("*"))
      .filter((node) =>
        title &&
        firstListing &&
        node.contains(title) &&
        node.contains(firstListing) &&
        node.scrollHeight - node.clientHeight > 20
      );
    const styledCandidates = elementCandidates.filter((node) =>
      /auto|scroll/i.test(window.getComputedStyle(node).overflowY)
    );
    const rankedCandidates = (styledCandidates.length > 0 ? styledCandidates : elementCandidates)
      .sort((left, right) => (right.clientWidth * right.clientHeight) - (left.clientWidth * left.clientHeight));
    const documentScroller = document.scrollingElement instanceof HTMLElement
      ? document.scrollingElement
      : document.documentElement;
    const scroller = rankedCandidates[0] || documentScroller;

    return {
      scrollTop: Math.round(scroller.scrollTop),
      maxScrollTop: Math.max(0, Math.round(scroller.scrollHeight - scroller.clientHeight)),
      filterHeaderVisible: isVisible(filter),
      firstListingVisible: isVisible(firstListing),
    };
  })()`) as MarketScrollState;
}

async function proveMarketScrollTopButton(params: {
  page: Page;
  baseUrl: string;
  firstListingId: string;
  targetListingId: string;
}): Promise<MarketScrollTopProof> {
  const { page, baseUrl, firstListingId, targetListingId } = params;
  const firstListingTestId = `market_feed_card_${firstListingId}`;
  const targetListingTestId = `market_feed_card_${targetListingId}`;
  await page.goto(`${baseUrl}/market`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.locator('[data-testid="market-home-title"]').waitFor({ state: "visible", timeout: 45_000 });
  await page.locator('[data-testid="market_top_filter_button"]').waitFor({ state: "visible", timeout: 45_000 });
  await page.locator(`[data-testid="${firstListingTestId}"]`).waitFor({ state: "visible", timeout: 45_000 });

  await page.locator(`[data-testid="${targetListingTestId}"]`).scrollIntoViewIfNeeded({ timeout: 45_000 });

  const beforeTopClick = await poll(
    "market-add-smoke:market-scroll-top:scrolled-down",
    async () => {
      const state = await readMarketScrollState(page, firstListingTestId);
      return state.scrollTop > 80 ? state : null;
    },
    15_000,
    250,
  );

  const topButton = page.locator('[data-testid="market_scroll_up_button"]');
  await topButton.waitFor({ state: "visible", timeout: 15_000 });
  const visibleAfterScroll = await topButton.isVisible();
  await topButton.click({ timeout: 15_000 });
  await page.locator(`[data-testid="${firstListingTestId}"]`).waitFor({ state: "visible", timeout: 45_000 });

  const afterTopClick = await poll(
    "market-add-smoke:market-scroll-top:absolute-top",
    async () => {
      const state = await readMarketScrollState(page, firstListingTestId);
      return state.scrollTop <= 5 ? state : null;
    },
    15_000,
    250,
  );
  const scrollsToAbsoluteTop = afterTopClick.scrollTop <= 5;
  const firstListingVisibleAfterScrollTop = afterTopClick.firstListingVisible;
  const filterHeaderVisibleAfterScrollTop = afterTopClick.filterHeaderVisible;

  return {
    visibleAfterScroll,
    scrollsToAbsoluteTop,
    doesNotStepOneCard: beforeTopClick.scrollTop > 80 && scrollsToAbsoluteTop,
    doesNotRequireMultipleClicks: scrollsToAbsoluteTop,
    positionBeforeClickPx: beforeTopClick.scrollTop,
    positionAfterClickPx: afterTopClick.scrollTop,
    maxScrollTopPx: beforeTopClick.maxScrollTop,
    firstListingVisibleAfterScrollTop,
    filterHeaderVisibleAfterScrollTop,
  };
}

async function createSmokePage(context: BrowserContext): Promise<Page> {
  if (smokeTarget === "android-chrome") {
    return context.newPage();
  }
  return context.pages()[0] ?? context.newPage();
}

async function chooseFilesWithProductionPicker(params: {
  page: Page;
  trigger: Locator;
  files: SmokeFilePayload | SmokeFilePayload[];
  label: string;
}) {
  const { page, trigger, files, label } = params;
  const clickTrigger = async () => {
    if (smokeTarget === "android-chrome") {
      await trigger.evaluate((node) => {
        if (node instanceof HTMLElement) {
          node.scrollIntoView({ block: "center", inline: "center" });
        }
      });
    }
    await trigger.click();
  };
  if (smokeTarget !== "android-chrome") {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 30_000 }),
      clickTrigger(),
    ]);
    await chooser.setFiles(files);
    return;
  }

  const inputs = page.locator('input[type="file"]');
  const beforeCount = await inputs.count();
  await clickTrigger();
  await poll(
    `market-add-android-chrome-smoke:${label}:production-file-input-created`,
    async () => (await inputs.count()) > beforeCount ? true : null,
    30_000,
    250,
  );
  const browserFiles: BrowserFilePayload[] = (Array.isArray(files) ? files : [files]).map((file) => ({
    name: file.name,
    mimeType: file.mimeType,
    base64: file.buffer.toString("base64"),
  }));
  await inputs.nth(beforeCount).evaluate((input, payloads) => {
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Marketplace smoke expected a file input");
    }
    const transfer = new DataTransfer();
    for (const payload of payloads) {
      const binary = window.atob(payload.base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      transfer.items.add(new File([bytes], payload.name, { type: payload.mimeType }));
    }
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, browserFiles);
}

async function openAddListingScreen(page: Page, baseUrl: string): Promise<{ openStep: string; createListingOpenMs: number }> {
  const shell = page.locator('[data-testid="add-listing-owner-shell"]');
  const ownerAddRoute = `${baseUrl}/add?returnTo=market-my-listings`;

  if (smokeTarget === "android-chrome") {
    await page.goto(`${baseUrl}/profile`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    const addButton = page.locator('[data-testid="profile-open-add-listing"]');
    await addButton.waitFor({ state: "visible", timeout: 90_000 });
    const entryClickStartedAt = Date.now();
    await addButton.click();
    try {
      await shell.waitFor({ state: "visible", timeout: 45_000 });
      return {
        openStep: "market-owner-entry-click",
        createListingOpenMs: Date.now() - entryClickStartedAt,
      };
    } catch {
      const fallbackDirectStartedAt = Date.now();
      await page.goto(ownerAddRoute, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await shell.waitFor({ state: "visible", timeout: 90_000 });
      return {
        openStep: "direct-add-owner-route",
        createListingOpenMs: Date.now() - fallbackDirectStartedAt,
      };
    }
  }

  await page.goto(ownerAddRoute, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const directRouteStartedAt = Date.now();
  try {
    await shell.waitFor({ state: "visible", timeout: 45_000 });
    return {
      openStep: "direct-add-owner-route",
      createListingOpenMs: Date.now() - directRouteStartedAt,
    };
  } catch {
    await page.goto(`${baseUrl}/profile`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
  }

  const addButton = page.locator('[data-testid="profile-open-add-listing"]');
  await addButton.waitFor({ state: "visible", timeout: 90_000 });
  const entryClickStartedAt = Date.now();
  await addButton.click();
  try {
    await shell.waitFor({ state: "visible", timeout: 15_000 });
    return {
      openStep: "market-owner-entry-click",
      createListingOpenMs: Date.now() - entryClickStartedAt,
    };
  } catch {
    const fallbackDirectStartedAt = Date.now();
    await page.goto(ownerAddRoute, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await shell.waitFor({ state: "visible", timeout: 90_000 });
    return {
      openStep: "direct-add-owner-route",
      createListingOpenMs: Date.now() - fallbackDirectStartedAt,
    };
  }
}

function normalizeMediaAssets(value: unknown): { mediaAssetId: string; mediaKind: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return [{
      mediaAssetId: String(record.mediaAssetId ?? ""),
      mediaKind: String(record.mediaKind ?? ""),
    }];
  });
}

function readInsertedMediaAssetIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const value = record.marketplaceMediaAssetIds ?? record.mediaAssetIds;
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function readInsertedMediaAssets(payload: unknown): { mediaAssetId: string; mediaKind: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  return normalizeMediaAssets(record.marketplaceMediaAssets ?? record.mediaAssets);
}

function readConfirmMediaAssetIds(payloads: readonly unknown[]): string[] {
  return payloads.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const value = (entry as Record<string, unknown>).p_media_asset_id;
    return typeof value === "string" && value.trim() ? [value.trim()] : [];
  });
}

function readConfirmPurposes(payloads: readonly unknown[]): string[] {
  return payloads.map((entry) =>
    String((entry as Record<string, unknown> | null)?.p_purpose ?? ""),
  );
}

async function runScenario(params: {
  page: Page;
  baseUrl: string;
  capture: FakeSupabaseCapture;
  scenario: SmokeScenario;
}): Promise<{ openStep: string; result: ScenarioSmokeResult }> {
  const { page, baseUrl, capture, scenario } = params;
  const context = page.context();
  capture.currentScenarioKind = scenario.kind;
  const scenarioCapture = capture.scenarios[scenario.kind];
  const addListingOpen = await openAddListingScreen(page, baseUrl);
  const openStep = addListingOpen.openStep;
  const createListingOpenMs = addListingOpen.createListingOpenMs;

  await page.locator(`[data-testid="market-add-kind-${scenario.kind}"]`).click();

  const galleryPhotoButton = page.locator('[data-testid="marketplace.media.entrypoints.gallery_photo_button"]');
  await galleryPhotoButton.scrollIntoViewIfNeeded();
  await galleryPhotoButton.waitFor({ state: "visible", timeout: 30_000 });
  await chooseFilesWithProductionPicker({
    page,
    trigger: galleryPhotoButton,
    label: `${scenario.kind}:photo`,
    files: Array.from({ length: scenario.photoCount }, (_, index) => ({
      name: `market-add-${scenario.kind}-${index + 1}.png`,
      mimeType: "image/png",
      buffer: onePixelPng,
    })),
  });
  const thumbnailRenderStartedAt = Date.now();
  await page.locator('[data-testid="marketplace.media.entrypoints.thumbnail.0"]').waitFor({
    state: "visible",
    timeout: 45_000,
  });
  const thumbnailRenderAfterPickMs = Date.now() - thumbnailRenderStartedAt;
  for (let index = 0; index < scenario.photoCount; index += 1) {
    await page.locator(`[data-testid="marketplace.media.entrypoints.thumbnail.${index}"]`).waitFor({
      state: "visible",
      timeout: 45_000,
    });
    await page.locator(`[data-testid="marketplace.media.entrypoints.preview-image.${index}"]`).waitFor({
      state: "visible",
      timeout: 45_000,
    });
  }
  const selectedPhotoCount = await page.locator('[data-testid^="marketplace.media.entrypoints.preview-image."]').count();
  const selectedPhotoDisplayed = selectedPhotoCount === scenario.photoCount;
  const inlinePhotoPreviewDisplayed =
    await page.locator('[data-testid="marketplace.media.entrypoints.media-preview"]').isVisible().catch(() => false) &&
    await page.locator('[data-testid="marketplace.media.entrypoints.media-preview.image"]').isVisible().catch(() => false);

  let selectedVideoCount = 0;
  let inlineVideoPreviewDisplayed = scenario.videoCount === 0;
  if (scenario.videoCount > 0) {
    const videoBuffer = await createTinyWebmVideoBuffer(page);
    const galleryVideoButton = page.locator('[data-testid="marketplace.media.entrypoints.gallery_video_button"]');
    await galleryVideoButton.scrollIntoViewIfNeeded();
    await galleryVideoButton.waitFor({ state: "visible", timeout: 30_000 });
    await chooseFilesWithProductionPicker({
      page,
      trigger: galleryVideoButton,
      label: `${scenario.kind}:video`,
      files: {
        name: `market-add-${scenario.kind}-clip.webm`,
        mimeType: "video/webm",
        buffer: videoBuffer,
      },
    });
    await page.locator(`[data-testid="marketplace.media.entrypoints.thumbnail.${scenario.photoCount}"]`).waitFor({
      state: "visible",
      timeout: 45_000,
    });
    await page.locator(`[data-testid="marketplace.media.entrypoints.thumbnail.video-duration.${scenario.photoCount}"]`).waitFor({
      state: "visible",
      timeout: 45_000,
    });
    await page.locator(`[data-testid="marketplace.media.entrypoints.thumbnail.preview.${scenario.photoCount}"]`).click();
    await page.locator('[data-testid="marketplace.media.entrypoints.media-preview.video"]').waitFor({
      state: "visible",
      timeout: 45_000,
    });
    inlineVideoPreviewDisplayed = true;
    selectedVideoCount = await page.locator('[data-testid^="marketplace.media.entrypoints.thumbnail.video-duration."]').count();
  }
  const selectedVideoDisplayed = selectedVideoCount === scenario.videoCount;

  const previewModalDisplayed = inlinePhotoPreviewDisplayed && inlineVideoPreviewDisplayed;

  await fillNthField(page, 0, scenario.title);
  await fillNthField(page, 1, scenario.description);
  await fillNthField(page, 2, "Бишкек");
  await fillNthField(page, 3, scenario.price);
  await fillNthField(page, 4, "+996700111222");
  await page
    .locator('[data-testid="add-listing-owner-shell"]')
    .locator('input:not([type="file"]), textarea')
    .nth(4)
    .press("Enter");

  const fieldValuesBeforePublish = await readFieldValues(page);
  const publishButton = page.locator('[data-testid="add-listing-flow-publish"]').filter({ visible: true }).first();
  await publishButton.waitFor({ state: "visible", timeout: 30_000 });
  await publishButton.scrollIntoViewIfNeeded({ timeout: 30_000 });
  const publishButtonDisabled = await publishButton.evaluate((node) =>
    node instanceof HTMLButtonElement ? node.disabled : node.getAttribute("aria-disabled") === "true",
  );
  const publishStartedAt = Date.now();
  await publishButton.click({ force: true });

  await poll(
    `market-add-smoke:${scenario.kind}:listing-inserted-and-media-linked`,
    () =>
      scenarioCapture.listingInsertPayloads.length > 0 &&
      scenarioCapture.mediaConfirmRequests.length >= expectedMediaCount(scenario)
        ? true
        : null,
    45_000,
    500,
  );

  await page.locator('[data-testid="market-add-success-state"]').waitFor({
    state: "visible",
    timeout: 45_000,
  });
  const publishWithMediaMs = Date.now() - publishStartedAt;
  const publishStateText = await page.locator('[data-testid="market-add-publish-state"]').textContent({ timeout: 1_000 }).catch(() => null);
  const errorSummaryText = await page.locator('[data-testid="market-add-error-summary"]').textContent({ timeout: 1_000 }).catch(() => null);
  const myListingsFirstContentMs = await measureVisibleAfterClick({
    page,
    triggerTestId: "market-add-back-to-market",
    readyTestId: `market-my-listings-card_${scenario.listingId}`,
    timeoutMs: 45_000,
  });
  await page.locator('[data-testid="market-my-listings-screen"]').waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.locator('[data-testid="market-my-listings-block"]').waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.locator(`[data-testid="market-my-listings-card_${scenario.listingId}"]`).waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.locator(`[data-testid="market_my_listing_image_${scenario.listingId}"]`).waitFor({
    state: "visible",
    timeout: 45_000,
  });
  const myListingVisible = true;
  const myListingMediaVisible = true;

  await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator('[data-testid="market-my-listings-screen"]').waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.locator(`[data-testid="market-my-listings-card_${scenario.listingId}"]`).waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.locator(`[data-testid="market_my_listing_image_${scenario.listingId}"]`).waitFor({
    state: "visible",
    timeout: 45_000,
  });
  const myListingAfterRefreshVisible = true;

  const reloginPage = await context.newPage();
  let myListingAfterReloginVisible = false;
  try {
    await reloginPage.goto(`${baseUrl}/market/my-listings`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await reloginPage.locator('[data-testid="market-my-listings-screen"]').waitFor({
      state: "visible",
      timeout: 45_000,
    });
    await reloginPage.locator(`[data-testid="market-my-listings-card_${scenario.listingId}"]`).waitFor({
      state: "visible",
      timeout: 45_000,
    });
    await reloginPage.locator(`[data-testid="market_my_listing_image_${scenario.listingId}"]`).waitFor({
      state: "visible",
      timeout: 45_000,
    });
    myListingAfterReloginVisible = true;
  } finally {
    await reloginPage.close().catch(() => undefined);
  }

  await page.locator('[data-testid="market-my-listings-back"]').waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.locator('[data-testid="market-my-listings-back"]').click();
  await page.locator('[data-testid="bottom-tab-market"]').waitFor({
    state: "visible",
    timeout: 45_000,
  });
  const marketOpenStartedAt = Date.now();
  await page.locator('[data-testid="bottom-tab-market"]').click();
  await page.locator('[data-testid="market-home-title"]').waitFor({
    state: "visible",
    timeout: 45_000,
  });
  const marketFirstContentMs = Date.now() - marketOpenStartedAt;
  await page.locator(`[data-testid="market_feed_card_${scenario.listingId}"]`).waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.locator(`[data-testid="market_feed_card_image_${scenario.listingId}_0"]`).waitFor({
    state: "visible",
    timeout: 45_000,
  });
  const marketOpenMs = Date.now() - marketOpenStartedAt;
  const marketCardImageDisplayed = true;

  const expectedGalleryThumbCount = expectedMediaCount(scenario);
  const productLastThumbIndex = expectedGalleryThumbCount - 1;

  const productOpenMs = await measureVisibleAfterClick({
    page,
    triggerTestId: `market_feed_card_body_${scenario.listingId}`,
    readyTestId: "market_product_instant_title",
    timeoutMs: 45_000,
  });
  await page.locator('[data-testid="market_product_hero_image"]').filter({ visible: true }).first().waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.locator(`[data-testid="market_product_gallery_thumb_${productLastThumbIndex}"]`).filter({ visible: true }).first().waitFor({
    state: "visible",
    timeout: 45_000,
  });
  const productVideoThumbDisplayed = scenario.videoCount === 0
    ? true
    : await page.locator(`[data-testid="market_product_gallery_video_${scenario.photoCount}"]`).filter({ visible: true }).first().isVisible();
  const productGalleryThumbCount = await page.locator('[data-testid^="market_product_gallery_thumb_"]').filter({ visible: true }).count();
  const productImageDisplayed = true;

  const insertedPayload = scenarioCapture.listingInsertPayloads[0] as Record<string, unknown> | undefined;
  const insertedMediaAssetIds = readInsertedMediaAssetIds(insertedPayload);
  const linkedMediaAssetIds = readConfirmMediaAssetIds(scenarioCapture.mediaConfirmRequests);
  const insertedMediaAssets = readInsertedMediaAssets(insertedPayload);
  const confirmPurposes = readConfirmPurposes(scenarioCapture.mediaConfirmRequests);
  const expectedMediaIds = Array.from({ length: expectedMediaCount(scenario) }, (_, index) =>
    scenarioMediaAssetId(scenario.kind, index),
  );
  const mediaLinkConfirmed =
    confirmPurposes.filter((purpose) => purpose === "product_photo").length === scenario.photoCount &&
    confirmPurposes.filter((purpose) => purpose === "product_video").length === scenario.videoCount &&
    expectedMediaIds.every((mediaAssetId) => linkedMediaAssetIds.includes(mediaAssetId));

  return {
    openStep,
    result: {
      kind: scenario.kind,
      photoCount: scenario.photoCount,
      videoCount: scenario.videoCount,
      listingId: scenario.listingId,
      selectedPhotoCount,
      selectedVideoCount,
      selectedPhotoDisplayed,
      selectedVideoDisplayed,
      previewModalDisplayed,
      listingInserted: scenarioCapture.listingInsertPayloads.length > 0,
      mediaLinkConfirmed,
      productImageDisplayed,
      productGalleryThumbCount,
      productVideoThumbDisplayed,
      marketCardImageDisplayed,
      myListingVisible,
      myListingMediaVisible,
      myListingAfterRefreshVisible,
      myListingAfterReloginVisible,
      marketFirstContentMs,
      marketOpenMs,
      myListingsFirstContentMs,
      productOpenMs,
      createListingOpenMs,
      thumbnailRenderAfterPickMs,
      publishWithMediaMs,
      insertedMediaAssetIds: linkedMediaAssetIds.length ? linkedMediaAssetIds : insertedMediaAssetIds,
      insertedMediaAssets,
      confirmPurposes,
      fieldValuesBeforePublish,
      publishButtonDisabled,
      publishStateText,
      errorSummaryText,
      uploadSessionCount: scenarioCapture.uploadSessionRequests.length,
      storageUploadCount: scenarioCapture.uploadedStoragePaths.length,
      completedUploadCount: scenarioCapture.completedUploadRequests.length,
    },
  };
}

async function warmAndroidMediaThumbnailPipeline(params: {
  page: Page;
  baseUrl: string;
  capture: FakeSupabaseCapture;
}) {
  const { page, baseUrl, capture } = params;
  capture.currentScenarioKind = "material";
  await openAddListingScreen(page, baseUrl);
  await page.locator('[data-testid="market-add-kind-material"]').click();
  const galleryPhotoButton = page.locator('[data-testid="marketplace.media.entrypoints.gallery_photo_button"]');
  await galleryPhotoButton.scrollIntoViewIfNeeded();
  await galleryPhotoButton.waitFor({ state: "visible", timeout: 30_000 });
  await chooseFilesWithProductionPicker({
    page,
    trigger: galleryPhotoButton,
    label: "android-warmup:photo",
    files: {
      name: "market-add-android-warmup.png",
      mimeType: "image/png",
      buffer: onePixelPng,
    },
  });
  await page.locator('[data-testid="marketplace.media.entrypoints.thumbnail.0"]').waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.locator('[data-testid="marketplace.media.entrypoints.preview-image.0"]').waitFor({
    state: "visible",
    timeout: 45_000,
  });
  capture.scenarios.material = buildScenarioCapture();
  capture.currentScenarioKind = "material";
}

function getLiveSupabaseEnv() {
  const supabaseUrl = normalizeString(process.env.STAGING_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = normalizeString(process.env.STAGING_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const companyId = normalizeString(process.env.OFFICE_E2E_COMPANY_ID);
  const targetEnvironment = normalizeString(process.env.OFFICE_E2E_TARGET_ENV || process.env.APP_ENV || "staging").toLowerCase();
  return { supabaseUrl, supabaseAnonKey, companyId, targetEnvironment };
}

function uuidList(values: readonly string[]): string[] {
  return values.map((value) => normalizeString(value)).filter((value) => UUID_RE.test(value));
}

function assertLiveSafeEnvironment(summary: LiveMarketMediaAcceptanceSummary): ReturnType<typeof getLiveSupabaseEnv> {
  const env = getLiveSupabaseEnv();
  if (summary.branch !== "release/ios-after-build48-integration") {
    throw new Error("STOP_LIVE_STAGING_ENV_NOT_CONFIGURED_FOR_MARKET_PRODUCTION_PROOF: unexpected branch");
  }
  if (!env.supabaseUrl || !env.supabaseAnonKey || !env.companyId) {
    throw new Error("STOP_LIVE_STAGING_ENV_NOT_CONFIGURED_FOR_MARKET_PRODUCTION_PROOF: staging env is missing");
  }
  if (!env.supabaseUrl.includes(EXPECTED_STAGING_PROJECT_REF)) {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED: staging project ref mismatch");
  }
  if (!UUID_RE.test(env.companyId)) {
    throw new Error("STOP_LIVE_STAGING_ENV_NOT_CONFIGURED_FOR_MARKET_PRODUCTION_PROOF: OFFICE_E2E_COMPANY_ID is invalid");
  }
  if (env.targetEnvironment === "production" || String(process.env.APP_ENV || "").toLowerCase() === "production") {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED: production target is not allowed");
  }
  if (/^(1|true|yes)$/i.test(String(process.env.ALLOW_PRODUCTION || ""))) {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED: ALLOW_PRODUCTION is enabled");
  }
  if (smokeTarget !== "web") {
    throw new Error("STOP_LIVE_STAGING_ENV_NOT_CONFIGURED_FOR_MARKET_PRODUCTION_PROOF: live acceptance must run against web target");
  }
  return env;
}

function buildLiveSupabaseClient(supabaseUrl: string, supabaseAnonKey: string, accessToken?: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

async function liveRpcValue(client: SupabaseClient, rpcName: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.rpc(rpcName, args);
  if (error) throw error;
  return data;
}

async function signInLiveForeman(params: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  companyId: string;
}): Promise<LiveRoleSession> {
  const email = normalizeString(process.env.E2E_FOREMAN_EMAIL);
  const password = String(process.env.E2E_FOREMAN_PASSWORD || "");
  if (!email || !password) {
    throw new Error("STOP_LIVE_STAGING_ENV_NOT_CONFIGURED_FOR_MARKET_PRODUCTION_PROOF: E2E_FOREMAN credentials are missing");
  }
  const authClient = buildLiveSupabaseClient(params.supabaseUrl, params.supabaseAnonKey);
  const signIn = await authClient.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session?.user) {
    throw signIn.error || new Error("FOREMAN sign-in failed");
  }
  const session = signIn.data.session;
  const client = buildLiveSupabaseClient(params.supabaseUrl, params.supabaseAnonKey, session.access_token);
  const role = normalizeString(await liveRpcValue(client, "get_my_role", {}));
  if (role !== "foreman") {
    throw new Error("STOP_LIVE_STAGING_ENV_NOT_CONFIGURED_FOR_MARKET_PRODUCTION_PROOF: signed-in user is not foreman");
  }
  const membership = await client
    .from("company_members")
    .select("company_id,role")
    .eq("user_id", session.user.id);
  if (membership.error) throw membership.error;
  const companyIds = Array.isArray(membership.data)
    ? membership.data.map((row) => normalizeString(asRecord(row).company_id)).filter(Boolean)
    : [];
  if (!companyIds.includes(params.companyId)) {
    throw new Error("STOP_LIVE_STAGING_ENV_NOT_CONFIGURED_FOR_MARKET_PRODUCTION_PROOF: foreman is not member of OFFICE_E2E_COMPANY_ID");
  }
  return {
    client,
    userId: session.user.id,
    accessToken: session.access_token,
    role,
    companyId: params.companyId,
  };
}

async function ensureLiveStagingWebServer(params: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}): Promise<WebServerHandle> {
  const port = await findFreePort(18137);
  const baseUrl = `http://127.0.0.1:${port}`;

  writeText(serverStdoutPath, "");
  writeText(serverStderrPath, "");

  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--web", "-c", "--port", String(port)]
      : ["expo", "start", "--web", "-c", "--port", String(port)],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: {
        ...process.env,
        CI: process.env.CI ?? "1",
        BROWSER: "none",
        RIK_WEB_BASE_URL: baseUrl,
        EXPO_PUBLIC_SUPABASE_URL: params.supabaseUrl,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: params.supabaseAnonKey,
        EXPO_PUBLIC_OFFICE_LOCAL_DEVELOPER_FULL_ACCESS: "0",
        EXPO_PUBLIC_RELEASE_CHANNEL: "staging",
        EXPO_PUBLIC_APP_ENV: "staging",
        EXPO_PUBLIC_JOB_QUEUE_ENABLED: "0",
        JOB_QUEUE_ENABLED: "0",
      },
    },
  );

  child.stdout.on("data", (chunk) => fs.appendFileSync(serverStdoutPath, String(chunk)));
  child.stderr.on("data", (chunk) => fs.appendFileSync(serverStderrPath, String(chunk)));

  await poll(
    "market-add-live-staging:web-server-ready",
    async () => {
      if (child.exitCode != null) {
        const stderr = fs.existsSync(serverStderrPath)
          ? fs.readFileSync(serverStderrPath, "utf8").slice(-3000)
          : "";
        throw new Error(`expo live web server exited early (${child.exitCode}): ${stderr}`);
      }
      try {
        const response = await fetch(`${baseUrl}/market`);
        return response.ok || response.status < 500 ? true : null;
      } catch {
        return null;
      }
    },
    240_000,
    1_000,
  );

  return {
    baseUrl,
    started: true,
    stop: () => stopProcessTree(child),
  };
}

function liveByTestId(page: Page, id: string): Locator {
  return page.locator(`[data-testid="${id}"]`);
}

async function loginLiveUi(page: Page, baseUrl: string): Promise<void> {
  const email = normalizeString(process.env.E2E_FOREMAN_EMAIL);
  const password = String(process.env.E2E_FOREMAN_PASSWORD || "");
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await liveByTestId(page, "auth.login.email").waitFor({ state: "visible", timeout: 90_000 });
  await liveByTestId(page, "auth.login.email").fill(email);
  await liveByTestId(page, "auth.login.password").fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 90_000 }),
    liveByTestId(page, "auth.login.submit").click(),
  ]);
}

async function locatorMediaSrc(locator: Locator): Promise<string> {
  return await locator.evaluate((element) => {
    const direct = element.getAttribute("src") || element.getAttribute("href") || "";
    if (direct) return direct;
    const image = element.matches("img") ? element : element.querySelector("img");
    return image ? image.getAttribute("src") || (image as HTMLImageElement).src || "" : "";
  });
}

async function visibleStableMediaUrl(locator: Locator, supabaseUrl: string): Promise<string | null> {
  if ((await locator.count()) < 1) return null;
  const first = locator.first();
  if (!(await first.isVisible().catch(() => false))) return null;
  const src = await locatorMediaSrc(first).catch(() => "");
  return stablePublicMediaUrl(src, supabaseUrl);
}

async function findLiveListingByTitle(client: SupabaseClient, title: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await client
    .from("market_listings")
    .select("id,title,user_id,company_id,created_at,client_mutation_id")
    .eq("title", title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? asRecord(data) : null;
}

async function loadLiveMediaRows(client: SupabaseClient, listingId: string): Promise<{
  links: LiveMediaLinkRow[];
  assets: LiveMediaAssetRow[];
}> {
  const linksResult = await client
    .from("media_links")
    .select("id,media_asset_id,purpose,target_type,target_id,marketplace_visible,final_linked_by_human")
    .eq("target_type", "marketplace_product")
    .eq("target_id", listingId)
    .order("created_at", { ascending: true });
  if (linksResult.error) throw linksResult.error;
  const links = Array.isArray(linksResult.data)
    ? linksResult.data.map((row) => asRecord(row) as unknown as LiveMediaLinkRow)
    : [];
  const mediaAssetIds = uuidList(links.map((row) => row.media_asset_id));
  if (!mediaAssetIds.length) return { links, assets: [] };
  const assetsResult = await client
    .from("media_assets")
    .select("id,org_id,owner_user_id,media_kind,storage_bucket,storage_key,mime_type,public_marketplace_visible,requires_signed_url")
    .in("id", mediaAssetIds)
    .order("created_at", { ascending: true });
  if (assetsResult.error) throw assetsResult.error;
  const assets = Array.isArray(assetsResult.data)
    ? assetsResult.data.map((row) => asRecord(row) as unknown as LiveMediaAssetRow)
    : [];
  return { links, assets };
}

function livePublicUrlForAsset(client: SupabaseClient, asset: LiveMediaAssetRow): string | null {
  if (asset.storage_bucket !== "public-marketplace-media") return null;
  const { data } = client.storage.from(asset.storage_bucket).getPublicUrl(asset.storage_key);
  return stablePublicMediaUrl(data.publicUrl, getLiveSupabaseEnv().supabaseUrl);
}

async function fetchPublicMediaUrl(url: string | null, expectedKind: "image" | "video"): Promise<boolean> {
  if (!url) return false;
  const response = await fetch(url);
  if (!response.ok) return false;
  const contentType = normalizeString(response.headers.get("content-type")).toLowerCase();
  if (expectedKind === "image") return contentType.startsWith("image/");
  return contentType.startsWith("video/") || contentType === "application/octet-stream";
}

async function waitForLiveMediaProof(params: {
  client: SupabaseClient;
  listingId: string;
}): Promise<{ links: LiveMediaLinkRow[]; assets: LiveMediaAssetRow[] }> {
  return await poll(
    "market-add-live-staging:media-links-and-assets",
    async () => {
      const rows = await loadLiveMediaRows(params.client, params.listingId);
      const photoLinks = rows.links.filter((row) => row.purpose === "product_photo");
      const videoLinks = rows.links.filter((row) => row.purpose === "product_video");
      const photoAssets = rows.assets.filter((row) => row.media_kind === "photo");
      const videoAssets = rows.assets.filter((row) => row.media_kind === "video");
      const allPublic =
        rows.links.every((row) => row.marketplace_visible === true && row.final_linked_by_human === true) &&
        rows.assets.every((row) =>
          row.storage_bucket === "public-marketplace-media" &&
          row.public_marketplace_visible === true &&
          row.requires_signed_url === false
        );
      return rows.links.length === PHOTO_LIMIT + VIDEO_LIMIT &&
        rows.assets.length === PHOTO_LIMIT + VIDEO_LIMIT &&
        photoLinks.length === PHOTO_LIMIT &&
        videoLinks.length === VIDEO_LIMIT &&
        photoAssets.length === PHOTO_LIMIT &&
        videoAssets.length === VIDEO_LIMIT &&
        allPublic
        ? rows
        : null;
    },
    120_000,
    1_000,
  );
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlUuidArray(values: readonly string[]): string {
  const ids = uuidList(values);
  return `array[${ids.map((id) => `${sqlLiteral(id)}::uuid`).join(",")}]::uuid[]`;
}

function buildLiveCleanupSql(params: {
  listingId: string;
  title: string;
  userId: string;
  listingCompanyId: string | null;
  mediaOrgId: string;
  mediaAssetIds: readonly string[];
}): string {
  const mediaIds = sqlUuidArray(params.mediaAssetIds);
  const companyGuard = params.listingCompanyId
    ? `and company_id = ${sqlLiteral(params.listingCompanyId)}::uuid`
    : "and company_id is null";
  return `
with expected_listing as (
  select id
  from public.market_listings
  where id = ${sqlLiteral(params.listingId)}::uuid
    and title = ${sqlLiteral(params.title)}
    and user_id = ${sqlLiteral(params.userId)}::uuid
    ${companyGuard}
),
expected_media as (
  select unnest(${mediaIds}) as id
),
deleted_links as (
  delete from public.media_links ml
  using expected_listing el, expected_media em
  where ml.target_type = 'marketplace_product'
    and ml.target_id = el.id::text
    and ml.media_asset_id = em.id
  returning ml.id
),
deleted_assets as (
  delete from public.media_assets ma
  using expected_media em
  where ma.id = em.id
    and ma.owner_user_id = ${sqlLiteral(params.userId)}::uuid
    and ma.org_id = ${sqlLiteral(params.mediaOrgId)}::uuid
    and ma.storage_bucket = 'public-marketplace-media'
  returning ma.id
),
deleted_listing as (
  delete from public.market_listings ml
  using expected_listing el
  where ml.id = el.id
  returning ml.id
)
select jsonb_build_object(
  'bounded', true,
  'listing_id', ${sqlLiteral(params.listingId)},
  'expected_media_count', cardinality(${mediaIds}),
  'deleted_links', (select count(*) from deleted_links),
  'deleted_assets', (select count(*) from deleted_assets),
  'deleted_listings', (select count(*) from deleted_listing)
) as cleanup;
`;
}

function runLinkedDbQuery(sql: string): void {
  const result = spawnCli("supabase", ["db", "query", "--linked", "--output", "json", sql]);
  if (result.status !== 0) {
    throw new Error(`supabase db cleanup query failed: ${redactMessage(result.stderr || result.stdout || result.error)}`);
  }
}

function runLinkedStorageRemove(storagePath: string): void {
  const result = spawnCli("supabase", ["--yes", "--experimental", "storage", "rm", "--linked", storagePath]);
  if (result.status !== 0 && !/not found|does not exist|no such/i.test(`${result.stdout}\n${result.stderr}`)) {
    throw new Error(`supabase storage rm failed: ${redactMessage(result.stderr || result.stdout || result.error)}`);
  }
}

async function cleanupLiveAcceptanceScope(params: {
  summary: LiveMarketMediaAcceptanceSummary;
  session: LiveRoleSession;
  title: string;
  listingId: string;
  listingCompanyId: string | null;
  assets: readonly LiveMediaAssetRow[];
  links: readonly LiveMediaLinkRow[];
  summaryPath: string;
}): Promise<void> {
  const mediaAssetIds = uuidList(params.assets.map((row) => row.id));
  const mediaOrgIds = [...new Set(params.assets.map((row) => normalizeString(row.org_id)).filter(Boolean))];
  const mediaOrgId = mediaOrgIds[0] ?? "";
  const bounded =
    UUID_RE.test(params.listingId) &&
    params.title.startsWith("market-media-live-ui-") &&
    mediaOrgIds.length === 1 &&
    UUID_RE.test(mediaOrgId) &&
    params.links.length === PHOTO_LIMIT + VIDEO_LIMIT &&
    params.assets.length === PHOTO_LIMIT + VIDEO_LIMIT &&
    params.assets.every((asset) =>
      UUID_RE.test(asset.id) &&
      asset.owner_user_id === params.session.userId &&
      asset.storage_bucket === "public-marketplace-media" &&
      asset.storage_key.startsWith(`${mediaOrgId}/`) &&
      !asset.storage_key.includes("..")
    ) &&
    params.links.every((link) =>
      link.target_type === "marketplace_product" &&
      link.target_id === params.listingId &&
      mediaAssetIds.includes(link.media_asset_id)
    );
  params.summary.live_cleanup_scope_bounded = bounded;
  writeLiveSummary(params.summaryPath, params.summary);
  if (!bounded) {
    throw new Error("STOP_LIVE_STAGING_CLEANUP_NOT_PROVED: cleanup scope is not bounded");
  }

  for (const asset of params.assets) {
    runLinkedStorageRemove(`ss:///${asset.storage_bucket}/${asset.storage_key}`);
  }

  const cleanupSql = buildLiveCleanupSql({
    listingId: params.listingId,
    title: params.title,
    userId: params.session.userId,
    listingCompanyId: params.listingCompanyId,
    mediaOrgId,
    mediaAssetIds,
  });
  runLinkedDbQuery(cleanupSql);
  runLinkedDbQuery(cleanupSql);

  await poll(
    "market-add-live-staging:cleanup-verified",
    async () => {
      const listing = await findLiveListingByTitle(params.session.client, params.title);
      const rows = await loadLiveMediaRows(params.session.client, params.listingId);
      const assets = mediaAssetIds.length
        ? await params.session.client.from("media_assets").select("id").in("id", mediaAssetIds)
        : { data: [], error: null };
      if (assets.error) throw assets.error;
      return !listing && rows.links.length === 0 && (!Array.isArray(assets.data) || assets.data.length === 0)
        ? true
        : null;
    },
    60_000,
    1_000,
  );

  params.summary.live_cleanup_idempotent = true;
  writeLiveSummary(params.summaryPath, params.summary);
}

async function cleanupLiveAcceptanceScopeAfterFailure(params: {
  summary: LiveMarketMediaAcceptanceSummary;
  session: LiveRoleSession;
  title: string;
  summaryPath: string;
}): Promise<boolean> {
  if (params.summary.live_cleanup_idempotent) return false;
  const listingId = normalizeString(params.summary.listing_id);
  if (!UUID_RE.test(listingId)) return false;
  const listing = await findLiveListingByTitle(params.session.client, params.title);
  if (!listing || normalizeString(listing.id) !== listingId) return false;
  const mediaRows = await loadLiveMediaRows(params.session.client, listingId);
  if (mediaRows.links.length !== PHOTO_LIMIT + VIDEO_LIMIT || mediaRows.assets.length !== PHOTO_LIMIT + VIDEO_LIMIT) {
    return false;
  }

  const previousStep = params.summary.error_step;
  params.summary.error_step = "live_cleanup_after_failure";
  writeLiveSummary(params.summaryPath, params.summary);
  await cleanupLiveAcceptanceScope({
    summary: params.summary,
    session: params.session,
    title: params.title,
    listingId,
    listingCompanyId: normalizeString(listing.company_id) || null,
    assets: mediaRows.assets,
    links: mediaRows.links,
    summaryPath: params.summaryPath,
  });
  params.summary.error_step = previousStep;
  writeLiveSummary(params.summaryPath, params.summary);
  return true;
}

async function runLiveUiScenario(params: {
  page: Page;
  baseUrl: string;
  session: LiveRoleSession;
  title: string;
  summary: LiveMarketMediaAcceptanceSummary;
  summaryPath: string;
}): Promise<{
  listingId: string;
  listingCompanyId: string | null;
  links: LiveMediaLinkRow[];
  assets: LiveMediaAssetRow[];
  finalUrls: string[];
}> {
  const { page, baseUrl, session, title, summary, summaryPath } = params;
  await loginLiveUi(page, baseUrl);

  summary.error_step = "live_ui_add_open";
  writeLiveSummary(summaryPath, summary);
  const addOpen = await openAddListingScreen(page, baseUrl);
  if (!addOpen.openStep) throw new Error("live add listing route did not open");
  await liveByTestId(page, "market-add-kind-material").click();

  summary.error_step = "live_ui_select_7_photos";
  writeLiveSummary(summaryPath, summary);
  const galleryPhotoButton = liveByTestId(page, "marketplace.media.entrypoints.gallery_photo_button");
  await galleryPhotoButton.scrollIntoViewIfNeeded();
  await chooseFilesWithProductionPicker({
    page,
    trigger: galleryPhotoButton,
    label: "live-staging:photos",
    files: Array.from({ length: PHOTO_LIMIT }, (_, index) => ({
      name: `market-live-photo-${index + 1}.png`,
      mimeType: "image/png",
      buffer: onePixelPng,
    })),
  });
  for (let index = 0; index < PHOTO_LIMIT; index += 1) {
    await liveByTestId(page, `marketplace.media.entrypoints.thumbnail.${index}`).waitFor({ state: "visible", timeout: 90_000 });
    await liveByTestId(page, `marketplace.media.entrypoints.preview-image.${index}`).waitFor({ state: "visible", timeout: 90_000 });
    await poll(
      `market-add-live-staging:photo-uploaded-${index}`,
      async () => {
        const text = await liveByTestId(page, `marketplace.media.entrypoints.thumbnail.upload-status.${index}`)
          .textContent({ timeout: 1_000 })
          .catch(() => "");
        return /uploaded|\u0437\u0430\u0433\u0440\u0443\u0436/i.test(String(text)) ? true : null;
      },
      90_000,
      500,
    );
  }

  summary.error_step = "live_ui_select_1_video";
  writeLiveSummary(summaryPath, summary);
  const liveVideoFile = await createTinyLiveStagingVideoFile(page);
  const galleryVideoButton = liveByTestId(page, "marketplace.media.entrypoints.gallery_video_button");
  await galleryVideoButton.scrollIntoViewIfNeeded();
  await chooseFilesWithProductionPicker({
    page,
    trigger: galleryVideoButton,
    label: "live-staging:video",
    files: liveVideoFile,
  });
  try {
    await liveByTestId(page, `marketplace.media.entrypoints.thumbnail.${PHOTO_LIMIT}`).waitFor({ state: "visible", timeout: 90_000 });
  } catch (error) {
    const panelText = await liveByTestId(page, "marketplace.media.entrypoints").innerText({ timeout: 2_000 }).catch(() => "");
    throw new Error(`live video thumbnail did not appear: ${redactMessage(error)} panel=${panelText.slice(0, 500)}`);
  }
  await liveByTestId(page, `marketplace.media.entrypoints.thumbnail.video-duration.${PHOTO_LIMIT}`).waitFor({ state: "visible", timeout: 90_000 });
  await poll(
    "market-add-live-staging:video-uploaded",
    async () => {
      const text = await liveByTestId(page, `marketplace.media.entrypoints.thumbnail.upload-status.${PHOTO_LIMIT}`)
        .textContent({ timeout: 1_000 })
        .catch(() => "");
      return /uploaded|\u0437\u0430\u0433\u0440\u0443\u0436/i.test(String(text)) ? true : null;
    },
    90_000,
    500,
  );
  await liveByTestId(page, `marketplace.media.entrypoints.thumbnail.preview.${PHOTO_LIMIT}`).click();
  await liveByTestId(page, "marketplace.media.entrypoints.media-preview.video").waitFor({ state: "visible", timeout: 45_000 });

  const inlinePhotoPreview = await liveByTestId(page, "marketplace.media.entrypoints.media-preview.image")
    .isVisible()
    .catch(() => false);
  const inlineVideoPreview = await liveByTestId(page, "marketplace.media.entrypoints.media-preview.video")
    .isVisible()
    .catch(() => false);
  if (!inlinePhotoPreview && !inlineVideoPreview) {
    throw new Error("live inline media preview is not visible");
  }

  summary.error_step = "live_ui_fill_publish";
  writeLiveSummary(summaryPath, summary);
  await fillNthField(page, 0, title);
  await fillNthField(page, 1, "Live staging closeout listing with 7 photos and 1 video.");
  await fillNthField(page, 2, "Bishkek");
  await fillNthField(page, 3, "1");
  await fillNthField(page, 4, "+996700111222");
  const publishButton = liveByTestId(page, "add-listing-flow-publish").filter({ visible: true }).first();
  await publishButton.waitFor({ state: "visible", timeout: 45_000 });
  await poll(
    "market-add-live-staging:publish-enabled",
    async () => {
      const disabled = await publishButton.evaluate((node) =>
        node instanceof HTMLButtonElement ? node.disabled : node.getAttribute("aria-disabled") === "true",
      );
      return disabled ? null : true;
    },
    90_000,
    500,
  );
  await publishButton.scrollIntoViewIfNeeded();
  await publishButton.click({ force: true });
  await liveByTestId(page, "market-add-success-state").waitFor({ state: "visible", timeout: 120_000 });

  summary.error_step = "live_db_listing_and_media";
  writeLiveSummary(summaryPath, summary);
  const listing = await poll(
    "market-add-live-staging:listing-created",
    async () => {
      const row = await findLiveListingByTitle(session.client, title);
      return row && UUID_RE.test(normalizeString(row.id)) ? row : null;
    },
    120_000,
    1_000,
  );
  const listingId = normalizeString(listing.id);
  const listingCompanyId = normalizeString(listing.company_id) || null;
  summary.listing_id = listingId;
  summary.live_listing_created = true;
  writeLiveSummary(summaryPath, summary);

  const mediaRows = await waitForLiveMediaProof({ client: session.client, listingId });
  summary.media_asset_count = mediaRows.assets.length;
  summary.media_link_count = mediaRows.links.length;
  summary.photo_asset_count = mediaRows.assets.filter((row) => row.media_kind === "photo").length;
  summary.video_asset_count = mediaRows.assets.filter((row) => row.media_kind === "video").length;
  summary.live_real_storage_upload = true;
  summary.live_media_asset_rows_created = true;
  summary.live_listing_media_links_created = true;
  writeLiveSummary(summaryPath, summary);

  const imageAsset = mediaRows.assets.find((row) => row.media_kind === "photo") ?? null;
  const videoAsset = mediaRows.assets.find((row) => row.media_kind === "video") ?? null;
  const imageUrl = imageAsset ? livePublicUrlForAsset(session.client, imageAsset) : null;
  const videoUrl = videoAsset ? livePublicUrlForAsset(session.client, videoAsset) : null;
  summary.live_public_image_fetch_ok = await fetchPublicMediaUrl(imageUrl, "image");
  summary.live_public_video_fetch_ok = await fetchPublicMediaUrl(videoUrl, "video");
  if (!summary.live_public_image_fetch_ok || !summary.live_public_video_fetch_ok) {
    throw new Error("live public media fetch failed");
  }

  summary.error_step = "live_rpc_media_urls";
  writeLiveSummary(summaryPath, summary);
  const detailRow = await poll(
    "market-add-live-staging:detail-rpc-media-urls",
    async () => {
      const { data, error } = await session.client.rpc("marketplace_item_scope_detail_v1", { p_listing_id: listingId }).maybeSingle();
      if (error) throw error;
      const row = asRecord(data);
      const imageUrls = Array.isArray(row.image_urls) ? row.image_urls : JSON.parse(String(row.image_urls || "[]"));
      const videoUrls = Array.isArray(row.video_urls) ? row.video_urls : JSON.parse(String(row.video_urls || "[]"));
      return imageUrls.length === PHOTO_LIMIT && videoUrls.length === VIDEO_LIMIT ? row : null;
    },
    120_000,
    1_000,
  );
  const detailImageUrls = Array.isArray(detailRow.image_urls) ? detailRow.image_urls : JSON.parse(String(detailRow.image_urls || "[]"));
  const detailVideoUrls = Array.isArray(detailRow.video_urls) ? detailRow.video_urls : JSON.parse(String(detailRow.video_urls || "[]"));
  const finalUrls = [...detailImageUrls, ...detailVideoUrls].map((url) => stablePublicMediaUrl(url, getLiveSupabaseEnv().supabaseUrl));
  summary.live_no_blob_data_file_final_url = finalUrls.every((url) => Boolean(url));
  summary.live_no_fake_media = finalUrls.every((url) => !/fake|placeholder|category|media-local/i.test(String(url)));
  writeLiveSummary(summaryPath, summary);

  summary.error_step = "live_ui_market_card";
  writeLiveSummary(summaryPath, summary);
  await page.goto(`${baseUrl}/market`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await liveByTestId(page, "market-home-title").waitFor({ state: "visible", timeout: 90_000 });
  const optionalSearchInput = liveByTestId(page, "market_search_input");
  if ((await optionalSearchInput.count()) > 0) {
    await optionalSearchInput.first().fill(title);
  }
  await liveByTestId(page, `market_feed_card_${listingId}`).waitFor({ state: "visible", timeout: 90_000 });
  const cardUrl = await poll(
    "market-add-live-staging:card-uploaded-media-visible",
    async () => visibleStableMediaUrl(liveByTestId(page, `market_feed_card_image_${listingId}_0`), getLiveSupabaseEnv().supabaseUrl),
    90_000,
    1_000,
  );
  summary.live_card_uploaded_media_visible = true;
  summary.live_no_category_fallback_used_as_media_proof = !/category|fallback|placeholder/i.test(cardUrl);
  writeLiveSummary(summaryPath, summary);

  summary.error_step = "live_ui_detail";
  writeLiveSummary(summaryPath, summary);
  await page.goto(`${baseUrl}/product/${listingId}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await liveByTestId(page, "market_product_instant_title").waitFor({ state: "visible", timeout: 90_000 });
  await poll(
    "market-add-live-staging:detail-uploaded-media-visible",
    async () => visibleStableMediaUrl(liveByTestId(page, "market_product_hero_image"), getLiveSupabaseEnv().supabaseUrl),
    90_000,
    1_000,
  );
  await liveByTestId(page, `market_product_gallery_thumb_${PHOTO_LIMIT}`).waitFor({ state: "visible", timeout: 90_000 });
  await liveByTestId(page, `market_product_gallery_video_${PHOTO_LIMIT}`).waitFor({ state: "visible", timeout: 90_000 });
  const detailThumbCount = await page.locator('[data-testid^="market_product_gallery_thumb_"]').filter({ visible: true }).count();
  summary.live_detail_uploaded_media_visible = true;
  summary.live_detail_8_media_visible = detailThumbCount === PHOTO_LIMIT + VIDEO_LIMIT;
  writeLiveSummary(summaryPath, summary);

  summary.error_step = "live_ui_refresh";
  writeLiveSummary(summaryPath, summary);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
  await liveByTestId(page, "market_product_instant_title").waitFor({ state: "visible", timeout: 90_000 });
  await poll(
    "market-add-live-staging:detail-media-after-refresh",
    async () => visibleStableMediaUrl(liveByTestId(page, "market_product_hero_image"), getLiveSupabaseEnv().supabaseUrl),
    90_000,
    1_000,
  );
  summary.live_media_after_refresh_visible = true;
  writeLiveSummary(summaryPath, summary);

  return { listingId, listingCompanyId, links: mediaRows.links, assets: mediaRows.assets, finalUrls: [cardUrl, ...(finalUrls.filter(Boolean) as string[])] };
}

async function proveLiveMediaAfterRelogin(params: {
  browser: Browser;
  baseUrl: string;
  listingId: string;
  supabaseUrl: string;
}): Promise<boolean> {
  const context = await params.browser.newContext({
    geolocation: { latitude: 42.8746, longitude: 74.5698 },
    permissions: ["geolocation"],
  });
  try {
    await context.grantPermissions(["geolocation"], { origin: params.baseUrl });
    const page = await context.newPage();
    page.setDefaultTimeout(45_000);
    await loginLiveUi(page, params.baseUrl);
    await page.goto(`${params.baseUrl}/product/${params.listingId}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await liveByTestId(page, "market_product_instant_title").waitFor({ state: "visible", timeout: 90_000 });
    const heroUrl = await poll(
      "market-add-live-staging:detail-media-after-relogin",
      async () => visibleStableMediaUrl(liveByTestId(page, "market_product_hero_image"), params.supabaseUrl),
      90_000,
      1_000,
    );
    const thumbCount = await page.locator('[data-testid^="market_product_gallery_thumb_"]').filter({ visible: true }).count();
    return Boolean(heroUrl) && thumbCount === PHOTO_LIMIT + VIDEO_LIMIT;
  } finally {
    await context.close().catch(() => undefined);
  }
}

function allLiveAcceptanceGreen(summary: LiveMarketMediaAcceptanceSummary): boolean {
  return summary.live_real_storage_upload &&
    summary.live_media_asset_rows_created &&
    summary.live_listing_created &&
    summary.live_listing_media_links_created &&
    summary.live_public_image_fetch_ok &&
    summary.live_public_video_fetch_ok &&
    summary.live_card_uploaded_media_visible &&
    summary.live_detail_uploaded_media_visible &&
    summary.live_detail_8_media_visible &&
    summary.live_media_after_refresh_visible &&
    summary.live_media_after_relogin_visible &&
    summary.live_no_blob_data_file_final_url &&
    summary.live_no_fake_media &&
    summary.live_no_category_fallback_used_as_media_proof &&
    summary.live_cleanup_scope_bounded &&
    summary.live_cleanup_idempotent &&
    !summary.production_db_touched &&
    !summary.destructive_migration_run &&
    !summary.native_build_started &&
    !summary.eas_started &&
    !summary.release_started &&
    !summary.full_jest_started &&
    !summary.fake_green_claimed;
}

async function runLiveStagingAcceptance(): Promise<LiveMarketMediaAcceptanceSummary> {
  const contextInfo = buildLiveArtifactContext();
  fs.mkdirSync(contextInfo.artifactDir, { recursive: true });
  const summary = buildInitialLiveSummary(contextInfo);
  writeLiveSummary(contextInfo.summaryPath, summary);
  let server: WebServerHandle | null = null;
  let browser: Browser | null = null;
  try {
    summary.error_step = "live_env";
    writeLiveSummary(contextInfo.summaryPath, summary);
    const env = assertLiveSafeEnvironment(summary);
    const session = await signInLiveForeman({
      supabaseUrl: env.supabaseUrl,
      supabaseAnonKey: env.supabaseAnonKey,
      companyId: env.companyId,
    });
    const title = `market-media-live-ui-${contextInfo.runId}`;

    summary.error_step = "live_web_server";
    writeLiveSummary(contextInfo.summaryPath, summary);
    server = await ensureLiveStagingWebServer({
      supabaseUrl: env.supabaseUrl,
      supabaseAnonKey: env.supabaseAnonKey,
    });
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      geolocation: { latitude: 42.8746, longitude: 74.5698 },
      permissions: ["geolocation"],
      viewport: { width: 1440, height: 980 },
    });
    await context.grantPermissions(["geolocation"], { origin: server.baseUrl });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(45_000);
      try {
        const published = await runLiveUiScenario({
          page,
          baseUrl: server.baseUrl,
          session,
          title,
          summary,
          summaryPath: contextInfo.summaryPath,
        });
        summary.live_media_after_relogin_visible = await proveLiveMediaAfterRelogin({
          browser,
          baseUrl: server.baseUrl,
          listingId: published.listingId,
          supabaseUrl: env.supabaseUrl,
        });
        writeLiveSummary(contextInfo.summaryPath, summary);

        summary.error_step = "live_cleanup";
        writeLiveSummary(contextInfo.summaryPath, summary);
        await cleanupLiveAcceptanceScope({
          summary,
          session,
          title,
          listingId: published.listingId,
          listingCompanyId: published.listingCompanyId,
          assets: published.assets,
          links: published.links,
          summaryPath: contextInfo.summaryPath,
        });
      } catch (error) {
        try {
          await cleanupLiveAcceptanceScopeAfterFailure({
            summary,
            session,
            title,
            summaryPath: contextInfo.summaryPath,
          });
        } catch (cleanupError) {
          throw new Error(`live market media acceptance failed and cleanup after failure failed: ${redactMessage(error)}; cleanup=${redactMessage(cleanupError)}`);
        }
        throw error;
      }
    } finally {
      await context.close().catch(() => undefined);
    }

    summary.live_market_media_acceptance_passed = allLiveAcceptanceGreen(summary);
    summary.final_status = summary.live_market_media_acceptance_passed
      ? "GREEN_LIVE_MARKET_MEDIA_ACCEPTANCE"
      : "STOP_LIVE_MARKET_MEDIA_ACCEPTANCE_FAILED";
    summary.error_step = summary.live_market_media_acceptance_passed ? null : summary.error_step;
    writeLiveSummary(contextInfo.summaryPath, summary);
    if (!summary.live_market_media_acceptance_passed) {
      throw new Error("live market media acceptance booleans are not all green");
    }
    return summary;
  } catch (error) {
    summary.error_message = redactMessage(error);
    const message = String(summary.error_message);
    summary.final_status = message.includes("STOP_LIVE_STAGING_ENV_NOT_CONFIGURED")
      ? "STOP_LIVE_STAGING_ENV_NOT_CONFIGURED_FOR_MARKET_PRODUCTION_PROOF"
      : message.includes("STOP_LIVE_STAGING_CLEANUP_NOT_PROVED")
        ? "STOP_LIVE_STAGING_CLEANUP_NOT_PROVED"
        : "STOP_LIVE_MARKET_MEDIA_ACCEPTANCE_FAILED";
    writeLiveSummary(contextInfo.summaryPath, summary);
    throw error;
  } finally {
    await browser?.close().catch(() => undefined);
    server?.stop();
  }
}

async function runSmoke(): Promise<SmokeResult> {
  const server = await ensureLocalWebServer();
  try {
    if (smokeTarget === "android-chrome") {
      await ensureAndroidChromeDevToolsReady();
    }
    let browser: Browser;
    let context: BrowserContext;
    if (smokeTarget === "android-chrome") {
      browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
      context = browser.contexts()[0] ?? await browser.newContext();
      await context.setGeolocation({ latitude: 42.8746, longitude: 74.5698 });
      await context.grantPermissions(["geolocation"], { origin: server.baseUrl });
    } else {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({
        geolocation: { latitude: 42.8746, longitude: 74.5698 },
        permissions: ["geolocation"],
      });
    }
  const fakeAuthSession = buildFakeAuthSession();
  await context.addInitScript(
    ({ storageKeys, session }) => {
      const serializedSession = JSON.stringify(session);
      for (const storageKey of storageKeys) {
        window.localStorage.setItem(storageKey, serializedSession);
      }
    },
    { storageKeys: SUPABASE_AUTH_STORAGE_KEYS, session: fakeAuthSession },
  );

  const capture: FakeSupabaseCapture = {
    currentScenarioKind: "material",
    scenarios: {
      material: buildScenarioCapture(),
      work: buildScenarioCapture(),
      service: buildScenarioCapture(),
      delivery: buildScenarioCapture(),
      rent: buildScenarioCapture(),
    },
    unhandledRequests: [],
  };
  await installFakeSupabase(context, capture);

  let page = await createSmokePage(context);
  const runtime = {
    pageErrorCount: 0,
    consoleErrorCount: 0,
    consoleWarnCount: 0,
    dialogMessages: [] as string[],
    consoleWarnMessages: [] as string[],
    consoleErrorMessages: [] as string[],
    pageErrorMessages: [] as string[],
    pageErrorClassifications: [] as string[],
    pageErrorUnclassifiedMessages: [] as string[],
    consoleWarnClassifications: [] as string[],
    consoleWarnUnclassifiedMessages: [] as string[],
  };
  const attachRuntimeListeners = (targetPage: Page) => {
    targetPage.on("pageerror", (error) => {
      runtime.pageErrorCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      runtime.pageErrorMessages.push(message);
      const classification = classifyKnownPageError(message);
      if (classification) {
        runtime.pageErrorClassifications.push(classification);
      } else {
        runtime.pageErrorUnclassifiedMessages.push(message);
      }
    });
    targetPage.on("console", (message) => {
      if (message.type() === "error") {
        runtime.consoleErrorCount += 1;
        runtime.consoleErrorMessages.push(message.text());
      }
      if (message.type() === "warning") {
        runtime.consoleWarnCount += 1;
        const text = message.text();
        runtime.consoleWarnMessages.push(text);
        const classification = classifyKnownBootConsoleWarning(text);
        if (classification) {
          runtime.consoleWarnClassifications.push(classification);
        } else {
          runtime.consoleWarnUnclassifiedMessages.push(text);
        }
      }
    });
    targetPage.on("dialog", async (dialog) => {
      runtime.dialogMessages.push(`${dialog.type()}:${dialog.message()}`);
      await dialog.accept().catch(() => undefined);
    });
  };
  attachRuntimeListeners(page);

  let screenshot: string | null = null;
  let openStep: string | null = null;
  let scenarioResults: ScenarioSmokeResult[] = [];
  let marketScrollTopProof = buildFailedMarketScrollTopProof();

  try {
    if (smokeTarget === "android-chrome") {
      await warmAndroidMediaThumbnailPipeline({
        page,
        baseUrl: server.baseUrl,
        capture,
      });
      await page.close().catch(() => undefined);
      page = await createSmokePage(context);
      attachRuntimeListeners(page);
    }
    for (const [scenarioIndex, scenario] of SMOKE_SCENARIOS.entries()) {
      const outcome = await runScenario({
        page,
        baseUrl: server.baseUrl,
        capture,
        scenario,
      });
      openStep ??= outcome.openStep;
      scenarioResults.push(outcome.result);
      if (smokeTarget === "android-chrome" && scenarioIndex < SMOKE_SCENARIOS.length - 1) {
        await page.close().catch(() => undefined);
        page = await createSmokePage(context);
        attachRuntimeListeners(page);
      }
    }
    marketScrollTopProof = await proveMarketScrollTopButton({
      page,
      baseUrl: server.baseUrl,
      firstListingId: SMOKE_SCENARIOS[0].listingId,
      targetListingId: SMOKE_SCENARIOS[SMOKE_SCENARIOS.length - 1].listingId,
    });

    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({
      path: screenshotPath,
      fullPage: smokeTarget !== "android-chrome",
      timeout: smokeTarget === "android-chrome" ? 10_000 : 30_000,
    }).then(() => {
      screenshot = path.relative(projectRoot, screenshotPath).replace(/\\/g, "/");
    }).catch(() => {
      screenshot = fs.existsSync(screenshotPath)
        ? path.relative(projectRoot, screenshotPath).replace(/\\/g, "/")
        : null;
    });

    const slowestMarketFirstContentMs = scenarioResults.reduce<number | null>(
      (max, item) => item.marketFirstContentMs == null ? max : Math.max(max ?? 0, item.marketFirstContentMs),
      null,
    );
    const slowestMarketOpenMs = scenarioResults.reduce<number | null>(
      (max, item) => item.marketOpenMs == null ? max : Math.max(max ?? 0, item.marketOpenMs),
      null,
    );
    const slowestMyListingsFirstContentMs = scenarioResults.reduce<number | null>(
      (max, item) => item.myListingsFirstContentMs == null ? max : Math.max(max ?? 0, item.myListingsFirstContentMs),
      null,
    );
    const slowestProductOpenMs = scenarioResults.reduce<number | null>(
      (max, item) => item.productOpenMs == null ? max : Math.max(max ?? 0, item.productOpenMs),
      null,
    );
    const slowestCreateListingOpenMs = scenarioResults.reduce<number | null>(
      (max, item) => item.createListingOpenMs == null ? max : Math.max(max ?? 0, item.createListingOpenMs),
      null,
    );
    const slowestThumbnailRenderAfterPickMs = scenarioResults.reduce<number | null>(
      (max, item) => item.thumbnailRenderAfterPickMs == null ? max : Math.max(max ?? 0, item.thumbnailRenderAfterPickMs),
      null,
    );
    const slowestPublishWithMediaMs = scenarioResults.reduce<number | null>(
      (max, item) => item.publishWithMediaMs == null ? max : Math.max(max ?? 0, item.publishWithMediaMs),
      null,
    );
    const firstScenario = scenarioResults[0] ?? null;
    const marketFeedFullRouteBudgetMs = smokeTarget === "android-chrome"
      ? ANDROID_CHROME_MARKET_FEED_FULL_ROUTE_BUDGET_MS
      : MARKET_FEED_FULL_ROUTE_BUDGET_MS;
    const marketFirstContentBudgetMs = smokeTarget === "android-chrome"
      ? ANDROID_MARKET_OPEN_BUDGET_MS
      : MARKET_FEED_FIRST_CONTENT_BUDGET_MS;
    const productDetailOpenBudgetMs = smokeTarget === "android-chrome"
      ? ANDROID_PRODUCT_DETAIL_OPEN_BUDGET_MS
      : PRODUCT_INSTANT_OPEN_BUDGET_MS;
    const androidMarketOpenBudgetPassed = smokeTarget === "android-chrome"
      ? slowestMarketFirstContentMs != null && slowestMarketFirstContentMs <= ANDROID_MARKET_OPEN_BUDGET_MS
      : null;
    const androidProductDetailOpenBudgetPassed = smokeTarget === "android-chrome"
      ? slowestProductOpenMs != null && slowestProductOpenMs <= ANDROID_PRODUCT_DETAIL_OPEN_BUDGET_MS
      : null;
    const androidCreateListingOpenBudgetPassed = smokeTarget === "android-chrome"
      ? slowestCreateListingOpenMs != null && slowestCreateListingOpenMs <= ANDROID_CREATE_LISTING_OPEN_BUDGET_MS
      : null;
    const androidThumbnailRenderBudgetPassed = smokeTarget === "android-chrome"
      ? slowestThumbnailRenderAfterPickMs != null && slowestThumbnailRenderAfterPickMs <= ANDROID_THUMBNAIL_RENDER_AFTER_PICK_BUDGET_MS
      : null;
    const androidPublishBudgetPassed = smokeTarget === "android-chrome"
      ? slowestPublishWithMediaMs != null && slowestPublishWithMediaMs <= ANDROID_PUBLISH_WITH_MEDIA_BUDGET_MS
      : null;
    const androidSplitBudgetsGreen =
      smokeTarget !== "android-chrome" ||
      (
        androidMarketOpenBudgetPassed === true &&
        androidProductDetailOpenBudgetPassed === true &&
        androidCreateListingOpenBudgetPassed === true &&
        androidThumbnailRenderBudgetPassed === true &&
        androidPublishBudgetPassed === true
      );
    const allScenariosGreen =
      scenarioResults.length === SMOKE_SCENARIOS.length &&
      scenarioResults.every((item) =>
        item.selectedPhotoDisplayed &&
        item.selectedVideoDisplayed &&
        item.photoCount === PHOTO_LIMIT &&
        item.videoCount === VIDEO_LIMIT &&
        item.previewModalDisplayed &&
        item.listingInserted &&
        item.mediaLinkConfirmed &&
        item.marketCardImageDisplayed &&
        item.myListingVisible &&
        item.myListingMediaVisible &&
        item.myListingAfterRefreshVisible &&
        item.myListingAfterReloginVisible &&
        item.productImageDisplayed &&
        item.productVideoThumbDisplayed &&
        item.productGalleryThumbCount === item.photoCount + item.videoCount &&
        item.uploadSessionCount === item.photoCount + item.videoCount &&
        item.storageUploadCount === item.photoCount + item.videoCount &&
        item.completedUploadCount === item.photoCount + item.videoCount &&
        item.marketFirstContentMs != null &&
        item.marketFirstContentMs <= marketFirstContentBudgetMs &&
        item.marketOpenMs != null &&
        item.marketOpenMs <= marketFeedFullRouteBudgetMs &&
        item.myListingsFirstContentMs != null &&
        item.myListingsFirstContentMs <= MY_LISTINGS_FIRST_CONTENT_BUDGET_MS &&
        item.productOpenMs != null &&
        item.productOpenMs <= productDetailOpenBudgetMs &&
        (
          smokeTarget !== "android-chrome" ||
          (
            item.createListingOpenMs != null &&
            item.createListingOpenMs <= ANDROID_CREATE_LISTING_OPEN_BUDGET_MS &&
            item.thumbnailRenderAfterPickMs != null &&
            item.thumbnailRenderAfterPickMs <= ANDROID_THUMBNAIL_RENDER_AFTER_PICK_BUDGET_MS &&
            item.publishWithMediaMs != null &&
            item.publishWithMediaMs <= ANDROID_PUBLISH_WITH_MEDIA_BUDGET_MS
          )
        )
      ) &&
      androidSplitBudgetsGreen;
    const marketScrollTopButtonWorks =
      marketScrollTopProof.visibleAfterScroll &&
      marketScrollTopProof.scrollsToAbsoluteTop &&
      marketScrollTopProof.doesNotStepOneCard &&
      marketScrollTopProof.doesNotRequireMultipleClicks &&
      marketScrollTopProof.positionAfterClickPx != null &&
      marketScrollTopProof.positionAfterClickPx <= 5 &&
      marketScrollTopProof.firstListingVisibleAfterScrollTop &&
      marketScrollTopProof.filterHeaderVisibleAfterScrollTop;
    const status =
      allScenariosGreen &&
      marketScrollTopButtonWorks &&
      runtime.pageErrorUnclassifiedMessages.length === 0 &&
      runtime.consoleErrorCount === 0 &&
      runtime.consoleWarnUnclassifiedMessages.length === 0 &&
      capture.unhandledRequests.length === 0
        ? "GREEN"
        : "NOT_GREEN";

    return {
      checkedAt: new Date().toISOString(),
      status,
      target: smokeTarget,
      baseUrl: server.baseUrl,
      currentUrl: page.url(),
      openStep,
      webServerStartedByVerifier: server.started,
      photoLimit: PHOTO_LIMIT,
      videoLimit: VIDEO_LIMIT,
      selectedPhotoCount: firstScenario?.selectedPhotoCount ?? 0,
      selectedVideoDisplayed: scenarioResults.every((item) => item.selectedVideoDisplayed),
      selectedPhotoDisplayed: scenarioResults.every((item) => item.selectedPhotoDisplayed),
      previewModalDisplayed: scenarioResults.every((item) => item.previewModalDisplayed),
      scenarioResults,
      slowestMarketFirstContentMs,
      slowestMarketOpenMs,
      slowestMyListingsFirstContentMs,
      slowestProductOpenMs,
      slowestCreateListingOpenMs,
      slowestThumbnailRenderAfterPickMs,
      slowestPublishWithMediaMs,
      androidMarketOpenMs: smokeTarget === "android-chrome" ? slowestMarketFirstContentMs : null,
      androidProductDetailOpenMs: smokeTarget === "android-chrome" ? slowestProductOpenMs : null,
      androidCreateListingOpenMs: smokeTarget === "android-chrome" ? slowestCreateListingOpenMs : null,
      androidThumbnailRenderAfterPickMs: smokeTarget === "android-chrome" ? slowestThumbnailRenderAfterPickMs : null,
      androidPublishWith7Photos1VideoMs: smokeTarget === "android-chrome" ? slowestPublishWithMediaMs : null,
      androidMarketOpenBudgetPassed,
      androidProductDetailOpenBudgetPassed,
      androidCreateListingOpenBudgetPassed,
      androidThumbnailRenderBudgetPassed,
      androidPublishBudgetPassed,
      androidFullRouteBudgetMs: smokeTarget === "android-chrome" ? marketFeedFullRouteBudgetMs : null,
      marketScrollTopButtonWorks,
      marketScrollTopButtonAbsoluteTop: marketScrollTopProof.scrollsToAbsoluteTop,
      marketScrollTopButtonSingleClick: marketScrollTopProof.doesNotRequireMultipleClicks,
      marketScrollTopProof,
      myListingsPassed: scenarioResults.every((item) =>
        item.myListingVisible &&
        item.myListingAfterRefreshVisible &&
        item.myListingAfterReloginVisible
      ),
      myListingsMediaVisible: scenarioResults.every((item) => item.myListingMediaVisible),
      myListingsAfterRefreshVisible: scenarioResults.every((item) => item.myListingAfterRefreshVisible),
      myListingsAfterReloginVisible: scenarioResults.every((item) => item.myListingAfterReloginVisible),
      productImageDisplayed: scenarioResults.every((item) => item.productImageDisplayed),
      productGalleryThumbCount: firstScenario?.productGalleryThumbCount ?? 0,
      productVideoThumbDisplayed: scenarioResults.every((item) => item.productVideoThumbDisplayed),
      listingInserted: scenarioResults.every((item) => item.listingInserted),
      mediaLinkConfirmed: scenarioResults.every((item) => item.mediaLinkConfirmed),
      listingId: firstScenario?.listingId ?? null,
      mediaAssetId: firstScenario?.insertedMediaAssetIds[0] ?? null,
      insertedMediaAssetIds: scenarioResults.flatMap((item) => item.insertedMediaAssetIds),
      insertedMediaAssets: scenarioResults.flatMap((item) => item.insertedMediaAssets),
      confirmPurposes: scenarioResults.flatMap((item) => item.confirmPurposes),
      dialogMessages: runtime.dialogMessages,
      consoleWarnMessages: runtime.consoleWarnMessages.slice(0, 30),
      consoleErrorMessages: runtime.consoleErrorMessages.slice(0, 30),
      pageErrorMessages: runtime.pageErrorMessages.slice(0, 30),
      pageErrorClassifications: [...new Set(runtime.pageErrorClassifications)].sort(),
      pageErrorUnclassifiedMessages: runtime.pageErrorUnclassifiedMessages.slice(0, 30),
      consoleWarnClassifications: [...new Set(runtime.consoleWarnClassifications)].sort(),
      consoleWarnUnclassifiedMessages: runtime.consoleWarnUnclassifiedMessages.slice(0, 30),
      uploadSessionCount: scenarioResults.reduce((sum, item) => sum + item.uploadSessionCount, 0),
      storageUploadCount: scenarioResults.reduce((sum, item) => sum + item.storageUploadCount, 0),
      completedUploadCount: scenarioResults.reduce((sum, item) => sum + item.completedUploadCount, 0),
      fieldValuesBeforePublish: firstScenario?.fieldValuesBeforePublish ?? [],
      publishButtonDisabled: firstScenario?.publishButtonDisabled ?? null,
      publishStateText: firstScenario?.publishStateText ?? null,
      errorSummaryText: firstScenario?.errorSummaryText ?? null,
      pageErrorCount: runtime.pageErrorCount,
      consoleErrorCount: runtime.consoleErrorCount,
      consoleWarnCount: runtime.consoleWarnCount,
      screenshot,
      unhandledFakeSupabaseRequests: capture.unhandledRequests,
    };

  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    const captures = SMOKE_SCENARIOS.map((scenario) => capture.scenarios[scenario.kind]);
    const firstScenario = scenarioResults[0] ?? null;
    const slowestMarketFirstContentMs = scenarioResults.reduce<number | null>(
      (max, item) => item.marketFirstContentMs == null ? max : Math.max(max ?? 0, item.marketFirstContentMs),
      null,
    );
    const slowestMarketOpenMs = scenarioResults.reduce<number | null>(
      (max, item) => item.marketOpenMs == null ? max : Math.max(max ?? 0, item.marketOpenMs),
      null,
    );
    const slowestMyListingsFirstContentMs = scenarioResults.reduce<number | null>(
      (max, item) => item.myListingsFirstContentMs == null ? max : Math.max(max ?? 0, item.myListingsFirstContentMs),
      null,
    );
    const slowestProductOpenMs = scenarioResults.reduce<number | null>(
      (max, item) => item.productOpenMs == null ? max : Math.max(max ?? 0, item.productOpenMs),
      null,
    );
    const slowestCreateListingOpenMs = scenarioResults.reduce<number | null>(
      (max, item) => item.createListingOpenMs == null ? max : Math.max(max ?? 0, item.createListingOpenMs),
      null,
    );
    const slowestThumbnailRenderAfterPickMs = scenarioResults.reduce<number | null>(
      (max, item) => item.thumbnailRenderAfterPickMs == null ? max : Math.max(max ?? 0, item.thumbnailRenderAfterPickMs),
      null,
    );
    const slowestPublishWithMediaMs = scenarioResults.reduce<number | null>(
      (max, item) => item.publishWithMediaMs == null ? max : Math.max(max ?? 0, item.publishWithMediaMs),
      null,
    );
    const insertedMediaAssetIds = captures.flatMap((entry) =>
      readConfirmMediaAssetIds(entry.mediaConfirmRequests),
    );
    const insertedMediaAssets = captures.flatMap((entry) =>
      readInsertedMediaAssets(entry.listingInsertPayloads[0]),
    );
    const confirmPurposes = captures.flatMap((entry) => readConfirmPurposes(entry.mediaConfirmRequests));
    const uploadSessionCount = captures.reduce((sum, entry) => sum + entry.uploadSessionRequests.length, 0);
    const storageUploadCount = captures.reduce((sum, entry) => sum + entry.uploadedStoragePaths.length, 0);
    const completedUploadCount = captures.reduce((sum, entry) => sum + entry.completedUploadRequests.length, 0);
    const listingInserted = captures.some((entry) => entry.listingInsertPayloads.length > 0);
    const mediaLinkConfirmed = captures.some((entry) => entry.mediaConfirmRequests.length > 0);

    return {
      checkedAt: new Date().toISOString(),
      status: "NOT_GREEN",
      target: smokeTarget,
      baseUrl: server.baseUrl,
      currentUrl: page.url(),
      openStep,
      webServerStartedByVerifier: server.started,
      photoLimit: PHOTO_LIMIT,
      videoLimit: VIDEO_LIMIT,
      selectedPhotoCount: firstScenario?.selectedPhotoCount ?? 0,
      selectedVideoDisplayed: scenarioResults.length > 0 && scenarioResults.every((item) => item.selectedVideoDisplayed),
      selectedPhotoDisplayed: scenarioResults.length > 0 && scenarioResults.every((item) => item.selectedPhotoDisplayed),
      previewModalDisplayed: scenarioResults.length > 0 && scenarioResults.every((item) => item.previewModalDisplayed),
      scenarioResults,
      slowestMarketFirstContentMs,
      slowestMarketOpenMs,
      slowestMyListingsFirstContentMs,
      slowestProductOpenMs,
      slowestCreateListingOpenMs,
      slowestThumbnailRenderAfterPickMs,
      slowestPublishWithMediaMs,
      androidMarketOpenMs: smokeTarget === "android-chrome" ? slowestMarketFirstContentMs : null,
      androidProductDetailOpenMs: smokeTarget === "android-chrome" ? slowestProductOpenMs : null,
      androidCreateListingOpenMs: smokeTarget === "android-chrome" ? slowestCreateListingOpenMs : null,
      androidThumbnailRenderAfterPickMs: smokeTarget === "android-chrome" ? slowestThumbnailRenderAfterPickMs : null,
      androidPublishWith7Photos1VideoMs: smokeTarget === "android-chrome" ? slowestPublishWithMediaMs : null,
      androidMarketOpenBudgetPassed: smokeTarget === "android-chrome"
        ? slowestMarketFirstContentMs != null && slowestMarketFirstContentMs <= ANDROID_MARKET_OPEN_BUDGET_MS
        : null,
      androidProductDetailOpenBudgetPassed: smokeTarget === "android-chrome"
        ? slowestProductOpenMs != null && slowestProductOpenMs <= ANDROID_PRODUCT_DETAIL_OPEN_BUDGET_MS
        : null,
      androidCreateListingOpenBudgetPassed: smokeTarget === "android-chrome"
        ? slowestCreateListingOpenMs != null && slowestCreateListingOpenMs <= ANDROID_CREATE_LISTING_OPEN_BUDGET_MS
        : null,
      androidThumbnailRenderBudgetPassed: smokeTarget === "android-chrome"
        ? slowestThumbnailRenderAfterPickMs != null && slowestThumbnailRenderAfterPickMs <= ANDROID_THUMBNAIL_RENDER_AFTER_PICK_BUDGET_MS
        : null,
      androidPublishBudgetPassed: smokeTarget === "android-chrome"
        ? slowestPublishWithMediaMs != null && slowestPublishWithMediaMs <= ANDROID_PUBLISH_WITH_MEDIA_BUDGET_MS
        : null,
      androidFullRouteBudgetMs: smokeTarget === "android-chrome" ? ANDROID_CHROME_MARKET_FEED_FULL_ROUTE_BUDGET_MS : null,
      marketScrollTopButtonWorks: false,
      marketScrollTopButtonAbsoluteTop: marketScrollTopProof.scrollsToAbsoluteTop,
      marketScrollTopButtonSingleClick: marketScrollTopProof.doesNotRequireMultipleClicks,
      marketScrollTopProof,
      myListingsPassed: scenarioResults.length > 0 && scenarioResults.every((item) =>
        item.myListingVisible &&
        item.myListingAfterRefreshVisible &&
        item.myListingAfterReloginVisible
      ),
      myListingsMediaVisible: scenarioResults.length > 0 && scenarioResults.every((item) => item.myListingMediaVisible),
      myListingsAfterRefreshVisible: scenarioResults.length > 0 && scenarioResults.every((item) => item.myListingAfterRefreshVisible),
      myListingsAfterReloginVisible: scenarioResults.length > 0 && scenarioResults.every((item) => item.myListingAfterReloginVisible),
      productImageDisplayed: scenarioResults.length > 0 && scenarioResults.every((item) => item.productImageDisplayed),
      productGalleryThumbCount: firstScenario?.productGalleryThumbCount ?? 0,
      productVideoThumbDisplayed: scenarioResults.length > 0 && scenarioResults.every((item) => item.productVideoThumbDisplayed),
      listingInserted,
      mediaLinkConfirmed,
      listingId: firstScenario?.listingId ?? null,
      mediaAssetId: insertedMediaAssetIds[0] ?? null,
      insertedMediaAssetIds,
      insertedMediaAssets,
      confirmPurposes,
      dialogMessages: runtime.dialogMessages,
      consoleWarnMessages: runtime.consoleWarnMessages.slice(0, 30),
      consoleErrorMessages: runtime.consoleErrorMessages.slice(0, 30),
      pageErrorMessages: runtime.pageErrorMessages.slice(0, 30),
      pageErrorClassifications: [...new Set(runtime.pageErrorClassifications)].sort(),
      pageErrorUnclassifiedMessages: runtime.pageErrorUnclassifiedMessages.slice(0, 30),
      consoleWarnClassifications: [...new Set(runtime.consoleWarnClassifications)].sort(),
      consoleWarnUnclassifiedMessages: runtime.consoleWarnUnclassifiedMessages.slice(0, 30),
      uploadSessionCount,
      storageUploadCount,
      completedUploadCount,
      fieldValuesBeforePublish: firstScenario?.fieldValuesBeforePublish ?? [],
      publishButtonDisabled: firstScenario?.publishButtonDisabled ?? null,
      publishStateText: firstScenario?.publishStateText ?? null,
      errorSummaryText: firstScenario?.errorSummaryText ?? null,
      pageErrorCount: runtime.pageErrorCount,
      consoleErrorCount: runtime.consoleErrorCount,
      consoleWarnCount: runtime.consoleWarnCount,
      screenshot: fs.existsSync(screenshotPath)
        ? path.relative(projectRoot, screenshotPath).replace(/\\/g, "/")
        : null,
      unhandledFakeSupabaseRequests: capture.unhandledRequests,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser.close().catch(() => undefined);
    server.stop();
  }
  } catch (error) {
    server.stop();
    throw error;
  }
}

function writeProof(result: SmokeResult) {
  writeJson(artifactJsonPath, result);
  writeText(
    artifactMdPath,
    [
      "# Market Add Web Media Publish Smoke",
      "",
      `status: ${result.status}`,
      `target: ${result.target}`,
      `baseUrl: ${result.baseUrl}`,
      `currentUrl: ${result.currentUrl ?? "-"}`,
      `openStep: ${result.openStep ?? "-"}`,
      `photoLimit: ${result.photoLimit}`,
      `videoLimit: ${result.videoLimit}`,
      `selectedPhotoCount: ${result.selectedPhotoCount}`,
      `selectedPhotoDisplayed: ${result.selectedPhotoDisplayed}`,
      `selectedVideoDisplayed: ${result.selectedVideoDisplayed}`,
      `previewModalDisplayed: ${result.previewModalDisplayed}`,
      `slowestMarketFirstContentMs: ${result.slowestMarketFirstContentMs ?? "-"}`,
      `slowestMarketOpenMs: ${result.slowestMarketOpenMs ?? "-"}`,
      `slowestMyListingsFirstContentMs: ${result.slowestMyListingsFirstContentMs ?? "-"}`,
      `slowestProductOpenMs: ${result.slowestProductOpenMs ?? "-"}`,
      `android_market_open_ms: ${result.androidMarketOpenMs ?? "-"}`,
      `android_product_detail_open_ms: ${result.androidProductDetailOpenMs ?? "-"}`,
      `android_create_listing_open_ms: ${result.androidCreateListingOpenMs ?? "-"}`,
      `android_thumbnail_render_after_pick_ms: ${result.androidThumbnailRenderAfterPickMs ?? "-"}`,
      `android_publish_with_7_photos_1_video_ms: ${result.androidPublishWith7Photos1VideoMs ?? "-"}`,
      `android_full_route_budget_ms: ${result.androidFullRouteBudgetMs ?? "-"}`,
      `android_market_open_budget_passed: ${result.androidMarketOpenBudgetPassed ?? "-"}`,
      `android_product_detail_open_budget_passed: ${result.androidProductDetailOpenBudgetPassed ?? "-"}`,
      `android_create_listing_open_budget_passed: ${result.androidCreateListingOpenBudgetPassed ?? "-"}`,
      `android_thumbnail_render_budget_passed: ${result.androidThumbnailRenderBudgetPassed ?? "-"}`,
      `android_publish_budget_passed: ${result.androidPublishBudgetPassed ?? "-"}`,
      `market_scroll_top_button_works: ${result.marketScrollTopButtonWorks}`,
      `market_scroll_top_button_absolute_top: ${result.marketScrollTopButtonAbsoluteTop}`,
      `market_scroll_top_button_single_click: ${result.marketScrollTopButtonSingleClick}`,
      `market_scroll_position_before_click_px: ${result.marketScrollTopProof.positionBeforeClickPx ?? "-"}`,
      `market_scroll_position_after_click_px: ${result.marketScrollTopProof.positionAfterClickPx ?? "-"}`,
      `market_first_listing_visible_after_scroll_top: ${result.marketScrollTopProof.firstListingVisibleAfterScrollTop}`,
      `market_filter_header_visible_after_scroll_top: ${result.marketScrollTopProof.filterHeaderVisibleAfterScrollTop}`,
      `myListingsPassed: ${result.myListingsPassed}`,
      `myListingsMediaVisible: ${result.myListingsMediaVisible}`,
      `myListingsAfterRefreshVisible: ${result.myListingsAfterRefreshVisible}`,
      `myListingsAfterReloginVisible: ${result.myListingsAfterReloginVisible}`,
      `scenarioResults: ${result.scenarioResults.map((item) => `${item.kind}:photo=${item.selectedPhotoCount}/${item.photoCount}:video=${item.selectedVideoCount}/${item.videoCount}:marketFirst=${item.marketFirstContentMs ?? "-"}ms:market=${item.marketOpenMs ?? "-"}ms:my=${item.myListingsFirstContentMs ?? "-"}ms:product=${item.productOpenMs ?? "-"}ms:thumbs=${item.productGalleryThumbCount}`).join(" | ") || "-"}`,
      `productImageDisplayed: ${result.productImageDisplayed}`,
      `productGalleryThumbCount: ${result.productGalleryThumbCount}`,
      `productVideoThumbDisplayed: ${result.productVideoThumbDisplayed}`,
      `listingInserted: ${result.listingInserted}`,
      `mediaLinkConfirmed: ${result.mediaLinkConfirmed}`,
      `listingId: ${result.listingId ?? "-"}`,
      `mediaAssetId: ${result.mediaAssetId ?? "-"}`,
      `confirmPurposes: ${result.confirmPurposes.join(", ") || "-"}`,
      `dialogMessages: ${result.dialogMessages.join(" | ") || "-"}`,
      `consoleWarnMessages: ${result.consoleWarnMessages.join(" | ") || "-"}`,
      `consoleErrorMessages: ${result.consoleErrorMessages.join(" | ") || "-"}`,
      `pageErrorMessages: ${result.pageErrorMessages.join(" | ") || "-"}`,
      `pageErrorClassifications: ${result.pageErrorClassifications.join(", ") || "-"}`,
      `pageErrorUnclassifiedMessages: ${result.pageErrorUnclassifiedMessages.join(" | ") || "-"}`,
      `consoleWarnClassifications: ${result.consoleWarnClassifications.join(", ") || "-"}`,
      `consoleWarnUnclassifiedMessages: ${result.consoleWarnUnclassifiedMessages.join(" | ") || "-"}`,
      `uploadSessionCount: ${result.uploadSessionCount}`,
      `storageUploadCount: ${result.storageUploadCount}`,
      `completedUploadCount: ${result.completedUploadCount}`,
      `fieldValuesBeforePublish: ${result.fieldValuesBeforePublish.join(" | ") || "-"}`,
      `publishButtonDisabled: ${result.publishButtonDisabled}`,
      `publishStateText: ${result.publishStateText ?? "-"}`,
      `errorSummaryText: ${result.errorSummaryText ?? "-"}`,
      `pageErrorCount: ${result.pageErrorCount}`,
      `consoleErrorCount: ${result.consoleErrorCount}`,
      `consoleWarnCount: ${result.consoleWarnCount}`,
      result.screenshot ? `screenshot: ${result.screenshot}` : "screenshot: -",
      "",
    ].join("\n"),
  );
}

if (liveE2E) {
  runLiveStagingAcceptance()
    .then((summary) => {
      console.info(JSON.stringify({
        final_status: summary.final_status,
        artifact_dir: summary.artifact_dir,
        listing_id: summary.listing_id,
        media_asset_count: summary.media_asset_count,
        media_link_count: summary.media_link_count,
        photo_asset_count: summary.photo_asset_count,
        video_asset_count: summary.video_asset_count,
        live_market_media_acceptance_passed: summary.live_market_media_acceptance_passed,
        live_real_storage_upload: summary.live_real_storage_upload,
        live_media_asset_rows_created: summary.live_media_asset_rows_created,
        live_listing_created: summary.live_listing_created,
        live_listing_media_links_created: summary.live_listing_media_links_created,
        live_public_image_fetch_ok: summary.live_public_image_fetch_ok,
        live_public_video_fetch_ok: summary.live_public_video_fetch_ok,
        live_card_uploaded_media_visible: summary.live_card_uploaded_media_visible,
        live_detail_uploaded_media_visible: summary.live_detail_uploaded_media_visible,
        live_detail_8_media_visible: summary.live_detail_8_media_visible,
        live_media_after_refresh_visible: summary.live_media_after_refresh_visible,
        live_media_after_relogin_visible: summary.live_media_after_relogin_visible,
        live_no_blob_data_file_final_url: summary.live_no_blob_data_file_final_url,
        live_no_fake_media: summary.live_no_fake_media,
        live_no_category_fallback_used_as_media_proof: summary.live_no_category_fallback_used_as_media_proof,
        live_cleanup_scope_bounded: summary.live_cleanup_scope_bounded,
        live_cleanup_idempotent: summary.live_cleanup_idempotent,
        production_db_touched: summary.production_db_touched,
      }, null, 2));
      if (!summary.live_market_media_acceptance_passed) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(redactMessage(error));
      process.exitCode = 1;
    });
} else {
  runSmoke()
  .then((result) => {
  writeProof(result);
  console.info(JSON.stringify({
    status: result.status,
    target: result.target,
    selectedPhotoDisplayed: result.selectedPhotoDisplayed,
    selectedPhotoCount: result.selectedPhotoCount,
    selectedVideoDisplayed: result.selectedVideoDisplayed,
    previewModalDisplayed: result.previewModalDisplayed,
    slowestMarketFirstContentMs: result.slowestMarketFirstContentMs,
    slowestMarketOpenMs: result.slowestMarketOpenMs,
    slowestMyListingsFirstContentMs: result.slowestMyListingsFirstContentMs,
    slowestProductOpenMs: result.slowestProductOpenMs,
    android_market_open_ms: result.androidMarketOpenMs,
    android_product_detail_open_ms: result.androidProductDetailOpenMs,
    android_create_listing_open_ms: result.androidCreateListingOpenMs,
    android_thumbnail_render_after_pick_ms: result.androidThumbnailRenderAfterPickMs,
    android_publish_with_7_photos_1_video_ms: result.androidPublishWith7Photos1VideoMs,
    android_full_route_budget_ms: result.androidFullRouteBudgetMs,
    android_market_open_budget_passed: result.androidMarketOpenBudgetPassed,
    android_product_detail_open_budget_passed: result.androidProductDetailOpenBudgetPassed,
    android_create_listing_open_budget_passed: result.androidCreateListingOpenBudgetPassed,
    android_thumbnail_render_budget_passed: result.androidThumbnailRenderBudgetPassed,
    android_publish_budget_passed: result.androidPublishBudgetPassed,
    market_scroll_top_button_works: result.marketScrollTopButtonWorks,
    market_scroll_top_button_absolute_top: result.marketScrollTopButtonAbsoluteTop,
    market_scroll_top_button_single_click: result.marketScrollTopButtonSingleClick,
    market_scroll_position_after_click_px: result.marketScrollTopProof.positionAfterClickPx,
    market_first_listing_visible_after_scroll_top: result.marketScrollTopProof.firstListingVisibleAfterScrollTop,
    market_filter_header_visible_after_scroll_top: result.marketScrollTopProof.filterHeaderVisibleAfterScrollTop,
    myListingsPassed: result.myListingsPassed,
    myListingsMediaVisible: result.myListingsMediaVisible,
    myListingsAfterRefreshVisible: result.myListingsAfterRefreshVisible,
    myListingsAfterReloginVisible: result.myListingsAfterReloginVisible,
    scenarioResults: result.scenarioResults.map((item) => ({
      kind: item.kind,
      selectedPhotoCount: item.selectedPhotoCount,
      photoCount: item.photoCount,
      selectedVideoCount: item.selectedVideoCount,
      videoCount: item.videoCount,
      marketFirstContentMs: item.marketFirstContentMs,
      marketOpenMs: item.marketOpenMs,
      myListingsFirstContentMs: item.myListingsFirstContentMs,
      createListingOpenMs: item.createListingOpenMs,
      thumbnailRenderAfterPickMs: item.thumbnailRenderAfterPickMs,
      publishWithMediaMs: item.publishWithMediaMs,
      myListingVisible: item.myListingVisible,
      myListingMediaVisible: item.myListingMediaVisible,
      myListingAfterRefreshVisible: item.myListingAfterRefreshVisible,
      myListingAfterReloginVisible: item.myListingAfterReloginVisible,
      productOpenMs: item.productOpenMs,
      productGalleryThumbCount: item.productGalleryThumbCount,
      productVideoThumbDisplayed: item.productVideoThumbDisplayed,
      mediaLinkConfirmed: item.mediaLinkConfirmed,
    })),
    productImageDisplayed: result.productImageDisplayed,
    productGalleryThumbCount: result.productGalleryThumbCount,
    productVideoThumbDisplayed: result.productVideoThumbDisplayed,
    listingInserted: result.listingInserted,
    mediaLinkConfirmed: result.mediaLinkConfirmed,
    listingId: result.listingId,
    mediaAssetId: result.mediaAssetId,
    screenshot: result.screenshot,
    pageErrorCount: result.pageErrorCount,
    pageErrorUnclassifiedCount: result.pageErrorUnclassifiedMessages.length,
    pageErrorClassifications: result.pageErrorClassifications,
    consoleErrorCount: result.consoleErrorCount,
    consoleWarnCount: result.consoleWarnCount,
    consoleWarnUnclassifiedCount: result.consoleWarnUnclassifiedMessages.length,
    consoleWarnClassifications: result.consoleWarnClassifications,
  }, null, 2));
  if (result.status !== "GREEN") {
    process.exitCode = 1;
  }
  })
  .catch((error) => {
  const result: SmokeResult = {
    checkedAt: new Date().toISOString(),
    status: "NOT_GREEN",
    target: smokeTarget,
    baseUrl: "",
    currentUrl: null,
    openStep: null,
    webServerStartedByVerifier: false,
    photoLimit: PHOTO_LIMIT,
    videoLimit: VIDEO_LIMIT,
    selectedPhotoCount: 0,
    selectedVideoDisplayed: false,
    selectedPhotoDisplayed: false,
    previewModalDisplayed: false,
    scenarioResults: [],
    slowestMarketFirstContentMs: null,
    slowestMarketOpenMs: null,
    slowestMyListingsFirstContentMs: null,
    slowestProductOpenMs: null,
    slowestCreateListingOpenMs: null,
    slowestThumbnailRenderAfterPickMs: null,
    slowestPublishWithMediaMs: null,
    androidMarketOpenMs: null,
    androidProductDetailOpenMs: null,
    androidCreateListingOpenMs: null,
    androidThumbnailRenderAfterPickMs: null,
    androidPublishWith7Photos1VideoMs: null,
    androidMarketOpenBudgetPassed: null,
    androidProductDetailOpenBudgetPassed: null,
    androidCreateListingOpenBudgetPassed: null,
    androidThumbnailRenderBudgetPassed: null,
    androidPublishBudgetPassed: null,
    androidFullRouteBudgetMs: null,
    marketScrollTopButtonWorks: false,
    marketScrollTopButtonAbsoluteTop: false,
    marketScrollTopButtonSingleClick: false,
    marketScrollTopProof: buildFailedMarketScrollTopProof(),
    myListingsPassed: false,
    myListingsMediaVisible: false,
    myListingsAfterRefreshVisible: false,
    myListingsAfterReloginVisible: false,
    productImageDisplayed: false,
    productGalleryThumbCount: 0,
    productVideoThumbDisplayed: false,
    listingInserted: false,
    mediaLinkConfirmed: false,
    listingId: null,
    mediaAssetId: null,
    insertedMediaAssetIds: [],
    insertedMediaAssets: [],
    confirmPurposes: [],
    dialogMessages: [],
    consoleWarnMessages: [],
    consoleErrorMessages: [],
    pageErrorMessages: [],
    pageErrorClassifications: [],
    pageErrorUnclassifiedMessages: [],
    consoleWarnClassifications: [],
    consoleWarnUnclassifiedMessages: [],
    uploadSessionCount: 0,
    storageUploadCount: 0,
    completedUploadCount: 0,
    fieldValuesBeforePublish: [],
    publishButtonDisabled: null,
    publishStateText: null,
    errorSummaryText: null,
    pageErrorCount: 0,
    consoleErrorCount: 0,
    consoleWarnCount: 0,
    screenshot: null,
    unhandledFakeSupabaseRequests: [],
    error: error instanceof Error ? error.message : String(error),
  };
  writeProof(result);
  console.error(result.error);
    process.exitCode = 1;
  });
}
