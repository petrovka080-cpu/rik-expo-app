import {
  getAiExternalKnowledgeTrustWeight,
  type AiExternalKnowledgeSourceRef,
} from "./aiExternalKnowledgeSourceTypes";

export type AiExternalSourceRank = {
  sourceRefId: string;
  trustScore: number;
  reasonsRu: string[];
  penaltiesRu: string[];
  finalConfidence: "high" | "medium" | "low";
  allowedFor:
    | "official_reference"
    | "market_reference"
    | "draft_estimate"
    | "technology_reference"
    | "accounting_review"
    | "not_allowed";
};

function allowedFor(source: AiExternalKnowledgeSourceRef): AiExternalSourceRank["allowedFor"] {
  if (source.sourceType === "unknown") return "not_allowed";
  if (source.sourceType === "general_knowledge") return "draft_estimate";
  if (source.topic === "accounting" || source.topic === "tax" || source.topic === "finance") return "accounting_review";
  if (source.topic === "market_price" || source.topic === "supplier_search") return "market_reference";
  if (source.sourceType.startsWith("official_")) return "official_reference";
  if (source.topic === "construction_technology" || source.topic === "construction_norm") return "technology_reference";
  return "draft_estimate";
}

export function rankAiExternalSource(source: AiExternalKnowledgeSourceRef): AiExternalSourceRank {
  const reasonsRu: string[] = [];
  const penaltiesRu: string[] = [];
  let trustScore = getAiExternalKnowledgeTrustWeight(source.sourceType) * 10;

  if (source.url) reasonsRu.push("есть URL");
  else if (source.origin !== "general_knowledge") {
    penaltiesRu.push("нет URL");
    trustScore -= 20;
  }

  if (source.checkedAt) reasonsRu.push("есть дата проверки");
  else {
    penaltiesRu.push("нет checkedAt");
    trustScore -= 25;
  }

  if (source.sourceType.startsWith("official_") || source.sourceType === "official_regulation") {
    reasonsRu.push("официальный источник");
    trustScore += 15;
  }

  if ((source.topic === "accounting" || source.topic === "tax") && !source.countryCode) {
    penaltiesRu.push("нет страны учета");
    trustScore -= 15;
  }

  if (source.sourceType === "general_knowledge") {
    penaltiesRu.push("общие знания допустимы только как черновик");
    trustScore = Math.min(trustScore, 35);
  }

  if (source.sourceType === "controlled_external_source" && source.origin === "public_web") {
    penaltiesRu.push("controlled source нельзя показывать как live public_web");
    trustScore = 0;
  }

  const finalConfidence: AiExternalSourceRank["finalConfidence"] =
    trustScore >= 80 ? "high" : trustScore >= 45 ? "medium" : "low";

  return {
    sourceRefId: source.id,
    trustScore: Math.max(0, trustScore),
    reasonsRu,
    penaltiesRu,
    finalConfidence,
    allowedFor: trustScore <= 0 ? "not_allowed" : allowedFor(source),
  };
}

export function rankAiExternalSources(
  sources: AiExternalKnowledgeSourceRef[],
): AiExternalSourceRank[] {
  return sources
    .map(rankAiExternalSource)
    .sort((a, b) => b.trustScore - a.trustScore);
}
