import { NativeModules, Platform } from "react-native";
import { parseEstimatePdfReturnRoute } from "./androidPdfReturnRecovery";

export type AndroidPdfCaller = Readonly<{ ownerUserId: string; sessionId: string; returnTo: string }>;
type PdfHandoffModule = {
  openPdfWithReturn?: (uri: string, ownerUserId: string, sessionId: string, returnTo: string) => Promise<void>;
  getPendingPdfReturn?: () => Promise<string | null>;
  clearPendingPdfReturn?: (nonce: string) => Promise<boolean>;
};
const moduleForAndroid = (): PdfHandoffModule | null => Platform.OS === "android"
  ? (NativeModules.RikIntent as PdfHandoffModule | undefined) ?? null : null;

export async function openAndroidPdfWithCaller(uri: string, caller: AndroidPdfCaller): Promise<boolean> {
  const module = moduleForAndroid();
  if (!module?.openPdfWithReturn) return false; // Older installed binaries retain their ordinary viewer path.
  if (!parseEstimatePdfReturnRoute(caller.returnTo)) throw new Error("ANDROID_PDF_RETURN_ROUTE_INVALID");
  await module.openPdfWithReturn(uri, caller.ownerUserId, caller.sessionId, caller.returnTo);
  return true;
}

export async function readPendingAndroidPdfReturn(): Promise<string | null> {
  return (await moduleForAndroid()?.getPendingPdfReturn?.()) ?? null;
}

export async function clearPendingAndroidPdfReturn(nonce: string): Promise<boolean> {
  return (await moduleForAndroid()?.clearPendingPdfReturn?.(nonce)) ?? false;
}
