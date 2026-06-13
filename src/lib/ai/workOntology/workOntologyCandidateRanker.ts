import {
  categoryTerms,
  CONSTRUCTION_WORK_ONTOLOGY,
  CONSTRUCTION_WORK_ONTOLOGY_BY_KEY,
  normalizeWorkOntologyText,
} from "./constructionWorkOntologyCatalog";
import { parseWorkOntologyQuantityUnit } from "./constructionWorkOntologyMatcher";
import type { ConstructionWorkOntologyEntry, WorkOntologyUnit } from "./constructionWorkOntologyTypes";
import type { NoHintCandidate } from "./noHintSemanticAuditTypes";

type ParsedNoHintQuantity = {
  quantity: number | null;
  unit: WorkOntologyUnit | null;
};

type RuleBoost = {
  key: string;
  score: number;
  reason: string;
};

const RU_ENDINGS = [
  "иями",
  "ями",
  "ами",
  "ого",
  "ему",
  "ыми",
  "ими",
  "ая",
  "ое",
  "ые",
  "ий",
  "ый",
  "ой",
  "ую",
  "ым",
  "ом",
  "ем",
  "ах",
  "ях",
  "ов",
  "ев",
  "ей",
  "ам",
  "ям",
  "ию",
  "ия",
  "ие",
  "ии",
  "а",
  "я",
  "ы",
  "и",
  "у",
  "ю",
  "е",
  "о",
  "ь",
  "й",
];

function roundConfidence(score: number): number {
  return Math.round(Math.max(0, Math.min(0.99, score / 120)) * 100) / 100;
}

function stemToken(token: string): string {
  let stem = token.replace(/ё/g, "е").replace(/^[^a-zа-я0-9]+|[^a-zа-я0-9]+$/giu, "");
  if (stem.length <= 4 || /^\d+$/.test(stem)) return stem;
  for (const ending of RU_ENDINGS) {
    if (stem.length - ending.length >= 4 && stem.endsWith(ending)) {
      stem = stem.slice(0, -ending.length);
      break;
    }
  }
  return stem;
}

function tokens(value: string): string[] {
  return normalizeWorkOntologyText(value)
    .split(/\s+/)
    .map(stemToken)
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function entryText(entry: ConstructionWorkOntologyEntry): string {
  return [
    entry.visible_name_ru,
    ...entry.synonyms_ru,
    ...categoryTerms(entry.category),
  ].join(" ");
}

const ENTRY_STEMS: ReadonlyMap<string, readonly string[]> = new Map(
  CONSTRUCTION_WORK_ONTOLOGY.map((entry) => [entry.canonical_work_key, unique(tokens(entryText(entry))).sort()]),
);

const STEM_INDEX: ReadonlyMap<string, readonly string[]> = (() => {
  const mutable = new Map<string, Set<string>>();
  for (const [workKey, stems] of ENTRY_STEMS.entries()) {
    for (const stem of stems) {
      const keys = mutable.get(stem) ?? new Set<string>();
      keys.add(workKey);
      mutable.set(stem, keys);
    }
  }
  return new Map(
    [...mutable.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([stem, keys]) => [stem, [...keys].sort()]),
  );
})();

const ENTRY_PHRASES: ReadonlyMap<string, readonly string[]> = new Map(
  CONSTRUCTION_WORK_ONTOLOGY.map((entry) => [
    entry.canonical_work_key,
    unique([entry.visible_name_ru, ...entry.synonyms_ru].map(normalizeWorkOntologyText))
      .filter((phrase) => phrase.length >= 4 && !/^[a-z0-9_ -]+$/i.test(phrase))
      .sort((left, right) => right.length - left.length),
  ]),
);

function hasStem(stems: readonly string[], stem: string): boolean {
  return stems.includes(stem);
}

function hasAllStems(inputStems: readonly string[], rawTerms: readonly string[]): boolean {
  return rawTerms.every((term) => hasStem(inputStems, stemToken(normalizeWorkOntologyText(term))));
}

function hasAnyStem(inputStems: readonly string[], rawTerms: readonly string[]): boolean {
  return rawTerms.some((term) => hasStem(inputStems, stemToken(normalizeWorkOntologyText(term))));
}

function noHintRuleBoosts(normalized: string, inputStems: readonly string[]): RuleBoost[] {
  const boosts: RuleBoost[] = [];
  const add = (key: string, score: number, reason: string) => boosts.push({ key, score, reason });

  if (/залить|заливк|бетонирован/.test(normalized) && hasAnyStem(inputStems, ["фундамент"])) {
    add("foundation_concrete", 130, "real_user_foundation_concrete_phrase");
  }
  if (/ленточн|лента/.test(normalized) && hasAnyStem(inputStems, ["фундамент"])) {
    add("strip_foundation", 138, "real_user_strip_foundation_phrase");
  }
  if (/плитн|монолитн/.test(normalized) && hasAnyStem(inputStems, ["фундамент", "плита"])) {
    add("slab_foundation", 138, "real_user_slab_foundation_phrase");
  }
  if (/армир|арматур/.test(normalized) && hasAnyStem(inputStems, ["плита", "фундамент"])) {
    add("foundation_rebar", 132, "real_user_rebar_phrase");
  }
  if (/опалуб/.test(normalized) && hasAnyStem(inputStems, ["фундамент"])) {
    add("foundation_formwork", 132, "real_user_formwork_phrase");
  }
  if (/стяжк/.test(normalized) && hasAnyStem(inputStems, ["пол"])) add("floor_screed", 136, "real_user_floor_screed_phrase");
  if (/наливн/.test(normalized) && hasAnyStem(inputStems, ["пол"])) add("self_leveling_floor", 136, "real_user_self_level_floor_phrase");
  if (/бетонн/.test(normalized) && /подготов/.test(normalized)) add("concrete_floor_slab", 120, "real_user_concrete_preparation_phrase");

  if (/гидроизоляц|мастик|мембран|жидк.*резин/.test(normalized)) {
    if (!/крыш|кровл|течет|ванн|сануз|душев|фундамент|подвал|погреб/.test(normalized)) {
      add("roof_waterproofing", 78, "broad_waterproofing_candidate");
      add("foundation_waterproofing", 76, "broad_waterproofing_candidate");
      add("bathroom_waterproofing", 74, "broad_waterproofing_candidate");
      add("basement_waterproofing", 72, "broad_waterproofing_candidate");
    }
    if (/крыш|кровл|течет/.test(normalized)) add("roof_waterproofing", 145, "real_user_roof_waterproofing_phrase");
    if (/ванн|сануз|душев/.test(normalized)) add("bathroom_waterproofing", 142, "real_user_bathroom_waterproofing_phrase");
    if (/фундамент/.test(normalized)) add("foundation_waterproofing", 142, "real_user_foundation_waterproofing_phrase");
    if (/подвал|погреб/.test(normalized)) add("basement_waterproofing", 142, "real_user_basement_waterproofing_phrase");
  }

  if (/плитк|кафель/.test(normalized) && /ванн|сануз/.test(normalized)) add("bathroom_tile_full", 145, "real_user_bathroom_tile_phrase");
  if (/керамогранит/.test(normalized) && hasAnyStem(inputStems, ["пол"])) add("ceramic_tile_floor_laying", 138, "real_user_floor_tile_phrase");
  if (/кирпич/.test(normalized) && /кладк|стен/.test(normalized)) add("brick_masonry", 140, "real_user_brick_masonry_phrase");
  if (/газоблок|газобетон/.test(normalized) && /кладк|стен/.test(normalized)) add("aerated_block_masonry", 140, "real_user_aerated_block_phrase");
  if (/разобрать|демонтаж|снос/.test(normalized) && /кирпич.*стен|стен.*кирпич/.test(normalized)) add("brick_wall_demolition", 220, "real_user_brick_demolition_phrase");
  if (/демонтаж|снять|разобрать/.test(normalized) && /плитк|кафель/.test(normalized)) add("demolition_tiles", 220, "real_user_tile_demolition_phrase");

  if (/проводк|электропроводк|кабел.*квартир/.test(normalized)) add("electrical_wiring", 142, "real_user_wiring_phrase");
  if (/электрик|электромонтаж/.test(normalized) && !/провод|кабел|розет|щит|автомат|узо|свет|освещ|интернет|слаботоч|видео|домофон/.test(normalized)) {
    add("electrical_wiring", 78, "broad_electrical_candidate");
    add("socket_installation", 76, "broad_electrical_candidate");
    add("distribution_panel_installation", 74, "broad_electrical_candidate");
    add("lighting_installation", 72, "broad_electrical_candidate");
    add("low_voltage_network", 70, "broad_electrical_candidate");
  }
  if (/розетк/.test(normalized)) add("socket_installation", 142, "real_user_socket_phrase");
  if (/щит|электрощит|автомат|узо/.test(normalized)) add("distribution_panel_installation", 142, "real_user_panel_phrase");
  if (/светильник|освещен|точк.*свет/.test(normalized)) add("lighting_installation", 142, "real_user_lighting_phrase");
  if (/интернет|слаботоч|скс|видеонаблюден|домофон/.test(normalized)) add("low_voltage_network", 142, "real_user_low_voltage_phrase");

  if (/водопровод|водоснабжен/.test(normalized)) add("water_pipe_installation", 142, "real_user_water_supply_phrase");
  if (/сантехник/.test(normalized) && !/водопровод|водоснаб|канализац|унитаз|раковин|мойк|душ|смесител|труб|бойлер/.test(normalized)) {
    add("water_pipe_installation", 78, "broad_plumbing_candidate");
    add("sewer_pipe_installation", 76, "broad_plumbing_candidate");
    add("toilet_installation", 74, "broad_plumbing_candidate");
    add("sink_installation", 72, "broad_plumbing_candidate");
  }
  if (/канализац|стояк/.test(normalized)) add("sewer_pipe_installation", 142, "real_user_sewerage_phrase");
  if (/унитаз/.test(normalized)) add("toilet_installation", 142, "real_user_toilet_phrase");
  if (/раковин|мойк/.test(normalized)) add("sink_installation", 142, "real_user_sink_phrase");
  if (/душев.*кабин|душев/.test(normalized)) add("shower_cabin_installation", 132, "real_user_shower_phrase");

  if (/радиатор|батаре/.test(normalized)) add("heating_radiator_installation", 142, "real_user_radiator_phrase");
  if (/тепл.*пол/.test(normalized)) add("water_underfloor_heating", 138, "real_user_underfloor_heating_phrase");
  if (/котел|котёл/.test(normalized)) add("gas_boiler_installation", 130, "real_user_boiler_phrase");
  if (/бойлер|водонагревател/.test(normalized)) add("boiler_installation", 130, "real_user_water_heater_phrase");
  if (/кондиционер/.test(normalized)) add("air_conditioner_installation", 136, "real_user_air_conditioner_phrase");
  if (/вентиляц|вытяжк|воздуховод/.test(normalized)) add("ventilation_installation", 136, "real_user_ventilation_phrase");

  if (/асфальт/.test(normalized)) add("asphalt_paving", 140, "real_user_asphalt_phrase");
  if (/брусчатк|тротуарн.*плит/.test(normalized)) add("paving_stone_laying", 142, "real_user_paving_stone_phrase");
  if (/бордюр/.test(normalized)) add("curb_installation", 138, "real_user_curb_phrase");
  if (/транше/.test(normalized)) add("foundation_excavation", 120, "real_user_trench_phrase");
  if (/котлован/.test(normalized)) add("foundation_excavation", 138, "real_user_pit_phrase");
  if (/вывоз.*мусор|мусор/.test(normalized)) add("debris_removal", 130, "real_user_debris_phrase");

  if (/металлочерепиц/.test(normalized)) add("metal_roofing", 140, "real_user_metal_roof_phrase");
  if (/мягк.*кровл|гибк.*черепиц/.test(normalized)) add("soft_roofing", 140, "real_user_soft_roof_phrase");
  if (/профнастил|профлист/.test(normalized) && /крыш|кровл/.test(normalized)) add("corrugated_roofing", 140, "real_user_corrugated_roof_phrase");
  if (/утеплен/.test(normalized) && /крыш|кровл/.test(normalized)) add("roof_insulation", 140, "real_user_roof_insulation_phrase");
  if (/утеплен/.test(normalized) && /фасад|наружн.*стен/.test(normalized)) add("facade_insulation", 140, "real_user_facade_insulation_phrase");
  if (/фасадн.*панел|панел.*фасад/.test(normalized)) add("facade_thermal_panels", 128, "real_user_facade_panel_phrase");

  if (/штукатур/.test(normalized)) add("wall_plastering", 138, "real_user_plaster_phrase");
  if (/шпаклев|шпатлев/.test(normalized)) add("wall_putty", 138, "real_user_putty_phrase");
  if (/покраск|красить|окрас/.test(normalized) && /стен/.test(normalized)) add("wall_painting", 138, "real_user_wall_paint_phrase");
  if (/покраск|красить|окрас/.test(normalized) && /фасад/.test(normalized)) add("facade_painting", 138, "real_user_facade_paint_phrase");
  if (/обои|обоев/.test(normalized)) add("wallpaper_installation", 138, "real_user_wallpaper_phrase");
  if (/гипсокартон|гкл/.test(normalized) && /перегород/.test(normalized)) add("drywall_partition", 138, "real_user_drywall_partition_phrase");
  if (/армстронг/.test(normalized)) add("suspended_ceiling", 138, "real_user_armstrong_phrase");

  return boosts;
}

function parseFallbackUnit(normalized: string): ParsedNoHintQuantity {
  const parsed = parseWorkOntologyQuantityUnit(normalized);
  const quantity = parsed.quantity ?? Number(normalized.match(/\b(\d+(?:[.,]\d+)?)\b/u)?.[1]?.replace(",", ".") ?? NaN);
  const normalizedQuantity = Number.isFinite(quantity) ? quantity : null;
  if (normalizedQuantity === null) return parsed;
  if (/(?:^|\s)(?:шт|штук|точек|точки|точка|розеток|светильник|камер)(?:\s|$)/u.test(normalized)) return { quantity: normalizedQuantity, unit: "piece" };
  if (/(?:^|\s)(?:куб|м3|м\s*3|кубов|куба)(?:\s|$)/u.test(normalized)) return { quantity: normalizedQuantity, unit: "m3" };
  if (/(?:^|\s)(?:м2|м\s*2|квадрат|кв\.?\s*м|квадратов)(?:\s|$)/u.test(normalized)) return { quantity: normalizedQuantity, unit: "m2" };
  if (/(?:^|\s)(?:метр|метров|пог|п\.?\s*м)(?:\s|$)/u.test(normalized)) return { quantity: normalizedQuantity, unit: "linear_m" };
  if (/(?:^|\s)(?:комплект|комплектов|узел|узлов)(?:\s|$)/u.test(normalized)) return { quantity: normalizedQuantity, unit: "set" };
  if (/(?:^|\s)(?:кг|килограмм|килограммов)(?:\s|$)/u.test(normalized)) return { quantity: normalizedQuantity, unit: "kg" };
  if (/(?:^|\s)(?:тонн|тонна|т)(?:\s|$)/u.test(normalized)) return { quantity: normalizedQuantity, unit: "ton" };
  if (parsed.unit !== null) return { quantity: normalizedQuantity, unit: parsed.unit };
  return { quantity: normalizedQuantity, unit: parsed.unit };
}

export function parseNoHintWorkOntologyQuantityUnit(userInput: string): ParsedNoHintQuantity {
  return parseFallbackUnit(normalizeWorkOntologyText(userInput));
}

function scoreEntry(input: {
  normalized: string;
  inputStems: readonly string[];
  parsed: ParsedNoHintQuantity;
  entry: ConstructionWorkOntologyEntry;
  boosts: readonly RuleBoost[];
}): NoHintCandidate {
  const reasons: string[] = [];
  let score = 0;
  const entryStems = ENTRY_STEMS.get(input.entry.canonical_work_key) ?? [];
  const phraseMatch = (ENTRY_PHRASES.get(input.entry.canonical_work_key) ?? []).find((phrase) =>
    phrase.length >= 4 && input.normalized.includes(phrase)
  );
  if (phraseMatch) {
    score += Math.min(120, 54 + Math.round(phraseMatch.length / 2));
    reasons.push("visible_or_synonym_phrase_match");
  }

  const stemHits = input.inputStems.filter((stem) => hasStem(entryStems, stem));
  if (stemHits.length > 0) {
    score += Math.min(54, stemHits.length * 14);
    reasons.push("ru_stem_overlap");
  }

  const categoryHits = categoryTerms(input.entry.category).filter((term) =>
    input.normalized.includes(normalizeWorkOntologyText(term))
  );
  if (categoryHits.length > 0) {
    score += Math.min(20, categoryHits.length * 5);
    reasons.push("category_term_match");
  }

  const boostScore = input.boosts
    .filter((boost) => boost.key === input.entry.canonical_work_key)
    .reduce((sum, boost) => {
      reasons.push(boost.reason);
      return sum + boost.score;
    }, 0);
  score += boostScore;

  const negativeHit = input.entry.negative_synonyms_ru.find((term) => {
    const negativeStems = tokens(term);
    return negativeStems.length > 0 && hasAllStems(input.inputStems, negativeStems);
  });
  if (negativeHit) {
    score -= 96;
    reasons.push(`negative_synonym:${negativeHit}`);
  }

  if (input.parsed.unit) {
    if (input.entry.expected_units.includes(input.parsed.unit)) {
      score += 18;
      reasons.push("unit_compatible");
    } else {
      score -= 18;
      reasons.push("unit_mismatch");
    }
  }

  score = Math.max(0, score);
  return {
    canonical_work_key: input.entry.canonical_work_key,
    visible_name_ru: input.entry.visible_name_ru,
    category: input.entry.category,
    confidence: roundConfidence(score),
    score,
    reasons: unique(reasons),
  };
}

function candidateEntriesFor(inputStems: readonly string[], boosts: readonly RuleBoost[]): ConstructionWorkOntologyEntry[] {
  const keys = new Set<string>();
  for (const stem of inputStems) {
    for (const key of STEM_INDEX.get(stem) ?? []) keys.add(key);
  }
  for (const boost of boosts) keys.add(boost.key);
  return [...keys]
    .sort()
    .map((key) => CONSTRUCTION_WORK_ONTOLOGY_BY_KEY.get(key))
    .filter((entry): entry is ConstructionWorkOntologyEntry => Boolean(entry));
}

export function rankNoHintWorkOntologyCandidates(userInput: string, maxCandidates = 8): NoHintCandidate[] {
  const normalized = normalizeWorkOntologyText(userInput);
  const inputStems = unique(tokens(normalized));
  const parsed = parseNoHintWorkOntologyQuantityUnit(userInput);
  const boosts = noHintRuleBoosts(normalized, inputStems);

  return candidateEntriesFor(inputStems, boosts)
    .map((entry) => scoreEntry({ normalized, inputStems, parsed, entry, boosts }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.canonical_work_key.localeCompare(right.canonical_work_key);
    })
    .slice(0, maxCandidates);
}
