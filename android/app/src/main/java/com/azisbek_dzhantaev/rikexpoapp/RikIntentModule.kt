package com.azisbek_dzhantaev.rikexpoapp

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class RikIntentModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
  init {
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
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  override fun invalidate() {
    reactContext.removeActivityEventListener(this)
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

    @Volatile
    private var latestViewUrl: String? = null

    fun captureViewIntent(intent: Intent?, reactContext: ReactContext?) {
      if (intent?.action != Intent.ACTION_VIEW) return
      val uri = intent.data?.toString() ?: return
      latestViewUrl = uri
      reactContext
        ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit(VIEW_URL_EVENT, uri)
    }
  }
}
