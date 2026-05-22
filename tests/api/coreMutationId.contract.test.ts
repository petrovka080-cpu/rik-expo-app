import {
  buildCoreMutationIntentId,
  hashCoreMutationPayload,
} from "../../src/lib/api/coreMutationId";

describe("core mutation id helper", () => {
  it("builds stable ids for the same scope, entity, and payload", () => {
    const input = {
      scope: "director.approve.proposal",
      entityId: "proposal-1",
      payload: { b: 2, a: ["x", "y"] },
    };

    expect(buildCoreMutationIntentId(input)).toBe(buildCoreMutationIntentId(input));
    expect(buildCoreMutationIntentId(input)).toMatch(/^director\.approve\.proposal:proposal-1:/);
  });

  it("changes the id when the payload changes", () => {
    const left = buildCoreMutationIntentId({
      scope: "proposal.submit",
      entityId: "request-1",
      payload: { supplier: "A", items: ["1"] },
    });
    const right = buildCoreMutationIntentId({
      scope: "proposal.submit",
      entityId: "request-1",
      payload: { supplier: "A", items: ["2"] },
    });

    expect(left).not.toBe(right);
  });

  it("uses stable object key ordering and no runtime clock/random input", () => {
    expect(hashCoreMutationPayload({ a: 1, b: 2 })).toBe(hashCoreMutationPayload({ b: 2, a: 1 }));
  });
});

