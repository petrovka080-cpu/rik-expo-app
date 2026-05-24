import {
  clampIso,
  esc,
  fmtDateOnly,
  formatArrowPeriodText,
  formatDashPeriodText,
  formatPaidRangeText,
  iso10,
  joinBulletParts,
  money,
  nnum,
} from "../../src/lib/api/pdf_director.format";

describe("director PDF formatting helpers", () => {
  it("formats unknown numeric and date inputs without unsafe caller casts", () => {
    expect(nnum("1 234,50 сом")).toBe(1234.5);
    expect(nnum(Number.POSITIVE_INFINITY)).toBe(0);
    expect(money("1 234,50 сом")).toBe("1 234,5");
    expect(iso10("2026-05-24T08:00:00.000Z")).toBe("2026-05-24");
    expect(clampIso(null)).toBe("");
    expect(fmtDateOnly("2026-05-24T08:00:00.000Z")).toBe("24.05.2026");
  });

  it("keeps Russian period labels and HTML escaping stable", () => {
    expect(esc(`<b title="x">A&B</b>`)).toBe("&lt;b title=&quot;x&quot;&gt;A&amp;B&lt;/b&gt;");
    expect(formatArrowPeriodText("2026-05-01", "2026-05-24")).toBe("01.05.2026 → 24.05.2026");
    expect(formatArrowPeriodText(null, null)).toBe("Весь период");
    expect(formatDashPeriodText("2026-05-01", "2026-05-24")).toBe("01.05.2026 – 24.05.2026");
    expect(formatPaidRangeText("2026-05-01", "2026-05-24")).toBe("опл. 01.05.2026 → 24.05.2026");
    expect(joinBulletParts(["утв. 01.05.2026", "", null, "срок 24.05.2026"])).toBe(
      "утв. 01.05.2026 • срок 24.05.2026",
    );
  });
});
