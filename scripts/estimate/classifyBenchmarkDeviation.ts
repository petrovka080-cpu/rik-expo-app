import { classifyBenchmarkDeviation } from "./goldenBenchmarkCore";

export { classifyBenchmarkDeviation } from "./goldenBenchmarkCore";

if (require.main === module) {
  const type = process.argv[2];
  if (!type) throw new Error("usage: tsx scripts/estimate/classifyBenchmarkDeviation.ts <DEVIATION_TYPE>");
  console.info(JSON.stringify({
    type,
    severity: classifyBenchmarkDeviation(type as never),
  }, null, 2));
}
