describe("MapRenderer platform split", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.unmock("./MapRenderer.web");
    jest.unmock("./MapRenderer.native");
  });

  function loadForPlatform(os: string) {
    const webRenderer = () => null;
    const nativeRenderer = () => null;
    const webFactory = jest.fn(() => ({ __esModule: true, default: webRenderer }));
    const nativeFactory = jest.fn(() => ({ __esModule: true, default: nativeRenderer }));

    jest.doMock("./MapRenderer.web", webFactory);
    jest.doMock("./MapRenderer.native", nativeFactory);

    let loaded: unknown;
    jest.isolateModules(() => {
      const reactNative = require("react-native");
      Object.defineProperty(reactNative.Platform, "OS", {
        configurable: true,
        value: os,
      });
      loaded = require("./MapRenderer.tsx").default;
    });

    return {
      loaded,
      webRenderer,
      nativeRenderer,
      webFactory,
      nativeFactory,
    };
  }

  it("loads the web renderer only on web", () => {
    const result = loadForPlatform("web");

    expect(result.loaded).toBe(result.webRenderer);
    expect(result.webFactory).toHaveBeenCalledTimes(1);
    expect(result.nativeFactory).not.toHaveBeenCalled();
  });

  it("loads the native renderer outside web", () => {
    const result = loadForPlatform("android");

    expect(result.loaded).toBe(result.nativeRenderer);
    expect(result.nativeFactory).toHaveBeenCalledTimes(1);
    expect(result.webFactory).not.toHaveBeenCalled();
  });
});
