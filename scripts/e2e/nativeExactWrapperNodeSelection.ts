export type NativeBoundedNode = {
  bounds: string;
};

function parseNativeBounds(bounds: string): [number, number, number, number] | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  return match
    ? [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])]
    : null;
}

export function nativeNodeSafeViewportAdjustment(
  bounds: string,
  viewportHeight: number,
  safeTopFraction = 0.2,
  safeBottomFraction = 0.62,
): "up" | "down" | "none" | "invalid" {
  const parsed = parseNativeBounds(bounds);
  if (!parsed || !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return "invalid";
  }
  const centerY = (parsed[1] + parsed[3]) / 2;
  if (centerY > viewportHeight * safeBottomFraction) return "up";
  if (centerY < viewportHeight * safeTopFraction) return "down";
  return "none";
}

export function nativeBoundsAreContainedBy(childBounds: string, parentBounds: string): boolean {
  const child = parseNativeBounds(childBounds);
  const parent = parseNativeBounds(parentBounds);
  return Boolean(
    child
    && parent
    && child[0] >= parent[0]
    && child[1] >= parent[1]
    && child[2] <= parent[2]
    && child[3] <= parent[3],
  );
}

export function findNativeNodeOwnedByExactWrapper<TNode extends NativeBoundedNode>(
  nodes: readonly TNode[],
  exactWrapper: NativeBoundedNode,
  matchesNode: (node: TNode) => boolean,
): TNode | null {
  return nodes.find((node) =>
    matchesNode(node) && nativeBoundsAreContainedBy(node.bounds, exactWrapper.bounds)
  ) ?? null;
}

export function nativeOptionalControlledInputIsEmpty(
  node: { text: string } | null,
  placeholder: string,
): boolean {
  if (!node) return false;
  const value = node.text.trim();
  return value === "" || value === placeholder;
}
