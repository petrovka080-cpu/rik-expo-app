/** @jest-environment jsdom */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { RequestCompanySelectionHost } from "./RequestCompanySelectionHost";
import { chooseRequestCompany, getRequestCompanyPrompt } from "../lib/api/requestCompanyPrompt";
// Use the installed real RN Web Modal/Pressable and body portal, as in the portal contract suite.
jest.mock("react-native", () => jest.requireActual("react-native-web"));
it("renders the actual explicit company choice and resolves its clicked target", async () => {
  const container = document.createElement("div"); document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<RequestCompanySelectionHost actorId="actor-A" blocked={false} />); });
    let task!: Promise<string>;
    await act(async () => {
      task = chooseRequestCompany([{ companyId: "A", name: "Компания А" }, { companyId: "B", name: "Компания Б" }], { actorId: "actor-A", key: "actor-A:0", assertActive: () => {}, assertCurrent: async () => {} });
      void task.catch(() => {}); // Cleanup may cancel an unsettled prompt if an earlier assertion fails.
    });
    expect(getRequestCompanyPrompt()?.choices).toEqual([{ companyId: "A", name: "Компания А" }, { companyId: "B", name: "Компания Б" }]);
    const buttons = Array.from(document.body.querySelectorAll<HTMLElement>('[role="button"]'));
    expect(buttons.map(button => button.textContent)).toEqual(["Компания А", "Компания Б", "Отмена"]);
    expect(container.textContent).not.toContain("Компания Б"); // The actual Modal is a body portal.
    const companyB = buttons.filter(button => button.textContent === "Компания Б");
    expect(companyB).toHaveLength(1);
    await act(async () => { companyB[0].dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await expect(task).resolves.toBe("B"); expect(getRequestCompanyPrompt()).toBeNull();
    expect(document.body.textContent).not.toContain("Компания А");
    expect(document.body.textContent).not.toContain("Компания Б");
  } finally {
    await act(async () => { root.unmount(); }); container.remove();
  }
});
