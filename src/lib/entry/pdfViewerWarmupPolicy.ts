import type { AuthSessionState } from "../auth/useAuthLifecycle";

export type PdfViewerWarmupPolicyInput = {
  platformOs: string;
  pathname: string | null | undefined;
  sessionLoaded: boolean;
  authSessionStatus: AuthSessionState["status"];
};

function normalizePathname(pathname: string | null | undefined) {
  return String(pathname ?? "").split("?")[0] || "/";
}

export function shouldWarmPdfViewerAfterStartup(input: PdfViewerWarmupPolicyInput): boolean {
  if (input.platformOs === "web") return false;
  if (!input.sessionLoaded) return false;
  if (input.authSessionStatus !== "authenticated") return false;

  const pathname = normalizePathname(input.pathname);
  if (pathname === "/" || pathname === "/index") return false;
  if (pathname === "/pdf-viewer") return false;
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return false;

  return true;
}
