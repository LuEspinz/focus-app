import { useState } from 'react';
import { Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Heading, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

// Email one-time code sign-in: no passwords to manage for the first users.
export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) return Alert.alert('Could not send the code', error.message);
    setCodeSent(true);
  }

  async function verify() {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) Alert.alert('That code did not work', error.message);
  }

  return (
    <Screen>
      <Heading>Stay focused, stay accountable</Heading>
      <ThemedText themeColor="textSecondary">
        One big-picture goal, two milestones, and partners who see your progress.
      </ThemedText>
      <Card>
        <Field
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!codeSent}
        />
        {codeSent && (
          <Field placeholder="6-digit code" keyboardType="number-pad" value={code} onChangeText={setCode} />
        )}
        {codeSent ? (
          <Button title="Sign in" onPress={verify} disabled={busy || code.trim().length < 6} />
        ) : (
          <Button title="Email me a code" onPress={sendCode} disabled={busy || !email.includes('@')} />
        )}
      </Card>
    </Screen>
  );
}
