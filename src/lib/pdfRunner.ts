// src/lib/pdfRunner.ts  вњ… PROD stable (web + iOS + android) + СЃРѕРІРјРµСЃС‚РёРјРѕ СЃ GlobalBusy

import { Platform, Alert, InteractionManager } from "react-native";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { SUPABASE_ANON_KEY } from "./supabaseClient"; // вњ… РґРѕР±Р°РІРёР»Рё


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
    .replace(/[^\w\-(). ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

// вњ… NEW: РјР°Р»РµРЅСЊРєРёР№ СЃС‚Р°Р±РёР»СЊРЅС‹Р№ hash, С‡С‚РѕР±С‹ РєРµС€ РЅРµ РїРµСЂРµС‚РёСЂР°Р»СЃСЏ
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
    // вњ… РґРѕР±Р°РІР»СЏРµРј apikey С‚РѕР¶Рµ (Р±С‹РІР°РµС‚ РЅСѓР¶РЅРѕ РґР»СЏ РїСЂРёРІР°С‚РЅС‹С… endpoints)
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
  if (!url) throw new Error("PDF URL РїСѓСЃС‚РѕР№");

  // WEB: РѕС‚РґР°С‘Рј URL РєР°Рє РµСЃС‚СЊ
  if (Platform.OS === "web") return url;

  // NATIVE: РµСЃР»Рё СЌС‚Рѕ СѓР¶Рµ file:// РёР»Рё content://
  if (!/^https?:\/\//i.test(url)) return url;

  // РєРµС€ РїРѕ URL
  const cached = urlToLocal.get(url);
  if (cached && (await fileExists(cached))) return cached;

  const baseName = safeName(fileName);
  const stamp = hash32(url);
  const name = baseName.replace(/\.pdf$/i, `_${stamp}.pdf`);

  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const localOutput = `${cacheDir}${name}`;

  // NATIVE: РµСЃР»Рё СЌС‚Рѕ СѓР¶Рµ file:// РёР»Рё content:// (РЅР°РїСЂРёРјРµСЂ, РѕС‚ expo-print)
  if (!/^https?:\/\//i.test(url)) {
    // Р•СЃР»Рё РёРјСЏ СѓР¶Рµ "РєСЂР°СЃРёРІРѕРµ" РёР»Рё СЃРѕРІРїР°РґР°РµС‚ вЂ” РѕС‚РґР°С‘Рј РєР°Рє РµСЃС‚СЊ
    if (url === localOutput) return url;

    // РРЅР°С‡Рµ РєРѕРїРёСЂСѓРµРј РІ С„Р°Р№Р» СЃ РїСЂР°РІРёР»СЊРЅС‹Рј РёРјРµРЅРµРј РґР»СЏ РєСЂР°СЃРёРІРѕРіРѕ Share Sheet
    try {
      if (!(await fileExists(localOutput))) {
        await FileSystem.copyAsync({ from: url, to: localOutput });
      }
      return localOutput;
    } catch (e) {
      console.warn("[pdfRunner] failed to copy local file:", e);
      return url;
    }
  }

  if (await fileExists(localOutput)) {
    urlToLocal.set(url, localOutput);
    return localOutput;
  }

  const headers = await getAuthHeader(supabase);
  const dl = await FileSystem.downloadAsync(url, localOutput, { headers });
  const uri = dl?.uri || localOutput;

  urlToLocal.set(url, uri);
  return uri;
}

export async function openPdfPreview(localUri: string) {
  if (Platform.OS === "web") {
    const win = window.open(localUri, "_blank");
    if (!win) Alert.alert("PDF", "Р Р°Р·СЂРµС€Рё РІСЃРїР»С‹РІР°СЋС‰РёРµ РѕРєРЅР° (pop-up).");
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

  // iOS: СЃР°РјС‹Р№ СЃС‚Р°Р±РёР»СЊРЅС‹Р№ РїСѓС‚СЊ РІ Expo вЂ” share sheet (preview)
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing РЅРµРґРѕСЃС‚СѓРїРµРЅ РЅР° СЌС‚РѕРј СѓСЃС‚СЂРѕР№СЃС‚РІРµ");
  await Sharing.shareAsync(localUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "PDF",
  });
}

export async function openPdfShare(localUri: string) {
  if (Platform.OS === "web") {
    const win = window.open(localUri, "_blank");
    if (!win) Alert.alert("PDF", "Р Р°Р·СЂРµС€Рё РІСЃРїР»С‹РІР°СЋС‰РёРµ РѕРєРЅР° (pop-up).");
    return;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing РЅРµРґРѕСЃС‚СѓРїРµРЅ РЅР° СЌС‚РѕРј СѓСЃС‚СЂРѕР№СЃС‚РІРµ");
  await Sharing.shareAsync(localUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "РџРѕРґРµР»РёС‚СЊСЃСЏ PDF",
  });
}

const activeRuns = new Set<string>();

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

  const cleanup = () => { activeRuns.delete(key); };

  // WEB: РѕС‚РєСЂС‹С‚СЊ РѕРєРЅРѕ РЎРРќРҐР РћРќРќРћ, С‡С‚РѕР±С‹ РЅРµ Р±Р»РѕРєРёСЂРѕРІР°Р»Рѕ
  if (Platform.OS === "web") {
    let win: Window | null = null;
    try {
      win = window.open("", "_blank");
    } catch {
      win = null;
    }

    if (!win) {
      Alert.alert("PDF", "Р Р°Р·СЂРµС€Рё РІСЃРїР»С‹РІР°СЋС‰РёРµ РѕРєРЅР° (pop-up).");
      return;
    }

    try {
      win.document.open();
      win.document.write(`<!doctype html><meta charset="utf-8"/>
        <title>PDF</title>
        <body style="font-family:system-ui;padding:16px">
          <b>${label || "Р¤РѕСЂРјРёСЂСѓРµРј PDFвЂ¦"}</b>
          <div style="opacity:.7;margin-top:6px">Р•СЃР»Рё РґРѕР»РіРѕ вЂ” РїСЂРѕРІРµСЂСЊ СЃРѕРµРґРёРЅРµРЅРёРµ.</div>
        </body>`);
      win.document.close();
    } catch { }

    try {
      const remote = await withTimeout(
        Promise.resolve(getRemoteUrl()),
        15000,
        "Server did not respond in 15 seconds"
      );
      const url = normalizeRemoteUrl(remote);
      if (!url) throw new Error("PDF URL РїСѓСЃС‚РѕР№");

      try {
        win.location.replace(url);
      } catch {
        win.location.href = url;
      }
      win.focus();
      cleanup();
      return;
    } catch (e: any) {
      try {
        win.close();
      } catch { }
      Alert.alert("PDF", e?.message ?? "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ PDF");
      cleanup();
      return;
    }
  }

  // NATIVE
  const doPrepare = async () => {
    // вњ… 1) РѕС‚РїСѓСЃРєР°РµРј UI, С‡С‚РѕР±С‹ СЃРїРёРЅРЅРµСЂ/Р°РЅРёРјР°С†РёРё СѓСЃРїРµР»Рё РѕС‚СЂРёСЃРѕРІР°С‚СЊСЃСЏ
    await uiYield(50);

    // вњ… 2) РґР°С‘Рј С‚Р°Р№РјР°СѓС‚ РЅР° РіРµРЅРµСЂР°С†РёСЋ/СЃРєР°С‡РёРІР°РЅРёРµ (С‡С‚РѕР±С‹ РЅРµ РІРёСЃР»Рѕ РІРµС‡РЅРѕ)
    const uri = await withTimeout(
      preparePdfLocalUri({ supabase, getRemoteUrl, fileName }),
      25000,
      "PDF СЃР»РёС€РєРѕРј РґРѕР»РіРѕ РіРѕС‚РѕРІРёС‚СЃСЏ. РџРѕРїСЂРѕР±СѓР№ РµС‰С‘ СЂР°Р·."
    );
    return uri;
  };
  try {
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

    if (!localUri) {
      cleanup();
      return;
    }

    await uiYield(Platform.OS === "ios" ? 180 : 50);

    if (mode === "share") await openPdfShare(localUri);
    else await openPdfPreview(localUri);
  } catch (e: any) {
    Alert.alert("PDF", String(e?.message ?? "Не удалось открыть PDF"));
  } finally {
    setTimeout(cleanup, 500);
  }
}

