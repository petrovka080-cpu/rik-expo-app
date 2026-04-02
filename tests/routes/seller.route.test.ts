const mockWithScreenErrorBoundary = jest.fn(
  (_component: unknown, options: unknown) => options,
);

jest.mock("../../src/shared/ui/ScreenErrorBoundary", () => ({
  withScreenErrorBoundary: mockWithScreenErrorBoundary,
}));

jest.mock("../../src/features/seller/SellerAreaScreen", () => ({
  __esModule: true,
  default: "SellerAreaScreen",
}));

describe("seller route", () => {
  beforeEach(() => {
    mockWithScreenErrorBoundary.mockClear();
    jest.resetModules();
  });

  it("registers seller area as its own owner path", () => {
    jest.isolateModules(() => {
      require("../../app/seller");
    });

    expect(mockWithScreenErrorBoundary).toHaveBeenCalledTimes(1);
    expect(mockWithScreenErrorBoundary.mock.calls[0]?.[1]).toMatchObject({
      screen: "seller",
      route: "/seller",
      title: "Не удалось открыть кабинет продавца",
    });
  });
});
