import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { buildNormPackCitationsForRows } from "../../src/lib/estimate/normPackCitationContract";
import { validateNormPackCitations } from "../../src/lib/estimate/validateNormPackCitations";

describe("norm pack citation contract", () => {
  it("attaches citation, source quality, formula provenance, and quantity trace to BOQ rows", () => {
    const passport = buildProfessionalWorkPassport("tile_stone_interior_ceramic_tile_lay_standard_professional_expanded_v1");
    expect(passport).not.toBeNull();
    const rows = passport?.boqRecipe.allRows ?? [];
    const citations = buildNormPackCitationsForRows(rows);
    const summary = validateNormPackCitations(rows);

    expect(rows.length).toBeGreaterThanOrEqual(45);
    expect(citations).toHaveLength(rows.length);
    expect(citations.every((citation) => citation.sourceCitation.includes("normSourceId="))).toBe(true);
    expect(citations.every((citation) => citation.sourceQuality)).toBe(true);
    expect(citations.every((citation) => citation.sourceVerificationStatus)).toBe(true);
    expect(citations.every((citation) => citation.formulaProvenance)).toBe(true);
    expect(citations.every((citation) => citation.quantityTrace.includes("result="))).toBe(true);
    expect(summary.citation_contract_passed).toBe(true);
    expect(summary.unverified_sources_used_as_trusted_count).toBe(0);
  });
});
