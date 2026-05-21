import {
  answerAiLiveScreenButton,
  buildAiLiveScreenProofInventory,
  getAiLiveScreenButton,
  listAiLiveScreenButtonsForScreen,
  type AiLiveScreenButtonAnswer,
} from "../../src/lib/ai/liveScreenCopilot";
import type { AiLiveScreenProofInventory } from "../../src/lib/ai/liveScreenCopilot";
import { buildAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";
import { universalExternalWebResults } from "./aiUniversalRoleQaTestHelpers";

export function answerAiLiveScreenButtonFixture(buttonId: string): AiLiveScreenButtonAnswer {
  const button = getAiLiveScreenButton(buttonId);
  return answerAiLiveScreenButton(button, {
    graph: buildAiAppContextGraphFixture(button.role),
    externalWebConnected: true,
    externalWebResults: universalExternalWebResults,
    referenceDate: "2026-05-20",
  });
}

export function answerFirstLiveScreenButtonFixture(screenId: string): AiLiveScreenButtonAnswer {
  const [button] = listAiLiveScreenButtonsForScreen(screenId);
  if (!button) throw new Error(`No live screen buttons for ${screenId}`);
  return answerAiLiveScreenButtonFixture(button.id);
}

export function buildAiLiveWebProofFixture(): AiLiveScreenProofInventory {
  return buildAiLiveScreenProofInventory({
    mode: "web",
    graph: buildAiAppContextGraphFixture("director"),
    externalWebConnected: true,
    externalWebResults: universalExternalWebResults,
    referenceDate: "2026-05-20",
    releaseVerifyPassed: true,
  });
}

export function buildAiLiveAndroidProofFixture(): AiLiveScreenProofInventory {
  return buildAiLiveScreenProofInventory({
    mode: "android",
    graph: buildAiAppContextGraphFixture("director"),
    externalWebConnected: true,
    externalWebResults: universalExternalWebResults,
    referenceDate: "2026-05-20",
    releaseVerifyPassed: true,
    keyButtonsOnly: true,
  });
}
