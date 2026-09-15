import {
  getProfessionalUnitDefinition,
  resolveProfessionalUnitDefinition,
} from "../../estimate/professionalUnitRegistry";

const UNIT_LABELS_RU: Record<string, string> = {
  linear_m: "\u043f\u043e\u0433. \u043c",
  m: "\u043f\u043e\u0433. \u043c",
  sq_m: "\u043c\u00b2",
  "\u043a\u0432_\u043c": "\u043c\u00b2",
  "\u043a\u0432 \u043c": "\u043c\u00b2",
  "\u043a\u0432\u0430\u0434\u0440\u0430\u0442\u043d\u044b\u0439 \u043c\u0435\u0442\u0440": "\u043c\u00b2",
  "\u043a\u0432\u0430\u0434\u0440\u0430\u0442\u043d\u044b\u0435 \u043c\u0435\u0442\u0440\u044b": "\u043c\u00b2",
  m2: "\u043c\u00b2",
  sqm: "\u043c\u00b2",
  m3: "\u043c\u00b3",
  m3_h: "\u043c\u00b3/\u0447",
  m3_day: "\u043c\u00b3/\u0441\u0443\u0442",
  cubic_m: "\u043c\u00b3",
  pcs: "\u0448\u0442",
  pc: "\u0448\u0442",
  piece: "\u0448\u0442",
  pieces: "\u0448\u0442",
  piece_day: "\u0448\u0442.\u00b7\u0441\u0443\u0442",
  set: "\u043a\u043e\u043c\u043f\u043b.",
  kg: "\u043a\u0433",
  t: "\u0442",
  ton: "\u0442",
  shift: "\u0441\u043c\u0435\u043d\u0430",
  day: "\u0441\u0443\u0442",
  stage: "\u044d\u0442\u0430\u043f",
  trip: "\u0440\u0435\u0439\u0441",
  person_shift: "\u0447\u0435\u043b.-\u0441\u043c\u0435\u043d\u0430",
  person: "\u0447\u0435\u043b.",
  item: "\u0448\u0442.",
  l: "\u043b",
  liter: "\u043b",
  litre: "\u043b",
  man_hour: "\u0447\u0435\u043b.-\u0447",
  worker_h: "\u0447\u0435\u043b.-\u0447",
  machine_hour: "\u043c\u0430\u0448.-\u0447",
  machine_h: "\u043c\u0430\u0448.-\u0447",
  t_km: "\u0442\u00b7\u043a\u043c",
  vehicle_km: "\u0430\u0432\u0442.-\u043a\u043c",
  "t*km": "\u0442\u00b7\u043a\u043c",
  "t\u00b7km": "\u0442\u00b7\u043a\u043c",
  "t\u00b7\u043a\u043c": "\u0442\u00b7\u043a\u043c",
  t_m3: "\u0442/\u043c\u00b3",
  "t/m3": "\u0442/\u043c\u00b3",
  "t/m\u00b3": "\u0442/\u043c\u00b3",
  kg_m2: "\u043a\u0433/\u043c\u00b2",
  kg_m: "\u043a\u0433/\u043f\u043e\u0433. \u043c",
  kg_pcs: "\u043a\u0433/\u0448\u0442",
  l_m2: "\u043b/\u043c\u00b2",
  km_machine_hour: "\u043a\u043c/\u043c\u0430\u0448.-\u0447",
  m2_machine_hour: "\u043c\u00b2/\u043c\u0430\u0448.-\u0447",
  m2_man_hour: "\u043c\u00b2/\u0447\u0435\u043b.-\u0447",
  m2_test: "\u043c\u00b2/\u0438\u0441\u043f.",
  m3_machine_hour: "\u043c\u00b3/\u043c\u0430\u0448.-\u0447",
  m_man_hour: "\u043f\u043e\u0433. \u043c/\u0447\u0435\u043b.-\u0447",
  m_machine_hour: "\u043f\u043e\u0433. \u043c/\u043c\u0430\u0448.-\u0447",
  m3_pcs: "\u043c\u00b3/\u0448\u0442",
  pcs_man_hour: "\u0448\u0442/\u0447\u0435\u043b.-\u0447",
  pcs_machine_hour: "\u0448\u0442/\u043c\u0430\u0448.-\u0447",
  t_machine_hour: "\u0442/\u043c\u0430\u0448.-\u0447",
  trip_test: "\u0440\u0435\u0439\u0441/\u0438\u0441\u043f.",
  mm2: "\u043c\u043c\u00b2",
  one: "\u0431\u0435\u0437\u0440\u0430\u0437\u043c.",
  percent: "%",
  t_trip: "\u0442/\u0440\u0435\u0439\u0441",
  mm: "\u043c\u043c",
  km: "\u043a\u043c",
  service: "\u0443\u0441\u043b.",
  test: "\u0438\u0441\u043f\u044b\u0442\u0430\u043d\u0438\u0435",
  document: "\u043a\u043e\u043c\u043f\u043b.",
  system: "\u0441\u0438\u0441\u0442\u0435\u043c\u0430",
  canister: "\u043a\u0430\u043d.",
  roll: "\u0440\u0443\u043b.",
  bag: "\u043c\u0435\u0448.",
  pack: "\u0443\u043f\u0430\u043a.",
  cu_ft: "\u043a\u0443\u0431. \u0444\u0443\u0442",
  sq_ft: "\u043a\u0432. \u0444\u0443\u0442",
  linear_ft: "\u043f\u043e\u0433. \u0444\u0443\u0442",
  "m\u0412\u2020": "\u043c\u00b2",
  "m\u0412\u2013": "\u043c\u00b3",
  "\u0420\u00a0\u0421\u2014\u0420\u00a0\u0421\u2022\u0420\u00a0\u0421\u2013. \u0420\u00a0\u0421\u02dc": "\u043f\u043e\u0433. \u043c",
  "\u0420\u040e\u0432\u201a\u00ac\u0420\u040e\u0432\u0402\u045a": "\u0448\u0442",
};

export function formatEstimateUnitLabel(unit?: string | null): string {
  const normalized = String(unit ?? "").trim();
  if (!normalized) return "";
  // Runtime BOQ rows already carry canonical registry codes. Resolve those by
  // direct Map lookup so a cold Hermes build does not initialize Unicode NFKC
  // merely to display common labels such as `pcs`, `m2`, or `kg`. Aliases keep
  // the existing normalized resolution path and therefore the same semantics.
  return getProfessionalUnitDefinition(normalized)?.displayRu ??
    resolveProfessionalUnitDefinition(normalized)?.displayRu ??
    UNIT_LABELS_RU[normalized] ??
    UNIT_LABELS_RU[normalized.toLowerCase()] ??
    normalized;
}

export function hasRawEstimateUnitLabel(text: string): boolean {
  return /\b(linear_m|sq_m|cubic_m|pcs|shift|trip|t_m3|t_km)\b|t\/m3|t\*km/.test(text);
}
