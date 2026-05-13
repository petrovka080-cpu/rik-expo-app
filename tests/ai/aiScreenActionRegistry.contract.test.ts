import {
  AI_SCREEN_ACTION_REGISTRY,
  AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS,
  getAiScreenActionEntry,
  listAiScreenActionEntries,
} from "../../src/features/ai/screenActions/aiScreenActionRegistry";
import { validateAiScreenActionRegistry } from "../../src/features/ai/screenActions/aiScreenActionResolver";

describe("AI screen action registry", () => {
  it("registers the required production screen-action intelligence map", () => {
    const ids = listAiScreenActionEntries().map((entry) => entry.screenId);

    expect(ids).toEqual(expect.arrayContaining([...AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS]));
    expect(AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS).toHaveLength(15);
    expect(getAiScreenActionEntry("buyer.requests")).toMatchObject({
      domain: "procurement",
      directorControlFullAccess: true,
      nonDirectorScopedAccess: true,
    });
    expect(getAiScreenActionEntry("screen.runtime")).toMatchObject({
      domain: "control",
    });
  });

  it("maps at least 60 important buttons or actions with role, risk, and evidence policy", () => {
    const actions = AI_SCREEN_ACTION_REGISTRY.flatMap((entry) => entry.visibleActions);
    const validation = validateAiScreenActionRegistry();

    expect(actions.length).toBeGreaterThanOrEqual(60);
    expect(validation).toMatchObject({
      ok: true,
      screensRegistered: 15,
      allActionsHaveRoleScope: true,
      allActionsHaveRiskPolicy: true,
      allActionsHaveEvidenceSource: true,
      allHighRiskActionsRequireApproval: true,
      forbiddenActionsExecutable: false,
      unknownToolReferences: [],
    });
  });
});
