# RIK-EXPO - HOT PATHS

Основные маршруты, где концентрируется 90% нагрузки и где слом логики приведет к критическому сбою бизнес-флоу.

## 1. Auth Entry
**Точки входа:** `app/auth/login.tsx`, `app/_layout.tsx` (Root Auth Gate)
**Риск:** Бесконечные циклы авторизации при восстановлении сессии (`getSessionSafe`). Ручное отслеживание стейта сессии во время монтирования Root Layout подвержено гонкам (Race Condition), особенно при медленном интернете.

## 2. PDF Open Flow
**Точки входа:** `src/lib/pdfRunner.ts`, `app/pdf-viewer.tsx`
**Риск:** Краш при открытии (OOM / SIGABRT). Весь флоу открытия PDF провязан через монолитный обработчик в Web, iOS и Android. Переход Native WebView ↔ React Native State крайне нестабилен при тяжелом весе файла.

## 3. Navigation Flows (Office → Warehouse → Back)
**Точки входа:** Обычные Expo Router вызовы `router.push('/warehouse')`
**Риск:** Нативное кэширование стека на iOS и Android. Использование `router.push` внутри глубоких стендэлоун деревьев вместо нормализованных вкладок приводит к дублированию стейта, а кнопка "назад" крашит систему из-за попытки обратиться к стертым `useRef` в `OfficeHubScreen`.

## 4. Office Hub
**Точки входа:** `src/screens/office/OfficeHubScreen.tsx`
**Риск:** Этот экран в 2600 строк кода служит шлюзом для *всех* пользователей (Foreman, Director, Accountant, Warehouse). Рендер-бутылочное горлышко. Любое изменение в нем деградирует FPS (Frames Per Second) всего офисного интерфейса из-за перерендера глобального стора.
