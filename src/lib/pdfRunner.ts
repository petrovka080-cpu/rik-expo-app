// src/lib/pdfRunner.ts  ✅ PROD stable (web + iOS + android) + совместимо с GlobalBusy

import { Platform, Alert, InteractionManager } from "react-native";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { SUPABASE_ANON_KEY } from "./supabaseClient"; // ✅ добавили


let FileSystem: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileSystem =
    Platform.OS === "web"
      ? null
      : require("expo-file-system/legacy");

} catch {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileSystem = require("expo-file-system");
}

type BusyLike = {
  run?: <T>(
    fn: () => Promise<T>,
    opts?: { key?: string; label?: string; minMs?: number }
  ) => Promise<T | null>;
  isBusy?: (key?: string) => boolean;

  show?: (key?: string, label?: string) => void;
  hide?: (key?: string) => void;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const urlToLocal = new Map<string, string>();
const uiYield = async (ms = 0) => {
  await new Promise<void>((r) => setTimeout(r, ms));
};

const withTimeout = async <T,>(p: Promise<T>, ms: number, msg: string): Promise<T> => {
  let t: any;
  const timeout = new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    try { clearTimeout(t); } catch { }
  }
};

function normalizeRemoteUrl(raw: any) {
  return String(raw || "").trim().replace(/^"+|"+$/g, "").trim();
}

function safeName(name?: string) {
  const base = String(name || `pdf_${Date.now()}`)
    .replace(/[^\wА-Яа-яЁё\-(). ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

// ✅ NEW: маленький стабильный hash, чтобы кеш не перетирался
function hash32(s: string) {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
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
    // ✅ добавляем apikey тоже (бывает нужно для приватных endpoints)
    const h: Record<string, string> = {};
    if (SUPABASE_ANON_KEY) h.apikey = SUPABASE_ANON_KEY;
    if (token) h.Authorization = `Bearer ${token}`;
    return Object.keys(h).length ? h : undefined;
  } catch {
    return SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : undefined;
  }
}

export async function preparePdfLocalUri(args: {
  supabase: any;
  getRemoteUrl: () => Promise<string> | string;
  fileName?: string;
}): Promise<string> {
  const { supabase, getRemoteUrl, fileName } = args;

  const remote = await Promise.resolve(getRemoteUrl());
  const url = normalizeRemoteUrl(remote);
  if (!url) throw new Error("PDF URL пустой");

  // WEB: отдаём URL как есть
  if (Platform.OS === "web") return url;

  // NATIVE: если это уже file:// или content://
  if (!/^https?:\/\//i.test(url)) return url;

  // кеш по URL
  const cached = urlToLocal.get(url);
  if (cached && (await fileExists(cached))) return cached;

  // ✅ NEW: добавили hash(url) в имя, чтобы разные PDF не перетирались
  const baseName = safeName(fileName);
  const stamp = hash32(url);
  const name = baseName.replace(/\.pdf$/i, `_${stamp}.pdf`);

  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const localPath = `${cacheDir}${name}`;

  if (await fileExists(localPath)) {
    urlToLocal.set(url, localPath);
    return localPath;
  }

  const headers = await getAuthHeader(supabase);
  const dl = await FileSystem.downloadAsync(url, localPath, { headers });
  const uri = dl?.uri || localPath;

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
    const contentUri = await FileSystem.getContentUriAsync(localUri);
    await IntentLauncher.startActivityAsync(
      (IntentLauncher as any).ActivityAction.VIEW,
      {
        data: contentUri,
        flags: 1,
        type: "application/pdf",
      }
    );
    return;
  }

  // iOS: самый стабильный путь в Expo — share sheet (preview)
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing недоступен на этом устройстве");
  await Sharing.shareAsync(localUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "PDF",
  });
}

export async function openPdfShare(localUri: string) {
  if (Platform.OS === "web") {
    const win = window.open(localUri, "_blank");
    if (!win) Alert.alert("PDF", "Разреши всплывающие окна (pop-up).");
    return;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing недоступен на этом устройстве");
  await Sharing.shareAsync(localUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Поделиться PDF",
  });
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

  // WEB: открыть окно СИНХРОННО, чтобы не блокировало
  if (Platform.OS === "web") {
    let win: Window | null = null;
    try {
      win = window.open("", "_blank");
    } catch {
      win = null;
    }

    if (!win) {
      Alert.alert("PDF", "Разреши всплывающие окна (pop-up).");
      return;
    }

    try {
      win.document.open();
      win.document.write(`<!doctype html><meta charset="utf-8"/>
        <title>PDF</title>
        <body style="font-family:system-ui;padding:16px">
          <b>${label || "Формируем PDF…"}</b>
          <div style="opacity:.7;margin-top:6px">Если долго — проверь соединение.</div>
        </body>`);
      win.document.close();
    } catch { }

    try {
      const remote = await Promise.resolve(getRemoteUrl());
      const url = normalizeRemoteUrl(remote);
      if (!url) throw new Error("PDF URL пустой");

      try {
        win.location.replace(url);
      } catch {
        win.location.href = url;
      }
      win.focus();
      return;
    } catch (e: any) {
      try {
        win.close();
      } catch { }
      Alert.alert("PDF", e?.message ?? "Не удалось открыть PDF");
      return;
    }
  }

  // NATIVE
  const doPrepare = async () => {
    // ✅ 1) отпускаем UI, чтобы спиннер/анимации успели отрисоваться
    await uiYield(50);

    // ✅ 2) даём таймаут на генерацию/скачивание (чтобы не висло вечно)
    const uri = await withTimeout(
      preparePdfLocalUri({ supabase, getRemoteUrl, fileName }),
      25000,
      "PDF слишком долго готовится. Попробуй ещё раз."
    );
    return uri;
  };

  let localUri: string | null = null;
  if (busy?.run) {
    localUri = await busy.run(doPrepare, { key, label, minMs: 650 });
  } else {
    try { busy?.show?.(key, label); } catch { }
    try {
      localUri = await doPrepare();
    } finally {
      try { busy?.hide?.(key); } catch { }
    }
  }

  if (!localUri) return;

  // ✅ 3) перед Share Sheet ещё раз отпустить UI ПРИ ЗАКРЫТОМ СПИННЕРЕ
  // Это критически важно на iOS 17+, чтобы избежать deadlock UI потока!
  await uiYield(Platform.OS === "ios" ? 150 : 50);

  if (mode === "share") return openPdfShare(localUri);
  return openPdfPreview(localUri);
}
