package com.azisbek_dzhantaev.rikexpoapp

import android.content.Context
import org.json.JSONObject
import java.util.UUID

/** Private navigation metadata. No PDF bytes, signed URL or credentials. */
internal object PdfReturnCheckpoint {
  private const val STORE = "rik_pdf_caller_return_v1"
  private const val KEY = "checkpoint"
  private const val TTL_MS = 60 * 60 * 1000L
  private val uuid = Regex("^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$")
  private val session = Regex("^session_[A-Za-z0-9_-]{1,160}$")
  private val route = Regex("^/request\\?draftId=consumer_draft_[A-Za-z0-9_-]{1,160}$")
  private fun prefs(context: Context) = context.getSharedPreferences(STORE, Context.MODE_PRIVATE)

  @Synchronized fun prepare(context: Context, owner: String, sessionId: String, returnTo: String): String {
    require(uuid.matches(owner) && session.matches(sessionId)) { "PDF_CALLER_IDENTITY_INVALID" }
    require(returnTo == "/request" || route.matches(returnTo)) { "PDF_CALLER_ROUTE_INVALID" }
    val nonce = UUID.randomUUID().toString()
    val value = JSONObject().put("version", 1).put("nonce", nonce).put("ownerUserId", owner)
      .put("sessionId", sessionId).put("returnTo", returnTo).put("createdAtMs", System.currentTimeMillis())
      .put("phase", "prepared")
    check(prefs(context).edit().putString(KEY, value.toString()).commit()) { "PDF_CALLER_COMMIT_FAILED" }
    return nonce
  }

  @Synchronized fun read(context: Context): JSONObject? {
    val raw = prefs(context).getString(KEY, null) ?: return null
    val value = try { JSONObject(raw) } catch (_: Exception) { null }
    val age = if (value == null) -1 else System.currentTimeMillis() - value.optLong("createdAtMs", -1)
    if (raw.length > 1024 || value == null || value.optInt("version") != 1 || age !in 0..TTL_MS
      || !uuid.matches(value.optString("nonce")) || !uuid.matches(value.optString("ownerUserId"))
      || !session.matches(value.optString("sessionId"))
      || !(value.optString("returnTo") == "/request" || route.matches(value.optString("returnTo")))
      || value.optString("phase") !in listOf("prepared", "launched", "returned")) {
      prefs(context).edit().remove(KEY).commit()
      return null
    }
    return value
  }

  @Synchronized fun markLaunched(context: Context, nonce: String): Boolean {
    val value = read(context) ?: return false
    if (value.optString("nonce") != nonce || value.optString("phase") != "prepared") return false
    value.put("phase", "launched")
    check(prefs(context).edit().putString(KEY, value.toString()).commit()) { "PDF_LAUNCH_COMMIT_FAILED" }
    return true
  }

  @Synchronized fun markReturned(context: Context, nonce: String): Boolean {
    val value = read(context) ?: return false
    if (value.optString("nonce") != nonce) return false
    value.put("phase", "returned")
    return prefs(context).edit().putString(KEY, value.toString()).commit()
  }

  @Synchronized fun clear(context: Context, nonce: String?): Boolean {
    val value = read(context) ?: return false
    if (nonce != null && value.optString("nonce") != nonce) return false
    return prefs(context).edit().remove(KEY).commit()
  }
}
