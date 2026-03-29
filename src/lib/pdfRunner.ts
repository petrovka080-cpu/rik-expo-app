// src/lib/pdfRunner.ts

import { Alert, Linking, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystemModule from "expo-file-system/legacy";

import { normalizePdfFileName } from "./documents/pdfDocument";
import { getFileSystemPaths } from "./fileSystemPaths";
import {
  createPdfSource,
  getUriScheme,
  hashString32,
  isHttpUri,
  normalizeLocalFileUri,
  type PdfSource,
  type PdfSourceKind,
} from "./pdfFileContract";
import { SUPABASE_ANON_KEY } from "./supabaseClient";
import type { Database } from "./database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

const FileSystemCompat = FileSystemModule;
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

  const normalizedLocalUri = normalizeLocalFileUri(localUri);
  const info = await FileSystemCompat.getInfoAsync(normalizedLocalUri);
  if (!info?.exists) throw new Error("Native handoff source PDF file is missing");

  if (/\.pdf$/i.test(normalizedLocalUri)) return normalizedLocalUri;

  const paths = getFileSystemPaths();
  const cacheDir = paths.cacheDir;
  const targetUri = `${cacheDir}handoff_${hashString32(normalizedLocalUri)}_${safeName(fileName, normalizedLocalUri)}`;
  if (!(await fileExists(targetUri))) {
    await FileSystemCompat.copyAsync({ from: normalizedLocalUri, to: targetUri });
  }
  return normalizeLocalFileUri(targetUri);
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
  await Linking.openURL(contentUri);
  return contentUri;
}

async function openIosPdfShareSheet(localUri: string, fileName?: string, dialogTitle = "Открыть PDF") {
  const handoffUri = await ensureNativePdfHandoffUri(localUri, fileName);
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
  } catch {
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
  } catch {
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
    if (!win) Alert.alert("PDF", "Разреши всплывающие окна (pop-up).");
    return;
  }

  if (Platform.OS === "android") {
    await openAndroidPdfContentUri(localUri, fileName);
    return;
  }

  await openIosPdfShareSheet(localUri, fileName, "Открыть PDF");
}

export async function openPdfShare(localUri: string, fileName?: string) {
  if (Platform.OS === "web") {
    const win = window.open(localUri, "_blank");
    if (!win) Alert.alert("PDF", "Разреши всплывающие окна (pop-up).");
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

  if (activeRuns.has(key)) return;
  activeRuns.add(key);

  const cleanup = () => {
    activeRuns.delete(key);
  };

  if (Platform.OS === "web") {
    let win: Window | null = null;
    try {
      win = window.open("", "_blank");
    } catch {
      win = null;
    }

    if (!win) {
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
    } catch {}

    try {
      const remote = await withTimeout(
        Promise.resolve(getRemoteUrl()),
        15000,
        "Server did not respond in 15 seconds",
      );
      const url = normalizeRemoteUrl(remote);
      if (!url) throw new Error("PDF URL is empty");
      try {
        win.location.replace(url);
      } catch {
        win.location.href = url;
      }
      win.focus();
      cleanup();
      return;
    } catch (caughtError: unknown) {
      const error = { message: getErrorMessage(caughtError, "Не удалось открыть PDF") };
      try {
        win.close();
      } catch {}
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

    await uiYield(Platform.OS === "ios" ? 120 : 40);
    if (mode === "share") await openPdfShare(localUri, fileName);
    else await openPdfPreview(localUri, fileName);
  } catch (caughtError: unknown) {
    const error = { message: getErrorMessage(caughtError, "Не удалось открыть PDF") };
    Alert.alert("PDF", String(error?.message ?? "Не удалось открыть PDF"));
  } finally {
    setTimeout(cleanup, 500);
  }
}
