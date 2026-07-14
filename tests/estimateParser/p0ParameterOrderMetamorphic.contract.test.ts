import { parseWorkSpecificParameters } from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("P0 parameter order metamorphic parser", () => {
  it("does not swap drilling count, diameter, and depth when word order changes", () => {
    const first = parseWorkSpecificParameters("алмазное бурение d110 12 отверстий 250 мм железобетон");
    const second = parseWorkSpecificParameters("12 отверстий железобетон 250мм алмазное бурение диаметр 110");

    expect(second.work_type).toBe("diamond_concrete_drilling");
    expect(second.extracted_parameters.holes_count).toBe(first.extracted_parameters.holes_count);
    expect(second.extracted_parameters.diameter_mm).toBe(first.extracted_parameters.diameter_mm);
    expect(second.extracted_parameters.drilling_depth_mm).toBe(first.extracted_parameters.drilling_depth_mm);
  });

  it("does not swap fence length, height, and post spacing", () => {
    const first = parseWorkSpecificParameters("забор 50 м высота 2 м шаг 2.5 профлист");
    const second = parseWorkSpecificParameters("профлист высота 2м забор длина 50м шаг столбов 2.5м");

    expect(second.work_type).toBe("profile_sheet_fence");
    expect(second.extracted_parameters.fence_length_m).toBe(first.extracted_parameters.fence_length_m);
    expect(second.extracted_parameters.fence_height_m).toBe(first.extracted_parameters.fence_height_m);
    expect(second.extracted_parameters.post_spacing_m).toBe(first.extracted_parameters.post_spacing_m);
  });
});
