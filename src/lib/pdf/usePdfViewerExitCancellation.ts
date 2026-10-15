import * as React from "react";
import { cancelPdfOpenVisible } from "./pdfOpenFlow";

/** Settle only the departing viewer's pending caller, never a completed open. */
export function usePdfViewerExitCancellation(
  openToken: string | null | undefined,
  isMountedRef: React.MutableRefObject<boolean>,
) {
  const committedToken = React.useRef(openToken);
  React.useEffect(() => {
    if (committedToken.current !== openToken) {
      cancelPdfOpenVisible(committedToken.current, "document-replaced");
      committedToken.current = openToken;
    }
  }, [openToken]);
  React.useEffect(() => () => {
    const departingToken = committedToken.current;
    // StrictMode's immediate cleanup/setup keeps the same mounted ref true.
    // Ordinary bootstrap effect rerenders do not run this stable cleanup.
    void Promise.resolve().then(() => {
      if (!isMountedRef.current) cancelPdfOpenVisible(departingToken, "unmount");
    });
  }, [isMountedRef]);
  return React.useCallback(() => cancelPdfOpenVisible(openToken, "back"), [openToken]);
}
