import { estimateFor, pdfFor, presentationFor, REQUEST_LINOLEUM_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";
import { extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";

describe("live estimate PDF row parity", () => {
  it("keeps UI rows and PDF rows from the same structured estimate", () => {
    const estimate = estimateFor("/request", REQUEST_LINOLEUM_PROMPT);
    const ui = presentationFor(estimate);
    const pdf = pdfFor(estimate);
    for (const row of ui.rows.slice(0, 8)) {
      expect(pdf.text).toContain(row.name);
    }
  });

  it("keeps foundation waterproofing warning labels identical in UI and extracted PDF text", () => {
    const estimate = estimateFor(
      "/request",
      "смета на гидроизоляция фундамента 48 метров в Оше, зона работ узлы примыкания, условие новое строительство, детализация этапа stage_aw, доступ доступ с улицы, пакет работ 803",
    );
    expect(estimate.work.workKey).toBe("foundation_waterproofing");

    const ui = presentationFor(estimate);
    const pdf = pdfFor(estimate);
    const text = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey }).text;
    const uiText = ui.rows.map((row) => row.name).join("\n");

    for (const row of ui.rows) {
      expect(text).toContain(row.name);
    }
    expect(uiText).not.toMatch(/\bwarning\b/i);
    expect(text).not.toMatch(/\bwarning\b/i);
    expect(uiText).not.toContain("кровельная гидроизоляция");
    expect(text).not.toContain("кровельная гидроизоляция");
  });
});
