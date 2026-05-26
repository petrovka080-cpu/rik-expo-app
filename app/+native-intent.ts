function splitPathAndQuery(path: string): { routePath: string; query: string } {
  const [routePath = "", ...queryParts] = path.split("?");
  const query = queryParts.length > 0 ? `?${queryParts.join("?")}` : "";
  return { routePath, query };
}

function normalizeRoutePath(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.replace(/\/+/g, "/");
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  const { routePath, query } = splitPathAndQuery(path);
  const normalizedPath = normalizeRoutePath(routePath);

  if (normalizedPath === "/request" || normalizedPath === "/request/index") {
    return `/(tabs)/request${query}`;
  }

  if (normalizedPath === "/ai") {
    return `/(tabs)/ai${query}`;
  }

  return path;
}
