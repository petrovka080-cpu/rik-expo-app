import { buildProfessionalEstimateSnapshot } from "./professionalEstimateTestHelpers";

describe("professional estimate carpet row isolation", () => {
  it("does not include masonry, brick, concrete, roofing, plumbing, or electrical rows in carpet estimate", () => {
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: "carpet_laying",
      quantity: 1500,
      unit: "m2",
      region: "KG_BISHKEK",
    });
    const text = snapshot.lines.map((line) => `${line.row_key} ${line.visible_name_ru} ${line.material_key ?? ""}`).join("\n");

    expect(snapshot.group_key).toBe("flooring");
    expect(snapshot.lines.every((line) => line.row_domain === "flooring")).toBe(true);
    expect(text).toMatch(/Ковролин|ковролин/);
    expect(text).toMatch(/Подложка|подложка/);
    expect(text).toMatch(/Клей|клей/);
    expect(text).toMatch(/Плинтус|плинтус/);
    expect(text).not.toMatch(/кирпич|brick|кладоч|masonry|бетон\s*b?\s*25|concrete\s*b?\s*25|арматур|rebar|кабель|cable/i);
  });
});
