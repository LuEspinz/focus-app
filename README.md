# Focus

A mobile app (iOS and Android) for staying focused and accountable: one big-picture goal, two
milestones that lead to it, a one-minute daily check-in, and up to two accountability partners
(a coach plus one friend or peer).

This is Phase 1 of the MVP plan: sign-in, setting your focus, daily actions on Today, the check-in,
and a daily reminder (1 pm by default). Partners and coach mode come in Phase 2; their database
tables and access rules are already in the first migration.

## Stack

- React Native + Expo (SDK 58), Expo Router, TypeScript
- Supabase: Postgres, Auth (email one-time codes), Row Level Security
- expo-notifications for the daily reminder

## Set up

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run `supabase/migrations/20261015000000_initial_schema.sql`
   (or `supabase db push` with the Supabase CLI).
3. Copy `.env.example` to `.env.local` and fill in your project URL and publishable (anon) key.
4. Install and start:

   ```bash
   npm install
   npx expo start
   ```

5. Scan the QR code with Expo Go on your phone.

## Checks

```bash
npm run typecheck   # TypeScript
npm test            # focus rules (src/lib/focus.ts)
```

## Rules the database enforces

- One active big-picture goal and two active milestones per person.
- At most two partners (invited or active) per person.
- Partners only read goals the member shares with them, plus check-ins, and only while the
  partnership is active. Offboarding ends access.
