import {
  UnsafeProofFixtureOperationError,
  assertNoDestructiveSql,
} from "../../src/lib/proofFixtures/50kProofFixtureGuards";

describe("whole-app 50k no destructive SQL contract", () => {
  it("blocks drop, truncate, reset, disabled RLS, and broad public policies", () => {
    expect(() => assertNoDestructiveSql("select 1")).not.toThrow();
    expect(() => assertNoDestructiveSql("drop table public.consumer_repair_request_drafts")).toThrow(UnsafeProofFixtureOperationError);
    expect(() => assertNoDestructiveSql("truncate public.consumer_repair_request_drafts")).toThrow(UnsafeProofFixtureOperationError);
    expect(() => assertNoDestructiveSql("reset database")).toThrow(UnsafeProofFixtureOperationError);
    expect(() => assertNoDestructiveSql("alter table public.foo disable row level security")).toThrow(UnsafeProofFixtureOperationError);
    expect(() => assertNoDestructiveSql("create policy read_all on public.foo to authenticated using (true)")).toThrow(
      UnsafeProofFixtureOperationError,
    );
  });
});
