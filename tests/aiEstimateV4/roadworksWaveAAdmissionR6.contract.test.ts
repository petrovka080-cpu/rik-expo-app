import { canonicalApprovedBaselineRuntimeParameters } from "../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  buildRoadworksWaveAAdmissionLedgerR6,
  buildRoadworksWaveAApprovedBaselineR6,
  getRoadworksWaveAParameterDefinitions,
} from "../../src/lib/estimate/v4/roadworks";

describe("Roadworks Wave A R6 value admission", () => {
  test("classifies every reachable Wave A parameter without promoting validation fixtures", () => {
    for (const work of RoadworksWaveAInventory) {
      const definitions = getRoadworksWaveAParameterDefinitions(work.workId);
      const ledger = buildRoadworksWaveAAdmissionLedgerR6(work.workId);
      const baseline = buildRoadworksWaveAApprovedBaselineR6(
        work.workId,
        DEFAULT_ROADWORKS_WAVE_A_INPUTS,
      );

      expect(ledger).toHaveLength(definitions.length);
      expect(new Set(ledger.map((entry) => entry.parameterId)).size).toBe(definitions.length);
      expect(Object.keys(baseline.inputValues).sort()).toEqual(
        definitions.map((entry) => entry.key).sort(),
      );
      expect(canonicalApprovedBaselineRuntimeParameters({
        input_values: baseline.inputValues,
        input_classification: baseline.inputClassification,
      })).toEqual(baseline.runtimeParameters);

      for (const policy of ledger) {
        if (policy.baselineClassification === "DERIVED") {
          expect(policy.visibilityRole).toBe("USER_DERIVED_READONLY");
          expect(policy.valueSourceRole).toBe("BACKEND_DERIVED");
          expect(policy.runtimeValue).toBe(1);
          expect(policy.sourceId).toMatch(/^roadworks-wave-a-selected-operation-document-set:/u);
        } else {
          expect(policy.baselineClassification).toBe("VALIDATION_FIXTURE");
          expect(policy.visibilityRole).toBe(
            policy.valueSourceRole === "NORM_REQUIRED_BUT_PROJECT_SELECTED"
              ? "INTERNAL_ONLY"
              : "USER_INPUT",
          );
          expect(policy.preliminaryCompilationAllowed).toBe(true);
          expect(policy.runtimeValue).toBeNull();
          expect(baseline.runtimeParameters).not.toHaveProperty(policy.parameterId);
        }
      }
    }
  });

  test("keeps the 500 m2 defect coefficients out of runtime while preserving their distinct roles", () => {
    const repair = RoadworksWaveAInventory.find((entry) =>
      entry.workId.endsWith("_repair_standard")
    );
    expect(repair).toBeDefined();
    const ledger = new Map(buildRoadworksWaveAAdmissionLedgerR6(repair!.workId)
      .map((entry) => [entry.parameterId, entry]));
    const baseline = buildRoadworksWaveAApprovedBaselineR6(
      repair!.workId,
      DEFAULT_ROADWORKS_WAVE_A_INPUTS,
    );

    expect(baseline.inputValues).toEqual(expect.objectContaining({
      thickness_mm: 50,
      density_t_m3: 2.4,
      waste_factor: 1.03,
      tack_coat_l_m2: 0.3,
    }));
    expect(baseline.runtimeParameters).not.toHaveProperty("thickness_mm");
    expect(baseline.runtimeParameters).not.toHaveProperty("density_t_m3");
    expect(baseline.runtimeParameters).not.toHaveProperty("waste_factor");
    expect(baseline.runtimeParameters).not.toHaveProperty("tack_coat_l_m2");
    expect(ledger.get("thickness_mm")).toEqual(expect.objectContaining({
      valueSourceRole: "ENGINEERING_DESIGN",
      requiresSourceConfirmation: false,
    }));
    expect(ledger.get("density_t_m3")).toEqual(expect.objectContaining({
      valueSourceRole: "MANUFACTURER_CONFIRMED",
      requiresSourceConfirmation: true,
    }));
    expect(ledger.get("waste_factor")).toEqual(expect.objectContaining({
      valueSourceRole: "PROJECT_DOCUMENTATION",
      requiresSourceConfirmation: true,
    }));
    expect(ledger.get("labor_productivity_m2_per_man_hour")).toEqual(expect.objectContaining({
      valueSourceRole: "PROJECT_DOCUMENTATION",
      guideKind: "PROJECT_DEFINED",
      requiresSourceConfirmation: true,
    }));
    expect(ledger.get("tack_coat_l_m2")).toEqual(expect.objectContaining({
      valueSourceRole: "MANUFACTURER_CONFIRMED",
      requiresSourceConfirmation: true,
    }));
    expect(ledger.get("machine_repair_paver_productivity_m2_per_machine_hour"))
      .toEqual(expect.objectContaining({
        valueSourceRole: "SELECTED_EQUIPMENT_PASSPORT",
        visibilityRole: "USER_INPUT",
      }));
  });
});
