# Audit: Runtime, Memory Hacks & Platform Workarounds

**Criticallity: P2 (MEDIUM-HIGH)**

В этой категории собраны системные "хаки", таймеры и обходные пути (Workarounds), направленные на борьбу с несовершенством железа, задержками файловой системы и платформенными багами. Большинство из них являются костылями, маскирующими реальные архитектурные дыры.

## 1. Категория: Timers (`setTimeout` / `setInterval`)

**Файлы-доноры:**
Широкое покрытие (от `Accountant Screen` до `pdf.ts` и `Dropdowns`).

**Описание проблемы:**
`setTimeout(..., 100)` используется массово для того, чтобы:
- Дождаться закрытия модального окна (Bottom Sheet) перед открытием нового (предотвращение iOS UI-бага блокировки Navigation Stack).
- Дождаться отпускания клавиатуры на Android.
- `uiYield` (задержки в цикле `pdf.ts`), чтобы дать нативному UI-потоку "подышать" и перерисовать кадр.

**Риск:** Это "мэджик-таймеры" (Magic timers). 100мс может хватить на iPhone 15, но на медленном Android-бюджетнике окно не успеет закрыться, и приложение намертво зависнет (Deadlock модалок).
**Roadmap:** Использовать lifecycle callback'и: `onModalHide={openNextModal}`, `Keyboard.addListener('keyboardDidHide', ...)` и `InteractionManager.runAfterInteractions` вместо слепых таймеров.

## 2. Категория: Cache/Memory Hacks (`cacheDirectory` Growth)

**Файлы-доноры:**
- `src/lib/fileSystemPaths.ts`
- `src/lib/api/pdf.ts`
- `src/lib/documents/pdfDocumentSessions.ts`

**Описание проблемы:**
Приложение генерирует массивные PDF документы (от 5MB до 20MB) и сохраняет их в `FileSystem.cacheDirectory` (через Legacy API или новый `Paths`).
Имена файлов уникализированы (`gen_{Date.now()}.pdf`), чтобы избежать перезаписи и проблем навигации.
**Уязвимость:** Папка Кэша никогда программно **НЕ ОЧИЩАЕТСЯ**. Сгенерировав 100 актов, пользователь навсегда заберет 2 ГБ памяти устройства. OS очистит её только тогда, когда у телефона кончится место.

**Roadmap:** 
Написать "уборщика" (Garbage Collector). При старте приложения (или при логине) запускать асинхронную функцию: `const files = await FileSystem.readDirectoryAsync(cacheDir);` — если файл старше 24 часов (или файлов больше 50), запускать `FileSystem.deleteAsync()`.

## 3. Категория: Framework/Platform Workarounds

**Описание проблемы:**
- Expo SDK 54 vs iOS 18 Crash: попытка избежать SIGABRT крашей от `expo-print` путем конвертации PDF в 30 МБ строчный формат Base64 (`pdf.ts: printToFileAsync({ base64: true })»). Это привело к `Hermes OOM` OOM (Out-of-memory).
- `fix-web-dom.js`: хаки для заставления веб-сборок (Web/Vite) работать с React Native хуками, которые там не поддерживаются.
- `queueWorker.ts`: кастомный worker задержек сети, имитирующий offline-first поведение.

**Roadmap:**
Костыли 플랫폼ного уровня снимаются **исключительно** сборкой нативных клиентов под конкретные SDK. Для PDF: отказ от `base64`, использование `File.copy` + выпуск `.ipa` в TestFlight через EAS, а не ОTA (`eas update`). Для Web: использование `Platform.OS === 'web'` и динамических импортов React-DOM пакетов.
