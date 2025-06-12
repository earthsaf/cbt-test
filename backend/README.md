# Backend

Node.js (Express) API for CBT system, with PostgreSQL, Telegram bot, WebSocket proctoring, and notifications.

## Setup

1. Copy `.env.example` to `.env` and fill in values.
2. `npm install`
3. `npm run dev` (development) or `npm start` (production)

## Structure
- `src/models/` — Sequelize models
- `src/controllers/` — Route handlers
- `src/routes/` — Express routes
- `src/services/` — Business logic, notifications, proctoring
- `src/bot/` — Telegram bot logic
- `src/middlewares/` — Auth, error handling
- `src/utils/` — Helpers
- `tests/` — Jest tests

## Testing

Run all tests:

```
npm test
```

## Docker Compose

To run backend and PostgreSQL together:

```
docker-compose up --build
``` 