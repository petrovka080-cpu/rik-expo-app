import { expectProfessionalEstimate, estimateForWorkKey } from "./boqDepthTestHelpers";

describe("masonry BOQ depth", () => {
  it("keeps brick masonry technologically complete with exact resources and height access", () => {
    const estimate = estimateForWorkKey("brick_masonry", 74, "sq_m");
    const rows = estimate.sections.flatMap((section) => section.rows);
    const byCode = new Map(rows.map((row) => [row.code, row]));

    expectProfessionalEstimate(estimate);
    expect(byCode.get("brick_masonry_brick")).toMatchObject({
      quantity: 4070,
      unit: "pcs",
      quantityFormula: "area * 55",
      includedInProcurement: true,
    });
    expect(byCode.get("brick_masonry_mortar")).toMatchObject({ unit: "m3", quantityFormula: "area * 0.025" });
    expect(byCode.get("brick_masonry_mesh")).toMatchObject({ unit: "sq_m", quantityFormula: "area * 0.2" });
    expect(byCode.get("brick_masonry_flexible_ties")).toMatchObject({ unit: "pcs", quantityFormula: "area * 5" });
    expect(byCode.get("brick_masonry_mobile_scaffold")?.name).toContain("Передвижная алюминиевая вышка-тура");
    expect(byCode.get("brick_masonry_access_scaffold")?.name).toContain("Сборка, проверка, перестановка и разборка");
    expect(byCode.get("brick_masonry_mortar_mixer")?.name).toContain("Растворосмеситель");
    expect(byCode.get("brick_masonry_cutting_tool")?.name).toMatch(/Камнерезный станок|дисковая пила/iu);
    expect(byCode.get("brick_masonry_scaffold_delivery_return")?.name).toContain("возврат передвижной алюминиевой вышки-туры");
    expect(
      estimate.sections
        .filter((section) => section.type !== "labor")
        .flatMap((section) => section.rows)
        .every((row) => row.includedInProcurement),
    ).toBe(true);
    expect(rows.some((row) => row.code.startsWith("professional_wbs_") || /extra|assurance|padding/i.test(row.code))).toBe(false);
  });
});
