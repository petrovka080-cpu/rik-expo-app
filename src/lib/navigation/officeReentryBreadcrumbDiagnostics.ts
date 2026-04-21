import {
  OFFICE_POST_RETURN_PROBES,
  type OfficePostReturnProbe,
  type OfficeReentryBreadcrumb,
} from "./officeReentryBreadcrumbs.contract";

let officePostReturnProbe: OfficePostReturnProbe[] = ["all"];

function normalizeOfficePostReturnProbeToken(
  value: unknown,
): OfficePostReturnProbe | null {
  const token = String(value ?? "")
    .trim()
    .toLowerCase() as OfficePostReturnProbe;

  return OFFICE_POST_RETURN_PROBES.includes(token) ? token : null;
}

export function normalizeOfficePostReturnProbe(
  value: unknown,
): OfficePostReturnProbe[] | null {
  if (value == null) return null;

  const parts = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((item) => item.trim());
  const normalized = Array.from(
    new Set(
      parts
        .flatMap((item) => String(item).split(","))
        .map((item) => normalizeOfficePostReturnProbeToken(item))
        .filter((item): item is OfficePostReturnProbe => Boolean(item)),
    ),
  );

  return normalized.length ? normalized : ["all"];
}

export function getOfficePostReturnProbe() {
  return officePostReturnProbe;
}

export function setOfficePostReturnProbe(
  value: unknown,
): OfficePostReturnProbe[] {
  officePostReturnProbe = normalizeOfficePostReturnProbe(value) ?? ["all"];
  return officePostReturnProbe;
}

export function formatOfficePostReturnProbe(
  value: readonly OfficePostReturnProbe[] | null | undefined,
) {
  const normalized = Array.from(
    new Set(
      (value ?? []).filter((item): item is OfficePostReturnProbe =>
        Boolean(item),
      ),
    ),
  );

  return normalized.length ? normalized.join(",") : "all";
}

export function buildOfficeReentryBreadcrumbsText(
  items: OfficeReentryBreadcrumb[],
) {
  return items
    .map((item) => {
      const parts = [item.at, item.marker, item.result ?? "unknown-result"];
      if (item.errorStage) parts.push(`stage=${item.errorStage}`);
      if (item.errorClass) parts.push(`class=${item.errorClass}`);
      if (item.errorMessage) parts.push(`error=${item.errorMessage}`);
      if (item.extra?.route) parts.push(`route=${String(item.extra.route)}`);
      if (item.extra?.owner) parts.push(`owner=${String(item.extra.owner)}`);
      if (item.extra?.mode) parts.push(`mode=${String(item.extra.mode)}`);
      if (item.extra?.focusCycle != null)
        parts.push(`focusCycle=${String(item.extra.focusCycle)}`);
      if (item.extra?.section)
        parts.push(`section=${String(item.extra.section)}`);
      if (item.extra?.sections)
        parts.push(`sections=${String(item.extra.sections)}`);
      if (item.extra?.callback)
        parts.push(`callback=${String(item.extra.callback)}`);
      if (item.extra?.subtree)
        parts.push(`subtree=${String(item.extra.subtree)}`);
      if (item.extra?.identity)
        parts.push(`identity=${String(item.extra.identity)}`);
      if (item.extra?.pathname)
        parts.push(`pathname=${String(item.extra.pathname)}`);
      if (item.extra?.segments)
        parts.push(`segments=${String(item.extra.segments)}`);
      if (item.extra?.wrappedRoute)
        parts.push(`wrappedRoute=${String(item.extra.wrappedRoute)}`);
      if (item.extra?.routeWrapper)
        parts.push(`routeWrapper=${String(item.extra.routeWrapper)}`);
      if (item.extra?.sourceRoute)
        parts.push(`sourceRoute=${String(item.extra.sourceRoute)}`);
      if (item.extra?.target) parts.push(`target=${String(item.extra.target)}`);
      if (item.extra?.method) parts.push(`method=${String(item.extra.method)}`);
      if (item.extra?.handler)
        parts.push(`handler=${String(item.extra.handler)}`);
      if (item.extra?.action) parts.push(`action=${String(item.extra.action)}`);
      if (item.extra?.phase) parts.push(`phase=${String(item.extra.phase)}`);
      if (item.extra?.source) parts.push(`source=${String(item.extra.source)}`);
      if (item.extra?.writeTarget)
        parts.push(`writeTarget=${String(item.extra.writeTarget)}`);
      if (item.extra?.hadOpenUi != null)
        parts.push(`hadOpenUi=${String(item.extra.hadOpenUi)}`);
      if (item.extra?.visibleScope)
        parts.push(`visibleScope=${String(item.extra.visibleScope)}`);
      if (item.extra?.skippedScope)
        parts.push(`skippedScope=${String(item.extra.skippedScope)}`);
      if (item.extra?.tab) parts.push(`tab=${String(item.extra.tab)}`);
      if (item.extra?.reason) parts.push(`reason=${String(item.extra.reason)}`);
      if (item.extra?.probe) parts.push(`probe=${String(item.extra.probe)}`);
      return parts.join(" | ");
    })
    .join("\n");
}
