import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("../../src/features/profile/currentProfileIdentity", () => ({
  loadCurrentProfileIdentity: jest.fn(async () => ({
    userId: "director-user",
    role: "director",
  })),
}));

import AiCommandCenterScreen from "../../src/features/ai/commandCenter/AiCommandCenterScreen";
import { buildAiCommandCenterViewModel } from "../../src/features/ai/commandCenter/buildAiCommandCenterViewModel";

const runtimeEvidence = {
  warehouse: {
    summary: "Warehouse safe-read evidence is present.",
    evidenceRefs: ["warehouse:stock:1"],
    lowStockFlags: ["reserved_pressure:cement"],
  },
};

describe("Command Center task-stream runtime", () => {
  it("builds from runtime when no static sourceCards are provided", () => {
    const vm = buildAiCommandCenterViewModel({
      auth: { userId: "director-user", role: "director" },
      runtimeEvidence,
    });

    expect(vm.runtimeStatus).toBe("loaded");
    expect(vm.taskStreamLoaded).toBe(true);
    expect(vm.cards).toHaveLength(1);
    expect(vm.source).toBe("bff:agent_task_stream_v1");
  });

  it("renders runtime status and real empty state when no evidence-backed cards exist", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(AiCommandCenterScreen, {
          auth: { userId: "director-user", role: "director" },
        }),
      );
    });

    const root = tree!.root;
    expect(root.findByProps({ testID: "ai.command.center.runtime-status" })).toBeTruthy();
    expect(root.findByProps({ testID: "ai.command.center.empty-state" })).toBeTruthy();
    expect(root.findAllByProps({ testID: "ai.command.center.card" })).toHaveLength(0);
  });
});
