import fs from "node:fs";
import path from "node:path";

const loadingControllerPath = path.join(
  process.cwd(),
  "src",
  "screens",
  "buyer",
  "hooks",
  "useBuyerLoadingController.ts",
);
const inboxQueryPath = path.join(process.cwd(), "src", "screens", "buyer", "useBuyerInboxQuery.ts");

describe("buyer loading controller hook discipline", () => {
  it("does not suppress exhaustive-deps in buyer loading lifecycle", () => {
    const source = fs.readFileSync(loadingControllerPath, "utf8");

    expect(source).not.toContain("react-hooks/exhaustive-deps");
    expect(source).not.toContain("TODO(P1): review deps");
    expect(source).toContain("const invalidateInboxQuery = inboxQuery.invalidate");
    expect(source).toContain("const refetchInboxQuery = inboxQuery.refetch");
    expect(source).toContain("const fetchNextInboxPage = inboxQuery.fetchNextPage");
  });

  it("keeps buyer inbox query callbacks stable for hook dependencies", () => {
    const source = fs.readFileSync(inboxQueryPath, "utf8");

    expect(source).toContain('import { useCallback, useMemo } from "react";');
    expect(source).toContain("const queryKey = useMemo");
    expect(source).toContain("const fetchNextPage = useCallback");
    expect(source).toContain("const refetch = useCallback");
    expect(source).toContain("const invalidate = useCallback");
    expect(source).toContain("return useMemo");
  });
});
