FBPATHSHALA EXAM ADMIN

This repository contains the current student/exam pages and the admin panel.
Open the admin panel with: admin.html

Version alignment used for this package:
- Dashboard: current/latest dashboard from the active repository version.
- Question Bank: restored to the 08:58 baseline workflow.
- Exam Management: restored to the 08:58 baseline workflow.
- exam-list.html is retained with its existing student/exam-list flow.
- results.html, index.html and Supabase setup are retained.

Admin features:
- Dashboard with Bangladesh date/time, Bengali date and live statistics.
- Category -> Folder -> Set question-bank structure.
- Manual question entry.
- CSV / Excel import with preview and template.
- Question Bank filtering/search, edit, remove and move-selected questions.
- Folder/Set rename and delete.
- Exam creation with Active/Inactive status.
- Exam Settings: marks, pass mark, duration, negative marking, dates, randomization, answer visibility, multiple attempts and device protection.
- Question mapping from Question Bank to an Exam.
- Exam link copy and result-page access.

Important:
- js/admin.js contains the restored Question Bank + Exam Management core.
- The dashboard remains in admin.html and uses the current dashboard UI.
- The separate question-bank-actions.js enhancement layer was removed because its Folder/Set actions are already integrated in the restored admin flow.

Supabase:
- Existing project URL and publishable key remain in js/supabase.js.
- Use SUPABASE_SETUP.sql only when the corresponding database objects/columns are missing.
