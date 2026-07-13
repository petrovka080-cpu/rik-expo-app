import {
  buildNormPackCitationsForRows,
  type NormPackCitation,
} from "../../lib/estimate/normPackCitationContract";
import type {
  ProfessionalBoqRecipeRow,
  ProfessionalWorkPassport,
} from "../../lib/estimate/workPassportContract";

export type EstimateSourcesPdfSection = {
  title: "Assumptions and sources";
  rows: {
    source_id: string;
    source_quality: string;
    verification_status: string;
    citation: string;
    preliminary_disclosure_required: boolean;
  }[];
  assumptions: string[];
  missing_price_policy: string;
};

function uniqueCitations(citations: readonly NormPackCitation[]): NormPackCitation[] {
  const unique = new Map<string, NormPackCitation>();
  for (const citation of citations) {
    if (!unique.has(citation.registrySourceId)) unique.set(citation.registrySourceId, citation);
  }
  return [...unique.values()].sort((left, right) => left.registrySourceId.localeCompare(right.registrySourceId));
}

export function renderEstimateSourcesSection(input: {
  passport?: ProfessionalWorkPassport;
  rows?: readonly ProfessionalBoqRecipeRow[];
  assumptions?: readonly string[];
}): EstimateSourcesPdfSection {
  const rows = input.rows ?? input.passport?.boqRecipe.allRows ?? [];
  const citations = uniqueCitations(buildNormPackCitationsForRows(rows));
  return {
    title: "Assumptions and sources",
    rows: citations.map((citation) => ({
      source_id: citation.registrySourceId,
      source_quality: citation.sourceQuality,
      verification_status: citation.sourceVerificationStatus,
      citation: citation.sourceCitation,
      preliminary_disclosure_required: citation.preliminaryDisclosureRequired,
    })),
    assumptions: [
      ...(input.assumptions ?? []),
      "Quantities retain formula provenance and source citation for every BOQ row.",
      "Rows with missing prices stay quantity-only until a pricebook, catalog, or supplier source is selected.",
    ],
    missing_price_policy: "missing_price_policy_quantity_only_2026_07",
  };
}
