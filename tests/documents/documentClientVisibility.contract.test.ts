import { canRoleOpenDocument } from "../../src/lib/documents/evidenceIntelligence";
import { documentProof } from "./documentTestFixtures";

test("client cannot see private finance invoice", () => {
  const { document } = documentProof();
  expect(document.visibility.clientVisible).toBe(false);
  expect(canRoleOpenDocument({ document, requesterRole: "client" }).canOpen).toBe(false);
});
