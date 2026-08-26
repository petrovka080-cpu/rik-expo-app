import { mobilePhotoStagingRelativePath } from "../../src/lib/mobilePhotoCapture/mobilePhotoLocalRepository";

describe("legacy Expo file URI safe photo staging", () => {
  it("keeps canonical identity out of URI-scheme delimiters in Android path segments", () => {
    const revisionId = "a7fc530d-7b3c-4013-9bb5-f561da7e00c2";
    const rowId = "drywall_ceiling:successor-r3:material:insulation_mat";
    const scanId = `estimate-line-photo:${revisionId}:${rowId}:1787150746584`;
    const captureId = `capture:${scanId}:OTHER:2026-08-19T14:46:02.616Z`;

    const relativePath = mobilePhotoStagingRelativePath({
      tenantId: "tenant:Киргизия/🏗️",
      requestId: scanId,
      revisionId,
      rowId,
      captureId,
      mimeType: "image/jpeg",
    });

    expect(relativePath).toMatch(/^mobile-photo-staging\/v2\/[a-f0-9]{2}\/[a-f0-9]{64}\.jpg$/u);
    expect(relativePath).not.toContain(":");
    expect(relativePath).not.toContain("..");
    expect(relativePath).not.toContain(revisionId);
    expect(relativePath).not.toContain(rowId);
    for (const component of relativePath.split("/")) {
      expect(Buffer.byteLength(component, "utf8")).toBeLessThanOrEqual(128);
    }
  });

  it("does not collide when long business IDs share the same prefix", () => {
    const common = `${"очень-длинный-id:".repeat(20)}../CON\\emoji🏗️`;
    const first = mobilePhotoStagingRelativePath({
      tenantId: common,
      requestId: `${common}:request`,
      revisionId: `${common}:revision`,
      rowId: `${common}:row-A`,
      captureId: `${common}:capture`,
      mimeType: "image/png",
    });
    const second = mobilePhotoStagingRelativePath({
      tenantId: common,
      requestId: `${common}:request`,
      revisionId: `${common}:revision`,
      rowId: `${common}:row-B`,
      captureId: `${common}:capture`,
      mimeType: "image/png",
    });

    expect(first).not.toBe(second);
    expect(first).toMatch(/\.png$/u);
    expect(second).toMatch(/\.png$/u);
  });
});
