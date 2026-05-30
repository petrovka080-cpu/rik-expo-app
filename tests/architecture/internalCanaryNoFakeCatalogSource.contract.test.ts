import { expectNoInternalCanaryPattern } from "./internalCanaryArchitectureTestHelpers";

test("internal canary does not fake catalog source stock or supplier evidence", () => {
  expectNoInternalCanaryPattern(/fakeCatalogItem|fakeSupplier|fakeStock|fakeAvailability|mockSourceEvidence/i, "fake_catalog_source");
});
