import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("professional estimate editor actions", () => {
  it("does not replace editable estimate rows with a readonly professional preview", () => {
    const editor = read("src/features/consumerRepair/RequestEstimateItemsEditor.tsx");
    const draftPanel = read("src/features/consumerRepair/ConsumerRepairDraftPanel.tsx");
    const itemRow = read("src/features/consumerRepair/ConsumerRepairItemRow.tsx");

    expect(editor).toContain("<ConsumerRepairItemRow");
    expect(editor).not.toContain("return <ProfessionalRequestEstimatePreview");
    expect(itemRow).toContain("consumer-repair-item-quantity-input-");
    expect(itemRow).toContain("consumer-repair-item-unit-price-input-");
    expect(itemRow).toContain("consumer-repair-item-remove-");
    expect(itemRow).toContain("consumer-repair-item-catalog-");
    expect(itemRow).toContain("estimate-material-row-photo-button-");
    expect(draftPanel).toContain("consumer-repair-add-manual-item");
    expect(draftPanel).toContain("consumer-repair-add-photo-draft");
    expect(draftPanel).toContain("Фото");
    expect(draftPanel.indexOf("consumer-repair-add-manual-item")).toBeLessThan(draftPanel.indexOf("<RequestEstimateItemsEditor"));
  });

  it("uses broad examples in the input placeholder instead of only apartment capital renovation", () => {
    const form = read("src/features/consumerRepair/ConsumerRepairMediaButtons.tsx");
    const placeholder = form.match(/placeholder=\"([^\"]*Введите тип или вид работ[^\"]+)\"/)?.[1] ?? "";

    expect(placeholder).toContain("Введите тип или вид работ");
    expect(placeholder).toContain("укладка плитки");
    expect(placeholder).toContain("монтаж ламината");
    expect(placeholder).toContain("штукатурка стен");
    expect(placeholder).toContain("стяжка пола");
    expect(placeholder).toContain("электромонтаж");
    expect(placeholder).not.toBe("Например: капитальный ремонт квартиры 54 м²");
  });
});
