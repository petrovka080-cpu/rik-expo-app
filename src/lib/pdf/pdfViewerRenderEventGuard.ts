export function shouldCommitPdfViewerRenderEvent(args: {
  activeRenderInstanceKey: string;
  eventRenderInstanceKey: string;
}): boolean {
  const active = String(args.activeRenderInstanceKey || "").trim();
  const event = String(args.eventRenderInstanceKey || "").trim();
  return Boolean(active && event && active === event);
}
