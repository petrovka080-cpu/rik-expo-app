import {
  auditEstimateRowDomainGuard,
  buildProfessionalEstimateSnapshot,
} from "../../src/lib/ai/professionalEstimateTemplates";

describe("laminateDoesNotUseMasonryRows", () => {
  it("keeps laminate estimate rows in the flooring domain", () => {
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: "laminate_laying",
      quantity: 120,
      unit: "m2",
      region: "KG_BISHKEK",
    });
    const text = snapshot.lines.map((line) => `${line.row_key} ${line.visible_name_ru} ${line.material_key ?? ""}`).join("\n");
    const guard = auditEstimateRowDomainGuard({
      selected_work_key: snapshot.selected_work_key,
      expected_domain: snapshot.group_key,
      rows: snapshot.lines,
    });

    expect(snapshot.group_key).toBe("flooring");
    expect(guard.cross_domain_row_leaks).toBe(0);
    expect(text).not.toMatch(/brick|masonry|concrete\s*b?\s*25|rebar|foundation/i);
  });
});
