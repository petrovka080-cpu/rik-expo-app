import { readMobilePhotoSource } from "./mobilePhotoCaptureTestHelpers";

describe("single mobile photo capture service", () => {
  it("uses one canonical MobilePhotoCaptureService boundary", () => {
    const source = readMobilePhotoSource();
    expect(source).toContain("export interface MobilePhotoCaptureService");
    expect(source.match(/createMobilePhotoCaptureService/g)?.length).toBeGreaterThanOrEqual(1);
  });
});
