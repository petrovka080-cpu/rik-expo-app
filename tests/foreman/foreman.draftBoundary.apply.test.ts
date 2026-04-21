import { readFileSync } from "fs";
import { join } from "path";
import type { Dispatch, SetStateAction } from "react";

import { applyForemanDraftHeaderEditToBoundary } from "../../src/screens/foreman/foreman.draftBoundary.apply";
import { resolveForemanDraftHeaderEditPlan } from "../../src/screens/foreman/foreman.draftBoundaryIdentity.model";
import type { RequestDetails } from "../../src/lib/catalog_api";

const makeDetails = (): RequestDetails => ({
  id: "req-1",
  status: "draft",
  display_no: "REQ-1",
  comment: "Old comment",
  foreman_name: "Old foreman",
  object_type_code: "OLD_OBJECT",
  level_code: "OLD_LEVEL",
  system_code: "OLD_SYSTEM",
  zone_code: "OLD_ZONE",
  object_name_ru: "Old object",
  level_name_ru: "Old level",
  system_name_ru: "Old system",
  zone_name_ru: "Old zone",
});

describe("foreman draft boundary apply", () => {
  it("stays free of React hooks, network, and queue side effects", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "screens", "foreman", "foreman.draftBoundary.apply.ts"),
      "utf8",
    );

    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("useCallback");
    expect(source).not.toContain("fetchRequestDetails");
    expect(source).not.toContain("enqueueForemanMutation");
    expect(source).not.toContain("AppState");
  });

  it("applies header edit plans through the boundary setter contract", () => {
    const details = makeDetails();
    const nextDetails: { current: RequestDetails | null } = { current: details };
    const setForeman = jest.fn();
    const setComment = jest.fn();
    const setObjectType = jest.fn();
    const setLevel = jest.fn();
    const setSystem = jest.fn();
    const setZone = jest.fn();
    const setRequestDetails: Dispatch<SetStateAction<RequestDetails | null>> = (value) => {
      nextDetails.current = typeof value === "function" ? value(nextDetails.current) : value;
    };

    applyForemanDraftHeaderEditToBoundary({
      plan: resolveForemanDraftHeaderEditPlan({
        field: "objectType",
        code: "NEW_OBJECT",
        name: "New object",
      }),
      setHeaderState: {
        setForeman,
        setComment,
        setObjectType,
        setLevel,
        setSystem,
        setZone,
      },
      setRequestDetails,
    });

    expect(setObjectType).toHaveBeenCalledWith("NEW_OBJECT");
    expect(setLevel).toHaveBeenCalledWith("");
    expect(setSystem).toHaveBeenCalledWith("");
    expect(setZone).toHaveBeenCalledWith("");
    expect(nextDetails.current).toMatchObject({
      object_type_code: "NEW_OBJECT",
      object_name_ru: "New object",
      level_code: null,
      system_code: null,
      zone_code: null,
    });
  });
});

