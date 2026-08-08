/**
 * The rules of the package lifecycle, in one place.
 *
 * Every screen and every route asks these questions — "can they pay yet?",
 * "is this already used up?" — and answering them inline in each caller is
 * how a client ends up paying twice for the same thing.
 */

export type AssignmentStatus =
  | "offered"
  | "requested"
  | "approved"
  | "declined"
  | "active"
  | "paid"
  | "completed"
  | "cancelled";

export interface AssignmentLike {
  status: AssignmentStatus | string;
  paid?: boolean;
}

/** A package that has been paid for is finished — it can't be bought again. */
export const isConsumed = (a: AssignmentLike) =>
  !!a.paid || ["paid", "completed"].includes(a.status);

/** The client may ask for it: nothing is in flight and it isn't used up. */
export const canRequest = (a: AssignmentLike) =>
  !isConsumed(a) && ["offered", "declined", "cancelled"].includes(a.status);

/** The owner has a decision to make. */
export const needsDecision = (a: AssignmentLike) => a.status === "requested";

/**
 * Payment is open ONLY here. Not while it's merely offered, and never again
 * once it's paid.
 */
export const canPay = (a: AssignmentLike) =>
  !isConsumed(a) && a.status === "approved";

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  offered: "Ready for you",
  requested: "Waiting for approval",
  approved: "Approved — payment open",
  declined: "Declined",
  active: "In progress",
  paid: "Paid",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Tailwind classes per state, so every screen colours them the same way. */
export const STATUS_TONE: Record<AssignmentStatus, string> = {
  offered: "bg-accent/10 border-accent/25 text-accent",
  requested: "bg-amber-500/10 border-amber-500/25 text-amber-400",
  approved: "bg-green-500/10 border-green-500/25 text-green-400",
  declined: "bg-red-500/10 border-red-500/25 text-red-400",
  active: "bg-indigo-500/10 border-indigo-500/25 text-indigo-300",
  paid: "bg-green-500/15 border-green-500/30 text-green-300",
  completed: "bg-white/5 border-white/15 text-gray-300",
  cancelled: "bg-white/5 border-white/10 text-gray-500",
};

/** What the client should be told to do next, if anything. */
export function clientHint(a: AssignmentLike): string {
  if (isConsumed(a)) return "Paid — nothing further to do.";
  switch (a.status) {
    case "offered":
      return "Request it and I'll confirm before anything is charged.";
    case "requested":
      return "I've got your request — you'll be able to pay once I approve it.";
    case "approved":
      return "Approved. You can pay now.";
    case "declined":
      return "Not approved this time. Message me and we'll sort it out.";
    default:
      return "";
  }
}
