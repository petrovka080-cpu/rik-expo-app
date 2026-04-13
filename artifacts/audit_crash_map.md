# RIK-EXPO - CRASH SUSPECT MAP (SIGABRT & OOM)

Основные векторы жестких падений (Hard Crashes & Watchdog timeouts), обнаруженные при статическом аудите.

## 1. 💥 iOS SIGABRT (Native Boundaries)
- **Файлы:** `src/lib/pdfRunner.ts` -> `Sharing.shareAsync`
- **Проблема:** Передача тяжелого Base64 PDF через React Native Bridge в `shareAsync` вызывает мгновенный `SIGABRT` из-за Memory Limit (50MB+ bridge payload). На iOS документы должны передаваться строго как `file://` URI.

## 2. 💥 Watchdog Timeout Freeze
- **Файл:** `app/_layout.tsx` (Post-Auth Session Settle)
- **Проблема:** Цикл `while (Date.now() - startedAt <= AUTH_EXIT_SESSION_SETTLE_WINDOW_MS)` с `setTimeout` блокировкой. На медленном 3G или девайсах с троттлингом (low battery) это заморозит JS Thread, и операционная система (iOS) "убьет" приложение (Watchdog termination pid_xx).

## 3. 💥 OOM & WebView Crash
- **Файл:** `app/pdf-viewer.tsx`
- **Проблема:** `NativePdfWebView` (react-native-webview) загружает массивные BLOB в iframe/webview. Отсутствует `<WebView onContentProcessDidTerminate={...} />`. В случае нехватки памяти (OOM) WebView умирает, оставляя белый экран без триггера `Error Boundary`, что выглядит как краш.

## 4. 💥 Async Race Conditions (Unmounted SetState)
- **Файлы:** `src/screens/warehouse/hooks/useWarehouseFetchRefs.ts`, `src/screens/director/hooks/useDirectorReportsController.ts`
- **Проблема:** Из-за кастомной логики in-flight очередей происходят вызовы стейтов (setState) и Alert.alert на размонтированных экранах при быстром роутинге (`router.replace` -> user taps Back). Вызывает warning и потенциальные утечки React-дерева.
