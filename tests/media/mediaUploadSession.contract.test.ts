import { createMediaUploadSession } from "../../src/lib/media";
import { mediaDescriptors } from "./mediaTestFixtures";

test("media upload session validates descriptors before upload", () => {
  const session = createMediaUploadSession({
    id: "session-1",
    orgId: "org-1",
    ownerUserId: "u-1",
    ownerRole: "foreman",
    purpose: "work_evidence",
    descriptors: mediaDescriptors().fivePhotos,
    createdAt: "2026-05-21T00:00:00.000Z",
  });
  expect(session.status).toBe("validated");
  expect(session.descriptors).toHaveLength(5);
});
