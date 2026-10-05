package com.azisbek_dzhantaev.rikexpoapp

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    RikIntentModule.captureViewIntent(intent, null)
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    // Expo IntentLauncher uses request 12 for ACTION_VIEW. If Android killed
    // the dev client while a PDF was open, the restored Activity can receive
    // its canceled result before Expo has installed a live React delegate.
    // Those NOP delegates have no ReactDelegate and their inherited callback
    // throws. The old process also owned the now-lost result promise.
    // Keep normal results and production behavior on the original path.
    val delegateName = reactActivityDelegate.javaClass.name
    if (
      BuildConfig.DEBUG && requestCode == 12 &&
      resultCode == Activity.RESULT_CANCELED && data == null &&
      (delegateName == "expo.modules.devlauncher.react.activitydelegates.DevLauncherReactActivityNOPDelegate" ||
        delegateName == "expo.modules.devlauncher.react.activitydelegates.DevLauncherReactActivityRedirectDelegate")
    ) {
      Log.i("RikIntent", "discard_stale_canceled_intent_launcher_result_during_dev_client_restore")
      return
    }
    super.onActivityResult(requestCode, resultCode, data)
  }

  override fun onNewIntent(intent: Intent) {
    setIntent(intent)
    RikIntentModule.captureViewIntent(intent, RikIntentModule.activeReactContext())
    // Application links are owned by RikIntentModule. Passing the same warm
    // VIEW intent into Expo Linking can address a Kotlin event emitter while
    // the dev-client module registry is being replaced and crash MainActivity.
    // Keep Expo handling for its own exp+ scheme and all non-application
    // intents, but do not dispatch a second copy of a rik:// link.
    if (
      intent.action == Intent.ACTION_VIEW &&
      intent.data?.scheme.equals("rik", ignoreCase = true)
    ) {
      return
    }
    super.onNewIntent(intent)
    setIntent(intent)
    RikIntentModule.captureViewIntent(intent, RikIntentModule.activeReactContext())
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
