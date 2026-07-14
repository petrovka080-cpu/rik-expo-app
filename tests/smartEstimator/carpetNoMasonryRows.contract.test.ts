import { carpetEstimate } from "./smartEstimatorTestHelpers";

describe("smart estimator carpet masonry isolation", () => {
  it("does not put masonry rows into carpet estimates", () => {
    const text = carpetEstimate().snapshot?.professional_snapshot.lines
      .map((line) => `${line.visible_name_ru} ${line.material_key ?? ""}`)
      .join("\n") ?? "";
    expect(/masonry|brick|Concrete B25|Rebar A500C/i.test(text)).toBe(false);
  });
});
