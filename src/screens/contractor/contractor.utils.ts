import { normalizeRuText } from "../../lib/text/encoding";

const ACT_META_PREFIX = "ACT_META::";
const EXCLUDED_WORK_CODE_PREFIXES = [
  "MAT-",
  "KIT-",
  "FACTOR-",
  "GENERIC-",
  "AUX-",
  "SUP-",
  "TEST-",
  "WRK-META-K-",
] as const;

export const inferUnitByWorkName = (workName: string): string | null => {
  const src = String(workName || "").toLowerCase();
  if (src.includes("достав")) return "рейс";
  if (src.includes("подъем") || src.includes("подъём")) return "этаж";
  if (src.includes("монтаж") || src.includes("врезк")) return "шт";
  if (src.includes("гкл") || src.includes("гидроизоляц")) return "м²";
  return null;
};

export const normPhone = (v: string): string => {
  const digits = String(v || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("996") && digits.length >= 12) return digits.slice(0, 12);
  if (digits.startsWith("0") && digits.length >= 10) return `996${digits.slice(-9)}`;
  if (digits.length === 9) return `996${digits}`;
  if (digits.length > 9) return `996${digits.slice(-9)}`;
  return digits;
};

export const isExcludedWorkCode = (code: string): boolean =>
  EXCLUDED_WORK_CODE_PREFIXES.some((prefix) => code.startsWith(prefix));

export const buildActMetaNote = (selectedWorks: string[]) => {
  const meta = { selectedWorks: selectedWorks.filter(Boolean) };
  return `Акт сформирован из модалки конструктора\n${ACT_META_PREFIX}${JSON.stringify(meta)}`;
};

export const parseActMeta = (
  note: string | null | undefined
): { selectedWorks: string[]; visibleNote: string } => {
  const raw = String(note || "");
  const idx = raw.indexOf(ACT_META_PREFIX);
  if (idx < 0) return { selectedWorks: [], visibleNote: raw };
  const visibleNote = raw.slice(0, idx).trim();
  const jsonPart = raw.slice(idx + ACT_META_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(jsonPart) as any;
    const selectedWorks = Array.isArray(parsed?.selectedWorks)
      ? parsed.selectedWorks.map((x: any) => String(x || "")).filter(Boolean)
      : [];
    return { selectedWorks, visibleNote };
  } catch {
    return { selectedWorks: [], visibleNote };
  }
};

export const pickFirstNonEmpty = (...vals: any[]): string | null => {
  for (const v of vals) {
    const s = typeof v === "string" ? v.trim() : String(v ?? "").trim();
    if (s) return s;
  }
  return null;
};

export const textOrDash = (v: any): string => {
  const s = String(v ?? "").trim();
  return s || "—";
};

export const toLocalDateKey = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return "";
  return dt.toLocaleDateString("en-CA", { timeZone: "Asia/Bishkek" });
};

export const pickWorkProgressRow = (row: any): string => {
  return String(row?.id || row?.progress_id || "").trim();
};

export const looksLikeUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export function isActiveWork(w: { work_status?: string | null; qty_left?: number | null }): boolean {
  const status = String(w.work_status || "").toLowerCase();
  const closed = ["завершено", "отменено", "закрыто"];
  const hasLeft = w.qty_left == null ? true : Number(w.qty_left) > 0;
  return hasLeft && !closed.includes(status);
}

export const pickErr = (e: any) =>
  String(e?.message || e?.error_description || e?.hint || e || "Ошибка");

const textNormCache = new Map<string, string>();
const MAX_TEXT_NORM_CACHE_SIZE = 5000;
export const normText = (v: any): string => {
  const raw = String(v ?? "");
  const cached = textNormCache.get(raw);
  if (cached !== undefined) return cached;
  const normalized = normalizeRuText(raw);
  if (textNormCache.size >= MAX_TEXT_NORM_CACHE_SIZE) textNormCache.clear();
  textNormCache.set(raw, normalized);
  return normalized;
};

export function debounce<F extends (...args: any[]) => any>(fn: F, delay: number) {
  let timer: any;
  return (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
