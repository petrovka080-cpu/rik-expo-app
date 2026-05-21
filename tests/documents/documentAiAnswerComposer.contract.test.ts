import { documentProof } from "./documentTestFixtures";

test("document answer uses required Russian evidence sections", () => {
  const { answer } = documentProof();
  expect(answer.textRu).toContain("Коротко:");
  expect(answer.textRu).toContain("Что найдено в документе:");
  expect(answer.textRu).toContain("Связи в приложении:");
  expect(answer.textRu).toContain("Что не хватает:");
  expect(answer.textRu).toContain("Следующий шаг:");
  expect(answer.textRu).toContain("Статус:");
});
