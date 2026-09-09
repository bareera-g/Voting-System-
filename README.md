# Cerebri AI Decision Room

Internal tool for Cerebri AI to vote on AIQ card designs. Enter your full name, like or don’t like each option, then check **Board** for the ranking. Each voter can submit once per stream.

## Run locally

```bash
npm install
cp env.example .env
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

The entered name must match an existing voter, ignoring capitalization. Production needs `DATABASE_URL` and `AUTH_SECRET`.
