// src/screens/accountant/helpers.ts
import React from "react";
import { Alert, Platform, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import { supabase, SUPABASE_ANON_KEY } from "../../lib/supabaseClient";
import type { AccountantInboxRow } from "../../lib/rik_api";
import type { StatusKey } from "./types";

export function toRpcDateOrNull(v: string) {
  const s = String(v || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  const [, mm, dd] = s.split("-").map(Number);
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  const dt = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  return s;
}

// ============================== MAYAK: PROD LOG (ACC) ==============================
export const DLOG = (...args: any[]) => {
  if (__DEV__) console.log(...args);
};

export const safeAlert = (title: string, msg?: string) => {
  if (Platform.OS === "web") {
    // @ts-ignore
    window.alert([title, msg].filter(Boolean).join("\n"));
  } else {
    Alert.alert(title, msg ?? "");
  }
};

// ---------- SafeView: фильтрует сырой текст внутри View (фикс RNW) ----------
export function SafeView({ children, ...rest }: any) {
  const kids = React.Children.toArray(children).map((c, i) => {
    if (typeof c === "string") return c.trim() ? <Text key={`t${i}`}>{c}</Text> : null;
    if (typeof c === "number") return <Text key={`n${i}`}>{String(c)}</Text>;
    if (c && typeof c === "object" && !React.isValidElement(c)) return null;
    return c;
  });
  return <View {...rest}>{kids}</View>;
}

export function safeFileNameLite(name: string) {
  return String(name || `file_${Date.now()}`)
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getAuthHeadersAcc(): Promise<Record<string, string> | undefined> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    const h: Record<string, string> = {};
    if (SUPABASE_ANON_KEY) h["apikey"] = SUPABASE_ANON_KEY;
    if (token) h["Authorization"] = `Bearer ${token}`;

    return Object.keys(h).length ? h : undefined;
  } catch {
    return SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : undefined;
  }
}

export function ensureExt(name: string, signedUrl: string) {
  const n = String(name || "file").trim();
  const hasExt = /\.[a-z0-9]{2,6}$/i.test(n);
  if (hasExt) return n;

  const m = String(signedUrl).match(/\.([a-z0-9]{2,6})(?:\?|$)/i);
  const ext = m?.[1] ? `.${m[1].toLowerCase()}` : ".bin";
  return n + ext;
}

export function guessMime(name: string) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "xls") return "application/vnd.ms-excel";
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return undefined;
}

export async function openSignedUrlAcc(url: string, fileName?: string) {
  const u = String(url || "").trim();
  if (!u) throw new Error("Пустой URL");

  if (Platform.OS === "web") {
    // @ts-ignore
    window.open(u, "_blank", "noopener,noreferrer");
    return;
  }

  const fixedName = ensureExt(safeFileNameLite(fileName || "file"), u);
  const target = (FileSystem.cacheDirectory || FileSystem.documentDirectory || "") + fixedName;
  const headers = await getAuthHeadersAcc();

  const res = await FileSystem.downloadAsync(u, target, headers ? { headers } : undefined);
  const fileUri = res?.uri || target;

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    const mimeType = guessMime(fixedName);
    await Sharing.shareAsync(fileUri, mimeType ? { mimeType } : undefined);
    return;
  }

  await WebBrowser.openBrowserAsync(u);
}

export function rowsShallowEqual(a: AccountantInboxRow[], b: AccountantInboxRow[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i],
      bi = b[i];
    if (String(ai.proposal_id) !== String(bi.proposal_id)) return false;
    const aps = String(ai.payment_status ?? "").trim();
    const bps = String(bi.payment_status ?? "").trim();
    if (aps !== bps) return false;
    if (!!ai.has_invoice !== !!bi.has_invoice) return false;
    if (Number(ai.payments_count ?? 0) !== Number(bi.payments_count ?? 0)) return false;
  }
  return true;
}

export const statusFromRaw = (raw?: string | null, isHistory?: boolean): { key: StatusKey; label: string } => {
  if (isHistory) return { key: "HISTORY", label: "ИСТОРИЯ" };

  const v = String(raw ?? "").trim().toLowerCase();
  if (v.startsWith("на доработке") || v.startsWith("возврат")) return { key: "REWORK", label: "НА ДОРАБОТКЕ" };
  if (v.startsWith("оплачено")) return { key: "PAID", label: "ОПЛАЧЕНО" };
  if (v.startsWith("частично")) return { key: "PART", label: "ЧАСТИЧНО" };
  return { key: "K_PAY", label: "К ОПЛАТЕ" };
};

export const statusColors = (key: StatusKey) => {
  switch (key) {
    case "PAID":
      return { bg: "rgba(34,197,94,0.14)", fg: "#86EFAC" };
    case "PART":
      return { bg: "rgba(250,204,21,0.14)", fg: "#FDE68A" };
    case "REWORK":
      return { bg: "rgba(239,68,68,0.14)", fg: "#FCA5A5" };
    case "HISTORY":
      return { bg: "rgba(99,102,241,0.14)", fg: "#C7D2FE" };
    default:
      return { bg: "rgba(59,130,246,0.14)", fg: "#BFDBFE" };
  }
};

export async function withTimeout<T>(p: Promise<T>, ms = 20000, label = "timeout") {
  let t: any;
  const killer = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`${label}: ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, killer]);
  } finally {
    try {
      clearTimeout(t);
    } catch {}
  }
}
