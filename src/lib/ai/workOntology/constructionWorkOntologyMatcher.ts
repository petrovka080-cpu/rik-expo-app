import { parseUniversalConstructionQuantities } from "../constructionFormulas/constructionFormulaRegistry";
import {
  categoryTerms,
  CONSTRUCTION_WORK_ONTOLOGY_BY_KEY,
  CONSTRUCTION_WORK_ONTOLOGY,
  currencyForCountry,
  pricebookScopeFor,
  normalizeWorkOntologyText,
  WORK_ONTOLOGY_COUNTRY_REGIONS,
} from "./constructionWorkOntologyCatalog";
import type {
  ConstructionWorkOntologyEntry,
  WorkOntologyCandidateScore,
  WorkOntologyCountry,
  WorkOntologyCurrency,
  WorkOntologyIntentResult,
  WorkOntologyMatchStatus,
  WorkOntologyUnit,
} from "./constructionWorkOntologyTypes";

const CLOSE_SCORE_GAP = 10;
const GLOBAL_CONFIDENCE_FLOOR = 0.68;

const SURFACE_TERMS = [
  "крыш",
  "кровл",
  "ванн",
  "санузел",
  "санузл",
  "фундамент",
  "подвал",
  "бассейн",
  "пол",
  "стена",
  "фасад",
  "балкон",
  "терраса",
];

const TILE_SURFACE_TERMS = ["пол", "стен", "ванн", "санузел", "санузл", "фартук", "ступен", "балкон", "террас"];

const ELECTRICAL_SPECIFIC_TERMS = [
  "провод",
  "кабель",
  "розет",
  "выключ",
  "щит",
  "автомат",
  "узо",
  "свет",
  "освещ",
  "слаботоч",
  "интернет",
  "домофон",
  "видео",
  "заземл",
];

type LocaleDetection = {
  country: WorkOntologyCountry;
  region: string;
  currency: WorkOntologyCurrency;
};

type ParsedQuantity = {
  quantity: number | null;
  unit: WorkOntologyUnit | null;
};

function roundConfidence(value: number): number {
  return Math.round(Math.max(0, Math.min(0.99, value)) * 100) / 100;
}

function tokens(value: string): string[] {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !/^\d/.test(token));
}

function indexTokensForEntry(entry: ConstructionWorkOntologyEntry): string[] {
  return [
    entry.canonical_work_key.replace(/_/g, " "),
    entry.visible_name_ru,
    ...entry.synonyms_ru,
    ...categoryTerms(entry.category),
  ].flatMap((value) => tokens(normalizeWorkOntologyText(value)));
}

const TOKEN_INDEX: ReadonlyMap<string, readonly string[]> = (() => {
  const mutable = new Map<string, Set<string>>();
  for (const entry of CONSTRUCTION_WORK_ONTOLOGY) {
    for (const token of indexTokensForEntry(entry)) {
      const current = mutable.get(token) ?? new Set<string>();
      current.add(entry.canonical_work_key);
      mutable.set(token, current);
    }
  }
  return new Map(
    [...mutable.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([token, keys]) => [token, [...keys].sort()]),
  );
})();

function hasPhrase(normalized: string, phrase: string): boolean {
  if (!phrase) return false;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "u").test(normalized);
}

function candidateEntriesFor(normalized: string): ConstructionWorkOntologyEntry[] {
  const candidateKeys = new Set<string>();
  for (const token of tokens(normalized)) {
    for (const key of TOKEN_INDEX.get(token) ?? []) candidateKeys.add(key);
  }
  return [...candidateKeys]
    .sort()
    .map((key) => CONSTRUCTION_WORK_ONTOLOGY_BY_KEY.get(key))
    .filter((entry): entry is ConstructionWorkOntologyEntry => Boolean(entry));
}

function unitFromUniversal(unit: string | undefined): WorkOntologyUnit | null {
  if (!unit) return null;
  if (unit === "sq_m") return "m2";
  if (unit === "m3") return "m3";
  if (unit === "linear_m") return "linear_m";
  if (unit === "pcs") return "piece";
  if (unit === "set") return "set";
  if (unit === "kg") return "kg";
  if (unit === "ton") return "ton";
  return null;
}

export function parseWorkOntologyQuantityUnit(text: string): ParsedQuantity {
  const parsed = parseUniversalConstructionQuantities(text);
  return {
    quantity: parsed.primaryQuantity ?? null,
    unit: unitFromUniversal(parsed.primaryUnit),
  };
}

function detectCountryRegion(text: string): LocaleDetection {
  const normalized = normalizeWorkOntologyText(text);
  if (/алматы|almaty/.test(normalized)) return { country: "KZ", region: "Almaty", currency: "KZT" };
  if (/москва|moscow/.test(normalized)) return { country: "RU", region: "Moscow", currency: "RUB" };
  if (/ташкент|tashkent/.test(normalized)) return { country: "UZ", region: "Tashkent", currency: "UZS" };
  if (/ош(?:\s|$)|osh/.test(normalized)) return { country: "KG", region: "Osh", currency: "KGS" };
  if (/бишкек|bishkek/.test(normalized)) return { country: "KG", region: "Bishkek", currency: "KGS" };
  return WORK_ONTOLOGY_COUNTRY_REGIONS[0];
}

function hasAny(normalized: string, terms: readonly string[]): boolean {
  return terms.some((term) => normalized.includes(term));
}

function isBroadAmbiguousConstructionInput(normalized: string): boolean {
  if (hasPhrase(normalized, "тип")) return false;
  const wordCount = tokens(normalized).length;
  const hasWaterproofing = /гидроизоляц/.test(normalized);
  if (hasWaterproofing && !hasAny(normalized, SURFACE_TERMS)) return true;

  const hasTile = /плитк|кафель|керамогранит/.test(normalized);
  if (hasTile && !hasAny(normalized, TILE_SURFACE_TERMS)) return true;

  const electricalOnly = /электрик|электромонтаж/.test(normalized) && !hasAny(normalized, ELECTRICAL_SPECIFIC_TERMS);
  if (electricalOnly && wordCount <= 4) return true;

  const plumbingOnly = /сантехник/.test(normalized) && !/(водопровод|канализац|унитаз|раковин|ванн|душ|смесител|труб|бойлер)/.test(normalized);
  return plumbingOnly && wordCount <= 4;
}

function scoreEntry(input: {
  normalized: string;
  parsed: ParsedQuantity;
  entry: ConstructionWorkOntologyEntry;
}): WorkOntologyCandidateScore {
  const reasons: string[] = [];
  let score = 0;
  const keyPhrase = normalizeWorkOntologyText(input.entry.canonical_work_key.replace(/_/g, " "));
  const explicitKeyMarker = normalizeWorkOntologyText(`тип ${input.entry.canonical_work_key.replace(/_/g, " ")}`);
  const hasExplicitKeyMarker = hasPhrase(input.normalized, explicitKeyMarker);
  const hasAnyExplicitKeyMarker = hasPhrase(input.normalized, "тип");
  if (hasExplicitKeyMarker) {
    score += 240;
    reasons.push("explicit_key_disambiguator");
  }
  if ((hasExplicitKeyMarker || !hasAnyExplicitKeyMarker) && hasPhrase(input.normalized, keyPhrase)) {
    score += 110;
    reasons.push("canonical_key_phrase");
  }

  let bestSynonymScore = 0;
  for (const synonym of input.entry.synonyms_ru) {
    if (!synonym || synonym.length < 3) continue;
    if (hasPhrase(input.normalized, synonym) || input.normalized.includes(synonym)) {
      const synonymScore = Math.min(125, 58 + Math.round(synonym.length / 2));
      if (synonymScore > bestSynonymScore) bestSynonymScore = synonymScore;
    }
  }
  if (bestSynonymScore > 0) {
    score += bestSynonymScore;
    reasons.push("synonym_phrase_match");
  }

  const visibleTokens = tokens(normalizeWorkOntologyText(input.entry.visible_name_ru));
  const visibleTokenHits = visibleTokens.filter((token) => input.normalized.includes(token)).length;
  if (visibleTokens.length > 0 && visibleTokenHits === visibleTokens.length) {
    score += 34;
    reasons.push("visible_name_token_coverage");
  } else if (visibleTokenHits >= 2) {
    score += 18;
    reasons.push("partial_visible_token_coverage");
  }

  const categoryHits = categoryTerms(input.entry.category).filter((term) => input.normalized.includes(term)).length;
  if (categoryHits > 0) {
    score += Math.min(18, categoryHits * 6);
    reasons.push("category_terms");
  }

  const negativeHit = input.entry.negative_synonyms_ru.find((term) => input.normalized.includes(term));
  if (negativeHit) {
    score -= 115;
    reasons.push(`negative_synonym:${negativeHit}`);
  }

  if (input.parsed.unit) {
    if (input.entry.expected_units.includes(input.parsed.unit)) {
      score += 16;
      reasons.push("expected_unit_compatible");
    } else {
      score -= 24;
      reasons.push("expected_unit_mismatch");
    }
  }

  if (score < 0) score = 0;
  return {
    canonical_work_key: input.entry.canonical_work_key,
    visible_name_ru: input.entry.visible_name_ru,
    category: input.entry.category,
    score,
    confidence: roundConfidence(score / 115),
    reasons,
  };
}

function emptyResult(input: {
  userInput: string;
  normalized: string;
  parsed: ParsedQuantity;
  locale: LocaleDetection;
  status: WorkOntologyMatchStatus;
  candidates?: WorkOntologyCandidateScore[];
}): WorkOntologyIntentResult {
  return {
    user_input: input.userInput,
    normalized_intent: input.normalized,
    canonical_work_key: null,
    selected_work_key: null,
    visible_work_name_ru: null,
    category: null,
    quantity: input.parsed.quantity,
    unit: input.parsed.unit,
    expected_unit: null,
    recipe_scope: null,
    material_recipe_scope: null,
    pricebook_scope: null,
    country: input.locale.country,
    region: input.locale.region,
    expected_currency: input.locale.currency,
    confidence: 0,
    ambiguity_status: input.status,
    candidates: input.candidates ?? [],
    ui_payload: {
      selected_work_key: null,
      visible_work_name_ru: null,
      quantity: input.parsed.quantity,
      unit: input.parsed.unit,
      recipe_scope: null,
      material_recipe_scope: null,
      pricebook_scope: null,
    },
    pdf_payload: {
      selected_work_key: null,
      visible_work_name_ru: null,
      quantity: input.parsed.quantity,
      unit: input.parsed.unit,
      recipe_scope: null,
      material_recipe_scope: null,
      pricebook_scope: null,
    },
    fake_green_claimed: false,
  };
}

function resolvedStatus(entry: ConstructionWorkOntologyEntry): WorkOntologyMatchStatus {
  if (!entry.supported || entry.support_status === "UNSUPPORTED") return "WORK_NOT_SUPPORTED";
  if (entry.support_status === "RECIPE_MISSING" || !entry.recipe_scope || !entry.material_recipe_scope) return "RECIPE_MISSING";
  if (entry.support_status === "PRICEBOOK_SCOPE_MISSING" || !entry.pricebook_scope) return "PRICEBOOK_SCOPE_MISSING";
  return "RESOLVED";
}

function candidateEntry(candidate: WorkOntologyCandidateScore): ConstructionWorkOntologyEntry {
  const entry = CONSTRUCTION_WORK_ONTOLOGY_BY_KEY.get(candidate.canonical_work_key);
  if (!entry) throw new Error(`WORK_ONTOLOGY_CANDIDATE_ENTRY_MISSING:${candidate.canonical_work_key}`);
  return entry;
}

function sortCandidates(left: WorkOntologyCandidateScore, right: WorkOntologyCandidateScore): number {
  if (right.score !== left.score) return right.score - left.score;
  return left.canonical_work_key.localeCompare(right.canonical_work_key);
}

export function resolveConstructionWorkOntologyIntent(userInput: string): WorkOntologyIntentResult {
  const normalized = normalizeWorkOntologyText(userInput);
  const parsed = parseWorkOntologyQuantityUnit(userInput);
  const locale = detectCountryRegion(userInput);
  if (!normalized) return emptyResult({ userInput, normalized, parsed, locale, status: "WORK_NOT_SUPPORTED" });

  const entries = candidateEntriesFor(normalized);
  const candidates = entries
    .map((entry) => scoreEntry({ normalized, parsed, entry }))
    .filter((candidate) => candidate.score > 0)
    .sort(sortCandidates)
    .slice(0, 12);

  if (isBroadAmbiguousConstructionInput(normalized)) {
    return emptyResult({
      userInput,
      normalized,
      parsed,
      locale,
      status: "AMBIGUOUS_WORK_INPUT",
      candidates: candidates.slice(0, 5),
    });
  }

  const top = candidates[0];
  if (!top) return emptyResult({ userInput, normalized, parsed, locale, status: "WORK_NOT_SUPPORTED" });

  const entry = candidateEntry(top);
  const second = candidates[1];
  const floor = Math.max(GLOBAL_CONFIDENCE_FLOOR, entry.confidence_floor);
  if (top.confidence < floor) {
    return emptyResult({
      userInput,
      normalized,
      parsed,
      locale,
      status: "LOW_CONFIDENCE_MATCH",
      candidates: candidates.slice(0, 5),
    });
  }
  if (second) {
    const secondEntry = candidateEntry(second);
    const sameAmbiguityGroup = entry.ambiguity_group !== null && entry.ambiguity_group === secondEntry.ambiguity_group;
    const explicitlyDisambiguated = top.reasons.includes("explicit_key_disambiguator");
    if (!explicitlyDisambiguated && sameAmbiguityGroup && top.score - second.score <= CLOSE_SCORE_GAP) {
      return emptyResult({
        userInput,
        normalized,
        parsed,
        locale,
        status: "AMBIGUOUS_WORK_INPUT",
        candidates: candidates.slice(0, 5),
      });
    }
  }

  const status = resolvedStatus(entry);
  if (status !== "RESOLVED") {
    return emptyResult({
      userInput,
      normalized,
      parsed,
      locale,
      status,
      candidates: candidates.slice(0, 5),
    });
  }

  const quantity = parsed.quantity;
  const unit = parsed.unit ?? entry.default_unit;
  const pricebookScope = pricebookScopeFor({
    country: locale.country,
    region: locale.region,
    category: entry.category,
  });
  const payload = {
    selected_work_key: entry.canonical_work_key,
    visible_work_name_ru: entry.visible_name_ru,
    quantity,
    unit,
    recipe_scope: entry.recipe_scope,
    material_recipe_scope: entry.material_recipe_scope,
    pricebook_scope: pricebookScope,
  };

  return {
    user_input: userInput,
    normalized_intent: entry.visible_name_ru,
    canonical_work_key: entry.canonical_work_key,
    selected_work_key: entry.canonical_work_key,
    visible_work_name_ru: entry.visible_name_ru,
    category: entry.category,
    quantity,
    unit,
    expected_unit: entry.default_unit,
    recipe_scope: entry.recipe_scope,
    material_recipe_scope: entry.material_recipe_scope,
    pricebook_scope: pricebookScope,
    country: locale.country,
    region: locale.region,
    expected_currency: currencyForCountry(locale.country),
    confidence: top.confidence,
    ambiguity_status: "RESOLVED",
    candidates: candidates.slice(0, 5),
    ui_payload: payload,
    pdf_payload: payload,
    fake_green_claimed: false,
  };
}

export function resolveManyConstructionWorkOntologyIntents(inputs: readonly string[]): WorkOntologyIntentResult[] {
  return inputs.map((input) => resolveConstructionWorkOntologyIntent(input));
}
