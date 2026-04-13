# RIK-EXPO AUDIT REPORT

## 1. Critical Issues (P0)

**AUTH_TIMEOUT_LOGOUT (Watchdog Freeze)**
- **Файл/строка:** `app/_layout.tsx` (Блок `while (Date.now() - startedAt <= AUTH_EXIT_SESSION_SETTLE_WINDOW_MS)`)
- **Риск:** Блокировка UI потока на 2500мс. iOS убивает приложение (Watchdog Timeout - SIGKILL) при попытке авторизоваться с плохой сетью.
- **Как воспроизвести:** Включить 3G Throttling, разлогиниться, залогиниться. Экран "зависнет" черным на несколько секунд и может упасть.

**PDF_IOS_SHAREASYNC_SIGABRT (Native Crash)**
- **Файл/строка:** `src/lib/pdfRunner.ts` -> `Sharing.shareAsync`
- **Риск:** iOS приложение падает (SIGABRT Memory Limit) при попытке передать Base64 PDF размером более 10МБ через JS-Bridge.
- **Как воспроизвести:** Открыть отчет директора за месяц (крупный PDF). Нажать "Share". Моментальный вылет на iOS.

## 2. High Issues (P1)

**PDF_VIEWER_MEMORY_PRESSURE (God File + OOM)**
- **Файл/строка:** `app/pdf-viewer.tsx`
- **Риск:** Файл разросся до 1589 строк. Смешана бизнес-логика, нативный UI, веб IFRAME и файловая система. Memory leak при последовательном открытии PDF (замыкания timeout и refs).
- **Как воспроизвести:** Быстро открыть и закрыть 5 разных PDF. Приложение начнет жестко тормозить или упадет.

**OFFICE_HUB_COUPLING (Navigation State Loss)**
- **Файл/строка:** `src/screens/office/OfficeHubScreen.tsx`
- **Риск:** Файл в 2644 строк, обслуживающий сразу все роли (God Object). Огромная зависимость от ролей затягивает время парсинга (TBT).
- **Как воспроизвести:** Использовать флоу "Office → Warehouse → Back".

**DATA_RACE_CONDITION_PROMISES (Stale Closures & Memory Leak)**
- **Файл/строка:** `src/screens/director/hooks/useDirectorReportsController.ts` (и аналогичные)
- **Риск:** Ручная реализация системы Cache и In-flight очередей запроса через `useRef<Map>`. Утечка памяти при размонтировании и "фантомные" Alert-сообщения об ошибках на других экранах.
- **Как воспроизвести:** Запустить загрузку отчета склада, нажать "Назад" до окончания спиннера. Ошибка все равно "догонит" пользователя в виде Alert на главном экране.

## 3. Medium Issues (P2)
- **SILENT_CATCH_DATA_LOSS:** Найдены `catch {}` в файлах `app/_layout.tsx` и система пуш-уведомлений `src/lib/notify.native.ts`. Проглатывание ошибок без Telemetry.
- **NO_GRACEFUL_DEGRADATION:** При падении `loadReportScope` нет визуального fallback состояния, кроме нативного Alert блока.

## 4. Architecture Findings
- **Разделение слоев:** Нарушено. UI слой содержит прямые вызовы FileSystem (в PDF vIewer) и тяжелые while()-циклы (в Root Layout).
- **God-файлы:** 27 файлов превышают 500 строк. `OfficeHubScreen` и `database.types` — критические нарушители.
- **Coupling:** Жесткая привязка ролей друг к другу через общий хаб.

## 5. Stability Findings
- Runtime стабильность крайне зависима от ручных контроллеров `reqSeqRef`. Система не имеет единого слоя Data Fetching (например, React Query), что вызывает спонтанные краши при быстрых тапах в UI (Unmounted Component State update).

## 6. Security Findings
- Поверхностный аудит не выявил слива service_role key, однако использование локального кэша для PDF может оставлять документы (PII) в папке после Logout на устройствах Android. Требуется строгая очистка (Purge) `FileSystem.cacheDirectory` при `signOut`.

## 7. Observability Gaps
- Очень шумное логирование `console.info("[pdf-viewer] ...")`.
- Отсутствие Correlation ID для транзакционных запросов в Supabase.

---
STATUS: AUDIT COMPLETE
CRITICAL ISSUES: 2
HIGH ISSUES: 3
READY FOR FIX WAVES: YES
