import { expectNoLimitedPublicBetaPattern } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited public beta adds no inline BOQ rows in screens", () => {
  expectNoLimitedPublicBetaPattern(/inlineRows|rows\s*:\s*\[\s*\{[^]*?unitPrice|\u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b/u, "inline_rows");
});
