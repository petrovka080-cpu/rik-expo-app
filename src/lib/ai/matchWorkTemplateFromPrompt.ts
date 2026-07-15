import {
  EXPANDED_COMPLEX_TEMPLATES,
  getExpandedComplexWorkFamily,
  resolveExpandedComplexWorkFamily,
} from "./expandedComplexWorks";
import {
  repairGlobalWorkMojibakeRu,
  searchGlobalWorkSmartSuggestions,
} from "./globalEstimate";
import {
  buildProfessionalWorkPassport,
} from "../estimate/buildProfessionalWorkPassport";
import type { ProfessionalWorkPassport } from "../estimate/workPassportContract";
import { normalizeInlineWorkPromptText } from "./extractWorkParamsFromInlinePrompt";
import baseManifestJson from "../../../data/estimate-templates/estimate-10000-readiness-manifest.json";

export type InlineWorkTemplateMatchSource = "user_selected" | "auto_matched" | "ambiguous";

export type InlineWorkTemplateCandidate = {
  templateId: string;
  templateName: string;
  family: string;
  workKey: string | null;
  confidence: number;
  reason: string;
};

export type InlineWorkTemplateMatch = {
  templateId: string;
  templateName: string;
  family: string;
  confidence: number;
  matchSource: InlineWorkTemplateMatchSource;
  matchedTextSpan: [number, number];
};

export type MatchWorkTemplateFromPromptInput = {
  rawInput: string;
  selectedTemplateId?: string | null;
  selectedWorkKey?: string | null;
  selectedTemplateName?: string | null;
};

export type MatchWorkTemplateFromPromptResult = {
  matchedTemplate: InlineWorkTemplateMatch | null;
  candidateTemplates: InlineWorkTemplateCandidate[];
  mustAskUserToSelectTemplate: boolean;
  blockingReason?: string;
};

const PRELIMINARY_LEVEL = "PRELIMINARY_BOQ";
type ExpandedTemplateLevel = typeof EXPANDED_COMPLEX_TEMPLATES[number]["template_level"];
const CAPITAL_RENOVATION_WORK_KEY = "apartment_capital_renovation";
const CAPITAL_RENOVATION_TEMPLATE_ID = "capital_renovation_professional_calculator_v1";
const CAPITAL_RENOVATION_TEMPLATE_GROUP_ID = "apartment_capital_renovation_project_template_group_v1";
const CAPITAL_RENOVATION_SELECTED_IDS = new Set([
  CAPITAL_RENOVATION_WORK_KEY,
  CAPITAL_RENOVATION_TEMPLATE_ID,
  CAPITAL_RENOVATION_TEMPLATE_GROUP_ID,
]);
const CAPITAL_RENOVATION_PROMPT_PATTERN =
  /(?:кап(?:итальн[\p{L}\p{N}_-]*)?\s*ремонт[\p{L}\p{N}_-]*\s+квартир[\p{L}\p{N}_-]*|капремонт[\p{L}\p{N}_-]*\s+квартир[\p{L}\p{N}_-]*|ремонт[\p{L}\p{N}_-]*\s+квартир[\p{L}\p{N}_-]*|apartment\s+capital\s+renovation)/iu;

const SPECIAL_WORK_KEY_TO_EXPANDED_FAMILY: Record<string, string> = {
  asphalt_paving: "asphalt_concrete_pavement",
  facade_full_vent_system: "ventilated_facade",
  facade_turnkey: "ventilated_facade",
  flat_roof_membrane: "membrane_roof",
  foundation_concrete: "raft_foundation",
  heating_pipe_installation: "preinsulated_pipe_installation",
  metal_roofing: "metal_tile_roof",
  slab_foundation: "foundation_slab",
  ventilated_facade: "ventilated_facade",
  vent_facade: "ventilated_facade",
  gabion_wall: "gabion_wall",
  retaining_wall: "retaining_wall",
};

const SPECIAL_WORK_KEY_TO_TEMPLATE_ID: Record<string, string> = {
  paving_stone_laying: "paving_roads_landscape_interior_paver_install_standard_professional_expanded_v1",
};

const EXPLICIT_FAMILY_PATTERNS: {
  familyId: string;
  pattern: RegExp;
  reason: string;
}[] = [
  {
    familyId: "village_sewer_network",
    pattern: /(?=.*(?:external\s+sewer|village\s+sewer|sewer\s+network|\u043d\u0430\u0440\u0443\u0436\u043d\w*\s+\u043a\u0430\u043d\u0430\u043b\u0438\u0437\u0430\u0446|\u043a\u0430\u043d\u0430\u043b\u0438\u0437\u0430\u0446\w*\s+\u0441\u0435\u043b))(?=.*(?:pipe|\u0442\u0440\u0443\u0431|d\s*\d|dn\s*\d|\d+\s*(?:km|км)))/iu,
    reason: "contextual_explicit_village_sewer_network_alias",
  },
  {
    familyId: "village_water_supply",
    pattern: /(?=.*(?:водоснаб|водопровод|water\s+supply))(?=.*(?:\d+\s*км|труб|пнд|pe100|d110|d160|колодц|наружн\w*\s+сет))/iu,
    reason: "explicit_water_supply_network_alias",
  },
  {
    familyId: "high_rise_glazing",
    pattern: /(?:остеклени[ея]\s+высот|высотн[а-яё]*\s+остекл|остекл[а-яё]*\s+высот|фасадн(?:ое|ого)\s+остек|витражн(?:ое|ого)\s+остек|glazing)/iu,
    reason: "explicit_high_rise_glazing_alias",
  },
  {
    familyId: "overhead_power_line_10kv",
    pattern: /(?=.*(?:лэп|линия\s+электропередач|10\s*кв|10\s*kv))(?=.*(?:опор|провод|сип|sip))/iu,
    reason: "explicit_overhead_power_line_10kv_alias",
  },
  {
    familyId: "tunnel_construction",
    pattern: /(?=.*(?:тоннел|туннел|tunnel))(?=.*(?:строительств|обделк|проходк|выемк|выработк|портал|щит|вентиляц|дренаж|tbm|буровзрыв|lining|excavat|construct|ventilation|drainage))/iu,
    reason: "explicit_tunnel_construction_alias",
  },
  {
    familyId: "equipment_foundation",
    pattern: /(?=.*(?:фундамент|foundation))(?=.*(?:оборудован|анкера|анкер|equipment))/iu,
    reason: "explicit_equipment_foundation_alias",
  },
  {
    familyId: "earth_dam",
    pattern: /(?:\u0434\u0430\u043c\u0431|\u043f\u043b\u043e\u0442\u0438\u043d|\u0431\u0435\u0440\u0435\u0433\u043e\u0443\u043a\u0440\u0435\u043f|\u0432\u043e\u0434\u043e\u0441\u0431\u0440\u043e\u0441|\u0433\u0435\u043e\u043c\u0435\u043c\u0431\u0440\u0430\u043d|earth\s+dam|embankment\s+dam|riverbank\s+protection|shore\s+protection|spillway)/iu,
    reason: "explicit_hydraulic_earth_dam_alias",
  },
  {
    familyId: "gabion_wall",
    pattern: /\b(?:габион|gabion)\b/iu,
    reason: "explicit_gabion_alias",
  },
  {
    familyId: "ventilated_facade",
    pattern: /\b(?:вентфасад|вентилируемый\s+фасад|ventfasad|ventilated\s+facade|vent\s+facade)\b/iu,
    reason: "explicit_ventilated_facade_alias",
  },
  {
    familyId: "mansard_roof_with_windows",
    pattern: /(?=.*\bmansard\s+roof\b)(?=.*\bwindows?\b)/iu,
    reason: "contextual_explicit_mansard_roof_windows_alias",
  },
  {
    familyId: "retaining_wall",
    pattern: /\b(?:подпорн\w*\s+стен\w*|retaining\s+wall)\b/iu,
    reason: "explicit_retaining_wall_alias",
  },
  {
    familyId: "culverts",
    pattern: /(?:\u0432\u043e\u0434\u043e\u043f\u0440\u043e\u043f\u0443\u0441\u043a\w*\s+\u0442\u0440\u0443\u0431|\u0442\u0440\u0443\u0431\w*\s+\u043f\u043e\u0434\s+\u0434\u043e\u0440\u043e\u0433|culvert)/iu,
    reason: "explicit_culvert_alias",
  },
  {
    familyId: "underground_cable_line",
    pattern: /(?:\u043a\u0430\u0431\u0435\u043b\w*\s+\u043b\u0438\u043d\u0438|\u043a\u0430\u0431\u0435\u043b\w*.{0,24}\u0442\u0440\u0430\u043d\u0448\u0435|cable\s+line|underground\s+cable)/iu,
    reason: "explicit_underground_cable_line_alias",
  },
  {
    familyId: "transformer_substation",
    pattern: /(?:\u0442\u0440\u0430\u043d\u0441\u0444\u043e\u0440\u043c\u0430\u0442\u043e\u0440\w*\s+\u043f\u043e\u0434\u0441\u0442\u0430\u043d\u0446|\u043f\u043e\u0434\u0441\u0442\u0430\u043d\u0446|\u043a\u0442\u043f|transformer\s+substation)/iu,
    reason: "explicit_transformer_substation_alias",
  },
];

const selectedTemplateCache = new Map<string, ProfessionalWorkPassport | null>();
const workKeyToTemplateIdCache = new Map<string, string | null>();
const MATCHER_RUNTIME_CACHE_LIMIT = 256;
const baseManifestTemplates = (baseManifestJson as {
  templates: { template_id: string; work_key: string; work_family_id: string; category: string; localized_name_ru: string; aliases?: string[] }[];
}).templates;
const baseLocalizedNameCounts = baseManifestTemplates.reduce((counts, template) => {
  counts.set(template.localized_name_ru, (counts.get(template.localized_name_ru) ?? 0) + 1);
  return counts;
}, new Map<string, number>());
const BASE_CATEGORY_TITLE_LABELS: Record<string, string> = {
  earthworks: "земляные работы",
  insulation: "теплоизоляция",
  paving_roads_landscape: "дорожные покрытия и благоустройство",
  special_repair: "специальный ремонт",
  ventilation: "вентиляция",
  waterproofing: "гидроизоляция",
};

function localizedBaseTemplateTitle(row: { localized_name_ru: string; category?: string }): string {
  if ((baseLocalizedNameCounts.get(row.localized_name_ru) ?? 0) <= 1) return row.localized_name_ru;
  const category = row.category ?? "";
  const label = BASE_CATEGORY_TITLE_LABELS[category] ?? category.replace(/_/g, " ");
  return `${row.localized_name_ru} (раздел: ${label})`;
}

const baseTemplateByWorkKey = new Map(baseManifestTemplates.map((row) => [row.work_key, row.template_id]));
const baseTemplateByFamilyId = new Map(baseManifestTemplates.map((row) => [row.work_family_id, row.template_id]));
const baseTemplateAliasEntries = baseManifestTemplates.flatMap((row) =>
  (row.aliases ?? [])
    .filter((alias) => !/^[a-z][a-z0-9_]{2,}$/i.test(alias))
    .map((alias) => ({
      templateId: row.template_id,
      workKey: row.work_key,
      normalizedAlias: normalizeInlineWorkPromptText(repairGlobalWorkMojibakeRu(alias)),
    }))
).filter((entry) => entry.normalizedAlias.length >= 3);
type BaseTemplateAliasEntry = typeof baseTemplateAliasEntries[number];
type CatalogTitleAliasEntry = {
  templateId: string | null;
  familyId: string | null;
  workKey: string;
  normalizedAlias: string;
};

function indexAliasEntries<T extends { normalizedAlias: string }>(entries: readonly T[]): Map<string, T[]> {
  const index = new Map<string, T[]>();
  for (const entry of entries) {
    const tokens = new Set(entry.normalizedAlias.split(/\s+/g).filter((token) => token.length >= 3));
    for (const token of tokens) {
      const bucket = index.get(token) ?? [];
      bucket.push(entry);
      index.set(token, bucket);
    }
  }
  return index;
}

const baseTemplateAliasEntriesByToken = indexAliasEntries<BaseTemplateAliasEntry>(baseTemplateAliasEntries);
const expandedFamilyIds = [...new Set(EXPANDED_COMPLEX_TEMPLATES.map((template) => template.work_family_id))];
const catalogTitleAliasEntries: CatalogTitleAliasEntry[] = [
  ...baseManifestTemplates.flatMap((row) => [
    {
      templateId: row.template_id,
      familyId: row.work_family_id,
      workKey: row.work_key,
      normalizedAlias: normalizeInlineWorkPromptText(repairGlobalWorkMojibakeRu(localizedBaseTemplateTitle(row))),
    },
    {
      templateId: row.template_id,
      familyId: row.work_family_id,
      workKey: row.work_key,
      normalizedAlias: normalizeInlineWorkPromptText(row.work_key.replace(/_/g, " ")),
    },
  ]),
  ...expandedFamilyIds.flatMap((familyId) => {
    const family = getExpandedComplexWorkFamily(familyId);
    return [
      family?.professionalNameRu ?? "",
      familyId.replace(/_/g, " "),
    ].map((alias) => ({
      templateId: null,
      familyId,
      workKey: familyId,
      normalizedAlias: normalizeInlineWorkPromptText(repairGlobalWorkMojibakeRu(alias)),
    }));
  }),
].filter((entry) => entry.normalizedAlias.length >= 5);
const catalogTitleAliasEntriesByToken = indexAliasEntries<CatalogTitleAliasEntry>(catalogTitleAliasEntries);

function setBoundedCache<K, V>(cache: Map<K, V>, key: K, value: V): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > MATCHER_RUNTIME_CACHE_LIMIT) {
    const firstKey = cache.keys().next().value as K | undefined;
    if (firstKey === undefined) break;
    cache.delete(firstKey);
  }
}

export function clearInlineWorkTemplateMatchRuntimeCaches(): void {
  selectedTemplateCache.clear();
  workKeyToTemplateIdCache.clear();
}

export function getInlineWorkTemplateMatchRuntimeCacheStats() {
  return {
    selectedTemplateCacheSize: selectedTemplateCache.size,
    workKeyToTemplateIdCacheSize: workKeyToTemplateIdCache.size,
    runtimeCacheLimit: MATCHER_RUNTIME_CACHE_LIMIT,
  };
}

function expandedTemplateLevelFromPrompt(rawInput: string): ExpandedTemplateLevel {
  const text = normalizeInlineWorkPromptText(repairGlobalWorkMojibakeRu(rawInput));
  if (/(исполнительн|as\s*built|as-built|по\s+факту)/iu.test(text)) return "AS_BUILT_ESTIMATE";
  if (/(тендер|tender|конкурс|закупочн)/iu.test(text)) return "TENDER_BOQ";
  if (/(чертеж|рабоч|проектн|detailed|drawings?)/iu.test(text)) return "DETAILED_BOQ_FROM_DRAWINGS";
  if (/(концепц|ориентиров|rom|concept|укрупнен|укрупнён)/iu.test(text)) return "ROM_CONCEPT";
  return PRELIMINARY_LEVEL;
}

function templateIdForExpandedFamily(familyId: string, preferredLevel: ExpandedTemplateLevel = PRELIMINARY_LEVEL): string | null {
  const familyTemplates = EXPANDED_COMPLEX_TEMPLATES.filter((template) => template.work_family_id === familyId);
  const selected =
    familyTemplates.find((template) => template.template_level === preferredLevel) ??
    familyTemplates.find((template) => template.template_level === PRELIMINARY_LEVEL) ??
    familyTemplates[0] ??
    null;
  return selected?.template_id ?? null;
}

function passportForTemplateId(templateId: string): ProfessionalWorkPassport | null {
  if (selectedTemplateCache.has(templateId)) return selectedTemplateCache.get(templateId) ?? null;
  const passport = buildProfessionalWorkPassport(templateId);
  setBoundedCache(selectedTemplateCache, templateId, passport);
  return passport;
}

function templateIdForWorkKey(workKey: string): string | null {
  const normalized = workKey.trim();
  if (!normalized) return null;
  if (workKeyToTemplateIdCache.has(normalized)) return workKeyToTemplateIdCache.get(normalized) ?? null;

  const specialTemplateId = SPECIAL_WORK_KEY_TO_TEMPLATE_ID[normalized];
  if (specialTemplateId) {
    setBoundedCache(workKeyToTemplateIdCache, normalized, specialTemplateId);
    return specialTemplateId;
  }

  const familyId = SPECIAL_WORK_KEY_TO_EXPANDED_FAMILY[normalized] ?? normalized;
  if (getExpandedComplexWorkFamily(familyId)) {
    const templateId = templateIdForExpandedFamily(familyId);
    setBoundedCache(workKeyToTemplateIdCache, normalized, templateId);
    return templateId;
  }

  const baseTemplateId = baseTemplateByWorkKey.get(normalized) ?? baseTemplateByFamilyId.get(normalized) ?? null;
  if (baseTemplateId) {
    setBoundedCache(workKeyToTemplateIdCache, normalized, baseTemplateId);
    return baseTemplateId;
  }

  setBoundedCache(workKeyToTemplateIdCache, normalized, null);
  return null;
}

function candidateFromPassport(
  passport: ProfessionalWorkPassport,
  confidence: number,
  reason: string,
): InlineWorkTemplateCandidate {
  return {
    templateId: passport.templateId,
    templateName: passport.localizedNameRu || passport.workDescription.titleRu || passport.templateId,
    family: passport.familyId,
    workKey: passport.workKey || null,
    confidence: Math.max(0, Math.min(1, confidence)),
    reason,
  };
}

function candidateForFamily(
  familyId: string,
  confidence: number,
  reason: string,
  preferredLevel: ExpandedTemplateLevel = PRELIMINARY_LEVEL,
): InlineWorkTemplateCandidate | null {
  const templateId = templateIdForExpandedFamily(familyId, preferredLevel);
  if (!templateId) return null;
  const passport = passportForTemplateId(templateId);
  return passport ? candidateFromPassport(passport, confidence, reason) : null;
}

function candidateForTemplateId(
  templateId: string,
  confidence: number,
  reason: string,
): InlineWorkTemplateCandidate | null {
  const passport = passportForTemplateId(templateId);
  return passport ? candidateFromPassport(passport, confidence, reason) : null;
}

function candidateForWorkKey(
  workKey: string,
  confidence: number,
  reason: string,
): InlineWorkTemplateCandidate | null {
  const templateId = templateIdForWorkKey(workKey);
  if (!templateId) return null;
  const passport = passportForTemplateId(templateId);
  return passport ? { ...candidateFromPassport(passport, confidence, reason), workKey } : null;
}

function capitalRenovationCandidate(
  confidence: number,
  reason: string,
): InlineWorkTemplateCandidate {
  return {
    templateId: CAPITAL_RENOVATION_TEMPLATE_ID,
    templateName: "Капитальный ремонт квартиры",
    family: CAPITAL_RENOVATION_WORK_KEY,
    workKey: CAPITAL_RENOVATION_WORK_KEY,
    confidence: Math.max(0, Math.min(1, confidence)),
    reason,
  };
}

function isCapitalRenovationSelection(selectedId: string): boolean {
  return CAPITAL_RENOVATION_SELECTED_IDS.has(selectedId.trim());
}

function isCapitalRenovationPrompt(rawInput: string): boolean {
  const repaired = repairGlobalWorkMojibakeRu(rawInput);
  const normalized = normalizeInlineWorkPromptText(repaired);
  return CAPITAL_RENOVATION_PROMPT_PATTERN.test(repaired) || CAPITAL_RENOVATION_PROMPT_PATTERN.test(normalized);
}

function dedupeCandidates(candidates: (InlineWorkTemplateCandidate | null)[]): InlineWorkTemplateCandidate[] {
  const byTemplate = new Map<string, InlineWorkTemplateCandidate>();
  for (const candidate of candidates) {
    if (!candidate) continue;
    const existing = byTemplate.get(candidate.templateId);
    if (!existing || candidate.confidence > existing.confidence) {
      byTemplate.set(candidate.templateId, candidate);
    }
  }
  return [...byTemplate.values()]
    .sort((left, right) =>
      right.confidence - left.confidence ||
      candidatePriority(right.reason) - candidatePriority(left.reason) ||
      left.templateName.localeCompare(right.templateName, "ru")
    )
    .slice(0, 8);
}

function candidatePriority(reason: string): number {
  if (reason.startsWith("user_selected")) return 6;
  if (reason.startsWith("contextual_explicit_")) return 5.75;
  if (reason.startsWith("catalog_title")) {
    const aliasLength = Number(reason.split(":")[2] ?? 0);
    return 5.7 + Math.min(Number.isFinite(aliasLength) ? aliasLength : 0, 200) / 10000;
  }
  if (reason.startsWith("explicit_template_")) return 5.5;
  if (reason.startsWith("registry_alias")) return 5.5;
  if (reason.startsWith("exact_alias")) return 5;
  if (reason.startsWith("expanded_complex_resolver")) return 4.5;
  if (reason.startsWith("phrase")) return 4;
  if (reason.startsWith("explicit_")) return 5.6;
  if (reason.startsWith("category_hint")) return 1;
  return 0;
}

function findSpan(rawInput: string, candidate: InlineWorkTemplateCandidate): [number, number] {
  const repaired = repairGlobalWorkMojibakeRu(rawInput);
  const normalizedRaw = normalizeInlineWorkPromptText(repaired);
  const names = [
    candidate.templateName,
    candidate.family.replace(/_/g, " "),
    candidate.templateId.replace(/_/g, " "),
  ].map(normalizeInlineWorkPromptText).filter(Boolean);

  for (const name of names) {
    const index = normalizedRaw.indexOf(name);
    if (index >= 0) return [index, Math.min(rawInput.length, index + name.length)];
  }
  return [0, rawInput.length];
}

function selectedCandidate(input: MatchWorkTemplateFromPromptInput): InlineWorkTemplateCandidate | null {
  const selectedId = input.selectedTemplateId?.trim() || input.selectedWorkKey?.trim() || "";
  if (!selectedId) return null;
  if (isCapitalRenovationSelection(selectedId)) {
    return capitalRenovationCandidate(1, "user_selected_capital_renovation");
  }
  const directPassport = passportForTemplateId(selectedId);
  if (directPassport) return candidateFromPassport(directPassport, 1, "user_selected_template");
  return candidateForWorkKey(selectedId, 1, "user_selected_work_key");
}

function syntheticTechnicalWorkKeyPrompt(rawInput: string): boolean {
  const match = rawInput
    .trim()
    .match(/^(?:(?:estimate|quote|request|boq)\s+)?([a-z][a-z0-9]+(?:_[a-z0-9]+)+)\b/i);
  const token = match?.[1]?.toLowerCase() ?? "";
  return Boolean(token);
}

function registryAliasCandidates(rawInput: string): InlineWorkTemplateCandidate[] {
  const normalized = normalizeInlineWorkPromptText(repairGlobalWorkMojibakeRu(rawInput));
  const promptTokens = new Set(normalized.split(/\s+/g).filter((token) => token.length >= 3));
  const entries = new Map<string, typeof baseTemplateAliasEntries[number]>();
  for (const token of promptTokens) {
    for (const entry of baseTemplateAliasEntriesByToken.get(token) ?? []) {
      entries.set(`${entry.templateId}:${entry.normalizedAlias}`, entry);
    }
  }
  return dedupeCandidates(
    [...entries.values()]
      .filter((entry) => normalized.includes(entry.normalizedAlias))
      .map((entry) => candidateForTemplateId(entry.templateId, 1, `registry_alias:${entry.workKey}`)),
  );
}

function catalogTitleCandidates(rawInput: string): InlineWorkTemplateCandidate[] {
  const normalized = normalizeInlineWorkPromptText(repairGlobalWorkMojibakeRu(rawInput));
  const preferredLevel = expandedTemplateLevelFromPrompt(rawInput);
  const promptTokens = new Set(normalized.split(/\s+/g).filter((token) => token.length >= 3));
  const entries = new Map<string, CatalogTitleAliasEntry>();
  for (const token of promptTokens) {
    for (const entry of catalogTitleAliasEntriesByToken.get(token) ?? []) {
      entries.set(`${entry.templateId ?? entry.familyId}:${entry.normalizedAlias}`, entry);
    }
  }
  return dedupeCandidates(
    [...entries.values()]
      .filter((entry) => normalized.includes(entry.normalizedAlias))
      .map((entry) =>
        entry.templateId
          ? candidateForTemplateId(entry.templateId, 1, `catalog_title:${entry.workKey}:${entry.normalizedAlias.length}`)
          : entry.familyId
            ? candidateForFamily(entry.familyId, 1, `catalog_title:${entry.workKey}:${entry.normalizedAlias.length}`, preferredLevel)
            : null
      ),
  );
}

function explicitCandidates(rawInput: string): InlineWorkTemplateCandidate[] {
  const normalized = normalizeInlineWorkPromptText(rawInput);
  const repaired = repairGlobalWorkMojibakeRu(rawInput);
  const preferredLevel = expandedTemplateLevelFromPrompt(rawInput);
  const fromPatterns = EXPLICIT_FAMILY_PATTERNS
    .filter((entry) => entry.pattern.test(normalized) || entry.pattern.test(repaired))
    .map((entry) => candidateForFamily(entry.familyId, 1, entry.reason, preferredLevel));

  const resolved =
    resolveExpandedComplexWorkFamily(rawInput) ??
    resolveExpandedComplexWorkFamily(repaired) ??
    resolveExpandedComplexWorkFamily(normalized);
  return dedupeCandidates([
    isCapitalRenovationPrompt(rawInput) ? capitalRenovationCandidate(1, "explicit_capital_renovation_alias") : null,
    ...fromPatterns,
    ...catalogTitleCandidates(rawInput),
    ...registryAliasCandidates(rawInput),
    resolved ? candidateForFamily(resolved.work_family_id, 1, "expanded_complex_resolver", preferredLevel) : null,
  ]);
}

function smartSearchCandidates(rawInput: string): InlineWorkTemplateCandidate[] {
  if (normalizeInlineWorkPromptText(rawInput).length < 2) return [];
  return dedupeCandidates(
    searchGlobalWorkSmartSuggestions({ query: rawInput, limit: 8 }).map((suggestion) =>
      candidateForWorkKey(
        suggestion.workKey,
        suggestion.score,
        `${suggestion.matchKind}:${suggestion.workKey}`,
      ),
    ),
  );
}

function shouldDeferToSpecificProfessionalFallback(
  rawInput: string,
): boolean {
  const text = normalizeInlineWorkPromptText(repairGlobalWorkMojibakeRu(rawInput));
  return /(?:diamond|core)\s+drill|drilling.*concrete|concrete.*drilling/.test(text);
}

export function matchWorkTemplateFromPrompt(
  input: MatchWorkTemplateFromPromptInput,
): MatchWorkTemplateFromPromptResult {
  const rawInput = input.rawInput.trim();
  const selected = selectedCandidate(input);
  if (selected) {
    return {
      matchedTemplate: {
        templateId: selected.templateId,
        templateName: selected.templateName,
        family: selected.family,
        confidence: selected.confidence,
        matchSource: "user_selected",
        matchedTextSpan: findSpan(rawInput, selected),
      },
      candidateTemplates: [selected],
      mustAskUserToSelectTemplate: false,
    };
  }

  if (!rawInput) {
    return {
      matchedTemplate: null,
      candidateTemplates: [],
      mustAskUserToSelectTemplate: false,
      blockingReason: "empty_input",
    };
  }

  if (syntheticTechnicalWorkKeyPrompt(rawInput)) {
    return {
      matchedTemplate: null,
      candidateTemplates: [],
      mustAskUserToSelectTemplate: false,
      blockingReason: "technical_work_key_requires_explicit_selection",
    };
  }

  const candidates = dedupeCandidates([
    ...explicitCandidates(rawInput),
    ...smartSearchCandidates(rawInput),
  ]);
  const top = candidates[0] ?? null;
  const second = candidates[1] ?? null;
  const highConfidence = Boolean(top && (top.confidence >= 0.9 || (top.confidence >= 0.78 && top.confidence - (second?.confidence ?? 0) >= 0.08)));
  if (shouldDeferToSpecificProfessionalFallback(rawInput)) {
    return {
      matchedTemplate: null,
      candidateTemplates: candidates,
      mustAskUserToSelectTemplate: false,
      blockingReason: "specific_professional_fallback",
    };
  }
  const mustAsk = candidates.length > 1 && !highConfidence;

  return {
    matchedTemplate: top && highConfidence
      ? {
          templateId: top.templateId,
          templateName: top.templateName,
          family: top.family,
          confidence: top.confidence,
          matchSource: "auto_matched",
          matchedTextSpan: findSpan(rawInput, top),
        }
      : null,
    candidateTemplates: candidates,
    mustAskUserToSelectTemplate: mustAsk,
    blockingReason: candidates.length === 0
      ? "template_not_matched"
      : mustAsk
        ? "template_ambiguous"
        : undefined,
  };
}
