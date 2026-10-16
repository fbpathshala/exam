-- Additive-only migration: preserve existing Job Care questions and sets.
alter table public.question_bank_folders add column if not exists category_id bigint;
update public.question_bank_folders f set category_id=c.id from public.question_bank_categories c where f.category_id is null and f.sub_category=c.name;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='question_bank_folders_category_id_fkey' and conrelid='public.question_bank_folders'::regclass) then
  alter table public.question_bank_folders add constraint question_bank_folders_category_id_fkey foreign key(category_id) references public.question_bank_categories(id) on update cascade on delete restrict;
 end if;
end $$;
create index if not exists idx_question_bank_folders_category_id on public.question_bank_folders(category_id);