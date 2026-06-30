import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Browser, type BrowserContext, type Locator, type Page, type Route } from "playwright";

const projectRoot = process.cwd();
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
const fakeSupabaseUrl = "http://127.0.0.1:54321";
const artifactBaseName = smokeTarget === "android-chrome"
  ? "market-add-android-chrome-media-publish-smoke"
  : "market-add-web-media-publish-smoke";
const artifactJsonPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.json`);
const artifactMdPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.md`);
const screenshotPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.png`);
const serverStdoutPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.stdout.log`);
const serverStderrPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.stderr.log`);

const USER_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const PHOTO_LIMIT = 5;
const VIDEO_LIMIT = 1;
const WEBM_TIMECODE_SCALE_DEFAULT_NS = 1_000_000;
const SUPABASE_AUTH_STORAGE_KEYS = [
  "sb-nxrnjywzxxfdpqmzjorh-auth-token",
  "sb-127-auth-token",
  "sb-127.0.0.1-auth-token",
] as const;

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

type FakeSupabaseCapture = {
  currentScenarioKind: ListingKind;
  scenarios: Record<ListingKind, FakeSupabaseScenarioCapture>;
  unhandledRequests: { method: string; url: string }[];
};

type ListingKind = "material" | "service" | "rent";

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
  marketOpenMs: number | null;
  productOpenMs: number | null;
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

type SmokeResult = {
  checkedAt: string;
  status: "GREEN" | "NOT_GREEN";
  target: SmokeTarget;
  baseUrl: string;
  currentUrl: string | null;
  openStep: string | null;
  webServerStartedByVerifier: boolean;
  photoLimit: 5;
  videoLimit: 1;
  selectedPhotoCount: number;
  selectedVideoDisplayed: boolean;
  selectedPhotoDisplayed: boolean;
  previewModalDisplayed: boolean;
  scenarioResults: ScenarioSmokeResult[];
  slowestMarketOpenMs: number | null;
  slowestProductOpenMs: number | null;
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

const SMOKE_SCENARIOS: readonly SmokeScenario[] = [
  {
    kind: "material",
    photoCount: 5,
    videoCount: 1,
    listingId: "55555555-5555-4555-8555-555555555551",
    title: "Web smoke material 5 photos",
    description: "Material smoke keeps all selected photos through publish and marketplace render.",
    price: "1200",
    unit: "шт",
  },
  {
    kind: "service",
    photoCount: PHOTO_LIMIT,
    videoCount: 1,
    listingId: "55555555-5555-4555-8555-555555555552",
    title: "Web smoke service 5 photos",
    description: "Service smoke keeps selected work photos through publish and marketplace render.",
    price: "1",
    unit: "усл",
  },
  {
    kind: "rent",
    photoCount: PHOTO_LIMIT,
    videoCount: 1,
    listingId: "55555555-5555-4555-8555-555555555553",
    title: "Web smoke rent 5 photos",
    description: "Rent smoke keeps selected rental photos through publish and marketplace render.",
    price: "3200",
    unit: "сут",
  },
];

const SCENARIO_INDEX: Record<ListingKind, number> = {
  material: 1,
  service: 2,
  rent: 3,
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

function writeJson(fullPath: string, value: unknown) {
  writeText(fullPath, `${JSON.stringify(value, null, 2)}\n`);
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
        EXPO_NO_DOTENV: "1",
        EXPO_PUBLIC_SUPABASE_URL: fakeSupabaseUrl,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "market-add-web-smoke-anon-key",
        EXPO_PUBLIC_OFFICE_LOCAL_DEVELOPER_FULL_ACCESS: "1",
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
  const clickTrigger = () => smokeTarget === "android-chrome"
    ? trigger.click({ force: true })
    : trigger.click();
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

async function openAddListingScreen(page: Page, baseUrl: string): Promise<string> {
  const shell = page.locator('[data-testid="add-listing-owner-shell"]');

  await page.goto(`${baseUrl}/add`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  try {
    await shell.waitFor({ state: "visible", timeout: 45_000 });
    return "direct-add-route";
  } catch {
    await page.goto(`${baseUrl}/market`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
  }

  const addButton = page.locator('[data-testid="bottom-nav-marketplace-add"]');
  await addButton.waitFor({ state: "visible", timeout: 90_000 });
  await addButton.click();
  try {
    await shell.waitFor({ state: "visible", timeout: 15_000 });
    return "bottom-nav-click";
  } catch {
    await page.goto(`${baseUrl}/add`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await shell.waitFor({ state: "visible", timeout: 90_000 });
    return "direct-add-route";
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
  capture.currentScenarioKind = scenario.kind;
  const scenarioCapture = capture.scenarios[scenario.kind];
  const openStep = await openAddListingScreen(page, baseUrl);

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

  let selectedVideoCount = 0;
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
    selectedVideoCount = await page.locator('[data-testid^="marketplace.media.entrypoints.thumbnail.video-duration."]').count();
  }
  const selectedVideoDisplayed = selectedVideoCount === scenario.videoCount;

  const previewModalDisplayed =
    (await page.locator('[data-testid="marketplace.media.entrypoints.preview-image.0"]').count()) > 0;

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
  const publishStateText = await page.locator('[data-testid="market-add-publish-state"]').textContent({ timeout: 1_000 }).catch(() => null);
  const errorSummaryText = await page.locator('[data-testid="market-add-error-summary"]').textContent({ timeout: 1_000 }).catch(() => null);
  const marketOpenMs = await measureVisibleAfterClick({
    page,
    triggerTestId: "market-add-back-to-market",
    readyTestId: `market_feed_card_${scenario.listingId}`,
    timeoutMs: 45_000,
  });
  await page.locator(`[data-testid="market_feed_card_${scenario.listingId}"]`).waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.locator(`[data-testid="market_feed_card_image_${scenario.listingId}"]`).waitFor({
    state: "visible",
    timeout: 45_000,
  });
  const marketCardImageDisplayed = true;
  const expectedGalleryThumbCount = expectedMediaCount(scenario);
  const productLastThumbIndex = expectedGalleryThumbCount - 1;

  const productOpenMs = await measureVisibleAfterClick({
    page,
    triggerTestId: `market_feed_card_${scenario.listingId}`,
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
      marketOpenMs,
      productOpenMs,
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

async function runSmoke(): Promise<SmokeResult> {
  if (smokeTarget === "android-chrome") {
    await ensureAndroidChromeDevToolsReady();
  }
  const server = await ensureLocalWebServer();
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
      window.localStorage.setItem("rik.office.localDeveloperFullAccess", "1");
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
      service: buildScenarioCapture(),
      rent: buildScenarioCapture(),
    },
    unhandledRequests: [],
  };
  await installFakeSupabase(context, capture);

  const page = await createSmokePage(context);
  const runtime = {
    pageErrorCount: 0,
    consoleErrorCount: 0,
    consoleWarnCount: 0,
    dialogMessages: [] as string[],
    consoleWarnMessages: [] as string[],
    consoleErrorMessages: [] as string[],
    consoleWarnClassifications: [] as string[],
    consoleWarnUnclassifiedMessages: [] as string[],
  };
  page.on("pageerror", () => {
    runtime.pageErrorCount += 1;
  });
  page.on("console", (message) => {
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
  page.on("dialog", async (dialog) => {
    runtime.dialogMessages.push(`${dialog.type()}:${dialog.message()}`);
    await dialog.accept().catch(() => undefined);
  });

  let screenshot: string | null = null;
  let openStep: string | null = null;
  let scenarioResults: ScenarioSmokeResult[] = [];

  try {
    for (const scenario of SMOKE_SCENARIOS) {
      const outcome = await runScenario({
        page,
        baseUrl: server.baseUrl,
        capture,
        scenario,
      });
      openStep ??= outcome.openStep;
      scenarioResults.push(outcome.result);
    }

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

    const slowestMarketOpenMs = scenarioResults.reduce<number | null>(
      (max, item) => item.marketOpenMs == null ? max : Math.max(max ?? 0, item.marketOpenMs),
      null,
    );
    const slowestProductOpenMs = scenarioResults.reduce<number | null>(
      (max, item) => item.productOpenMs == null ? max : Math.max(max ?? 0, item.productOpenMs),
      null,
    );
    const firstScenario = scenarioResults[0] ?? null;
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
        item.productImageDisplayed &&
        item.productVideoThumbDisplayed &&
        item.productGalleryThumbCount === item.photoCount + item.videoCount &&
        item.uploadSessionCount === item.photoCount + item.videoCount &&
        item.storageUploadCount === item.photoCount + item.videoCount &&
        item.completedUploadCount === item.photoCount + item.videoCount &&
        item.marketOpenMs != null &&
        item.marketOpenMs <= 1_000 &&
        item.productOpenMs != null &&
        item.productOpenMs <= 300
      );
    const status =
      allScenariosGreen &&
      runtime.pageErrorCount === 0 &&
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
      slowestMarketOpenMs,
      slowestProductOpenMs,
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
    const slowestMarketOpenMs = scenarioResults.reduce<number | null>(
      (max, item) => item.marketOpenMs == null ? max : Math.max(max ?? 0, item.marketOpenMs),
      null,
    );
    const slowestProductOpenMs = scenarioResults.reduce<number | null>(
      (max, item) => item.productOpenMs == null ? max : Math.max(max ?? 0, item.productOpenMs),
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
      slowestMarketOpenMs,
      slowestProductOpenMs,
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
      `slowestMarketOpenMs: ${result.slowestMarketOpenMs ?? "-"}`,
      `slowestProductOpenMs: ${result.slowestProductOpenMs ?? "-"}`,
      `scenarioResults: ${result.scenarioResults.map((item) => `${item.kind}:photo=${item.selectedPhotoCount}/${item.photoCount}:video=${item.selectedVideoCount}/${item.videoCount}:market=${item.marketOpenMs ?? "-"}ms:product=${item.productOpenMs ?? "-"}ms:thumbs=${item.productGalleryThumbCount}`).join(" | ") || "-"}`,
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
      slowestMarketOpenMs: result.slowestMarketOpenMs,
      slowestProductOpenMs: result.slowestProductOpenMs,
      scenarioResults: result.scenarioResults.map((item) => ({
        kind: item.kind,
        selectedPhotoCount: item.selectedPhotoCount,
        photoCount: item.photoCount,
        selectedVideoCount: item.selectedVideoCount,
        videoCount: item.videoCount,
        marketOpenMs: item.marketOpenMs,
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
      slowestMarketOpenMs: null,
      slowestProductOpenMs: null,
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
