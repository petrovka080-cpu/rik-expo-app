import { existsSync } from "node:fs";
import {
  EXTENDED_10000_TEMPLATE_CACHE_SOURCES,
  EXTENDED_100_SUMMARY_CACHE_SOURCES,
} from "./extended100TestHelpers";

describe("extended certification cache sources", () => {
  it("invalidates full 100-case summary cache when 10000-template sources change", () => {
    expect(new Set(EXTENDED_100_SUMMARY_CACHE_SOURCES).size).toBe(EXTENDED_100_SUMMARY_CACHE_SOURCES.length);
    expect(new Set(EXTENDED_10000_TEMPLATE_CACHE_SOURCES).size).toBe(EXTENDED_10000_TEMPLATE_CACHE_SOURCES.length);
    expect(EXTENDED_10000_TEMPLATE_CACHE_SOURCES.every((source) =>
      EXTENDED_100_SUMMARY_CACHE_SOURCES.includes(source)
    )).toBe(true);
    expect(EXTENDED_100_SUMMARY_CACHE_SOURCES.every((source) => existsSync(source))).toBe(true);
  });
});
