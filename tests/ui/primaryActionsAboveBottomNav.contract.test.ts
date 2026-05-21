import { createBottomNavCollisionCheck } from "../../src/components/layout/appLayout";

describe("primary actions above bottom nav", () => {
  it("marks overlap as a blocker and accepts actions above the nav top", () => {
    const clear = createBottomNavCollisionCheck({
      route: "/office/foreman",
      primaryActionVisible: true,
      primaryActionClickable: true,
      primaryActionRect: { top: 650, bottom: 700 },
      bottomNavRect: { top: 728, bottom: 800 },
    });

    const blocked = createBottomNavCollisionCheck({
      route: "/add",
      primaryActionVisible: true,
      primaryActionClickable: true,
      primaryActionRect: { top: 700, bottom: 760 },
      bottomNavRect: { top: 728, bottom: 800 },
    });

    expect(clear.overlapsBottomNav).toBe(false);
    expect(blocked.overlapsBottomNav).toBe(true);
  });
});
