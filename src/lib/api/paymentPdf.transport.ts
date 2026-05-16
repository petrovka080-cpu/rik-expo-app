import { supabase } from "../supabaseClient";

export async function callPaymentPdfSourceRpc(paymentId: number) {
  // SCALE_BOUND_EXCEPTION: payment PDF source is a single-payment document RPC keyed by p_payment_id, not a list screen read.
  return await supabase.rpc("pdf_payment_source_v1", { p_payment_id: paymentId });
}
