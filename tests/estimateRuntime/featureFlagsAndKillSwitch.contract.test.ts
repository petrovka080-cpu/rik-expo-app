import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { getEstimateFeatureFlags } from "../../src/features/estimates/runtime/estimateFeatureFlags";
import { getEstimateKillSwitches } from "../../src/features/estimates/runtime/estimateKillSwitch";
import { evaluateEstimateRuntimePolicy } from "../../src/features/estimates/runtime/estimateRuntimePolicy";

describe("estimate runtime feature flags and kill switch", () => {
  it("blocks estimate generation before calculators run", () => {
    const env = { AI_ESTIMATE_DISABLE_ALL: "1" };
    expect(getEstimateFeatureFlags(env).AI_ESTIMATE_RUNTIME_ENABLED).toBe(true);
    expect(getEstimateKillSwitches(env).AI_ESTIMATE_DISABLE_ALL).toBe(true);

    const decision = evaluateEstimateRuntimePolicy({
      prompt: "road construction 1 km width 6 m asphalt",
      env,
    });

    expect(decision.estimate_generation_allowed).toBe(false);
    expect(decision.blocked_reason).toBe("AI_ESTIMATE_KILL_SWITCH_DISABLED_ALL");
  });

  it("can disable expanded engineering without disabling basic repair triage", () => {
    const env = { AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING: "1" };
    expect(evaluateEstimateRuntimePolicy({
      prompt: "village water supply 5 km water tower",
      env,
    }).blocked_reason).toBe("AI_ESTIMATE_COMPLEX_ENGINEERING_DISABLED");

    const previous = process.env.AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING;
    process.env.AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING = "1";
    try {
      const draft = buildConsumerRepairAiDraft("village water supply 5 km water tower", {
        selectedWorkKey: "village_water_supply",
      });
      expect(draft.items).toHaveLength(0);
      expect(draft.repairType).toBe("estimate_triage");
    } finally {
      if (previous == null) delete process.env.AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING;
      else process.env.AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING = previous;
    }
  });
});
