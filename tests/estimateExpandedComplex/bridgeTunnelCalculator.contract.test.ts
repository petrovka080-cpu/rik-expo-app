import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("bridge and tunnel calculators", () => {
  it("keeps bridge estimates preliminary and produces structural quantity groups", () => {
    const bridge = expectExpandedPrompt({
      prompt: "мост 30 м 2 полосы свайное основание",
      familyId: "bridge_construction",
      calculatorId: "bridgeCalculator",
      minRows: 10,
      requiredCodes: [
        "bridge_piles_pcs",
        "pile_concrete_m3",
        "piers_concrete_m3",
        "deck_concrete_m3",
        "girders_pcs",
        "bearings_pcs",
      ],
    });
    expect(rowByCode(bridge, "bridge_piles_pcs").quantity).toBeGreaterThan(0);
    expectExpandedSnapshotPdfBuyer(bridge);
  });

  it("calculates tunnel excavation, lining, waterproofing and ventilation rows", () => {
    const tunnel = expectExpandedPrompt({
      prompt: "тоннель 500 м сечением 40 м²",
      familyId: "tunnel_construction",
      calculatorId: "tunnelCalculator",
      requiredCodes: [
        "tunnel_excavation_m3",
        "tunnel_lining_concrete_m3",
        "tunnel_waterproofing_m2",
        "ventilation_equipment_set",
      ],
    });
    expect(rowByCode(tunnel, "tunnel_excavation_m3").quantity).toBeGreaterThan(0);
    expectExpandedSnapshotPdfBuyer(tunnel);
  });
});
