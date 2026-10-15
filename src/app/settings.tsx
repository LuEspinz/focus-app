import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Label, Screen } from '@/components/ui';
import { DEFAULT_REMINDER_TIME, parseReminderTime } from '@/lib/focus';
import { scheduleDailyReminder } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

export default function SettingsScreen() {
  const userId = useSession().session?.user.id ?? '';
  const [name, setName] = useState('');
  const [reminder, setReminder] = useState(DEFAULT_REMINDER_TIME);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('name, reminder_time')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setName(data.name);
        const { hour, minute } = parseReminderTime(data.reminder_time);
        setReminder(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      });
  }, [userId]);

  async function save() {
    const res = await supabase.from('profiles').update({ name: name.trim(), reminder_time: reminder }).eq('id', userId);
    if (res.error) return Alert.alert('Could not save settings', res.error.message);
    const scheduled = await scheduleDailyReminder(reminder);
    Alert.alert(
      'Saved',
      scheduled ? `You'll get a check-in reminder every day at ${reminder}.` : 'Turn on notifications to get reminders.',
    );
  }

  return (
    <Screen>
      <Card>
        <Label>YOUR NAME</Label>
        <Field value={name} onChangeText={setName} placeholder="Shown to your partners" />
        <Label>DAILY CHECK-IN REMINDER (24-HOUR TIME)</Label>
        <Field value={reminder} onChangeText={setReminder} placeholder="13:00" />
        <ThemedText themeColor="textSecondary">Default is 1 pm, right after lunch.</ThemedText>
      </Card>
      <Button title="Save" onPress={save} disabled={!/^\d{1,2}:\d{2}$/.test(reminder)} />
      <Button variant="secondary" title="Sign out" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
