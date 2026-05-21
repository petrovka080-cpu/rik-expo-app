import { documentMatrix } from "./documentTestFixtures";

test("document proof has no cross-role leaks", () => {
  expect(documentMatrix().cross_role_document_leaks_found).toBe(0);
  expect(documentMatrix().client_private_document_leaks_found).toBe(0);
});
