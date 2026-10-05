import React from "react";
import { Platform, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { ConsumerRepairHistory } from "../../src/features/consumerRepair/ConsumerRepairHistory";
import { ConsumerRepairRequestScreenController } from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
import { buildEmptyConsumerRepairApprovedHistoryPage, refreshLoadedApprovedHistoryPage } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import type { ConsumerRepairApprovedHistoryPage, ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests";
import * as repository from "../../src/lib/consumerRequests/consumerRequestRepository";
import * as service from "../../src/lib/consumerRequests/consumerRequestService";
import { logger } from "../../src/lib/logger";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("../../src/lib/consumerRequests/consumerRequestRepository", () => ({
  ...jest.requireActual("../../src/lib/consumerRequests/consumerRequestRepository"),
  hydrateNextTransactionalConsumerRepairHistoryPage: jest.fn(),
  hasUnhydratedTransactionalConsumerRepairBundles: jest.fn(() => true),
}));

function controller() {
  const instance = new ConsumerRepairRequestScreenController({
    consumerUserId: "consumer-test", onPrepareCanonicalEstimate: jest.fn(),
    onLoadCanonicalRevisionDraft: jest.fn(), onLoadCanonicalParameterSession: jest.fn(),
    onRecalculateCanonicalEstimate: jest.fn(), onSelectCanonicalCatalogItem: jest.fn(),
    onAddCanonicalCatalogItem: jest.fn(), onOpenPhotoForMaterialRecognition: jest.fn(),
  });
  const action = instance as unknown as {
    state: typeof instance.state;
    setState: (update: Partial<typeof instance.state>) => void;
    ensureHistoryLoaded: () => void;
    loadMoreApprovedHistory: () => Promise<void>;
  };
  action.setState = update => { action.state = { ...action.state, ...update }; };
  return action;
}

describe("incremental native history loading", () => {
  const originalOs = Platform.OS;
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });
    jest.spyOn(logger, "releaseEvidence").mockImplementation(() => undefined);
    repository.resetConsumerRepairRequestStoreForTests();
    jest.mocked(repository.hydrateNextTransactionalConsumerRepairHistoryPage).mockReset();
    jest.mocked(repository.hasUnhydratedTransactionalConsumerRepairBundles).mockReturnValue(true);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => originalOs });
    repository.resetConsumerRepairRequestStoreForTests();
  });

  it.each(["android", "web"])("publishes loaded drafts after each explicit step on %s and blocks duplicate requests", async os => {
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
    const first = createApprovedConsumerRepairRequest();
    const second = { ...first, draft: { ...first.draft, id: "second-compiled-draft", status: "draft" as const } };
    const listWorkspace = jest.spyOn(service, "listConsumerRepairWorkspaceHistory").mockReturnValue([]);
    jest.spyOn(service, "listConsumerRepairApprovedHistory").mockReturnValue(buildEmptyConsumerRepairApprovedHistoryPage());
    const action = controller();
    let release!: (count: number) => void;
    jest.mocked(repository.hydrateNextTransactionalConsumerRepairHistoryPage)
      .mockImplementationOnce(() => new Promise<number>(resolve => { release = resolve; }))
      .mockResolvedValueOnce(1);
    action.ensureHistoryLoaded();
    action.ensureHistoryLoaded();
    expect(action.state.historyLoading).toBe(true);
    expect(repository.hydrateNextTransactionalConsumerRepairHistoryPage).toHaveBeenCalledTimes(1);
    expect(repository.hydrateNextTransactionalConsumerRepairHistoryPage).toHaveBeenLastCalledWith(os === "web" ? undefined : 1);
    listWorkspace.mockReturnValue([first]);
    release(1);
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
    expect(action.state.historyLoading).toBe(false);
    expect(action.state.history).toEqual([first]);
    listWorkspace.mockReturnValue([first, second]);
    await action.loadMoreApprovedHistory();
    expect(repository.hydrateNextTransactionalConsumerRepairHistoryPage).toHaveBeenLastCalledWith(os === "web" ? 20 : 1);
    expect(action.state.history).toEqual([first, second]);
    expect(action.state.historyLoading).toBe(false);
  });

  it("shows pending/loading honestly and leaves native recovery under the user's explicit button", () => {
    const props = {
      revisionHistory: [], approvedHistoryPage: buildEmptyConsumerRepairApprovedHistoryPage(), selectedHistoryId: null,
      onOpenPdf: jest.fn(), onOpenDraft: jest.fn(), onToggleHistorySnapshot: jest.fn(),
      onEditHistoryDraft: jest.fn(), onSendHistoryToMarket: jest.fn(), onLoadMoreHistory: jest.fn(),
    };
    let renderer!: TestRenderer.ReactTestRenderer;
    const visibleText = () => renderer.root.findAllByType(Text).map(node =>
      React.Children.toArray(node.props.children).filter(child => typeof child === "string" || typeof child === "number").join("")
    ).join(" ");
    act(() => { renderer = TestRenderer.create(<ConsumerRepairHistory {...props} historyLoading />); });
    act(() => { renderer.root.findByProps({ testID: "consumer-repair-history-button" }).props.onPress(); });
    expect(visibleText()).toContain("Загружаем историю…");
    expect(visibleText()).not.toContain("Утверждённых смет пока нет.");
    expect(renderer.root.findByProps({ testID: "consumer-repair-history-load-more" }).props.disabled).toBe(true);
    expect(renderer.root.findByProps({ testID: "consumer-repair-history-scroll" }).props.onEndReached).toBeUndefined();
    act(() => { renderer.update(<ConsumerRepairHistory {...props} historyLoading={false} />); });
    expect(visibleText()).toContain("Сохранённые сметы ещё не загружены.");
    expect(visibleText()).toContain("Загрузить ещё");
    expect(props.onLoadMoreHistory).not.toHaveBeenCalled();
    act(() => { renderer.root.findByProps({ testID: "consumer-repair-history-load-more" }).props.onPress(); });
    expect(props.onLoadMoreHistory).toHaveBeenCalledTimes(1);
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "web" });
    act(() => { renderer.update(<ConsumerRepairHistory {...props} />); });
    expect(renderer.root.findByProps({ testID: "consumer-repair-history-scroll" }).props.onEndReached).toBe(props.onLoadMoreHistory);
    act(() => { renderer.unmount(); });
  });

  it("refreshes approval ordering without losing previously displayed pages", () => {
    const approved = createApprovedConsumerRepairRequest();
    const make = (id: string, createdAt: string, approvedAt: string): ConsumerRepairDraftBundle => ({
      ...approved, draft: { ...approved.draft, id, createdAt, approvedAt },
    });
    const existing = Array.from({ length: 41 }, (_, i) => make(`existing-${i}`, `2026-09-30T12:00:${String(i).padStart(2, "0")}Z`, new Date(Date.UTC(2026, 9, 4, 12, 0, 59 - i)).toISOString()));
    const recovered = make("old-draft-recent-approval", "2026-01-01T00:00:00Z", "2026-10-05T00:00:00Z");
    let ordered = existing;
    const load = (cursor: string | null, limit: number): ConsumerRepairApprovedHistoryPage => {
      const start = cursor ? ordered.findIndex(b => b.draft.approvedAt === cursor) + 1 : 0;
      const items = ordered.slice(start, start + limit);
      return {
        ...buildEmptyConsumerRepairApprovedHistoryPage(limit), items,
        records: items.map(b => ({ approvedEstimateId: b.draft.id, createdAt: b.draft.approvedAt } as ConsumerRepairApprovedHistoryPage["records"][number])),
        totalApprovedCount: ordered.length,
        nextCursorCreatedAt: start + items.length < ordered.length ? items.at(-1)?.draft.approvedAt ?? null : null,
      };
    };
    const previous = refreshLoadedApprovedHistoryPage(load(null, 20), load);
    expect(previous.records).toHaveLength(40);
    ordered = [recovered, ...existing];
    const refreshed = refreshLoadedApprovedHistoryPage(previous, load, 1);
    expect(refreshed.items[0]?.draft.id).toBe(recovered.draft.id);
    expect(refreshed.items.map(b => b.draft.id)).toEqual(ordered.map(b => b.draft.id));
    expect(new Set(refreshed.records.map(r => r.approvedEstimateId)).size).toBe(42);
  });
});
