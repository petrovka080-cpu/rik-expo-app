/**
 * usePdfViewerActions — custom hook for PDF viewer menu actions.
 *
 * E3 extraction: bundles share/open-external/download/print callbacks
 * that were inline in PdfViewerScreen. Each callback:
 * 1. Guards on non-null asset
 * 2. Delegates to facade/helper function
 * 3. Catches errors → markError
 * 4. Closes menu in finally block
 *
 * No logic changed. Identical behavior to inline callbacks.
 */

import React from "react";
import { logger } from "../logger";
import {
  openPdfDocumentExternal,
  sharePdfDocument,
} from "../documents/pdfDocumentActions";
import { downloadPdfAsset, printPdfAsset } from "./pdfViewer.helpers";
import type { DocumentAsset } from "../documents/pdfDocumentSessions";

export function usePdfViewerActions(params: {
  asset: DocumentAsset | null;
  markError: (message: string) => void;
  setMenuOpen: (open: boolean) => void;
}) {
  const { asset, markError, setMenuOpen } = params;

  const onShare = React.useCallback(async () => {
    if (!asset) return;
    try {
      await sharePdfDocument(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markError(message);
      logger.error("pdf-viewer", "share_error", {
        documentType: asset.documentType,
        originModule: asset.originModule,
        error: message,
      });
    } finally {
      setMenuOpen(false);
    }
  }, [asset, markError, setMenuOpen]);

  const onOpenExternal = React.useCallback(async () => {
    if (!asset) return;
    try {
      await openPdfDocumentExternal(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markError(message);
      logger.error("pdf-viewer", "external_open_error", {
        documentType: asset.documentType,
        originModule: asset.originModule,
        error: message,
      });
    } finally {
      setMenuOpen(false);
    }
  }, [asset, markError, setMenuOpen]);

  const onDownload = React.useCallback(async () => {
    if (!asset) return;
    try {
      await downloadPdfAsset(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markError(message);
    } finally {
      setMenuOpen(false);
    }
  }, [asset, markError, setMenuOpen]);

  const onPrint = React.useCallback(async () => {
    if (!asset) return;
    try {
      await printPdfAsset(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markError(message);
    } finally {
      setMenuOpen(false);
    }
  }, [asset, markError, setMenuOpen]);

  return { onShare, onOpenExternal, onDownload, onPrint };
}
