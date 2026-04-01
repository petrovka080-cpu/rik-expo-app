import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import OfficeHubScreen, { OFFICE_CARDS } from "./OfficeHubScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("OfficeHubScreen", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("keeps office cards wired to nested office routes", () => {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });

    for (const card of OFFICE_CARDS) {
      renderer!.root.findByProps({ testID: `office-card-${card.key}` }).props.onPress();
    }

    expect(mockPush.mock.calls).toEqual(OFFICE_CARDS.map((card) => [card.route]));
  });
});
