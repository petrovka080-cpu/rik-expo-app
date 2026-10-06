package com.azisbek_dzhantaev.rikexpoapp

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log

/** A restartable native boundary underneath the external viewer. This Activity
 * needs no React fragments, JS route keys or in-memory document session. */
class PdfHandoffActivity : Activity() {
  private var leftForViewer = false
  private var returned = false
  private var nonce: String = ""

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    nonce = intent.getStringExtra("nonce") ?: ""
    try {
      // Durable CAS occurs before ACTION_VIEW. A recreated Activity observes
      // launched/returned and never starts a second external viewer.
      if (!PdfReturnCheckpoint.markLaunched(this, nonce)) {
        RikIntentModule.completePdfHandoff(nonce, false)
        returnToApp(); return
      }
      val uri = intent.getParcelableExtra<Uri>("pdfUri") ?: throw IllegalArgumentException("PDF_URI_MISSING")
      startActivityForResult(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf")
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION), VIEW_REQUEST)
      RikIntentModule.completePdfHandoff(nonce, true)
    } catch (_: Exception) {
      RikIntentModule.completePdfHandoff(nonce, false)
      Log.w("RikIntent", "pdf_handoff_viewer_launch_failed")
      returnToApp()
    }
  }

  override fun onPause() {
    super.onPause()
    leftForViewer = true
  }

  override fun onResume() {
    super.onResume()
    if (leftForViewer) returnToApp()
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode == VIEW_REQUEST) returnToApp()
  }

  private fun returnToApp() {
    if (returned) return
    returned = true
    val current = PdfReturnCheckpoint.read(this)
    if (current != null && current.optString("nonce") != nonce) { finish(); return }
    if (PdfReturnCheckpoint.markReturned(this, nonce)) Log.i("RikIntent", "pdf_handoff_return_checkpoint_ready")
    // ACTION_MAIN reloads normally. A stored caller is never an unauthenticated
    // VIEW deep link; JS waits for the authenticated root before navigation.
    startActivity(Intent(this, MainActivity::class.java).setAction(Intent.ACTION_MAIN)
      .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP))
    finish()
  }

  companion object { private const val VIEW_REQUEST = 4242 }
}
