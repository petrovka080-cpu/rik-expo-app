import {
  loadConstructionObjectCodesByNames,
  loadRequestObjectIdentityByRequestIds,
} from "./constructionObjectIdentity.read";

const makeSupabaseMock = (rows: unknown[]) => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      in: jest.fn(async () => ({ data: rows, error: null })),
    })),
  })),
});

describe("constructionObjectIdentity.read", () => {
  it("loads exact construction object codes by display name", async () => {
    const supabase = makeSupabaseMock([
      {
        construction_object_code: "BLD-ADMIN",
        construction_object_name: "Административное здание",
      },
    ]);

    const result = await loadConstructionObjectCodesByNames(
      supabase as never,
      ["Административное здание"],
    );

    expect(result.get("Административное здание")).toBe("BLD-ADMIN");
  });

  it("loads request object identity projection rows", async () => {
    const supabase = makeSupabaseMock([
      {
        request_id: "request-1",
        construction_object_code: "BLD-ADMIN",
        construction_object_name: "Административное здание",
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
      construction_object_name: "Административное здание",
      identity_status: "request_fk",
      identity_source: "request.object_type_code",
    });
  });
});
