import React from "react";
import { Platform } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import { buildConsumerCanonicalPrecompileParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { buildCanonicalParameterCards } from "../../src/lib/estimatePresentation/buildCanonicalParameterCards";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import { approveConsumerRepairRequestDraft, saveConsumerRepairCanonicalParameterCollection, upsertConsumerRepairCanonicalBackendDraft } from "../../src/lib/consumerRequests/consumerRequestService";
import { saveConsumerRepairBundle } from "../../src/lib/consumerRequests/consumerRequestRepository";
import { buildCanonicalConsumerRepairRevisionFixture } from "../consumerRepair/canonicalConsumerRepairRevisionFixture";
import { ConsumerRepairRequestScreenController } from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
import { consumerRepairPendingCanonicalParameterCollection } from "../../src/features/consumerRepair/consumerRepairCanonicalEstimateReadiness";
import { captureConsumerRepairCanonicalDraftWriteSource } from "../../src/lib/consumerRequests/consumerCanonicalParameterCollection";
import { validateConsumerRepairRequestForApprove } from "../../src/lib/consumerRequests/consumerRequestValidationService";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement("MockIonicon", { name }),
  };
});

function installLocalStorageMock(): () => void {
  const originalPlatformOs = Platform.OS;
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => "web" });
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => originalPlatformOs });
  };
}

function stripFoundationCatalog(): CanonicalEstimateCatalogItem {
  const parameterSchema: CanonicalEstimateCatalogItem["parameterSchema"] = [
    ["total_axis_length_m", "Общая длина фундаментной ленты", "m", "USER_MEASURED"],
    ["strip_width_m", "Ширина фундаментной ленты", "m", "PROJECT_DOCUMENTATION"],
    ["strip_height_m", "Высота бетонной части", "m", "PROJECT_DOCUMENTATION"],
    ["approved_reinforcement_schedule_weight_kg", "Масса арматуры по проектной ведомости", "kg", "PROJECT_DOCUMENTATION"],
  ].map(([parameterId, titleRu, unitId, valueSourceRole], ordinal) => ({
    parameterId,
    ordinal,
    valueType: "decimal" as const,
    unitId,
    titleRu,
    required: true,
    defaultValue: null,
    constraints: { min: 0.000001 },
    visibilityRole: "USER_INPUT" as const,
    valueSourceRole: valueSourceRole as "USER_MEASURED" | "PROJECT_DOCUMENTATION",
    formulaConsumers: [`formula:${parameterId}`],
  }));
  return {
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_standard",
    releaseId: "00000000-0000-5000-8000-000000000150",
    namespace: "global",
    domain: "concrete_foundation",
    workKey: "strip_foundation_standard",
    titleRu: "Устройство монолитного железобетонного ленточного фундамента",
    definitionVersion: 1,
    applicability: {},
    professionalMetadata: {},
    parameterSchema,
  };
}

describe("canonical precompile parameter collection", () => {
  let cleanupLocalStorage: (() => void) | null = null;

  beforeEach(() => {
    cleanupLocalStorage = installLocalStorageMock();
    __resetConsumerRepairRequestStoreForTests();
  });

  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
    cleanupLocalStorage?.();
    cleanupLocalStorage = null;
  });

  function populatedDraft() {
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: "existing-draft-owner", problemText: "Фундамент 150 метров",
      aiDraft: buildCanonicalConsumerRepairRevisionFixture("Фундамент 150 метров"),
    });
    return saveConsumerRepairBundle({ ...draft, pdfs: [{
      id: "previous-pdf", requestDraftId: draft.draft.id,
      revisionId: "previous-revision", pdfStatus: "archived",
    } as never] });
  }

  function pendingSession(draftId: string) {
    return buildConsumerCanonicalPrecompileParameterSession({
      catalog: stripFoundationCatalog(), draftId,
      parameters: { total_axis_length_m: "150" },
      missingParameterIds: ["strip_width_m", "strip_height_m", "approved_reinforcement_schedule_weight_kg"],
    });
  }

  it("persists successor inputs in a populated draft without losing rows, prices, PDF or revision history after reload", () => {
    const initial = populatedDraft();
    __simulateConsumerRepairRequestStoreReloadForTests();
    const before = getConsumerRepairRequest(initial.draft.id);
    expect(before.items.length).toBeGreaterThan(0);
    const session = pendingSession(before.draft.id);
    saveConsumerRepairCanonicalParameterCollection({ requestDraftId: before.draft.id,
      consumerUserId: before.draft.consumerUserId, problemText: before.draft.problemText!, session });
    __simulateConsumerRepairRequestStoreReloadForTests();
    const after = getConsumerRepairRequest(before.draft.id);
    for (const field of ["items", "pdfs", "estimateRevisionState", "estimateDraftRevisionState", "structuredEstimatePayload", "editableEstimateSnapshot"] as const) {
      expect(after[field]).toEqual(before[field]);
    }
    expect(after.events).toEqual([...before.events, expect.objectContaining({ eventType: "canonical_parameter_collection_saved" })]);
    expect(consumerRepairPendingCanonicalParameterCollection(after)).toEqual(session);
  });

  it("rejects a foreign owner, draft/session mismatch, ordinary revision and finalized draft without mutation", () => {
    const before = populatedDraft(), session = pendingSession(before.draft.id);
    const input = { requestDraftId: before.draft.id, consumerUserId: before.draft.consumerUserId,
      problemText: before.draft.problemText!, session };
    expect(() => saveConsumerRepairCanonicalParameterCollection({ ...input, consumerUserId: "other-owner" })).toThrow();
    expect(() => saveConsumerRepairCanonicalParameterCollection({ ...input, session: { ...session, draftId: "other-draft" } })).toThrow("DRAFT_MISMATCH");
    expect(() => saveConsumerRepairCanonicalParameterCollection({ ...input, session: { ...session, revisionId: "ordinary-revision" } })).toThrow("REQUIRES_PRECOMPILE_SESSION");
    expect(getConsumerRepairRequest(before.draft.id)).toEqual(before);
    const approved = saveConsumerRepairBundle({ ...before, draft: { ...before.draft, status: "consumer_approved" } });
    expect(() => saveConsumerRepairCanonicalParameterCollection(input)).toThrow("REQUIRES_DRAFT");
    expect(getConsumerRepairRequest(before.draft.id)).toEqual(approved);
  });

  it("renders missing parameter cards while retaining the previous canonical binding", () => {
    const before = populatedDraft();
    const bundle = saveConsumerRepairCanonicalParameterCollection({ requestDraftId: before.draft.id,
      consumerUserId: before.draft.consumerUserId, problemText: before.draft.problemText!, session: pendingSession(before.draft.id) });
    const noop = jest.fn();let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ConsumerRepairDraftPanel bundle={bundle} aiAnswerRu={null}
      onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop}
      onRemove={noop} onAddManual={noop} onAddCustom={noop} onApplyParamBatch={noop} />); });
    expect(renderer.root.findByProps({ testID: "consumer-estimate-parameter-collection" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "editable-param-chip-strip_width_m" })).toBeTruthy();
    expect(bundle.items).toEqual(before.items);
    act(() => renderer.unmount());
  });

  it("approval opens successor cards without compiling repeatedly, loading old parameters or exporting the old PDF", async () => {
    const before = populatedDraft();
    const bundle = saveConsumerRepairCanonicalParameterCollection({ requestDraftId: before.draft.id,
      consumerUserId: before.draft.consumerUserId, problemText: before.draft.problemText!, session: pendingSession(before.draft.id) });
    const prepare = jest.fn(), load = jest.fn();
    const controller = new ConsumerRepairRequestScreenController({ consumerUserId: before.draft.consumerUserId,
      onPrepareCanonicalEstimate: prepare, onLoadCanonicalRevisionDraft: jest.fn(),
      onLoadCanonicalParameterSession: load, onRecalculateCanonicalEstimate: jest.fn(),
      onSelectCanonicalCatalogItem: jest.fn(), onAddCanonicalCatalogItem: jest.fn(), onOpenPhotoForMaterialRecognition: jest.fn() });
    const action = controller as unknown as { state: typeof controller.state; setState: (patch: Partial<typeof controller.state>) => void;
      approveDraft: () => Promise<void>; hydrateCurrentCanonicalParameterSession: () => Promise<void>; refreshHistory: () => void };
    action.state = { ...action.state, bundle, problemText: bundle.draft.problemText!, selectedWork: null };
    action.setState = patch => { action.state = { ...action.state, ...patch }; };action.refreshHistory = jest.fn();
    // This scenario keeps the selected work that generated the successor schema.
    action.state.bundle = { ...bundle, draft: { ...bundle.draft, selectedWorkKey: stripFoundationCatalog().catalogId } };
    await action.hydrateCurrentCanonicalParameterSession();await action.approveDraft();await action.approveDraft();
    expect(prepare).not.toHaveBeenCalled();expect(load).not.toHaveBeenCalled();
    expect(action.state.statusMessage).toContain("3 обязательных параметров");
    expect(action.state.bundle?.draft.status).toBe("draft");expect(action.state.bundle?.items).toEqual(before.items);
  });

  it("applies pending successor inputs through compile even when the old revision is still bound", async () => {
    const before = populatedDraft(), session = pendingSession(before.draft.id);
    const bundle = saveConsumerRepairCanonicalParameterCollection({ requestDraftId: before.draft.id,
      consumerUserId: before.draft.consumerUserId, problemText: before.draft.problemText!, session });
    const prepare = jest.fn(async () => bundle), recalculate = jest.fn();
    const controller = new ConsumerRepairRequestScreenController({ consumerUserId: before.draft.consumerUserId,
      onPrepareCanonicalEstimate: prepare, onLoadCanonicalRevisionDraft: jest.fn(), onLoadCanonicalParameterSession: jest.fn(),
      onRecalculateCanonicalEstimate: recalculate, onSelectCanonicalCatalogItem: jest.fn(),
      onAddCanonicalCatalogItem: jest.fn(), onOpenPhotoForMaterialRecognition: jest.fn() });
    const action = controller as unknown as { state: typeof controller.state; setState: (patch: Partial<typeof controller.state>) => void;
      applyParamBatch: (patches: {operation:"add_param";paramKey:string;rawValue:string}[]) => Promise<boolean>; refreshHistory: () => void };
    action.state = { ...action.state, bundle };action.setState = patch => { action.state = { ...action.state, ...patch }; };action.refreshHistory = jest.fn();
    expect(await action.applyParamBatch([{ operation: "add_param", paramKey: "strip_width_m", rawValue: "0,6" }])).toBe(true);
    expect(prepare).toHaveBeenCalledWith(bundle.draft.problemText, session.workPassportId, bundle.draft.id, null,
      { total_axis_length_m: 150, strip_width_m: "0,6" });
    expect(recalculate).not.toHaveBeenCalled();expect(action.state.bundle?.items).toEqual(before.items);
  });

  it.each(["another draft", "new session in the same draft"])("does not publish a delayed collection response after opening %s", async (scenario) => {
    const before = populatedDraft();
    const bundle = saveConsumerRepairCanonicalParameterCollection({ requestDraftId: before.draft.id,
      consumerUserId: before.draft.consumerUserId, problemText: before.draft.problemText!, session: pendingSession(before.draft.id) });
    let resolve!: (value: typeof bundle) => void;
    const prepare = jest.fn(() => new Promise<typeof bundle>(done => { resolve = done; }));
    const controller = new ConsumerRepairRequestScreenController({ consumerUserId: before.draft.consumerUserId,
      onPrepareCanonicalEstimate: prepare, onLoadCanonicalRevisionDraft: jest.fn(), onLoadCanonicalParameterSession: jest.fn(),
      onRecalculateCanonicalEstimate: jest.fn(), onSelectCanonicalCatalogItem: jest.fn(),
      onAddCanonicalCatalogItem: jest.fn(), onOpenPhotoForMaterialRecognition: jest.fn() });
    const action = controller as unknown as { state: typeof controller.state; setState: (patch: Partial<typeof controller.state>) => void;
      applyParamBatch: (patches: {operation:"add_param";paramKey:string;rawValue:string}[]) => Promise<boolean>; refreshHistory: () => void };
    action.state = { ...action.state, bundle };action.setState = patch => { action.state = { ...action.state, ...patch }; };action.refreshHistory = jest.fn();
    const applying = action.applyParamBatch([{ operation: "add_param", paramKey: "strip_width_m", rawValue: "0,6" }]);
    const next = scenario === "another draft"
      ? { ...bundle, draft: { ...bundle.draft, id: "another-draft" } }
      : { ...bundle, canonicalParameterSession: { ...bundle.canonicalParameterSession!, sessionId: "new-session", revisionId: "precompile:new-inputs" } };
    action.state = { ...action.state, bundle: next, statusMessage: "Другой ввод" };resolve(bundle);
    expect(await applying).toBe(false);expect(action.state.bundle).toBe(next);expect(action.state.statusMessage).toBe("Другой ввод");
  });

  it("rejects a callback for another owner without replacing the active draft", async () => {
    const before = populatedDraft();
    const bundle = saveConsumerRepairCanonicalParameterCollection({ requestDraftId: before.draft.id,
      consumerUserId: before.draft.consumerUserId, problemText: before.draft.problemText!, session: pendingSession(before.draft.id) });
    const controller = new ConsumerRepairRequestScreenController({ consumerUserId: before.draft.consumerUserId,
      onPrepareCanonicalEstimate: jest.fn(async () => ({ ...bundle, draft: { ...bundle.draft, consumerUserId: "foreign-owner" } })),
      onLoadCanonicalRevisionDraft: jest.fn(), onLoadCanonicalParameterSession: jest.fn(), onRecalculateCanonicalEstimate: jest.fn(),
      onSelectCanonicalCatalogItem: jest.fn(), onAddCanonicalCatalogItem: jest.fn(), onOpenPhotoForMaterialRecognition: jest.fn() });
    const action = controller as unknown as { state: typeof controller.state; setState: (patch: Partial<typeof controller.state>) => void;
      applyParamBatch: (patches: {operation:"add_param";paramKey:string;rawValue:string}[]) => Promise<boolean> };
    action.state = { ...action.state, bundle };action.setState = patch => { action.state = { ...action.state, ...patch }; };
    expect(await action.applyParamBatch([{ operation: "add_param", paramKey: "strip_width_m", rawValue: "0,6" }])).toBe(false);
    expect(action.state.bundle).toBe(bundle);expect(action.state.statusMessage).toBe("CANONICAL_PARAMETER_COLLECTION_RESULT_MISMATCH");
  });

  it("rejects a successful delayed replacement when newer inputs were saved, preserving store and history", async () => {
    const initial = populatedDraft(), firstSession = pendingSession(initial.draft.id);
    const first = saveConsumerRepairCanonicalParameterCollection({ requestDraftId: initial.draft.id,
      consumerUserId: initial.draft.consumerUserId, problemText: initial.draft.problemText!, session: firstSession });
    const expectedDraftWriteSource = captureConsumerRepairCanonicalDraftWriteSource(first);
    let resolve!: () => void;const calculated = new Promise<void>(done => { resolve = done; });
    const applying = (async () => {
      await calculated;return upsertConsumerRepairCanonicalBackendDraft({ requestDraftId: first.draft.id,
        consumerUserId: first.draft.consumerUserId, problemText: first.draft.problemText,
        aiDraft: buildCanonicalConsumerRepairRevisionFixture("Фундамент 150 метров"), expectedDraftWriteSource });
    })();
    const nextSession = buildConsumerCanonicalPrecompileParameterSession({ catalog: stripFoundationCatalog(), draftId: first.draft.id,
      parameters: { total_axis_length_m: "150", strip_width_m: "0.8" },
      missingParameterIds: ["strip_height_m", "approved_reinforcement_schedule_weight_kg"] });
    const next = saveConsumerRepairCanonicalParameterCollection({ requestDraftId: first.draft.id,
      consumerUserId: first.draft.consumerUserId, problemText: first.draft.problemText!, session: nextSession });
    const rejected = expect(applying).rejects.toThrow("CANONICAL_WORKSPACE_REPLACED");resolve();await rejected;
    expect(getConsumerRepairRequest(first.draft.id)).toEqual(next);
    expect(getConsumerRepairRequest(first.draft.id).items).toEqual(initial.items);
  });

  it("accepts a successful replacement from the exact saved input and clears the completed collection", () => {
    const before = populatedDraft();
    const pending = saveConsumerRepairCanonicalParameterCollection({ requestDraftId: before.draft.id,
      consumerUserId: before.draft.consumerUserId, problemText: before.draft.problemText!, session: pendingSession(before.draft.id) });
    const updated = upsertConsumerRepairCanonicalBackendDraft({ requestDraftId: pending.draft.id,
      consumerUserId: pending.draft.consumerUserId, problemText: pending.draft.problemText,
      aiDraft: buildCanonicalConsumerRepairRevisionFixture("Фундамент 150 метров"),
      expectedDraftWriteSource: captureConsumerRepairCanonicalDraftWriteSource(pending) });
    expect(updated.draft.id).toBe(before.draft.id);expect(updated.canonicalParameterSession).toBeNull();
    expect(updated.events.slice(0, pending.events.length)).toEqual(pending.events);
    expect(updated.items[0].sourceParameters?.canonicalBackendRevisionId).not.toBe(before.items[0].sourceParameters?.canonicalBackendRevisionId);
  });

  it.each(["INVALID", "COMPLETE", "PRELIMINARY_WITH_ASSUMPTIONS"] as const)("cannot approve the previous BOQ while a %s precompile session awaits a replacement", (status) => {
    const before = populatedDraft(), session = { ...pendingSession(before.draft.id), status,
      blockingMissingParameterIds: [], invalidParameterIds: [], contractMissingParameterIds: [] };
    saveConsumerRepairCanonicalParameterCollection({ requestDraftId: before.draft.id,
      consumerUserId: before.draft.consumerUserId, problemText: before.draft.problemText!, session });
    expect(validateConsumerRepairRequestForApprove(before.draft.id, before.draft.consumerUserId).errors)
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: "ESTIMATE_PARAMETERS_REQUIRED" })]));
    expect(() => approveConsumerRepairRequestDraft({ requestDraftId: before.draft.id,
      userId: before.draft.consumerUserId, canonicalArtifact: { artifactId: "old-pdf",
        revisionId: String(before.items[0].sourceParameters?.canonicalBackendRevisionId),
        releaseId: String(before.items[0].sourceParameters?.canonicalBackendReleaseId), status: "ready", sha256: "a".repeat(64) } })).toThrow();
    expect(getConsumerRepairRequest(before.draft.id).draft.status).toBe("draft");
  });

  it("keeps catalog defaults as assumptions while exposing their active conditional inputs", () => {
    const catalog = stripFoundationCatalog();
    catalog.parameterSchema.unshift({
      parameterId: "scope_variant",
      ordinal: -1,
      valueType: "enum",
      unitId: null,
      titleRu: "Состав сметы",
      required: true,
      defaultValue: "full_reinforced_structure",
      constraints: { values: ["full_reinforced_structure", "placement_only"] },
      visibilityRole: "USER_INPUT",
      valueSourceRole: "PROJECT_DOCUMENTATION",
      formulaConsumers: ["formula:scope_variant"],
    });
    const reinforcement = catalog.parameterSchema.find(
      (parameter) => parameter.parameterId === "approved_reinforcement_schedule_weight_kg",
    )!;
    reinforcement.required = false;
    reinforcement.requiredWhen = {
      parameterId: "scope_variant",
      equals: "full_reinforced_structure",
    };
    reinforcement.constraints.requiredWhen = reinforcement.requiredWhen;
    catalog.parameterSchema.push(
      {
        parameterId: "groundworks_included",
        ordinal: 20,
        valueType: "boolean",
        unitId: null,
        titleRu: "Разработка грунта входит в состав",
        required: false,
        defaultValue: null,
        constraints: {},
        visibilityRole: "USER_INPUT",
        valueSourceRole: "PROJECT_DOCUMENTATION",
        resourceBranchConsumers: ["row:groundworks"],
      },
      {
        parameterId: "excavated_soil_density_t_m3",
        ordinal: 21,
        valueType: "decimal",
        unitId: "t/m3",
        titleRu: "Плотность вывозимого грунта",
        required: false,
        defaultValue: null,
        requiredWhen: {
          kind: "and",
          operands: [
            {
              kind: "and",
              operands: [
                { kind: "equals", parameterId: "scope_variant", value: "full_reinforced_structure" },
                { kind: "equals", parameterId: "groundworks_included", value: true },
              ],
            },
            { kind: "equals", parameterId: "soil_disposal_included", value: true },
          ],
        },
        constraints: {},
        visibilityRole: "USER_INPUT",
        valueSourceRole: "PROJECT_DOCUMENTATION",
        formulaConsumers: ["formula:soil_disposal"],
      },
    );

    const session = buildConsumerCanonicalPrecompileParameterSession({
      catalog,
      draftId: "strip-foundation-default-visibility",
      parameters: {
        scope_variant: "full_reinforced_structure",
        total_axis_length_m: "150",
        groundworks_included: false,
      },
      missingParameterIds: [
        "strip_width_m",
        "strip_height_m",
        "approved_reinforcement_schedule_weight_kg",
        "excavated_soil_density_t_m3",
      ],
      textExtractedParameterIds: ["total_axis_length_m"],
      createdAt: "2026-09-18T12:00:00.000Z",
    });

    expect(session.parameters.find((parameter) => parameter.parameterId === "scope_variant"))
      .toMatchObject({ value: "full_reinforced_structure", source: "ASSUMED", state: "ASSUMED" });
    expect(session.parameters.find((parameter) => parameter.parameterId === "total_axis_length_m"))
      .toMatchObject({ value: 150, source: "TEXT_EXTRACTED", state: "PROVIDED" });
    expect(session.blockingMissingParameterIds).toEqual(expect.arrayContaining([
      "strip_width_m",
      "strip_height_m",
      "approved_reinforcement_schedule_weight_kg",
    ]));
    expect(session.parameters.map((parameter) => parameter.parameterId))
      .not.toContain("excavated_soil_density_t_m3");
    expect((session.inactiveConditionalParameters ?? []).map((parameter) => parameter.parameterId))
      .toContain("excavated_soil_density_t_m3");
  });

  it("keeps the recognized 150 m through reload and opens the shared missing-parameter cards", () => {
    const userId = "strip-foundation-150-user";
    const prompt = "Устройство монолитного железобетонного ленточного фундамента 150 метров";
    const draft = createConsumerRepairRequestDraft({ consumerUserId: userId, problemText: prompt });
    const session = buildConsumerCanonicalPrecompileParameterSession({
      catalog: stripFoundationCatalog(),
      draftId: draft.draft.id,
      parameters: { total_axis_length_m: "150" },
      missingParameterIds: [
        "strip_width_m",
        "strip_height_m",
        "approved_reinforcement_schedule_weight_kg",
      ],
      createdAt: "2026-09-18T12:00:00.000Z",
    });
    saveConsumerRepairCanonicalParameterCollection({
      requestDraftId: draft.draft.id,
      consumerUserId: userId,
      problemText: prompt,
      session,
    });

    __simulateConsumerRepairRequestStoreReloadForTests();
    const restored = getConsumerRepairRequest(draft.draft.id);
    const length = restored.canonicalParameterSession?.parameters.find(
      (parameter) => parameter.parameterId === "total_axis_length_m",
    );
    expect(length).toMatchObject({ value: 150, source: "TEXT_EXTRACTED", state: "PROVIDED" });
    expect(restored.canonicalParameterSession?.blockingMissingParameterIds).toEqual([
      "strip_width_m",
      "strip_height_m",
      "approved_reinforcement_schedule_weight_kg",
    ]);

    const onApplyParamBatch = jest.fn();
    const noop = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairDraftPanel
          bundle={restored}
          aiAnswerRu={null}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onRemove={noop}
          onAddManual={noop}
          onAddCustom={noop}
          onApplyParamBatch={onApplyParamBatch}
        />,
      );
    });

    expect(renderer.root.findByProps({ testID: "consumer-estimate-parameter-collection" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "request-estimate-parameter-panel" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "editable-param-chip-total_axis_length_m" })
      .findByProps({ testID: "editable-param-popover-input" }).props.value).toBe("150");

    for (const [parameterId, value] of [
      ["strip_width_m", "0,6"],
      ["strip_height_m", "1,2"],
      ["approved_reinforcement_schedule_weight_kg", "4200"],
    ] as const) {
      act(() => {
        renderer.root.findByProps({ testID: `editable-param-chip-${parameterId}` })
          .findByProps({ testID: "editable-param-popover-input" }).props.onChangeText(value);
      });
    }
    act(() => {
      renderer.root.findByProps({ testID: "editable-param-batch-apply" }).props.onPress();
    });
    expect(onApplyParamBatch).toHaveBeenCalledWith([
      expect.objectContaining({ paramKey: "strip_width_m", rawValue: "0,6" }),
      expect.objectContaining({ paramKey: "strip_height_m", rawValue: "1,2" }),
      expect.objectContaining({ paramKey: "approved_reinforcement_schedule_weight_kg", rawValue: "4200" }),
    ]);
  });

  it("exposes every applicable backend blocker without transferring managed norms to the customer", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      ...stripFoundationCatalog(),
      catalogId: "canonical-work:base:paving_roads_landscape_exterior_asphalt_compact_standard",
      domain: "paving_roads_landscape",
      workKey: "asphalt_compact_standard",
      titleRu: "Уплотнение асфальтобетонного покрытия",
      parameterSchema: [
        {
          parameterId: "paving_area_m2",
          ordinal: 0,
          valueType: "decimal",
          unitId: "m2",
          titleRu: "Площадь уплотнения",
          required: true,
          defaultValue: null,
          constraints: { min: 0.000001 },
          visibilityRole: "USER_INPUT",
          valueSourceRole: "USER_MEASURED",
          formulaConsumers: ["formula:paving_area"],
        },
        {
          parameterId: "selected_roller_productivity_m2_per_machine_hour",
          ordinal: 1,
          valueType: "decimal",
          unitId: "m2/machine_hour",
          titleRu: "Производительность выбранного катка",
          required: true,
          defaultValue: null,
          constraints: { min: 0.000001 },
          visibilityRole: "USER_INPUT",
          valueSourceRole: "SELECTED_EQUIPMENT_PASSPORT",
          formulaConsumers: ["formula:roller_machine_hours"],
        },
        {
          parameterId: "traffic_class",
          ordinal: 2,
          valueType: "text",
          unitId: null,
          titleRu: "Категория расчётной транспортной нагрузки",
          required: true,
          defaultValue: null,
          constraints: {},
          visibilityRole: "USER_INPUT",
          valueSourceRole: "PROJECT_DOCUMENTATION",
          formulaConsumers: ["formula:traffic_class"],
        },
      ],
    };
    const session = buildConsumerCanonicalPrecompileParameterSession({
      catalog,
      draftId: "generic-asphalt-needs",
      parameters: { paving_area_m2: "15000" },
      missingParameterIds: [
        "selected_roller_productivity_m2_per_machine_hour",
        "traffic_class",
      ],
      textExtractedParameterIds: ["paving_area_m2"],
      createdAt: "2026-09-18T12:00:00.000Z",
    });

    expect(session.status).toBe("BLOCKING_REQUIRED");
    expect(session.blockingMissingParameterIds).toEqual([
      "selected_roller_productivity_m2_per_machine_hour",
      "traffic_class",
    ]);
    expect(session.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({
        parameterId: "paving_area_m2",
        value: 15000,
        source: "TEXT_EXTRACTED",
      }),
      expect.objectContaining({
        parameterId: "selected_roller_productivity_m2_per_machine_hour",
        value: null,
        source: "NORMATIVE_DERIVED",
        state: "BLOCKING_REQUIRED",
      }),
    ]));
    expect(session.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({
        parameterId: "traffic_class",
        value: null,
        state: "BLOCKING_REQUIRED",
      }),
    ]));
    expect(buildCanonicalParameterCards({ session, revision: null })).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "paving_area_m2", editable: true, missing: false }),
      expect.objectContaining({
        key: "selected_roller_productivity_m2_per_machine_hour",
        editable: true,
        missing: true,
        clickAction: "open_parameter_editor",
      }),
      expect.objectContaining({
        key: "traffic_class",
        editable: true,
        missing: true,
        clickAction: "open_parameter_editor",
      }),
    ]));

    const noop = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: "generic-asphalt-user", problemText: "Уплотнение асфальта 15000 м2",
    });
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairDraftPanel
          bundle={{
            ...draft,
            canonicalParameterSession: { ...session, draftId: draft.draft.id },
          }}
          aiAnswerRu={null}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onRemove={noop}
          onAddManual={noop}
          onAddCustom={noop}
          onApplyParamBatch={noop}
        />,
      );
    });
    const sourceGate = renderer.root.findByProps({
      testID: "editable-param-chip-selected_roller_productivity_m2_per_machine_hour",
    });
    expect(sourceGate.findAllByProps({ testID: "editable-param-popover-input" }).length).toBeGreaterThan(0);
    expect(sourceGate.findAll((node) =>
      node.props.children === "Нужен подтверждённый источник; вручную не вводится."
    )).toHaveLength(0);
    const trafficClass = renderer.root.findByProps({ testID: "editable-param-chip-traffic_class" });
    expect(trafficClass.findAllByProps({ testID: "editable-param-popover-input" }).length).toBeGreaterThan(0);
  });

  it("lets a restored draft continue when its only blockers are document references with no calculation consumer", () => {
    const ready = buildConsumerCanonicalPrecompileParameterSession({
      catalog: stripFoundationCatalog(),
      draftId: "legacy-document-only-draft",
      parameters: {
        total_axis_length_m: "150",
        strip_width_m: "0.7",
        strip_height_m: "1.2",
        approved_reinforcement_schedule_weight_kg: "25000",
      },
      missingParameterIds: [],
      textExtractedParameterIds: ["total_axis_length_m"],
      userExplicitParameterIds: [
        "strip_width_m",
        "strip_height_m",
        "approved_reinforcement_schedule_weight_kg",
      ],
      createdAt: "2026-09-18T12:30:00.000Z",
    });
    const legacyDocumentParameter = {
      ...ready.parameters[0],
      parameterId: "structural_drawing_reference",
      label: "Ссылка на конструктивный чертёж",
      description: "Номер листа рабочей документации",
      value: null,
      valueType: "string" as const,
      unit: null,
      source: "MISSING" as const,
      state: "BLOCKING_REQUIRED" as const,
      requiredLevel: "BLOCKING_REQUIRED" as const,
      affectsRows: [],
      affectsFormula: [],
      valid: false,
      validationIssues: ["VALUE_REQUIRED"],
    };
    const legacySession = {
      ...ready,
      status: "BLOCKING_REQUIRED" as const,
      parameters: [...ready.parameters, legacyDocumentParameter],
      blockingMissingParameterIds: ["structural_drawing_reference"],
    };
    const onApplyParamBatch = jest.fn();
    const noop = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: "legacy-document-only-user", problemText: "Ленточный фундамент 150 м",
    });
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairDraftPanel
          bundle={{
            ...draft,
            canonicalParameterSession: { ...legacySession, draftId: draft.draft.id },
          }}
          aiAnswerRu={null}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onRemove={noop}
          onAddManual={noop}
          onAddCustom={noop}
          onApplyParamBatch={onApplyParamBatch}
        />,
      );
    });

    expect(renderer.root.findAllByProps({
      testID: "editable-param-chip-structural_drawing_reference",
    })).toHaveLength(0);
    const continueButton = renderer.root.findByProps({
      testID: "editable-param-preliminary-continue",
    });
    act(() => continueButton.props.onPress());
    expect(onApplyParamBatch).toHaveBeenCalledWith([]);
  });
});
