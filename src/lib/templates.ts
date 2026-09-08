export type TemplateCriterion = {
  name: string;
  description: string;
  weight: number;
};

export type DecisionTemplate = {
  key: string;
  name: string;
  description: string;
  defaultBrief: string;
  defaultWindowHours: number;
  defaultQuorumPercent: number;
  criteria: TemplateCriterion[];
};

export const TEMPLATES: DecisionTemplate[] = [
  {
    key: "CARD_DESIGN",
    name: "Card design review",
    description:
      "Compare visual directions for AIQ card surfaces. Score the jobs a card must do, then rank.",
    defaultWindowHours: 72,
    defaultQuorumPercent: 70,
    defaultBrief:
      "Cerebri AI is integrating Travel category cards into AIQ. These are the live mockups: two layout families (dark overlay vs type-led), plus customize, information popup, and the two-tone icon system. Score each board against the rubric, rank them, and leave one sentence on your top choice. A hybrid is allowed — the vote informs the decision; the owner records the outcome.",
    criteria: [
      {
        name: "Scanability",
        description: "A T&E user can read the card’s primary fact in two seconds.",
        weight: 1.2,
      },
      {
        name: "Information honesty",
        description: "The card only promises data AIQ can align with confidence.",
        weight: 1.2,
      },
      {
        name: "Brand / trust",
        description: "Finance-grade: calm, precise, not a consumer widget.",
        weight: 1,
      },
      {
        name: "Density vs. calm",
        description: "Enough signal for a decision, not a dashboard stuffed into a card.",
        weight: 1,
      },
      {
        name: "Implementation confidence",
        description: "We could ship this direction without a platform rewrite.",
        weight: 0.8,
      },
    ],
  },
  {
    key: "GO_NO_GO",
    name: "Go / no-go",
    description: "Ship, wait, or kill a product bet with named accountability.",
    defaultWindowHours: 48,
    defaultQuorumPercent: 70,
    defaultBrief:
      "Should we proceed? Score each path, rank them, and state the risk you are willing to own.",
    criteria: [
      {
        name: "Customer value",
        description: "Does this solve a job a customer will pay for or retain for?",
        weight: 1.2,
      },
      {
        name: "Strategic fit",
        description: "Does this compound AIQ, or is it a distraction?",
        weight: 1.1,
      },
      {
        name: "Delivery risk",
        description: "Can we ship a trustworthy version in the stated window?",
        weight: 1,
      },
      {
        name: "Reversibility",
        description: "If we are wrong, how expensive is the unwind?",
        weight: 0.8,
      },
    ],
  },
  {
    key: "NAMING",
    name: "Naming",
    description: "Choose a name with criteria, not a hallway poll.",
    defaultWindowHours: 48,
    defaultQuorumPercent: 60,
    defaultBrief:
      "Pick the name we can live with in market, legal, and product surfaces. Score, rank, and say why your top choice travels.",
    criteria: [
      {
        name: "Clarity",
        description: "A new customer can guess what it is.",
        weight: 1.2,
      },
      {
        name: "Distinctiveness",
        description: "It does not collapse into generic AI vocabulary.",
        weight: 1,
      },
      {
        name: "Sayability",
        description: "Sales and CS can say it on a call without wincing.",
        weight: 1,
      },
      {
        name: "Longevity",
        description: "It still works if the surface grows.",
        weight: 0.8,
      },
    ],
  },
  {
    key: "CUSTOM",
    name: "Custom decision",
    description: "Blank rubric. Facilitator defines the jobs to be scored.",
    defaultWindowHours: 72,
    defaultQuorumPercent: 70,
    defaultBrief: "",
    criteria: [
      {
        name: "Criterion 1",
        description: "What good looks like.",
        weight: 1,
      },
    ],
  },
];

export function getTemplate(key: string) {
  return TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[TEMPLATES.length - 1];
}
