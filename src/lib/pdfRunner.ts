// src/lib/pdfRunner.ts
import { Platform, Alert } from "react-native";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import * as IntentLauncher from "expo-intent-launcher";

// ⚠️ Web иногда требует legacy. Native — обычный.
let FileSystem: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileSystem =
    Platform.OS === "web"
      ? require("expo-file-system/legacy")
      : require("expo-file-system");
} catch {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileSystem = require("expo-file-system");
}

type BusyLike = {
  show?: (key?: string, label?: string) => void;
  hide?: (key?: string) => void;
  run: <T>(
    fn: () => Promise<T>,
    opts?: { key?: string; label?: string; minMs?: number }
  ) => Promise<T>;
};

type RunPdfArgs = {
  busy: BusyLike;
  supabase: any;
  key: string;
  label: string;
  mode: "preview" | "share";
  fileName?: string;
  getRemoteUrl: () => Promise<string> | string;

  // ✅ продакшн-UX
  minOverlayMs?: number; // default 650
  preOpenMs?: number;    // default 650 (дать overlay проявиться ДО viewer)
  postOpenMs?: number;   // default 650 (iOS: shareAsync может резолвиться сразу)
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ✅ дедуп/lock, чтобы не спамили PDF одним и тем же действием
const locks = new Set<string>();

// ✅ кеш для сессии приложения: remoteUrl -> localUri
const urlToLocal = new Map<string, string>();

function normalizeRemoteUrl(raw: any) {
  const url = String(raw || "").trim();
  return url.replace(/^"+|"+$/g, "").trim();
}

function safeName(name?: string) {
  const base = String(name || `pdf_${Date.now()}`)
    .replace(/[^\w\-(). ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

async function fileExists(uri: string) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return !!info?.exists;
  } catch {
    return false;
  }
}

async function getAuthHeader(supabase: any) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  } catch {
    return undefined;
  }
}

async function downloadToCache(supabase: any, remoteUrl: string, fileName?: string) {
  // 1) быстрый кеш в памяти
  const cached = urlToLocal.get(remoteUrl);
  if (cached && (await fileExists(cached))) return cached;

  const name = safeName(fileName);

  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const localPath = `${cacheDir}${name}`;

  // 2) если файл уже существует
  if (await fileExists(localPath)) {
    urlToLocal.set(remoteUrl, localPath);
    return localPath;
  }

  // 3) скачиваем с Bearer токеном (если нужен)
  const headers = await getAuthHeader(supabase);

  const dl = await FileSystem.downloadAsync(remoteUrl, localPath, { headers });
  const uri = dl?.uri || localPath;

  urlToLocal.set(remoteUrl, uri);
  return uri;
}

async function openAndroid(localUri: string) {
  const contentUri = await FileSystem.getContentUriAsync(localUri);
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.VIEW, {
    data: contentUri,
    flags: 1,
    type: "application/pdf",
  });
}

async function openIOS(localUri: string, mode: "preview" | "share") {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing недоступен на этом устройстве");
  }

  await Sharing.shareAsync(localUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: mode === "share" ? "Поделиться PDF" : "PDF",
  });
}
async function openNativePdf(localUri: string, mode: "preview" | "share") {
  if (Platform.OS === "android") {
    await openAndroid(localUri);
    return;
  }
  await openIOS(localUri, mode);
}

export async function runPdf(args: RunPdfArgs) {
  const {
    busy,
    supabase,
    key,
    label,
    mode,
    fileName,
    getRemoteUrl,
    minOverlayMs = 1200,
  } = args;

  if (locks.has(key)) return;
  locks.add(key);

  try {
    // WEB: как раньше
    if (Platform.OS === "web") {
      const remote = await Promise.resolve(getRemoteUrl());
      const url = normalizeRemoteUrl(remote);
      if (!url) throw new Error("PDF URL пустой");

      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) Alert.alert("PDF", "Разреши всплывающие окна.");
      return;
    }

    // NATIVE: overlay только на скачивание
    let localUri = "";

    await busy.run(
      async () => {
        const remote = await Promise.resolve(getRemoteUrl());
        const url = normalizeRemoteUrl(remote);
        if (!url) throw new Error("PDF URL пустой");

        localUri = url;

        if (/^https?:\/\//i.test(url)) {
          localUri = await downloadToCache(supabase, url, fileName);
        }
      },
      { key, label, minMs: Math.max(650, Number(minOverlayMs ?? 0)) }
    );

    // ✅ ВАЖНО: перед системным viewer — точно убрать overlay
    try { busy.hide?.(key); } catch {}

    // ✅ Открываем viewer БЕЗ overlay
    try {
      await openNativePdf(localUri, mode);
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? "");
      const low = msg.toLowerCase();
      if (low.includes("canceled") || low.includes("cancel")) return;

      if (low.includes("activitynotfound") || low.includes("no activity")) {
        Alert.alert("PDF", "На устройстве нет приложения для открытия PDF.");
        return;
      }
      throw e;
    }
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    Alert.alert("PDF", msg || "Не удалось открыть PDF");
    throw e;
  } finally {
    locks.delete(key);
  }
}
