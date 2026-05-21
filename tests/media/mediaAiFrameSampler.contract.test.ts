import { sampleMediaVideoFrames } from "../../src/lib/media";

test("video frame sampler is capped at five frames", () => {
  const frames = sampleMediaVideoFrames({ durationMs: 15000, maxFrames: 10 });
  expect(frames).toHaveLength(5);
  expect(frames[4]?.timestampMs).toBe(15000);
});
