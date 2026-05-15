import type {
  AiScreenBffCoverageStatus,
  AiScreenButtonActionEntry,
} from "./aiScreenButtonRoleActionTypes";

const DIRECT_CLIENT_DATA_SOURCE_PATTERNS = [
  /\bsupabase\s*\.from\b/i,
  /\bdirect\s+supabase\s+mutation\b/i,
  /\bprivileged\s+auth\s+admin\b/i,
];

function hasDirectClientAccess(entry: Pick<AiScreenButtonActionEntry, "currentDataSources" | "onPressHandlers">): boolean {
  const source = [...entry.currentDataSources, ...entry.onPressHandlers].join(" ");
  return DIRECT_CLIENT_DATA_SOURCE_PATTERNS.some((pattern) => pattern.test(source));
}

function hasRoute(entry: Pick<AiScreenButtonActionEntry, "existingBffRoutes">, predicate: (route: string) => boolean): boolean {
  return entry.existingBffRoutes.some(predicate);
}

export function classifyAiScreenBffCoverage(
  entry: Pick<
    AiScreenButtonActionEntry,
    "actionKind" | "existingBffRoutes" | "missingBffRoutes" | "currentDataSources" | "onPressHandlers"
  >,
): readonly AiScreenBffCoverageStatus[] {
  const statuses = new Set<AiScreenBffCoverageStatus>();

  if (hasDirectClientAccess(entry)) {
    statuses.add("unsafe_direct_client_access");
  }

  if (entry.actionKind === "safe_read") {
    statuses.add(
      hasRoute(entry, (route) => route.startsWith("GET /agent/")) ? "covered_read_route" : "missing_read_route",
    );
    if (entry.missingBffRoutes.some((route) => route.startsWith("GET /agent/"))) {
      statuses.add("missing_read_route");
    }
  }

  if (entry.actionKind === "draft_only") {
    statuses.add(
      hasRoute(entry, (route) => route.startsWith("POST /agent/") && /draft|preview|plan|summarize/i.test(route))
        ? "covered_draft_route"
        : "missing_draft_route",
    );
    if (entry.missingBffRoutes.some((route) => route.startsWith("POST /agent/"))) {
      statuses.add("missing_draft_route");
    }
  }

  if (entry.actionKind === "approval_required") {
    statuses.add(
      hasRoute(entry, (route) => route.startsWith("POST /agent/") && /approval|approve|reject|execute/i.test(route))
        ? "covered_approval_route"
        : "missing_approval_route",
    );
    if (entry.missingBffRoutes.some((route) => route.startsWith("POST /agent/"))) {
      statuses.add("missing_approval_route");
    }
  }

  if (entry.actionKind === "forbidden" && entry.missingBffRoutes.length > 0) {
    statuses.add("missing_approval_route");
  }

  return [...statuses].sort();
}

export function hasUnsafeDirectClientAccess(entry: AiScreenButtonActionEntry): boolean {
  return classifyAiScreenBffCoverage(entry).includes("unsafe_direct_client_access");
}
