import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { __resetConsumerRepairRequestStoreForTests } from "../../src/lib/consumerRequests";
import {
  RoadworksWaveAProductionRegistry,
  buildAsphalt35NormativeCompositionLedgerV3,
} from "../../src/lib/estimate/v4/roadworks";

describe("Asphalt 35 Web/Android shared visible-output projection", () => {
  test("projects every catalog record without row truncation, raw IDs or false totals", () => {
    const decisions = new Map(buildAsphalt35NormativeCompositionLedgerV3().map((row) => [row.workId, row]));
    let executableSeen = 0;
    let blockedSeen = 0;

    for (const [index, registration] of RoadworksWaveAProductionRegistry.entries()) {
      __resetConsumerRepairRequestStoreForTests();
      const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
        consumerUserId: `asphalt-35-visible-${index}`,
        problemText: `${registration.professionalNameRu} 240 м2 толщина 60 мм`,
        repairType: "roadworks",
        city: "Бишкек",
        addressText: "Тестовый объект",
        preferredTimeText: "по графику",
        contactPhone: "+996700000000",
        selectedWork: null,
      });
      expect(bundle.pendingRoadScopeSelection).toBeNull();
      const web = buildRequestEstimateViewModel(bundle)!;
      const android = buildRequestEstimateViewModel(JSON.parse(JSON.stringify(bundle)))!;
      const decision = decisions.get(registration.workId)!;

      expect(web).toEqual(android);
      expect(web.title).toBe(registration.professionalNameRu);
      expect(web.rawItemCount).toBe(bundle.items.length);
      expect(web.visibleLines).toHaveLength(bundle.items.length);
      expect(web.totalLabel).toBe("Полный итог не рассчитан");
      const publicSurface = JSON.stringify({
        title: web.title,
        summary: web.summary,
        totalLabel: web.totalLabel,
        visibleLines: web.visibleLines,
        assumptions: web.assumptionRows,
        previewSections: web.previewSections,
        calculationPreviewLines: web.calculationPreviewLines,
        normSourcePreviewLines: web.normSourcePreviewLines,
      });
      expect(publicSurface).not.toMatch(/paving_roads_landscape_interior|template_/i);
      expect(publicSurface).not.toMatch(/(?:Р|С)Р[А-Яа-я]/u);

      if (decision.terminalDecision === "EXECUTABLE_B") {
        expect(bundle.items.length).toBeGreaterThanOrEqual(5);
        expect(web.sections.map((section) => section.title)).toEqual(expect.arrayContaining(["Работы", "Труд", "Машины и механизмы", "Лабораторный контроль", "Документация"]));
        executableSeen += 1;
      } else {
        expect(bundle.items).toHaveLength(1);
        expect(web.visibleLines.map((line) => line.text).join(" ")).toContain("Требуется подтверждение области применения");
        expect(bundle.items[0].sourceParameters?.executableAsphaltProfile).toBe(false);
        blockedSeen += 1;
      }
    }

    expect({ executableSeen, blockedSeen }).toEqual({ executableSeen: 15, blockedSeen: 20 });
  });
});
