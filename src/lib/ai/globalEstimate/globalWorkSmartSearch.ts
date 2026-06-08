import type { GlobalEstimateInput, GlobalWorkCategory, GlobalWorkTypeDefinition } from "./globalEstimateTypes";
import {
  GLOBAL_WORK_ALIASES,
  GLOBAL_WORK_TYPE_DEFINITIONS,
  normalizeGlobalWorkAlias,
} from "./globalWorkTypeResolver";

export type GlobalWorkSmartSearchMatchKind =
  | "exact_alias"
  | "exact_title"
  | "phrase"
  | "token_overlap"
  | "category_hint";

export type GlobalWorkSmartSearchSuggestion = {
  workKey: string;
  titleRu: string;
  categoryKey: GlobalWorkCategory;
  categoryTitleRu: string;
  defaultMeasureUnit: GlobalWorkTypeDefinition["defaultMeasureUnit"];
  score: number;
  matchKind: GlobalWorkSmartSearchMatchKind;
  matchedTokens: string[];
  visibleText: string;
};

export type GlobalSelectedWorkBinding = {
  selectedWorkKey: string;
  selectedTitleRu: string;
  selectedCategoryKey: GlobalWorkCategory;
  selectedCategoryTitleRu: string;
  rawInput: string;
  source: "user_selected";
  resolverReGuessed: false;
};

const SMART_SEARCH_MATCH_KIND_RANK: Record<GlobalWorkSmartSearchMatchKind, number> = {
  exact_alias: 5,
  exact_title: 4,
  phrase: 3,
  token_overlap: 2,
  category_hint: 2,
};

const CP1251_SPECIAL: Record<number, string> = {
  0x80: "\u0402",
  0x81: "\u0403",
  0x82: "\u201a",
  0x83: "\u0453",
  0x84: "\u201e",
  0x85: "\u2026",
  0x86: "\u2020",
  0x87: "\u2021",
  0x88: "\u20ac",
  0x89: "\u2030",
  0x8a: "\u0409",
  0x8b: "\u2039",
  0x8c: "\u040a",
  0x8d: "\u040c",
  0x8e: "\u040b",
  0x8f: "\u040f",
  0x90: "\u0452",
  0x91: "\u2018",
  0x92: "\u2019",
  0x93: "\u201c",
  0x94: "\u201d",
  0x95: "\u2022",
  0x96: "\u2013",
  0x97: "\u2014",
  0x99: "\u2122",
  0x9a: "\u0459",
  0x9b: "\u203a",
  0x9c: "\u045a",
  0x9d: "\u045c",
  0x9e: "\u045b",
  0x9f: "\u045f",
  0xa0: "\u00a0",
  0xa1: "\u040e",
  0xa2: "\u045e",
  0xa3: "\u0408",
  0xa4: "\u00a4",
  0xa5: "\u0490",
  0xa6: "\u00a6",
  0xa7: "\u00a7",
  0xa8: "\u0401",
  0xa9: "\u00a9",
  0xaa: "\u0404",
  0xab: "\u00ab",
  0xac: "\u00ac",
  0xad: "\u00ad",
  0xae: "\u00ae",
  0xaf: "\u0407",
  0xb0: "\u00b0",
  0xb1: "\u00b1",
  0xb2: "\u0406",
  0xb3: "\u0456",
  0xb4: "\u0491",
  0xb5: "\u00b5",
  0xb6: "\u00b6",
  0xb7: "\u00b7",
  0xb8: "\u0451",
  0xb9: "\u2116",
  0xba: "\u0454",
  0xbb: "\u00bb",
  0xbc: "\u0458",
  0xbd: "\u0405",
  0xbe: "\u0455",
  0xbf: "\u0457",
};

const CP1251_REVERSE = new Map<string, number>();
for (const [byte, char] of Object.entries(CP1251_SPECIAL)) {
  CP1251_REVERSE.set(char, Number(byte));
}
for (let code = 0x0410; code <= 0x044f; code += 1) {
  CP1251_REVERSE.set(String.fromCharCode(code), code - 0x0410 + 0xc0);
}

const CATEGORY_TITLES_RU: Record<GlobalWorkCategory, string> = {
  flooring: "\u041f\u043e\u043b\u044b",
  wall_finishing: "\u041e\u0442\u0434\u0435\u043b\u043a\u0430 \u0441\u0442\u0435\u043d",
  ceiling: "\u041f\u043e\u0442\u043e\u043b\u043a\u0438",
  drywall: "\u0413\u041a\u041b",
  painting: "\u041c\u0430\u043b\u044f\u0440\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  plastering: "\u0428\u0442\u0443\u043a\u0430\u0442\u0443\u0440\u043a\u0430",
  putty: "\u0428\u043f\u0430\u043a\u043b\u0435\u0432\u043a\u0430",
  tile: "\u041f\u043b\u0438\u0442\u043e\u0447\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  doors_windows: "\u0414\u0432\u0435\u0440\u0438 \u0438 \u043e\u043a\u043d\u0430",
  electrical: "\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043c\u043e\u043d\u0442\u0430\u0436",
  plumbing: "\u0421\u0430\u043d\u0442\u0435\u0445\u043d\u0438\u043a\u0430",
  heating_hvac: "\u041e\u0442\u043e\u043f\u043b\u0435\u043d\u0438\u0435 \u0438 \u0432\u0435\u043d\u0442\u0438\u043b\u044f\u0446\u0438\u044f",
  roofing: "\u041a\u0440\u043e\u0432\u043b\u044f",
  facade: "\u0424\u0430\u0441\u0430\u0434",
  foundation: "\u0424\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442",
  concrete: "\u0411\u0435\u0442\u043e\u043d",
  masonry: "\u041a\u043b\u0430\u0434\u043a\u0430",
  waterproofing: "\u0413\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f",
  insulation: "\u0423\u0442\u0435\u043f\u043b\u0435\u043d\u0438\u0435",
  demolition: "\u0414\u0435\u043c\u043e\u043d\u0442\u0430\u0436",
  landscaping: "\u0411\u043b\u0430\u0433\u043e\u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e",
  roadworks: "\u0414\u043e\u0440\u043e\u0436\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  metalworks: "\u041c\u0435\u0442\u0430\u043b\u043b\u043e\u043a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u0438",
  carpentry: "\u041f\u043b\u043e\u0442\u043d\u0438\u0446\u043a\u0438\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  documents_design: "\u041f\u0440\u043e\u0435\u043a\u0442\u044b \u0438 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
  cleaning: "\u0423\u0431\u043e\u0440\u043a\u0430",
  delivery_equipment: "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u0438 \u0442\u0435\u0445\u043d\u0438\u043a\u0430",
  other: "\u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
};

const STOP_TOKENS = new Set([
  "estimate",
  "construction",
  "work",
  "works",
  "job",
  "service",
  "set",
  "sqm",
  "sq",
  "m",
  "m2",
  "m3",
  "\u0441\u043c\u0435\u0442\u0430",
  "\u043d\u0430",
  "\u043f\u043e",
  "\u0434\u043b\u044f",
  "\u0440\u0430\u0431\u043e\u0442\u0430",
  "\u0440\u0430\u0431\u043e\u0442\u044b",
  "\u043a\u0432",
  "\u043c",
  "\u043c2",
  "\u043c3",
  "\u043c\u00b2",
  "\u043c\u00b3",
  "\u0448\u0442",
]);

function cp1251ByteForChar(char: string): number | null {
  const code = char.charCodeAt(0);
  if (code <= 0x7f) return code;
  return CP1251_REVERSE.get(char) ?? null;
}

function decodeUtf8(bytes: number[]): string | null {
  let output = "";
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index];
    if (first < 0x80) {
      output += String.fromCharCode(first);
      index += 1;
      continue;
    }
    const needed = first >= 0xf0 ? 3 : first >= 0xe0 ? 2 : first >= 0xc0 ? 1 : -1;
    if (needed < 0 || index + needed >= bytes.length) return null;
    let codePoint = first & (needed === 3 ? 0x07 : needed === 2 ? 0x0f : 0x1f);
    for (let offset = 1; offset <= needed; offset += 1) {
      const next = bytes[index + offset];
      if ((next & 0xc0) !== 0x80) return null;
      codePoint = (codePoint << 6) | (next & 0x3f);
    }
    output += String.fromCodePoint(codePoint);
    index += needed + 1;
  }
  return output;
}

function mojibakeMarkerCount(value: string): number {
  return (value.match(/[РС][\u0080-\u04ff]|в[\u0080-\u04ff]/gu) ?? []).length;
}

function cyrillicCount(value: string): number {
  return (value.match(/[\u0400-\u04ff]/gu) ?? []).length;
}

export function repairGlobalWorkMojibakeRu(value: string | null | undefined): string {
  const text = String(value ?? "");
  if (!text) return "";
  const bytes: number[] = [];
  for (const char of Array.from(text)) {
    const byte = cp1251ByteForChar(char);
    if (byte == null) return text;
    bytes.push(byte);
  }
  const decoded = decodeUtf8(bytes);
  if (!decoded) return text;
  if (mojibakeMarkerCount(decoded) < mojibakeMarkerCount(text) && cyrillicCount(decoded) > 0) {
    return decoded.replace(/\u00a0/g, " ");
  }
  return text;
}

function normalizeSmartSearchText(value: string): string {
  return normalizeGlobalWorkAlias(repairGlobalWorkMojibakeRu(value))
    .replace(/\u0451/gu, "\u0435")
    .replace(/[_./:,;()[\]{}"'+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function tokenizeSmartSearch(value: string): string[] {
  return unique(
    normalizeSmartSearchText(value)
      .split(" ")
      .filter((token) => token.length > 1 && !/^\d+$/.test(token) && !STOP_TOKENS.has(token)),
  );
}

function expandedQueryTokens(input: string): string[] {
  const normalized = normalizeSmartSearchText(input);
  const tokens = tokenizeSmartSearch(input);
  const expansions: string[] = [];
  if (/\u043c\u043e\u043d\u0442\u0430\u0436|\u0443\u0441\u0442\u0430\u043d\u043e\u0432|\u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432/.test(normalized)) {
    expansions.push(
      "\u043c\u043e\u043d\u0442\u0430\u0436",
      "\u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430",
      "\u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e",
      "install",
      "installation",
    );
  }
  if (/\u044d\u043b\u0435\u043a\u0442\u0440\u043e|\u0440\u043e\u0437\u0435\u0442|\u043a\u0430\u0431\u0435\u043b\u044c|\u043f\u0440\u043e\u0432\u043e\u0434|\u0449\u0438\u0442|\u0441\u0432\u0435\u0442/.test(normalized)) {
    expansions.push(
      "\u044d\u043b\u0435\u043a\u0442\u0440\u043e",
      "\u044d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430",
      "\u0440\u043e\u0437\u0435\u0442\u043a\u0430",
      "\u043a\u0430\u0431\u0435\u043b\u044c",
      "\u043f\u0440\u043e\u0432\u043e\u0434\u043a\u0430",
      "\u0449\u0438\u0442",
      "\u0441\u0432\u0435\u0442\u0438\u043b\u044c\u043d\u0438\u043a",
      "electrical",
    );
  }
  if (/\u0431\u0440\u0443\u0441\u0447\u0430\u0442|\u043c\u043e\u0449\u0435\u043d/.test(normalized)) {
    expansions.push("\u0431\u0440\u0443\u0441\u0447\u0430\u0442\u043a\u0430", "\u043c\u043e\u0449\u0435\u043d\u0438\u0435", "paving", "stone");
  }
  if (/\u043a\u0440\u044b\u0448|\u043a\u0440\u043e\u0432\u043b|\broofs?\b|\broofing\b/.test(normalized)) {
    expansions.push("\u043a\u0440\u044b\u0448\u0430", "\u043a\u0440\u043e\u0432\u043b\u044f", "roof", "roofing");
  }
  if (/\u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442|\bfoundations?\b/.test(normalized)) {
    expansions.push("\u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442", "foundation", "strip", "\u0431\u0435\u0442\u043e\u043d");
  }
  if (/\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446|\bwaterproof(?:ing)?\b/.test(normalized)) {
    expansions.push("\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f", "waterproofing", "membrane");
  }
  if (/\u0441\u0442\u044f\u0436\u043a|\bscreeds?\b/.test(normalized)) {
    expansions.push("\u0441\u0442\u044f\u0436\u043a\u0430", "screed", "floor");
  }
  if (/\u043f\u043b\u0438\u0442\u043a|\u043a\u0430\u0444\u0435\u043b|\btiles?\b|\btiling\b/.test(normalized)) {
    expansions.push("\u043f\u043b\u0438\u0442\u043a\u0430", "\u043a\u0430\u0444\u0435\u043b\u044c", "tile", "tiling");
  }
  return unique([...tokens, ...expansions].map(normalizeSmartSearchText).filter(Boolean));
}

function queryCategoryHints(normalizedInput: string): Set<GlobalWorkCategory> {
  const hints = new Set<GlobalWorkCategory>();
  if (/\u044d\u043b|\belec|\u0440\u043e\u0437\u0435\u0442|\u043a\u0430\u0431\u0435\u043b|\u043f\u0440\u043e\u0432\u043e\u0434|\u0449\u0438\u0442|\u0441\u0432\u0435\u0442/.test(normalizedInput)) {
    hints.add("electrical");
  }
  if (/\u0431\u0440\u0443\u0441\u0447\u0430\u0442|\u043c\u043e\u0449\u0435\u043d|\bpaving\b|\bstone\b/.test(normalizedInput)) {
    hints.add("landscaping");
    hints.add("roadworks");
  }
  if (/\u043a\u0440\u044b\u0448|\u043a\u0440\u043e\u0432\u043b|\broofs?\b|\broofing\b/.test(normalizedInput)) {
    hints.add("roofing");
  }
  if (/\u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442|\bfoundations?\b/.test(normalizedInput)) {
    hints.add("foundation");
    hints.add("concrete");
    hints.add("waterproofing");
  }
  if (/\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446|\bwaterproof(?:ing)?\b/.test(normalizedInput)) {
    hints.add("waterproofing");
  }
  if (/\u0441\u0442\u044f\u0436\u043a|\bscreeds?\b/.test(normalizedInput)) {
    hints.add("concrete");
    hints.add("flooring");
  }
  if (/\u043f\u043b\u0438\u0442\u043a|\u043a\u0430\u0444\u0435\u043b|\btiles?\b|\btiling\b/.test(normalizedInput)) {
    hints.add("tile");
  }
  if (/\u0441\u0430\u043d\u0442\u0435\u0445|\u0442\u0440\u0443\u0431|\u0432\u043e\u0434\u043e\u043f\u0440\u043e\u0432\u043e\u0434|\u043a\u0430\u043d\u0430\u043b\u0438\u0437|\bplumb\w*\b|\bpipe\w*\b/.test(normalizedInput)) {
    hints.add("plumbing");
  }
  if (/\u0432\u0435\u043d\u0442\u0438\u043b|\u0432\u043e\u0437\u0434\u0443\u0445|\bhvac\b|\bduct\w*\b/.test(normalizedInput)) {
    hints.add("heating_hvac");
  }
  return hints;
}

function intentWorkKeyBoost(definition: GlobalWorkTypeDefinition, normalizedInput: string, categoryHints: Set<GlobalWorkCategory>): number {
  if (categoryHints.has("electrical") && definition.category === "electrical") {
    if (/(battery|solar|chp)|\u0430\u043a\u043a\u0443\u043c\u0443\u043b|\u0441\u043e\u043b\u043d\u0435\u0447|\u043f\u0430\u043d\u0435\u043b/.test(normalizedInput)) {
      return 0;
    }
    const commonElectricalPriority = new Map<string, number>([
      ["conduit_installation", 0.12],
      ["cable_ladder_installation", 0.12],
      ["cable_tray_installation", 0.12],
      ["cable_laying", 0.12],
      ["socket_installation", 0.11],
      ["switch_installation", 0.1],
      ["lighting_installation", 0.1],
      ["distribution_panel_installation", 0.09],
      ["panel_replacement", 0.09],
      ["electrical_rough_in", 0.08],
      ["electrical_basic", 0.07],
      ["grounding_installation", 0.06],
    ]);
    if (/battery|solar/.test(definition.workKey)) return -0.12;
    return commonElectricalPriority.get(definition.workKey) ?? 0;
  }
  return 0;
}

export function visibleGlobalWorkCategoryTitleRu(category: GlobalWorkCategory): string {
  return CATEGORY_TITLES_RU[category] ?? CATEGORY_TITLES_RU.other;
}

function fallbackTitleRu(definition: GlobalWorkTypeDefinition): string {
  return `${visibleGlobalWorkCategoryTitleRu(definition.category)}: \u0440\u0430\u0431\u043e\u0442\u044b`;
}

export function visibleGlobalWorkTitleRu(definition: GlobalWorkTypeDefinition): string {
  const repaired = repairGlobalWorkMojibakeRu(definition.names.ru ?? "").replace(/\s+/g, " ").trim();
  const visible = repaired || repairGlobalWorkMojibakeRu(definition.names.en ?? "").replace(/\s+/g, " ").trim();
  if (!visible || /[_]/.test(visible) || !/[\u0400-\u04ff]/.test(visible)) {
    return fallbackTitleRu(definition);
  }
  return visible.replace(/^\u0421\u043c\u0435\u0442\u0430\s+\u043d\u0430\s+/i, "").trim();
}

function aliasesForWork(workKey: string): string[] {
  return GLOBAL_WORK_ALIASES
    .filter((alias) => alias.workKey === workKey)
    .flatMap((alias) => [alias.alias, repairGlobalWorkMojibakeRu(alias.alias)])
    .filter(Boolean);
}

type CandidateSearchIndex = {
  titleRu: string;
  normalizedTitle: string;
  aliases: string[];
  searchText: string;
  candidateTokens: Set<string>;
};

const CANDIDATE_SEARCH_INDEX = new Map<string, CandidateSearchIndex>();

function candidateSearchText(definition: GlobalWorkTypeDefinition): string {
  return [
    definition.workKey.replace(/_/g, " "),
    definition.category,
    visibleGlobalWorkCategoryTitleRu(definition.category),
    visibleGlobalWorkTitleRu(definition),
    definition.names.en,
    ...aliasesForWork(definition.workKey),
  ]
    .filter(Boolean)
    .map((value) => normalizeSmartSearchText(String(value)))
    .join(" ");
}

function candidateSearchIndex(definition: GlobalWorkTypeDefinition): CandidateSearchIndex {
  const cached = CANDIDATE_SEARCH_INDEX.get(definition.workKey);
  if (cached) return cached;
  const titleRu = visibleGlobalWorkTitleRu(definition);
  const aliases = aliasesForWork(definition.workKey).map(normalizeSmartSearchText);
  const searchText = candidateSearchText(definition);
  const index = {
    titleRu,
    normalizedTitle: normalizeSmartSearchText(titleRu),
    aliases,
    searchText,
    candidateTokens: new Set(tokenizeSmartSearch(searchText)),
  };
  CANDIDATE_SEARCH_INDEX.set(definition.workKey, index);
  return index;
}

function damerauLevenshteinAtMost(left: string, right: string, maxDistance: number): boolean {
  if (Math.abs(left.length - right.length) > maxDistance) return false;
  const distances = Array.from({ length: left.length + 1 }, (_, row) =>
    Array.from({ length: right.length + 1 }, (__, column) => (row === 0 ? column : column === 0 ? row : 0)),
  );
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + substitutionCost,
      );
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        distances[row][column] = Math.min(distances[row][column], distances[row - 2][column - 2] + 1);
      }
    }
  }
  return distances[left.length][right.length] <= maxDistance;
}

function tokenMatches(queryToken: string, candidateTokens: Set<string>): boolean {
  if (candidateTokens.has(queryToken)) return true;
  if (queryToken.length < 4) return false;
  return [...candidateTokens].some((token) => {
    if (token.length < 4) return false;
    if (token.startsWith(queryToken) || queryToken.startsWith(token)) return true;
    const typoBudget = Math.min(2, Math.floor(Math.max(queryToken.length, token.length) / 6));
    return typoBudget > 0 && queryToken[0] === token[0] && damerauLevenshteinAtMost(queryToken, token, typoBudget);
  });
}

function scoreDefinition(params: {
  definition: GlobalWorkTypeDefinition;
  normalizedInput: string;
  queryTokens: string[];
  categoryHints: Set<GlobalWorkCategory>;
}): Omit<GlobalWorkSmartSearchSuggestion, "visibleText"> | null {
  const { definition, normalizedInput, queryTokens, categoryHints } = params;
  const index = candidateSearchIndex(definition);
  const matchedTokens = queryTokens.filter((token) => tokenMatches(token, index.candidateTokens));
  const exactAlias = index.aliases.some((alias) => alias === normalizedInput);
  const exactTitle = index.normalizedTitle === normalizedInput;
  const phrase =
    normalizedInput.length >= 3 &&
    (index.searchText.includes(normalizedInput) ||
      normalizedInput.includes(index.normalizedTitle) ||
      index.aliases.some((alias) => alias.length >= 3 && normalizedInput.includes(alias)));
  const categoryHint =
    categoryHints.has(definition.category) ||
    normalizeSmartSearchText(visibleGlobalWorkCategoryTitleRu(definition.category)).includes(normalizedInput);
  if (!exactAlias && !exactTitle && !phrase && !categoryHint && matchedTokens.length === 0) return null;

  const coverage = matchedTokens.length / Math.max(queryTokens.length, 1);
  const matchKind: GlobalWorkSmartSearchMatchKind = exactAlias
    ? "exact_alias"
    : exactTitle
      ? "exact_title"
      : phrase
        ? "phrase"
        : categoryHint
          ? "category_hint"
          : "token_overlap";
  const categoryBoost = categoryHints.has(definition.category) ? 0.2 : 0;
  const workKeyBoost = intentWorkKeyBoost(definition, normalizedInput, categoryHints);
  const score = Math.min(
    1,
    (exactAlias ? 0.99 : exactTitle ? 0.98 : phrase ? 0.82 : categoryHint ? 0.76 : 0.52) + coverage * 0.18 + categoryBoost + workKeyBoost,
  );
  return {
    workKey: definition.workKey,
    titleRu: index.titleRu,
    categoryKey: definition.category,
    categoryTitleRu: visibleGlobalWorkCategoryTitleRu(definition.category),
    defaultMeasureUnit: definition.defaultMeasureUnit,
    score,
    matchKind,
    matchedTokens,
  };
}

export function searchGlobalWorkSmartSuggestions(input: {
  query: string;
  limit?: number;
}): GlobalWorkSmartSearchSuggestion[] {
  const normalizedInput = normalizeSmartSearchText(input.query);
  if (normalizedInput.length < 2) return [];
  const queryTokens = expandedQueryTokens(input.query);
  const categoryHints = queryCategoryHints(normalizedInput);
  const limit = Math.max(3, Math.min(input.limit ?? 8, 8));

  const scored = GLOBAL_WORK_TYPE_DEFINITIONS
    .map((definition) => scoreDefinition({ definition, normalizedInput, queryTokens, categoryHints }))
    .filter((suggestion): suggestion is Omit<GlobalWorkSmartSearchSuggestion, "visibleText"> => suggestion !== null)
    .sort((left, right) => {
      const rightRank = SMART_SEARCH_MATCH_KIND_RANK[right.matchKind];
      const leftRank = SMART_SEARCH_MATCH_KIND_RANK[left.matchKind];
      if (rightRank !== leftRank) return rightRank - leftRank;
      if (right.score !== left.score) return right.score - left.score;
      if (right.matchedTokens.length !== left.matchedTokens.length) return right.matchedTokens.length - left.matchedTokens.length;
      return left.titleRu.localeCompare(right.titleRu, "ru");
    });
  const uniqueScored: typeof scored = [];
  const seenWorkKeys = new Set<string>();
  for (const suggestion of scored) {
    if (seenWorkKeys.has(suggestion.workKey)) continue;
    seenWorkKeys.add(suggestion.workKey);
    uniqueScored.push(suggestion);
  }
  const selected = uniqueScored.slice(0, limit);
  if (selected.length > 0 && selected.length < Math.min(3, limit)) {
    const selectedKeys = new Set(selected.map((suggestion) => suggestion.workKey));
    const fillCategory = selected[0].categoryKey;
    for (const definition of GLOBAL_WORK_TYPE_DEFINITIONS) {
      if (selected.length >= Math.min(3, limit)) break;
      if (definition.category !== fillCategory || selectedKeys.has(definition.workKey)) continue;
      const index = candidateSearchIndex(definition);
      selected.push({
        workKey: definition.workKey,
        titleRu: index.titleRu,
        categoryKey: definition.category,
        categoryTitleRu: visibleGlobalWorkCategoryTitleRu(definition.category),
        defaultMeasureUnit: definition.defaultMeasureUnit,
        score: 0.25,
        matchKind: "category_hint",
        matchedTokens: [],
      });
      selectedKeys.add(definition.workKey);
    }
  }

  return selected.map((suggestion) => ({
      ...suggestion,
      visibleText: `${suggestion.titleRu} \u00b7 ${suggestion.categoryTitleRu}`,
    }));
}

export function buildGlobalSelectedWorkBinding(input: {
  selectedWorkKey: string;
  rawInput: string;
}): GlobalSelectedWorkBinding {
  const definition = GLOBAL_WORK_TYPE_DEFINITIONS.find((item) => item.workKey === input.selectedWorkKey);
  if (!definition) throw new Error(`UNKNOWN_SELECTED_WORK_KEY:${input.selectedWorkKey}`);
  return {
    selectedWorkKey: definition.workKey,
    selectedTitleRu: visibleGlobalWorkTitleRu(definition),
    selectedCategoryKey: definition.category,
    selectedCategoryTitleRu: visibleGlobalWorkCategoryTitleRu(definition.category),
    rawInput: input.rawInput,
    source: "user_selected",
    resolverReGuessed: false,
  };
}

export function buildGlobalEstimateInputWithSelectedWork(
  input: GlobalEstimateInput,
  selectedWork: GlobalSelectedWorkBinding | null | undefined,
): GlobalEstimateInput {
  return selectedWork
    ? { ...input, explicitWorkKey: selectedWork.selectedWorkKey }
    : input;
}
