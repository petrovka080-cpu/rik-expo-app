import type { ReqHeaderContext } from "./warehouse.types";

export const parseNum = (value: unknown, fallback = 0): number => {
  if (value == null) return fallback;
  const text = String(value).trim();
  if (text === "") return fallback;
  const cleaned = text.replace(/[^\d,.\-]+/g, "").replace(",", ".").replace(/\s+/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value),
  );

export const normMatCode = (raw: unknown) => {
  const text = String(raw ?? "").trim();
  return text
    .replace(/[РџРї]/g, "P")
    .replace(/[вЂ”вЂ“?]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

export const normUomId = (raw: unknown) => {
  const text = String(raw ?? "").trim();
  if (text === "Рј") return "m";
  if (text === "Рј?" || text === "Рј2") return "m2";
  if (text === "Рј?" || text === "Рј3") return "m3";
  return text;
};

export function parseReqHeaderContext(rawParts: (string | null | undefined)[]): ReqHeaderContext {
  const out: ReqHeaderContext = {
    contractor: "",
    phone: "",
    volume: "",
  };
  const put = (key: keyof ReqHeaderContext, value: string) => {
    const next = value.trim();
    if (!next || out[key]) return;
    out[key] = next;
  };

  for (const raw of rawParts) {
    const lines = String(raw || "")
      .split(/[\r\n;]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^([^:]+)\s*:\s*(.+)$/);
      if (!match) continue;
      const key = String(match[1] || "").trim().toLowerCase();
      const value = String(match[2] || "").trim();
      if (!value) continue;

      if (
        !out.contractor &&
        (key.includes("РїРѕРґСЂСЏРґ") ||
          key.includes("contractor") ||
          key.includes("РЅР°РёРјРµРЅРѕРІР°РЅРёРµ РѕСЂРіР°РЅРёР·Р°С†РёРё") ||
          key.includes("РѕСЂРіР°РЅРёР·Р°С†"))
      ) {
        put("contractor", value);
      } else if (!out.phone && (key.includes("С‚РµР»") || key.includes("phone"))) {
        put("phone", value);
      } else if (!out.volume && (key.includes("РѕР±СЉ") || key.includes("volume"))) {
        put("volume", value);
      }
    }
  }

  return out;
}
