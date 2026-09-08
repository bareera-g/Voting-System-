import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEMPLATES } from "../src/lib/templates";

const prisma = new PrismaClient();

async function main() {
  await prisma.ballotReaction.deleteMany();
  await prisma.ballotScore.deleteMany();
  await prisma.ballotRank.deleteMany();
  await prisma.ballot.deleteMany();
  await prisma.outcome.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.option.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.template.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("cerebri", 10);

  const [ceo, cpo, cto, design, finance, cs, viewer] = await Promise.all([
    prisma.user.create({
      data: {
        email: "amira.hassan@cerebri.ai",
        name: "Amira Hassan",
        title: "Chief Executive Officer",
        role: "VOTER",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "julian.okonkwo@cerebri.ai",
        name: "Julian Okonkwo",
        title: "Chief Product Officer",
        role: "ADMIN",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "priya.shah@cerebri.ai",
        name: "Priya Shah",
        title: "Chief Technology Officer",
        role: "VOTER",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "nora.klein@cerebri.ai",
        name: "Nora Klein",
        title: "Head of Design",
        role: "ADMIN",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "david.cho@cerebri.ai",
        name: "David Cho",
        title: "VP Finance / T&E",
        role: "VOTER",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "samira.elamin@cerebri.ai",
        name: "Samira Elamin",
        title: "VP Customer Success",
        role: "VOTER",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "alex.brooks@cerebri.ai",
        name: "Alex Brooks",
        title: "Product Designer",
        role: "VIEWER",
        passwordHash,
      },
    }),
  ]);

  for (const t of TEMPLATES) {
    await prisma.template.create({
      data: {
        key: t.key,
        name: t.name,
        description: t.description,
        defaultBrief: t.defaultBrief,
        defaultWindowHours: t.defaultWindowHours,
        defaultQuorumPercent: t.defaultQuorumPercent,
        criteriaJson: JSON.stringify(t.criteria),
      },
    });
  }

  const opensAt = new Date();
  const closesAt = new Date(opensAt.getTime() + 72 * 60 * 60 * 1000);
  const roster = [
    { userId: ceo.id, role: "VOTER" },
    { userId: cpo.id, role: "VOTER" },
    { userId: cto.id, role: "VOTER" },
    { userId: design.id, role: "VOTER" },
    { userId: finance.id, role: "VOTER" },
    { userId: cs.id, role: "VOTER" },
    { userId: viewer.id, role: "VIEWER" },
  ];
  const voters = [ceo, cpo, cto, design, finance, cs];

  const darkCards = [
    ["01", "Plane top-left · full copy", "Small airplane, then title, subtitle, and description."],
    ["02", "Large centered plane · full copy", "Hero icon in the photo, full text block below."],
    ["03", "Large plane · info · empty body", "Icon-only card. Description lives behind the i-mark."],
    ["04", "Plane · info · Travel only", "Centered title. No subtitle, no paragraph."],
    ["05", "Info · oversized Travel", "Typography is the card. No airplane."],
    ["06", "Info · small plane · title + subtitle", "Two-line identity, no long description."],
    ["07", "Info · Travel → · subtitle", "Title as a link, with Enterprise Travel Intelligence."],
    ["08", "Info · large Travel →", "Title and arrow only. Maximum quiet."],
    ["09", "Plane + info · Travel → · subtitle", "Both chrome and a linked title."],
    ["10", "Plane top-right · full copy", "Icon tucked right; full description returns."],
  ] as const;

  const lightCards = [
    ["01", "Full copy · left", "Title, subtitle, description. Left aligned."],
    ["02", "Full copy · centered", "Same copy, centered under the photo."],
    ["03", "Graphic plane only", "Large silhouette. No type under the image."],
    ["04", "Plane · Travel →", "Graphic plus a linked title."],
    ["05", "Oversized overlapping Travel", "The word Travel sits on the photo edge."],
    ["06", "Info · title + subtitle", "i-mark. No paragraph."],
    ["07", "Info · Travel → · subtitle", "Linked title plus Enterprise Travel Intelligence."],
    ["08", "Large Travel → only", "One line. Maximum quiet."],
    ["09", "Compact Travel → · subtitle", "Smaller type, same structure as 07."],
    ["10", "Full copy · alt spacing", "Title, subtitle, description with more air."],
  ] as const;

  const streams = [
    {
      order: 1,
      title: "Travel cards · dark",
      brief:
        "Ten dark Travel cards from the first board. Like or don’t like each one. Note anything you would improve. A hybrid across cards is allowed.",
      options: darkCards.map(([n, label, caption], i) => ({
        label: `${n} · ${label}`,
        caption,
        jobs: "Dark-mode Travel category card for AIQ.",
        imageUrl: `/cards/dark-${n}.png`,
        sortOrder: i,
      })),
    },
    {
      order: 2,
      title: "Travel cards · light",
      brief:
        "Ten light / type-led Travel cards from the second board. Like or don’t like each one. Note anything you would improve.",
      options: lightCards.map(([n, label, caption], i) => ({
        label: `${n} · ${label}`,
        caption,
        jobs: "Light Travel category card for AIQ.",
        imageUrl: `/cards/light-${n}.png`,
        sortOrder: i,
      })),
    },
    {
      order: 3,
      title: "Customizing cards",
      brief:
        "Should a user be able to change a card’s background and icon? Like or don’t like each piece, and say what you would improve.",
      options: [
        {
          label: "Visual-heavy card",
          caption: "Full-bleed photo, large plane, Travel + i, overflow menu.",
          jobs: "The card face before customize.",
          imageUrl: "/cards/customize-visual.png",
          sortOrder: 0,
        },
        {
          label: "Split / information card",
          caption: "Photo on top, navy footer with title, subtitle, and i.",
          jobs: "The denser card face before customize.",
          imageUrl: "/cards/customize-split.png",
          sortOrder: 1,
        },
        {
          label: "Customize modal",
          caption: "Upload or preset background, pick an icon, save.",
          jobs: "The overflow-menu destination.",
          imageUrl: "/cards/customize-modal.png",
          sortOrder: 2,
        },
      ],
    },
    {
      order: 4,
      title: "Information pop-up",
      brief:
        "The i-mark opens a shared description instead of putting the paragraph on the card. Like or don’t like the trigger and the popup. Note what you would improve.",
      options: [
        {
          label: "How the popup works",
          caption: "Tap the i on a card and the description opens on the right.",
          jobs: "The full flow: both card faces plus the popup.",
          imageUrl: "/mockups/d-information-popup.png",
          sortOrder: 0,
        },
        {
          label: "Full-bleed card + i",
          caption: "Travel sits on the photo with an i beside it.",
          jobs: "Quiet face, description in the popup.",
          imageUrl: "/cards/popup-visual.png",
          sortOrder: 1,
        },
        {
          label: "Split card + i",
          caption: "Navy footer holds Travel, i, and the subtitle.",
          jobs: "A little more identity on the face.",
          imageUrl: "/cards/popup-split.png",
          sortOrder: 2,
        },
        {
          label: "The popup itself",
          caption: "Title, subtitle, first-time description, close.",
          jobs: "Where the long copy lives.",
          imageUrl: "/cards/popup-modal.png",
          sortOrder: 3,
        },
      ],
    },
    {
      order: 5,
      title: "Two-tone icons",
      brief:
        "Like or don’t like each Travel and Contract icon. You can still note the system as a whole.",
      options: [
        {
          label: "The system overall",
          caption: "Gray, magenta, sky, navy. Thick rounded two-tone.",
          jobs: "Should this be the AIQ icon family?",
          imageUrl: "/mockups/e-two-tone-icons.png",
          sortOrder: 0,
        },
        ...[
          ["Airplane", "Travel", "icon-travel-plane.png"],
          ["Paper plane", "Travel", "icon-travel-paper-plane.png"],
          ["Road", "Travel", "icon-travel-road.png"],
          ["Suitcase", "Travel", "icon-travel-suitcase.png"],
          ["City", "Travel", "icon-travel-city.png"],
          ["Binoculars", "Travel", "icon-travel-binoculars.png"],
          ["Compass", "Travel", "icon-travel-compass.png"],
          ["Handshake", "Contract", "icon-contract-handshake.png"],
          ["Address book", "Contract", "icon-contract-address-book.png"],
          ["Open book", "Contract", "icon-contract-open-book.png"],
          ["Bookmark", "Contract", "icon-contract-bookmark.png"],
          ["Folders", "Contract", "icon-contract-folders.png"],
          ["User", "Contract", "icon-contract-user.png"],
          ["Team", "Contract", "icon-contract-team.png"],
        ].map(([label, group, file], i) => ({
          label: `${group} · ${label}`,
          caption: "",
          jobs: `${group} icon.`,
          imageUrl: `/cards/${file}`,
          sortOrder: i + 1,
        })),
      ],
    },
  ];

  for (const stream of streams) {
    const decision = await prisma.decision.create({
      data: {
        title: stream.title,
        brief: stream.brief,
        status: "OPEN",
        templateKey: "CARD_DESIGN",
        ballotType: "REACTION",
        streamOrder: stream.order,
        ownerId: cpo.id,
        facilitatorId: design.id,
        opensAt,
        closesAt,
        quorumPercent: 70,
        options: { create: stream.options },
        invitations: { create: roster },
      },
    });
    await prisma.auditEvent.create({
      data: {
        action: "decision.opened",
        userId: design.id,
        decisionId: decision.id,
        metadata: JSON.stringify({ seed: true, stream: stream.order }),
      },
    });
    await prisma.notification.createMany({
      data: voters.map((u) => ({
        userId: u.id,
        decisionId: decision.id,
        channel: "IN_APP",
        title: "You have a decision",
        body: `${stream.title} is open. Like or don’t like each option, and say what you would improve.`,
      })),
    });
  }

  console.log("Seeded Cerebri AI Decision Room");
  console.log("  Facilitator: nora.klein@cerebri.ai / cerebri");
  console.log("  Owner:       julian.okonkwo@cerebri.ai / cerebri");
  console.log("  Voter:       amira.hassan@cerebri.ai / cerebri");
  console.log("  Viewer:      alex.brooks@cerebri.ai / cerebri");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
