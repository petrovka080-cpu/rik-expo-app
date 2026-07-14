type ProductBackgroundScheduler = {
  requestIdleCallback?: (callback: () => void) => number;
  requestAnimationFrame?: (callback: () => void) => number;
};

export function waitForProductDetailBackgroundSlot(): Promise<void> {
  return new Promise((resolve) => {
    const scheduler = globalThis as unknown as ProductBackgroundScheduler;
    const resolveOnIdle = () => {
      if (typeof scheduler.requestIdleCallback === "function") {
        scheduler.requestIdleCallback(resolve);
        return;
      }
      resolve();
    };
    const requestFrame = scheduler.requestAnimationFrame;
    if (typeof requestFrame === "function") {
      requestFrame(() => {
        requestFrame(resolveOnIdle);
      });
      return;
    }
    resolveOnIdle();
  });
}
