import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Heading, Label, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useFocusData } from '@/hooks/use-focus-data';
import { actionsForDay, focusSlots } from '@/lib/focus';

export default function TodayScreen() {
  const { goals, actions, commitments, todayCheckIn, loading, error } = useFocusData();
  const { vision, milestones } = focusSlots(goals);
  const today = actionsForDay(actions, new Date());

  if (!loading && !vision) {
    return (
      <Screen>
        <Heading>Start with the big picture</Heading>
        <ThemedText themeColor="textSecondary">
          Set one big-picture goal and two milestones that lead to it. Everything else in the app
          hangs off these three.
        </ThemedText>
        <Button title="Set my focus" onPress={() => router.push('/goals')} />
        {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}
      </Screen>
    );
  }

  return (
    <Screen>
      {vision && (
        <Card>
          <Label>BIG PICTURE</Label>
          <ThemedText type="subtitle" style={styles.vision}>
            {vision.title}
          </ThemedText>
          {!!vision.why && <ThemedText themeColor="textSecondary">{vision.why}</ThemedText>}
        </Card>
      )}

      {milestones.map((m) => {
        const commitment = commitments.find((c) => c.goal_id === m.id);
        const todays = today.filter((a) => a.goal_id === m.id);
        return (
          <Card key={m.id}>
            <Label>MILESTONE{m.target_date ? ` · by ${m.target_date}` : ''}</Label>
            <ThemedText style={styles.milestone}>{m.title}</ThemedText>
            {commitment && <ThemedText themeColor="textSecondary">This week: {commitment.target_text}</ThemedText>}
            {todays.map((a) => (
              <ThemedText key={a.id}>• {a.title}</ThemedText>
            ))}
            {todays.length === 0 && <ThemedText themeColor="textSecondary">No actions planned today.</ThemedText>}
          </Card>
        );
      })}

      {todayCheckIn ? (
        <Card>
          <ThemedText style={styles.milestone}>Checked in today</ThemedText>
          <ThemedText themeColor="textSecondary">
            Mood {todayCheckIn.mood ?? '-'} of 5
            {todayCheckIn.blocker_text ? ` · In the way: ${todayCheckIn.blocker_text}` : ''}
          </ThemedText>
        </Card>
      ) : (
        <Button title="Check in" onPress={() => router.push('/check-in')} />
      )}

      <View style={styles.row}>
        <View style={styles.flex}>
          <Button variant="secondary" title="Focus" onPress={() => router.push('/goals')} />
        </View>
        <View style={styles.flex}>
          <Button variant="secondary" title="Partners" onPress={() => router.push('/partners')} />
        </View>
        <View style={styles.flex}>
          <Button variant="secondary" title="Settings" onPress={() => router.push('/settings')} />
        </View>
      </View>
      {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  vision: { fontSize: 26, lineHeight: 32 },
  milestone: { fontSize: 18, fontWeight: 600 },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
