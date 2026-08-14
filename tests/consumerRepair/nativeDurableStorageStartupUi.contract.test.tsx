import React from "react";
import TestRenderer, { act } from "react-test-renderer";

const mockInitializeDurableStorage = jest.fn<Promise<void>, []>();
const mockRefreshAfterDurableHydration = jest.fn();
let settleInitialLaunchBuild: (() => void) | null = null;
let controllerMountCount = 0;

jest.mock("../../src/lib/consumerRequests/consumerRequestRepository", () => ({
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
        },
        { onInitialLaunchBuildSettled?: () => void }
      >(
        function MockConsumerRepairRequestScreenController(props, ref) {
          settleInitialLaunchBuild = props.onInitialLaunchBuildSettled ?? null;
          ReactRuntime.useEffect(() => {
            controllerMountCount += 1;
          }, []);
          ReactRuntime.useImperativeHandle(ref, () => ({
            refreshAfterDurableHydration: mockRefreshAfterDurableHydration,
            setPhotoCaptureStatusMessage: jest.fn(),
            openMaterialCatalogFromCapturedPhoto: jest.fn(),
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
  requestEstimateControllerWorkspaceKey,
} from "../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer";

describe("consumer repair durable storage startup UI", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockInitializeDurableStorage.mockReset();
    mockRefreshAfterDurableHydration.mockReset();
    settleInitialLaunchBuild = null;
    controllerMountCount = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
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
