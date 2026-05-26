import {
  EMBEDDED_AI_PROMPTS,
  estimateForEmbeddedAi,
  expectRowsContain,
  presentationForEstimate,
} from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("embedded AI work-specific rows", () => {
  it("renders specific rows for windows, brick, roof, GKL and asphalt", () => {
    expectRowsContain(presentationForEstimate(estimateForEmbeddedAi(EMBEDDED_AI_PROMPTS.windows)), ["оконный блок", "подоконник", "герметизация"]);
    expectRowsContain(presentationForEstimate(estimateForEmbeddedAi(EMBEDDED_AI_PROMPTS.brick)), ["кирпич", "раствор", "кладка"]);
    expectRowsContain(presentationForEstimate(estimateForEmbeddedAi(EMBEDDED_AI_PROMPTS.gableRoof)), ["стропила", "мауэрлат", "кровельное покрытие"]);
    expectRowsContain(presentationForEstimate(estimateForEmbeddedAi(EMBEDDED_AI_PROMPTS.gkl)), ["листы ГКЛ", "направляющий профиль", "обшивка ГКЛ"]);
    expectRowsContain(presentationForEstimate(estimateForEmbeddedAi(EMBEDDED_AI_PROMPTS.asphalt)), ["песчаное основание", "щебеночное основание", "асфальтобетон"]);
  });
});
