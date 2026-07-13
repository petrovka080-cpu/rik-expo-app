import { parseWorkSpecificParameters } from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("P1/P2 parameter order metamorphic parser", () => {
  it("keeps fence length, height and spacing stable when order changes", () => {
    const first = parseWorkSpecificParameters("забор 50 м высота 2 м шаг 2.5 профлист");
    const second = parseWorkSpecificParameters("профлист высота 2м забор длина 50м шаг столбов 2.5м");

    expect(second.extracted_parameters.fence_length_m).toBe(first.extracted_parameters.fence_length_m);
    expect(second.extracted_parameters.fence_height_m).toBe(first.extracted_parameters.fence_height_m);
    expect(second.extracted_parameters.post_spacing_m).toBe(first.extracted_parameters.post_spacing_m);
  });

  it("keeps drilling diameter and depth distinct when order changes", () => {
    const first = parseWorkSpecificParameters("алмазное бурение d110 12 отверстий 250 мм железобетон");
    const second = parseWorkSpecificParameters("12 отверстий железобетон 250мм алмазное бурение диаметр 110");

    expect(second.extracted_parameters.holes_count).toBe(first.extracted_parameters.holes_count);
    expect(second.extracted_parameters.diameter_mm).toBe(110);
    expect(second.extracted_parameters.drilling_depth_mm).toBe(250);
  });

  it("extracts P1/P2 material and layer parameters", () => {
    expect(parseWorkSpecificParameters("штукатурка 300м2 слой 20мм").extracted_parameters).toMatchObject({
      area_m2: 300,
      thickness_mm: 20,
    });
    expect(parseWorkSpecificParameters("плитка 45м2 размер 600х600").extracted_parameters.area_m2).toBe(45);
    expect(parseWorkSpecificParameters("фасад утепление 150м2 минвата 100мм").extracted_parameters).toMatchObject({
      area_m2: 150,
      insulation_thickness_mm: 100,
      material: "mineral_wool",
    });
  });
});
