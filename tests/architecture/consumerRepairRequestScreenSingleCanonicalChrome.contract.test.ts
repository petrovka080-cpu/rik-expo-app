import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("consumer repair request screen canonical chrome", () => {
  it("keeps /request on one estimate form and one sticky action model", () => {
    const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const chrome = read("src/features/consumerRepair/ConsumerRepairRequestChrome.tsx");
    const form = read("src/features/consumerRepair/ConsumerRepairMediaButtons.tsx");
    const sticky = read("src/components/layout/AppStickyActionBar.tsx");

    expect(screen).toContain("ConsumerRepairRequestContent");
    expect(screen).toContain("ConsumerRepairRequestStickyActions");
    expect(screen).toContain("showPdfAction={false}");
    expect(screen).not.toContain("consumer-repair-save-draft");

    expect(form).toContain("Что посчитать");
    expect(form).not.toContain("Тип ремонта");
    expect(form).not.toContain("Сантехника");
    expect(form).not.toContain("Электрика");
    expect(form).not.toContain("Двери/окна");

    expect(chrome).toContain('testID: sent || approved ? "consumer-repair-open-pdf" : "consumer-estimate-make-pdf"');
    expect(chrome).toContain('testID: "consumer-repair-delete-draft"');
    expect(sticky.indexOf("{primary ? <StickyButton action={primary} variant=\"primary\" /> : null}"))
      .toBeLessThan(sticky.indexOf("{danger ? <StickyButton action={danger} variant=\"danger\" /> : null}"));
  });
});
