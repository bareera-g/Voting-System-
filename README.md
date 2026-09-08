# Cerebri AI Decision Room

Standalone internal tool for Cerebri AI senior leadership to make named, auditable decisions. The first template is **AIQ card design review**. The vote informs the decision; the owner records Chosen, Hybrid, or Reopen.

See [DECISION_SPEC.md](./DECISION_SPEC.md) for the first decision’s brief, rubric, roster, quorum, and window.

## What it does

- Named ballots (scores 1–5 on a rubric + forced rank + one-sentence rationale)
- Tallies stay sealed until close, then a named heatmap and voter table
- Split / hybrid recommendation when options win different criteria
- Admin lifecycle: draft → open → quorum → close → owner outcome → archive
- Templates: card design, go/no-go, naming, custom
- Viewer role, owner override with a required reason, CSV + print pack
- In-app notices; email via Resend and Slack via webhook when configured
- Home is **what I owe**

## Run locally

```bash
npm install
cp env.example .env   # already present in this repo as .env for local demo
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo password for every roster account: `cerebri`

| Person | Role | Email |
| --- | --- | --- |
| Nora Klein | Head of Design (facilitator) | nora.klein@cerebri.ai |
| Julian Okonkwo | CPO (decision owner) | julian.okonkwo@cerebri.ai |
| Amira Hassan | CEO (voter) | amira.hassan@cerebri.ai |
| Alex Brooks | Product designer (viewer) | alex.brooks@cerebri.ai |

## Optional delivery

Set `RESEND_API_KEY` to send email on open, reminder, and close.  
Set `SLACK_WEBHOOK_URL` to post the same events to a channel.  
Without those, notices stay in-app (and are logged).

Reminders also run at `GET /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET`.

## Stack

Next.js, TypeScript, Prisma, SQLite (swap `DATABASE_URL` to Postgres in production), JWT sessions.
