import { realWork1000Result } from "./real1000TestHelpers";

jest.setTimeout(180_000);

test("real work 1000 has no object, operation, or method confusion", () => {
  const { matrix, results } = realWork1000Result();

  expect(matrix.object_confusion_found).toBe(false);
  expect(matrix.operation_confusion_found).toBe(false);
  expect(matrix.method_confusion_found).toBe(false);
  expect(results.some((item) => item.failures.some((failure) => /OBJECT_CONFUSION|OPERATION_CONFUSION|METHOD_CONFUSION/.test(failure)))).toBe(false);
});
