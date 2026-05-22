import {
  UnsafeProofFixtureOperationError,
  assertNoRealUserMassCreation,
} from "../../src/lib/proofFixtures/50kProofFixtureGuards";

describe("whole-app 50k no real users contract", () => {
  it("allows selecting one existing proof owner user", () => {
    expect(() => assertNoRealUserMassCreation("select id from auth.users order by created_at asc limit 1")).not.toThrow();
  });

  it("blocks creating or requiring 50k auth.users", () => {
    expect(() => assertNoRealUserMassCreation("insert into auth.users select * from generate_series(1, 50000)")).toThrow(
      UnsafeProofFixtureOperationError,
    );
    expect(() => assertNoRealUserMassCreation({ table: "auth.users", requiredCount: 50000 })).toThrow(
      UnsafeProofFixtureOperationError,
    );
  });
});
