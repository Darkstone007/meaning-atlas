create table if not exists atlas_profile (
  id text primary key,
  pass_hash text,
  guest boolean not null default false,
  reveal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists atlas_session (
  token text primary key,
  profile_id text not null references atlas_profile(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists atlas_entry (
  id text primary key,
  profile_id text not null references atlas_profile(id) on delete cascade,
  expression text not null,
  language text not null,
  community text not null default '',
  meaning text not null,
  example text not null default '',
  feeling text not null default '',
  context text not null default '',
  intention text not null default '',
  rephrasing text not null default '',
  change_note text not null default '',
  withheld text not null default '',
  emotion text not null default '',
  context_tags text not null default '',
  intention_tags text not null default '',
  image_data text,
  image_mime text,
  audio_data text,
  audio_mime text,
  source text not null default 'visitor',
  created_at timestamptz not null default now()
);
