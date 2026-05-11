import { readFileSync } from "fs";
import { join } from "path";

describe("foreman subcontract controller decomposition audit", () => {
  const controllerSource = readFileSync(
    join(process.cwd(), "src", "screens", "foreman", "hooks", "useForemanSubcontractController.tsx"),
    "utf8",
  );
  const uiStateSource = readFileSync(
    join(
      process.cwd(),
      "src",
      "screens",
      "foreman",
      "hooks",
      "useForemanSubcontractControllerUiState.ts",
    ),
    "utf8",
  );
  const viewSource = readFileSync(
    join(process.cwd(), "src", "screens", "foreman", "hooks", "ForemanSubcontractControllerView.tsx"),
    "utf8",
  );
  const draftActionsSource = readFileSync(
    join(process.cwd(), "src", "screens", "foreman", "hooks", "useForemanSubcontractDraftActions.ts"),
    "utf8",
  );
  const requestDraftLifecycleSource = readFileSync(
    join(
      process.cwd(),
      "src",
      "screens",
      "foreman",
      "hooks",
      "useForemanSubcontractRequestDraftLifecycle.ts",
    ),
    "utf8",
  );

  const countHookCallSites = (source: string) =>
    (source.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(|React\.use[A-Z][A-Za-z0-9_]*\s*\(/g) || []).length;

  it("keeps the controller wired through extracted owner-boundary modules", () => {
    expect(controllerSource).toContain("foreman.subcontractController.model");
    expect(controllerSource).toContain("foreman.subcontractController.guards");
    expect(controllerSource).toContain("foreman.subcontractController.effects");
    expect(controllerSource).toContain("foreman.subcontractController.telemetry");
    expect(draftActionsSource).toContain("guardSendToDirector");
    expect(controllerSource).toContain("planSelectedSubcontractHydration");
    expect(controllerSource).toContain("getForemanSubcontractErrorMessage");
    expect(controllerSource).toContain("useForemanSubcontractControllerUiState");
    expect(controllerSource).toContain("ForemanSubcontractControllerView");
    expect(controllerSource).toContain("useForemanSubcontractDraftActions");
    expect(controllerSource).toContain("useForemanSubcontractRequestDraftLifecycle");
  });

  it("removes legacy inline helpers and silent catch from the controller owner", () => {
    expect(controllerSource).not.toContain("const patch = useMemo");
    expect(controllerSource).not.toContain("void patch");
    expect(controllerSource).not.toContain("getErrorMessage(");
    expect(controllerSource).not.toContain("resolveCodeFromDict(");
    expect(controllerSource).not.toMatch(/catch\s*\{/);
  });

  it("moves UI state, selectors, and pure derived model hooks behind one typed boundary", () => {
    expect(uiStateSource).toContain("useForemanSubcontractUiStore");
    expect(uiStateSource).toContain("useForemanHistory");
    expect(uiStateSource).toContain("useSafeAreaInsets");
    expect(uiStateSource).toContain("useRouter");
    expect(uiStateSource).toContain("deriveSubcontractControllerModel");
    expect(uiStateSource).toContain("buildDraftScopeKey");
    expect(uiStateSource).toContain("modalHeaderTopPad");
    expect(controllerSource).not.toContain("useForemanSubcontractUiStore(");
    expect(controllerSource).not.toContain("useSafeAreaInsets(");
    expect(controllerSource).not.toContain("useRouter(");
    expect(controllerSource).not.toContain("useState(");
    expect(controllerSource).not.toContain("useState<");
    expect(controllerSource).not.toContain("useRef(");
    expect(controllerSource).not.toContain("deriveSubcontractControllerModel(");
  });

  it("keeps rendering and draft action orchestration behind focused typed boundaries", () => {
    expect(viewSource).toContain("ForemanSubcontractMainSections");
    expect(viewSource).toContain("ForemanSubcontractModalStack");
    expect(draftActionsSource).toContain("guardSendToDirector");
    expect(draftActionsSource).toContain('mutationKind: "submit"');
    expect(draftActionsSource).toContain('mutationKind: "whole_cancel"');
    expect(controllerSource).not.toContain("const sendToDirector = useCallback");
    expect(controllerSource).not.toContain("const clearDraft = useCallback");
  });

  it("moves request draft loading and refresh side effects behind one typed lifecycle boundary", () => {
    expect(requestDraftLifecycleSource).toContain("export function useForemanSubcontractRequestDraftLifecycle");
    expect(requestDraftLifecycleSource).toContain("listRequestItems");
    expect(requestDraftLifecycleSource).toContain("filterActiveDraftItems");
    expect(requestDraftLifecycleSource).toContain("updateRequestMeta");
    expect(requestDraftLifecycleSource).toContain("fetchForemanRequestDisplayLabel");
    expect(requestDraftLifecycleSource).toContain("requestSeq !== draftItemsLoadSeqRef.current");
    expect(controllerSource).not.toContain("const loadDraftItems = useCallback");
    expect(controllerSource).not.toContain("const ok = await updateRequestMeta");
    expect(controllerSource).not.toContain("fetchForemanRequestDisplayLabel(requestId)");
  });

  it("keeps the owner hook at or below the reduced source hook budget", () => {
    expect(countHookCallSites(controllerSource)).toBeLessThanOrEqual(21);
  });
});
