import type { RefOption } from "./foreman.types";

const HIDDEN_OBJECT_CODES = new Set(["OBJ-EX", "OBJ-UNKNOWN"]);
const HIDDEN_SYSTEM_CODES = new Set(["SYS-EX"]);
const HIDDEN_ZONE_CODES = new Set(["Z-EX", "ZONE-A"]);
const HIDDEN_LEVEL_CODES = new Set([
  "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10",
  "L11", "L12", "L13", "L14", "L15", "L16", "L17", "L18", "L19", "L20",
  "B1", "B2",
]);

const normalizeCode = (code: string) => String(code || "").trim().toUpperCase();

const filterHidden = (options: RefOption[], hiddenCodes: Set<string>) =>
  options.filter((o) => !hiddenCodes.has(normalizeCode(o.code)));

export const getForemanObjectOptions = (options: RefOption[]) => filterHidden(options, HIDDEN_OBJECT_CODES);
export const getForemanLevelOptions = (options: RefOption[]) => filterHidden(options, HIDDEN_LEVEL_CODES);
export const getForemanSystemOptions = (options: RefOption[]) => filterHidden(options, HIDDEN_SYSTEM_CODES);
export const getForemanZoneOptions = (options: RefOption[]) => filterHidden(options, HIDDEN_ZONE_CODES);

export const getObjectDisplayName = (code: string, allOptions: RefOption[]) => {
  const normalized = normalizeCode(code);
  if (!normalized) return "";
  if (normalized === "OBJ-UNKNOWN") return "Не указан объект";
  return allOptions.find((o) => normalizeCode(o.code) === normalized)?.name || "";
};

export const isObjectSelectable = (code: string) => !HIDDEN_OBJECT_CODES.has(normalizeCode(code));
