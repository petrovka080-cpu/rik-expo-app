import { sanitizeMediaMetadata } from "../../src/lib/media";

test("metadata sanitizer removes location and device metadata", () => {
  const result = sanitizeMediaMetadata({ gps: "42,74", width: 1200, deviceId: "private" });
  expect(result.safeMetadata).toEqual({ width: 1200 });
  expect(result.containsSensitiveInfo).toBe(true);
});
