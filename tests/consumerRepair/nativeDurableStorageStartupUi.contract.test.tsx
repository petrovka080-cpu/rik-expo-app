import React from "react";
import TestRenderer, { act } from "react-test-renderer";

const mockInitializeDurableStorage = jest.fn<Promise<void>, []>();
const mockRefreshAfterDurableHydration = jest.fn();

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
      ConsumerRepairRequestScreenController: ReactRuntime.forwardRef(
        function MockConsumerRepairRequestScreenController(_props, ref) {
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
} from "../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer";

describe("consumer repair durable storage startup UI", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockInitializeDurableStorage.mockReset();
    mockRefreshAfterDurableHydration.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("mounts the request screen immediately and offers retry after the 3 second hydration bound", async () => {
    mockInitializeDurableStorage.mockImplementationOnce(
      () => new Promise<void>(() => undefined),
    );
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<ConsumerRepairRequestScreen />);
    });

    expect(renderer.root.findByProps({ testID: "consumer-repair-screen" })).toBeTruthy();
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
    expect(mockRefreshAfterDurableHydration).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findAllByProps({ testID: "consumer-repair-storage-recovery" }),
    ).toHaveLength(0);
    await act(async () => {
      renderer.unmount();
    });
  });
});
