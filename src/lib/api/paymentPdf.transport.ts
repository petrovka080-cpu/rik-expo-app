import { supabase } from "../supabaseClient";

export async function callPaymentPdfSourceRpc(paymentId: number) {
  return await supabase.rpc("pdf_payment_source_v1", { p_payment_id: paymentId });
}
