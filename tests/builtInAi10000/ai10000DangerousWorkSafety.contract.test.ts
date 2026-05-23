import { getAi10000Artifacts } from "./ai10000TestHelpers";

describe("built-in AI 10000 dangerous work safety", () => {
  it("marks dangerous estimate cases for review without DIY instructions", () => {
    const { matrix, transcripts } = getAi10000Artifacts();
    const dangerousTraces = transcripts.filter((
      trace,
    ): trace is typeof transcripts[number] & { dangerous_work: true; dangerous_work_safety_passed: boolean } =>
      "dangerous_work" in trace &&
      "dangerous_work_safety_passed" in trace &&
      trace.dangerous_work === true,
    );

    expect(dangerousTraces.length).toBeGreaterThan(0);
    expect(matrix.dangerous_work_safety_passed).toBe(true);
    expect(matrix.no_dangerous_diy_instructions).toBe(true);
    expect(dangerousTraces.every((trace) => trace.dangerous_work_safety_passed)).toBe(true);
  });
});
