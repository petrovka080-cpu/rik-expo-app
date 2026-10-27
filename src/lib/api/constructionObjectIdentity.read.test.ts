import {
  loadConstructionObjectCodesByNames,
  loadRequestObjectIdentityByRequestIds,
} from "./constructionObjectIdentity.read";

const makeSupabaseMock = (rows: unknown[]) => {
  const builder: {
    select: jest.Mock;
    in: jest.Mock;
    order: jest.Mock;
    range: jest.Mock;
  } = {
    select: jest.fn(),
    in: jest.fn(),
    order: jest.fn(),
    range: jest.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    })),
  };
  builder.select.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);

  return {
    from: jest.fn(() => builder),
    builder,
  };
};

describe("constructionObjectIdentity.read", () => {
  it("loads exact construction object codes by display name", async () => {
    const supabase = makeSupabaseMock([
      {
        construction_object_code: "BLD-ADMIN",
        construction_object_name: "Administrative building",
      },
    ]);

    const result = await loadConstructionObjectCodesByNames(
      supabase as never,
      ["Administrative building"],
    );

    expect(result.get("Administrative building")).toBe("BLD-ADMIN");
    expect(supabase.builder.order).toHaveBeenCalledWith("construction_object_name", { ascending: true });
    expect(supabase.builder.order).toHaveBeenCalledWith("construction_object_code", { ascending: true });
    expect(supabase.builder.range).toHaveBeenCalledWith(0, 99);
  });

  it("pages construction object code lookup without silent truncation", async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      construction_object_code: `BLD-${String(index).padStart(3, "0")}`,
      construction_object_name: `Object ${String(index).padStart(3, "0")}`,
    }));
    const supabase = makeSupabaseMock(rows);

    const result = await loadConstructionObjectCodesByNames(
      supabase as never,
      rows.map((row) => row.construction_object_name),
    );

    expect(result.size).toBe(101);
    expect(supabase.builder.range).toHaveBeenCalledWith(0, 99);
    expect(supabase.builder.range).toHaveBeenCalledWith(100, 199);
  });

  it("fails closed when construction object lookup exceeds the row ceiling", async () => {
    const rows = Array.from({ length: 5001 }, (_, index) => ({
      construction_object_code: `BLD-${String(index).padStart(4, "0")}`,
      construction_object_name: `Object ${String(index).padStart(4, "0")}`,
    }));
    const supabase = makeSupabaseMock(rows);

    await expect(
      loadConstructionObjectCodesByNames(
        supabase as never,
        rows.map((row) => row.construction_object_name),
      ),
    ).rejects.toThrow("Paged reference read exceeded max row ceiling (5000)");
    expect(supabase.builder.range).toHaveBeenCalledWith(5000, 5000);
  });

  it("loads request object identity projection rows", async () => {
    const supabase = makeSupabaseMock([
      {
        request_id: "request-1",
        construction_object_code: "BLD-ADMIN",
        construction_object_name: "Administrative building",
        identity_status: "request_fk",
        identity_source: "request.object_type_code",
      },
    ]);

    const result = await loadRequestObjectIdentityByRequestIds(
      supabase as never,
      ["request-1"],
    );

    expect(result.get("request-1")).toEqual({
      request_id: "request-1",
      construction_object_code: "BLD-ADMIN",
      construction_object_name: "Administrative building",
      identity_status: "request_fk",
      identity_source: "request.object_type_code",
    });
    expect(supabase.builder.order).toHaveBeenCalledWith("request_id", { ascending: true });
    expect(supabase.builder.range).toHaveBeenCalledWith(0, 99);
  });

  it("fails closed when request object identity lookup exceeds the row ceiling", async () => {
    const rows = Array.from({ length: 5001 }, (_, index) => ({
      request_id: `request-${String(index).padStart(4, "0")}`,
      construction_object_code: `BLD-${String(index).padStart(4, "0")}`,
      construction_object_name: `Object ${String(index).padStart(4, "0")}`,
      identity_status: "request_fk",
      identity_source: "request.object_type_code",
    }));
    const supabase = makeSupabaseMock(rows);

    await expect(
      loadRequestObjectIdentityByRequestIds(
        supabase as never,
        rows.map((row) => row.request_id),
      ),
    ).rejects.toThrow("Paged reference read exceeded max row ceiling (5000)");
    expect(supabase.builder.range).toHaveBeenCalledWith(5000, 5000);
  });
});
