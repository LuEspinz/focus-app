import type { FocusAction, FocusGoal } from './focus';

// Row shapes for the tables in supabase/migrations. Only the columns the app reads.

export type Profile = {
  id: string;
  name: string;
  timezone: string;
  reminder_time: string;
  is_coach: boolean;
};

export type Goal = FocusGoal & {
  owner_id: string;
  title: string;
  why: string;
  target_date: string | null;
};

export type Commitment = {
  id: string;
  goal_id: string;
  week_start: string;
  target_text: string;
};

export type Action = FocusAction & {
  title: string;
};

export type CheckIn = {
  id: string;
  date: string;
  mood: number | null;
  blocker_text: string;
  note: string;
};

export type Partnership = {
  id: string;
  member_id: string;
  partner_id: string | null;
  role: 'coach' | 'peer';
  status: 'invited' | 'active' | 'offboarded';
  invite_code: string;
};
