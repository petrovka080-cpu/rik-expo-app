import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildEstimatePresentationViewModel, validateNoMojibakeInEstimateViewModel } from "../../src/lib/ai/estimatePresentation";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";

const greenCases = [
  "смета на планировку и устройство кольцевого дренажа 1 колодец",
  "смета на пусконаладку теплицы 20 га",
  "смета на усиление сварки металлокаркаса 12 узлов",
  "смета на проектирование и монтаж серверной комнаты 12 стоек",
  "смета на замену автоматических дверей 8 створок",
  "смета на демонтаж и монтаж утепления мансарды 1 лестница",
  "смета на устройство гидроизоляции шва 150 м.п.",
  "смета на гидроизоляция мокрой стены 3 объект; тип работ: плесень влага ремедиация",
  "смета на мачта связи 1 объект; тип работ: объекты связи мачты",
];

describe("exact prompt pack runtime regressions", () => {
  it.each(greenCases)("keeps exact-pack blocker prompt green: %s", (text) => {
    const outcome = resolveEstimatorOutcome({ text, currency: "KGS" });
    expect(outcome.failures).toEqual([]);
    expect(outcome.plan).toBeTruthy();

    const answer = answerBuiltInAi({
      text,
      route: "/ai?context=foreman",
      screenContext: "foreman",
      role: "foreman",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    expect(answer.route.intent).toBe("estimate");
    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(answer.toolResult.fallbackUsed).toBeUndefined();
    expect(answer.toolResult.estimate).toBeTruthy();

    const viewModel = buildEstimatePresentationViewModel(answer.toolResult.estimate!);
    expect(viewModel.rows.length).toBeGreaterThanOrEqual(8);
    expect(validateNoMojibakeInEstimateViewModel(viewModel).passed).toBe(true);
  });

  it("still asks for disambiguation on generic waterproofing without an object", () => {
    const answer = answerBuiltInAi({
      text: "гидроизоляция 100 кв м",
      route: "/request",
      screenContext: "request",
      role: "request",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });

    expect(answer.route.intent).toBe("estimate");
    expect(answer.toolResult.blockedBy).toBe("AMBIGUOUS_NEEDS_DISAMBIGUATION");
  });
});
