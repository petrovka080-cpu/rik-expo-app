import { expectNoInternalCanaryPattern } from "./internalCanaryArchitectureTestHelpers";

test("internal canary adds no inline BOQ rows in screens", () => {
  expectNoInternalCanaryPattern(/inlineRows|rows\s*:\s*\[\s*\{[^]*?unitPrice/u, "inline_rows");
});
