# Audit: State Management, Hook Soup & Stale-Response Risks

**Criticallity: P1 (HIGH)**

В проекте отсутствует контролируемый менеджер состояний (Redux / Zustand / React Query). Вместо этого разработчики полагаются на встроенные локальные React-состояния (`useState`) и побочные эффекты (`useEffect`), растягивая их на огромные деревья компонентов. По мере роста приложения это привело к "супу из хуков" (Hook Soup) и состояниям гонки (Race conditions).

## 1. Категория: Hook Soup (Перегрузка эффектами)

**Описание проблемы:**
В компонентах (например `BuyerMobileItemEditorModal` или `warehouse.utils.ts`) по 3-5 зависящих друг от друга хуков `useEffect`. Например, один следит за `catalogItem`, другой за `supplier`, третий пересчитывает `price` на их основе.
**Проявление:** UI мерцает, выпадающие списки (Dropdowns) теряют фокус, при открытии модалок клавиатура дергается. Компонент рендерится 5-6 раз подряд вместо 1-го. В `useBuyerFlow` сложные асинхронные цепочки.

**Roadmap вывода:**
Изолировать производные данные. Если `totalPrice` зависит от `amount` и `tax`, не нужно класть его в `useState` через `useEffect`. Нужно считать налету: `const totalPrice = amount * tax;`. 🔴 Для асинхронных операций (Data Fetching) использовать SWR / React Query.

## 2. Категория: Stale-response risks (Гонки) & Memory Leaks

**Описание проблемы:**
Когда компонент (`WarehouseReportsTab.tsx`) запрашивает данные из базы, запрос летит в сеть (2-4 секунды). Если пользователь закрыл шторку/перешел на другой таб, компонент уничтожается. Когда ответ наконец приходит от сервера, `supabase` пытается вызвать `setItems(data)`, что приводит к ошибке React (`Can't perform a React state update on an unmounted component`). Кроме того, если было сделано 2 поисковых запроса подряд (например "Болт M10" и "Болт M12"), может так случиться, что ответ на "M10" придет позже, и в UI застрянет `stale-data`.

**Roadmap вывода:**
Внедрить `AbortController`. При уничтожении компонента (хук `useEffect(() => { return () => controller.abort() })`) прерывать fetch. Для поиска — использовать хук `useDebounce` не только на текст, но и на отмену предыдущих промисов.

## 3. Проброс состояния (Prop drilling)

Передача `setSelectedItem`, `onClose`, `onSave` сквозь 5-6 уровней компонентов: `Screen -> Container -> Tabs -> List -> Card -> Button`.
**Риск:** Разрыв цепочки приводит к тому, что кнопка "Сохранить" перестает работать.
**Roadmap:** Создать `Zustand` store (микро-стейт: `useContractorStore`, `useBuyerStore`), где будут лежать функции мутации и глобальные флаги типа `isLoading`, `isSaving`.
