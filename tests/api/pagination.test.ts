import { normalizePage } from "../../src/lib/api/_core";

describe("normalizePage", () => {
  it("applies the default page size", () => {
    expect(normalizePage(undefined, { pageSize: 50, maxPageSize: 100 })).toEqual({
      page: 0,
      pageSize: 50,
      from: 0,
      to: 49,
    });
  });

  it("clamps oversized page sizes", () => {
    expect(normalizePage({ page: 2, pageSize: 500 }, { pageSize: 50, maxPageSize: 100 })).toEqual({
      page: 2,
      pageSize: 100,
      from: 200,
      to: 299,
    });
  });

  it("normalizes negative pages and tiny page sizes", () => {
    expect(normalizePage({ page: -4, pageSize: 0 }, { pageSize: 25, maxPageSize: 100 })).toEqual({
      page: 0,
      pageSize: 1,
      from: 0,
      to: 0,
    });
  });
});
