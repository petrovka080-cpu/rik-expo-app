import { createMediaContentHash } from "../../src/lib/media";

test("content hash is deterministic and does not need raw payload", () => {
  const input = { id: "a", mimeType: "image/jpeg", byteSize: 10 };
  expect(createMediaContentHash(input)).toBe(createMediaContentHash(input));
});
