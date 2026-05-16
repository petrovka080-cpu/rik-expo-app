import { createCancellableDelay } from "../../src/lib/async/mapWithConcurrencyLimit";

describe("createCancellableDelay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("resolves as cancelled and clears the timer when cancelled before elapsed", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const delay = createCancellableDelay(1000);
    const result = jest.fn();
    delay.promise.then(result);

    expect(delay.isActive()).toBe(true);
    delay.cancel();
    await Promise.resolve();

    expect(result).toHaveBeenCalledWith("cancelled");
    expect(delay.isActive()).toBe(false);
    expect(clearTimeoutSpy).toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(result).toHaveBeenCalledTimes(1);
  });

  it("resolves as elapsed once and does not leave an active timer", async () => {
    const delay = createCancellableDelay(250);
    const result = jest.fn();
    delay.promise.then(result);

    jest.advanceTimersByTime(250);
    await Promise.resolve();

    expect(result).toHaveBeenCalledWith("elapsed");
    expect(delay.isActive()).toBe(false);

    delay.cancel();
    await Promise.resolve();
    expect(result).toHaveBeenCalledTimes(1);
  });
});
