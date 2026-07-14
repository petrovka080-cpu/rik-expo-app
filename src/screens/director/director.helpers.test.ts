import { formatRequestDisplayNo } from "./director.helpers";

describe("director request display labels", () => {
  it("keeps explicit request numbers first", () => {
    expect(
      formatRequestDisplayNo({
        request_no: "REQ-0588/2026",
        display_no: "REQ-0001/2026",
        id_old: 1,
        year: 2026,
      }),
    ).toBe("REQ-0588/2026");
  });

  it("builds a stable REQ number from legacy ids instead of showing uuid hashes", () => {
    expect(
      formatRequestDisplayNo({
        id_old: 22,
        submitted_at: "2026-06-26T07:00:00.000Z",
      }),
    ).toBe("REQ-0022/2026");

    expect(
      formatRequestDisplayNo({
        request_id_old: 588,
        year: 2026,
      }),
    ).toBe("REQ-0588/2026");
  });
});
