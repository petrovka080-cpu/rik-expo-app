export function resolvePdfViewerWebRenderUriCleanup(args: {
  platform: string;
  uri?: string | null;
  commitState?: boolean;
}) {
  const uri = String(args.uri ?? "").trim();
  return {
    revokeUri: args.platform === "web" && uri.startsWith("blob:") ? uri : null,
    shouldCommitState: args.commitState !== false,
  };
}
