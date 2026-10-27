import { resolveProfessionalWorkTemplate } from "../professionalEstimateTemplates";
import { resolveConstructionWorkOntologyIntent } from "../workOntology/constructionWorkOntologyMatcher";
import { resolveNoHintWorkOntologyIntent } from "../workOntology/workOntologyResolverContracts";
import type {
  ProfessionalGroupKey,
  ProfessionalRegion,
} from "../professionalEstimateTemplates";
import type { WorkOntologyCountry } from "../workOntology/constructionWorkOntologyTypes";
import type {
  SmartEstimatorAnalyzedInput,
  SmartEstimatorCandidate,
  SmartEstimatorWorkResolution,
} from "./smartEstimatorTypes";

function noHintRegion(region: ProfessionalRegion | null): { country?: WorkOntologyCountry; region?: string } {
  if (region === "KZ_ALMATY") return { country: "KZ", region: "Almaty" };
  if (region === "KZ_ASTANA") return { country: "KZ", region: "Astana" };
  if (region === "RU_DEFAULT") return { country: "RU", region: "Moscow" };
  if (region === "UZ_TASHKENT") return { country: "UZ", region: "Tashkent" };
  if (region === "KG_OSH") return { country: "KG", region: "Osh" };
  if (region === "KG_BISHKEK") return { country: "KG", region: "Bishkek" };
  return {};
}

function templateGroup(selectedWorkKey: string | null): ProfessionalGroupKey | null {
  if (!selectedWorkKey) return null;
  return resolveProfessionalWorkTemplate(selectedWorkKey)?.group_key ?? null;
}

function candidateFrom(value: {
  canonical_work_key: string;
  visible_name_ru: string;
  category: string;
  confidence: number;
  score: number;
  reasons: string[];
}): SmartEstimatorCandidate {
  return {
    canonical_work_key: value.canonical_work_key,
    visible_name_ru: value.visible_name_ru,
    category: value.category as SmartEstimatorCandidate["category"],
    confidence: value.confidence,
    score: value.score,
    reasons: value.reasons,
  };
}

function resolvedFromSelectedKey(selectedWorkKey: string): SmartEstimatorWorkResolution {
  const template = resolveProfessionalWorkTemplate(selectedWorkKey);
  if (!template?.supported) {
    return {
      status: "WORK_NOT_SUPPORTED",
      selected_work_key: null,
      visible_work_name_ru: null,
      group_key: null,
      confidence: 0,
      candidates: [],
      resolver_used: "selected_work_key",
      fake_green_claimed: false,
    };
  }
  return {
    status: "RESOLVED",
    selected_work_key: selectedWorkKey,
    visible_work_name_ru: template.visible_work_name_ru,
    group_key: template.group_key,
    confidence: 1,
    candidates: [],
    resolver_used: "selected_work_key",
    fake_green_claimed: false,
  };
}

function strictCarpetOverride(analysis: SmartEstimatorAnalyzedInput): SmartEstimatorWorkResolution | null {
  const strict = resolveConstructionWorkOntologyIntent(analysis.user_input);
  if (
    strict.ambiguity_status !== "RESOLVED" ||
    strict.selected_work_key !== "carpet_laying" ||
    !/ковролин|ковров|carpet/u.test(analysis.normalized_input)
  ) {
    return null;
  }
  const template = resolveProfessionalWorkTemplate("carpet_laying");
  if (!template?.supported) return null;
  return {
    status: "RESOLVED",
    selected_work_key: "carpet_laying",
    visible_work_name_ru: strict.visible_work_name_ru ?? template.visible_work_name_ru,
    group_key: template.group_key,
    confidence: strict.confidence,
    candidates: strict.candidates.map(candidateFrom).slice(0, 8),
    resolver_used: "strict_carpet_object_override",
    fake_green_claimed: false,
  };
}

function carpetCoveringPhraseOverride(
  analysis: SmartEstimatorAnalyzedInput,
  candidates: SmartEstimatorCandidate[],
): SmartEstimatorWorkResolution | null {
  if (!/ковров.{0,24}покрыт|рулонн.{0,24}покрыт/u.test(analysis.normalized_input)) return null;
  if (/плитк/u.test(analysis.normalized_input)) return null;
  const template = resolveProfessionalWorkTemplate("carpet_laying");
  if (!template?.supported) return null;
  return {
    status: "RESOLVED",
    selected_work_key: "carpet_laying",
    visible_work_name_ru: template.visible_work_name_ru,
    group_key: template.group_key,
    confidence: 0.92,
    candidates,
    resolver_used: "strict_carpet_object_override",
    fake_green_claimed: false,
  };
}

export function resolveSmartEstimatorWork(
  analysis: SmartEstimatorAnalyzedInput,
): SmartEstimatorWorkResolution {
  if (analysis.selected_work_key) return resolvedFromSelectedKey(analysis.selected_work_key);

  const noHint = resolveNoHintWorkOntologyIntent({
    userInput: analysis.user_input,
    ...noHintRegion(analysis.region),
  });
  const noHintCandidates = noHint.top_candidates.map(candidateFrom).slice(0, 8);
  if (noHint.status === "RESOLVED" && noHint.selected_work_key && resolveProfessionalWorkTemplate(noHint.selected_work_key)?.supported) {
    return {
      status: "RESOLVED",
      selected_work_key: noHint.selected_work_key,
      visible_work_name_ru: noHint.visible_name_ru,
      group_key: templateGroup(noHint.selected_work_key),
      confidence: noHint.confidence,
      candidates: noHintCandidates,
      resolver_used: "no_hint_ontology",
      fake_green_claimed: false,
    };
  }

  const carpetCovering = carpetCoveringPhraseOverride(analysis, noHintCandidates);
  if (carpetCovering) return carpetCovering;

  const carpet = strictCarpetOverride(analysis);
  if (carpet) return carpet;

  return {
    status: noHint.status === "WORK_NOT_SUPPORTED" ? "WORK_NOT_SUPPORTED" : "AMBIGUOUS_WORK_INPUT",
    selected_work_key: null,
    visible_work_name_ru: null,
    group_key: null,
    confidence: noHint.confidence,
    candidates: noHintCandidates,
    resolver_used: "no_hint_ontology",
    fake_green_claimed: false,
  };
}
