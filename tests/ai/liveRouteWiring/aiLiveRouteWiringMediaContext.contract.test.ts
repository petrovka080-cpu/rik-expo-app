import * as fs from "fs";
import * as path from "path";

import { getAssistantContextQuickPrompts } from "../../../src/features/ai/assistantPrompts";
import { sanitizeLiveAiUserAnswer } from "../../../src/lib/ai/liveUi/liveAiAnswerGuard";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("AI live route wiring direct media UX", () => {
  it("renders direct photo/video attachments instead of media proof cards or sheets", () => {
    const mediaPanel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const foremanScreen = read("src/screens/foreman/ForemanScreen.tsx");
    const foremanMaterials = read("src/screens/foreman/ForemanEditorSection.tsx");
    const listingModal = read("src/screens/profile/components/ListingModal.tsx");
    const contractorView = read("src/screens/contractor/ContractorScreenView.tsx");
    const contractorOverview = read("src/screens/contractor/components/WorkModalOverviewSection.tsx");

    expect(foremanScreen).toContain("variant=\"foreman\"");
    expect(foremanMaterials).toContain("variant=\"foremanMaterials\"");
    expect(listingModal).toContain("variant=\"marketplace\"");
    expect(contractorView).not.toContain("LiveRouteMediaEntrypointPanel");
    expect(contractorOverview).toContain("variant=\"contractor\"");

    expect(mediaPanel).toContain("CompactMediaButtonsProps");
    expect(mediaPanel).toContain("InlineMediaSuggestion");
    expect(mediaPanel).toContain("DraftMediaBundle");
    expect(mediaPanel).toContain("Черновик заявки");
    expect(mediaPanel).toContain("Фото");
    expect(mediaPanel).toContain("Видео");
    expect(mediaPanel).toContain("Предложено по фото");
    expect(mediaPanel).toContain("Отправить директору");
    expect(mediaPanel).toContain("Подтверждение");
    expect(mediaPanel).toContain("Заполнено по фото · проверьте данные");
    expect(mediaPanel).toContain("sendWithDraft: true");
    expect(mediaPanel).toContain("finalLinkRequiresHuman: true");
    expect(mediaPanel).toContain("visibleAsCard: false");
    expect(mediaPanel).toContain("maxPhotosPerGroup");
    expect(mediaPanel).toContain("maxVideoDurationMs");

    expect(mediaPanel).not.toMatch(/Modal|sheetOpen|sheetTestID|Медиа evidence|Медиа товара|Медиа по материалам|AI распознать|AI заполнит карточку|Определить товар по фото|mediaAssetId\/sourceRef|storageKey|evidence-suggestion/);
  });

  it("keeps accountant context from falling back to foreman prompts or stored history", () => {
    const assistantScreen = read("src/features/ai/AIAssistantScreen.tsx");
    const derivedState = read("src/features/ai/useAIAssistantScreenDerivedState.ts");
    const accountantLabels = getAssistantContextQuickPrompts("accountant").map((prompt) => prompt.label);

    expect(accountantLabels).toEqual(expect.arrayContaining([
      "Показать платежи без документов",
      "Показать счета к оплате",
      "Показать частичные оплаты",
      "Показать долги",
      "Проверить документы для оплаты",
      "Подготовить справку по проводке",
    ]));
    expect(derivedState).toContain("assistantPresentationRole");
    expect(derivedState).toContain("explicitContextRole && explicitContextRole !== role");
    expect(assistantScreen).toContain("shouldRestoreStoredMessages = assistantContext === \"unknown\"");
  });

  it("does not expose raw live source refs to user-facing answers", () => {
    const sanitized = sanitizeLiveAiUserAnswer("(src:live:foreman:work) (src:live:foreman:photo) (src:live:foreman:stock)");

    expect(sanitized).not.toContain("src:live:");
    expect(sanitized).toContain("[Работа WKR-GKL]");
    expect(sanitized).toContain("[Фото до работ]");
    expect(sanitized).toContain("[Склад: ГКЛ]");
  });
});
