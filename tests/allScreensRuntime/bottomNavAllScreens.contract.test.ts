import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("all screens bottom navigation runtime contract", () => {
  it("keeps the canonical consumer bottom nav order and targetability", () => {
    const report = getAllScreensReport();
    expect(report.bottomNav).toMatchObject({
      bottom_nav_order: "Офис / Смета / Маркет / ＋ / Чат / Профиль",
      labels_present: true,
      smeta_next_to_office: true,
      marketplace_plus_after_market: true,
      duplicate_plus_found: false,
      raw_request_index_visible: false,
      raw_add_index_visible: false,
    });
  });
});
