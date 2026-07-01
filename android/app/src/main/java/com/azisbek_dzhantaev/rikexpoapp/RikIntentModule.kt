package com.azisbek_dzhantaev.rikexpoapp

import android.app.Activity
import android.content.Intent
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
  fun removeListeners(count: Int) = Unit

  override fun invalidate() {
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
