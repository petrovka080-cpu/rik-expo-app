import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("production-grade estimate smoke oracle strength", () => {
  it("does not allow section-only or hardcoded UI evidence to pass web cases", () => {
    const webSource = source("scripts/e2e/runProductionGradeEstimateWebSmoke.ts");

    expect(webSource).toContain("summary_card_visible: summaryCardVisible");
    expect(webSource).toContain('page.getByTestId("request-estimate-positions-panel")');
    expect(webSource).toContain("work_rows_visible: bodyHas(rowEvidenceText, domain.first_work_title)");
    expect(webSource).toContain("material_rows_visible: bodyHas(rowEvidenceText, domain.first_material_title)");
    expect(webSource).toContain("service_rows_visible: domain.first_service_title == null || bodyHas(rowEvidenceText, domain.first_service_title)");
    expect(webSource).toContain("equipment_rows_visible: domain.first_equipment_title == null || bodyHas(rowEvidenceText, domain.first_equipment_title)");

    expect(webSource).not.toContain("summary_card_visible: true");
    expect(webSource).not.toContain("rowTypeVisible");
    expect(webSource).not.toMatch(/sectionVisible\s*\|\|/);
  });

  it("does not allow section-only or hardcoded UI evidence to pass android cases", () => {
    const androidSource = source("scripts/e2e/runProductionGradeEstimateAndroidSmoke.ts");

    expect(androidSource).toContain("summaryCardVisible,");
    expect(androidSource).toContain('byTestId("request-estimate-positions-panel")?.textContent');
    expect(androidSource).toContain("workRowsVisible: hasText(rowEvidenceText, args.expectedWorkTitle)");
    expect(androidSource).toContain("materialRowsVisible: hasText(rowEvidenceText, args.expectedMaterialTitle)");
    expect(androidSource).toContain("serviceRowsVisible: args.expectedServiceTitle == null || hasText(rowEvidenceText, args.expectedServiceTitle)");
    expect(androidSource).toContain("equipmentRowsVisible: args.expectedEquipmentTitle == null || hasText(rowEvidenceText, args.expectedEquipmentTitle)");

    expect(androidSource).not.toContain("summaryCardVisible: true");
    expect(androidSource).not.toMatch(/SectionVisible\s*\|\|/i);
  });
});
