describe("canonical compiler dependency boundary", () => {
  afterEach(() => jest.dontMock("../v4/domainFactory"));

  it("loads the real physical-norm resolver without eagerly importing the whole catalog/inventory barrel", () => {
    const loadInventoryBarrel = jest.fn(() => {
      throw new Error("FULL_DOMAIN_FACTORY_INVENTORY_BARREL_LOADED");
    });
    jest.doMock("../v4/domainFactory", loadInventoryBarrel);
    jest.isolateModules(() => {
      expect(() => {
        const { compileCanonicalEstimateCore } = require("./canonicalEstimateCompileCore") as typeof import("./canonicalEstimateCompileCore");
        expect(typeof compileCanonicalEstimateCore).toBe("function");
      }).not.toThrow();
    });
    expect(loadInventoryBarrel).not.toHaveBeenCalled();
  });
});
