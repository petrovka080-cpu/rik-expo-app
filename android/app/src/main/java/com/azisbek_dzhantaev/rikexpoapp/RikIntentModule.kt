package com.azisbek_dzhantaev.rikexpoapp

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

class RikIntentModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
  private val pdfOwnerLock = Any()
  private var invalidated = false
  init {
    activeReactContextRef = WeakReference(reactContext)
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun getLatestViewUrl(promise: Promise) {
    promise.resolve(latestViewUrl)
  }

  @ReactMethod
  fun clearLatestViewUrl(url: String?) {
    if (url == null || latestViewUrl == url) {
      latestViewUrl = null
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    if (eventName == VIEW_URL_EVENT) {
      emitLatestViewUrl(reactContext, "listener_registered")
    }
  }

  @ReactMethod
  fun openPdfWithReturn(uri: String, ownerUserId: String, sessionId: String, returnTo: String, promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) { promise.reject("PDF_ACTIVITY_UNAVAILABLE", "PDF caller Activity is unavailable"); return }
    activity.runOnUiThread {
      // Invalidation and the queued UI launch share one owner lock. A stale
      // React callback must not overwrite a newer owner's durable checkpoint.
      synchronized(pdfOwnerLock) {
        if (invalidated || activity.isDestroyed || activity.isFinishing || reactContext.currentActivity !== activity) {
          promise.reject("PDF_HANDOFF_FAILED", "PDF caller is no longer active")
          return@synchronized
        }
        var nonce: String? = null
        try {
          val contentUri = Uri.parse(uri)
          require(contentUri.scheme == "content" && contentUri.authority == "${reactContext.packageName}.FileSystemFileProvider") {
            "PDF_LOCAL_CONTENT_URI_REQUIRED"
          }
          nonce = PdfReturnCheckpoint.prepare(reactContext, ownerUserId, sessionId, returnTo)
          registerPdfHandoff(nonce, this, promise)
          activity.startActivity(Intent(activity, PdfHandoffActivity::class.java)
            .putExtra("nonce", nonce).putExtra("pdfUri", contentUri))
        } catch (_: Exception) {
          if (nonce != null) {
            PdfReturnCheckpoint.clear(reactContext, nonce)
            completePdfHandoff(nonce, false)
          } else promise.reject("PDF_HANDOFF_FAILED", "PDF handoff could not be prepared")
        }
      }
    }
  }

  @ReactMethod
  fun getPendingPdfReturn(promise: Promise) {
    promise.resolve(PdfReturnCheckpoint.read(reactContext)?.toString())
  }

  @ReactMethod
  fun clearPendingPdfReturn(nonce: String, promise: Promise) {
    promise.resolve(PdfReturnCheckpoint.clear(reactContext, nonce))
  }

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  override fun invalidate() {
    synchronized(pdfOwnerLock) {
      invalidated = true
      cancelPdfHandoffs(this)
    }
    reactContext.removeActivityEventListener(this)
    if (activeReactContextRef?.get() === reactContext) {
      activeReactContextRef = null
    }
    super.invalidate()
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) = Unit

  override fun onNewIntent(intent: Intent) {
    captureViewIntent(intent, reactContext)
  }

  companion object {
    const val NAME = "RikIntent"
    const val VIEW_URL_EVENT = "RikIntentViewUrl"
    private const val TAG = "RikIntent"
    private data class PendingPdfHandoff(val owner: RikIntentModule, val promise: Promise)
    private val pendingPdfHandoffs = mutableMapOf<String, PendingPdfHandoff>()

    @Synchronized
    private fun registerPdfHandoff(nonce: String, owner: RikIntentModule, promise: Promise) {
      pendingPdfHandoffs[nonce] = PendingPdfHandoff(owner, promise)
    }

    @Synchronized
    fun completePdfHandoff(nonce: String, launched: Boolean) {
      // A recreated Activity has no old JS Promise. Never recreate or resolve it.
      val pending = pendingPdfHandoffs.remove(nonce) ?: return
      if (launched) pending.promise.resolve(null)
      else pending.promise.reject("PDF_HANDOFF_FAILED", "PDF viewer could not be opened")
    }

    @Synchronized
    private fun cancelPdfHandoffs(owner: RikIntentModule) {
      val ownedNonces = pendingPdfHandoffs.filterValues { it.owner === owner }.keys.toList()
      ownedNonces.forEach { nonce -> completePdfHandoff(nonce, false) }
    }

    @Volatile
    private var latestViewUrl: String? = null

    @Volatile
    private var activeReactContextRef: WeakReference<ReactContext>? = null

    fun activeReactContext(): ReactContext? = activeReactContextRef?.get()

    private fun emitLatestViewUrl(reactContext: ReactContext?, reason: String): Boolean {
      val uri = latestViewUrl ?: return false
      return emitViewUrl(reactContext, uri, reason)
    }

    private fun emitViewUrl(
      reactContext: ReactContext?,
      uri: String,
      reason: String,
    ): Boolean {
      val hasActiveReactInstance = reactContext?.hasActiveReactInstance() == true
      Log.i(
        TAG,
        "view_url_emit reason=$reason hasActiveReactInstance=$hasActiveReactInstance",
      )
      if (!hasActiveReactInstance) return false
      reactContext
        ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit(VIEW_URL_EVENT, uri)
      return true
    }

    fun captureViewIntent(intent: Intent?, reactContext: ReactContext?) {
      if (intent?.action != Intent.ACTION_VIEW) return
      val intentUri = intent.data ?: return
      val uri = intentUri.toString()
      latestViewUrl = uri
      Log.i(TAG, "view_intent_captured path=${intentUri.path ?: ""}")
      emitViewUrl(reactContext, uri, "capture")
    }
  }
}
