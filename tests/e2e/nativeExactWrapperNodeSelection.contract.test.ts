import {
  findNativeNodeOwnedByExactWrapper,
  findNativeWrapperOwningExactText,
  nativeBoundsAreContainedBy,
  nativeNodeSafeViewportAdjustment,
  nativeOptionalControlledInputIsEmpty,
} from "../../scripts/e2e/nativeExactWrapperNodeSelection";

describe("native exact-wrapper node selection", () => {
  it("selects the generic input geometrically owned by the requested exact wrapper", () => {
    const areaWrapper = { bounds: "[100,500][900,900]" };
    const nodes = [
      { id: "editable-param-popover-input", value: "50", bounds: "[130,120][870,300]" },
      { id: "editable-param-popover-input", value: "100", bounds: "[130,600][870,760]" },
    ];

    expect(findNativeNodeOwnedByExactWrapper(
      nodes,
      areaWrapper,
      (node) => node.id === "editable-param-popover-input",
    )?.value).toBe("100");
  });

  it("fails closed when no matching input belongs to the exact wrapper", () => {
    expect(findNativeNodeOwnedByExactWrapper(
      [{ id: "editable-param-popover-input", bounds: "[10,10][90,90]" }],
      { bounds: "[100,100][200,200]" },
      (node) => node.id === "editable-param-popover-input",
    )).toBeNull();
  });

  it("selects only the history wrapper that geometrically owns the exact title", () => {
    const nodes = [
      { id: "consumer-repair-history-main", text: "", bounds: "[100,200][900,420]" },
      { id: "title", text: "Старая смета", bounds: "[150,230][780,280]" },
      { id: "consumer-repair-history-main", text: "", bounds: "[100,440][900,660]" },
      { id: "title", text: "Точная новая смета", bounds: "[150,470][780,520]" },
    ];

    expect(findNativeWrapperOwningExactText(
      nodes,
      (node) => node.id === "consumer-repair-history-main",
      (node) => node.text,
      "Точная новая смета",
    )?.bounds).toBe("[100,440][900,660]");
  });

  it("fails closed instead of selecting a generic history row", () => {
    expect(findNativeWrapperOwningExactText(
      [
        { id: "consumer-repair-history-main", text: "", bounds: "[100,200][900,420]" },
        { id: "title", text: "Другая смета", bounds: "[150,230][780,280]" },
      ],
      (node) => node.id === "consumer-repair-history-main",
      (node) => node.text,
      "Ожидаемая смета",
    )).toBeNull();
  });

  it("rejects malformed or partially overlapping bounds", () => {
    expect(nativeBoundsAreContainedBy("malformed", "[0,0][100,100]")).toBe(false);
    expect(nativeBoundsAreContainedBy("[50,50][150,150]", "[0,0][100,100]")).toBe(false);
  });

  it("moves an exact input above the sticky action bar before tapping it", () => {
    expect(nativeNodeSafeViewportAdjustment(
      "[173,1719][907,1852]",
      2400,
    )).toBe("up");
    expect(nativeNodeSafeViewportAdjustment(
      "[173,800][907,933]",
      2400,
    )).toBe("none");
    expect(nativeNodeSafeViewportAdjustment(
      "[173,100][907,233]",
      2400,
    )).toBe("down");
    expect(nativeNodeSafeViewportAdjustment("malformed", 2400)).toBe("invalid");
  });

  it("admits the fully visible cold-replay history button without changing the generic tap boundary", () => {
    const historyButtonBounds = "[42,1423][1038,1560]";

    expect(nativeNodeSafeViewportAdjustment(historyButtonBounds, 2400)).toBe("up");
    expect(nativeNodeSafeViewportAdjustment(
      historyButtonBounds,
      2400,
      0.2,
      0.66,
    )).toBe("none");
  });

  it("requires an exact visible optional input and accepts only its empty controlled state", () => {
    expect(nativeOptionalControlledInputIsEmpty({ text: "" }, "Адрес")).toBe(true);
    expect(nativeOptionalControlledInputIsEmpty({ text: "Адрес" }, "Адрес")).toBe(true);
    expect(nativeOptionalControlledInputIsEmpty({ text: "ул. Манаса, 1" }, "Адрес")).toBe(false);
    expect(nativeOptionalControlledInputIsEmpty(null, "Адрес")).toBe(false);
  });
});
