create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  url text not null,
  script text,
  selected_avatar integer not null default 0,
  music_url text,
  product_media_url text,
  product_media_type text check (product_media_type in ('image', 'video')),
  audio_url text,
  lipsync_video_url text,
  merged_video_url text,
  captioned_video_url text,
  final_video_url text,
  status text not null default 'draft' check (status in ('draft', 'generating', 'done', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fetching a user's projects efficiently
create index projects_user_id_idx on public.projects (user_id);

-- RLS: enable row level security (service role key bypasses this, but good practice)
alter table public.projects enable row level security;
