-- Run once only if the corresponding objects do not already exist.
alter table public.questions add column if not exists category text default 'অন্যান্য';
alter table public.questions add column if not exists folder_id bigint;
alter table public.questions add column if not exists set_id bigint;
alter table public.questions add column if not exists source_type text default 'exam';
alter table public.questions add column if not exists source_name text;
alter table public.questions add column if not exists question_number integer;
create index if not exists questions_folder_id_idx on public.questions(folder_id);
create index if not exists questions_set_id_idx on public.questions(set_id);
create table if not exists public.question_bank_folders(id bigint generated always as identity primary key,sub_category text not null,folder_name text not null,created_at timestamptz not null default now());
create table if not exists public.question_bank_sets(id bigint generated always as identity primary key,folder_id bigint not null references public.question_bank_folders(id) on delete cascade,set_name text not null,created_at timestamptz not null default now());
create table if not exists public.exam_questions(exam_id bigint not null references public.exams(id) on delete cascade,question_id bigint not null references public.questions(id) on delete cascade,question_order integer not null default 1,primary key(exam_id,question_id));
create table if not exists public.exam_settings(exam_id bigint primary key references public.exams(id) on delete cascade,total_questions integer not null default 0,total_marks numeric not null default 0,pass_mark numeric not null default 0,duration_minutes integer not null default 20,marks_per_question numeric not null default 1,negative_mark numeric not null default 0,exam_date date,start_time time,end_date date,end_time time,examiner_name text,syllabus text,show_answers boolean not null default false,multiple_attempts boolean not null default false,device_attempt_protection boolean not null default true,random_questions boolean not null default false,random_options boolean not null default false);
alter table public.question_bank_folders enable row level security;
alter table public.question_bank_sets enable row level security;
alter table public.questions enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_settings enable row level security;
-- Authenticated admins: full access. Public/student reads for exams/settings/mappings are allowed by separate existing policies or can be added as below.
drop policy if exists qbf_auth_all on public.question_bank_folders; create policy qbf_auth_all on public.question_bank_folders for all to authenticated using(true) with check(true);
drop policy if exists qbs_auth_all on public.question_bank_sets; create policy qbs_auth_all on public.question_bank_sets for all to authenticated using(true) with check(true);
drop policy if exists questions_auth_all on public.questions; create policy questions_auth_all on public.questions for all to authenticated using(true) with check(true);
drop policy if exists exam_questions_auth_all on public.exam_questions; create policy exam_questions_auth_all on public.exam_questions for all to authenticated using(true) with check(true);
drop policy if exists exam_settings_auth_all on public.exam_settings; create policy exam_settings_auth_all on public.exam_settings for all to authenticated using(true) with check(true);
