import React from "react";
import { Platform, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import React19SafeModal from "./React19SafeModal";

const mockRenderWebPortal = jest.fn((element: React.ReactElement) => element);

jest.mock("./createWebPortal", () => ({
  renderWebPortal: (element: React.ReactElement) => mockRenderWebPortal(element),
}));

const originalPlatformOs = Platform.OS;

describe("React19SafeModal web portal", () => {
  beforeEach(() => {
    mockRenderWebPortal.mockClear();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "web",
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
  });

  it("renders visible web modals through the portal helper and blocks underlying hit testing", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <React19SafeModal isVisible onBackdropPress={jest.fn()}>
          <Text>Preview</Text>
        </React19SafeModal>,
      );
    });

    expect(mockRenderWebPortal).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByProps({ testID: "react19-safe-modal-root" }).props.pointerEvents)
      .toBe("auto");

    act(() => {
      renderer.unmount();
    });
  });
});
