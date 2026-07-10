import { GREEN_AI_PLATFORM_KERNEL_FITNESS_MATRIX, runAiPlatformKernelFitnessMatrix } from "../../scripts/architecture/runAiPlatformKernelFitnessMatrix";

describe("AI platform kernel fitness matrix", () => {
  it("passes estimate, role, forbidden, approval and redaction cases", async () => {
    const { summary } = await runAiPlatformKernelFitnessMatrix({ writeSummary: false });
    expect(summary.final_status).toBe(GREEN_AI_PLATFORM_KERNEL_FITNESS_MATRIX);
    expect(summary.estimate_cases_passed).toBe("50/50");
    expect(summary.chat_cases_passed).toBe("30/30");
    expect(summary.forbidden_mutation_cases_passed).toBe("20/20");
    expect(summary.approval_required_cases_passed).toBe("20/20");
    expect(summary.redaction_cases_passed).toBe("20/20");
  });
});
