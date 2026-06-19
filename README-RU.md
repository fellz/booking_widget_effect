# booking_widget_effect

🇬🇧 [Read in English](./README.md)

🚀 **[Живое демо](https://fellz.github.io/booking_widget_effect/)**

Переписанная на [foldkit](https://foldkit.dev) (The Elm Architecture + Effect-TS)
версия Vue 3 виджета бронирования отеля из `../booking_widget`. Цель — измерить,
сколько **дыр в корректности** оригинала архитектура TEA + Effect закрывает
структурно.

Полное сопоставление «аудит → архитектура» см. в **[COMPARISON.md](./COMPARISON.md)**
(9 из 13 дыр закрыты структурно, 4 — на практике, 0 осталось открытых).

## Архитектура

| Зона ответственности | Файл |
|----------------------|------|
| Домен (Schema, поверх `CalendarDate`) | `src/domain/` |
| Model — sum-типы, делающие некорректные состояния непредставимыми | `src/model.ts` |
| Единый источник валидности + smart-constructor `ValidBooking` | `src/validation.ts` |
| Чистый `update` — исчерпывающий, защита от устаревших ответов по request-id, реальный submit | `src/update.ts` |
| Эффекты как значения; команды | `src/command.ts` |
| Доменные порты + граф зависимостей Layer (config → http-клиент → 3 доменных сервиса, mock/http) | `src/services/` |
| Типизированный канал ошибок — ADT + исчерпывающая трансляция `catchTags` в сообщения | `src/domain/errors.ts`, `src/services/`, `src/command.ts` |
| i18n с исчерпывающим сопоставлением локалей | `src/i18n.ts` |
| View (foldkit `html` DSL + Tailwind) | `src/view/` |
| Стартовые флаги (`today`, тема) + связывание рантайма | `src/main.ts`, `src/entry.ts` |
| Тесты — `Story` (update), `Scene` (view), чистая валидация, property-based для дат/времени | `src/*.test.ts`, `src/domain/date.test.ts` |

## Команды

```bash
npm run dev        # dev-сервер на http://localhost:5173
npm test           # 32 теста: Story / Scene / валидация + property-based для дат/времени
npm run typecheck  # tsc --noEmit
npm run build      # продакшен-сборка
npm run lint       # eslint
```

## Property-based тестирование

Чистое ядро работы с датами в `src/domain/date.ts` покрыто property-тестами на
[fast-check](https://github.com/dubzzz/fast-check) в файле `src/domain/date.test.ts`.
Вместо вручную подобранных примеров каждый тест проверяет **инвариант** на 500
случайно сгенерированных календарных датах, а любой контрпример автоматически
сжимается (shrinking) до минимальной формы (например, один день на границе
месяца / года / високосного дня). Проверяемые свойства:

- `eachDayInRange` — пусто ⟺ `to < from`, длина `= daysUntil + 1`, шаг ровно в один день, все дни внутри диапазона и без дубликатов
- `stayNights` — заезд включительно / выезд исключительно (в день выезда не ночуем)
- `nightCount` — никогда не отрицателен; `nightCount(a, a + n) === max(n, 0)`
- `toIsoKey` — всегда `YYYY-MM-DD`, делает round-trip через ISO-кодек и инъективен

По умолчанию виджет работает с in-memory mock-адаптером. Задайте `VITE_API_URL`,
чтобы направить (декодирующий через Schema) HTTP-адаптер на реальный бэкенд.
