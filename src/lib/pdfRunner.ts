// src/lib/pdfRunner.ts

import { Alert, Linking, Platform } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

import { normalizePdfFileName } from "./documents/pdfDocument";
import { getFileSystemPaths } from "./fileSystemPaths";
import { getUriScheme, hashString32, isHttpUri, normalizeLocalFileUri } from "./pdfFileContract";
import { SUPABASE_ANON_KEY } from "./supabaseClient";
const FileSystemCompat = FileSystem as any;

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
    sourceKind: "remote" | "local";
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

function safeName(name?: string, stableSeed?: string) {
  const fallbackHash = hashString32(String(name || stableSeed || "pdf"));
  return normalizePdfFileName(name, `pdf_${fallbackHash}.pdf`);
}


async function fileExists(uri: string) {
  try {
    const info = await FileSystemCompat.getInfoAsync(uri);
    return !!info?.exists;
  } catch {
    return false;
  }
}

async function getAuthHeader(supabase: any) {
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

export async function preparePdfLocalUri(args: {
  supabase: any;
  getRemoteUrl: () => Promise<string> | string;
  fileName?: string;
}): Promise<string> {
  const remote = await Promise.resolve(args.getRemoteUrl());
  const url = normalizeRemoteUrl(remote);
  if (!url) throw new Error("PDF URL is empty");
  logPdfRunnerStage("pdf_source_received", {
    uri: url,
    sourceKind: isHttpUri(url) ? "remote" : "local",
    fileName: args.fileName,
  });

  if (Platform.OS === "web") return url;
  if (!isHttpUri(url)) {
    logPdfRunnerStage("pdf_source_classified_local", {
      uri: url,
      sourceKind: "local",
      fileName: args.fileName,
    });
    const normalizedLocalUri = normalizeLocalFileUri(url);
    logPdfRunnerStage("pdf_local_uri_normalized", {
      uri: normalizedLocalUri,
      sourceKind: "local",
      fileName: args.fileName,
    });
    return normalizedLocalUri;
  }
  logPdfRunnerStage("pdf_source_classified_remote", {
    uri: url,
    sourceKind: "remote",
    fileName: args.fileName,
  });

  const cached = urlToLocal.get(url);
  if (cached && (await fileExists(cached))) {
    const normalizedCachedUri = normalizeLocalFileUri(cached);
    const info = await FileSystemCompat.getInfoAsync(normalizedCachedUri);
    logPdfRunnerStage("pdf_download_exists_yes", {
      uri: normalizedCachedUri,
      exists: Boolean(info?.exists),
      size: Number.isFinite(Number(info?.size)) ? Number(info.size) : undefined,
      sourceKind: "local",
      fileName: args.fileName,
    });
    return normalizedCachedUri;
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
    return normalizedLocalOutput;
  }

  const headers = await getAuthHeader(args.supabase);
  logPdfRunnerStage("pdf_download_started", {
    uri: localOutput,
    sourceKind: "remote",
    fileName: args.fileName,
  });
  const dl = await FileSystemCompat.downloadAsync(url, localOutput, { headers });
  const uri = normalizeLocalFileUri(dl?.uri || localOutput);
  logPdfRunnerStage("pdf_download_done", {
    uri,
    sourceKind: "local",
    fileName: args.fileName,
  });
  const info = await FileSystemCompat.getInfoAsync(uri);
  const exists = Boolean(info?.exists);
  logPdfRunnerStage(exists ? "pdf_download_exists_yes" : "pdf_download_exists_no", {
    uri,
    exists,
    size: Number.isFinite(Number(info?.size)) ? Number(info.size) : undefined,
    sourceKind: "local",
    fileName: args.fileName,
  });
  if (!exists) throw new Error("Downloaded PDF file does not exist after download");
  urlToLocal.set(url, uri);
  return uri;
}

export async function openPdfPreview(localUri: string) {
  if (Platform.OS === "web") {
    const win = window.open(localUri, "_blank");
    if (!win) Alert.alert("PDF", "Разреши всплывающие окна (pop-up).");
    return;
  }

  if (Platform.OS === "android") {
    const contentUri = await FileSystemCompat.getContentUriAsync(localUri);
    await IntentLauncher.startActivityAsync((IntentLauncher as any).ActivityAction.VIEW, {
      data: contentUri,
      flags: 1,
      type: "application/pdf",
    });
    return;
  }

  await Linking.openURL(localUri);
}

export async function openPdfShare(localUri: string) {
  if (Platform.OS === "web") {
    const win = window.open(localUri, "_blank");
    if (!win) Alert.alert("PDF", "Разреши всплывающие окна (pop-up).");
    return;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing is unavailable on this device");
  await Sharing.shareAsync(localUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Поделиться PDF",
  });
}

export async function openPdfExternal(localUri: string) {
  await openPdfPreview(localUri);
}

export async function runPdfTop(args: {
  busy?: BusyLike;
  supabase: any;
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
    } catch (error: any) {
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
    if (mode === "share") await openPdfShare(localUri);
    else await openPdfPreview(localUri);
  } catch (error: any) {
    Alert.alert("PDF", String(error?.message ?? "Не удалось открыть PDF"));
  } finally {
    setTimeout(cleanup, 500);
  }
}
