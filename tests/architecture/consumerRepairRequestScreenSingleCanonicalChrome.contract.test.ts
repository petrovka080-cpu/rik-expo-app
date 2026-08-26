import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("consumer repair request screen canonical chrome", () => {
  it("keeps /request on one estimate form with actions after all scroll content", () => {
    const screen = [
      read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      read("src/features/consumerRepair/ConsumerRepairRequestScreenView.tsx"),
    ].join("\n");
    const chrome = read("src/features/consumerRepair/ConsumerRepairRequestChrome.tsx");
    const form = read("src/features/consumerRepair/ConsumerRepairMediaButtons.tsx");
    const view = read("src/features/consumerRepair/ConsumerRepairRequestScreenView.tsx");

    expect(screen).toContain("ConsumerRepairRequestContent");
    expect(screen).toContain("ConsumerRepairRequestStickyActions");
    expect(screen).toContain("showPdfAction={Boolean(renderModel.bundle)}");
    expect(screen).not.toContain("consumer-repair-save-draft");

    expect(form).toContain("Что именно нужно");
    expect(form).not.toContain("Тип ремонта");
    expect(form).not.toContain("Сантехника");
    expect(form).not.toContain("Электрика");
    expect(form).not.toContain("Двери/окна");

    expect(chrome).toContain("const finalized = (sent || approved) && !needsFreshApproval");
    expect(chrome).toContain('testID={finalized ? "consumer-repair-open-pdf" : "consumer-estimate-make-pdf"}');
    expect(chrome).toContain('testID="consumer-repair-delete-draft"');
    expect(chrome).toContain('accessibilityLabel="PDF"');
    expect(chrome).toContain("Подтвердить смету");
    expect(chrome).toContain("Удалить черновик");
    expect(chrome).toContain('testID="consumer-repair-delete-confirmation"');
    expect(chrome).toContain('testID="consumer-repair-delete-confirm"');
    expect(chrome).not.toContain("Скачать PDF");
    expect(chrome).not.toContain("Удалить смету");
    expect(chrome).not.toContain("AppStickyActionBar");
    expect(view.indexOf("<ConsumerRepairRequestContent"))
      .toBeLessThan(view.indexOf("<ConsumerRepairRequestStickyActions"));
    expect(view.indexOf("<ConsumerRepairRequestStickyActions"))
      .toBeLessThan(view.indexOf("</AppScreenScroll>"));
  });
});
