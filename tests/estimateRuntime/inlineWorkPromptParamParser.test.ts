import { extractWorkParamsFromInlinePrompt } from "../../src/lib/ai/extractWorkParamsFromInlinePrompt";

describe("inline work prompt parameter parser", () => {
  it("normalizes free-order RU/EN construction parameters", () => {
    expect(extractWorkParamsFromInlinePrompt("1500 кв метров").area_m2?.value).toBe(1500);
    expect(extractWorkParamsFromInlinePrompt("1500 м2").area_m2?.value).toBe(1500);
    expect(extractWorkParamsFromInlinePrompt("5 км").length_m?.value).toBe(5000);
    expect(extractWorkParamsFromInlinePrompt("22 см").depth_mm?.value).toBe(220);
    expect(extractWorkParamsFromInlinePrompt("толщина 1 метр").thickness_m?.value).toBe(1);
    expect(extractWorkParamsFromInlinePrompt("линия 3 км").line_length_m?.value).toBe(3000);
    expect(extractWorkParamsFromInlinePrompt("25 кубов").volume_m3?.value).toBe(25);
    expect(extractWorkParamsFromInlinePrompt("d132").diameter_mm?.value).toBe(132);
    expect(extractWorkParamsFromInlinePrompt("4х50").cable_section?.value).toBe("4x50");
  });

  it("derives gabion wall volume from user-provided dimensions", () => {
    const params = extractWorkParamsFromInlinePrompt("габион стена длина 150 метров высота 30 метров толщина 1 метр");

    expect(params.length_m?.value).toBe(150);
    expect(params.height_m?.value).toBe(30);
    expect(params.thickness_m?.value).toBe(1);
    expect(params.volume_m3?.value).toBe(4500);
  });
});
