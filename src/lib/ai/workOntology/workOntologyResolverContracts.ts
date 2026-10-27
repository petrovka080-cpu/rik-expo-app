import {
  CONSTRUCTION_WORK_ONTOLOGY_BY_KEY,
  currencyForCountry,
  normalizeWorkOntologyText,
  pricebookScopeFor,
} from "./constructionWorkOntologyCatalog";
import type { WorkOntologyCountry } from "./constructionWorkOntologyTypes";
import { decideNoHintWorkOntologyAmbiguity } from "./workOntologyAmbiguityPolicy";
import {
  parseNoHintWorkOntologyQuantityUnit,
  rankNoHintWorkOntologyCandidates,
} from "./workOntologyCandidateRanker";
import type { NoHintExpectedStatus, NoHintWorkOntologyResolution } from "./noHintSemanticAuditTypes";

function statusForEntry(workKey: string): NoHintExpectedStatus {
  const entry = CONSTRUCTION_WORK_ONTOLOGY_BY_KEY.get(workKey);
  if (!entry || !entry.supported || entry.support_status === "UNSUPPORTED") return "WORK_NOT_SUPPORTED";
  if (!entry.recipe_scope) return "RECIPE_MISSING";
  if (!entry.material_recipe_scope) return "MATERIAL_RECIPE_MISSING";
  if (!entry.pricebook_scope) return "PRICEBOOK_SCOPE_MISSING";
  return "RESOLVED";
}

function detectCountryRegion(input: {
  userInput: string;
  country?: WorkOntologyCountry;
  region?: string;
}): { country: WorkOntologyCountry; region: string } {
  if (input.country && input.region) return { country: input.country, region: input.region };
  const normalized = normalizeWorkOntologyText(input.userInput);
  if (/алматы|almaty/.test(normalized)) return { country: "KZ", region: "Almaty" };
  if (/москв|moscow/.test(normalized)) return { country: "RU", region: "Moscow" };
  if (/ташкент|tashkent/.test(normalized)) return { country: "UZ", region: "Tashkent" };
  if (/ош(?:\s|$)|osh/.test(normalized)) return { country: "KG", region: "Osh" };
  return { country: input.country ?? "KG", region: input.region ?? "Bishkek" };
}

export function resolveNoHintWorkOntologyIntent(input: {
  userInput: string;
  country?: WorkOntologyCountry;
  region?: string;
}): NoHintWorkOntologyResolution {
  const normalized = normalizeWorkOntologyText(input.userInput);
  const parsed = parseNoHintWorkOntologyQuantityUnit(input.userInput);
  const topCandidates = rankNoHintWorkOntologyCandidates(input.userInput, 8);
  const decision = decideNoHintWorkOntologyAmbiguity({ userInput: input.userInput, candidates: topCandidates });
  const locale = detectCountryRegion(input);

  if (decision.status !== "RESOLVED") {
    return {
      user_input_ru: input.userInput,
      normalized_input: normalized,
      status: decision.status,
      canonical_work_key: null,
      selected_work_key: null,
      visible_name_ru: null,
      category: null,
      quantity: parsed.quantity,
      unit: parsed.unit,
      confidence: 0,
      top_candidates: topCandidates,
      auto_selected: false,
      generic_fallback_used: false,
      first_item_fallback_used: false,
      random_choice_used: false,
      recipe_scope: null,
      material_recipe_scope: null,
      pricebook_scope: null,
      fake_green_claimed: false,
    };
  }

  const top = topCandidates[0];
  const entry = top ? CONSTRUCTION_WORK_ONTOLOGY_BY_KEY.get(top.canonical_work_key) : null;
  if (!top || !entry) {
    return {
      user_input_ru: input.userInput,
      normalized_input: normalized,
      status: "WORK_NOT_SUPPORTED",
      canonical_work_key: null,
      selected_work_key: null,
      visible_name_ru: null,
      category: null,
      quantity: parsed.quantity,
      unit: parsed.unit,
      confidence: 0,
      top_candidates: topCandidates,
      auto_selected: false,
      generic_fallback_used: false,
      first_item_fallback_used: false,
      random_choice_used: false,
      recipe_scope: null,
      material_recipe_scope: null,
      pricebook_scope: null,
      fake_green_claimed: false,
    };
  }

  const supportStatus = statusForEntry(entry.canonical_work_key);
  if (supportStatus !== "RESOLVED") {
    return {
      user_input_ru: input.userInput,
      normalized_input: normalized,
      status: supportStatus,
      canonical_work_key: null,
      selected_work_key: null,
      visible_name_ru: null,
      category: null,
      quantity: parsed.quantity,
      unit: parsed.unit,
      confidence: top.confidence,
      top_candidates: topCandidates,
      auto_selected: false,
      generic_fallback_used: false,
      first_item_fallback_used: false,
      random_choice_used: false,
      recipe_scope: null,
      material_recipe_scope: null,
      pricebook_scope: null,
      fake_green_claimed: false,
    };
  }

  return {
    user_input_ru: input.userInput,
    normalized_input: normalized,
    status: "RESOLVED",
    canonical_work_key: entry.canonical_work_key,
    selected_work_key: entry.canonical_work_key,
    visible_name_ru: entry.visible_name_ru,
    category: entry.category,
    quantity: parsed.quantity,
    unit: parsed.unit ?? entry.default_unit,
    confidence: top.confidence,
    top_candidates: topCandidates,
    auto_selected: true,
    generic_fallback_used: false,
    first_item_fallback_used: false,
    random_choice_used: false,
    recipe_scope: entry.recipe_scope,
    material_recipe_scope: entry.material_recipe_scope,
    pricebook_scope: pricebookScopeFor({
      country: locale.country,
      region: locale.region,
      category: entry.category,
    }),
    fake_green_claimed: false,
  };
}

export function noHintExpectedCurrency(country: WorkOntologyCountry): string {
  return currencyForCountry(country);
}
