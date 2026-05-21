import { buildDocumentVisibilityPolicy } from "../../src/lib/documents/evidenceIntelligence";

test("document visibility is private and signed-url gated", () => {
  const policy = buildDocumentVisibilityPolicy({});
  expect(policy.clientVisible).toBe(false);
  expect(policy.requiresSignedUrl).toBe(true);
  expect(policy.rolesAllowed).toContain("accountant");
});
