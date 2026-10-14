-- Facebook Pathshala exam settings compatibility migration
-- Run once in the Supabase SQL Editor if these columns are not already present.
-- This only adds settings columns; it does not update or delete student attempts or answers.
alter table public.exam_settings add column if not exists show_result boolean not null default true;
alter table public.exam_settings add column if not exists show_rank boolean not null default true;
alter table public.exam_settings add column if not exists thank_you_message text;
alter table public.exam_settings add column if not exists facebook_page_url text;
alter table public.exam_settings add column if not exists facebook_group_url text;
alter table public.exam_settings add column if not exists question_display_mode text not null default 'all';

-- Settings consumed by the admin form and student result/answer-paper flow.
alter table public.exam_settings add column if not exists show_answer_paper boolean not null default true;
alter table public.exam_settings add column if not exists show_page_link boolean not null default false;
alter table public.exam_settings add column if not exists show_group_link boolean not null default true;
alter table public.exam_settings add column if not exists multiple_attempts boolean not null default false;
alter table public.exam_settings add column if not exists device_attempt_protection boolean not null default true;
alter table public.exam_settings add column if not exists random_questions boolean not null default false;
alter table public.exam_settings add column if not exists random_options boolean not null default false;
alter table public.exam_settings add column if not exists exam_date date;
alter table public.exam_settings add column if not exists start_time time;
alter table public.exam_settings add column if not exists end_date date;
alter table public.exam_settings add column if not exists end_time time;
alter table public.exam_settings add column if not exists examiner_name text;
alter table public.exam_settings add column if not exists syllabus text;
alter table public.exam_settings add column if not exists total_questions integer not null default 0;
alter table public.exam_settings add column if not exists total_marks numeric not null default 0;
alter table public.exam_settings add column if not exists pass_mark numeric not null default 0;
alter table public.exam_settings add column if not exists duration_minutes integer not null default 20;
alter table public.exam_settings add column if not exists marks_per_question numeric not null default 1;
alter table public.exam_settings add column if not exists negative_mark numeric not null default 0;
alter table public.exam_settings add column if not exists show_answers boolean not null default false;
