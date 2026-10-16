import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  canonicalArtifactUnit,
  canonicalArtifactVisibleRowTitle,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import {
  normalizePublicBoqNameRu,
  publicBoqDisplayNameRu,
} from "../../src/lib/estimate/publicBoqNaming";
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
    const preview = readFileSync(resolve(root, "src/features/consumerRepair/canonicalProcurementPreviewRows.ts"), "utf8");
    const procurementFlow = screen.slice(
      screen.indexOf("private openProcurement"),
      screen.indexOf("private openParamEditor"),
    );

    expect(procurementFlow).toContain('kind: "procurement"');
    expect(procurementFlow).toContain("assertCanonicalEstimateArtifactIdentity");
    expect(procurementFlow).toContain("await buildCanonicalEstimateArtifact");
    expect(procurementFlow).not.toContain("procurementAlreadyCurrent");
    expect(procurementFlow).not.toContain("await getCanonicalEstimateArtifact");
    expect(procurementFlow).not.toContain("Linking.openURL");
    expect(procurementFlow).not.toContain("window.open");
    expect(procurementFlow).toContain("Список показан ниже в смете");
    expect(screen).not.toContain('import { Linking,');
    expect(panel).toContain('testID="consumer-estimate-procurement-list"');
    expect(panel).toContain("buildCanonicalProcurementPreviewRows");
    expect(panel).toContain("from './canonicalProcurementPreviewRows'");
    expect(preview).toContain("canonicalMaterialQuantityBasisFromRow");
    expect(preview).toContain("quantityBasis?.procurementQuantity");
    expect(preview).toContain("row.titleRu");
    expect(preview).toContain("publicBoqDisplayNameRu");
    expect(preview).toContain("formatEstimateUnitLabel");
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

  it("collapses the repeated bridge asphalt specification in every public projection", () => {
    const verbose = "нижний слой: горячая плотная мелкозернистая асфальтобетонная смесь типа А по КРЕР 27-06-020-01 + 27-06-021-01 при принятой толщине; марка и состав уточняются проектом и паспортом завода — Горячая плотная мелкозернистая асфальтобетонная смесь типа А по варианту КРЕР 27-06-020-01; марка и состав по проекту и паспорту завода";
    expect(normalizePublicBoqNameRu({ sourceNameRu: verbose }))
      .toBe("Нижний слой: асфальтобетонная смесь типа А");
    expect(canonicalArtifactVisibleRowTitle({ title_ru: verbose }))
      .toBe("Нижний слой: асфальтобетонная смесь типа А");
  });

  it("removes explanatory noise from long material names without blind truncation", () => {
    const cases = [
      [
        "Эмульсия битумная катионная для двух сплошных слоёв сцепления: стяжка/нижний асфальт и нижний/верхний асфальт; марка уточняется проектом",
        "Битумная эмульсия для слоёв сцепления",
      ],
      [
        "Герметик битумно-полимерный ТЕХНОНИКОЛЬ №42 для узлов водоотвода, ведро 12 кг — предварительная упаковка до сверки поставщика",
        "Герметик ТЕХНОНИКОЛЬ №42, 12 кг",
      ],
      [
        "Сетка сварная А500С Ø6 мм, 100×100 мм, карта 2×3 м (≈26,64 кг): раскладка с нахлёстом 200 мм и заказ целыми картами",
        "Сетка А500С Ø6, 100×100 мм, карта 2×3 м",
      ],
      [
        "ТЕХНОЭЛАСТМОСТ Б: дополнительные детали 1×1 м у водоотводных трубок — нетто, включено в общий заказ рулонов",
        "ТЕХНОЭЛАСТМОСТ Б, детали 1×1 м у водоотвода",
      ],
      [
        "Многооборотная бортовая опалубка: ламинированная фанера 18 мм и брус 50×100 мм (аренда/оборотный комплект)",
        "Опалубка: фанера 18 мм + брус 50×100 мм",
      ],
      [
        "Товарный бетон выравнивающего слоя мостовой плиты — готовая смесь, класс и показатели стойкости по проекту",
        "Бетон выравнивающего слоя мостовой плиты",
      ],
      [
        "верхний слой: малый нормативный ресурс дорожного битума по КРЕР — не заменяет сплошной слой сцепления",
        "Верхний слой: битум по КРЕР (добавка)",
      ],
      [
        "Укрывная полиэтиленовая плёнка и защитный картон для подтверждённой площади оборудования и пола",
        "Укрывная плёнка и защитный картон",
      ],
      [
        "Вода или одобренный состав против налипания для пневматических шин; без дизельного топлива",
        "Вода/состав для шин (без дизтоплива)",
      ],
      [
        "Кабель межблочный медный негорючий по паспорту оборудования без неуказанного запаса",
        "Негорючий межблочный кабель по паспорту",
      ],
    ] as const;

    for (const [sourceNameRu, expected] of cases) {
      const normalized = normalizePublicBoqNameRu({ sourceNameRu });
      expect(normalized).toBe(expected);
      expect(normalized.length).toBeLessThanOrEqual(44);
      expect(canonicalArtifactVisibleRowTitle({ title_ru: sourceNameRu })).toBe(expected);
    }

    const specificationCritical =
      "Доски хвойных пород необрезные, длина 4–6,5 м, ширина любая, толщина 44 мм и более, III сорт";
    expect(normalizePublicBoqNameRu({ sourceNameRu: specificationCritical }))
      .toBe(specificationCritical);
  });

  it("preserves non-material canonical titles byte-for-byte", () => {
    const title = "Контроль Ω:  revision  № 2";
    expect(publicBoqDisplayNameRu({ sourceNameRu: title, rowType: "service" }))
      .toBe(title);
    expect(publicBoqDisplayNameRu({ sourceNameRu: title, rowType: "work" }))
      .toBe(title);
  });

  it("keeps backend applicability codes out of the consumer error message", () => {
    const message = sanitizeRequestEstimatePublicText(
      "Расчёт не завершён: PHYSICAL_NORM_APPLICABILITY_FAILED",
    );
    expect(message).toContain("выбранные данные не соответствуют условиям применимости нормы");
    expect(message).not.toContain("PHYSICAL_NORM_APPLICABILITY_FAILED");
  });
});
