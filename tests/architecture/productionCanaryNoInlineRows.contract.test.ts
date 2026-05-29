import { expectNoProductionCanaryPattern } from "./productionCanaryArchitectureTestHelpers";

test("production canary adds no inline BOQ rows in screens", () => {
  expectNoProductionCanaryPattern(/inlineRows|rows\s*:\s*\[\s*\{[^]*?unitPrice|Строительные работы/u, "inline_rows");
});
