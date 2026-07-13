import { auditWorkPassportsAndRealBoqContentPacks } from "../../scripts/estimate/auditWorkPassportsAndRealBoqContentPacks";

jest.setTimeout(120_000);

describe("work family calculator passport readiness", () => {
  it("proves priority work families have calculator-backed passports", () => {
    const result = auditWorkPassportsAndRealBoqContentPacks({
      requireGateFlags: false,
      writeLedger: false,
      writeSummary: false,
    });

    expect(result.summary.diamond_drilling_passports_ready).toBe(true);
    expect(result.summary.profile_sheet_fence_passports_ready).toBe(true);
    expect(result.summary.water_supply_external_passports_ready).toBe(true);
    expect(result.summary.sewerage_external_passports_ready).toBe(true);
    expect(result.summary.stormwater_external_passports_ready).toBe(true);
    expect(result.summary.roadworks_passports_ready).toBe(true);
    expect(result.summary.hydraulic_structures_passports_ready).toBe(true);
    expect(result.summary.power_lines_passports_ready).toBe(true);
    expect(result.summary.electrical_external_passports_ready).toBe(true);
    expect(result.summary.facade_systems_passports_ready).toBe(true);
    expect(result.summary.high_rise_glazing_passports_ready).toBe(true);
    expect(result.summary.mansard_roof_passports_ready).toBe(true);
    expect(result.summary.bridge_tunnel_industrial_passports_ready).toBe(true);
  });
});
