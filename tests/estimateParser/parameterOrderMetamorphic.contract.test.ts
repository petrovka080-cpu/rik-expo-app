import { parseWorkSpecificParameters } from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("estimate parameter parser metamorphic order", () => {
  it("extracts fence parameters regardless of word order", () => {
    const first = parseWorkSpecificParameters("забор 50 м высота 2 м шаг 2.5 профлист");
    const second = parseWorkSpecificParameters("профлист высота 2м забор длина 50м шаг столбов 2.5м");

    expect(first.work_type).toBe("profile_sheet_fence");
    expect(second.work_type).toBe("profile_sheet_fence");
    expect(second.extracted_parameters.fence_length_m).toBe(first.extracted_parameters.fence_length_m);
    expect(second.extracted_parameters.fence_height_m).toBe(first.extracted_parameters.fence_height_m);
    expect(second.extracted_parameters.post_spacing_m).toBe(first.extracted_parameters.post_spacing_m);
  });

  it("extracts diamond drilling parameters regardless of word order", () => {
    const first = parseWorkSpecificParameters("алмазное бурение d110 12 отверстий 250 мм железобетон");
    const second = parseWorkSpecificParameters("12 отверстий железобетон 250мм алмазное бурение диаметр 110");

    expect(first.work_type).toBe("diamond_concrete_drilling");
    expect(second.work_type).toBe("diamond_concrete_drilling");
    expect(second.extracted_parameters.holes_count).toBe(first.extracted_parameters.holes_count);
    expect(second.extracted_parameters.diameter_mm).toBe(first.extracted_parameters.diameter_mm);
    expect(second.extracted_parameters.drilling_depth_mm).toBe(first.extracted_parameters.drilling_depth_mm);
    expect(second.extracted_parameters.material).toBe(first.extracted_parameters.material);
  });

  it("extracts mansard roof parameters when material order changes", () => {
    const parsed = parseWorkSpecificParameters("мансардная крыша металлочерепица 200м2 угол 35 утепление 200");

    expect(parsed.work_type).toBe("mansard_roof");
    expect(parsed.extracted_parameters.roof_area_m2).toBe(200);
    expect(parsed.extracted_parameters.slope_angle_deg).toBe(35);
    expect(parsed.extracted_parameters.insulation_thickness_mm).toBe(200);
    expect(parsed.extracted_parameters.covering_material).toBe("metal_tile");
  });
});
