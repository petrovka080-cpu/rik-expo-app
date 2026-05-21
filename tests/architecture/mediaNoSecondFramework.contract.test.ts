import { listMediaFiles } from "./mediaArchitectureTestHelpers";

test("media core stays in one approved media layer", () => {
  expect(listMediaFiles().every((file) => file.startsWith("src/lib/media/"))).toBe(true);
});
