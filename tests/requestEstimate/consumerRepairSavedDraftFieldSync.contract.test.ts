import { Platform } from "react-native";
import { ConsumerRepairRequestScreenController, type ConsumerRepairRequestScreenControllerProps } from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
import {
  buildConsumerRepairSavedDraftEditorFields,
  buildConsumerRepairSelectedWorkEditableField,
  buildInitialConsumerRepairRequestState,
  selectedWorkFromBundle,
  syncConsumerRepairDraftFromScreenState,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  createConsumerRepairRequestDraft,
  listConsumerRepairWorkspaceHistory,
} from "../../src/lib/consumerRequests/consumerRequestService";
import {
  getConsumerRepairBundle,
  hydrateTransactionalConsumerRepairRequestStore,
  resetConsumerRepairRequestStoreForTests,
  saveConsumerRepairBundle,
  setConsumerRepairTransactionalDurableStoreForTests,
  simulateConsumerRepairRequestStoreReloadForTests,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests/consumerRequestTypes";
import {
  getCanonicalEstimateRevision, getCanonicalEstimateCatalogItem,
  getCanonicalEstimateParameterSessionSnapshot, getAllCanonicalEstimateRevisionRows,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateClient";
import {
  ESTIMATE_PLATFORM_API_VERSION, type CanonicalEstimateCatalogItem,
  type CanonicalEstimateRevisionRowView, type CanonicalEstimateRevisionView,
} from "../../src/lib/estimate/backendPlatform/contracts";
import { loadConsumerCanonicalRevisionDraftMapping } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { buildStructuredEstimateRequestDraft } from "../../src/lib/estimateStructuredPipeline/structuredEstimateRequestBinding";
import { CANONICAL_PARAMETER_CORE_SCHEMA_VERSION, type CanonicalParameterSession } from "../../src/lib/estimate/canonicalParameters";
import { flushTransactionalConsumerRepairWrites } from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import { InMemoryEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore.memory";
import { logger } from "../../src/lib/logger";
import { buildCanonicalConsumerRepairRevisionFixture } from "../consumerRepair/canonicalConsumerRepairRevisionFixture";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("expo-router", () => ({ router: { setParams: jest.fn(), replace: jest.fn(), push: jest.fn() } }));
jest.mock("../../src/lib/estimate/backendPlatform/canonicalEstimateClient", () => ({
  ...jest.requireActual("../../src/lib/estimate/backendPlatform/canonicalEstimateClient"),
  getCanonicalEstimateRevision: jest.fn(),
  getCanonicalEstimateCatalogItem: jest.fn(),
  getCanonicalEstimateParameterSessionSnapshot: jest.fn(),
  getAllCanonicalEstimateRevisionRows: jest.fn(),
}));

const owner = "saved-editor-fields-owner";
function fixture(suffix = "saved"): ConsumerRepairDraftBundle {
  const problemText = "ДЕМО / VALIDATION_FIXTURE: Укладка ламината 20 м² " + suffix;
  const selectedWork = {
    selectedCatalogWorkId: "canonical-work:test:consumer-history-fixture",
    selectedWorkKey: "canonical-work:test:consumer-history-fixture",
    selectedWorkTitleRu: "Укладка ламината",
    selectedWorkCategoryKey: "flooring",
    selectedWorkCategoryTitleRu: "Напольные покрытия",
    selectedWorkRawInput: problemText,
    selectedWorkSource: "user_selected" as const,
    selectedWorkResolverReGuessed: false as const,
  };
  const aiDraft = buildCanonicalConsumerRepairRevisionFixture(problemText, { selectedWork });
  aiDraft.items[0] = { ...aiDraft.items[0], quantity: 2.25 };
  aiDraft.items[2] = { ...aiDraft.items[2], quantity: null };
  return createConsumerRepairRequestDraft({
    consumerUserId: owner, problemText, city: "Бишкек",
    addressText: "Адрес сохранённого объекта 7",
    preferredTimeText: "После 10:00", contactPhone: "+996 700 111 222",
    aiDraft,
  });
}
async function backendLoadedFixture() {
  const problemText = "ДЕМО / VALIDATION_FIXTURE: сохранённая окраска стен 20,1 м²";
  const catalog: CanonicalEstimateCatalogItem = {
    catalogId: "canonical-work:base:plaster_paint_interior_paint_wall_paint_standard",
    releaseId: "c2222222-3333-4444-8555-666666666666",
    namespace: "global", workKey: "plaster_paint_interior_paint_wall_paint_standard",
    titleRu: "Окраска стен", domain: "interior_finishes", definitionVersion: 1,
    applicability: {}, professionalMetadata: {}, parameterSchema: [],
  };
  const revision: CanonicalEstimateRevisionView = {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    revisionId: "c1111111-2222-4333-8444-000000009001", parentRevisionId: null,
    releaseId: catalog.releaseId, catalogId: catalog.catalogId,
    definitionVersionId: "c3333333-4444-4555-8666-777777777777", definitionVersion: 1,
    revisionNumber: 1, status: "ready", sourceRequestText: problemText,
    displayTitleRu: "Окраска стен — 20,1 м²", currencyCode: "KGS",
    primaryMeasureParameterId: "area_m2", primaryMeasureValue: "20.1", primaryMeasureUnitId: "m2",
    parameters: { area_m2: "20.1" }, totals: { amount: "0" }, rowCount: 1,
    checksumSha256: "a".repeat(64), compilerVersion: "already-compiled-backend-fixture",
    createdAt: "2026-10-22T00:00:00.000Z",
    amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
    preliminaryNeeds: [{
      rowId: "resource:ppe", ordinal: 1, section: "Материалы", category: "material",
      titleRu: "Средства защиты", unitId: "set", quantity: null, unitPrice: null,
      needState: "QUANTITY_REQUIRED", missingParameterIds: ["ppe_quantity"],
      selected: true, procurementEligible: false, formulaId: "fixture:ppe",
      calculationTrace: {}, normativeTrace: [], needSha256: "d".repeat(64),
    }],
  };
  const rows: CanonicalEstimateRevisionRowView[] = [{
    rowId: "resource:paint", ordinal: 0, section: "Материалы", category: "material",
    titleRu: "Краска для внутренних стен", unitId: "l", quantity: "7.5",
    unitPrice: null, amount: null, currencyCode: "KGS", procurementEligible: true,
    includedInEstimate: true, includedInProcurement: true, ownershipStatus: "OWNED",
    calculationTrace: { formulaId: "fixture:paint", inputParameterIds: ["area_m2"] },
    normativeTrace: [{ sourceId: "ALREADY_COMPILED_FIXTURE", exactLocator: "Сохранённая backend-строка" }],
    rowSha256: "c".repeat(64),
  }];
  jest.mocked(getCanonicalEstimateRevision).mockResolvedValue(revision);
  jest.mocked(getCanonicalEstimateCatalogItem).mockResolvedValue(catalog);
  jest.mocked(getCanonicalEstimateParameterSessionSnapshot).mockResolvedValue({
    apiVersion: ESTIMATE_PLATFORM_API_VERSION, definitionVersionId: revision.definitionVersionId!,
    revision, catalog, parent: null,
  });
  jest.mocked(getAllCanonicalEstimateRevisionRows).mockResolvedValue(rows);
  // Use the real exact-revision loader and request binding. In particular, do not
  // hand-build selectedWork with two identical IDs as the older fixture does.
  const mapping = await loadConsumerCanonicalRevisionDraftMapping({ revisionId: revision.revisionId });
  const aiDraft = buildStructuredEstimateRequestDraft(mapping.payload);
  expect(aiDraft.selectedWork).toMatchObject({
    selectedCatalogWorkId: catalog.catalogId, selectedWorkKey: catalog.workKey,
    selectedWorkRawInput: problemText, selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  });
  expect(catalog.workKey).not.toBe(catalog.catalogId);
  const saved = createConsumerRepairRequestDraft({
    consumerUserId: owner, problemText, city: "Бишкек", addressText: "Тестовый объект 7",
    preferredTimeText: "После 10:00", contactPhone: "+996 700 111 222", aiDraft,
  });
  return { saved, revision, catalog };
}

type ControllerState = ConsumerRepairRequestScreenController["state"];
type MutableController = {
  state: ControllerState;
  setState: (update: Partial<ControllerState> | ((state: ControllerState) => Partial<ControllerState> | null), done?: () => void) => void;
  openDraftFromHistory: (id: string) => void;
  openExactCanonicalRevisionInConsumerEditor: (input: {
    revisionId: string; source: ConsumerRepairDraftBundle | null; successMessage: string;
  }) => Promise<void>;
  refreshAfterDurableHydration: () => void;
  ensureInitialCanonicalRevision: () => Promise<{ status: string; bundle: ConsumerRepairDraftBundle | null }>;
  syncCurrentDraftFields: (current: ConsumerRepairDraftBundle) => ConsumerRepairDraftBundle;
  createNew: () => void;
  openedCanonicalRouteRevisionId: string | null;
  acceptCanonicalBackendDraft: (bundle: ConsumerRepairDraftBundle) => void;
};
function controller(props: Partial<ConsumerRepairRequestScreenControllerProps> = {}): MutableController {
  const instance = new ConsumerRepairRequestScreenController({
    consumerUserId: owner, onPrepareCanonicalEstimate: jest.fn(),
    onLoadCanonicalRevisionDraft: jest.fn(), onLoadCanonicalParameterSession: jest.fn(),
    onRecalculateCanonicalEstimate: jest.fn(), onSelectCanonicalCatalogItem: jest.fn(),
    onAddCanonicalCatalogItem: jest.fn(), onOpenPhotoForMaterialRecognition: jest.fn(), ...props,
  });
  const action = instance as unknown as MutableController;
  action.setState = (update, done) => {
    const patch = typeof update === "function" ? update(action.state) : update;
    if (patch) action.state = { ...action.state, ...patch };
    done?.();
  };
  return action;
}
function session(bundle: ConsumerRepairDraftBundle): CanonicalParameterSession {
  const revisionId = String(bundle.items[0].sourceParameters?.canonicalBackendRevisionId);
  return {
    coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
    sessionId: "saved-fields-session", draftId: bundle.draft.id, revisionId,
    schemaId: "saved-fields-schema", schemaVersion: "1",
    workPassportId: bundle.draft.selectedWorkKey!, canonicalWorkKey: bundle.draft.selectedWorkKey!,
    calculationVersion: "1", status: "COMPLETE", parameters: [],
    blockingMissingParameterIds: [], contractMissingParameterIds: [],
    assumptionParameterIds: [], invalidParameterIds: [], fingerprint: "saved-fields-fingerprint",
    createdAt: bundle.draft.createdAt, updatedAt: bundle.draft.createdAt,
  };
}
function prepareRevisionRead(bundle: ConsumerRepairDraftBundle): string {
  const revisionId = String(bundle.items[0].sourceParameters?.canonicalBackendRevisionId);
  jest.mocked(getCanonicalEstimateRevision).mockResolvedValue({
    revisionId, releaseId: bundle.items[0].sourceParameters?.canonicalBackendReleaseId,
    status: "ready",
  } as CanonicalEstimateRevisionView);
  return revisionId;
}
function foreignEditorFields() {
  return {
    problemText: "Другой несохранённый запрос",
    repairType: "electrical", city: "Другой город", addressText: "Чужой адрес",
    preferredTimeText: "Другое время", contactPhone: "+996 700 999 888",
    selectedWork: {
      selectedWorkKey: "foreign-work", selectedTitleRu: "Другие работы",
      selectedCategoryKey: "electrical" as const, selectedCategoryTitleRu: "Электромонтаж",
      rawInput: "Другой запрос", source: "user_selected" as const, resolverReGuessed: false as const,
    },
  };
}

describe("saved consumer editor fields on native cold restore", () => {
  const originalOs = Platform.OS;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let durable: InMemoryEstimateRevisionDurableStore;
  let writes: jest.SpyInstance;
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { product: "ReactNative" } });
    resetConsumerRepairRequestStoreForTests();
    jest.spyOn(logger, "releaseEvidence").mockImplementation(() => undefined);
    durable = new InMemoryEstimateRevisionDurableStore();
    writes = jest.spyOn(durable, "writeBundleAtomically");
    setConsumerRepairTransactionalDurableStoreForTests(durable);
  });
  afterEach(async () => {
    await flushTransactionalConsumerRepairWrites();
    resetConsumerRepairRequestStoreForTests();
    jest.restoreAllMocks();
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => originalOs });
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  });
  async function coldRestore(saved: ConsumerRepairDraftBundle) {
    await flushTransactionalConsumerRepairWrites();
    writes.mockClear();
    simulateConsumerRepairRequestStoreReloadForTests();
    await hydrateTransactionalConsumerRepairRequestStore(saved.draft.id);
    return getConsumerRepairBundle(saved.draft.id);
  }

  it("restores the persisted nondefault repair type and all exact fields, then syncs without an event or native write", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const history = listConsumerRepairWorkspaceHistory(owner, { exactDraftId: saved.draft.id });
    const state = buildInitialConsumerRepairRequestState({ initialDraftId: saved.draft.id, history });
    expect(state.repairType).toBe("flooring");
    expect(state.problemText).toBe("");
    expect(state.selectedWork).toBeNull();
    expect(state.city).toBe(saved.draft.city);
    expect(state.addressText).toBe(saved.draft.addressText);
    expect(state.preferredTimeText).toBe(saved.draft.preferredTimeText);
    expect(state.contactPhone).toBe(saved.draft.contactPhone);
    const before = JSON.stringify(restored);
    const synced = syncConsumerRepairDraftFromScreenState(restored, state);
    await flushTransactionalConsumerRepairWrites();
    expect(synced).toBe(restored);
    expect(JSON.stringify(synced)).toBe(before);
    expect(synced.events.filter(event => event.eventType === "draft_updated")).toHaveLength(0);
    expect(writes).not.toHaveBeenCalled();
    expect(synced.items[0].quantity).toBe(2.25);
    expect(synced.items[0].unitPrice).toBeNull();
    expect(synced.items[2].quantity).toBeNull();
    expect(synced.items[0].sourceParameters).toEqual(saved.items[0].sourceParameters);
  });

  it("persists a genuine field edit after cold restoration, retaining work identity, prices and quantities", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const state = buildInitialConsumerRepairRequestState({ initialDraftId: saved.draft.id, history: [restored] });
    const changed = syncConsumerRepairDraftFromScreenState(restored, {
      ...state, city: "Ош", addressText: "Новый адрес 9",
      preferredTimeText: "После 14:00", contactPhone: "+996 700 333 444",
    });
    await flushTransactionalConsumerRepairWrites();
    expect(writes).toHaveBeenCalledTimes(1);
    expect(changed.events.filter(event => event.eventType === "draft_updated")).toHaveLength(1);
    const persisted = await durable.recoverLastValid(saved.draft.id);
    expect(persisted?.draft).toMatchObject({
      repairType: "flooring", city: "Ош", addressText: "Новый адрес 9",
      preferredTimeText: "После 14:00", contactPhone: "+996 700 333 444",
      problemText: saved.draft.problemText, selectedWorkKey: saved.draft.selectedWorkKey,
      selectedWorkRawInput: saved.draft.selectedWorkRawInput,
    });
    expect(persisted?.items).toEqual(restored.items);
  });

  it("an intentional history open replaces every foreign workspace field and does not enqueue an unchanged save", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const action = controller();
    action.state = { ...action.state, ...foreignEditorFields(), history: [restored] };
    action.openDraftFromHistory(saved.draft.id);
    expect(action.state).toMatchObject(buildConsumerRepairSavedDraftEditorFields(restored));
    expect(action.state.selectedWork).toBeNull();
    expect(syncConsumerRepairDraftFromScreenState(restored, action.state)).toBe(restored);
    await flushTransactionalConsumerRepairWrites();
    expect(writes).not.toHaveBeenCalled();
  });

  it("an exact asynchronous open restores owned fields and preserves the saved selection", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const revisionId = prepareRevisionRead(restored);
    const action = controller({ onLoadCanonicalParameterSession: jest.fn(async () => session(restored)) });
    action.state = { ...action.state, ...foreignEditorFields() };
    await action.openExactCanonicalRevisionInConsumerEditor({ revisionId, source: restored, successMessage: "Открыта" });
    expect(action.state).toMatchObject(buildConsumerRepairSavedDraftEditorFields(restored, {
      selectedWork: selectedWorkFromBundle(restored),
    }));
    expect(syncConsumerRepairDraftFromScreenState(restored, action.state)).toBe(restored);
    await flushTransactionalConsumerRepairWrites();
    expect(writes).not.toHaveBeenCalled();
  });

  it("a late exact response cannot attach the old bundle to new work or pass its draft ID to the next real prepare", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const revisionId = prepareRevisionRead(restored);
    let complete!: (value: CanonicalParameterSession) => void;
    const load = jest.fn(() => new Promise<CanonicalParameterSession>(resolve => { complete = resolve; }));
    const prepare = jest.fn<ReturnType<ConsumerRepairRequestScreenControllerProps["onPrepareCanonicalEstimate"]>, Parameters<ConsumerRepairRequestScreenControllerProps["onPrepareCanonicalEstimate"]>>(async () => null);
    const action = controller({ onLoadCanonicalParameterSession: load, onPrepareCanonicalEstimate: prepare });
    action.state = { ...action.state, ...foreignEditorFields() };
    const opening = action.openExactCanonicalRevisionInConsumerEditor({ revisionId, source: restored, successMessage: "Открыта" });
    for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    const newer = {
      ...foreignEditorFields(), problemText: "Новый ввод после начала открытия", city: "Новый город",
      addressText: "Новый адрес", preferredTimeText: "Новое время", contactPhone: "+996 700 555 666",
      selectedWork: { ...foreignEditorFields().selectedWork, selectedWorkKey: "new-electrical-choice" },
    };
    action.state = { ...action.state, ...newer };
    complete(session(restored));
    await opening;
    expect(action.state).toMatchObject(newer);
    expect(action.state.bundle).toBeNull();
    expect(action.openedCanonicalRouteRevisionId).toBeNull();
    expect(writes).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
    const savedBeforePrepare = JSON.stringify(getConsumerRepairBundle(saved.draft.id));
    const prepared = await action.ensureInitialCanonicalRevision();
    await flushTransactionalConsumerRepairWrites();
    expect(prepare).toHaveBeenCalledTimes(1);
    const nextDraftId = String(prepare.mock.calls[0][2]);
    expect(nextDraftId).not.toBe(saved.draft.id);
    expect(prepared.bundle?.draft.id).toBe(nextDraftId);
    expect(prepare.mock.calls[0][1]).toBe("new-electrical-choice");
    expect(writes.mock.calls.every(call => call[0] !== saved.draft.id)).toBe(true);
    expect(JSON.stringify(getConsumerRepairBundle(saved.draft.id))).toBe(savedBeforePrepare);
    expect(await durable.recoverLastValid(saved.draft.id)).toEqual(restored);
  });

  it("late initial hydration leaves a newer composer unattached to the old saved draft", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const action = controller({ initialDraftId: saved.draft.id });
    action.state = {
      ...action.state,
      ...buildInitialConsumerRepairRequestState({ initialDraftId: saved.draft.id, history: [] }),
      city: "Новый город во время загрузки", problemText: "Новый ввод во время загрузки",
    };
    action.refreshAfterDurableHydration();
    expect(action.state.bundle).toBeNull();
    expect(action.state.city).toBe("Новый город во время загрузки");
    expect(action.state.problemText).toBe("Новый ввод во время загрузки");
    expect(action.state.selectedWork).toBeNull();
    expect(action.state.repairType).toBe("Ремонт");
    expect(action.state.addressText).toBe("");
    expect(getConsumerRepairBundle(saved.draft.id)).toEqual(restored);
    expect(writes).not.toHaveBeenCalled();
  });

  it("same-target scalar edits survive the late exact response and sync only to that owned draft", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const revisionId = prepareRevisionRead(restored);
    let complete!: (value: CanonicalParameterSession) => void;
    const load = jest.fn(() => new Promise<CanonicalParameterSession>(resolve => { complete = resolve; }));
    const action = controller({ onLoadCanonicalParameterSession: load });
    action.state = { ...action.state, ...buildConsumerRepairSavedDraftEditorFields(restored), bundle: restored };
    const opening = action.openExactCanonicalRevisionInConsumerEditor({ revisionId, source: restored, successMessage: "Открыта" });
    for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
    action.state = { ...action.state, city: "Ош", addressText: "Адрес после начала открытия" };
    complete(session(restored));
    await opening;
    expect(action.state.bundle?.draft.id).toBe(saved.draft.id);
    expect(action.state.city).toBe("Ош");
    expect(action.state.addressText).toBe("Адрес после начала открытия");
    expect(writes).not.toHaveBeenCalled();
    const synced = syncConsumerRepairDraftFromScreenState(action.state.bundle!, action.state);
    await flushTransactionalConsumerRepairWrites();
    expect(writes).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls[0][0]).toBe(saved.draft.id);
    expect(synced.draft.repairType).toBe("flooring");
    expect(synced.items).toEqual(restored.items);
  });

  it("late initial hydration merges scalar edits only while the original exact draft composer still owns them", async () => {
    const saved = fixture();
    await coldRestore(saved);
    const action = controller({ initialDraftId: saved.draft.id });
    action.state = {
      ...action.state,
      ...buildInitialConsumerRepairRequestState({ initialDraftId: saved.draft.id, history: [] }),
      city: "Ош",
    };
    action.refreshAfterDurableHydration();
    expect(action.state.bundle?.draft.id).toBe(saved.draft.id);
    expect(action.state.city).toBe("Ош");
    expect(action.state.addressText).toBe(saved.draft.addressText);
    expect(action.state.repairType).toBe("flooring");
    expect(writes).not.toHaveBeenCalled();
  });

  it("does not carry scalar edits from a former different draft into the late exact target", async () => {
    const target = fixture("target");
    const former = fixture("former");
    const restored = await coldRestore(target);
    await hydrateTransactionalConsumerRepairRequestStore(former.draft.id);
    const previous = getConsumerRepairBundle(former.draft.id);
    const targetBefore = JSON.stringify(getConsumerRepairBundle(target.draft.id));
    const revisionId = prepareRevisionRead(restored);
    let complete!: (value: CanonicalParameterSession) => void;
    const load = jest.fn(() => new Promise<CanonicalParameterSession>(resolve => { complete = resolve; }));
    const action = controller({ onLoadCanonicalParameterSession: load });
    action.state = { ...action.state, ...buildConsumerRepairSavedDraftEditorFields(previous), bundle: previous };
    const opening = action.openExactCanonicalRevisionInConsumerEditor({ revisionId, source: restored, successMessage: "Открыта" });
    for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
    action.state = { ...action.state, city: "Город, изменённый у прежнего объекта" };
    complete(session(restored));
    await opening;
    expect(action.state.bundle?.draft.id).toBe(former.draft.id);
    expect(writes).not.toHaveBeenCalled();
    const synced = syncConsumerRepairDraftFromScreenState(action.state.bundle!, action.state);
    await flushTransactionalConsumerRepairWrites();
    expect(synced.draft.id).toBe(former.draft.id);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls[0][0]).toBe(former.draft.id);
    expect(JSON.stringify(getConsumerRepairBundle(target.draft.id))).toBe(targetBefore);
  });

  it("does not replace a newer child revision of the same draft with the late exact parent", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const revisionId = prepareRevisionRead(restored);
    let complete!: (value: CanonicalParameterSession) => void;
    const load = jest.fn(() => new Promise<CanonicalParameterSession>(resolve => { complete = resolve; }));
    const action = controller({ onLoadCanonicalParameterSession: load });
    action.state = { ...action.state, ...buildConsumerRepairSavedDraftEditorFields(restored), bundle: restored };
    const opening = action.openExactCanonicalRevisionInConsumerEditor({ revisionId, source: restored, successMessage: "Открыта" });
    for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
    const childRevisionId = "c9999999-2222-4333-8444-000000000001";
    const child = saveConsumerRepairBundle({
      ...restored,
      items: restored.items.map(item => ({
        ...item, sourceParameters: { ...item.sourceParameters, canonicalBackendRevisionId: childRevisionId },
      })),
    });
    await flushTransactionalConsumerRepairWrites();
    writes.mockClear();
    action.acceptCanonicalBackendDraft(child);
    const childState = action.state;
    const childBefore = JSON.stringify(getConsumerRepairBundle(saved.draft.id));
    complete(session(restored));
    await opening;
    expect(action.state).toBe(childState);
    expect(action.state.bundle?.items[0].sourceParameters?.canonicalBackendRevisionId).toBe(childRevisionId);
    expect(syncConsumerRepairDraftFromScreenState(child, action.state)).toBe(child);
    await flushTransactionalConsumerRepairWrites();
    expect(writes).not.toHaveBeenCalled();
    expect(JSON.stringify(getConsumerRepairBundle(saved.draft.id))).toBe(childBefore);
  });

  it("accepts the loader's own exact-target publication without treating it as foreign work", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const revisionId = prepareRevisionRead(restored);
    let action!: MutableController;
    const load = jest.fn(async () => {
      action.acceptCanonicalBackendDraft(restored);
      return restored;
    });
    action = controller({
      initialCanonicalRevisionId: revisionId,
      onLoadCanonicalRevisionDraft: load,
      onLoadCanonicalParameterSession: jest.fn(async () => session(restored)),
    });
    await action.openExactCanonicalRevisionInConsumerEditor({ revisionId, source: null, successMessage: "Открыта" });
    expect(load).toHaveBeenCalledTimes(1);
    expect(action.state.bundle?.draft.id).toBe(saved.draft.id);
    expect(action.state.city).toBe(saved.draft.city);
    expect(action.state.canonicalBackendParameterSession?.revisionId).toBe(revisionId);
    expect(syncConsumerRepairDraftFromScreenState(restored, action.state)).toBe(restored);
    expect(writes).not.toHaveBeenCalled();
  });

  it("a new empty workspace cancels the pending exact open even when its visible prompt is still empty", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const revisionId = prepareRevisionRead(restored);
    let complete!: (value: CanonicalParameterSession) => void;
    const load = jest.fn(() => new Promise<CanonicalParameterSession>(resolve => { complete = resolve; }));
    const action = controller({ initialCanonicalRevisionId: revisionId, onLoadCanonicalParameterSession: load });
    const opening = action.openExactCanonicalRevisionInConsumerEditor({ revisionId, source: restored, successMessage: "Открыта" });
    for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
    action.createNew();
    const afterNew = action.state;
    complete(session(restored));
    await opening;
    expect(action.state).toBe(afterNew);
    expect(action.state.bundle).toBeNull();
    expect(action.openedCanonicalRouteRevisionId).toBeNull();
    expect(writes).not.toHaveBeenCalled();
  });

  it("canonical publication aligns its saved repair type without creating an unchanged field update", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const action = controller();
    action.acceptCanonicalBackendDraft(restored);
    expect(action.state.repairType).toBe("flooring");
    expect(syncConsumerRepairDraftFromScreenState(restored, action.state)).toBe(restored);
    await flushTransactionalConsumerRepairWrites();
    expect(writes).not.toHaveBeenCalled();
  });

  it("uses the existing safe default only for a missing or blank legacy repair type", async () => {
    const saved = fixture();
    const restored = await coldRestore(saved);
    const blank = { ...restored, draft: { ...restored.draft, repairType: "  " } };
    const missing = { ...restored, draft: { ...restored.draft } };
    Reflect.deleteProperty(missing.draft, "repairType");
    expect(buildConsumerRepairSavedDraftEditorFields(blank).repairType).toBe("Ремонт");
    expect(buildConsumerRepairSavedDraftEditorFields(missing).repairType).toBe("Ремонт");
    expect(buildConsumerRepairSavedDraftEditorFields(restored).repairType).toBe("flooring");
    expect(writes).not.toHaveBeenCalled();
  });

  it("fresh incoming prompt hydration stays a new composer and never inherits a saved selection", async () => {
    const saved = fixture();
    await coldRestore(saved);
    const prompt = "Новый входящий запрос";
    const action = controller({ launchId: "new-incoming-prompt", initialProblemText: prompt });
    action.refreshAfterDurableHydration();
    expect(action.state.bundle).toBeNull();
    expect(action.state.problemText).toBe(prompt);
    expect(action.state.selectedWork).toBeNull();
    expect(action.state.repairType).toBe("Ремонт");
    expect(writes).not.toHaveBeenCalled();
  });
  it.each(["cold", "history", "exact"] as const)(
    "keeps the backend's distinct work key and catalog ID through native %s open, real ensure and sync without a write",
    async (openPath) => {
      const { saved, revision, catalog } = await backendLoadedFixture();
      const restored = await coldRestore(saved);
      expect(restored.draft.selectedWorkKey).toBe(catalog.workKey);
      expect(restored.draft.selectedCatalogWorkId).toBe(catalog.catalogId);
      const prepare = jest.fn<ReturnType<ConsumerRepairRequestScreenControllerProps["onPrepareCanonicalEstimate"]>, Parameters<ConsumerRepairRequestScreenControllerProps["onPrepareCanonicalEstimate"]>>(async () => null);
      const action = controller({
        ...(openPath === "cold" ? { initialDraftId: saved.draft.id } : {}),
        onPrepareCanonicalEstimate: prepare,
        onLoadCanonicalParameterSession: jest.fn(async () => session(restored)),
      });
      if (openPath === "history") action.openDraftFromHistory(saved.draft.id);
      if (openPath === "exact") await action.openExactCanonicalRevisionInConsumerEditor({
        revisionId: revision.revisionId, source: restored, successMessage: "Открыта",
      });
      expect(action.state.bundle?.draft.id).toBe(saved.draft.id);
      expect(action.state.selectedWork).toEqual(openPath === "exact" ? selectedWorkFromBundle(restored) : null);
      const before = JSON.stringify(getConsumerRepairBundle(saved.draft.id));
      const ensured = await action.ensureInitialCanonicalRevision();
      expect(ensured.status).toBe("READY");
      expect(ensured.bundle?.draft.id).toBe(saved.draft.id);
      expect(prepare).not.toHaveBeenCalled();
      expect(getCanonicalEstimateCatalogItem).toHaveBeenLastCalledWith(catalog.catalogId);
      const synced = action.syncCurrentDraftFields(action.state.bundle!);
      await flushTransactionalConsumerRepairWrites();
      expect(synced).toBe(action.state.bundle);
      expect(JSON.stringify(getConsumerRepairBundle(saved.draft.id))).toBe(before);
      expect(synced.events.filter(event => event.eventType === "draft_updated")).toHaveLength(0);
      expect(synced.draft).toEqual(restored.draft);
      expect(synced.items).toEqual(restored.items);
      expect(synced.items.some(item => item.quantity == null)).toBe(true);
      expect(writes).not.toHaveBeenCalled();
      expect(await durable.recoverLastValid(saved.draft.id)).toEqual(restored);
    },
  );

  it("persists an actual field edit once while retaining both backend-produced selection IDs and all row evidence", async () => {
    const { saved, catalog } = await backendLoadedFixture();
    const restored = await coldRestore(saved);
    const action = controller({ initialDraftId: saved.draft.id });
    action.state = { ...action.state, city: "Ош", addressText: "Новый адрес 9" };
    const synced = action.syncCurrentDraftFields(action.state.bundle!);
    await flushTransactionalConsumerRepairWrites();
    expect(writes).toHaveBeenCalledTimes(1);
    expect(synced.events.filter(event => event.eventType === "draft_updated")).toHaveLength(1);
    const persisted = await durable.recoverLastValid(saved.draft.id);
    expect(persisted?.draft).toMatchObject({
      city: "Ош", addressText: "Новый адрес 9", selectedWorkKey: catalog.workKey,
      selectedCatalogWorkId: catalog.catalogId, selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false, selectedWorkRawInput: restored.draft.selectedWorkRawInput,
    });
    expect(persisted?.items).toEqual(restored.items);
  });

  it("does not treat a newly entered prompt as unchanged merely because the saved selection lives in the bundle", async () => {
    const { saved } = await backendLoadedFixture();
    await coldRestore(saved);
    const action = controller({ initialDraftId: saved.draft.id });
    const nextPrompt = "ДЕМО / VALIDATION_FIXTURE: другой объём по новым данным объекта";
    action.state = { ...action.state, problemText: nextPrompt };
    const synced = action.syncCurrentDraftFields(action.state.bundle!);
    await flushTransactionalConsumerRepairWrites();
    expect(synced.draft.problemText).toBe(nextPrompt);
    expect(synced.events.filter(event => event.eventType === "draft_updated")).toHaveLength(1);
    expect(writes).toHaveBeenCalledTimes(1);
    expect((await durable.recoverLastValid(saved.draft.id))?.draft.problemText).toBe(nextPrompt);
  });

  it("retains an explicit different work choice and sends its exact ID through the real prepare path", async () => {
    const { saved } = await backendLoadedFixture();
    const restored = await coldRestore(saved);
    const prepare = jest.fn<ReturnType<ConsumerRepairRequestScreenControllerProps["onPrepareCanonicalEstimate"]>, Parameters<ConsumerRepairRequestScreenControllerProps["onPrepareCanonicalEstimate"]>>(async () => null);
    const action = controller({ initialDraftId: saved.draft.id, onPrepareCanonicalEstimate: prepare });
    const nextWork = {
      ...foreignEditorFields().selectedWork,
      selectedWorkKey: "canonical-work:test:new-electrical-work", rawInput: restored.draft.problemText!,
    };
    action.state = { ...action.state, selectedWork: nextWork };
    expect(buildConsumerRepairSelectedWorkEditableField({
      currentBundle: restored, problemText: action.state.problemText, selectedWork: nextWork,
    })).toMatchObject({ selectedCatalogWorkId: nextWork.selectedWorkKey, selectedWorkKey: nextWork.selectedWorkKey });
    await action.ensureInitialCanonicalRevision();
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0][1]).toBe(nextWork.selectedWorkKey);
    expect(action.state.selectedWork?.selectedWorkKey).toBe(nextWork.selectedWorkKey);
  });
});
