import { canRoleOpenDocument } from "../../src/lib/documents/evidenceIntelligence";
import { documentProof } from "./documentTestFixtures";

test("document role access allows accountant and blocks unrelated contractor", () => {
  const { document } = documentProof();
  expect(canRoleOpenDocument({ document, requesterRole: "accountant" }).canOpen).toBe(true);
  expect(canRoleOpenDocument({ document, requesterRole: "contractor" }).canOpen).toBe(false);
});
