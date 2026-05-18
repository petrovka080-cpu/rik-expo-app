import {
  buildAiScreenMagicButtonResultCopy,
  resolveAiScreenMagicButton,
} from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { AI_CHAT_USABILITY_REQUIRED_SCREENS } from "../../src/features/ai/screenMagic/aiScreenMagicProof";

describe("AI screen magic button result contract", () => {
  it("resolves every required-screen button to exactly one visible safe result", () => {
    const packByScreen = new Map(listAiScreenMagicPacks().map((pack) => [pack.screenId, pack]));
    const seenKinds = new Set<string>();

    for (const screenId of AI_CHAT_USABILITY_REQUIRED_SCREENS) {
      const pack = packByScreen.get(screenId);
      expect(pack).toBeTruthy();

      for (const button of pack?.buttons ?? []) {
        seenKinds.add(button.actionKind);
        const resolution = resolveAiScreenMagicButton(button);
        const result = buildAiScreenMagicButtonResultCopy({ pack: pack!, buttonIdOrLabel: button.id });

        expect(result).toBeTruthy();
        expect(result).toMatchObject({
          resultType: button.actionKind,
          providerCallAllowed: false,
          dbWriteUsed: false,
          directMutationUsed: false,
        });
        expect(result?.answer).toContain(button.label);
        expect(button.resultType).toBe(button.actionKind);
        expect(resolution.canExecuteDirectly).toBe(false);

        if (button.actionKind === "approval_required") {
          expect(button.approvalRoute).toBeTruthy();
          expect(resolution.status).toBe("routes_to_approval_ledger");
        }
        if (button.actionKind === "forbidden") {
          expect(button.forbiddenReason).toBeTruthy();
          expect(resolution.status).toBe("forbidden_with_reason");
        }
      }
    }

    expect([...seenKinds].sort()).toEqual(expect.arrayContaining([
      "approval_required",
      "draft_only",
      "forbidden",
      "safe_read",
    ]));
  });

  it("keeps role-native foundation buttons available on key screens", () => {
    const packByScreen = new Map(listAiScreenMagicPacks().map((pack) => [pack.screenId, pack]));
    const expectedLabelsByScreen: Record<string, string[]> = {
      "accountant.main": ["Проверить критические", "Подготовить rationale директору", "Запросить документы", "Отправить на согласование"],
      "buyer.main": ["Разобрать входящие", "Смотреть варианты закупа", "Сравнить поставщиков", "Запросить цены"],
      "warehouse.issue": ["Черновик выдачи", "Показать дефицит", "Предложить альтернативу", "Отправить на approval"],
      "director.dashboard": ["Открыть approval inbox", "Показать критические", "Показать что блокирует работы"],
      "foreman.main": ["Подготовить акт", "Подготовить отчет", "Проверить missing evidence", "Проверка безопасности"],
      "approval.inbox": ["Approve", "Reject", "Запросить данные", "Открыть evidence"],
    };

    for (const [screenId, labels] of Object.entries(expectedLabelsByScreen)) {
      const pack = packByScreen.get(screenId);
      const actualLabels = new Set((pack?.buttons ?? []).map((button) => button.label));

      for (const label of labels) {
        expect(actualLabels.has(label)).toBe(true);
      }
    }
  });
});
