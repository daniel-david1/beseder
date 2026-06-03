-- Invitations table
create table if not exists brand_invitations (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null,
  brand_name text not null,
  brand_emoji text not null default '📁',
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  role text not null default 'editor' check (role in ('viewer', 'editor')),
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  member_user_id uuid references auth.users(id) on delete set null
);

create table if not exists brand_members (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null,
  brand_name text not null,
  brand_emoji text not null default '📁',
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null,
  role text not null default 'editor' check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  unique (brand_id, member_user_id)
);

alter table brand_invitations enable row level security;
alter table brand_members enable row level security;

create policy "owner_manage_invitations" on brand_invitations
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create policy "read_invitation_by_token" on brand_invitations
  for select using (true);

create policy "owner_manage_members" on brand_members
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create policy "member_read_own" on brand_members
  for select using (auth.uid() = member_user_id);
