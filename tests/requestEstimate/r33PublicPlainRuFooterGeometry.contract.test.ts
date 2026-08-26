import fs from "node:fs";
import path from "node:path";

import { sanitizeRequestEstimatePublicText } from "../../src/features/consumerRepair/requestEstimateViewModel";

function source(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("R3.3 public plain-Russian and footer geometry", () => {
  it("removes every explicitly forbidden R3.3 infrastructure term from public copy", () => {
    const publicText = sanitizeRequestEstimatePublicText([
      "backend",
      "release",
      "revision",
      "admission",
      "canonical",
      "manifest",
      "source SHA",
      "DRAFT",
      "PROJECT_SYSTEM_SPECIFICATION_REQUIRED_R1",
      "123e4567-e89b-42d3-a456-426614174000",
    ].join(" · "));

    expect(publicText).not.toMatch(
      /backend|release|revision|admission|canonical|manifest|source\s+SHA|\bDRAFT\b|PROJECT_SYSTEM_SPECIFICATION_REQUIRED_R1|[0-9a-f]{8}-[0-9a-f-]{27}/iu,
    );
    expect(publicText).toContain("Черновик сметы");
    expect(publicText).toContain("Нужно уточнить параметры");
  });

  it("keeps the sole action footer after all form content with 160 px reserve and keyboard-aware scrolling", () => {
    const view = source("src/features/consumerRepair/ConsumerRepairRequestScreenView.tsx");
    const scroll = source("src/components/layout/AppScreenScroll.tsx");
    const layout = source("src/components/layout/appLayout.ts");
    const styles = source("src/features/consumerRepair/ConsumerRepairRequestScreen.styles.ts");

    expect(view.indexOf("<ConsumerRepairRequestContent"))
      .toBeLessThan(view.indexOf("<ConsumerRepairRequestStickyActions"));
    expect(view.indexOf("<ConsumerRepairRequestStickyActions"))
      .toBeLessThan(view.indexOf("</AppScreenScroll>"));
    expect(view.match(/<ConsumerRepairRequestStickyActions/g)).toHaveLength(1);
    expect(scroll).toContain('automaticallyAdjustKeyboardInsets = true');
    expect(scroll).toContain('keyboardShouldPersistTaps = "handled"');
    expect(layout).toContain("scrollBottomPaddingPx: 160");
    expect(styles).toMatch(/bottomActionButton:\s*\{[^}]*minHeight:\s*48/su);
    expect(styles).toMatch(/bottomActionPrimaryText:\s*\{[^}]*flexShrink:\s*1[^}]*minWidth:\s*0/su);
  });

  it("keeps canonical identities in selection data but never renders raw work keys", () => {
    const suggestions = source("src/features/requests/components/WorkTemplateSuggestions.tsx");
    const summaryCard = source("src/features/consumerRepair/RequestEstimateSummaryCard.tsx");

    expect(suggestions).toContain("key={suggestion.workKey}");
    expect(suggestions).toContain("onSelectLegacyWorkSuggestion?.(suggestion)");
    expect(suggestions).not.toContain("{suggestion.workKey}</Text>");
    expect(suggestions).not.toContain("work-suggestion-catalog-");
    expect(summaryCard).toContain('testID="request-estimate-selected-work-title"');
    expect(summaryCard).not.toMatch(/request-estimate-selected-work-title[^>]*numberOfLines=/su);
  });
});
