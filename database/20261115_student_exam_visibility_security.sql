-- Applied to Supabase project ydvbnalhcnfqpxkkmywr on 2026-11-15.
-- Prevents anonymous access to answer keys and student attempt records.
-- Existing exam_attempts / attempt_answers rows are not modified.

DO $$
DECLARE
  v_definition text;
  v_old text := $old$RETURN jsonb_build_object('success',true,'attempt_id',aid,'result_token',rtoken,'score',submit_score,
    'total_marks',total_marks,'total_questions',total_q,'percentage',CASE WHEN total_marks>0 THEN round(submit_score/total_marks*100,2) ELSE 0 END,
    'pass_mark',coalesce(s.pass_mark,0),'rank',coalesce(rank_no,1),'rank_total',coalesce(rank_total,1),'review',review);$old$;
  v_new text := $new$RETURN jsonb_build_object('success',true,'attempt_id',aid,'result_token',rtoken,
    'score',CASE WHEN coalesce(s.show_result,true) THEN submit_score ELSE NULL END,
    'total_marks',CASE WHEN coalesce(s.show_result,true) THEN total_marks ELSE NULL END,
    'total_questions',total_q,
    'percentage',CASE WHEN coalesce(s.show_result,true) AND total_marks>0 THEN round(submit_score/total_marks*100,2) ELSE NULL END,
    'pass_mark',CASE WHEN coalesce(s.show_result,true) THEN coalesce(s.pass_mark,0) ELSE NULL END,
    'rank',CASE WHEN coalesce(s.show_rank,true) THEN coalesce(rank_no,1) ELSE NULL END,
    'rank_total',CASE WHEN coalesce(s.show_rank,true) THEN coalesce(rank_total,1) ELSE NULL END,
    'review',CASE WHEN coalesce(s.show_answer_paper,true) AND coalesce(s.show_answers,false) THEN review ELSE '[]'::jsonb END);$new$;
BEGIN
  SELECT pg_get_functiondef('public.submit_exam(bigint,text,text,text,text,text,jsonb)'::regprocedure) INTO v_definition;
  IF position(v_old in v_definition)>0 THEN
    EXECUTE replace(v_definition,v_old,v_new);
  ELSIF position(v_new in v_definition)=0 THEN
    RAISE EXCEPTION 'Unexpected submit_exam definition; inspect before applying';
  END IF;
END $$;

DROP POLICY IF EXISTS questions_public_read ON public.questions;
REVOKE SELECT ON TABLE public.questions FROM anon, PUBLIC;
GRANT SELECT ON TABLE public.questions TO authenticated;

DO $$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.get_public_exam_questions(bigint)'::regprocedure) INTO v_definition;
  IF position('q.explanation,' in v_definition)>0 THEN
    v_definition := replace(v_definition,'q.explanation,','NULL::text AS explanation,');
  END IF;
  IF position('q.reference_answer,' in v_definition)>0 THEN
    v_definition := replace(v_definition,'q.reference_answer,','NULL::text AS reference_answer,');
  END IF;
  IF position('NULL::text AS explanation,' in v_definition)=0 OR position('NULL::text AS reference_answer,' in v_definition)=0 THEN
    RAISE EXCEPTION 'Unexpected public question projection; inspect before applying';
  END IF;
  EXECUTE v_definition;
END $$;

DROP POLICY IF EXISTS "Public can view own attempt by student id" ON public.exam_attempts;
DROP POLICY IF EXISTS "Public can insert attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Students can submit exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Public can insert answers" ON public.attempt_answers;
DROP POLICY IF EXISTS "Public can insert students" ON public.students;
DROP POLICY IF EXISTS "Public can update students" ON public.students;
DROP POLICY IF EXISTS "Students can read submitted id" ON public.students;
DROP POLICY IF EXISTS "Students can submit information" ON public.students;

REVOKE ALL ON TABLE public.exam_attempts, public.attempt_answers, public.students FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exam_attempts, public.attempt_answers, public.students TO authenticated;

DO $$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.get_attempt_review(uuid)'::regprocedure);
  v_old := $old$DECLARE
  r record;
  v_review jsonb;$old$;
  v_new := $new$DECLARE
  r record;
  v_review jsonb;
  v_settings public.exam_settings%rowtype;$new$;
  IF position(v_old in v_def)>0 THEN v_def := replace(v_def,v_old,v_new); END IF;

  v_old := $old$  IF NOT FOUND THEN
    RAISE EXCEPTION 'Result পাওয়া যায়নি।';
  END IF;$old$;
  v_new := $new$  IF NOT FOUND THEN
    RAISE EXCEPTION 'Result পাওয়া যায়নি।';
  END IF;
  SELECT * INTO v_settings FROM public.exam_settings WHERE exam_id=r.exam_id;$new$;
  IF position(v_old in v_def)>0 THEN v_def := replace(v_def,v_old,v_new); END IF;

  v_old := $old$  WHERE aa.attempt_id = r.id;

  RETURN jsonb_build_object($old$;
  v_new := $new$  WHERE aa.attempt_id = r.id;

  IF NOT coalesce(v_settings.show_answer_paper,true) THEN
    v_review := '[]'::jsonb;
  ELSIF NOT coalesce(v_settings.show_answers,false) THEN
    SELECT coalesce(jsonb_agg((item - 'correct_option' - 'correct_text' - 'is_correct') ORDER BY idx),'[]'::jsonb)
    INTO v_review
    FROM jsonb_array_elements(v_review) WITH ORDINALITY AS x(item,idx);
  END IF;

  RETURN jsonb_build_object($new$;
  IF position(v_old in v_def)>0 THEN v_def := replace(v_def,v_old,v_new); END IF;
  v_def := replace(v_def,'''score'', r.score,','''score'', CASE WHEN coalesce(v_settings.show_result,true) THEN r.score ELSE NULL END,');
  IF position('v_settings public.exam_settings%rowtype' in v_def)=0 OR position('show_answer_paper' in v_def)=0 THEN
    RAISE EXCEPTION 'Unexpected get_attempt_review definition; inspect before applying';
  END IF;
  EXECUTE v_def;

  v_def := pg_get_functiondef('public.get_result(uuid)'::regprocedure);
  v_old := $old$declare
  r record;
  v_percentage numeric(10,2);$old$;
  v_new := $new$declare
  r record;
  v_percentage numeric(10,2);
  v_show_result boolean := true;$new$;
  IF position(v_old in v_def)>0 THEN v_def := replace(v_def,v_old,v_new); END IF;
  v_def := replace(v_def,'e.title as exam_title','e.exam_name as exam_title');
  v_old := $old$  if not found then
    raise exception 'Result পাওয়া যায়নি।';
  end if;$old$;
  v_new := $new$  if not found then
    raise exception 'Result পাওয়া যায়নি।';
  end if;
  select coalesce(show_result,true) into v_show_result from public.exam_settings where exam_id=r.exam_id;$new$;
  IF position(v_old in v_def)>0 THEN v_def := replace(v_def,v_old,v_new); END IF;
  v_def := replace(v_def,'''score'', r.score,','''score'', CASE WHEN v_show_result THEN r.score ELSE NULL END,');
  v_def := replace(v_def,'''percentage'', v_percentage,','''percentage'', CASE WHEN v_show_result THEN v_percentage ELSE NULL END,');
  IF position('v_show_result boolean' in v_def)=0 OR position('e.exam_name as exam_title' in v_def)=0 THEN
    RAISE EXCEPTION 'Unexpected get_result definition; inspect before applying';
  END IF;
  EXECUTE v_def;
END $$;
