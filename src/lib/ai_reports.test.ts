import { supabase } from "./supabaseClient";
import { analyzePriceHistory } from "./ai_reports";

const selectSpy = jest.fn();
const eqSpy = jest.fn();
const notSpy = jest.fn();
const orderSpy = jest.fn();
const limitSpy = jest.fn();

jest.mock("./supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

type QueryResult = {
  data: unknown;
  error: unknown;
};

const makeQuery = (result: QueryResult) => {
  const query = Promise.resolve(result) as Promise<QueryResult> & {
    select: typeof selectSpy;
    eq: typeof eqSpy;
    not: typeof notSpy;
    order: typeof orderSpy;
    limit: typeof limitSpy;
  };

  query.select = selectSpy.mockReturnValue(query);
  query.eq = eqSpy.mockReturnValue(query);
  query.not = notSpy.mockReturnValue(query);
  query.order = orderSpy.mockReturnValue(query);
  query.limit = limitSpy.mockReturnValue(query);
  return query;
};

describe("ai_reports proposal history compatibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads request price history without outdated proposals.company_id join/filter", async () => {
    const query = makeQuery({
      data: [
        {
          price: 100,
          supplier: "Supplier A",
          created_at: "2026-04-01T10:00:00.000Z",
        },
      ],
      error: null,
    });

    (supabase.from as unknown as jest.Mock).mockReturnValue(query);

    const result = await analyzePriceHistory("RIK-1", 100, "company-legacy");

    expect(result).not.toBeNull();
    expect(selectSpy).toHaveBeenCalledWith("price, supplier, created_at");
    expect(eqSpy).toHaveBeenCalledWith("rik_code", "RIK-1");
    expect(eqSpy).not.toHaveBeenCalledWith("proposals.company_id", "company-legacy");
  });
});
