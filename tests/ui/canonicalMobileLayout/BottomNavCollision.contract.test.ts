import { createLayoutCollisionResult } from "../../../src/components/layout/appLayout";

describe("canonical bottom nav collision contract", () => {
  it("treats any overlap as a failed layout proof", () => {
    expect(
      createLayoutCollisionResult({
        route: "/office/foreman",
        checkedElement: "primary_action",
        overlaps: false,
        rect: { top: 640, bottom: 700, left: 16, right: 374 },
      }).passed,
    ).toBe(true);

    expect(
      createLayoutCollisionResult({
        route: "/office/foreman",
        checkedElement: "primary_action",
        overlaps: true,
        rect: { top: 720, bottom: 780, left: 16, right: 374 },
        overlappedWith: "bottom_nav",
      }).passed,
    ).toBe(false);
  });
});
