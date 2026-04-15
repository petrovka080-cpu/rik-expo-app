import fs from "fs";
import path from "path";

import { reportBuyerTabsScrollToStartFailure } from "./buyer.observability";

const mockRecordSwallowedError = jest.fn((params: unknown) => params);

jest.mock("../../lib/observability/swallowedError", () => ({
  recordSwallowedError: (params: unknown) => mockRecordSwallowedError(params),
}));

describe("buyer observability boundary", () => {
  beforeEach(() => {
    mockRecordSwallowedError.mockClear();
  });

  it("preserves the buyer tabs scroll failure marker payload", () => {
    const error = new Error("scroll failed");

    reportBuyerTabsScrollToStartFailure(error);

    expect(mockRecordSwallowedError).toHaveBeenCalledWith({
      screen: "buyer",
      surface: "buyer_tabs",
      event: "buyer_tabs_scroll_to_start_failed",
      error,
      sourceKind: "ui:tabs",
      errorStage: "scroll_to_start",
      extra: undefined,
    });
  });

  it("keeps BuyerScreen behind the buyer observability boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/screens/buyer/BuyerScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("./buyer.observability");
    expect(source).not.toContain("../../lib/observability/swallowedError");
  });
});
