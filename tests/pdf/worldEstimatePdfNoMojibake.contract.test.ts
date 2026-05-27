import {
  buildAiEstimatePdfSourceFromGlobalEstimate,
  generateAiEstimatePdf,
} from "../../src/lib/ai/estimatePdf";
import { validateEstimatePdf } from "../../src/lib/estimatePdf";
import { buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate PDF mojibake guard", () => {
  it("does not emit mojibake or unsafe placeholders", () => {
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.hydroTurbine);
    const source = buildAiEstimatePdfSourceFromGlobalEstimate(estimate);
    const pdf = generateAiEstimatePdf({ source, userConfirmed: true });
    const validation = validateEstimatePdf({ pdf: pdf.access.uri, knownWorkKey: estimate.work.workKey });

    expect(validation.valid).toBe(true);
    expect(validation.text).not.toMatch(/Ð|Ñ|�|undefined|\[object Object\]|NaN|null null/);
  });
});
