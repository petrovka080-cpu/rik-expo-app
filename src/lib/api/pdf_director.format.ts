export const esc = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const nnum = (v: any) => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  const s0 = String(v).trim();
  if (!s0) return 0;

  const s = s0
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.\-]/g, "");

  const parts = s.split(".");
  const normalized = parts.length <= 2 ? s : `${parts[0]}.${parts.slice(1).join("")}`;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

export const money = (v: any) => {
  const n = nnum(v);
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
};

export const fmtDateOnly = (iso?: string | null) => {
  const s = String(iso ?? "").trim();
  if (!s) return "—";
  const d = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d.split("-").reverse().join(".");
  return d;
};

export const iso10 = (v: any) => String(v ?? "").trim().slice(0, 10);

export const clampIso = (s: any) => {
  const v = String(s ?? "").trim();
  return v ? v.slice(0, 10) : "";
};

export const todayIso10 = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export const addDaysIso = (iso: string, days: number) => {
  const d0 = clampIso(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d0)) return "";
  const dt = new Date(`${d0}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + Math.max(0, Math.floor(Number(days || 0))));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export const formatArrowPeriodText = (from?: string | null, to?: string | null) => {
  const fromText = from ? fmtDateOnly(iso10(from)) : "—";
  const toText = to ? fmtDateOnly(iso10(to)) : "—";
  return from || to ? `${fromText} → ${toText}` : "Весь период";
};

export const formatDashPeriodText = (from?: string | null, to?: string | null) =>
  from || to ? `${fmtDateOnly(from || "—")} – ${fmtDateOnly(to || "—")}` : "Весь период";

export const formatPaidRangeText = (paidFirstAt?: string | null, paidLastAt?: string | null) => {
  const first = String(paidFirstAt ?? "").trim();
  const last = String(paidLastAt ?? "").trim();

  if (first && last) {
    return first === last
      ? `опл. ${fmtDateOnly(first)}`
      : `опл. ${fmtDateOnly(first)} → ${fmtDateOnly(last)}`;
  }

  if (first) return `опл. ${fmtDateOnly(first)}`;
  if (last) return `опл. ${fmtDateOnly(last)}`;
  return "";
};

export const joinBulletParts = (parts: (string | null | undefined)[]) =>
  parts.filter((part) => String(part ?? "").trim()).join(" • ");
