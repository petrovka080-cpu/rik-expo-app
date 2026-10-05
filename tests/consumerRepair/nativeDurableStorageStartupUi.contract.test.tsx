import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import * as baselineCompile from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import * as canonicalClient from "../../src/lib/estimate/backendPlatform/canonicalEstimateClient";
import * as requestBinding from "../../src/lib/estimateStructuredPipeline/structuredEstimateRequestBinding";
import * as consumerService from "../../src/lib/consumerRequests/consumerRequestService";
import { __resetConsumerRepairRequestStoreForTests } from "../../src/lib/consumerRequests";
import { buildCanonicalConsumerRepairRevisionFixture } from "./canonicalConsumerRepairRevisionFixture";

const mockInitializeDurableStorage = jest.fn<Promise<void>, []>();
const mockRefreshAfterDurableHydration = jest.fn();
let settleInitialLaunchBuild: (() => void) | null = null;
let controllerMountCount = 0;
let mockPrepareCanonicalEstimate: ((prompt: string, catalogId: string, draftId: string) => Promise<unknown>) | null = null;
const mockAcceptCanonicalBackendDraft = jest.fn((_bundle: unknown, options?: { onPublished?: () => void }) => options?.onPublished?.());

jest.mock("../../src/lib/consumerRequests/consumerRequestRepository", () => ({
  ...jest.requireActual("../../src/lib/consumerRequests/consumerRequestRepository"),
  awaitConsumerRepairBundleDurableCommit: jest.fn(async () => undefined),
  hydrateTransactionalConsumerRepairRequestStore: () =>
    mockInitializeDurableStorage(),
}));

jest.mock(
  "../../src/features/consumerRepair/ConsumerRepairRequestScreen",
  () => {
    const ReactRuntime = require("react") as typeof React;
    const { View } = require("react-native") as typeof import("react-native");
    return {
      shouldAutoPrepareInitialConsumerRepairRequest: (props: {
        initialProblemText?: string;
        initialDraftId?: string;
        launchId?: string;
        autoPrepare?: boolean;
        autoPdf?: boolean;
      }) => Boolean(
        !props.initialDraftId?.trim() &&
        (props.autoPrepare || props.autoPdf || (!props.launchId?.trim() && props.initialProblemText?.trim())),
      ),
      shouldDeferInitialHistoryLoad: (props: {
        initialProblemText?: string;
        initialDraftId?: string;
        launchId?: string;
        autoPrepare?: boolean;
        autoPdf?: boolean;
      }) => Boolean(
        !props.initialDraftId?.trim() &&
        (
          props.autoPrepare ||
          props.autoPdf ||
          (props.launchId?.trim() && props.initialProblemText?.trim()) ||
          (!props.launchId?.trim() && props.initialProblemText?.trim())
        )
      ),
      ConsumerRepairRequestScreenController: ReactRuntime.forwardRef<
        {
          refreshAfterDurableHydration: () => void;
          setPhotoCaptureStatusMessage: () => void;
          openMaterialCatalogFromCapturedPhoto: () => void;
          acceptCanonicalBackendDraft: typeof mockAcceptCanonicalBackendDraft;
        },
        { onInitialLaunchBuildSettled?: () => void; onPrepareCanonicalEstimate: NonNullable<typeof mockPrepareCanonicalEstimate> }
      >(
        function MockConsumerRepairRequestScreenController(props, ref) {
          settleInitialLaunchBuild = props.onInitialLaunchBuildSettled ?? null;
          mockPrepareCanonicalEstimate = props.onPrepareCanonicalEstimate;
          ReactRuntime.useEffect(() => {
            controllerMountCount += 1;
          }, []);
          ReactRuntime.useImperativeHandle(ref, () => ({
            refreshAfterDurableHydration: mockRefreshAfterDurableHydration,
            setPhotoCaptureStatusMessage: jest.fn(),
            openMaterialCatalogFromCapturedPhoto: jest.fn(),
            acceptCanonicalBackendDraft: mockAcceptCanonicalBackendDraft,
          }));
          return <View testID="consumer-repair-screen" />;
        },
      ),
    };
  },
);

jest.mock(
  "../../src/features/consumerRepair/useConsumerRepairPhotoCaptureController",
  () => ({
    useConsumerRepairPhotoCaptureController: () => ({
      openPhotoForMaterialRecognition: jest.fn(),
      flow: null,
    }),
  }),
);

// The container must be loaded after its dependency factories are registered.
// eslint-disable-next-line import/first
import {
  ConsumerRepairRequestScreen,
  rememberRequestEstimateCanonicalDeepLinkSessionWorkspace,
  requestEstimateCanonicalDeepLinkWorkspaceDraftPlan,
  requestEstimateCanonicalDeepLinkSessionWorkspaceDraftId,
  requestEstimateControllerWorkspaceKey,
  requestEstimateFreshBuildKey,
  shouldPublishInitialConsumerCanonicalPreview,
  canonicalEstimatePreviewIsExplicitValidationFixture,
  canonicalEstimatePreviewSaveStatusRu,
} from "../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer";

describe("consumer repair durable storage startup UI", () => {
  it("labels only an explicitly marked immutable fixture and keeps missing quantity facts mandatory in preview copy", () => {
    expect(canonicalEstimatePreviewIsExplicitValidationFixture(" ДЕМО / VALIDATION_FIXTURE: переход35м")).toBe(true);
    expect(canonicalEstimatePreviewIsExplicitValidationFixture("Реальный объект, пример ДЕМО / VALIDATION_FIXTURE: внутри текста")).toBe(false);
    expect(canonicalEstimatePreviewIsExplicitValidationFixture(null)).toBe(false);
    expect(canonicalEstimatePreviewSaveStatusRu({ saved: true, preliminaryNeedCount: 1909 }))
      .toContain("Для полного расчёта нужны исходные сведения");
    expect(canonicalEstimatePreviewSaveStatusRu({ saved: true, preliminaryNeedCount: 1909 }))
      .toContain("Полный итог не рассчитан");
    expect(canonicalEstimatePreviewSaveStatusRu({ saved: true, preliminaryNeedCount: 0 }))
      .toContain("проверьте количества, источники и цены");
    expect(canonicalEstimatePreviewSaveStatusRu({ saved: false, preliminaryNeedCount: 1909 }))
      .toBe("Сохраняем смету в черновике…");
  });

  it("keeps ordinary parameter/row amendments in their existing editor", () => {
    expect(shouldPublishInitialConsumerCanonicalPreview({})).toBe(false);
    expect(shouldPublishInitialConsumerCanonicalPreview({ showInitialPreview: false })).toBe(false);
    expect(shouldPublishInitialConsumerCanonicalPreview({ showInitialPreview: true })).toBe(true);
  });
  it("reuses one bounded transient draft for sequential canonical deep links", () => {
    const firstRevisionId = "4aa65e39-a938-4a98-8309-94aeb60d1ba0";
    const secondRevisionId = "0f6ad5bb-5664-4e9f-bb4a-0f4d008292c4";
    expect(requestEstimateCanonicalDeepLinkWorkspaceDraftPlan({
      routeRevisionId: firstRevisionId,
      requestedRevisionId: firstRevisionId,
    })).toEqual({
      targetDraftId: null,
      replaceCanonicalRevisionHistory: true,
      establishTransientWorkspace: true,
    });
    expect(requestEstimateCanonicalDeepLinkWorkspaceDraftPlan({
      routeRevisionId: secondRevisionId,
      requestedRevisionId: secondRevisionId,
      transientWorkspaceDraftId: "draft-transient-canonical-viewer",
    })).toEqual({
      targetDraftId: "draft-transient-canonical-viewer",
      replaceCanonicalRevisionHistory: true,
      establishTransientWorkspace: false,
    });
    expect(requestEstimateControllerWorkspaceKey({
      initialCanonicalRevisionId: firstRevisionId,
    })).toBe("canonical-revision-viewer");
    expect(requestEstimateControllerWorkspaceKey({
      initialCanonicalRevisionId: secondRevisionId,
    })).toBe("canonical-revision-viewer");
    const consumerUserId = "canonical-viewer-remount-user";
    expect(requestEstimateCanonicalDeepLinkSessionWorkspaceDraftId({
      consumerUserId,
      componentDraftId: null,
    })).toBeNull();
    rememberRequestEstimateCanonicalDeepLinkSessionWorkspace({
      consumerUserId,
      draftId: "draft-transient-canonical-viewer",
    });
    expect(requestEstimateCanonicalDeepLinkSessionWorkspaceDraftId({
      consumerUserId,
      componentDraftId: null,
    })).toBe("draft-transient-canonical-viewer");
    expect(requestEstimateCanonicalDeepLinkWorkspaceDraftPlan({
      routeRevisionId: secondRevisionId,
      requestedRevisionId: secondRevisionId,
      matchingRevisionDraftId: "draft-user-owned-revision",
      transientWorkspaceDraftId: "draft-transient-canonical-viewer",
    })).toEqual({
      targetDraftId: "draft-user-owned-revision",
      replaceCanonicalRevisionHistory: false,
      establishTransientWorkspace: false,
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    mockInitializeDurableStorage.mockReset();
    mockRefreshAfterDurableHydration.mockReset();
    settleInitialLaunchBuild = null;
    controllerMountCount = 0;
    mockPrepareCanonicalEstimate = null;
    mockAcceptCanonicalBackendDraft.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    __resetConsumerRepairRequestStoreForTests();
    jest.useRealTimers();
  });

  it.each(["open", "draft", "owner", "fingerprint"] as const)("preserves the saved manual preview's exact workspace through pending hydration: %s", async (scenario) => {
    const prompt = "Окраска стен 50 м²";
    const owner = "manual-preview-owner";
    const aiDraft = buildCanonicalConsumerRepairRevisionFixture(prompt);
    const bundle = consumerService.createConsumerRepairRequestDraft({ consumerUserId: owner, problemText: prompt, aiDraft });
    const revisionId = String(bundle.items[0].sourceParameters?.canonicalBackendRevisionId);
    const releaseId = String(bundle.items[0].sourceParameters?.canonicalBackendReleaseId);
    jest.spyOn(baselineCompile, "compileConsumerCanonicalBaseline").mockResolvedValue({
      payload: { workTitle: prompt, canonicalBackend: { revisionId, releaseId } }, rows: [],
    } as never);
    jest.spyOn(requestBinding, "buildStructuredEstimateRequestDraft").mockReturnValue(aiDraft);
    const upsert = jest.spyOn(consumerService, "upsertConsumerRepairCanonicalBackendDraft").mockReturnValue(bundle);
    jest.spyOn(canonicalClient, "getCanonicalEstimateRevision").mockResolvedValue({ revisionId, releaseId } as never);
    mockInitializeDurableStorage.mockResolvedValueOnce();
    const props = { consumerUserId: owner, initialProblemText: prompt, launchId: "manual-preview-launch", launchFingerprint: "manual-preview-fingerprint", autoPrepare: false };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<ConsumerRepairRequestScreen {...props} />); });
    let persistence!: Promise<unknown>;
    await act(async () => {
      if (!mockPrepareCanonicalEstimate) throw new Error("prepare_callback_missing");
      persistence = mockPrepareCanonicalEstimate(prompt, "canonical-work:test:consumer-history-fixture", bundle.draft.id);
      await Promise.resolve();
    });
    await act(async () => { await persistence; });
    expect(renderer.root.findByProps({ testID: "consumer-estimate-open-full-estimate" }).props.disabled).toBe(false);
    mockInitializeDurableStorage.mockImplementation(() => new Promise<void>(() => undefined));
    await act(async () => { renderer.update(<ConsumerRepairRequestScreen {...props} initialDraftId={bundle.draft.id} />); });
    expect(mockInitializeDurableStorage).toHaveBeenCalledTimes(2);
    expect(controllerMountCount).toBe(1);
    expect(renderer.root.findAllByProps({ testID: "consumer-repair-exact-draft-hydration-gate" })).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: "consumer-repair-screen" })).toBeTruthy();
    const open = renderer.root.findByProps({ testID: "consumer-estimate-open-full-estimate" }).props.onPress;
    if (scenario === "open") {
      let publish: (() => void) | undefined;
      mockAcceptCanonicalBackendDraft.mockImplementationOnce((_bundle, options) => { publish = options?.onPublished; });
      await act(async () => { open(); open(); });
      expect(mockAcceptCanonicalBackendDraft).toHaveBeenCalledTimes(1);
      expect(mockAcceptCanonicalBackendDraft.mock.calls[0]?.[0]).toBe(bundle);
      expect(renderer.root.findByProps({ testID: "consumer-estimate-meaningful-preview" })).toBeTruthy();
      await act(async () => { if (!publish) throw new Error("publication_callback_missing"); publish(); });
      expect(controllerMountCount).toBe(1);
      expect(renderer.root.findByProps({ testID: "consumer-repair-screen" })).toBeTruthy();
    } else {
      const nextProps = { ...props, initialDraftId: scenario === "draft" ? "another-cold-draft" : bundle.draft.id,
        consumerUserId: scenario === "owner" ? "another-owner" : owner,
        launchFingerprint: scenario === "fingerprint" ? "another-fingerprint" : props.launchFingerprint };
      await act(async () => { renderer.update(<ConsumerRepairRequestScreen {...nextProps} />); });
      await act(async () => { open(); });
      expect(mockAcceptCanonicalBackendDraft).not.toHaveBeenCalled();
      expect(renderer.root.findByProps({ testID: "consumer-repair-exact-draft-hydration-gate" })).toBeTruthy();
    }
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-meaningful-preview" })).toHaveLength(0);
    await act(async () => { renderer.unmount(); });
  });

  it("gates history-backed startup and offers retry after the 3 second hydration bound", async () => {
    mockInitializeDurableStorage.mockImplementationOnce(
      () => new Promise<void>(() => undefined),
    );
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<ConsumerRepairRequestScreen consumerUserId="consumer-test-user" />);
    });

    expect(renderer.root.findAllByProps({ testID: "consumer-repair-screen" })).toHaveLength(0);
    expect(renderer.root.findByProps({
      testID: "consumer-repair-exact-draft-hydration-gate",
    })).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: "consumer-repair-storage-hydrating" }),
    ).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(3_001);
      await Promise.resolve();
    });

    expect(
      renderer.root.findByProps({ testID: "consumer-repair-storage-recovery" }),
    ).toBeTruthy();
    mockInitializeDurableStorage.mockResolvedValueOnce();

    await act(async () => {
      renderer.root
        .findByProps({ testID: "consumer-repair-storage-try-again" })
        .props.onPress();
      await Promise.resolve();
    });

    expect(mockInitializeDurableStorage).toHaveBeenCalledTimes(2);
    // The gated controller mounts from the now-hydrated repository; there was
    // no earlier mounted instance that needed an imperative refresh.
    expect(mockRefreshAfterDurableHydration).toHaveBeenCalledTimes(0);
    expect(renderer.root.findByProps({ testID: "consumer-repair-screen" })).toBeTruthy();
    expect(
      renderer.root.findAllByProps({ testID: "consumer-repair-storage-recovery" }),
    ).toHaveLength(0);
    await act(async () => {
      renderer.unmount();
    });
  });

  it("does not mount an exact draft controller before its transactional pointer is hydrated", async () => {
    let resolveHydration!: () => void;
    mockInitializeDurableStorage.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        resolveHydration = resolve;
      }),
    );
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestScreen consumerUserId="consumer-test-user" initialDraftId="consumer_draft_transactional" />,
      );
    });

    expect(renderer.root.findAllByProps({ testID: "consumer-repair-screen" })).toHaveLength(0);
    expect(renderer.root.findByProps({
      testID: "consumer-repair-exact-draft-hydration-gate",
    })).toBeTruthy();

    await act(async () => {
      resolveHydration();
      await Promise.resolve();
    });

    expect(renderer.root.findByProps({ testID: "consumer-repair-screen" })).toBeTruthy();
    await act(async () => {
      renderer.unmount();
    });
  });

  it("automatically leaves recovery when the bounded hydration completes late", async () => {
    let resolveHydration!: () => void;
    mockInitializeDurableStorage.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        resolveHydration = resolve;
      }),
    );
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<ConsumerRepairRequestScreen consumerUserId="consumer-test-user" />);
    });
    await act(async () => {
      jest.advanceTimersByTime(3_001);
      await Promise.resolve();
    });
    expect(
      renderer.root.findByProps({ testID: "consumer-repair-storage-recovery" }),
    ).toBeTruthy();

    await act(async () => {
      resolveHydration();
      await Promise.resolve();
    });

    expect(mockInitializeDurableStorage).toHaveBeenCalledTimes(1);
    expect(mockRefreshAfterDurableHydration).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findAllByProps({ testID: "consumer-repair-storage-recovery" }),
    ).toHaveLength(0);
    await act(async () => {
      renderer.unmount();
    });
  });

  it("waits for the fresh initial build to settle before hydrating unrelated history", async () => {
    mockInitializeDurableStorage.mockResolvedValueOnce();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestScreen
          consumerUserId="consumer-test-user"
          initialProblemText="Новая точная асфальтовая работа"
          autoPrepare
        />,
      );
      await Promise.resolve();
    });

    expect(mockInitializeDurableStorage).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(120_000);
      await Promise.resolve();
    });

    expect(mockInitializeDurableStorage).not.toHaveBeenCalled();

    await act(async () => {
      if (!settleInitialLaunchBuild) throw new Error("initial_launch_settlement_callback_missing");
      settleInitialLaunchBuild();
      await Promise.resolve();
    });

    expect(mockInitializeDurableStorage).toHaveBeenCalledTimes(1);
    await act(async () => {
      renderer.unmount();
    });
  });

  it("keeps the fresh native workspace mounted when its durable draft id is bound to the route", async () => {
    mockInitializeDurableStorage.mockImplementation(
      () => new Promise<void>(() => undefined),
    );
    const baseProps = {
      consumerUserId: "consumer-test-user",
      initialProblemText: "\u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 5000 \u043c\u00b2",
      launchId: "request-estimate:native-asphalt-launch",
      launchFingerprint: "native-asphalt-fingerprint",
      autoPrepare: true,
    };
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<ConsumerRepairRequestScreen {...baseProps} />);
      await Promise.resolve();
    });
    expect(controllerMountCount).toBe(1);
    expect(mockInitializeDurableStorage).not.toHaveBeenCalled();

    await act(async () => {
      if (!settleInitialLaunchBuild) throw new Error("initial_launch_settlement_callback_missing");
      settleInitialLaunchBuild();
      await Promise.resolve();
    });
    expect(mockInitializeDurableStorage).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer.update(
        <ConsumerRepairRequestScreen
          {...baseProps}
          initialDraftId="consumer-draft-native-asphalt"
        />,
      );
      await Promise.resolve();
    });

    expect(controllerMountCount).toBe(1);
    expect(mockInitializeDurableStorage).toHaveBeenCalledTimes(2);
    expect(renderer.root.findByProps({ testID: "consumer-repair-screen" })).toBeTruthy();
    expect(renderer.root.findAllByProps({
      testID: "consumer-repair-exact-draft-hydration-gate",
    })).toHaveLength(0);

    await act(async () => {
      renderer.unmount();
    });
  });

  it("waits for an exact canonical revision launch to settle before hydrating history", async () => {
    mockInitializeDurableStorage.mockResolvedValueOnce();
    let renderer!: TestRenderer.ReactTestRenderer;
    const props = {
      consumerUserId: "consumer-test-user",
      initialCanonicalRevisionId: "4aa65e39-a938-4a98-8309-94aeb60d1ba0",
      launchId: "r5-exact-canonical-launch",
    };

    expect(requestEstimateFreshBuildKey(props)).toBe(props.launchId);
    await act(async () => {
      renderer = TestRenderer.create(<ConsumerRepairRequestScreen {...props} />);
      await Promise.resolve();
    });
    expect(controllerMountCount).toBe(1);
    expect(mockInitializeDurableStorage).not.toHaveBeenCalled();

    await act(async () => {
      if (!settleInitialLaunchBuild) throw new Error("exact_launch_settlement_callback_missing");
      settleInitialLaunchBuild();
      await Promise.resolve();
    });
    expect(mockInitializeDurableStorage).toHaveBeenCalledTimes(1);
    expect(mockRefreshAfterDurableHydration).not.toHaveBeenCalled();

    await act(async () => {
      renderer.update(
        <ConsumerRepairRequestScreen
          {...props}
          initialCanonicalRevisionId="0f6ad5bb-5664-4e9f-bb4a-0f4d008292c4"
        />,
      );
      await Promise.resolve();
    });
    expect(controllerMountCount).toBe(1);

    await act(async () => {
      renderer.unmount();
    });
  });

  it("isolates a new automation fingerprint and keeps one workspace key for its bound draft", async () => {
    mockInitializeDurableStorage.mockResolvedValue();
    let renderer!: TestRenderer.ReactTestRenderer;
    const prompt = "Электрика под ключ 100 кв м";

    await act(async () => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestScreen
          consumerUserId="consumer-test-user"
          initialProblemText={prompt}
          launchId="request-estimate:probe-launch"
          launchFingerprint="probe-fingerprint"
        />,
      );
      await Promise.resolve();
    });
    expect(controllerMountCount).toBe(1);

    await act(async () => {
      renderer.update(
        <ConsumerRepairRequestScreen
          consumerUserId="consumer-test-user"
          initialProblemText={prompt}
          launchId="request-estimate:auto-launch"
          launchFingerprint="auto-fingerprint"
          autoPrepare
        />,
      );
      await Promise.resolve();
    });
    expect(controllerMountCount).toBe(2);

    expect(requestEstimateControllerWorkspaceKey({
      initialProblemText: prompt,
      initialDraftId: "consumer-draft-electrical",
      launchFingerprint: "auto-fingerprint",
      autoPrepare: true,
    })).toBe("auto-fingerprint");

    await act(async () => {
      renderer.unmount();
    });
  });
});
