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
    const progressivePanel = read("src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx");
    const requestEstimateUi = `${draftPanel}\n${progressivePanel}`;
    const itemRow = read("src/features/consumerRepair/ConsumerRepairItemRow.tsx");

    expect(editor).toContain("<ConsumerRepairItemRow");
    expect(editor).not.toContain("return <ProfessionalRequestEstimatePreview");
    expect(itemRow).toContain("consumer-repair-item-quantity-input-");
    expect(itemRow).toContain("consumer-repair-item-unit-price-input-");
    expect(itemRow).toContain("consumer-repair-item-remove-");
    expect(itemRow).toContain("consumer-repair-item-catalog-");
    expect(itemRow).toContain("estimate-material-row-photo-button-");
    expect(requestEstimateUi).toContain("request-estimate-positions-toggle");
    expect(requestEstimateUi).toContain("consumer-repair-add-manual-item");
    expect(requestEstimateUi).toContain("consumer-repair-add-photo-draft");
    expect(requestEstimateUi).toContain("Фото");
    expect(requestEstimateUi).toContain("<RequestEstimateItemsEditor");
    expect(progressivePanel).toContain('import { EstimateRevisionTimeline }');
    expect(progressivePanel).toContain('<EstimateRevisionTimeline state={this.props.revisionState} />');
    expect(progressivePanel).toContain('import { EstimateRevisionDiff }');
    expect(progressivePanel).toContain('<EstimateRevisionDiff diff={latestDiff} />');
    expect(editor).toContain('testID="estimate-material-search-add-control"');
    expect(editor).toContain('placeholder="Найти в смете или добавить позицию…"');
    expect(editor).toContain('<Text style={styles.addCatalogButtonText}>+</Text>');
    expect(editor).toContain('В этой смете');
    expect(editor).toContain('Добавить из каталога');
    expect(editor).toContain('searchCanonicalEstimateResources({');
    expect(editor).toContain('kind: "all"');
    expect(editor).toContain('onSelectCatalogItem(item)');
    expect(editor).toContain('request-estimate-item-anchor-');
    expect(editor).not.toContain('{"Найти и добавить"}');
    expect(editor).not.toContain('request-estimate-items-load-more');
    expect(editor).not.toContain('section.items.slice(0');
    expect(progressivePanel).toContain('showMaterialControl={false}');
    const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(screen).toContain("canonicalRowMutationInFlight");
    expect(screen).toContain("Дождитесь сохранения предыдущего изменения строки");
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
