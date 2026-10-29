export {};

const mockInstances: Array<{ loadAsync: jest.Mock; replayAsync: jest.Mock; unloadAsync: jest.Mock }> = [];
const mockLoad = jest.fn();
const mockRecord = jest.fn();
jest.mock("expo-av", () => ({ Audio: { Sound: jest.fn(() => {
  const value = { loadAsync: jest.fn(() => mockLoad()), replayAsync: jest.fn().mockResolvedValue(undefined), unloadAsync: jest.fn().mockResolvedValue(undefined) };
  mockInstances.push(value); return value;
}) } }));
jest.mock("../../src/lib/observability/swallowedError", () => ({ recordSwallowedError: (...args: unknown[]) => mockRecord(...args) }));
function deferred() { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); return { promise, resolve }; }
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
describe("native notification sound resource owner", () => {
  let notify: typeof import("../../src/lib/notify.native");
  beforeEach(() => { jest.resetModules(); mockInstances.length = 0; mockLoad.mockReset().mockResolvedValue(undefined); mockRecord.mockReset(); notify = require("../../src/lib/notify.native"); });
  it("deduplicates concurrent initialization into one actual sound load", async () => {
    const load = deferred(); mockLoad.mockReturnValue(load.promise); const first = notify.initDing(), second = notify.initDing(); await tick();
    expect(mockInstances).toHaveLength(1); load.resolve(); await Promise.all([first, second]); expect(mockInstances[0].loadAsync).toHaveBeenCalledTimes(1);
  });
  it("waits for load completion before replaying", async () => {
    const load = deferred(); mockLoad.mockReturnValue(load.promise); const init = notify.initDing(); await tick(); const play = notify.playDing(); await tick();
    expect(mockInstances[0].replayAsync).not.toHaveBeenCalled(); load.resolve(); await Promise.all([init, play]); expect(mockInstances[0].replayAsync).toHaveBeenCalledTimes(1);
  });
  it("defers unload during loading and releases the late loaded resource exactly once", async () => {
    const load = deferred(); mockLoad.mockReturnValue(load.promise); const init = notify.initDing(); await tick(); const unload = notify.unloadDing(); await tick();
    expect(mockInstances[0].unloadAsync).not.toHaveBeenCalled(); load.resolve(); await Promise.all([init, unload]); expect(mockInstances[0].unloadAsync).toHaveBeenCalledTimes(1);
    await notify.playDing(); expect(mockInstances[0].replayAsync).not.toHaveBeenCalled();
  });
  it("releases a failed load's owned instance and permits a clean retry", async () => {
    mockLoad.mockRejectedValueOnce(new Error("fixture decode error")); await notify.initDing();
    expect(mockInstances[0].unloadAsync).toHaveBeenCalledTimes(1); expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ event: "notify_native_init_failed" }));
    await notify.initDing(); await notify.playDing(); expect(mockInstances).toHaveLength(2); expect(mockInstances[1].replayAsync).toHaveBeenCalledTimes(1);
  });
  it("an old pending load cannot replace or dispose a newer generation", async () => {
    const oldLoad = deferred(); mockLoad.mockReturnValueOnce(oldLoad.promise).mockResolvedValueOnce(undefined);
    const oldInit = notify.initDing(); await tick(); const oldUnload = notify.unloadDing(); await notify.initDing();
    oldLoad.resolve(); await Promise.all([oldInit, oldUnload]); await notify.playDing();
    expect(mockInstances).toHaveLength(2); expect(mockInstances[0].unloadAsync).toHaveBeenCalledTimes(1); expect(mockInstances[1].unloadAsync).not.toHaveBeenCalled(); expect(mockInstances[1].replayAsync).toHaveBeenCalledTimes(1);
  });
  it("unloads an already loaded sound once and tolerates repeated cleanup", async () => {
    await notify.initDing(); await notify.unloadDing(); await notify.unloadDing(); expect(mockInstances[0].unloadAsync).toHaveBeenCalledTimes(1);
  });
});

describe("web notification sound resource owner", () => {
  let notify: typeof import("../../src/lib/notify.web");
  let previousAudio: PropertyDescriptor | undefined;
  const instance = { play: jest.fn(), pause: jest.fn(), removeAttribute: jest.fn(), load: jest.fn(), currentTime: 0 };
  const constructor = jest.fn(() => instance);
  beforeEach(() => {
    jest.resetModules(); mockRecord.mockReset(); constructor.mockClear();
    instance.play.mockReset().mockResolvedValue(undefined); instance.pause.mockReset(); instance.removeAttribute.mockReset(); instance.load.mockReset(); instance.currentTime = 0;
    previousAudio = Object.getOwnPropertyDescriptor(globalThis, "Audio");
    Object.defineProperty(globalThis, "Audio", { configurable: true, writable: true, value: constructor });
    notify = require("../../src/lib/notify.web");
  });
  afterEach(() => { if (previousAudio) Object.defineProperty(globalThis, "Audio", previousAudio); else Reflect.deleteProperty(globalThis, "Audio"); });
  it("loads the public WAV once and plays the retained element", async () => {
    await notify.initDing(); await notify.initDing(); await notify.playDing();
    expect(constructor).toHaveBeenCalledTimes(1); expect(constructor).toHaveBeenCalledWith("/notify.wav"); expect(instance.play).toHaveBeenCalledTimes(1);
  });
  it("releases the source and media decoder on cleanup without repeated disposal", async () => {
    await notify.initDing(); await notify.unloadDing(); await notify.unloadDing();
    expect(instance.pause).toHaveBeenCalledTimes(1); expect(instance.removeAttribute).toHaveBeenCalledWith("src"); expect(instance.load).toHaveBeenCalledTimes(1);
  });
  it("records autoplay denial without overriding browser permissions", async () => {
    instance.play.mockRejectedValueOnce(new Error("NotAllowedError")); await expect(notify.playDing()).resolves.toBeUndefined();
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ event: "notify_web_play_failed" }));
  });
});
