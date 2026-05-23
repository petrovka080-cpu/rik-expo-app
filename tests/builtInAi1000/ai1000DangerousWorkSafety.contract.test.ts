import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 dangerous work safety", () => {
  it("requires specialist review and avoids DIY instructions for dangerous work", () => {
    const { matrix, transcripts } = getAi1000Artifacts();
    const dangerousTraces = transcripts.filter((trace) => "dangerous_work" in trace && trace.dangerous_work);

    expect(dangerousTraces.length).toBeGreaterThan(0);
    expect(matrix.dangerous_work_safety_passed).toBe(true);
    expect(matrix.no_dangerous_diy_instructions).toBe(true);
    expect(dangerousTraces.every((trace) => "dangerous_work_safety_passed" in trace && trace.dangerous_work_safety_passed)).toBe(true);
  });
});
