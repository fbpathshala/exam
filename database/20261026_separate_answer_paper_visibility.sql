-- Separate access to a student's own answer paper from revealing correct answers.
-- Applied to Supabase on 2026-10-26. Reapplying CREATE OR REPLACE is safe.
CREATE OR REPLACE FUNCTION public.get_previous_exam_result(p_exam_id bigint, p_mobile text, p_attempt_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_attempt public.exam_attempts%rowtype;
  v_settings public.exam_settings%rowtype;
  v_total_marks numeric := 0;
  v_rank bigint := 1;
  v_rank_total bigint := 0;
  v_review jsonb := '[]'::jsonb;
begin
  select a.* into v_attempt
  from public.exam_attempts a
  join public.students st on st.id=a.student_id
  where a.exam_id=p_exam_id
    and st.mobile=p_mobile
    and a.attempt_date=p_attempt_date
  order by a.submitted_at desc, a.id desc
  limit 1;

  if v_attempt.id is null then
    return jsonb_build_object('success',false,'message','এই পরীক্ষার আগের ফলাফল পাওয়া যায়নি।');
  end if;

  select * into v_settings from public.exam_settings where exam_id=p_exam_id limit 1;

  v_total_marks := coalesce(nullif(v_settings.total_marks,0),
                            coalesce(v_attempt.total_questions,0)*coalesce(v_settings.marks_per_question,1));

  select count(*) + 1 into v_rank
  from public.exam_attempts a
  where a.exam_id=p_exam_id
    and (a.score > v_attempt.score
      or (a.score = v_attempt.score and (a.submitted_at < v_attempt.submitted_at
        or (a.submitted_at = v_attempt.submitted_at and a.id < v_attempt.id))));

  select count(*) into v_rank_total
  from public.exam_attempts a
  where a.exam_id=p_exam_id;

  select coalesce(jsonb_agg(x.obj order by x.n),'[]'::jsonb)
  into v_review
  from (
    select row_number() over(order by aa.id)-1 as n,
      jsonb_build_object(
        'question_id', aa.question_id,
        'display_order', row_number() over(order by aa.id)-1,
        'question_text', coalesce(eqi.question_text, q.question_text, ''),
        'options', jsonb_build_array(
          jsonb_build_object('display_letter','A','original_letter','A','text',coalesce(eqi.option_a,q.option_a,''),'selected',upper(coalesce(aa.selected_option,''))='A','correct',upper(coalesce(nullif(btrim(q.correct_answer::text),''),nullif(btrim(eqi.correct_answer),''),''))='A'),
          jsonb_build_object('display_letter','B','original_letter','B','text',coalesce(eqi.option_b,q.option_b,''),'selected',upper(coalesce(aa.selected_option,''))='B','correct',upper(coalesce(nullif(btrim(q.correct_answer::text),''),nullif(btrim(eqi.correct_answer),''),''))='B'),
          jsonb_build_object('display_letter','C','original_letter','C','text',coalesce(eqi.option_c,q.option_c,''),'selected',upper(coalesce(aa.selected_option,''))='C','correct',upper(coalesce(nullif(btrim(q.correct_answer::text),''),nullif(btrim(eqi.correct_answer),''),''))='C'),
          jsonb_build_object('display_letter','D','original_letter','D','text',coalesce(eqi.option_d,q.option_d,''),'selected',upper(coalesce(aa.selected_option,''))='D','correct',upper(coalesce(nullif(btrim(q.correct_answer::text),''),nullif(btrim(eqi.correct_answer),''),''))='D')
        ),
        'selected_option',nullif(upper(coalesce(aa.selected_option,'')),''),
        'written_answer',coalesce(aa.written_answer,''),
        'question_type',coalesce(aa.question_type,eqi.question_type,q.question_type,'mcq'),
        'reference_answer',case when coalesce(v_settings.show_answers,false) then coalesce(eqi.reference_answer,q.reference_answer,'') else '' end,
        'correct_option',nullif(upper(coalesce(nullif(btrim(q.correct_answer::text),''),nullif(btrim(eqi.correct_answer),''),'')),''),
        'is_correct',coalesce(aa.is_correct,false),
        'explanation',coalesce(eqi.explanation,q.explanation,'')
      ) as obj
    from public.attempt_answers aa
    left join public.questions q on q.id=aa.question_id
    left join lateral (
      select i.*
      from public.exam_question_items i
      where i.exam_id=p_exam_id
        and (
          i.id=aa.exam_question_id
          or (aa.exam_question_id is null and i.source_question_id=aa.question_id)
        )
      order by case when i.id=aa.exam_question_id then 0 else 1 end, i.question_order
      limit 1
    ) eqi on true
    where aa.attempt_id=v_attempt.id
  ) x;

  -- The answer-paper visibility and correct-answer visibility are separate settings.
  if not coalesce(v_settings.show_answer_paper,true) then
    v_review := '[]'::jsonb;
  elsif not coalesce(v_settings.show_answers,false) then
    select coalesce(jsonb_agg(
      (item - 'correct_option' - 'explanation' - 'reference_answer' - 'is_correct')
      || jsonb_build_object(
        'options',
        coalesce((
          select jsonb_agg(opt - 'correct' order by opt_ord)
          from jsonb_array_elements(item->'options') with ordinality as o(opt,opt_ord)
        ), '[]'::jsonb)
      ) order by idx
    ), '[]'::jsonb)
    into v_review
    from jsonb_array_elements(v_review) with ordinality as r(item,idx);
  end if;

  return jsonb_build_object(
    'success',true,
    'attempt_id',v_attempt.id,
    'score',coalesce(v_attempt.score,0),
    'total_questions',coalesce(v_attempt.total_questions,0),
    'total_marks',v_total_marks,
    'percentage',case when v_total_marks>0 then coalesce(v_attempt.score,0)::numeric/v_total_marks*100 else 0 end,
    'rank',v_rank,
    'rank_total',v_rank_total,
    'pass_mark',coalesce(v_settings.pass_mark,0),
    'review',v_review
  );
end;
$function$

