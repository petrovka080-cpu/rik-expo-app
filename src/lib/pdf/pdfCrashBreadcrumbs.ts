import AsyncStorage from "@react-native-async-storage/async-storage";

type PdfCrashDiagnosticScreen = "foreman" | "warehouse";
type PdfCrashTerminalState = "success" | "error";

export type PdfCrashBreadcrumb = {
  at: string;
  marker: string;
  screen: PdfCrashDiagnosticScreen;
  documentType?: string | null;
  originModule?: string | null;
  sourceKind?: string | null;
  uriKind?: string | null;
  uriTail?: string | null;
  fileName?: string | null;
  entityId?: string | null;
  sessionId?: string | null;
  openToken?: string | null;
  fileExists?: boolean | null;
  fileSizeBytes?: number | null;
  previewPath?: string | null;
  errorMessage?: string | null;
  terminalState?: PdfCrashTerminalState | null;
  extra?: Record<string, unknown>;
};

const PDF_CRASH_BREADCRUMBS_KEY = "rik_pdf_crash_breadcrumbs_v1";
const MAX_BREADCRUMBS = 80;

let writeQueue = Promise.resolve();

function trimText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeUriTail(uri: unknown) {
  const text = String(uri ?? "").trim();
  if (!text) return null;
  return text.slice(-180);
}

function normalizeNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeBool(value: unknown) {
  if (typeof value === "boolean") return value;
  return null;
}

function normalizeScreen(value: unknown): PdfCrashDiagnosticScreen | null {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "foreman" || text === "warehouse") return text;
  return null;
}

async function readRawBreadcrumbs(): Promise<PdfCrashBreadcrumb[]> {
  try {
    const raw = await AsyncStorage.getItem(PDF_CRASH_BREADCRUMBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object") as PdfCrashBreadcrumb[];
  } catch {
    return [];
  }
}

async function writeRawBreadcrumbs(items: PdfCrashBreadcrumb[]) {
  try {
    await AsyncStorage.setItem(PDF_CRASH_BREADCRUMBS_KEY, JSON.stringify(items.slice(-MAX_BREADCRUMBS)));
  } catch {
    // Diagnostics must never destabilize the PDF path.
  }
}

function enqueueBreadcrumbWrite(entry: PdfCrashBreadcrumb) {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const current = await readRawBreadcrumbs();
      current.push(entry);
      await writeRawBreadcrumbs(current);
    });
  return writeQueue;
}

export function shouldRecordPdfCrashBreadcrumbs(screen: unknown): screen is PdfCrashDiagnosticScreen {
  return normalizeScreen(screen) != null;
}

export function recordPdfCrashBreadcrumb(input: {
  marker: string;
  screen: unknown;
  documentType?: unknown;
  originModule?: unknown;
  sourceKind?: unknown;
  uriKind?: unknown;
  uri?: unknown;
  fileName?: unknown;
  entityId?: unknown;
  sessionId?: unknown;
  openToken?: unknown;
  fileExists?: unknown;
  fileSizeBytes?: unknown;
  previewPath?: unknown;
  errorMessage?: unknown;
  terminalState?: unknown;
  extra?: Record<string, unknown>;
}) {
  const screen = normalizeScreen(input.screen);
  const marker = trimText(input.marker);
  if (!screen || !marker) return;

  const entry: PdfCrashBreadcrumb = {
    at: new Date().toISOString(),
    marker,
    screen,
    documentType: trimText(input.documentType),
    originModule: trimText(input.originModule),
    sourceKind: trimText(input.sourceKind),
    uriKind: trimText(input.uriKind),
    uriTail: normalizeUriTail(input.uri),
    fileName: trimText(input.fileName),
    entityId: trimText(input.entityId),
    sessionId: trimText(input.sessionId),
    openToken: trimText(input.openToken),
    fileExists: normalizeBool(input.fileExists),
    fileSizeBytes: normalizeNumber(input.fileSizeBytes),
    previewPath: trimText(input.previewPath),
    errorMessage: trimText(input.errorMessage),
    terminalState:
      input.terminalState === "success" || input.terminalState === "error"
        ? input.terminalState
        : null,
    extra: input.extra,
  };

  void enqueueBreadcrumbWrite(entry);
}

export async function recordPdfCrashBreadcrumbAsync(input: {
  marker: string;
  screen: unknown;
  documentType?: unknown;
  originModule?: unknown;
  sourceKind?: unknown;
  uriKind?: unknown;
  uri?: unknown;
  fileName?: unknown;
  entityId?: unknown;
  sessionId?: unknown;
  openToken?: unknown;
  fileExists?: unknown;
  fileSizeBytes?: unknown;
  previewPath?: unknown;
  errorMessage?: unknown;
  terminalState?: unknown;
  extra?: Record<string, unknown>;
}) {
  const screen = normalizeScreen(input.screen);
  const marker = trimText(input.marker);
  if (!screen || !marker) return;

  const entry: PdfCrashBreadcrumb = {
    at: new Date().toISOString(),
    marker,
    screen,
    documentType: trimText(input.documentType),
    originModule: trimText(input.originModule),
    sourceKind: trimText(input.sourceKind),
    uriKind: trimText(input.uriKind),
    uriTail: normalizeUriTail(input.uri),
    fileName: trimText(input.fileName),
    entityId: trimText(input.entityId),
    sessionId: trimText(input.sessionId),
    openToken: trimText(input.openToken),
    fileExists: normalizeBool(input.fileExists),
    fileSizeBytes: normalizeNumber(input.fileSizeBytes),
    previewPath: trimText(input.previewPath),
    errorMessage: trimText(input.errorMessage),
    terminalState:
      input.terminalState === "success" || input.terminalState === "error"
        ? input.terminalState
        : null,
    extra: input.extra,
  };

  await enqueueBreadcrumbWrite(entry);
}

export async function flushPdfCrashBreadcrumbWrites() {
  await writeQueue.catch(() => undefined);
}

export async function getPdfCrashBreadcrumbs() {
  return await readRawBreadcrumbs();
}

export async function clearPdfCrashBreadcrumbs() {
  try {
    await AsyncStorage.removeItem(PDF_CRASH_BREADCRUMBS_KEY);
  } catch {
    // Ignore diagnostics cleanup failures.
  }
}

export function buildPdfCrashBreadcrumbsText(items: PdfCrashBreadcrumb[]) {
  const lines = items.map((item) => {
    const parts = [
      item.at,
      item.screen,
      item.marker,
      item.documentType ?? "unknown-document",
      item.sourceKind ?? "unknown-source",
      item.uriKind ?? "unknown-uri",
      item.previewPath ?? "unknown-preview",
    ];
    if (item.fileExists != null) parts.push(`exists=${String(item.fileExists)}`);
    if (item.fileSizeBytes != null) parts.push(`size=${item.fileSizeBytes}`);
    if (item.terminalState) parts.push(`terminal=${item.terminalState}`);
    if (item.errorMessage) parts.push(`error=${item.errorMessage}`);
    if (item.uriTail) parts.push(`uri=${item.uriTail}`);
    return parts.join(" | ");
  });
  return lines.join("\n");
}
