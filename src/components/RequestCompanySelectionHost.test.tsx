import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Pressable } from "react-native";
import { RequestCompanySelectionHost } from "./RequestCompanySelectionHost";
import { chooseRequestCompany, getRequestCompanyPrompt } from "../lib/api/requestCompanyPrompt";
it("renders the actual explicit company choice and resolves its clicked target", async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<RequestCompanySelectionHost actorId="actor-A" blocked={false} />); });
  let task!: Promise<string>;
  act(() => { task = chooseRequestCompany([{ companyId: "A", name: "Компания А" }, { companyId: "B", name: "Компания Б" }], { actorId: "actor-A", key: "actor-A:0", assertActive: () => {}, assertCurrent: async () => {} }); });
  const choices = renderer.root.findAllByType(Pressable);
  act(() => { choices[1].props.onPress(); });
  await expect(task).resolves.toBe("B"); expect(getRequestCompanyPrompt()).toBeNull();
  act(() => { renderer.unmount(); });
});
