import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  actionsForDay,
  focusSlots,
  localDateKey,
  parseReminderTime,
  weekStartKey,
  type FocusAction,
  type FocusGoal,
} from './focus.ts';

const vision: FocusGoal = { id: 'v', kind: 'vision', status: 'active', parent_goal_id: null };
const milestone = (id: string, status: FocusGoal['status'] = 'active'): FocusGoal => ({
  id,
  kind: 'milestone',
  status,
  parent_goal_id: 'v',
});

test('focusSlots finds the vision and counts open milestone slots', () => {
  assert.deepEqual(focusSlots([]).openMilestoneSlots, 0);
  assert.equal(focusSlots([vision]).openMilestoneSlots, 2);
  assert.equal(focusSlots([vision, milestone('a')]).openMilestoneSlots, 1);
  assert.equal(focusSlots([vision, milestone('a'), milestone('b')]).openMilestoneSlots, 0);
  assert.equal(focusSlots([vision, milestone('a'), milestone('b', 'done')]).openMilestoneSlots, 1);
});

test('actionsForDay keeps scheduled, non-archived actions', () => {
  const actions: FocusAction[] = [
    { id: 'every', goal_id: 'a', days_of_week: [0, 1, 2, 3, 4, 5, 6], archived: false },
    { id: 'weekdays', goal_id: 'a', days_of_week: [1, 2, 3, 4, 5], archived: false },
    { id: 'archived', goal_id: 'a', days_of_week: [0, 1, 2, 3, 4, 5, 6], archived: true },
  ];
  const sunday = new Date(2026, 9, 18);
  const thursday = new Date(2026, 9, 15);
  assert.deepEqual(actionsForDay(actions, sunday).map((a) => a.id), ['every']);
  assert.deepEqual(actionsForDay(actions, thursday).map((a) => a.id), ['every', 'weekdays']);
});

test('date keys use the local calendar and Monday week starts', () => {
  assert.equal(localDateKey(new Date(2026, 9, 5)), '2026-10-05');
  assert.equal(weekStartKey(new Date(2026, 9, 15)), '2026-10-12');
  assert.equal(weekStartKey(new Date(2026, 9, 18)), '2026-10-12');
  assert.equal(weekStartKey(new Date(2026, 9, 12)), '2026-10-12');
});

test('parseReminderTime reads Postgres times and falls back to 1 pm', () => {
  assert.deepEqual(parseReminderTime('08:30:00'), { hour: 8, minute: 30 });
  assert.deepEqual(parseReminderTime(null), { hour: 13, minute: 0 });
  assert.deepEqual(parseReminderTime('nonsense'), { hour: 13, minute: 0 });
});
