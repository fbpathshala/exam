-- Facebook Pathshala exam settings compatibility migration
-- Run once in the Supabase SQL Editor if these columns are not already present.
-- This only adds settings columns; it does not update or delete student attempts or answers.
alter table public.exam_settings add column if not exists show_result boolean not null default true;
alter table public.exam_settings add column if not exists show_rank boolean not null default true;
alter table public.exam_settings add column if not exists thank_you_message text;
alter table public.exam_settings add column if not exists facebook_page_url text;
alter table public.exam_settings add column if not exists facebook_group_url text;
alter table public.exam_settings add column if not exists question_display_mode text not null default 'all';
