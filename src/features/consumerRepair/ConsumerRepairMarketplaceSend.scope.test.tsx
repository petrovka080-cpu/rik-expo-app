import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairMarketplaceSend } from "./ConsumerRepairMarketplaceSend";

describe("consumer repair marketplace scope copy", () => {
  it("states that the handoff contains the selected operation, not the whole object", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairMarketplaceSend
          bundle={{
            draft: { status: "consumer_approved" },
            marketplaceLink: { status: "not_sent" },
          } as never}
        />,
      );
    });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain("полный применимый состав выбранной работы");
    expect(text).toContain("Это не смета всего объекта");
  });
});
