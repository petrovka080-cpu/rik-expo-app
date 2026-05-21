import { documentMatrix } from "./documentTestFixtures";

test("invoice 45 returns real golden numeric facts", () => {
  const matrix = documentMatrix();
  expect(matrix.invoice_45_amount_found).toBe(125000);
  expect(matrix.payment_77_amount_found).toBe(125000);
  expect(matrix.invoice_45_company_found).toBe(true);
});
