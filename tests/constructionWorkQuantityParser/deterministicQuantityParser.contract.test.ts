import fs from "node:fs";
import path from "node:path";

import {
  parseUniversalConstructionQuantities,
  validateQuantityInputs,
} from "../../src/lib/ai/constructionFormulas";

describe("construction work deterministic quantity parser", () => {
  it("normalizes area, length, volume, count, mass and power without external lookups", () => {
    expect(parseUniversalConstructionQuantities("estimate asphalt pavement 125 sq_m")).toMatchObject({
      areaM2: 125,
      primaryQuantity: 125,
      primaryUnit: "sq_m",
      source: "user_prompt",
    });
    expect(parseUniversalConstructionQuantities("drainage trench 42 linear_m")).toMatchObject({
      lengthM: 42,
      primaryQuantity: 42,
      primaryUnit: "linear_m",
    });
    expect(parseUniversalConstructionQuantities("concrete foundation 12.5 m3")).toMatchObject({
      volumeM3: 12.5,
      primaryQuantity: 12.5,
      primaryUnit: "m3",
    });
    expect(parseUniversalConstructionQuantities("install 16 pcs anchors")).toMatchObject({
      count: 16,
      primaryQuantity: 16,
      primaryUnit: "pcs",
    });
    expect(parseUniversalConstructionQuantities("rebar 750 kg")).toMatchObject({
      massKg: 750,
      primaryQuantity: 750,
      primaryUnit: "kg",
    });
    expect(parseUniversalConstructionQuantities("solar station 30 kw")).toMatchObject({
      powerKw: 30,
      primaryQuantity: 30,
      primaryUnit: "kw",
    });
  });

  it("keeps decimal comma and dimension parsing deterministic", () => {
    expect(parseUniversalConstructionQuantities("0,4x0,5x5 m 10 pcs")).toMatchObject({
      widthM: 0.4,
      lengthM: 0.5,
      heightM: 5,
      count: 10,
      rawDimensions: ["0.4x0.5x5"],
      primaryQuantity: 0.5,
      primaryUnit: "linear_m",
    });
    expect(parseUniversalConstructionQuantities("slab 6 x 4 m")).toMatchObject({
      widthM: 6,
      lengthM: 4,
      rawDimensions: ["6 x 4"],
      primaryQuantity: 4,
      primaryUnit: "linear_m",
    });
  });

  it("supports real Cyrillic unit spellings without writing non-ASCII source text", () => {
    const areaPrompt = "\u0441\u043c\u0435\u0442\u0430 87 \u043a\u0432 \u043c";
    const volumePrompt = "\u0431\u0435\u0442\u043e\u043d 9 \u043c\u00b3";
    const lengthPrompt = "\u0442\u0440\u0443\u0431\u0430 24 \u043c\u0435\u0442\u0440\u0430";
    const massPrompt = "\u0430\u0440\u043c\u0430\u0442\u0443\u0440\u0430 320 \u043a\u0433";

    expect(parseUniversalConstructionQuantities(areaPrompt)).toMatchObject({ areaM2: 87, primaryUnit: "sq_m" });
    expect(parseUniversalConstructionQuantities(volumePrompt)).toMatchObject({ volumeM3: 9, primaryUnit: "m3" });
    expect(parseUniversalConstructionQuantities(lengthPrompt)).toMatchObject({ lengthM: 24, primaryUnit: "linear_m" });
    expect(parseUniversalConstructionQuantities(massPrompt)).toMatchObject({ massKg: 320, primaryUnit: "kg" });
  });

  it("does not fake a quantity for prompts without measurable input", () => {
    const parsed = parseUniversalConstructionQuantities("estimate renovation without quantities");

    expect(parsed).toMatchObject({
      source: "missing",
      rawDimensions: [],
    });
    expect(parsed.primaryQuantity).toBeUndefined();
    expect(parsed.primaryUnit).toBeUndefined();
    expect(validateQuantityInputs(parsed)).toEqual({ passed: true, failures: [] });
  });

  it("stays a local parser without catalog, UI, PDF, LLM or network dependencies", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "ai", "constructionFormulas", "constructionFormulaRegistry.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/openai|anthropic|embedding|opensearch|llm/i);
    expect(source).not.toMatch(/from\s+["'][^"']*(catalog|liveUi|pdf)/i);
    expect(source).not.toMatch(/\bfetch\s*\(|supabase|from\s*\(/i);
  });
});
