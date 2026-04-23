# NeyNegar Backend

A GraphQL API server for the NeyNegar application built with Node.js, Express, Apollo Server, and MongoDB.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory with at least:
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/neynegar
JWT_KEY=your_jwt_secret

# Optional SMS configs (will fallback to code defaults if unset)
SMS_USERNAME=your_ippanel_username
SMS_PASSWORD=your_ippanel_password
SMS_FROM=3000505
SMS_PROMO_PATTERN=ispyrv56rhgo2yb

# Promo defaults
PROMO_DISCOUNT_PERCENT=10
PROMO_VALID_DAYS=7
```

3. Make sure MongoDB is running on your system

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

GraphQL playground (local dev): http://localhost:4000/graphql

## Daily Promo Scheduler

The server runs a daily job that:

- Finds users with non-empty `bascket` whose `updatedAt` is older than 2 days
- Ensures no promo was sent to them in the last 10 days (via `lastPromoSentAt` on `User`)
- Generates a discount code, stores it in `user.discount`, updates `lastPromoSentAt`, and sends an SMS via ippanel

Configuration via `.env`:

- `PROMO_DISCOUNT_PERCENT` (default 10)
- `PROMO_VALID_DAYS` (default 7)
- `SMS_USERNAME`, `SMS_PASSWORD`, `SMS_FROM`, `SMS_PROMO_PATTERN`

The scheduler starts automatically when the server starts and runs once ~10 seconds after boot, then every 24 hours.
