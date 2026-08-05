export function waitForProductDetailBackgroundSlot(): Promise<void> {
  return new Promise((resolve) => {
    const requestIdle: unknown = Reflect.get(
      globalThis,
      "requestIdleCallback",
    );
    const requestFrame: unknown = Reflect.get(
      globalThis,
      "requestAnimationFrame",
    );
    const resolveOnIdle = () => {
      if (typeof requestIdle === "function") {
        requestIdle(resolve);
        return;
      }
      resolve();
    };
    if (typeof requestFrame === "function") {
      requestFrame(() => {
        requestFrame(resolveOnIdle);
      });
      return;
    }
    resolveOnIdle();
  });
}
