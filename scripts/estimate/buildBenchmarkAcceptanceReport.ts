import {
  buildExpertAdjudicationQueue,
  buildGeneratedBenchmarkEstimate,
  compareEstimateToGoldenBenchmark,
  createHumanReviewPack,
  loadGoldenBenchmarkCases,
} from "./goldenBenchmarkCore";

export { createHumanReviewPack } from "./goldenBenchmarkCore";

if (require.main === module) {
  const cases = loadGoldenBenchmarkCases();
  const generated = cases.map((item) => buildGeneratedBenchmarkEstimate(item));
  const comparisons = cases.map((item) => compareEstimateToGoldenBenchmark(item));
  const queue = buildExpertAdjudicationQueue(comparisons.flatMap((item) => item.deviations));
  const outDir = createHumanReviewPack({ comparisons, cases, generated, queue });
  console.info(JSON.stringify({
    human_review_pack_created: true,
    human_review_pack_not_committed: true,
    path: outDir,
  }, null, 2));
}
