/** @jest-environment jsdom */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { RequestCompanySelectionHost } from "./RequestCompanySelectionHost";
import { AuthAssuranceOverlay } from "./auth/AuthAssuranceOverlay";
import { chooseRequestCompany, getRequestCompanyPrompt } from "../lib/api/requestCompanyPrompt";
// The real installed RN Web Modal/ModalPortal renders under document.body.
// No Modal substitute and no react-test-renderer portal simulation.
jest.mock("react-native", () => jest.requireActual("react-native-web"));
const owner = { actorId: "actor-A", key: "actor-A:1", assertActive: () => {}, assertCurrent: async () => {} };
it("gates the actual body portal during assurance loss while retaining the navigator", async () => {
  const container = document.createElement("div"); document.body.appendChild(container);
  const root = createRoot(container);
  const view = (blocked: boolean, actorId = "actor-A") => <AuthAssuranceOverlay blocked={blocked} unavailable={false} onRetry={async () => true} onSignOut={async () => true}>
    <div data-testid="retained-navigator">navigator</div><RequestCompanySelectionHost actorId={actorId} blocked={blocked} />
  </AuthAssuranceOverlay>;
  await act(async () => { root.render(view(false)); });
  let task!: Promise<string>;
  await act(async () => { task = chooseRequestCompany([{ companyId: "B", name: "Company B secret" }], owner); void task.catch(() => {}); });
  expect(document.body.textContent).toContain("Company B secret");
  // Positive proof this was a real portal outside the hidden app ancestor.
  expect(container.textContent).not.toContain("Company B secret");
  await act(async () => { root.render(view(true)); });
  expect(document.body.textContent).not.toContain("Company B secret");
  expect(container.querySelector('[data-testid="retained-navigator"]')).not.toBeNull();
  expect(getRequestCompanyPrompt()).toBeNull();
  await expect(task).rejects.toThrow("отменено");
  await act(async () => { root.unmount(); }); container.remove();
});
it("old completion callbacks cannot clear the next prompt or settle twice", async () => {
  const container = document.createElement("div"); document.body.appendChild(container); const root = createRoot(container);
  await act(async () => { root.render(<RequestCompanySelectionHost actorId="actor-A" blocked={false} />); });
  let p1!: Promise<string>; await act(async () => { p1 = chooseRequestCompany([{ companyId: "A", name: "A" }], owner); });
  const old = getRequestCompanyPrompt()!; await act(async () => { old.select("A"); }); await expect(p1).resolves.toBe("A");
  let p2!: Promise<string>; await act(async () => { p2 = chooseRequestCompany([{ companyId: "B", name: "B" }], owner); });
  const current = getRequestCompanyPrompt()!; await act(async () => { old.cancel(); old.select("A"); });
  expect(getRequestCompanyPrompt()).toBe(current);
  await act(async () => { current.select("B"); }); await expect(p2).resolves.toBe("B");
  await act(async () => { root.unmount(); }); container.remove();
});
