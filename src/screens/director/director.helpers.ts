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
