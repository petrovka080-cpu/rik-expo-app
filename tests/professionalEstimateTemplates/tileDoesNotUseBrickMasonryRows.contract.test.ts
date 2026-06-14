import {
  auditEstimateRowDomainGuard,
  buildProfessionalEstimateSnapshot,
} from "../../src/lib/ai/professionalEstimateTemplates";

describe("tileDoesNotUseBrickMasonryRows", () => {
  it("keeps tile estimate rows out of brick masonry templates", () => {
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: "ceramic_tile_floor_laying",
      quantity: 90,
      unit: "m2",
      region: "KG_BISHKEK",
    });
    const text = snapshot.lines.map((line) => `${line.row_key} ${line.visible_name_ru} ${line.material_key ?? ""}`).join("\n");
    const guard = auditEstimateRowDomainGuard({
      selected_work_key: snapshot.selected_work_key,
      expected_domain: snapshot.group_key,
      rows: snapshot.lines,
    });

    expect(snapshot.group_key).toBe("tile_stone");
    expect(guard.cross_domain_row_leaks).toBe(0);
    expect(text).not.toMatch(/brick_masonry|block_masonry|masonry_mortar|brick|masonry/i);
  });
});
