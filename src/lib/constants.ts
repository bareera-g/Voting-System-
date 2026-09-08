export const ROLES = ["ADMIN", "VOTER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const DECISION_STATUSES = [
  "DRAFT",
  "OPEN",
  "QUORUM_MET",
  "CLOSED",
  "ARCHIVED",
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const OUTCOME_TYPES = ["CHOSEN", "HYBRID", "REOPEN"] as const;
export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export const INVITE_ROLES = ["VOTER", "VIEWER"] as const;

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

export const SESSION_COOKIE = "dr_session";

export const DEMO_PASSWORD = "cerebri";
