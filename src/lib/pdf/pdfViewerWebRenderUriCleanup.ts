export function resolvePdfViewerWebRenderUriCleanup(args: {
  platform: string;
  uri?: string | null;
  ownedByViewer?: boolean;
  commitState?: boolean;
}) {
  const uri = String(args.uri ?? "").trim();
  return {
    revokeUri:
      args.platform === "web" && args.ownedByViewer === true && uri.startsWith("blob:")
        ? uri
        : null,
    shouldCommitState: args.commitState !== false,
  };
}
