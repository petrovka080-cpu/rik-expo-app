const mockGetNetworkStateAsync = jest.fn();
const mockAddNetworkStateListener = jest.fn();

jest.mock("expo-network", () => ({
  getNetworkStateAsync: (...args: unknown[]) =>
    mockGetNetworkStateAsync(...args),
  addNetworkStateListener: (...args: unknown[]) =>
    mockAddNetworkStateListener(...args),
}));

describe("platform network service lifecycle", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetNetworkStateAsync.mockReset();
    mockAddNetworkStateListener.mockReset();
  });

  it("registers one listener, exposes idempotent teardown, and can reattach cleanly", async () => {
    const remove = jest.fn();
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: "wifi",
    });
    mockAddNetworkStateListener.mockImplementation(() => ({ remove }));

    const service = require("../../src/lib/offline/platformNetwork.service") as typeof import("../../src/lib/offline/platformNetwork.service");

    await service.ensurePlatformNetworkService();
    await service.ensurePlatformNetworkService();

    expect(mockAddNetworkStateListener).toHaveBeenCalledTimes(1);

    service.stopPlatformNetworkService();
    service.stopPlatformNetworkService();

    expect(remove).toHaveBeenCalledTimes(1);

    await service.ensurePlatformNetworkService();

    expect(mockAddNetworkStateListener).toHaveBeenCalledTimes(2);
    expect(mockGetNetworkStateAsync).toHaveBeenCalledTimes(2);
  });
});
