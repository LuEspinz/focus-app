-- Initial schema for the accountability and focus app (MVP).
-- Focus rules: 1 active big-picture goal (vision) and 2 active milestones per member.
-- Partner rules: at most 2 active partners per member; partners only see shared goals.

create type goal_kind as enum ('vision', 'milestone');
create type goal_status as enum ('active', 'paused', 'done');
create type partner_role as enum ('coach', 'peer');
create type partnership_status as enum ('invited', 'active', 'offboarded');
create type interaction_kind as enum ('reaction', 'comment', 'nudge');

-- Profiles -------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  timezone text not null default 'UTC',
  reminder_time time not null default '13:00',
  is_coach boolean not null default false,
  created_at timestamptz not null default now()
);

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Goals ----------------------------------------------------------------------

create table goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  kind goal_kind not null,
  parent_goal_id uuid references goals (id) on delete set null,
  title text not null,
  why text not null default '',
  target_date date,
  status goal_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint milestone_has_parent check (kind = 'vision' or parent_goal_id is not null),
  constraint vision_has_no_parent check (kind = 'milestone' or parent_goal_id is null)
);

create unique index one_active_vision_per_owner
  on goals (owner_id) where kind = 'vision' and status = 'active';

create function enforce_milestone_limit() returns trigger
language plpgsql as $$
begin
  if new.kind = 'milestone' and new.status = 'active' and (
    select count(*) from goals
    where owner_id = new.owner_id and kind = 'milestone' and status = 'active' and id <> new.id
  ) >= 2 then
    raise exception 'Only 2 active milestones are allowed. Finish or pause one first.';
  end if;
  return new;
end;
$$;

create trigger goals_milestone_limit
  before insert or update on goals
  for each row execute function enforce_milestone_limit();

create table commitments (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals (id) on delete cascade,
  week_start date not null,
  target_text text not null,
  target_count int,
  unique (goal_id, week_start)
);

create table actions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals (id) on delete cascade,
  title text not null,
  -- 0 = Sunday ... 6 = Saturday
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}',
  archived boolean not null default false
);

-- Check-ins ------------------------------------------------------------------

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  date date not null,
  is_weekly boolean not null default false,
  mood smallint check (mood between 1 and 5),
  blocker_text text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (owner_id, date, is_weekly)
);

create table check_in_items (
  check_in_id uuid not null references check_ins (id) on delete cascade,
  action_id uuid not null references actions (id) on delete cascade,
  done boolean not null default false,
  primary key (check_in_id, action_id)
);

-- Partners -------------------------------------------------------------------

create table partnerships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references profiles (id) on delete cascade,
  partner_id uuid references profiles (id) on delete cascade,
  role partner_role not null,
  shared_goal_ids uuid[] not null default '{}',
  status partnership_status not null default 'invited',
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create function enforce_partner_limit() returns trigger
language plpgsql as $$
begin
  if new.status in ('invited', 'active') and (
    select count(*) from partnerships
    where member_id = new.member_id and status in ('invited', 'active') and id <> new.id
  ) >= 2 then
    raise exception 'Only 2 partners are allowed.';
  end if;
  return new;
end;
$$;

create trigger partnerships_partner_limit
  before insert or update on partnerships
  for each row execute function enforce_partner_limit();

create table interactions (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  check_in_id uuid references check_ins (id) on delete cascade,
  goal_id uuid references goals (id) on delete cascade,
  kind interaction_kind not null,
  body text not null default '',
  created_at timestamptz not null default now()
);

create table coach_limits (
  coach_id uuid primary key references profiles (id) on delete cascade,
  max_nudges_per_day int not null default 2,
  quiet_hours_start time not null default '21:00',
  quiet_hours_end time not null default '08:00'
);

-- Row level security ---------------------------------------------------------

-- True when the current user is an active partner of the member.
create function is_active_partner_of(member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from partnerships
    where member_id = member and partner_id = auth.uid() and status = 'active'
  );
$$;

-- True when the current user is an active partner the goal is shared with.
create function goal_is_shared_with_me(goal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from partnerships p join goals g on g.owner_id = p.member_id
    where g.id = goal and p.partner_id = auth.uid() and p.status = 'active'
      and goal = any (p.shared_goal_ids)
  );
$$;

alter table profiles enable row level security;
alter table goals enable row level security;
alter table commitments enable row level security;
alter table actions enable row level security;
alter table check_ins enable row level security;
alter table check_in_items enable row level security;
alter table partnerships enable row level security;
alter table interactions enable row level security;
alter table coach_limits enable row level security;

create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "partners read member profile" on profiles for select using (is_active_partner_of(id));

create policy "own goals" on goals for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "partners read shared goals" on goals for select using (goal_is_shared_with_me(id));

create policy "own commitments" on commitments for all
  using (exists (select 1 from goals g where g.id = goal_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from goals g where g.id = goal_id and g.owner_id = auth.uid()));
create policy "partners read shared commitments" on commitments for select using (goal_is_shared_with_me(goal_id));

create policy "own actions" on actions for all
  using (exists (select 1 from goals g where g.id = goal_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from goals g where g.id = goal_id and g.owner_id = auth.uid()));
create policy "partners read shared actions" on actions for select using (goal_is_shared_with_me(goal_id));

create policy "own check-ins" on check_ins for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "partners read check-ins" on check_ins for select using (is_active_partner_of(owner_id));

create policy "own check-in items" on check_in_items for all
  using (exists (select 1 from check_ins c where c.id = check_in_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from check_ins c where c.id = check_in_id and c.owner_id = auth.uid()));
create policy "partners read shared check-in items" on check_in_items for select
  using (exists (
    select 1 from actions a where a.id = action_id and goal_is_shared_with_me(a.goal_id)
  ));

create policy "member manages partnerships" on partnerships for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "partner reads own partnerships" on partnerships for select using (partner_id = auth.uid());

create policy "participants read interactions" on interactions for select
  using (exists (
    select 1 from partnerships p where p.id = partnership_id
      and (p.member_id = auth.uid() or p.partner_id = auth.uid())
  ));
create policy "active partners write interactions" on interactions for insert
  with check (author_id = auth.uid() and exists (
    select 1 from partnerships p where p.id = partnership_id
      and p.partner_id = auth.uid() and p.status = 'active'
  ));

create policy "coach manages own limits" on coach_limits for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Accepting an invite: the partner calls this with the invite code.
create function accept_invite(code text) returns partnerships
language plpgsql security definer set search_path = public as $$
declare
  result partnerships;
begin
  update partnerships set partner_id = auth.uid(), status = 'active'
  where invite_code = code and status = 'invited' and member_id <> auth.uid()
  returning * into result;
  if result.id is null then
    raise exception 'This invite is not valid any more.';
  end if;
  return result;
end;
$$;
