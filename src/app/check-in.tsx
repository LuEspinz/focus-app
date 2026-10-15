import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Label, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { actionsForDay, localDateKey } from '@/lib/focus';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

const MOODS = [1, 2, 3, 4, 5];

export default function CheckInScreen() {
  const theme = useTheme();
  const ownerId = useSession().session?.user.id;
  const { actions } = useFocusData();
  const today = actionsForDay(actions, new Date());
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [mood, setMood] = useState<number | null>(null);
  const [blocker, setBlocker] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!ownerId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('check_ins')
      .insert({ owner_id: ownerId, date: localDateKey(new Date()), mood, blocker_text: blocker, note })
      .select('id')
      .single();
    if (!error && today.length > 0) {
      const items = today.map((a) => ({ check_in_id: data.id, action_id: a.id, done: !!done[a.id] }));
      const itemsRes = await supabase.from('check_in_items').insert(items);
      if (itemsRes.error) Alert.alert('Saved, but not every action was recorded', itemsRes.error.message);
    }
    setSaving(false);
    if (error) return Alert.alert('Could not save the check-in', error.message);
    router.back();
  }

  return (
    <Screen>
      <Card>
        <Label>WHAT GOT DONE</Label>
        {today.length === 0 && <ThemedText themeColor="textSecondary">No actions planned today.</ThemedText>}
        {today.map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!done[a.id] }}
            onPress={() => setDone((d) => ({ ...d, [a.id]: !d[a.id] }))}
            style={styles.row}>
            <ThemedText>{done[a.id] ? '☑' : '☐'}</ThemedText>
            <ThemedText>{a.title}</ThemedText>
          </Pressable>
        ))}
      </Card>

      <Card>
        <Label>HOW DO YOU FEEL? (1 LOW, 5 GREAT)</Label>
        <View style={styles.row}>
          {MOODS.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ selected: mood === m }}
              onPress={() => setMood(m)}
              style={[
                styles.mood,
                { backgroundColor: mood === m ? theme.text : theme.backgroundSelected },
              ]}>
              <ThemedText style={{ color: mood === m ? theme.background : theme.text }}>{m}</ThemedText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Label>WHAT IS IN THE WAY?</Label>
        <Field placeholder="One line is enough" value={blocker} onChangeText={setBlocker} />
        <Label>NOTE (OPTIONAL)</Label>
        <Field placeholder="Anything else" value={note} onChangeText={setNote} multiline />
      </Card>

      <Button title="Save check-in" onPress={save} disabled={saving || mood === null} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  mood: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
