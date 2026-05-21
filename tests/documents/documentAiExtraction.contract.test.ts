import { documentProof } from "./documentTestFixtures";

test("AI extraction returns invoice 45 facts as review-required suggestions", () => {
  const { extraction } = documentProof();
  expect(extraction.fields.amount?.value).toBe(125000);
  expect(extraction.fields.amount?.currency).toBe("KGS");
  expect(extraction.fields.companyName?.valueRu).toBe("ОсОО \"СтройМат\"");
  expect(extraction.finalFact).toBe(false);
  expect(extraction.fields.amount?.requiresReview).toBe(true);
});
