import TestRenderer, { act } from "react-test-renderer";
import React from "react";

jest.mock("@expo/vector-icons", () => {
  const ReactModule = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => ReactModule.createElement(Text, null, name),
  };
});

jest.mock("../../src/features/profile/currentProfileIdentity", () => ({
  loadCurrentProfileIdentity: jest.fn(async () => ({
    userId: "director-user",
    role: "director",
    fullName: null,
    email: null,
    avatarUrl: null,
  })),
}));

import AiCommandCenterScreen from "../../src/features/ai/commandCenter/AiCommandCenterScreen";
import {
  buildAiCommandCenterViewModel,
} from "../../src/features/ai/commandCenter/buildAiCommandCenterViewModel";
import { aiCommandCenterTaskCards } from "./aiCommandCenter.fixture";

const directorAuth = { userId: "director-user", role: "director" } as const;

describe("AI Command Center view model contract", () => {
  it("renders from the role-scoped GET /agent/task-stream contract", () => {
    const vm = buildAiCommandCenterViewModel({
      auth: directorAuth,
      sourceCards: aiCommandCenterTaskCards,
    });

    expect(vm).toMatchObject({
      contractId: "ai_command_center_view_model_v1",
      endpoint: "GET /agent/task-stream",
      roleScoped: true,
      readOnly: true,
      evidenceRequired: true,
      mutationCount: 0,
      directMutationAllowed: false,
      directSupabaseFromUi: false,
      modelProviderFromUi: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
      source: "bff:agent_task_stream_v1",
    });
    expect(vm.cards.map((card) => card.id)).not.toContain("no-evidence-1");
    expect(vm.cards.every((card) => card.evidenceRefs.length >= 1)).toBe(true);
    expect(vm.sections.map((section) => section.title)).toEqual([
      "\u0421\u0440\u043e\u0447\u043d\u043e",
      "\u0414\u0435\u043d\u044c\u0433\u0438",
      "\u0417\u0430\u043a\u0443\u043f\u043a\u0438",
      "\u0421\u043a\u043b\u0430\u0434",
      "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
      "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a\u0438",
      "\u041e\u0442\u0447\u0451\u0442\u044b",
    ]);
  });

  it("renders the required runtime test IDs in the screen surface", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        React.createElement(AiCommandCenterScreen, {
          auth: directorAuth,
          sourceCards: aiCommandCenterTaskCards,
        }),
      );
    });

    const root = renderer!.root;
    expect(root.findByProps({ testID: "ai.command.center.screen" })).toBeTruthy();
    expect(root.findByProps({ testID: "ai.command.center.header" })).toBeTruthy();
    expect(root.findAllByProps({ testID: "ai.command.center.card" }).length).toBeGreaterThan(0);
    expect(root.findAllByProps({ testID: "ai.command.center.card.priority" }).length).toBeGreaterThan(0);
    expect(root.findAllByProps({ testID: "ai.command.center.card.evidence" }).length).toBeGreaterThan(0);
    expect(root.findAllByProps({ testID: "ai.command.center.card.approval-required" }).length).toBeGreaterThan(0);
    expect(root.findAllByProps({ testID: "ai.command.center.action.ask-why" }).length).toBeGreaterThan(0);
    expect(root.findAllByProps({ testID: "ai.command.center.action.open-source" }).length).toBeGreaterThan(0);
    expect(root.findAllByProps({ testID: "ai.command.center.action.create-draft" }).length).toBeGreaterThan(0);
    expect(root.findAllByProps({ testID: "ai.command.center.action.submit-for-approval" }).length).toBeGreaterThan(0);
  });
});
