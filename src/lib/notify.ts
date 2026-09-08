import { prisma } from "./prisma";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

type NotifyInput = {
  userIds: string[];
  decisionId?: string;
  title: string;
  body: string;
  href?: string;
};

async function sendEmail(to: string, title: string, body: string, href: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Cerebri AI Decision Room <decisions@cerebri.ai>",
      to,
      subject: title,
      html: `<p>${body}</p><p><a href="${href}">Open the Decision Room</a></p>`,
    }),
  });
  return res.ok;
}

async function sendSlack(title: string, body: string, href: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `*${title}*\n${body}\n${href}`,
    }),
  });
  return res.ok;
}

export async function notify(input: NotifyInput) {
  const href = input.href
    ? `${APP_URL}${input.href}`
    : input.decisionId
      ? `${APP_URL}/decisions/${input.decisionId}`
      : APP_URL;

  const users = await prisma.user.findMany({
    where: { id: { in: input.userIds } },
  });

  for (const user of users) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        decisionId: input.decisionId,
        channel: "IN_APP",
        title: input.title,
        body: input.body,
      },
    });

    const emailed = await sendEmail(user.email, input.title, input.body, href);
    if (emailed) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          decisionId: input.decisionId,
          channel: "EMAIL",
          title: input.title,
          body: input.body,
        },
      });
    }
  }

  const slacked = await sendSlack(input.title, input.body, href);
  if (slacked && users[0]) {
    await prisma.notification.create({
      data: {
        userId: users[0].id,
        decisionId: input.decisionId,
        channel: "SLACK",
        title: input.title,
        body: input.body,
      },
    });
  }

  if (!process.env.RESEND_API_KEY) {
    console.info("[notify:email-skipped]", input.title, input.userIds);
  }
}

export async function decisionHref(decisionId: string, path = "") {
  return `/decisions/${decisionId}${path}`;
}
