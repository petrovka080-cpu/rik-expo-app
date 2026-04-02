const mockWithScreenErrorBoundary = jest.fn(
  (_component: unknown, options: unknown) => options,
);

jest.mock("../../src/shared/ui/ScreenErrorBoundary", () => ({
  withScreenErrorBoundary: mockWithScreenErrorBoundary,
}));

jest.mock("../../src/screens/profile/AddListingScreen", () => ({
  __esModule: true,
  default: "AddListingScreen",
}));

describe("add tab route", () => {
  beforeEach(() => {
    mockWithScreenErrorBoundary.mockClear();
    jest.resetModules();
  });

  it("registers add-listing as its own owner path instead of profile", () => {
    jest.isolateModules(() => {
      require("../../app/(tabs)/add");
    });

    expect(mockWithScreenErrorBoundary).toHaveBeenCalledTimes(1);
    expect(mockWithScreenErrorBoundary.mock.calls[0]?.[1]).toMatchObject({
      screen: "add_listing",
      route: "/add",
    });
  });
});
