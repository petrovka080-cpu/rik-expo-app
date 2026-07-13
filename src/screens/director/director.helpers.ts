// src/screens/director/director.helpers.ts
import { reportDirectorBoundary } from "./director.observability";
export const toFilterId = (v: number | string | null | undefined) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return /^\d+$/.test(s) ? Number(s) : s;
};

export const shortId = (rid: number | string | null | undefined) => {
  const s = String(rid ?? "");
  if (!s || s.toLowerCase() === "nan") return "—";
  return /^\d+$/.test(s) ? s : s.slice(0, 8);
};

const cleanDisplayPart = (value: unknown): string => String(value ?? "").trim();

const yearFromDateLike = (value: unknown): number | null => {
  const text = cleanDisplayPart(value);
  if (!text) return null;
  const year = Number(text.slice(0, 4));
  return Number.isFinite(year) && year >= 2000 && year <= 2999 ? year : null;
};

export function formatRequestDisplayNo(input: {
  request_no?: unknown;
  display_no?: unknown;
  id_old?: unknown;
  request_id_old?: unknown;
  seq?: unknown;
  year?: unknown;
  submitted_at?: unknown;
  created_at?: unknown;
}): string | null {
  const direct = cleanDisplayPart(input.request_no) || cleanDisplayPart(input.display_no);
  if (direct) return direct;

  const legacyRaw =
    input.id_old ?? input.request_id_old ?? input.seq ?? null;
  const legacyNo = Number(legacyRaw);
  if (!Number.isFinite(legacyNo) || legacyNo <= 0) return null;

  const year =
    Number(input.year) ||
    yearFromDateLike(input.submitted_at) ||
    yearFromDateLike(input.created_at) ||
    new Date().getFullYear();

  return `REQ-${String(Math.trunc(legacyNo)).padStart(4, "0")}/${year}`;
}

export const fmtDateOnly = (iso?: string | null) => {
  const s = String(iso ?? "").trim();
  if (!s || s === "—") return "—";

  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";

  try {
    return d.toLocaleDateString("ru-RU");
  } catch (error) {
    reportDirectorBoundary({
      surface: "helpers",
      scope: "director.helpers.fmtDateOnly",
      event: "fmt_date_only_locale_failed",
      error,
      kind: "soft_failure",
      category: "ui",
      sourceKind: "intl:date_format",
      extra: {
        iso: s,
      },
    });
    return "—";
  }
};

export const pickIso10 = (...vals: unknown[]) => {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (!s) continue;
    return s.slice(0, 10);
  }
  return null;
};

export const makeIsoInPeriod = (fromIso?: string | null, toIso?: string | null) => {
  const from = String(fromIso ?? "").slice(0, 10);
  const to = String(toIso ?? "").slice(0, 10);

  return (iso: unknown) => {
    const d = String(iso ?? "").slice(0, 10);
    if (!d) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };
};

export const runNextTick = (fn: () => void) => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(fn);
    return;
  }
  Promise.resolve().then(fn);
};
