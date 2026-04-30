import {
  fetchRequestScopeRows,
  loadLogIdsByProgressIds,
} from "../../src/screens/contractor/contractor.data";

type MockPagedBuilder = {
  select: () => MockPagedBuilder;
  eq: (...args: unknown[]) => MockPagedBuilder;
  in: (...args: unknown[]) => MockPagedBuilder;
  order: (...args: unknown[]) => MockPagedBuilder;
  range: (from: number, to: number) => Promise<{ data: unknown[]; error: null }>;
};

const buildPagedQuery = (pages: unknown[][]) => {
  const ranges: [number, number][] = [];
  let builder: MockPagedBuilder;
  builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range: jest.fn(async (from: number, to: number) => {
      ranges.push([from, to]);
      const data = pages[Math.min(ranges.length - 1, pages.length - 1)] ?? [];
      return { data, error: null };
    }),
  };

  return {
    supabase: {
      from: jest.fn(() => builder),
    },
    builder,
    ranges,
  };
};

describe("contractor.data S-PAG-7 child-list pagination", () => {
  it("page-through-all bounds request scope rows while preserving complete default results", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      status: "active",
    }));
    const lastPage = [{ id: "00000000-0000-4000-8000-999999999999", status: null }];
    const query = buildPagedQuery([firstPage, lastPage]);

    const rows = await fetchRequestScopeRows(
      query.supabase as never,
      "11111111-1111-4111-8111-111111111111",
      "",
    );

    expect(rows).toHaveLength(101);
    expect(query.ranges).toEqual([
      [0, 99],
      [100, 199],
    ]);
    expect(query.builder.order).toHaveBeenCalledWith("id", { ascending: true });
  });

  it("applies a safe default page size to progress log id lists", async () => {
    const query = buildPagedQuery([[{ id: "log-1" }]]);

    const ids = await loadLogIdsByProgressIds(
      query.supabase as never,
      ["22222222-2222-4222-8222-222222222222"],
    );

    expect(ids).toEqual(["log-1"]);
    expect(query.ranges).toEqual([[0, 99]]);
    expect(query.builder.order).toHaveBeenCalledWith("id", { ascending: true });
  });
});
