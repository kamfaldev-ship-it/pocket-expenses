-- =============================================================================
-- Pocket : schéma Supabase (PostgreSQL 15+)
--
-- À coller en entier dans Supabase > SQL Editor > New query > Run.
-- Le script est rejouable : tables et policies sont recréées sans erreur.
-- Il ne supprime JAMAIS de données (pas de DROP TABLE).
--
-- Principe : une ligne = un objet de l'app (AppState de mobile/src/lib/types.ts),
-- toujours rattachée à un utilisateur (user_id). Row Level Security activée
-- partout : chacun ne voit et ne modifie que ses propres lignes.
-- Les ids sont ceux générés par l'app (newId() : ms * 1000, tient dans un bigint)
-- ou des textes stables pour les catégories ('courses', 'c1730…').
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------

-- Met à jour updated_at à chaque modification (sert à la synchronisation).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles : 1 ligne par compte (préférences + infos publiques de l'app)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  theme        text not null default 'auto' check (theme in ('auto', 'light', 'dark')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories : catégories de dépense / d'entrée
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  user_id    uuid   not null references auth.users (id) on delete cascade,
  id         text   not null,                          -- 'courses', 'c1730000000000000'…
  kind       text   not null check (kind in ('in', 'out')),
  name       text   not null check (char_length(name) between 1 and 40),
  color      text   not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon       text   not null,
  position   integer not null default 0,               -- ordre d'affichage
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- transactions : dépenses et entrées
-- cat n'a volontairement pas de clé étrangère : l'app réaffecte les opérations
-- vers « Autre » à la suppression d'une catégorie, et la synchronisation peut
-- envoyer les lignes dans n'importe quel ordre.
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  user_id    uuid    not null references auth.users (id) on delete cascade,
  id         bigint  not null,
  type       text    not null check (type in ('in', 'out')),
  amount     numeric(14, 2) not null check (amount > 0),   -- FCFA
  cat        text    not null,
  date       date    not null,
  note       text    not null default '' check (char_length(note) <= 500),
  photo      text    check (photo is null or photo !~ '[/\\]'),  -- nom de fichier, jamais un chemin
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

-- ---------------------------------------------------------------------------
-- savings_goals : objectifs d'épargne
-- ---------------------------------------------------------------------------
create table if not exists public.savings_goals (
  user_id    uuid   not null references auth.users (id) on delete cascade,
  id         bigint not null,
  name       text   not null check (char_length(name) between 1 and 60),
  target     numeric(14, 2) not null check (target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- savings_entries : versements / retraits de la caisse économies
-- goal_id null = argent de la caisse sans objectif. Supprimer un objectif
-- laisse l'argent dans la caisse : goal_id repasse à null (seule cette colonne).
-- ---------------------------------------------------------------------------
create table if not exists public.savings_entries (
  user_id    uuid   not null references auth.users (id) on delete cascade,
  id         bigint not null,
  goal_id    bigint,
  type       text   not null check (type in ('deposit', 'withdraw')),
  amount     numeric(14, 2) not null check (amount > 0),
  date       date   not null,
  note       text   not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, goal_id) references public.savings_goals (user_id, id)
    on delete set null (goal_id)
);
create index if not exists savings_entries_user_date_idx on public.savings_entries (user_id, date desc);

-- ---------------------------------------------------------------------------
-- budgets : limite mensuelle par catégorie
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  user_id    uuid   not null references auth.users (id) on delete cascade,
  cat        text   not null,
  amount     numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, cat)
);

-- ---------------------------------------------------------------------------
-- recurring_rules : règles mensuelles (loyer, abonnement, versement en caisse)
-- ---------------------------------------------------------------------------
create table if not exists public.recurring_rules (
  user_id       uuid    not null references auth.users (id) on delete cascade,
  id            bigint  not null,
  kind          text    not null check (kind in ('in', 'out', 'save')),
  amount        numeric(14, 2) not null check (amount > 0),
  cat           text    not null default '',            -- ignoré pour kind = 'save'
  note          text    not null default '' check (char_length(note) <= 500),
  day           smallint not null check (day between 1 and 28),
  start_month   text    not null check (start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  last_applied  text    check (last_applied is null or last_applied ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'categories', 'transactions', 'savings_goals',
    'savings_entries', 'budgets', 'recurring_rules'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security : chaque utilisateur n'accède qu'à ses lignes.
-- (select auth.uid()) évalué une fois par requête (plus rapide que auth.uid()).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'transactions', 'savings_goals',
    'savings_entries', 'budgets', 'recurring_rules'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I
         for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- profiles : la clé est id (pas user_id). Pas d'insert côté client (le trigger s'en charge)
-- ni de delete (le profil disparaît avec le compte).
alter table public.profiles enable row level security;
drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "update own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Droits : rien pour le rôle anonyme, accès complet filtré par RLS pour les connectés.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on
  public.categories, public.transactions, public.savings_goals,
  public.savings_entries, public.budgets, public.recurring_rules
  to authenticated;
grant select, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Photos de reçus : bucket privé « receipts ».
-- Chemin imposé : <user_id>/<nom_du_fichier>  (le dossier = l'id de l'utilisateur).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipts: read own"   on storage.objects;
drop policy if exists "receipts: insert own" on storage.objects;
drop policy if exists "receipts: update own" on storage.objects;
drop policy if exists "receipts: delete own" on storage.objects;

create policy "receipts: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "receipts: insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "receipts: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "receipts: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Suppression du compte depuis l'app (exigée par l'App Store dès qu'on peut créer un compte).
-- Supprime l'utilisateur ; toutes ses lignes partent en cascade.
-- Les fichiers du bucket receipts ne sont PAS supprimés par la cascade : l'app
-- doit les effacer (storage API) avant d'appeler cette fonction.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
