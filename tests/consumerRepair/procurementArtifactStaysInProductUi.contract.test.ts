import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  canonicalArtifactUnit,
  canonicalArtifactVisibleRowTitle,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import { normalizePublicBoqNameRu } from "../../src/lib/estimate/publicBoqNaming";
import { sanitizeRequestEstimatePublicText } from "../../src/features/consumerRepair/requestEstimateViewModel";

describe("consumer estimate procurement presentation", () => {
  it("keeps the canonical procurement artifact in the product UI instead of opening raw JSON", () => {
    const root = process.cwd();
    const screen = readFileSync(
      resolve(root, "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      "utf8",
    );
    const panel = readFileSync(
      resolve(root, "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx"),
      "utf8",
    );
    const procurementFlow = screen.slice(
      screen.indexOf("private openProcurement"),
      screen.indexOf("private openParamEditor"),
    );

    expect(procurementFlow).toContain('kind: "procurement"');
    expect(procurementFlow).toContain("assertCanonicalEstimateArtifactIdentity");
    expect(procurementFlow).not.toContain("Linking.openURL");
    expect(procurementFlow).not.toContain("window.open");
    expect(procurementFlow).toContain("Список показан ниже в смете");
    expect(screen).not.toContain('import { Linking,');
    expect(panel).toContain('testID="consumer-estimate-procurement-list"');
    expect(panel).toContain("buildCanonicalProcurementPreviewRows");
    expect(panel).toContain("canonicalMaterialQuantityBasisFromRow");
    expect(panel).toContain("quantityBasis?.procurementQuantity");
    expect(panel).toContain("row.titleRu");
    expect(panel).toContain("normalizePublicBoqNameRu");
    expect(panel).toContain("formatEstimateUnitLabel");
  });

  it("uses one public naming and unit policy for BIA UI, PDF, and procurement", () => {
    expect(normalizePublicBoqNameRu({
      sourceNameRu: "Кладочный раствор по выбранной строке BIA TN 10 Table 4",
    })).toBe("Кладочный раствор для стены из обожжённого глиняного кирпича");
    expect(canonicalArtifactVisibleRowTitle({
      title_ru: "Обожжённый глиняный кирпич — Acme Brick Modular A-101, specified 194x92x57 mm, nominal 200x100x67 mm",
    })).toBe(
      "Обожжённый глиняный кирпич — Acme Brick Modular A-101, фактический размер 194×92×57 мм, координационный размер 200×100×67 мм",
    );
    expect(canonicalArtifactUnit({ unit_id: "piece" })).toBe("шт.");
    expect(canonicalArtifactUnit({ unit_id: "m3" })).toBe("м³");
  });

  it("keeps backend applicability codes out of the consumer error message", () => {
    const message = sanitizeRequestEstimatePublicText(
      "Расчёт не завершён: PHYSICAL_NORM_APPLICABILITY_FAILED",
    );
    expect(message).toContain("выбранные данные не соответствуют условиям применимости нормы");
    expect(message).not.toContain("PHYSICAL_NORM_APPLICABILITY_FAILED");
  });
});
