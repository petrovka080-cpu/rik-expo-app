// src/screens/director/director.helpers.ts
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
  } catch {
    return "—";
  }
};
