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

  it("extracts labelled road dimensions when the value precedes the Russian label", () => {
    const params = extractWorkParamsFromInlinePrompt(
      "Асфальтобетонное покрытие 2000 метров длина и 32 метра ширина",
    );

    expect(params.length_m).toMatchObject({ value: 2000, canonicalUnit: "m" });
    expect(params.width_m).toMatchObject({ value: 32, canonicalUnit: "m" });
  });

  it.each([
    ["длина 2000 м, ширина 32 м", 2000, 32],
    ["2000 метров длина и 32 метра ширина", 2000, 32],
    ["длиной 2000 м, шириной 32 м", 2000, 32],
    ["32 м ширина, 2000 м длина", 2000, 32],
    ["2 км длиной и 32 м шириной", 2000, 32],
    ["5400 метров длина и 15 метров ширина", 5400, 15],
  ])("parses labelled road geometry: %s", (dimensions, length, width) => {
    const params = extractWorkParamsFromInlinePrompt(`асфальтобетонное покрытие ${dimensions}`);

    expect(params.length_m).toMatchObject({ value: length, canonicalUnit: "m" });
    expect(params.width_m).toMatchObject({ value: width, canonicalUnit: "m" });
    expect(params.area_m2).toMatchObject({
      value: length * width,
      canonicalUnit: "m2",
      sourceText: "length_m * width_m",
    });
  });

  it.each([
    ["асфальтобетонное покрытие 2000 × 32", 2000, 32],
    ["дорога 2000x32", 2000, 32],
    ["площадка 2000 на 32 метров", 2000, 32],
    ["асфальт 2,5 км x 32 м", 2500, 32],
  ])("parses an explicit dimension pair only in plan geometry context: %s", (prompt, length, width) => {
    const params = extractWorkParamsFromInlinePrompt(prompt);

    expect(params.length_m?.value).toBe(length);
    expect(params.width_m?.value).toBe(width);
    expect(params.area_m2?.value).toBe(length * width);
    expect(params.cable_section).toBeUndefined();
  });

  it("does not promote unrelated or negative numbers into road dimensions", () => {
    const unrelated = extractWorkParamsFromInlinePrompt("смета № 2000, цена 32 сом");
    const negative = extractWorkParamsFromInlinePrompt("асфальт длина -2000 м, ширина -32 м");
    const cable = extractWorkParamsFromInlinePrompt("кабель 4x50");

    expect(unrelated.length_m).toBeUndefined();
    expect(unrelated.width_m).toBeUndefined();
    expect(negative.length_m).toBeUndefined();
    expect(negative.width_m).toBeUndefined();
    expect(cable.cable_section?.value).toBe("4x50");
  });

  it("rejects zero geometry and flags implausible road dimensions for confirmation", () => {
    const zero = extractWorkParamsFromInlinePrompt("асфальт длина 0 м, ширина 0 м");
    const implausible = extractWorkParamsFromInlinePrompt("асфальт длина 2000 м, ширина 500 м");

    expect(zero.length_m).toBeUndefined();
    expect(zero.width_m).toBeUndefined();
    expect(zero.area_m2).toBeUndefined();
    expect(implausible.length_m?.requiresConfirmation).not.toBe(true);
    expect(implausible.width_m?.requiresConfirmation).toBe(true);
    expect(implausible.area_m2?.value).toBe(1_000_000);
  });

  it("does not silently accept an explicit area that contradicts length × width", () => {
    const conflicting = extractWorkParamsFromInlinePrompt(
      "асфальт площадь 128000 м2, длина 2000 м, ширина 32 м",
    );
    const consistent = extractWorkParamsFromInlinePrompt(
      "асфальт площадь 64000 м2, длина 2000 м, ширина 32 м",
    );

    expect(conflicting.area_m2).toMatchObject({ value: 128000, requiresConfirmation: true });
    expect(conflicting.length_m?.requiresConfirmation).toBe(true);
    expect(conflicting.width_m?.requiresConfirmation).toBe(true);
    expect(consistent.area_m2).toMatchObject({ value: 64000 });
    expect(consistent.area_m2?.requiresConfirmation).not.toBe(true);
  });
});
