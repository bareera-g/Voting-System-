# Cerebri AI Decision Room

Internal tool for Cerebri AI to vote on AIQ card designs. Tap your name, like or don’t like each option, then check **Board** for the ranking.

## Run locally

```bash
npm install
cp env.example .env
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Tap a name to start. Production needs `DATABASE_URL` (Postgres) and `AUTH_SECRET` set on the host.
