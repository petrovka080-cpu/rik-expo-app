// src/lib/pdfRunner.ts

import { Alert, Linking, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystemModule from "expo-file-system/legacy";

import { normalizePdfFileName } from "./documents/pdfDocument";
import { getFileSystemPaths } from "./fileSystemPaths";
import { beginPdfLifecycleObservation } from "./pdf/pdfLifecycle";
import { recordCatchDiscipline } from "./observability/catchDiscipline";
import {
  openAndroidRemotePdfUrl as openAndroidRemotePdfUrlBoundary,
  openAndroidViewIntent,
} from "./documents/attachmentOpener";
import { beginPlatformObservability } from "./observability/platformObservability";
import {
  createPdfSource,
  getUriScheme,
  hashString32,
  isHttpUri,
  normalizeLocalFileUri,
  type PdfSource,
  type PdfSourceKind,
} from "./pdfFileContract";
import { assertValidLocalPdfFile } from "./pdf/pdfSourceValidation";
import { SUPABASE_ANON_KEY } from "./supabaseClient";
import type { Database } from "./database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

const FileSystemCompat = FileSystemModule;
export const IOS_PDF_SHARE_MAX_BYTES = 50 * 1024 * 1024;
type PdfSupabaseLike = Pick<SupabaseClient<Database>, "auth">;
export type BusyLike = {
  run?: <T>(
    fn: () => Promise<T>,
    opts?: { key?: string; label?: string; minMs?: number },
  ) => Promise<T | null>;
  isBusy?: (key?: string) => boolean;
  show?: (key?: string, label?: string) => void;
  hide?: (key?: string) => void;
};

const urlToLocal = new Map<string, string>();
const activeRuns = new Set<string>();

export function clearPdfRunnerSessionState() {
  urlToLocal.clear();
  activeRuns.clear();
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }
  if (typeof error === "string") {
    const message = error.trim();
    if (message) return message;
  }
  return fallback;
}

const uiYield = async (ms = 0) => {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
};

const withTimeout = async <T,>(p: Promise<T>, ms: number, msg: string): Promise<T> => {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(msg)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
};

function normalizeRemoteUrl(raw: unknown) {
  return String(raw || "").trim().replace(/^"+|"+$/g, "").trim();
}

function logPdfRunnerStage(
  stage: string,
  payload: {
    uri?: string | null;
    exists?: boolean;
    size?: number;
    sourceKind: PdfSourceKind;
    fileName?: string;
  },
) {
  console.info(`[pdf-runner] ${stage}`, {
    stage,
    uri: payload.uri ?? null,
    scheme: getUriScheme(payload.uri),
    exists: payload.exists,
    sizeBytes: payload.size,
    sourceKind: payload.sourceKind,
    fileName: payload.fileName ?? null,
  });
}

const recordPdfRunnerCatch = (params: {
  kind: "critical_fail" | "soft_failure" | "cleanup_only" | "degraded_fallback";
  event: string;
  error: unknown;
  category?: "fetch" | "ui" | "reload";
  sourceKind?: string;
  errorStage?: string;
  extra?: Record<string, unknown>;
}) =>
  recordCatchDiscipline({
    screen: "reports",
    surface: "pdf_runner",
    event: params.event,
    kind: params.kind,
    error: params.error,
    category: params.category,
    sourceKind: params.sourceKind ?? "pdf:runner",
    errorStage: params.errorStage ?? params.event,
    extra: params.extra,
  });

function getFileInfoSize(
  info:
    | (Awaited<ReturnType<typeof FileSystemCompat.getInfoAsync>>)
    | null
    | undefined,
): number | undefined {
  if (!info || !("size" in info)) return undefined;
  const value = Number(info.size);
  return Number.isFinite(value) ? value : undefined;
}

function safeName(name?: string, stableSeed?: string) {
  const fallbackHash = hashString32(String(name || stableSeed || "pdf"));
  return normalizePdfFileName(name, `pdf_${fallbackHash}.pdf`);
}

async function resolvePdfSource(args: {
  source?: PdfSource;
  resolveSource?: () => Promise<PdfSource> | PdfSource;
  getRemoteUrl?: () => Promise<string> | string;
}): Promise<PdfSource> {
  if (args.source) return args.source;
  if (args.resolveSource) return await Promise.resolve(args.resolveSource());

  const remote = await Promise.resolve(args.getRemoteUrl?.());
  const url = normalizeRemoteUrl(remote);
  if (!url) throw new Error("PDF source URI is empty");
  return createPdfSource(url);
}

async function ensureNativePdfHandoffUri(uri: string, fileName?: string): Promise<string> {
  const value = String(uri || "").trim();
  if (!value) throw new Error("PDF handoff URI is empty");
  if (Platform.OS === "web") return value;

  const scheme = getUriScheme(value);
  if (scheme === "blob" || scheme === "data") {
    throw new Error("Native handoff cannot use blob/data PDF URI");
  }

  let localUri = value;
  if (isHttpUri(value)) {
    const paths = getFileSystemPaths();
    const cacheDir = paths.cacheDir;
    const targetUri = `${cacheDir}handoff_${hashString32(value)}_${safeName(fileName, value)}`;
    const downloaded = await FileSystemCompat.downloadAsync(value, targetUri);
    localUri = String(downloaded?.uri || targetUri);
  }

  let normalizedLocalUri = normalizeLocalFileUri(localUri);
  const info = await FileSystemCompat.getInfoAsync(normalizedLocalUri);
  if (!info?.exists) throw new Error("Native handoff source PDF file is missing");

  if (!/\.pdf$/i.test(normalizedLocalUri)) {
    const paths = getFileSystemPaths();
    const cacheDir = paths.cacheDir;
    const targetUri = `${cacheDir}handoff_${hashString32(normalizedLocalUri)}_${safeName(fileName, normalizedLocalUri)}`;
    if (!(await fileExists(targetUri))) {
      await FileSystemCompat.copyAsync({ from: normalizedLocalUri, to: targetUri });
    }
    normalizedLocalUri = normalizeLocalFileUri(targetUri);
  }

  await assertValidLocalPdfFile({
    fileSystem: FileSystemCompat,
    uri: normalizedLocalUri,
    failureLabel: "Native handoff PDF",
    mode: Platform.OS === "ios" ? "size-only" : "content-probe",
  });

  return normalizedLocalUri;
}

async function openAndroidPdfContentUri(localUri: string, fileName?: string): Promise<string> {
  const handoffUri = await ensureNativePdfHandoffUri(localUri, fileName);
  if (!FileSystemCompat.getContentUriAsync) {
    throw new Error("Android local PDF handoff requires getContentUriAsync support");
  }
  const contentUri = await FileSystemCompat.getContentUriAsync(handoffUri);
  logPdfRunnerStage("pdf_android_content_uri_ready", {
    uri: contentUri,
    sourceKind: "local-file",
    fileName,
  });
  await openAndroidViewIntent(contentUri, "application/pdf", {
    owner: "pdf-runner",
    fileName: fileName ?? null,
  });
  return contentUri;
}

async function openAndroidRemotePdfUrl(remoteUrl: string, fileName?: string): Promise<string> {
  const normalizedUrl = normalizeRemoteUrl(remoteUrl);
  if (!isHttpUri(normalizedUrl)) {
    throw new Error("Android remote PDF handoff requires an http(s) URL");
  }
  logPdfRunnerStage("pdf_android_remote_url_open_start", {
    uri: normalizedUrl,
    sourceKind: "remote-url",
    fileName,
  });
  try {
    await Linking.openURL(normalizedUrl);
    logPdfRunnerStage("pdf_android_remote_url_open_ready", {
      uri: normalizedUrl,
      sourceKind: "remote-url",
      fileName,
    });
    return normalizedUrl;
  } catch (error) {
    recordPdfRunnerCatch({
      kind: "critical_fail",
      event: "pdf_android_remote_url_open_failed",
      error,
      category: "ui",
      sourceKind: "remote-url",
      errorStage: "open_view",
      extra: {
        uri: normalizedUrl,
        fileName: fileName ?? null,
      },
    });
    throw error instanceof Error ? error : new Error(String(error ?? "Android remote PDF open failed"));
  }
}

async function openIosPdfShareSheet(localUri: string, fileName?: string, dialogTitle = "Открыть PDF") {
  const handoffUri = await ensureNativePdfHandoffUri(localUri, fileName);
  if (getUriScheme(handoffUri) !== "file") {
    throw new Error("iOS PDF share requires a local file:// handoff.");
  }
  const info = await FileSystemCompat.getInfoAsync(handoffUri);
  const sizeBytes = getFileInfoSize(info);
  if (!Number.isFinite(sizeBytes) || !sizeBytes || sizeBytes <= 0) {
    throw new Error("iOS PDF share file is empty.");
  }
  if (sizeBytes > IOS_PDF_SHARE_MAX_BYTES) {
    logPdfRunnerStage("pdf_ios_share_size_guard_triggered", {
      uri: handoffUri,
      exists: true,
      size: sizeBytes,
      sourceKind: "local-file",
      fileName,
    });
    recordPdfRunnerCatch({
      kind: "degraded_fallback",
      event: "pdf_ios_share_size_guard_triggered",
      error: new Error(`PDF file too large for share sheet: ${sizeBytes} bytes`),
      category: "ui",
      sourceKind: "local-file",
      errorStage: "ios_share_size_guard",
      extra: { sizeBytes, maxBytes: IOS_PDF_SHARE_MAX_BYTES, fileName: fileName ?? null },
    });
    await new Promise<void>((resolve) => {
      Alert.alert(
        "Большой файл",
        `PDF слишком большой для предпросмотра (${Math.round(sizeBytes / 1024 / 1024)} МБ). Открыть через системный просмотрщик?`,
        [
          { text: "Отмена", style: "cancel", onPress: () => resolve() },
          {
            text: "Открыть",
            onPress: async () => {
              try {
                await Linking.openURL(handoffUri);
              } catch (linkError) {
                recordPdfRunnerCatch({
                  kind: "critical_fail",
                  event: "pdf_ios_share_size_guard_linking_failed",
                  error: linkError,
                  category: "ui",
                  sourceKind: "local-file",
                  errorStage: "ios_share_size_guard_fallback",
                  extra: { uri: handoffUri, fileName: fileName ?? null },
                });
              }
              resolve();
            },
          },
        ],
      );
    });
    return;
  }
  logPdfRunnerStage("pdf_ios_share_handoff_ready", {
    uri: handoffUri,
    exists: Boolean(info?.exists),
    size: sizeBytes,
    sourceKind: "local-file",
    fileName,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is unavailable on this device");
  }
  await Sharing.shareAsync(handoffUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle,
  });
}


async function fileExists(uri: string) {
  try {
    const info = await FileSystemCompat.getInfoAsync(uri);
    return !!info?.exists;
  } catch (error) {
    recordPdfRunnerCatch({
      kind: "cleanup_only",
      event: "pdf_file_exists_probe_failed",
      error,
      category: "reload",
      sourceKind: "local-file",
      extra: {
        uri,
      },
    });
    return false;
  }
}

async function getAuthHeader(supabase: PdfSupabaseLike) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const headers: Record<string, string> = {};
    if (SUPABASE_ANON_KEY) headers.apikey = SUPABASE_ANON_KEY;
    if (token) headers.Authorization = `Bearer ${token}`;
    return Object.keys(headers).length ? headers : undefined;
  } catch (error) {
    recordPdfRunnerCatch({
      kind: "degraded_fallback",
      event: "pdf_auth_header_fallback",
      error,
      category: "fetch",
      sourceKind: "supabase:auth",
      extra: {
        hasAnonKey: Boolean(SUPABASE_ANON_KEY),
      },
    });
    return SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : undefined;
  }
}

export async function preparePdfExecutionSource(args: {
  supabase: PdfSupabaseLike;
  source?: PdfSource;
  resolveSource?: () => Promise<PdfSource> | PdfSource;
  getRemoteUrl?: () => Promise<string> | string;
  fileName?: string;
}): Promise<PdfSource> {
  const source = await resolvePdfSource(args);
  const url = source.uri;
  logPdfRunnerStage("pdf_source_received", {
    uri: url,
    sourceKind: source.kind,
    fileName: args.fileName,
  });

  if (Platform.OS === "web") return source;
  if (source.kind === "blob") {
    throw new Error("Native execution cannot use blob/data PDF source");
  }
  if (source.kind === "local-file") {
    logPdfRunnerStage("pdf_source_classified_local", {
      uri: url,
      sourceKind: "local-file",
      fileName: args.fileName,
    });
    const normalizedLocalUri = normalizeLocalFileUri(url);
    logPdfRunnerStage("pdf_local_uri_normalized", {
      uri: normalizedLocalUri,
      sourceKind: "local-file",
      fileName: args.fileName,
    });
    return createPdfSource(normalizedLocalUri);
  }
  logPdfRunnerStage("pdf_source_classified_remote", {
    uri: url,
    sourceKind: "remote-url",
    fileName: args.fileName,
  });

  if (Platform.OS === "android" || Platform.OS === "ios") {
    // Keep backend-owned remote URLs intact for the mobile viewer/open boundary.
    // Mobile preview can hand them off directly without forcing a local file session first.
    return source;
  }

  const cached = urlToLocal.get(url);
  if (cached && (await fileExists(cached))) {
    const normalizedCachedUri = normalizeLocalFileUri(cached);
    const info = await FileSystemCompat.getInfoAsync(normalizedCachedUri);
    logPdfRunnerStage("pdf_download_exists_yes", {
      uri: normalizedCachedUri,
      exists: Boolean(info?.exists),
      size: getFileInfoSize(info),
      sourceKind: "local-file",
      fileName: args.fileName,
    });
    return createPdfSource(normalizedCachedUri);
  }

  const baseName = safeName(args.fileName, url);
  const localName = baseName.replace(/\.pdf$/i, `_${hashString32(url)}.pdf`);
  const paths = getFileSystemPaths();
  const cacheDir = paths.cacheDir;

  if (!cacheDir) {
    throw new Error(`FileSystem directory unavailable (Native module not initialized?). Available keys: ${Object.keys(FileSystemCompat || {}).join(", ")}`);
  }
  const localOutput = `${cacheDir}${localName}`;

  if (await fileExists(localOutput)) {
    const normalizedLocalOutput = normalizeLocalFileUri(localOutput);
    urlToLocal.set(url, normalizedLocalOutput);
    return createPdfSource(normalizedLocalOutput);
  }

  const headers = await getAuthHeader(args.supabase);
  logPdfRunnerStage("pdf_download_started", {
    uri: localOutput,
    sourceKind: "remote-url",
    fileName: args.fileName,
  });
  const dl = await FileSystemCompat.downloadAsync(url, localOutput, { headers });
  const uri = normalizeLocalFileUri(dl?.uri || localOutput);
  logPdfRunnerStage("pdf_download_done", {
    uri,
    sourceKind: "local-file",
    fileName: args.fileName,
  });
  const info = await FileSystemCompat.getInfoAsync(uri);
  const exists = Boolean(info?.exists);
  logPdfRunnerStage(exists ? "pdf_download_exists_yes" : "pdf_download_exists_no", {
    uri,
    exists,
    size: getFileInfoSize(info),
    sourceKind: "local-file",
    fileName: args.fileName,
  });
  if (!exists) throw new Error("Downloaded PDF file does not exist after download");
  urlToLocal.set(url, uri);
  return createPdfSource(uri);
}

export async function preparePdfLocalUri(args: {
  supabase: PdfSupabaseLike;
  source?: PdfSource;
  resolveSource?: () => Promise<PdfSource> | PdfSource;
  getRemoteUrl?: () => Promise<string> | string;
  fileName?: string;
}): Promise<string> {
  return (await preparePdfExecutionSource(args)).uri;
}

export async function openPdfPreview(localUri: string, fileName?: string) {
  if (Platform.OS === "web") {
    const win = window.open(localUri, "_blank");
    if (!win) {
      Alert.alert("PDF", "Разреши всплывающие окна (pop-up).");
      throw new Error("PDF popup window was blocked");
    }
    return;
  }

  if (Platform.OS === "android") {
    if (isHttpUri(localUri)) {
      await openAndroidRemotePdfUrlBoundary(localUri, {
        owner: "pdf-runner",
        fileName: fileName ?? null,
      });
      return;
    }
    await openAndroidPdfContentUri(localUri, fileName);
    return;
  }

  throw new Error("iOS PDF preview must use the in-app viewer route");
}

export async function openPdfShare(localUri: string, fileName?: string) {
  if (Platform.OS === "web") {
    const win = window.open(localUri, "_blank");
    if (!win) {
      Alert.alert("PDF", "Разреши всплывающие окна (pop-up).");
      throw new Error("PDF popup window was blocked");
    }
    return;
  }

  if (Platform.OS === "ios") {
    await openIosPdfShareSheet(localUri, fileName, "Поделиться PDF");
    return;
  }

  const handoffUri = await ensureNativePdfHandoffUri(localUri, fileName);
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing is unavailable on this device");
  await Sharing.shareAsync(handoffUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Поделиться PDF",
  });
}

export async function openPdfExternal(localUri: string, fileName?: string) {
  if (Platform.OS === "web") {
    await openPdfPreview(localUri, fileName);
    return;
  }

  if (Platform.OS === "android") {
    if (isHttpUri(localUri)) {
      await openAndroidRemotePdfUrlBoundary(localUri, {
        owner: "pdf-runner",
        fileName: fileName ?? null,
      });
      return;
    }
    await openAndroidPdfContentUri(localUri, fileName);
    return;
  }

  await openIosPdfShareSheet(localUri, fileName, "Открыть PDF");
}

export async function runPdfTop(args: {
  busy?: BusyLike;
  supabase: PdfSupabaseLike;
  key: string;
  label: string;
  mode: "preview" | "share";
  fileName?: string;
  getRemoteUrl: () => Promise<string> | string;
}) {
  const { busy, supabase, key, label, mode, fileName, getRemoteUrl } = args;
  const observation = beginPlatformObservability({
    screen: "reports",
    surface: "pdf_runner",
    category: "ui",
    event: mode === "share" ? "share_pdf" : "preview_pdf",
    sourceKind: "pdf:runner",
  });

  if (activeRuns.has(key)) return;
  activeRuns.add(key);

  const cleanup = () => {
    activeRuns.delete(key);
  };

  if (Platform.OS === "web") {
    const sourceObservation = beginPdfLifecycleObservation({
      screen: "reports",
      surface: "pdf_runner",
      event: "pdf_runner_source_load",
      stage: "source_load",
      category: "fetch",
      sourceKind: "pdf:runner",
      context: {
        documentFamily: "pdf_runner",
        fileName: fileName ?? null,
      },
    });
    const openObservation = beginPdfLifecycleObservation({
      screen: "reports",
      surface: "pdf_runner",
      event: "pdf_runner_open_view",
      stage: "open_view",
      category: "ui",
      sourceKind: "pdf:web_popup",
      context: {
        documentFamily: "pdf_runner",
        fileName: fileName ?? null,
      },
    });
    let win: Window | null = null;
    try {
      win = window.open("", "_blank");
    } catch (error) {
      recordPdfRunnerCatch({
        kind: "soft_failure",
        event: "pdf_window_open_failed",
        error,
        category: "ui",
        extra: {
          key,
          mode,
        },
      });
      win = null;
    }

    if (!win) {
      const popupError = new Error("PDF popup window was blocked");
      recordPdfRunnerCatch({
        kind: "critical_fail",
        event: "pdf_popup_blocked",
        error: popupError,
        category: "ui",
        extra: {
          key,
          mode,
        },
      });
      observation.error(popupError, {
        sourceKind: "pdf:web_popup",
        errorStage: "window_open",
        extra: {
          key,
          mode,
          publishState: "error",
        },
      });
      openObservation.error(popupError, {
        fallbackMessage: "PDF popup window was blocked",
        errorStage: "window_open",
        extra: {
          key,
          mode,
          publishState: "error",
        },
      });
      Alert.alert("PDF", "Разреши всплывающие окна (pop-up).");
      cleanup();
      return;
    }

    try {
      win.document.open();
      win.document.write(`<!doctype html><meta charset="utf-8"/>
        <title>PDF</title>
        <body style="font-family:system-ui;padding:16px">
          <b>${label || "Формируем PDF..."}</b>
          <div style="opacity:.7;margin-top:6px">Если долго, проверь соединение.</div>
        </body>`);
      win.document.close();
    } catch (error) {
      recordPdfRunnerCatch({
        kind: "cleanup_only",
        event: "pdf_placeholder_render_failed",
        error,
        category: "ui",
        extra: {
          key,
          mode,
        },
      });
    }

    try {
      const remote = await withTimeout(
        Promise.resolve(getRemoteUrl()),
        15000,
        "Server did not respond in 15 seconds",
      );
      const url = normalizeRemoteUrl(remote);
      if (!url) throw new Error("PDF URL is empty");
      sourceObservation.success({
        sourceKind: "remote-url",
        extra: {
          key,
          mode,
          remoteUrl: url,
        },
      });
      try {
        win.location.replace(url);
      } catch (error) {
        recordPdfRunnerCatch({
          kind: "degraded_fallback",
          event: "pdf_window_replace_failed",
          error,
          category: "ui",
          extra: {
            key,
            mode,
            url,
          },
        });
        win.location.href = url;
      }
      win.focus();
      openObservation.success({
        sourceKind: "remote-url",
        extra: {
          key,
          mode,
          publishState: "ready",
        },
      });
      observation.success({
        sourceKind: "remote-url",
        extra: {
          key,
          mode,
          publishState: "ready",
        },
      });
      cleanup();
      return;
    } catch (caughtError: unknown) {
      const error = { message: getErrorMessage(caughtError, "Не удалось открыть PDF") };
      sourceObservation.error(caughtError, {
        fallbackMessage: "PDF source load failed",
        extra: {
          key,
          mode,
          publishState: "error",
        },
      });
      recordPdfRunnerCatch({
        kind: "critical_fail",
        event: "pdf_web_open_failed",
        error: caughtError,
        category: "ui",
        extra: {
          key,
          mode,
        },
      });
      observation.error(caughtError, {
        sourceKind: "pdf:web_open",
        errorStage: "open_remote_url",
        extra: {
          key,
          mode,
          publishState: "error",
        },
      });
      try {
        win.close();
      } catch (closeError) {
        recordPdfRunnerCatch({
          kind: "cleanup_only",
          event: "pdf_window_close_failed",
          error: closeError,
          category: "reload",
          extra: {
            key,
            mode,
          },
        });
      }
      Alert.alert("PDF", error?.message ?? "Не удалось открыть PDF");
      cleanup();
      return;
    }
  }

  const doPrepare = async () => {
    await uiYield(50);
    return await withTimeout(
      preparePdfLocalUri({ supabase, getRemoteUrl, fileName }),
      25000,
      "PDF готовится слишком долго. Попробуй еще раз.",
    );
  };
  const prepareObservation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_runner",
    event: "pdf_runner_output_prepare",
    stage: "output_prepare",
    category: "fetch",
    sourceKind: "pdf:runner",
    context: {
      documentFamily: "pdf_runner",
      fileName: fileName ?? null,
    },
  });
  const openObservation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_runner",
    event: "pdf_runner_open_view",
    stage: "open_view",
    category: "ui",
    sourceKind: "pdf:native_open",
    context: {
      documentFamily: "pdf_runner",
      fileName: fileName ?? null,
    },
  });

  try {
    let localUri: string | null = null;
    if (busy?.run) {
      localUri = await busy.run(doPrepare, { key, label, minMs: 650 });
    } else {
      busy?.show?.(key, label);
      try {
        localUri = await doPrepare();
      } finally {
        busy?.hide?.(key);
      }
    }

    if (!localUri) {
      cleanup();
      return;
    }
    prepareObservation.success({
      sourceKind: "local-file",
      extra: {
        key,
        mode,
        localUri,
      },
    });

    await uiYield(Platform.OS === "ios" ? 120 : 40);
    try {
      if (mode === "share") await openPdfShare(localUri, fileName);
      else await openPdfPreview(localUri, fileName);
      openObservation.success({
        sourceKind: "local-file",
        extra: {
          key,
          mode,
          publishState: "ready",
        },
      });
    } catch (openError) {
      throw openObservation.error(openError, {
        fallbackMessage: "PDF open failed",
        extra: {
          key,
          mode,
          publishState: "error",
        },
      });
    }
  } catch (caughtError: unknown) {
    const error = { message: getErrorMessage(caughtError, "Не удалось открыть PDF") };
    if (!(caughtError instanceof Error && caughtError.name === "PdfLifecycleError")) {
      prepareObservation.error(caughtError, {
        fallbackMessage: "PDF preparation failed",
        extra: {
          key,
          mode,
          publishState: "error",
        },
      });
    }
    recordPdfRunnerCatch({
      kind: "critical_fail",
      event: "pdf_prepare_or_open_failed",
      error: caughtError,
      category: "ui",
      extra: {
        key,
        mode,
      },
    });
    observation.error(caughtError, {
      sourceKind: "pdf:native_open",
      errorStage: "prepare_or_open",
      extra: {
        key,
        mode,
        publishState: "error",
      },
    });
    Alert.alert("PDF", String(error?.message ?? "Не удалось открыть PDF"));
  } finally {
    setTimeout(cleanup, 500);
  }
}
