import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { localDateKey, weekStartKey } from '@/lib/focus';
import { supabase } from '@/lib/supabase';
import type { Action, CheckIn, Commitment, Goal } from '@/lib/types';
import { useSession } from '@/providers/session';

export type FocusData = {
  goals: Goal[];
  actions: Action[];
  commitments: Commitment[];
  todayCheckIn: CheckIn | null;
};

const empty: FocusData = { goals: [], actions: [], commitments: [], todayCheckIn: null };

/** Loads the signed-in member's active goals, actions, this week's commitments and today's check-in. */
export function useFocusData() {
  // Partners can also read other members' shared rows, so every query is scoped to the owner.
  const ownerId = useSession().session?.user.id ?? '';
  const [data, setData] = useState<FocusData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const goalsRes = await supabase
      .from('goals')
      .select('id, owner_id, kind, status, parent_goal_id, title, why, target_date')
      .eq('owner_id', ownerId)
      .eq('status', 'active')
      .order('created_at');
    const goals = (goalsRes.data ?? []) as Goal[];
    const goalIds = goals.map((g) => g.id);

    const [actionsRes, commitmentsRes, checkInRes] = await Promise.all([
      supabase.from('actions').select('id, goal_id, title, days_of_week, archived').in('goal_id', goalIds),
      supabase
        .from('commitments')
        .select('id, goal_id, week_start, target_text')
        .in('goal_id', goalIds)
        .eq('week_start', weekStartKey(now)),
      supabase
        .from('check_ins')
        .select('id, date, mood, blocker_text, note')
        .eq('owner_id', ownerId)
        .eq('date', localDateKey(now))
        .eq('is_weekly', false)
        .maybeSingle(),
    ]);

    const firstError = goalsRes.error ?? actionsRes.error ?? commitmentsRes.error ?? checkInRes.error;
    setError(firstError?.message ?? null);
    setData({
      goals,
      actions: (actionsRes.data ?? []) as Action[],
      commitments: (commitmentsRes.data ?? []) as Commitment[],
      todayCheckIn: (checkInRes.data as CheckIn | null) ?? null,
    });
    setLoading(false);
  }, [ownerId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { ...data, loading, error, reload };
}
