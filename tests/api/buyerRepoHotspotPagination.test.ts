import {
  repoGetProposalItemLinks,
  repoGetProposalItemsForView,
} from "../../src/screens/buyer/buyer.repo";

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

describe("buyer.repo S-PAG-7 hotspot list pagination", () => {
  it("page-through-all bounds proposal item view reads without truncating default callers", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      request_item_id: `item-${index}`,
    }));
    const lastPage = [{ request_item_id: "item-last" }];
    const query = buildPagedQuery([firstPage, lastPage]);

    const rows = await repoGetProposalItemsForView(query.supabase as never, "proposal-1");

    expect(rows).toHaveLength(101);
    expect(query.ranges).toEqual([
      [0, 99],
      [100, 199],
    ]);
    expect(query.builder.order).toHaveBeenCalledWith("request_item_id", { ascending: true });
  });

  it("keeps explicit caller pages bounded and clamped for proposal item links", async () => {
    const query = buildPagedQuery([[{ proposal_id: "proposal-1", request_item_id: "item-1" }]]);

    await repoGetProposalItemLinks(
      query.supabase as never,
      ["proposal-1"],
      { page: 2, pageSize: 500 },
    );

    expect(query.ranges).toEqual([[200, 299]]);
    expect(query.builder.order).toHaveBeenCalledWith("proposal_id", { ascending: true });
    expect(query.builder.order).toHaveBeenCalledWith("request_item_id", { ascending: true });
  });
});
