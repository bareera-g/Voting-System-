# Cerebri AI Decision Room

Internal voting for Cerebri AI design decisions.

Sign in with your full name, like or don’t like each option (once per vote), create new text or image votes, and check **Board** for rankings.

## Run

```bash
npm install
cp env.example .env
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Needs `DATABASE_URL` and `AUTH_SECRET` (local `.env` and Vercel).
