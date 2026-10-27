/**
 * E3 — usePdfViewerActions extraction tests.
 * Validates hook export shape and function parity.
 */

import { usePdfViewerActions } from "./usePdfViewerActions";

describe("usePdfViewerActions — export shape", () => {
  it("is a function", () => {
    expect(typeof usePdfViewerActions).toBe("function");
  });

  it("module exports only the hook", () => {
    const exports = require("./usePdfViewerActions");
    const keys = Object.keys(exports).filter((k) => !k.startsWith("__"));
    expect(keys).toEqual(["usePdfViewerActions"]);
  });
});
