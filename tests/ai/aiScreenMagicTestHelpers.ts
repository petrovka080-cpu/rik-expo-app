import {
  getAiScreenMagicPack,
  listAiScreenMagicPacks,
} from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import type { AiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicTypes";

export function getMagicPack(screenId: string): AiScreenMagicPack {
  return getAiScreenMagicPack({ role: "unknown", context: "unknown", screenId });
}

export function expectMagicScreen(screenId: string, expectedDomain?: string) {
  const pack = getMagicPack(screenId);
  expect(pack.screenId).toBe(screenId);
  if (expectedDomain) expect(pack.domain).toBe(expectedDomain);
  expect(pack.aiPreparedWork.length).toBeGreaterThanOrEqual(4);
  expect(pack.buttons.length).toBeGreaterThanOrEqual(4);
  expect(pack.qa.length).toBeGreaterThanOrEqual(5);
  expect(pack.safety).toMatchObject({
    fakeDataUsed: false,
    directDangerousMutationAllowed: false,
    approvalBypassAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
  });
  expect(pack.buttons.every((button) => button.canExecuteDirectly === false)).toBe(true);
  expect(pack.buttons.map((button) => button.actionKind)).toEqual(expect.arrayContaining([
    "safe_read",
    "draft_only",
    "approval_required",
    "forbidden",
  ]));
  return pack;
}

export function listMagicPacks(): AiScreenMagicPack[] {
  return listAiScreenMagicPacks();
}
