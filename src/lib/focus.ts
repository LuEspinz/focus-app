// Pure focus rules shared by the screens. Kept free of React Native imports so it can be
// unit tested with plain Node (`npm test`).

export const MAX_ACTIVE_MILESTONES = 2;
export const DEFAULT_REMINDER_TIME = '13:00';

export type GoalKind = 'vision' | 'milestone';
export type GoalStatus = 'active' | 'paused' | 'done';

export type FocusGoal = {
  id: string;
  kind: GoalKind;
  status: GoalStatus;
  parent_goal_id: string | null;
};

export type FocusAction = {
  id: string;
  goal_id: string;
  days_of_week: number[];
  archived: boolean;
};

/** Splits goals into the active vision and its active milestones, and counts open slots. */
export function focusSlots<G extends FocusGoal>(goals: G[]) {
  const vision = goals.find((g) => g.kind === 'vision' && g.status === 'active') ?? null;
  const milestones = goals.filter((g) => g.kind === 'milestone' && g.status === 'active');
  return {
    vision,
    milestones,
    openMilestoneSlots: vision ? Math.max(0, MAX_ACTIVE_MILESTONES - milestones.length) : 0,
  };
}

/** Actions scheduled for the given date's weekday (0 = Sunday), excluding archived ones. */
export function actionsForDay<A extends FocusAction>(actions: A[], date: Date): A[] {
  const weekday = date.getDay();
  return actions.filter((a) => !a.archived && a.days_of_week.includes(weekday));
}

/** Local calendar date as YYYY-MM-DD, which is what check_ins.date stores. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Monday of the date's week as YYYY-MM-DD, used as commitments.week_start. */
export function weekStartKey(date: Date): string {
  const monday = new Date(date);
  const offset = (date.getDay() + 6) % 7;
  monday.setDate(date.getDate() - offset);
  return localDateKey(monday);
}

/** Parses a Postgres time ("13:00" or "13:00:00") into hour and minute. */
export function parseReminderTime(value: string | null | undefined) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '') ?? /^(\d{1,2}):(\d{2})/.exec(DEFAULT_REMINDER_TIME)!;
  const hour = Math.min(23, Number(match[1]));
  const minute = Math.min(59, Number(match[2]));
  return { hour, minute };
}
