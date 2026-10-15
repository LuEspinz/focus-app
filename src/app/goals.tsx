import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Label, Screen } from '@/components/ui';
import { useFocusData } from '@/hooks/use-focus-data';
import { MAX_ACTIVE_MILESTONES, focusSlots, weekStartKey } from '@/lib/focus';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

type MilestoneDraft = {
  id: string | null;
  title: string;
  targetDate: string;
  commitment: string;
  actions: string; // one per line
};

const blankMilestone = (): MilestoneDraft => ({ id: null, title: '', targetDate: '', commitment: '', actions: '' });

export default function GoalsScreen() {
  const ownerId = useSession().session?.user.id ?? '';
  const data = useFocusData();
  const [visionTitle, setVisionTitle] = useState('');
  const [visionWhy, setVisionWhy] = useState('');
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([blankMilestone(), blankMilestone()]);
  const [saving, setSaving] = useState(false);

  // Fill the form once the current focus has loaded.
  useEffect(() => {
    if (data.loading) return;
    const { vision, milestones: active } = focusSlots(data.goals);
    setVisionTitle(vision?.title ?? '');
    setVisionWhy(vision?.why ?? '');
    const drafts: MilestoneDraft[] = active.map((m) => ({
      id: m.id,
      title: m.title,
      targetDate: m.target_date ?? '',
      commitment: data.commitments.find((c) => c.goal_id === m.id)?.target_text ?? '',
      actions: data.actions
        .filter((a) => a.goal_id === m.id && !a.archived)
        .map((a) => a.title)
        .join('\n'),
    }));
    while (drafts.length < MAX_ACTIVE_MILESTONES) drafts.push(blankMilestone());
    setMilestones(drafts);
  }, [data.loading, data.goals, data.commitments, data.actions]);

  function updateMilestone(index: number, patch: Partial<MilestoneDraft>) {
    setMilestones((all) => all.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  async function saveMilestone(visionId: string, draft: MilestoneDraft) {
    const fields = {
      owner_id: ownerId,
      kind: 'milestone' as const,
      parent_goal_id: visionId,
      title: draft.title.trim(),
      target_date: draft.targetDate.trim() || null,
    };
    const goalRes = draft.id
      ? await supabase.from('goals').update(fields).eq('id', draft.id).select('id').single()
      : await supabase.from('goals').insert(fields).select('id').single();
    if (goalRes.error) throw goalRes.error;
    const goalId = goalRes.data.id as string;

    if (draft.commitment.trim()) {
      const res = await supabase
        .from('commitments')
        .upsert(
          { goal_id: goalId, week_start: weekStartKey(new Date()), target_text: draft.commitment.trim() },
          { onConflict: 'goal_id,week_start' },
        );
      if (res.error) throw res.error;
    }

    // Replace the daily actions: archive the old ones so past check-ins keep their history.
    const archive = await supabase.from('actions').update({ archived: true }).eq('goal_id', goalId).eq('archived', false);
    if (archive.error) throw archive.error;
    const titles = draft.actions.split('\n').map((t) => t.trim()).filter(Boolean);
    if (titles.length > 0) {
      const res = await supabase.from('actions').insert(titles.map((title) => ({ goal_id: goalId, title })));
      if (res.error) throw res.error;
    }
  }

  async function save() {
    setSaving(true);
    try {
      const { vision } = focusSlots(data.goals);
      const visionFields = { owner_id: ownerId, kind: 'vision' as const, title: visionTitle.trim(), why: visionWhy.trim() };
      const visionRes = vision
        ? await supabase.from('goals').update(visionFields).eq('id', vision.id).select('id').single()
        : await supabase.from('goals').insert(visionFields).select('id').single();
      if (visionRes.error) throw visionRes.error;
      for (const draft of milestones) {
        if (draft.title.trim()) await saveMilestone(visionRes.data.id as string, draft);
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save your focus', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function markDone(draft: MilestoneDraft) {
    if (!draft.id) return;
    const res = await supabase.from('goals').update({ status: 'done' }).eq('id', draft.id);
    if (res.error) return Alert.alert('Could not update the milestone', res.error.message);
    await data.reload();
  }

  return (
    <Screen>
      <Card>
        <Label>BIG-PICTURE GOAL</Label>
        <Field placeholder="Where do you want to be in a year?" value={visionTitle} onChangeText={setVisionTitle} />
        <Field placeholder="Why it matters to you" value={visionWhy} onChangeText={setVisionWhy} multiline />
      </Card>

      {milestones.map((m, i) => (
        <Card key={m.id ?? `new-${i}`}>
          <Label>MILESTONE {i + 1}</Label>
          <Field placeholder="A step toward the big picture" value={m.title} onChangeText={(title) => updateMilestone(i, { title })} />
          <Field
            placeholder="Target date (YYYY-MM-DD)"
            value={m.targetDate}
            onChangeText={(targetDate) => updateMilestone(i, { targetDate })}
          />
          <Field
            placeholder="This week's commitment, e.g. 4 workouts"
            value={m.commitment}
            onChangeText={(commitment) => updateMilestone(i, { commitment })}
          />
          <Field
            placeholder={'Daily actions, one per line'}
            value={m.actions}
            onChangeText={(actions) => updateMilestone(i, { actions })}
            multiline
          />
          {m.id && <Button variant="secondary" title="Mark milestone done" onPress={() => markDone(m)} />}
        </Card>
      ))}

      <ThemedText themeColor="textSecondary">
        You can keep one big-picture goal and two milestones active at a time.
      </ThemedText>
      <Button title="Save focus" onPress={save} disabled={saving || !visionTitle.trim()} />
    </Screen>
  );
}
