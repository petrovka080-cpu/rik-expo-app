import fs from "fs";
import path from "path";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { View } from "react-native";

import ForemanSubcontractTab from "./ForemanSubcontractTab";

const mockUseForemanSubcontractController = jest.fn();

jest.mock("./hooks/useForemanSubcontractController", () => ({
  useForemanSubcontractController: (props: unknown) => mockUseForemanSubcontractController(props),
}));

describe("ForemanSubcontractTab controller extraction", () => {
  beforeEach(() => {
    mockUseForemanSubcontractController.mockReset();
  });

  it("delegates rendering to the extracted controller hook", async () => {
    mockUseForemanSubcontractController.mockReturnValue(
      React.createElement(
        View,
        null,
        React.createElement(View, { testID: "controller-content" }),
      ),
    );

    await act(async () => {
      TestRenderer.create(
        <ForemanSubcontractTab
          contentTopPad={16}
          onScroll={() => {}}
          dicts={{ objOptions: [], lvlOptions: [], sysOptions: [] }}
        />,
      );
    });

    expect(mockUseForemanSubcontractController).toHaveBeenCalledWith({
      contentTopPad: 16,
      onScroll: expect.any(Function),
      dicts: { objOptions: [], lvlOptions: [], sysOptions: [] },
    });
  });

  it("keeps the component as a thin wrapper over the extracted controller", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/screens/foreman/ForemanSubcontractTab.tsx"),
      "utf8",
    );

    expect(source).toContain("useForemanSubcontractController");
    expect(source).not.toContain("syncForemanAtomicDraft");
    expect(source).not.toContain("generateRequestPdfDocument");
    expect(source).not.toContain("listForemanSubcontracts");
    expect(source).not.toContain("useSafeAreaInsets");
  });
});
