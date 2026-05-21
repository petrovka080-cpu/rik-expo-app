import { MEDIA_LIMITS } from "../../src/lib/media";

test("media limits are centralized", () => {
  expect(MEDIA_LIMITS).toMatchObject({
    maxPhotosPerGroup: 5,
    maxVideosPerGroup: 1,
    maxVideoDurationMs: 15000,
    maxAnalysisFramesPerVideo: 5,
  });
});
