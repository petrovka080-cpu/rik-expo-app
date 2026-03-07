import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolveForemanContext } from "../src/screens/foreman/foreman.context.resolver";
import { adaptFormContext } from "../src/screens/foreman/foreman.locator.adapter";

type DictRow = { code: string; name?: string | null; name_ru?: string | null };
type RefOption = { code: string; name: string };
type ReqRow = {
  id: string;
  object_type_code: string | null;
  level_code: string | null;
  system_code: string | null;
  zone_code: string | null;
  created_at?: string | null;
};

dotenv.config({ path: "c:/dev/rik-expo-app/.env.local" });

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim();
const serviceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!supabaseUrl || !serviceRole) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRole);
const nativeLog = console.log.bind(console);
console.log = (...args: unknown[]) => {
  if (args[0] === "[CCE_RESOLVER]") return;
  nativeLog(...args);
};

const TARGET_NAMES = [
  "Ангар",
  "Административное здание",
  "Паркинг открытый наземный",
  "Общежитие / вахтовый городок",
];

const norm = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

async function fetchDict(table: string, orderColumn: string): Promise<RefOption[]> {
  const { data, error } = await supabase.from(table).select("code,name,name_ru").order(orderColumn as any);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const mapped = rows
    .map((r: any) => {
      const row = r as DictRow;
      const code = String(row.code ?? "").trim();
      const name = String(row.name_ru ?? row.name ?? code).trim();
      if (!code || !name) return null;
      return { code, name };
    })
    .filter((x: RefOption | null): x is RefOption => !!x);
  return [{ code: "", name: "— Не требуется —" }, ...mapped];
}

function pickTargets(objOptions: RefOption[]) {
  const byNorm = new Map(objOptions.map((o) => [norm(o.name), o]));
  const result: RefOption[] = [];

  for (const name of TARGET_NAMES) {
    const exact = byNorm.get(norm(name));
    if (exact) {
      result.push(exact);
      continue;
    }

    const n = norm(name);
    const partial = objOptions.find((o) => {
      const on = norm(o.name);
      if (n.includes("общежитие")) return on.includes("общеж") || on.includes("вахт");
      if (n.includes("ангар")) return on.includes("ангар");
      if (n.includes("административное")) return on.includes("адм") || on.includes("здан");
      if (n.includes("паркинг")) return on.includes("паркинг");
      return on.includes(n);
    });
    result.push(partial ?? { code: "", name });
  }

  return result;
}

async function fetchLatestRequestForObjectType(code: string): Promise<ReqRow | null> {
  if (!code) return null;
  const { data, error } = await supabase
    .from("requests")
    .select("id,object_type_code,level_code,system_code,zone_code,created_at")
    .eq("object_type_code", code)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) && data.length ? (data[0] as ReqRow) : null;
}

function getFilteredSysOptions(sysOptions: RefOption[], objectType: string, objectClass: string): RefOption[] {
  if (!objectType) return sysOptions;
  const items = sysOptions.map((o) => (!o.code ? { ...o, name: "— Весь раздел —" } : o));
  const keyWords = ["БЛАГО", "ЗЕМЛ", "СЕТИ", "НВК", "НТС", "ГП", "ДОРОГ", "АСФАЛЬТ"];
  const bldWords = ["ОТДЕЛК", "МЕБЕЛЬ", "ЭЛЕКТР", "ОВ", "ВК", "ИТ", "СКС", "КЛАДКА"];

  return [...items].sort((a, b) => {
    if (!a.code || !b.code) return 0;
    const isExtA = keyWords.some((k) => (a.name || "").toUpperCase().includes(k));
    const isIntA = bldWords.some((k) => (a.name || "").toUpperCase().includes(k));
    if (objectClass === "external_site" || objectClass === "external_networks" || objectClass === "linear_object") {
      if (isExtA) return -1;
    } else if (objectClass === "multilevel_building") {
      if (isIntA) return -1;
    }
    return 0;
  });
}

function toSimpleOptions(options: RefOption[]) {
  return options.map((o) => ({ code: o.code, name: o.name }));
}

function logTag(tag: string, payload: unknown) {
  nativeLog(`${tag} ${JSON.stringify(payload, null, 2)}`);
}

function logDropdown(label: string, options: RefOption[], value: string, placeholder: string) {
  const picked = options.find((o) => o.code === value);
  logTag("[FOREMAN_DROPDOWN_FACT]", {
    fieldLabel: label,
    value,
    picked: picked ? { code: picked.code, name: picked.name } : null,
    placeholder,
    options: toSimpleOptions(options),
  });
}

async function main() {
  const [objOptions, lvlOptions, sysOptions, zoneOptions] = await Promise.all([
    fetchDict("ref_object_types", "name"),
    fetchDict("ref_levels", "sort"),
    fetchDict("ref_systems", "name"),
    fetchDict("ref_zones", "name"),
  ]);

  const targets = pickTargets(objOptions);

  for (const target of targets) {
    const objectType = target.code || "";
    const displayObjectName = target.name || "";

    const req = await fetchLatestRequestForObjectType(objectType);
    const level = String(req?.level_code ?? "").trim();
    const system = String(req?.system_code ?? "").trim();
    const zone = String(req?.zone_code ?? "").trim();

    const contextResult = resolveForemanContext(objectType, displayObjectName);
    const formUi = adaptFormContext(contextResult, lvlOptions, zoneOptions);
    const filteredSysOptions = getFilteredSysOptions(sysOptions, objectType, contextResult?.config?.objectClass || "");

    logTag("[FOREMAN_MAIN_4_FIELDS]", {
      objectName: displayObjectName,
      objectType,
      objectClass: contextResult?.config?.objectClass,
      field1_object: {
        label: "Объект / Блок",
        value: objectType,
        selectedName: objOptions.find((o) => o.code === objectType)?.name || "",
        options: toSimpleOptions(objOptions),
      },
      field2_locator: {
        label: formUi?.locator?.label,
        rawValue: level,
        safeValue: formUi?.locator?.isValidValue(level) ? level : "",
        selectedName: formUi?.locator?.options?.find((o) => o.code === level)?.name || "",
        options: toSimpleOptions(formUi?.locator?.options || []),
      },
      field3_system: {
        label: "Раздел / Вид работ",
        rawValue: system,
        selectedName: filteredSysOptions.find((o) => o.code === system)?.name || "",
        options: toSimpleOptions(filteredSysOptions),
      },
      field4_zone: {
        label: formUi?.zone?.label,
        rawValue: zone,
        safeValue: formUi?.zone?.isValidValue(zone) ? zone : "",
        selectedName: formUi?.zone?.options?.find((o) => o.code === zone)?.name || "",
        options: toSimpleOptions(formUi?.zone?.options || []),
      },
    });

    logTag("[FOREMAN_EDITOR_4_FIELDS]", {
      objectType,
      field1_object: {
        label: "Объект / Блок",
        value: objectType,
        options: toSimpleOptions(objOptions),
      },
      field2_locator: {
        label: formUi.locator.label,
        value: formUi.locator.isValidValue(level) ? level : "",
        options: toSimpleOptions(formUi.locator.options),
      },
      field3_system: {
        label: "Раздел / Вид работ",
        value: system,
        options: toSimpleOptions(sysOptions),
      },
      field4_zone: {
        label: formUi.zone.label,
        value: formUi.zone.isValidValue(zone) ? zone : "",
        options: toSimpleOptions(formUi.zone.options),
      },
    });

    logDropdown("Объект / Блок", objOptions, objectType, "Выбрать объект...");
    logDropdown(formUi.locator.label, formUi.locator.options, formUi.locator.isValidValue(level) ? level : "", formUi.locator.placeholder);
    logDropdown("Раздел / Вид работ", sysOptions, system, "Выбрать раздел...");
    logDropdown(formUi.zone.label, formUi.zone.options, formUi.zone.isValidValue(zone) ? zone : "", formUi.zone.placeholder);
  }
}

main().catch((e) => {
  console.error("[FOREMAN_4_FIELDS_DUMP_ERROR]", e?.message ?? e);
  process.exit(1);
});
