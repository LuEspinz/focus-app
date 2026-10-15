import { ThemedText } from '@/components/themed-text';
import { Card, Heading, Screen } from '@/components/ui';

// Phase 2 of the MVP plan: invites, the partner feed, coach mode. The database side
// (partnerships, accept_invite, interactions, coach_limits) is already in the first migration.
export default function PartnersScreen() {
  return (
    <Screen>
      <Heading>Partners are coming next</Heading>
      <Card>
        <ThemedText>
          You will be able to invite up to two partners: your coach, who gets coach mode with
          onboarding, offboarding and usage limits, and one friend or peer.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Partners only see the goals you choose to share, and you can remove a partner at any time.
        </ThemedText>
      </Card>
    </Screen>
  );
}
