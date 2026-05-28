import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter";
import { SEMANTIC_CONFUSION_GOLDEN_PROMPTS } from "../../src/lib/ai/constructionInterpreter/fixtures/semanticConfusionGoldenPairs";
import { answerFor } from "../entrypoints/liveB2cEstimateRealityTestHelpers";
import { writeOpenWorldArtifact } from "./openWorldSemanticTestHelpers";

const pavingVariants = [
  "укладка брусчатки 587 кв м",
  "мощение брусчаткой 587 кв м",
  "уложить тротуарную плитку 587 м2",
  "укладка брусчатки 120 кв м",
  "укладка брусчатки 15 кв м",
  "укладка брусчатки 587 кв м в Бишкеке",
  "укладка брусчатки 587 кв м в Алматы",
  "укладка брусчатки 587 кв м в Austin Texas",
];

describe("open-world semantic metamorphic consistency", () => {
  it("keeps object and operation stable across wording, quantity, city, and route", () => {
    const results = [];
    for (const prompt of pavingVariants) {
      const plan = buildConstructionWorkPlan(prompt);
      expect(plan?.workKey).toBe("paving_stone_laying");
      expect(plan?.object).toBe("paving_stone_surface");
      expect(plan?.operation).toBe("laying");
      for (const route of ["/request", "/ai?context=foreman"] as const) {
        const answer = answerFor(route, prompt);
        expect(answer.route.intent).toBe("estimate");
        expect(answer.toolResult.estimate?.work.workKey).toBe("paving_stone_laying");
        results.push({
          prompt,
          route,
          workKey: answer.toolResult.estimate?.work.workKey,
          object: plan?.object,
          operation: plan?.operation,
          runtimeTraceId: answer.runtimeTrace.traceId,
        });
      }
    }
    writeOpenWorldArtifact("metamorphic_results.json", {
      passed: true,
      variants: results,
      invariant: "paving_stone_laying",
    });
  });

  it("resolves the semantic confusion matrix without route drift", () => {
    const results = SEMANTIC_CONFUSION_GOLDEN_PROMPTS.map((item) => {
      const plan = buildConstructionWorkPlan(item.prompt);
      expect(plan?.workKey).toBe(item.expected.workKey);
      expect(plan?.object).toBe(item.expected.object);
      expect(plan?.operation).toBe(item.expected.operation);
      return {
        id: item.id,
        route: item.route,
        prompt: item.prompt,
        workKey: plan?.workKey,
        object: plan?.object,
        operation: plan?.operation,
      };
    });
    writeOpenWorldArtifact("semantic_confusion_matrix.json", {
      passed: true,
      results,
    });
  });
});

