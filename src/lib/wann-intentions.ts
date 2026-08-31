/**
 * IDEA / LATER / GOAL + Review Timer — a separate "intent layer".
 *
 * Design (agreed with user 2026-08-31):
 *  - The existing Project (`planner_multiple_tasks`) + Task execution layer is
 *    NOT touched. It keeps doing exactly what it does today.
 *  - `planner_intentions` is a brand-new, independent table for things that
 *    are NOT yet execution: an idea, something to think about later, or a
 *    goal you're not ready to break into tasks yet.
 *  - A Review Timer is a *time horizon*, not a countdown: "review in 1 month"
 *    means "stop thinking about this, and safely resurface it in ~1 month".
 *  - Review state (next_review_date / last_reviewed_at) lives on the single
 *    intention row — carrying it forward never creates a duplicate row and
 *    never creates a `planner_tasks` row. Overdue-ness is *derived*, not
 *    stored, from `next_review_date` vs. today.
 *  - "Start Project" creates (or links) a normal `planner_multiple_tasks`
 *    row via `linked_project_id` — that's the only place the two layers
 *    touch, and it's optional.
 *
 * All calendar math for the Review Timer is centralized here so KEEP /
 * SNOOZE / initial-set all compute dates the same, calendar-safe way.
 */
import { addWeeks, addMonths, addYears } from "date-fns";
import { parseLocalDate, formatLocalDate, todayLocalStr, type Intention } from "@/lib/wann-data";

export type IntentionStage = "idea" | "later" | "goal";
export type IntentionStatus = "active" | "archived" | "completed";
export type ReviewInterval =
  | "never"
  | "1_week"
  | "1_month"
  | "3_months"
  | "6_months"
  | "1_year"
  | "custom";

export const REVIEW_INTERVAL_LABEL: Record<ReviewInterval, string> = {
  never: "Never",
  "1_week": "Review in 1 week",
  "1_month": "Review in 1 month",
  "3_months": "Review in 3 months",
  "6_months": "Review in 6 months",
  "1_year": "Review in 1 year",
  custom: "Custom",
};

export const STAGE_LABEL: Record<IntentionStage, string> = {
  idea: "Idea",
  later: "Later",
  goal: "Goal",
};

/**
 * Calendar-safe interval addition — the single source of truth for every
 * Review Timer date computation (initial set, KEEP, SNOOZE).
 *
 * "1 month" / "3 months" / "6 months" / "1 year" all add *calendar* months
 * or years (via date-fns, which clamps to the last valid day of the target
 * month rather than overflowing) — never a fixed day count. Only "custom"
 * uses a literal day count.
 *
 * Example: Aug 31 + 1 month -> Sep 30 (clamped), not Oct 1.
 */
export function addCalendarInterval(
  fromDateStr: string,
  interval: ReviewInterval,
  customDays?: number | null,
): string | null {
  const from = parseLocalDate(fromDateStr);
  switch (interval) {
    case "never":
      return null;
    case "1_week":
      return formatLocalDate(addWeeks(from, 1));
    case "1_month":
      return formatLocalDate(addMonths(from, 1));
    case "3_months":
      return formatLocalDate(addMonths(from, 3));
    case "6_months":
      return formatLocalDate(addMonths(from, 6));
    case "1_year":
      return formatLocalDate(addYears(from, 1));
    case "custom": {
      const days = customDays ?? 0;
      if (days <= 0) return null;
      const d = new Date(from);
      d.setDate(d.getDate() + days);
      return formatLocalDate(d);
    }
    default:
      return null;
  }
}

export type ReviewStatus = "none" | "upcoming" | "due" | "overdue";

/**
 * Derived (never stored) review status: today vs. next_review_date.
 */
export function reviewStatus(
  nextReviewDate: string | null,
  todayStr: string = todayLocalStr(),
): ReviewStatus {
  if (!nextReviewDate) return "none";
  if (nextReviewDate === todayStr) return "due";
  if (nextReviewDate < todayStr) return "overdue";
  return "upcoming";
}

/** Active intentions whose Review Timer is due or overdue right now. */
export function dueOrOverdueIntentions(
  intentions: Intention[],
  todayStr: string = todayLocalStr(),
): Intention[] {
  return intentions.filter(
    (i) =>
      i.status === "active" &&
      !!i.next_review_date &&
      (i.next_review_date <= todayStr),
  );
}

/**
 * Whether an intention's Review item should render on the Timeline for a
 * given calendar date: from its due date onward (so it "carries forward"
 * every day, unhandled, without ever creating a second row), but never on
 * a future date before it's actually due.
 */
export function reviewShowsOnDate(intention: Intention, dateStr: string): boolean {
  return (
    intention.status === "active" &&
    !!intention.next_review_date &&
    intention.next_review_date <= dateStr
  );
}

/** KEEP: recompute the next review date from the *configured interval*, from today. */
export function nextReviewDateForKeep(intention: Intention, todayStr: string = todayLocalStr()): string | null {
  return addCalendarInterval(todayStr, intention.review_interval as ReviewInterval, intention.review_interval_days);
}

/** SNOOZE: only the date changes — interval/config is left untouched. */
export function nextReviewDateForSnooze(
  snoozeInterval: ReviewInterval,
  customDays?: number | null,
  todayStr: string = todayLocalStr(),
): string | null {
  return addCalendarInterval(todayStr, snoozeInterval, customDays);
}
