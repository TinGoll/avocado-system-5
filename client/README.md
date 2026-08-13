#### Staff Desk Client

Для запуска:

1. Установить node.js

2. Выполнить

```bash
cd client
npm i
npm run dev
```
# MSW mocks

В режиме разработки запросы API по умолчанию перехватываются MSW, поэтому
локальный backend для запуска клиента не требуется. Моковые данные находятся в
`src/shared/api/mocks/mock-data.ts`; обработчики запросов — в
`src/shared/api/mocks/handlers.ts`.

Чтобы использовать реальный backend, добавьте в локальный `.env`:

```env
VITE_ENABLE_MSW=false
VITE_API_BASE_URL=http://localhost:3000/api
```

Префикс `/api` можно не указывать: клиент добавит его автоматически.
При локальном запуске `VITE_API_BASE_URL` можно не задавать: Vite перенаправит
запросы `/api` на `http://localhost:3000`.
